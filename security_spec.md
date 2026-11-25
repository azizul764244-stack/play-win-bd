# Security Specification — PLAY & WIN BD

## 1. Data Invariants
1. A user profile at `/users/{userId}` can only be read or modified by the verified owner (`request.auth.uid == userId`) or the verified admin (`azizul764244@gmail.com` or `/admins/{uid}`).
2. Users cannot self-assign roles, reward points, or bypass daily point limits in Firestore. All reward points, daily caps, anti-cheat checks, and high score verifications are enforced on the server (`/api/games/session/start` and `/api/games/session/finish`) using verified Firebase ID tokens.
3. Chat messages at `/chat_messages/{messageId}` must belong to `request.auth.uid`, have verified email, strictly enforce `text.size() >= 1 && text.size() <= 300`, and use `createdAt == request.time`.
4. All document IDs (`userId`, `messageId`, `adminId`) must satisfy `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).

## 2. Dirty Dozen Adversarial Payloads
1. **Shadow Field Injection on User Create**: `{ uid, displayName, email, createdAt, updatedAt, isAdmin: true }` -> `PERMISSION_DENIED` (`hasOnly` check).
2. **Identity Spoofing on Chat Create**: `{ uid: "other_uid", displayName: "Spoof", text: "hi", createdAt }` -> `PERMISSION_DENIED` (`uid == request.auth.uid`).
3. **Unverified Email Spoofing**: Authenticated user with `email_verified: false` attempting write -> `PERMISSION_DENIED`.
4. **PII Leak via Blanket User Read**: Authenticated user A reading `/users/userB` -> `PERMISSION_DENIED`.
5. **PII Leak via User List**: Authenticated user attempting `list` on `/users` -> `PERMISSION_DENIED` (only owner/admin).
6. **Client Timestamp Forgery**: Creating chat message with backdated `createdAt` != `request.time` -> `PERMISSION_DENIED`.
7. **Immutable `createdAt` Mutation**: Updating `/users/{uid}` and changing `createdAt` -> `PERMISSION_DENIED`.
8. **ID Poisoning**: Writing `/chat_messages/${'a'.repeat(500)}` -> `PERMISSION_DENIED` (`isValidId`).
9. **Denial-of-Wallet Oversized Chat Text**: Creating chat message with 50KB `text` -> `PERMISSION_DENIED` (`text.size() <= 300`).
10. **Ghost Field on Profile Update**: Updating `/users/{uid}` with `rewardPoints: 999999` -> `PERMISSION_DENIED` (`affectedKeys().hasOnly`).
11. **Non-Owner Chat Delete**: User A deleting User B's chat message -> `PERMISSION_DENIED`.
12. **Admin Escalation**: Regular user creating `/admins/{uid}` -> `PERMISSION_DENIED` (client writes blocked).
