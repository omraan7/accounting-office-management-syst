# Security Specification - Accounting Task Management

## Data Invariants
1. A task must have an assignee.
2. Only Admins can create tasks.
3. Accountants can only see tasks assigned to them or tasks they created (if any).
4. Status transitions follow a strict logical order: not_seen -> seen -> accepted -> (completed | not_completed).
5. User profiles are readable by the user themselves and Admins.
6. Only Admins can approve or delete users.

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a task with `request.auth.uid` of another user.
2. **Privilege Escalation**: Attempt to update own user profile to set `role: 'admin'`.
3. **Ghost Users**: Attempt to register with `status: 'approved'` without admin review.
4. **Task Hijacking**: Attempt to update a task not assigned to the current user.
5. **State Shortcut**: Attempt to jump from `not_seen` directly to `completed` without `seen` or `accepted` (though `seen` is auto-marked, `accepted` is a user action).
6. **Immutable Field Poisoning**: Attempt to change `createdAt` on an existing task.
7. **Resource Exhaustion**: Send a task description that is 2MB in size.
8. **Malicious ID**: Use a document ID containing path traversal characters like `../../`.
9. **Relational Break**: Create a task for a non-existent `assigneeId`.
10. **Shadow Field**: Update a task with an extra field `isVerified: true` to bypass logic.
11. **PII Leak**: Non-admin user attempting to list all emails in the `users` collection.
12. **Unauthorized Approval**: Accountant attempting to approve another accountant's pending request.

## Test Strategy
- Every payload above must return `PERMISSION_DENIED`.
- Final `firestore.rules` must pass the Penetration Test Audit.
