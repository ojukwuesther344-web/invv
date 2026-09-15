# Firebase Security Specification & Invariance Profile

## 1. Data Invariants
- Each user profile matches `request.auth.uid` precisely. No tenant can view or corrupt metrics belonging to another investor.
- Deposits and withdrawals must contain complete tracking metadata (ID, userId, username, transaction processor, date, and amount) and must validate structural shape before saving.
- Self-assigned admin claims are prohibited.

## 2. Tested Payloads & Target Denials (The "Dirty Dozen" Audit)
1. **Unsigned-in User writes user profile** -> Blocked because `isSignedIn()` is false.
2. **User A overwrites User B's balance** -> Blocked because `request.auth.uid == userId` is unmet.
3. **Malicious field injection `isVerified: true` into user record** -> Blocked by schema validation and key boundaries.
4. **Junk string Injection into depositId (e.g., 200KB character string)** -> Blocked by `id.size() <= 128`.
5. **Withdrawal written without `amount`** -> Blocked by `hasAll` structural constraints.
6. **Negative amount deposit** -> Blocked by format check validations.
7. **Bypass authentication totally to list deposits** -> Blocked because read requires auth and owns dataset check.
8. **Forged author claims** -> Blocks profile creation if `request.auth.uid != userId`.
9. **Spamming fake usernames** -> Blocked by format boundary restrictions.
10. **Admin overrides spoofing** -> Admin rules defaulted to false, keeping users locked inside their safe sandbox.
11. **Altering existing deposit timestamps** -> Immutable fields.
12. **Null/Empty payload insert** -> Prevented by schema checks.
