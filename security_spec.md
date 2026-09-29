# NIRVANA Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default Deny**: All paths not explicitly matched (`/{document=**}`) deny all reads and writes.
2. **Verified Authentication**: Every write requires `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Identity Integrity & Self-Registration Guard**: A user profile at `/users/{userId}` can only be created or updated if `userId == request.auth.uid` and `incoming().uid == request.auth.uid`. Users cannot self-assign admin roles (`role` or `isAdmin` fields are strictly forbidden by `hasOnly`).
4. **PII Isolation (Split Collection)**: User email addresses are isolated in `/users/{userId}/private/{infoId}` and never stored in `/users/{userId}`. Both `/users/{userId}` and `/users/{userId}/private/{infoId}` forbid blanket `isSignedIn()` reads and restrict `get` to `isOwner(userId) || isAdmin()`.
5. **Master Gate Relational Sync**: Access to `/users/{userId}/private/{infoId}` requires the parent `/users/{userId}` document to exist (`exists(...)` or `existsAfter(...)`) and belong to `request.auth.uid`.
6. **Temporal & Immutable Fields**: `createdAt` and `uid` are immutable on update; `createdAt` must equal `request.time` on create, and `updatedAt` must equal `request.time` on create and update.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: `auth: null`, `path: /users/user_1`, payload with valid fields -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: `auth: { uid: 'admin_1', email: 'prasanthipothireddi728@gmail.com', email_verified: false }` -> `PERMISSION_DENIED`.
3. **Cross-User Identity Spoofing**: `auth: { uid: 'user_1' }` writing to `/users/user_2` or setting `uid: 'user_2'` -> `PERMISSION_DENIED`.
4. **Privilege Escalation / Shadow Field Injection**: Adding `"isAdmin": true` or `"role": "admin"` to `/users/user_1` -> Rejected by `hasOnly()`.
5. **ID Poisoning Attack**: Path `/users/invalid$id!@#` or >128 chars -> Rejected by `isValidId()`.
6. **Denial-of-Wallet Oversized String**: `displayName` with 5,000 characters -> Rejected by `.size() <= 100`.
7. **Value Poisoning on Update**: Updating `ministry` to a number `12345` or boolean `true` -> Rejected by `isValidUserProfile(incoming())`.
8. **Immortal Field Mutation**: Attempting to modify `createdAt` or `uid` during an update -> Rejected by immutability gate.
9. **Forged Client Timestamp**: Supplying a past/future `updatedAt` != `request.time` -> Rejected by temporal integrity gate.
10. **PII Blanket Read Attack**: Authenticated `user_2` attempting `get` on `/users/user_1/private/info` -> `PERMISSION_DENIED`.
11. **Orphaned Subcollection Write**: Creating `/users/user_1/private/info` when `/users/user_1` does not exist -> Rejected by Master Gate.
12. **Unauthorized Admin Grant**: Standard user attempting to create `/admins/user_1` -> `PERMISSION_DENIED`.
