const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const AUTHORIZED_ADMIN_EMAILS = [
  'blessingubah38@gmail.com',
  'sheilawalshsheila@gmail.com'
];

/**
 * Trigger 1: Automatically triggered whenever a user document is deleted from Firestore `/users/{userId}`.
 * Permanently removes the user account from Firebase Authentication (Identity Platform console).
 */
exports.deleteAuthUserOnProfileDelete = onDocumentDeleted("users/{userId}", async (event) => {
  const userId = event.params.userId;
  console.log(`[AUTH-TRIGGER] User profile deleted from Firestore for UID: ${userId}. Purging from Firebase Authentication...`);

  try {
    await admin.auth().deleteUser(userId);
    console.log(`[AUTH-TRIGGER] Successfully deleted user ${userId} permanently from Firebase Auth.`);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log(`[AUTH-TRIGGER] User ${userId} was already deleted or does not exist in Firebase Auth.`);
    } else {
      console.error(`[AUTH-TRIGGER] Error deleting user ${userId} from Firebase Auth:`, error);
    }
  }
});

/**
 * Callable 2: OnCall Firebase Function to permanently delete a user by UID with admin authorization.
 */
exports.deleteAuthUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const callerEmail = (request.auth.token.email || '').toLowerCase();
  const isSuperAdmin = AUTHORIZED_ADMIN_EMAILS.includes(callerEmail) || request.auth.token.admin === true;

  if (!isSuperAdmin) {
    throw new HttpsError('permission-denied', 'Only authorized administrators can delete users.');
  }

  const targetUserUid = request.data?.targetUserUid || request.data?.uid;
  if (!targetUserUid || typeof targetUserUid !== 'string') {
    throw new HttpsError('invalid-argument', 'A valid targetUserUid is required.');
  }

  if (request.auth.uid === targetUserUid) {
    throw new HttpsError('failed-precondition', 'An administrator cannot delete their own account.');
  }

  console.log(`[AUTH-CALLABLE] Admin ${callerEmail} requested permanent deletion of user UID: ${targetUserUid}`);

  try {
    await admin.auth().deleteUser(targetUserUid);
    console.log(`[AUTH-CALLABLE] Successfully deleted user ${targetUserUid} from Firebase Auth.`);
    return { success: true, uid: targetUserUid, message: `User ${targetUserUid} permanently deleted from Firebase Authentication.` };
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return { success: true, uid: targetUserUid, message: `User ${targetUserUid} was not found in Firebase Auth (already deleted).` };
    }
    console.error(`[AUTH-CALLABLE] Error deleting user ${targetUserUid}:`, error);
    throw new HttpsError('internal', `Failed to delete user from Firebase Auth: ${error.message}`);
  }
});

/**
 * HTTP 3: Standard HTTPS endpoint for REST API deletion calls.
 */
exports.deleteAuthUserHttp = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const callerEmail = (decodedToken.email || '').toLowerCase();

    if (!AUTHORIZED_ADMIN_EMAILS.includes(callerEmail) && !decodedToken.admin) {
      return res.status(403).json({ error: 'Forbidden. Administrator privileges required.' });
    }

    const targetUserUid = req.body?.targetUserUid || req.body?.uid;
    if (!targetUserUid) {
      return res.status(400).json({ error: 'Target user UID (targetUserUid) is required.' });
    }

    if (decodedToken.uid === targetUserUid) {
      return res.status(400).json({ error: 'Cannot delete your own admin account.' });
    }

    await admin.auth().deleteUser(targetUserUid);
    console.log(`[AUTH-HTTP] Admin ${callerEmail} deleted user ${targetUserUid} from Firebase Auth.`);
    return res.json({ success: true, uid: targetUserUid, message: `User ${targetUserUid} permanently deleted from Firebase Authentication.` });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return res.json({ success: true, uid: req.body?.targetUserUid || req.body?.uid, message: 'User was not found in Firebase Auth (already removed).' });
    }
    console.error('[AUTH-HTTP] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});
