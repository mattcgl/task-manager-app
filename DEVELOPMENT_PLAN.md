# Personal Goals and Tasks — Development Plan

Last updated: 2026-10-20
Status: M1 accepted on iPhone; M2 implementation verified, device acceptance pending.
Current milestone: M2 — Tasks and Today.

## 1. Purpose and working agreement

Build a practical personal iPhone app that connects daily tasks to goals and helps its owner reflect on each week. Present the project on GitHub as understandable, tested software with thoughtful product decisions.

Read this plan before every project action. Identify the current milestone and check that the action contributes to its acceptance criteria without contradicting scope, cost, or architecture decisions. Keep this document current as decisions change. A necessary correction to this plan is itself an allowed planning action.

The user is new to React and TypeScript and unfamiliar with the remaining stack. Explain new concepts as they arise, keep changes small, and favor readable code and few dependencies. Speed matters, but no fixed delivery date has been agreed. Do not promise a schedule before the first working feature establishes effort.

## 2. Agreed constraints

- iPhone is the first supported and tested platform. Development machine is Windows.
- Retain an Android-compatible codebase, but defer Android release validation; no Android device is available.
- No desktop/browser product is required.
- Develop for free using Expo Go initially. An eventual Apple Developer membership is acceptable in principle, but no purchase, subscription, or paid service is authorized by this plan.
- First release serves one person on one device, without login or a backend.
- Goals, tasks, and weekly reviews are the priorities.
- Core features must work offline in the standalone app. Expo Go development can require access to the development server and is not the final distribution solution.
- Preserve room for future users and cloud sync without implementing speculative infrastructure.
- Keep personal records, backups, credentials, and device identifiers out of GitHub.

## 3. Version-one scope

### Today

Show tasks planned for the current day, overdue incomplete tasks, and a quick-add action. Deduplicate tasks appearing in both categories. Completing and reopening a task must update its other views consistently.

### Tasks

Create, edit, complete, reopen, and archive tasks. Fields: title, optional notes, optional due date, optional planned date, priority, and optional goal association. Include simple status/goal filters and an inbox for unplanned work. Validate nonempty titles. Archive instead of permanently deleting records in normal task flows.

A due date is a deadline; a planned date is when the user intends to work. Neither is required. Homework can be an ordinary task for now.

### Goals

Create and edit goals with title, description, optional target date, and active/completed/archived status. Link tasks to a goal. Show completed versus total nonarchived linked tasks as a labeled progress measure; do not imply it measures every aspect of achieving a goal. Goal completion is an explicit user action. An empty goal has no measurable task progress, rather than a misleading percentage.

### Weekly reviews

Provide a summary of completed work and unfinished weekly commitments, reflection prompts, and next-week priorities. No AI or external API is required.

Default review week: Monday through Sunday in the device's local time zone. Show the date range explicitly. Prompts: accomplishments, unfinished commitments, obstacles, and changes for next week. The default is an implementation choice and can be revised with the user.

Track weekly commitments separately from current task dates so rescheduling cannot erase what was planned. When a planned date is assigned, record the task's commitment to that week. Moving the task later retains the original commitment for review. Explicitly withdrawn or archived commitments are shown separately from unfinished work. Merely due or backlog tasks are not commitments unless planned.

Use completion/reopening history to determine task state at the review cutoff. Count unique completed tasks, not repeated toggles. For a finished week the cutoff is the next Monday; a current-week draft uses the current time. Include completed unplanned work as accomplishments. Do not silently carry tasks into another week: let the user choose next-week commitments.

Draft reviews can refresh their summaries. Saving a finalized review stores a snapshot of counts, task titles/statuses, date range, cutoff, and time zone. Later edits to tasks or goals must not rewrite it. Reflection text can be edited explicitly; historical metrics remain fixed. One review per week.

### Data safety and settings

Export a versioned JSON backup and import a validated backup through an explicit restore flow. Explain that uninstalling or losing the app can lose local data without a backup. Export/import is required before relying on the app for important personal records.

Import shows a preview and confirms replacement. Validate schema, IDs, relationships, and supported version before changing anything. Replace data transactionally; failed imports leave current data intact. Offer a backup of current data before restore. Merging backups is out of scope.

## 4. Deferred scope

Notifications and reminders; recurring tasks; subtasks; workflow automation; dedicated courses/homework scheduling; calendar/LMS integrations; automatic scheduling; AI features; accounts; cloud backup/sync; shared goals; collaboration; monetization; web delivery; Android release. Add these only through an explicit scope decision and plan update.

## 5. Stack and tools

| Concern           | Decision                                         | Reason                                           |
| ----------------- | ------------------------------------------------ | ------------------------------------------------ |
| App               | React Native with Expo                           | Shared mobile code and accessible iPhone testing |
| Language          | TypeScript with strict checking                  | Clear data contracts and early error detection   |
| Navigation        | Expo Router                                      | Conventional screen/navigation structure         |
| Persistence       | expo-sqlite                                      | Local relational storage and offline operation   |
| UI                | React Native components and a small shared theme | Avoid a large UI framework while learning        |
| State             | React state/context where needed                 | Keep complexity proportional to the app          |
| Logic tests       | Jest with Expo-compatible configuration          | Exercise date, review, and persistence behavior  |
| UI tests          | React Native Testing Library                     | Verify meaningful user interactions              |
| Checks            | TypeScript, ESLint, formatting, GitHub Actions   | Repeatable quality checks                        |
| Device preview    | Expo Go on user's iPhone                         | Free initial iteration from Windows              |
| Standalone builds | EAS when ready                                   | iOS cloud builds without owning a Mac            |
| Future backend    | Reevaluate Supabase when sync is needed          | Candidate for PostgreSQL and authentication      |

Choose the stable Expo SDK compatible with the current iPhone Expo Go app at setup time. Use Expo-compatible package versions, commit a lockfile, and document the Node version. Do not freeze versions based on this planning document's date. Use npm unless repository requirements change.

No accounts, cloud infrastructure, or service secrets are needed for the local MVP. Choose export/import packages compatible with the selected Expo SDK and Expo Go before implementing that milestone.

## 6. Architecture

Suggested structure (adapt only when implementation justifies it):

```text
app/                       Router layouts and screen entry points
src/features/tasks/        Task views and feature operations
src/features/goals/        Goal views and feature operations
src/features/reviews/       Review views and feature operations
src/components/            Shared UI primitives
src/theme/                 Color, spacing, typography tokens
src/domain/                Models, validation, date/review rules
src/data/                  SQLite setup, migrations, repositories
src/services/              Backup/restore and platform boundaries
tests/                     Cross-feature tests and fixtures
docs/                      Architecture notes and manual test records
```

Screens call feature operations; domain logic remains independent of UI and SQL. Repositories own database queries. Use parameterized queries, foreign keys, schema migrations, and transactions for multirecord changes. Do not introduce a generic framework, microservices, or a sync engine.

Use stable generated IDs and created/updated timestamps. These support later migration, but are not a substitute for a designed sync protocol. Future cloud work must address ownership, authentication, authorization, offline queues, deletions, conflict resolution, and migration of existing local records.

## 7. Initial data model

| Entity             | Key contents                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Goal               | ID, title, description, target date, status, timestamps                                                                                          |
| Task               | ID, optional goal ID, title, notes, due date, planned date, priority, status, completion timestamp, archive timestamp, timestamps                |
| Task event         | ID, task ID, event type, UTC occurrence time, local date and time-zone context; enough history to reconstruct completion/reopening/archive state |
| Weekly commitment  | ID, task ID, week-start local date, creation time, withdrawn status/time; unique task/week                                                       |
| Weekly review      | ID, unique week-start date, time zone, cutoff, draft/finalized status, versioned snapshot, reflection fields, next-week priorities, timestamps   |
| Settings           | Schema-backed preferences as required                                                                                                            |
| Migration metadata | Applied database schema versions                                                                                                                 |

Store instants as UTC timestamps and date-only values as YYYY-MM-DD strings. Do not convert date-only deadlines through UTC in a way that shifts their calendar date. Compute week boundaries in local calendar time rather than assuming every day lasts 24 hours. Preserve saved review time-zone context. Define and test behavior for travel/time-zone changes before shipping reviews.

Task changes and their history/commitment records must be atomic. Archive goals without deleting their tasks or historical review references. Backup contains all data required to restore history and reviews, plus an explicit format version.

## 8. Milestones and acceptance criteria

### M0 — Planning (complete)

- Capture agreed direction, constraints, architecture, scope, milestones, and working rules.
- No app scaffolding, purchases, or deployment in this milestone.

### M1 — Foundation and first iPhone preview (complete)

- Initialize Expo/TypeScript, navigation, theme, database migration infrastructure, and checks.
- Establish README setup instructions and ignore generated files, secrets, and personal backups.
- User opens the app successfully in Expo Go on their iPhone.
- A sample persisted record survives reload; a database initialization failure is surfaced clearly.
- Explain components, props/state, TypeScript types, and the development loop using the new code.

### M2 — Tasks and Today

- Implement task CRUD/archive, completion/reopening, history, planned dates, and commitments.
- Today and task lists agree after mutations; validation and empty/error states work.
- Records survive app restart; overdue/planned behavior works around date boundaries.
- Test task lifecycle and atomic persistence of relevant history.

### M3 — Goals

- Create/edit/archive/complete goals, associate tasks, and display labeled progress.
- Goal archive preserves task data. Task completion/reopening updates goal progress.
- Test empty goals, archived tasks, and changed goal associations.

### M4 — Weekly reviews

- Implement week selection, summaries, reflection, saved snapshots, and next-week planning.
- Test rescheduled commitments, unplanned completions, reopenings, withdrawals, duplicate toggles, week boundaries, and daylight saving changes.
- Finalized history remains unchanged after later task edits.
- User can complete one end-to-end review on iPhone with representative sample data.

### M5 — Backups, usability, and personal-use hardening

- Export/import round-trip restores goals, tasks, events, commitments, reviews, and settings.
- Malformed/unsupported backups cannot partially overwrite data.
- Check keyboard handling, safe areas, readable contrast, dynamic text, touch targets, and VoiceOver labels on core controls.
- Check realistic personal datasets; add indexes based on actual queries.
- Document local-storage limits and recovery workflow.

### M6 — Standalone iPhone release and portfolio

- Recheck current signing/distribution costs and choose the personal distribution method with the user before any payment.
- Build through EAS once credentials/membership are available; a packaged preview/release must launch without the development server.
- Verify cold launch in airplane mode, edit/restart persistence, backup export/import, and core journeys on the actual iPhone.
- Record build/version/device details and known limitations. If signing is unavailable, mark standalone release blocked and keep Expo Go prototype status explicit.
- Publish a portfolio README with screenshots using synthetic data, architecture explanation, setup steps, tests, tradeoffs, and roadmap.
- Do not claim Android support has been verified. GitHub publishing and credentials are handled when the destination repository is known.

## 9. Verification strategy

Run appropriate type, lint, and meaningful tests for each implementation change. Focus automated coverage on logic that can lose data or misrepresent progress: migrations, review calculations, task lifecycle/history, date boundaries, and restore validation/atomicity. Avoid tests that only duplicate implementation details.

Use component tests for key task/review interactions. Test SQLite behavior against a real compatible database where feasible, not only mocked query functions. If host tooling cannot reproduce the mobile database, record the gap and exercise migration/restore on the device.

The agent cannot claim physical-device validation it has not performed. Give the user concise steps for iPhone-only checks and record their results. Windows cannot run Apple's iOS simulator. Use synthetic data in tests and screenshots.

Definition of done for a milestone: acceptance criteria met, relevant checks passed, limitations recorded, README/plan updated, and device checks completed where required. Do not mark an entire release done based only on desktop tests.

## 10. Cost and distribution policy

Target recurring infrastructure cost for version one: $0. React Native, TypeScript, SQLite, and Expo Go require no paid subscription. Use free tooling and avoid credit-card-backed services during the prototype.

Apple Developer Program was listed at US$99/year during planning. EAS offers a limited free build tier; it does not eliminate Apple's signing requirements. Standard GitHub Actions runners are free for public repositories, while other usage/storage may have limits. Verify current terms before enabling services. Free local iOS signing requires a Mac/Xcode and has short-lived provisioning, so it is not the planned Windows workflow.

If the eventual Apple fee becomes unacceptable, revisit an installable web app as a product/architecture decision. Do not silently switch platforms. Expo Go is a development prototype path, not a guaranteed independent offline daily-use release.

Reference sources checked during planning:

- https://docs.expo.dev/faq/
- https://docs.expo.dev/billing/faq/
- https://docs.expo.dev/develop/development-builds/introduction/
- https://docs.expo.dev/versions/latest/sdk/sqlite/
- https://developer.apple.com/programs/enroll/
- https://developer.apple.com/help/account/basics/about-your-developer-account
- https://docs.github.com/en/billing/concepts/product-billing/github-actions

## 11. Risks and responses

| Risk                              | Response                                                                |
| --------------------------------- | ----------------------------------------------------------------------- |
| Too many new technologies         | Small vertical features, explanatory changes, minimal dependencies      |
| Scope expansion delays useful app | Finish core milestones before deferred features                         |
| Local data loss                   | Versioned backups, transactional restore, documented limitations        |
| Misleading weekly metrics         | Explicit commitments, event history, immutable finalized snapshots      |
| iPhone distribution cost          | Free prototype first; separate signing decision before personal release |
| Expo Go version compatibility     | Verify supported SDK at setup and manage upgrades deliberately          |
| Untested Android behavior         | Preserve portability and label validation status accurately             |
| Future sync complexity            | Separate storage from domain/UI; scope sync as its own future project   |

## 12. Decision log and next action

- 2026-10-18: User accepted Expo approach with free development first and possible eventual Apple membership.
- 2026-10-18: Local SQLite replaces the initially proposed Supabase backend for version one.
- 2026-10-18: Priorities are goals, tasks, and weekly accomplishment/shortcoming reviews.
- 2026-10-18: Automation and other advanced features deferred; iPhone takes priority over Android.
- Planning defaults: Monday week start, date-only scheduling, archive-based removal, one goal per task, explicit weekly commitments, finalized review snapshots, replace-only backup restore. Revisit if user feedback calls for it.

Open items that do not block initial development: app name/visual preference, GitHub repository destination, eventual distribution choice. No fixed delivery deadline is agreed.

2026-10-20: User authorized development, GitHub repository creation, and commits after milestone implementation. Create a public portfolio repository named task-manager-app under the authenticated personal account. Commit verified implementation checkpoints while clearly identifying outstanding physical-device acceptance checks.

2026-10-20 M1 checkpoint:

- Created public repository: https://github.com/mattcgl/task-manager-app and pushed the planning baseline.
- Implemented Expo SDK 58 / React Native 0.88 / TypeScript foundation, four-tab navigation, shared theme, SQLite migration infrastructure, and a saved intention note as the M1 persistence probe.
- Task, goal, and review tabs are clearly labeled placeholders; M2–M4 are not implemented.
- Added npm lockfile, setup/learning README, GitHub Actions checks, migration unit tests, and real Node SQLite integration tests.
- Verification: typecheck, lint, formatting, and six tests passed. iOS Hermes bundle export succeeded outside the sandbox after sandbox temporary-file permissions blocked the first attempt.
- Expo compatibility check passed. npm audit still reports 54 dependency advisories (26 moderate, 28 high) after compatible fixes. Documented in docs/VALIDATION.md; do not force incompatible Expo downgrades.
- Pending: user opens the preview in compatible Expo Go, verifies tab layout, keyboard behavior, and saved note across reload. Native SQLite behavior and physical-device appearance remain unverified.
- Working title: Task & Goal. No paid service or standalone distribution was configured.

Next action: complete the M1 iPhone preview checklist in docs/VALIDATION.md, then proceed to M2 task implementation. Commit the tested M1 implementation checkpoint with the device acceptance gap explicit.

Compatibility correction: the user's iPhone runs iOS 26.5.2 and App Store offers no Expo Go update. The current App Store listing is Expo Go 57.0.9 (React Native 0.86), while the project uses SDK 58. Align M1 to SDK 57 and its bundled dependency versions, rerun checks, and commit the correction. Physical-device acceptance remains pending. Source: https://apps.apple.com/us/app/expo-go/id982107779

SDK 57 correction implemented: React 19.2.3 / React Native 0.86.3; Jest and native animation peers aligned. README now targets SDK 57. M1 remains pending a successful iPhone retry; use npm start -- --clear. Updated dependency advisories are recorded in docs/VALIDATION.md.

M1 acceptance: user confirmed the app opens, an intention saves, the same intention remains after reload, and no errors were found on their iPhone. This satisfies the foundation persistence acceptance. Detailed accessibility testing remains part of M5. M2 is authorized by the original development request.

M2 implementation decisions: retain the intention note, add schema version 2 through an additive migration, use shared task state for Today/Tasks, serialize task writes with exclusive SQLite transactions, and persist events/weekly commitments atomically. Goal selection/filtering waits for M3, when goals exist. Archive is reversible. Date-only planned/due values use validated calendar dates; weeks start Monday. Removing a planned date withdraws the task's current weekly commitment; moving dates retains past commitments for review. No automatic carryover or recurring tasks.

M2 implementation checkpoint:

- Implemented create/edit, complete/reopen, archive/restore, priority, optional notes and native date pickers; added Open/Inbox/Completed/Archived filters and Today quick-add with deduplicated overdue work.
- Shared React state refreshes both task screens after writes. In-flight mutations are guarded against double submission. Load failures provide retry; failed edits retain input.
- Added task events with stable sequence numbers and snapshot data, plus weekly commitments. M1 settings survive the additive version-2 migration.
- Added repository integration tests for lifecycle, rescheduling, commitment withdrawal, and transaction rollback; domain tests for filtering, invalid dates, and DST; component tests for form submission and failures.
- Goal association and filtering remain M3 work. No reminders, automation, accounts, or paid services were added.
- Next action: finish checks, commit/push M2 implementation, and ask the user to verify the task flow and original intention on iPhone before M3.

M2 verification passed: TypeScript, ESLint, Prettier, 24 tests across five suites, Expo SDK compatibility, and iOS Hermes export. M2 user device checklist remains pending; next milestone is M3 after that check.
