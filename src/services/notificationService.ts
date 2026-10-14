// src/services/notificationService.ts
// Cross-Device Admin Push Notification Service for WorldVest Live Support
import { db } from '../firebase';
import { doc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';

export const VAPID_PUBLIC_KEY = 'BMCMyoJbMGSP0mwY1nSh4C3M6xVUYL_RKVPDjMQYbMeKirB9-OV_wreCbUPKMjq5ZaXcVRjSns6bHYBiDV675qM';

export interface AdminDevice {
  id: string;
  adminEmail: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  enabled: boolean;
  createdAt: number;
  lastActiveAt: number;
}

/**
 * Robust JSON fetch wrapper that guards against HTML responses, network errors,
 * and ensures response.json() is NEVER called on non-JSON payloads.
 */
async function safeFetchJson<T = any>(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      credentials: 'same-origin',
      ...init,
      headers: {
        'Accept': 'application/json',
        ...(init?.headers || {})
      }
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const rawText = await res.text();

    // Check if the response returned an HTML document (e.g. <!doctype or <html>) instead of JSON
    if (rawText.trim().startsWith('<') || contentType.includes('text/html')) {
      return {
        ok: false,
        status: res.status,
        error: `Endpoint ${url} returned HTML (${res.status}) rather than JSON. Please verify backend route.`
      };
    }

    try {
      const data = JSON.parse(rawText);
      return {
        ok: res.ok,
        status: res.status,
        data,
        error: res.ok ? undefined : (data?.error || data?.message || `Request failed (${res.status})`)
      };
    } catch {
      return {
        ok: false,
        status: res.status,
        error: `Invalid JSON response from ${url}: ${rawText.slice(0, 80)}`
      };
    }
  } catch (netErr: any) {
    return {
      ok: false,
      status: 0,
      error: netErr.message || 'Network request failed'
    };
  }
}

/**
 * Converts VAPID public key base64 string to Uint8Array for PushManager subscribe
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Generate or retrieve stable local device ID
 */
export function getOrCreateDeviceId(): string {
  const key = 'wv_admin_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

/**
 * Detects device type, OS, and browser for human-readable device registration
 */
export function detectDeviceInfo(): { deviceType: 'desktop' | 'mobile' | 'tablet'; browser: string; os: string; deviceName: string } {
  const ua = navigator.userAgent;
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/iPad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
    deviceType = 'mobile';
  }

  // Detect OS
  let os = 'Unknown OS';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Detect Browser
  let browser = 'Unknown Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/OPR\//i.test(ua)) browser = 'Opera';

  const typeName = deviceType === 'mobile' ? 'Phone' : deviceType === 'tablet' ? 'Tablet' : 'Desktop / Laptop';
  const deviceName = `${os} ${typeName} (${browser})`;

  return { deviceType, browser, os, deviceName };
}

/**
 * Checks if Notification and PushManager APIs are supported on this device
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Get current browser notification permission state
 */
export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Register Service Worker and subscribe current device for Push Notifications
 */
export async function registerAdminPushDevice(
  adminEmail: string,
  adminName: string = 'Administrator'
): Promise<{ success: boolean; message: string; device?: AdminDevice }> {
  if (!isPushSupported()) {
    return {
      success: false,
      message: 'Push notifications are not supported by this browser environment. In-app alerts will be active.'
    };
  }

  try {
    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        message: 'Notification permission was not granted. Please allow notifications in your browser settings.'
      };
    }

    // 2. Register Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    // 3. Subscribe to Push Manager with VAPID key
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    // 4. Gather device details
    const deviceId = getOrCreateDeviceId();
    const { deviceType, browser, os, deviceName } = detectDeviceInfo();
    const cleanEmail = (adminEmail || 'blessingubah38@gmail.com').trim().toLowerCase();
    const now = Date.now();

    const deviceRecord: AdminDevice & { subscription: any } = {
      id: `dev_${cleanEmail}_${deviceId}`,
      adminEmail: cleanEmail,
      deviceId,
      deviceName,
      deviceType,
      browser,
      os,
      enabled: true,
      createdAt: now,
      lastActiveAt: now,
      subscription: subscription.toJSON()
    };

    // 5. Always persist device record directly to Firestore if available
    let firestoreSaved = false;
    try {
      if (db) {
        await setDoc(doc(db, 'admin_devices', deviceRecord.id), deviceRecord, { merge: true });
        firestoreSaved = true;
      }
    } catch (fErr) {
      console.warn('Direct Firestore device save note:', fErr);
    }

    // 6. Send registration to backend API endpoint safely
    const apiResult = await safeFetchJson<{ success: boolean; device?: AdminDevice; message?: string; error?: string }>(
      '/api/notifications/register-device',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: cleanEmail,
          adminName,
          deviceId,
          deviceName,
          deviceType,
          browser,
          os,
          subscription: subscription.toJSON()
        })
      }
    );

    const isSuccess = (apiResult.ok && apiResult.data?.success) || firestoreSaved;

    if (isSuccess) {
      localStorage.setItem('wv_admin_push_registered', 'true');
      localStorage.setItem('wv_admin_push_email', cleanEmail);
      localStorage.setItem(`wv_admin_device_${deviceId}`, JSON.stringify(deviceRecord));
      return {
        success: true,
        message: `Device "${deviceName}" successfully registered for real-time notifications!`,
        device: apiResult.data?.device || deviceRecord
      };
    } else {
      throw new Error(apiResult.error || 'Failed to register device on server.');
    }
  } catch (error: any) {
    console.error('registerAdminPushDevice error:', error);
    return {
      success: false,
      message: error.message || 'An error occurred while enabling push notifications.'
    };
  }
}

/**
 * Unregister current device from push notifications
 */
export async function unregisterAdminPushDevice(adminEmail: string): Promise<boolean> {
  try {
    const cleanEmail = (adminEmail || '').trim().toLowerCase();
    const deviceId = getOrCreateDeviceId();
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }
      }
    }

    // Delete from Firestore
    try {
      if (db) {
        await deleteDoc(doc(db, 'admin_devices', `dev_${cleanEmail}_${deviceId}`));
      }
    } catch (fErr) {}

    await safeFetchJson('/api/notifications/unregister-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminEmail: cleanEmail, deviceId })
    });

    localStorage.removeItem('wv_admin_push_registered');
    return true;
  } catch (e) {
    console.warn('unregisterAdminPushDevice error:', e);
    return false;
  }
}

/**
 * Fetch all registered admin devices
 */
export async function fetchAdminDevices(): Promise<AdminDevice[]> {
  try {
    const apiResult = await safeFetchJson<{ success: boolean; devices?: AdminDevice[] }>('/api/notifications/devices');
    if (apiResult.ok && apiResult.data?.success && Array.isArray(apiResult.data.devices) && apiResult.data.devices.length > 0) {
      return apiResult.data.devices;
    }
  } catch (e) {
    console.warn('fetchAdminDevices API note:', e);
  }

  // Fallback to Firestore directly if API returned empty or had network issues
  try {
    if (db) {
      const snap = await getDocs(collection(db, 'admin_devices'));
      if (!snap.empty) {
        const devices: AdminDevice[] = [];
        snap.forEach(d => {
          const data = d.data();
          devices.push({
            id: d.id,
            adminEmail: data.adminEmail || '',
            deviceId: data.deviceId || d.id,
            deviceName: data.deviceName || 'Admin Device',
            deviceType: data.deviceType || 'desktop',
            browser: data.browser || '',
            os: data.os || '',
            enabled: data.enabled !== false,
            createdAt: data.createdAt || Date.now(),
            lastActiveAt: data.lastActiveAt || Date.now()
          });
        });
        return devices;
      }
    }
  } catch (fErr) {
    console.warn('fetchAdminDevices Firestore fallback note:', fErr);
  }

  return [];
}

/**
 * Notification settings interface
 */
export interface AdminNotificationSettings {
  pushNotifications: boolean;
  soundAlerts: boolean;
  minSessionCooldownSeconds?: number;
}

/**
 * Fetch current admin notification settings
 */
export async function fetchNotificationSettings(): Promise<AdminNotificationSettings> {
  try {
    const apiResult = await safeFetchJson<{ success: boolean; settings?: AdminNotificationSettings }>('/api/notifications/settings');
    if (apiResult.ok && apiResult.data?.success && apiResult.data.settings) {
      if (typeof apiResult.data.settings.soundAlerts === 'boolean') {
        setNotificationSoundEnabled(apiResult.data.settings.soundAlerts);
      }
      return apiResult.data.settings;
    }
  } catch (e) {
    console.warn('fetchNotificationSettings error:', e);
  }
  return {
    pushNotifications: true,
    soundAlerts: isNotificationSoundEnabled(),
    minSessionCooldownSeconds: 300
  };
}

/**
 * Update admin notification settings
 */
export async function updateNotificationSettings(settings: Partial<AdminNotificationSettings>): Promise<AdminNotificationSettings | null> {
  try {
    if (typeof settings.soundAlerts === 'boolean') {
      setNotificationSoundEnabled(settings.soundAlerts);
    }
    const apiResult = await safeFetchJson<{ success: boolean; settings?: AdminNotificationSettings }>('/api/notifications/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (apiResult.ok && apiResult.data?.success && apiResult.data.settings) {
      return apiResult.data.settings;
    }
  } catch (e) {
    console.warn('updateNotificationSettings error:', e);
  }
  return null;
}

/**
 * Trigger Phone Test Notification (Formatted for Phone screens)
 */
export async function sendTestPhoneAlert(adminEmail?: string): Promise<{ success: boolean; message: string }> {
  try {
    const email = (adminEmail || localStorage.getItem('wv_admin_push_email') || '').trim().toLowerCase();
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    // Directly display OS notification if supported & permission granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🔔 WORLDVEST CAPITAL', {
          body: `New website visitor detected.\n\nVisitor: Returning Client\nDevice: Android Phone\nPage: Homepage\nTime: ${timeStr}`,
          icon: '/logohead_light.png',
          badge: '/logohead_light.png',
          tag: 'visitor-test-phone'
        });
      } catch (e) {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('🔔 WORLDVEST CAPITAL', {
              body: `New website visitor detected.\n\nVisitor: Returning Client\nDevice: Android Phone\nPage: Homepage\nTime: ${timeStr}`,
              icon: '/logohead_light.png',
              badge: '/logohead_light.png',
              tag: 'visitor-test-phone'
            });
          });
        }
      }
    }

    const apiResult = await safeFetchJson<{ success: boolean; message?: string }>('/api/notifications/test-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminEmail: email })
    });

    return {
      success: true,
      message: (apiResult.data && apiResult.data.message) || 'Phone test notification dispatched!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error triggering phone test alert.'
    };
  }
}

/**
 * Trigger Desktop Test Notification (Formatted for Laptop / Desktop screens)
 */
export async function sendTestDesktopAlert(adminEmail?: string): Promise<{ success: boolean; message: string }> {
  try {
    const email = (adminEmail || localStorage.getItem('wv_admin_push_email') || '').trim().toLowerCase();

    // Directly display OS notification if supported & permission granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🔔 WORLDVEST CAPITAL', {
          body: 'New website visitor detected\nReturning Client • Windows Laptop • Homepage',
          icon: '/logohead_light.png',
          badge: '/logohead_light.png',
          tag: 'visitor-test-desktop'
        });
      } catch (e) {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('🔔 WORLDVEST CAPITAL', {
              body: 'New website visitor detected\nReturning Client • Windows Laptop • Homepage',
              icon: '/logohead_light.png',
              badge: '/logohead_light.png',
              tag: 'visitor-test-desktop'
            });
          });
        }
      }
    }

    const apiResult = await safeFetchJson<{ success: boolean; message?: string }>('/api/notifications/test-desktop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminEmail: email })
    });

    return {
      success: true,
      message: (apiResult.data && apiResult.data.message) || 'Desktop test notification dispatched!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error triggering desktop test alert.'
    };
  }
}

/**
 * Trigger a test notification to verify delivery on laptop or phone
 */
export async function sendTestAlert(adminEmail: string): Promise<{ success: boolean; message: string }> {
  try {
    const apiResult = await safeFetchJson<{ success: boolean; message?: string }>('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail,
        deviceId: getOrCreateDeviceId()
      })
    });
    return {
      success: true,
      message: (apiResult.data && apiResult.data.message) || 'Test notification sent to registered devices.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error triggering test alert.'
    };
  }
}

/**
 * Track website visitor session and ping backend push notification engine
 */
export async function trackWebsiteVisitor(params: {
  pageName: string;
  isAdmin?: boolean;
  userEmail?: string;
  userName?: string;
}): Promise<void> {
  // Never track if in Admin view or admin user
  if (params.isAdmin) return;

  try {
    // Session debounce on client side to prevent excessive pings on rapid tab switches
    const lastTrackTimeStr = sessionStorage.getItem('wv_last_visitor_ping_time');
    const now = Date.now();
    if (lastTrackTimeStr && (now - parseInt(lastTrackTimeStr, 10)) < 120000) {
      // Checked in past 2 minutes in this tab, skip
      return;
    }
    sessionStorage.setItem('wv_last_visitor_ping_time', now.toString());

    // Persistent visitor ID & returning client status
    const visitorKey = 'wv_persistent_visitor_id';
    let visitorId = localStorage.getItem(visitorKey);
    const seenBefore = Boolean(visitorId);
    if (!visitorId) {
      visitorId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(visitorKey, visitorId);
    }

    let visitorType = seenBefore ? 'Returning Client' : 'New Visitor';
    if (params.userName || params.userEmail) {
      visitorType = `Returning Client (${params.userName || params.userEmail})`;
    }

    // Determine device string
    const ua = navigator.userAgent;
    let deviceStr = 'Desktop PC';
    if (/Android.*Mobile/i.test(ua)) deviceStr = 'Android Phone';
    else if (/Android/i.test(ua)) deviceStr = 'Android Tablet';
    else if (/iPhone/i.test(ua)) deviceStr = 'iPhone';
    else if (/iPad/i.test(ua)) deviceStr = 'iPad Tablet';
    else if (/Windows/i.test(ua)) deviceStr = 'Windows Laptop';
    else if (/Macintosh|Mac OS X/i.test(ua)) deviceStr = 'MacBook';
    else if (/Linux/i.test(ua)) deviceStr = 'Linux PC';

    await fetch('/api/visitors/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        visitorType,
        device: deviceStr,
        page: params.pageName || 'Homepage',
        path: window.location.pathname || '/',
        isAdmin: false
      })
    });
  } catch (e) {
    // Silent fail for non-intrusive tracking
  }
}

/**
 * Setup listener for service worker push notifications while dashboard is open in foreground
 */
export function setupForegroundNotificationListener(onAlert?: (payload: any) => void): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'PUSH_NOTIFICATION_RECEIVED') {
      // Play sound chime if sound alerts are active
      if (isNotificationSoundEnabled()) {
        playNotificationChime();
      }
      if (onAlert) {
        onAlert(event.data);
      }
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);
  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}

/**
 * Dispatches a client message notification event to all registered admin devices
 */
export async function notifyClientMessage(payload: {
  sessionId: string;
  messageText: string;
  clientName?: string;
  clientEmail?: string;
}): Promise<void> {
  try {
    await fetch('/api/support/notify-client-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: payload.sessionId,
        messageText: payload.messageText,
        clientName: payload.clientName || 'Client',
        clientEmail: payload.clientEmail || 'Guest Visitor',
        timestamp: Date.now()
      })
    });
  } catch (e) {
    console.warn('notifyClientMessage dispatch note:', e);
  }
}

/**
 * Notification sound toggle management
 */
const SOUND_KEY = 'wv_admin_sound_enabled';

export function isNotificationSoundEnabled(): boolean {
  try {
    const val = localStorage.getItem(SOUND_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? 'true' : 'false');
  } catch {}
}

/**
 * Plays a short, crisp, high-fidelity notification chime using the Web Audio API.
 * Synthesized directly in code with zero external mp3 file dependencies.
 */
let audioCtx: AudioContext | null = null;

export function playNotificationChime(): void {
  if (!isNotificationSoundEnabled()) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // First tone (587.33 Hz - D5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.16);

    // Second tone (880.00 Hz - A5)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.46);
  } catch (e) {
    console.warn('Audio chime playback note:', e);
  }
}
