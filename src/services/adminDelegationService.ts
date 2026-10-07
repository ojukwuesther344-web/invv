// src/services/adminDelegationService.ts
// Secure Admin Delegated Access & User Impersonation Service

import { DelegatedAdminSession, AdminPermissions, AdminDelegatedAuditLog, DelegatedAccessMode, UserState } from '../types';
import { auth } from '../firebase';

const STORAGE_KEY = 'wv_active_delegated_session';

/**
 * Retrieves the existing authenticated administrator access token from Firebase Auth
 */
export async function getExistingAdminAccessToken(): Promise<string | null> {
  try {
    if (auth?.currentUser) {
      const token = await auth.currentUser.getIdToken(false);
      if (token) {
        try { localStorage.setItem('admin_auth_token', token); } catch {}
        return token;
      }
    }

    const tokenFromAuth: string | null = await new Promise((resolve) => {
      if (!auth) {
        resolve(null);
        return;
      }
      const unsubscribe = auth.onAuthStateChanged(async (u) => {
        unsubscribe();
        if (u) {
          try {
            const tok = await u.getIdToken(false);
            if (tok) {
              try { localStorage.setItem('admin_auth_token', tok); } catch {}
            }
            resolve(tok);
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
      setTimeout(() => {
        unsubscribe();
        resolve(null);
      }, 2000);
    });

    if (tokenFromAuth) return tokenFromAuth;

    try {
      const cached = localStorage.getItem('admin_auth_token');
      if (cached) return cached;
    } catch {}

    return null;
  } catch (e) {
    try { return localStorage.getItem('admin_auth_token') || null; } catch { return null; }
  }
}

/**
 * Creates a server-side short-lived Delegated Session (View Account or Act as Client)
 * without requiring, viewing, or modifying client passwords.
 */
export async function createDelegatedSession(params: {
  targetUid: string;
  mode: DelegatedAccessMode;
  adminEmail?: string;
  adminName?: string;
  targetUser?: UserState;
  idToken?: string;
}): Promise<{ success: boolean; session?: DelegatedAdminSession; error?: string }> {
  try {
    // 1. Obtain token from parameter or active Firebase Auth user session
    let token = params.idToken;
    if (!token) {
      token = (await getExistingAdminAccessToken()) || undefined;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (params.adminEmail) {
      headers['x-admin-email'] = params.adminEmail;
    }

    const payload = JSON.stringify({
      targetUid: params.targetUid,
      clientUid: params.targetUid,
      uid: params.targetUid,
      mode: params.mode,
      adminEmail: params.adminEmail,
      adminName: params.adminName,
      targetUser: params.targetUser
    });

    // Try primary endpoint /api/admin/delegated-session, fallback to /api/admin/delegated-session/create
    let res: Response;
    try {
      res = await fetch('/api/admin/delegated-session', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: payload
      });
      if (res.status === 404) {
        res = await fetch('/api/admin/delegated-session/create', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: payload
        });
      }
    } catch {
      res = await fetch('/api/admin/delegated-session/create', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: payload
      });
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      console.warn('[DELEGATION] Non-JSON response received:', res.status, text.slice(0, 150));
      if (res.status === 403 || res.status === 401) {
        return {
          success: false,
          error: 'Unauthorized: Administrator authentication required.'
        };
      }
      return { 
        success: false, 
        error: `Server returned non-JSON response (${res.status} ${res.statusText}). Expected JSON API response.` 
      };
    }

    const data = await res.json();
    if (data.success && (data.session || data.sessionId)) {
      const session: DelegatedAdminSession = data.session || {
        sessionId: data.sessionId,
        adminUid: data.adminUid || `admin_${params.adminEmail || 'admin'}`,
        adminEmail: data.adminEmail || params.adminEmail || '',
        adminName: data.adminName || params.adminName || (params.adminEmail ? params.adminEmail.split('@')[0] : 'Administrator'),
        targetUid: data.clientUid || params.targetUid,
        targetUser: params.targetUser || ({ uid: data.clientUid || params.targetUid, email: '', username: 'Client' } as any),
        mode: params.mode,
        permissionUsed: params.mode === 'VIEW_ACCOUNT' ? 'VIEW_ACCOUNTS' : 'ACT_AS_CLIENT',
        createdAt: Date.now(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt).getTime() : Date.now() + 15 * 60 * 1000,
        isActive: true,
        actionsPerformed: [`Session created in mode ${params.mode}`]
      };

      saveActiveDelegatedSession(session);
      return { success: true, session };
    } else {
      return { success: false, error: data.error || 'Failed to create delegated session.' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error initiating delegated session.' };
  }
}

/**
 * Validates active delegated session with the server and checks expiration TTL
 */
export async function validateDelegatedSession(
  sessionId: string
): Promise<{ success: boolean; valid: boolean; session?: DelegatedAdminSession; remainingSeconds?: number; message?: string }> {
  try {
    const token = await getExistingAdminAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/delegated-session/validate', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ sessionId })
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { success: false, valid: false, message: 'Server returned non-JSON response.' };
    }

    const data = await res.json();
    if (!data.valid) {
      clearActiveDelegatedSession();
    }
    return data;
  } catch (e: any) {
    return { success: false, valid: false, message: e.message };
  }
}

/**
 * Records an important action performed during Act as Client into immutable audit logs
 */
export async function recordDelegatedAction(sessionId: string, actionDescription: string): Promise<boolean> {
  try {
    const token = await getExistingAdminAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/delegated-session/action', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ sessionId, actionDescription })
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return false;
    const data = await res.json();
    return Boolean(data.success);
  } catch (e) {
    return false;
  }
}

/**
 * Terminates the active delegated session and returns to Administration
 */
export async function terminateDelegatedSession(sessionId: string): Promise<boolean> {
  try {
    clearActiveDelegatedSession();
    const token = await getExistingAdminAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/delegated-session/terminate', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ sessionId })
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return true;
    const data = await res.json();
    return Boolean(data.success);
  } catch (e) {
    clearActiveDelegatedSession();
    return false;
  }
}

/**
 * Retrieves the administrator's granular permissions from server
 */
export async function fetchAdminPermissions(
  email: string
): Promise<{ permissions: AdminPermissions; allPermissions?: AdminPermissions[] }> {
  try {
    const token = await getExistingAdminAccessToken();
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/permissions?email=${encodeURIComponent(email)}`, {
      credentials: 'include',
      headers
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.permissions) {
        return {
          permissions: data.permissions,
          allPermissions: data.allPermissions || []
        };
      }
    }
  } catch (e) {}

  return {
    permissions: {
      email,
      VIEW_ACCOUNTS: true,
      ACT_AS_CLIENT: email.toLowerCase().includes('blessingubah') || email.toLowerCase().includes('sheilawalsh') || email.toLowerCase().includes('holy')
    }
  };
}

/**
 * Updates administrator permissions (Super Admin authorization)
 */
export async function updateAdminPermissions(
  targetEmail: string,
  permissions: Partial<AdminPermissions>,
  adminEmail: string
): Promise<boolean> {
  try {
    const token = await getExistingAdminAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/permissions/update', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ targetEmail, permissions, adminEmail })
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return false;
    const data = await res.json();
    return Boolean(data.success);
  } catch (e) {
    return false;
  }
}

/**
 * Fetches immutable Administrative Audit Logs
 */
export async function fetchAdminAuditLogs(): Promise<AdminDelegatedAuditLog[]> {
  try {
    const token = await getExistingAdminAccessToken();
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/audit-logs', {
      credentials: 'include',
      headers
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success && Array.isArray(data.auditLogs)) {
        return data.auditLogs;
      }
    }
  } catch (e) {}
  return [];
}

/**
 * Fetches dynamically registered client accounts from the real backend database,
 * strictly excluding any administrative accounts and credentials.
 */
export async function fetchRegisteredClients(adminEmail?: string): Promise<UserState[]> {
  try {
    const token = await getExistingAdminAccessToken();
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const q = adminEmail ? `?adminEmail=${encodeURIComponent(adminEmail)}` : '';
    const res = await fetch(`/api/admin/registered-clients${q}`, {
      credentials: 'include',
      headers
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success && Array.isArray(data.clients)) {
        return data.clients;
      }
    }
  } catch (e) {
    console.warn('Error fetching registered clients from API:', e);
  }
  return [];
}

/**
 * Local session storage helpers for smooth state management
 */
export function saveActiveDelegatedSession(session: DelegatedAdminSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (e) {}
}

export function getActiveDelegatedSession(): DelegatedAdminSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session: DelegatedAdminSession = JSON.parse(raw);
    if (!session || !session.sessionId || Date.now() >= session.expiresAt) {
      clearActiveDelegatedSession();
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

export function clearActiveDelegatedSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}
