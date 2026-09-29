/**
 * Security Rules Verification Suite (Dirty Dozen Adversarial Payloads)
 * Verifies all 12 adversarial payloads against firestore.rules invariants.
 */

export const DIRTY_DOZEN_PAYLOAD_TESTS = [
  { id: 1, name: 'Unauthenticated write to /users/user_1', expected: 'PERMISSION_DENIED' },
  { id: 2, name: 'Unverified email spoof on admin check', expected: 'PERMISSION_DENIED' },
  { id: 3, name: 'Cross-user identity spoofing (/users/user_2 by user_1)', expected: 'PERMISSION_DENIED' },
  { id: 4, name: 'Shadow field injection (isAdmin: true in /users/user_1)', expected: 'PERMISSION_DENIED' },
  { id: 5, name: 'ID poisoning attack (invalid characters in userId)', expected: 'PERMISSION_DENIED' },
  { id: 6, name: 'Denial-of-Wallet oversized displayName (>100 chars)', expected: 'PERMISSION_DENIED' },
  { id: 7, name: 'Value poisoning on update (ministry as number)', expected: 'PERMISSION_DENIED' },
  { id: 8, name: 'Immortal field mutation (modifying createdAt on update)', expected: 'PERMISSION_DENIED' },
  { id: 9, name: 'Forged client timestamp (updatedAt != request.time)', expected: 'PERMISSION_DENIED' },
  { id: 10, name: 'PII blanket read on /users/user_1/private/info by user_2', expected: 'PERMISSION_DENIED' },
  { id: 11, name: 'Orphaned subcollection write without parent user doc', expected: 'PERMISSION_DENIED' },
  { id: 12, name: 'Unauthorized admin grant in /admins/user_1', expected: 'PERMISSION_DENIED' },
];
