import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { isFirebaseReady } from './firebaseService';

const checkFirebaseReady = (): boolean => {
  return typeof isFirebaseReady === 'function' ? (isFirebaseReady as any)() : Boolean(isFirebaseReady);
};

export interface ChatMessage {
  id: string;
  sender: 'user' | 'support';
  text: string;
  timestamp: string;
  createdAt?: number;
}

export interface SupportChatSession {
  id: string;
  userEmail: string;
  userName: string;
  lastMessage: string;
  updatedAt: number;
  unreadByAdmin: boolean;
  unreadByUser: boolean;
  status: 'active' | 'resolved';
  messages: ChatMessage[];
}

export interface SupportAutoReplySettings {
  enabled: boolean;
  defaultReply: string;
  depositReply: string;
  withdrawalReply: string;
  plansReply: string;
  typingDelaySeconds: number;
}

export const DEFAULT_SUPPORT_SETTINGS: SupportAutoReplySettings = {
  enabled: true,
  defaultReply: 'Thank you for reaching out! A support specialist is reviewing your inquiry and will guide you momentarily.',
  depositReply: 'To deposit funds, navigate to your dashboard and click "Deposit". Select your desired token (USDT TRC20/ERC20, Bitcoin, Ethereum, etc.) and copy your uniquely assigned secure wallet address.',
  withdrawalReply: 'Withdrawals are processed automatically via bank-grade blockchain routing. Please verify your payout wallet address in settings before submitting a request.',
  plansReply: 'Our verified investment plans range from 44-hour and 66-hour high-frequency cycles to institutional 21-day terms. Yields are calculated automatically and credited to your balance.',
  typingDelaySeconds: 1.2,
};

const LOCAL_STORAGE_SETTINGS_KEY = 'wv_support_auto_reply_settings';
const LOCAL_STORAGE_CHATS_KEY = 'wv_local_support_chats';

/**
 * Returns formatted time like "04:55 PM"
 */
export function formatChatTime(date = new Date()): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strMinutes = minutes < 10 ? '0' + minutes : minutes;
  const strHours = hours < 10 ? '0' + hours : hours;
  return `${strHours}:${strMinutes} ${ampm}`;
}

/**
 * Fetch Support Auto-Reply Settings (Firestore with localStorage fallback)
 */
export async function getSupportSettings(): Promise<SupportAutoReplySettings> {
  try {
    if (checkFirebaseReady() && db) {
      const docRef = doc(db, 'support_settings', 'general');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<SupportAutoReplySettings>;
        const merged = { ...DEFAULT_SUPPORT_SETTINGS, ...data };
        localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.warn('Error fetching support settings from Firestore:', err);
  }

  // Fallback to localStorage
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (cached) {
      return { ...DEFAULT_SUPPORT_SETTINGS, ...JSON.parse(cached) };
    }
  } catch {}

  return DEFAULT_SUPPORT_SETTINGS;
}

/**
 * Save Support Auto-Reply Settings
 */
export async function saveSupportSettings(settings: SupportAutoReplySettings): Promise<void> {
  // Always update localStorage immediately
  try {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}

  // Update in Firestore
  if (checkFirebaseReady() && db) {
    try {
      const docRef = doc(db, 'support_settings', 'general');
      await setDoc(docRef, {
        ...settings,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Error saving support settings to Firestore:', err);
    }
  }
}

/**
 * Subscribe to Support Auto-Reply Settings
 */
export function subscribeToSupportSettings(callback: (settings: SupportAutoReplySettings) => void): () => void {
  // Provide instant local data first
  getSupportSettings().then(callback);

  if (!checkFirebaseReady() || !db) {
    return () => {};
  }

  try {
    const docRef = doc(db, 'support_settings', 'general');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<SupportAutoReplySettings>;
        const merged = { ...DEFAULT_SUPPORT_SETTINGS, ...data };
        localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(merged));
        callback(merged);
      }
    }, (err) => {
      console.warn('support_settings subscription warning:', err);
    });
  } catch {
    return () => {};
  }
}

/**
 * Helper to get local sessions from localStorage
 */
function getLocalSessions(): SupportChatSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

/**
 * Helper to save local sessions to localStorage
 */
function saveLocalSessions(sessions: SupportChatSession[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_CHATS_KEY, JSON.stringify(sessions));
  } catch {}
}

/**
 * Send a message from user/visitor into a chat session
 */
export async function sendUserChatMessage(
  sessionId: string,
  text: string,
  userInfo?: { email?: string; name?: string }
): Promise<ChatMessage> {
  const newMsg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sender: 'user',
    text,
    timestamp: formatChatTime(),
    createdAt: Date.now()
  };

  const localSessions = getLocalSessions();
  const existingIdx = localSessions.findIndex(s => s.id === sessionId);
  const now = Date.now();

  let updatedSession: SupportChatSession;
  if (existingIdx >= 0) {
    const current = localSessions[existingIdx];
    updatedSession = {
      ...current,
      userEmail: userInfo?.email || current.userEmail || 'Guest Visitor',
      userName: userInfo?.name || current.userName || 'Client',
      lastMessage: text,
      updatedAt: now,
      unreadByAdmin: true,
      messages: [...current.messages, newMsg]
    };
    localSessions[existingIdx] = updatedSession;
  } else {
    updatedSession = {
      id: sessionId,
      userEmail: userInfo?.email || 'Guest Visitor',
      userName: userInfo?.name || 'Client',
      lastMessage: text,
      updatedAt: now,
      unreadByAdmin: true,
      unreadByUser: false,
      status: 'active',
      messages: [newMsg]
    };
    localSessions.unshift(updatedSession);
  }
  saveLocalSessions(localSessions);

  // Sync to Firestore
  if (checkFirebaseReady() && db) {
    try {
      const docRef = doc(db, 'support_chats', sessionId);
      await setDoc(docRef, {
        id: updatedSession.id,
        userEmail: updatedSession.userEmail,
        userName: updatedSession.userName,
        lastMessage: updatedSession.lastMessage,
        updatedAt: updatedSession.updatedAt,
        unreadByAdmin: true,
        unreadByUser: false,
        status: updatedSession.status,
        messages: updatedSession.messages
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore sendUserChatMessage sync error:', err);
    }
  }

  return newMsg;
}

/**
 * Send an Admin reply into a chat session
 */
export async function sendAdminChatMessage(
  sessionId: string,
  text: string
): Promise<ChatMessage> {
  const newMsg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sender: 'support',
    text,
    timestamp: formatChatTime(),
    createdAt: Date.now()
  };

  const localSessions = getLocalSessions();
  const existingIdx = localSessions.findIndex(s => s.id === sessionId);
  const now = Date.now();

  if (existingIdx >= 0) {
    const current = localSessions[existingIdx];
    const updatedSession: SupportChatSession = {
      ...current,
      lastMessage: text,
      updatedAt: now,
      unreadByUser: true,
      messages: [...current.messages, newMsg]
    };
    localSessions[existingIdx] = updatedSession;
    saveLocalSessions(localSessions);

    if (checkFirebaseReady() && db) {
      try {
        const docRef = doc(db, 'support_chats', sessionId);
        await setDoc(docRef, {
          lastMessage: text,
          updatedAt: now,
          unreadByUser: true,
          messages: updatedSession.messages
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore sendAdminChatMessage sync error:', err);
      }
    }
  }

  return newMsg;
}

/**
 * Subscribe to a specific chat session (used by the visitor widget)
 */
export function subscribeToChatSession(
  sessionId: string,
  callback: (session: SupportChatSession | null) => void
): () => void {
  // Call callback with local data first
  const localSessions = getLocalSessions();
  const local = localSessions.find(s => s.id === sessionId) || null;
  callback(local);

  if (!checkFirebaseReady() || !db) {
    return () => {};
  }

  try {
    const docRef = doc(db, 'support_chats', sessionId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SupportChatSession;
        // Merge into local cache
        const allLocal = getLocalSessions();
        const idx = allLocal.findIndex(s => s.id === sessionId);
        if (idx >= 0) {
          allLocal[idx] = data;
        } else {
          allLocal.unshift(data);
        }
        saveLocalSessions(allLocal);
        callback(data);
      }
    }, (err) => {
      console.warn('subscribeToChatSession error:', err);
    });
  } catch {
    return () => {};
  }
}

/**
 * Subscribe to ALL chat sessions (used by the Admin Panel Live Support Desk)
 */
export function subscribeToAllChatSessions(
  callback: (sessions: SupportChatSession[]) => void
): () => void {
  // Give instant local data
  const localSessions = getLocalSessions();
  callback(localSessions);

  if (!checkFirebaseReady() || !db) {
    return () => {};
  }

  try {
    const colRef = collection(db, 'support_chats');
    return onSnapshot(colRef, (snapshot) => {
      const remoteSessions: SupportChatSession[] = [];
      snapshot.forEach((doc) => {
        remoteSessions.push(doc.data() as SupportChatSession);
      });

      // Sort by latest updated first
      remoteSessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      // Update local storage
      saveLocalSessions(remoteSessions);
      callback(remoteSessions);
    }, (err) => {
      console.warn('subscribeToAllChatSessions warning:', err);
    });
  } catch {
    return () => {};
  }
}

/**
 * Delete a chat session
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  const localSessions = getLocalSessions().filter(s => s.id !== sessionId);
  saveLocalSessions(localSessions);

  if (checkFirebaseReady() && db) {
    try {
      const docRef = doc(db, 'support_chats', sessionId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('deleteChatSession Firestore error:', err);
    }
  }
}

/**
 * Mark a session as read by Admin
 */
export async function markSessionAsReadByAdmin(sessionId: string): Promise<void> {
  const localSessions = getLocalSessions();
  const idx = localSessions.findIndex(s => s.id === sessionId);
  if (idx >= 0) {
    localSessions[idx].unreadByAdmin = false;
    saveLocalSessions(localSessions);
  }

  if (checkFirebaseReady() && db) {
    try {
      const docRef = doc(db, 'support_chats', sessionId);
      await updateDoc(docRef, { unreadByAdmin: false });
    } catch {}
  }
}
