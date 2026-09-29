// src/services/notificationService.ts
// Cross-Device Admin Push Notification Service for WorldVest Live Support

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

    // 5. Send registration to backend
    const res = await fetch('/api/notifications/register-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail,
        adminName,
        deviceId,
        deviceName,
        deviceType,
        browser,
        os,
        subscription: subscription.toJSON()
      })
    });

    const data = await res.json();
    if (data.success) {
      localStorage.setItem('wv_admin_push_registered', 'true');
      localStorage.setItem('wv_admin_push_email', adminEmail);
      return {
        success: true,
        message: `Device "${deviceName}" successfully registered for real-time notifications!`,
        device: data.device
      };
    } else {
      throw new Error(data.error || 'Failed to register device on server.');
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

    await fetch('/api/notifications/unregister-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminEmail, deviceId })
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
    const res = await fetch('/api/notifications/devices');
    const data = await res.json();
    if (data.success && Array.isArray(data.devices)) {
      return data.devices;
    }
  } catch (e) {
    console.warn('fetchAdminDevices error:', e);
  }
  return [];
}

/**
 * Trigger a test notification to verify delivery on laptop or phone
 */
export async function sendTestAlert(adminEmail: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail,
        deviceId: getOrCreateDeviceId()
      })
    });
    const data = await res.json();
    return {
      success: data.success,
      message: data.message || (data.success ? 'Test notification sent to all registered devices.' : 'Failed to send test alert.')
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error triggering test alert.'
    };
  }
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
