// src/services/adminDelegationService.ts
// Secure Admin Delegated Access & User Impersonation Service

import { DelegatedAdminSession, AdminPermissions, AdminDelegatedAuditLog, DelegatedAccessMode } from '../types';

const STORAGE_KEY = 'wv_active_delegated_session';

/**
 * Creates a server-side short-lived Delegated Session (View Account or Act as Client)
 * without requiring, viewing, or modifying client passwords.
 */
export async function createDelegatedSession(params: {
  targetUid: string;
  mode: DelegatedAccessMode;
  adminEmail: string;
  adminName?: string;
  targetUser?: UserState;
  idToken?: string;
}): Promise<{ success: boolean; session?: DelegatedAdminSession; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (params.idToken) {
      headers['Authorization'] = `Bearer ${params.idToken}`;
    }

    const res = await fetch('/api/admin/delegated-session/create', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        targetUid: params.targetUid,
        mode: params.mode,
        adminEmail: params.adminEmail,
        adminName: params.adminName,
        targetUser: params.targetUser
      })
    });

    const data = await res.json();
    if (data.success && data.session) {
      saveActiveDelegatedSession(data.session);
      return { success: true, session: data.session };
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
    const res = await fetch('/api/admin/delegated-session/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });

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
    const res = await fetch('/api/admin/delegated-session/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, actionDescription })
    });
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
    const res = await fetch('/api/admin/delegated-session/terminate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
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
    const res = await fetch(`/api/admin/permissions?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (data.success && data.permissions) {
      return {
        permissions: data.permissions,
        allPermissions: data.allPermissions || []
      };
    }
  } catch (e) {}

  return {
    permissions: {
      email,
      VIEW_ACCOUNTS: true,
      ACT_AS_CLIENT: email.toLowerCase().includes('blessingubah') || email.toLowerCase().includes('sheilawalsh')
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
    const res = await fetch('/api/admin/permissions/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEmail, permissions, adminEmail })
    });
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
    const res = await fetch('/api/admin/audit-logs');
    const data = await res.json();
    if (data.success && Array.isArray(data.auditLogs)) {
      return data.auditLogs;
    }
  } catch (e) {}
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
