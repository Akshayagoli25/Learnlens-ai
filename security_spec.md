# Security Specification: LearnLens AI

## 1. Data Invariants
1. **User Identity & Role Elevation**: Ordinary registration only permits 'student' or 'teacher' roles. Users can never set or alter their role to 'admin'. Admin privilege is strictly restricted to bootstrapped admin (goliakshaya07@gmail.com) and verified administrators.
2. **Assessment Marks Integrity**: Mark scores cannot exceed the assessment's `maxMarks`. Confirmed marks can only be modified by the creating teacher or an admin.
3. **Student Privacy**: Students can only access their own submissions, personal gap analyses, assigned resources/lessons, and personal mark records.
4. **Relational Authorization**: A teacher can only modify assessments, marks, lesson plans, and assignments that they created, or if granted admin access.
5. **No Client Spoofing**: Timestamps and owner IDs must strictly match the authenticated user and server-verified constraints.

## 2. The "Dirty Dozen" Attack Payloads (Designed to be Rejected)
1. **Self-Admin Escalation**: An unprivileged user registering with `role: "admin"` in `/users/{userId}`.
2. **Marks Overflow Attack**: Submitting `marksObtained: 150` when `maxMarks: 100`.
3. **Student Mark Tampering**: A student writing to `/marks/{markId}` to inflate their own score.
4. **Cross-Student PII Scraping**: Student A attempting a `get` or query on Student B's `/gapAnalyses/{analysisId}`.
5. **Junk Character Path Injection**: Document creation with an ID exceeding 128 characters or containing illegal symbols `../../malicious`.
6. **Ghost Field Shadow Update**: Updating an assessment with an unauthorized shadow key `{ isApproved: true, injectedPayload: 'test' }`.
7. **Identity Impersonation**: Teacher A deleting an assessment created by Teacher B with mismatched `teacherId != request.auth.uid`.
8. **Immutability Breach**: Mutating `createdAt` or `studentId` on an existing submission.
9. **Fake Submission Injection**: A user submitting work on behalf of another student (`studentId: "victimUid"` where `auth.uid != "victimUid"`).
10. **Unauthenticated Read/Write**: Querying collections without valid Firebase Auth token.
11. **Negative Score Exploit**: Submitting negative marks `{ marksObtained: -5 }`.
12. **Denial-of-Wallet Array Flooding**: Submitting an array of 5,000 question items to exhaust firestore doc storage and trigger high parsing costs.
