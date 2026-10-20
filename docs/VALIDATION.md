# Project validation — 2026-10-20

Current status: M1 accepted by the user on iPhone. M2 implementation verification and device checklist are recorded at the end. Earlier pending statements below are historical checkpoints.

## Completed on Windows

- TypeScript strict checking: passed.
- ESLint: passed.
- Prettier: passed.
- Jest: six tests passed across two suites.
- Real SQLite: persisted text survives closing/reopening and repeated migration; schema/version changes roll back together on simulated failure.
- Expo SDK package compatibility: passed (`npx expo install --check`).
- iOS production JavaScript/Hermes bundle: exported successfully (`npx expo export --platform ios`). This verifies bundling, not native compilation or execution on an iPhone.

The initial bundle export failed because the sandbox prevented Hermes writing a temporary file. Repeating with approved access succeeded.

## Dependency audit

`npm audit` reports 54 affected dependency entries: 26 moderate and 28 high, with no critical entries. Compatible `npm audit fix` updates were applied, but those counts remain. The report includes transitive build/test dependencies and propagated parent entries; it is not a count of distinct remotely exploitable mobile app flaws.

Remaining advisory roots include braces, node-forge, sprintf-js, and uuid. The available forced remedies propose incompatible downgrades such as Expo 44, so they were not applied. Reachability has not been fully assessed. Revisit upstream fixes before standalone release; do not claim a clean security audit. Keep development servers on trusted networks and do not feed untrusted project/build input to these tools.

## Pending iPhone acceptance

Using the instructions in README.md:

1. Record iPhone model, iOS version, and Expo Go version.
2. Open the project; confirm Today, Tasks, Goals, and Review tabs are visible.
3. Check text readability, safe areas, and tab labels. Planned tabs should clearly describe their status.
4. Enter a sample intention, including an apostrophe; save it and confirm the success message.
5. Reload the project and confirm the exact text returns.
6. Replace the text, save again, and verify the new value after another reload.
7. Check the keyboard does not prevent reaching Save; try a larger accessibility text size.
8. Report errors or layout problems before marking M1 accepted.

The SQLite integration tests run against Node SQLite, not expo-sqlite on iOS. No physical iPhone or Android testing has been performed by the agent. Standalone airplane-mode cold launch belongs to M6, not this Expo Go checkpoint.

## SDK 57 compatibility correction

The iPhone reported that SDK 58 required a newer Expo Go, but App Store offered no update. App Store currently lists Expo Go 57.0.9. The project was aligned with SDK 57's official bundled module map, React 19.2.3, React Native 0.86.3, and Jest 29. Animation peer dependencies were explicitly pinned to avoid retaining SDK 58 versions. The iOS version reported by the user is 26.5.2. Physical-device launch remains pending.

After dependency alignment, npm reports 65 affected dependency entries (16 moderate, 49 high). The earlier SDK 58 audit counts above are historical; no forced compatibility-breaking fixes were applied.

Retry with npm start -- --clear and scan the new QR code. No app data needs to be deleted.

Post-correction verification passed: Expo dependency compatibility, TypeScript, ESLint, Prettier, all six tests, and iOS Hermes export.

## M1 iPhone acceptance — user reported

The user confirmed successful app launch, intention entry/save, persistence after reload, and no errors. Core M1 acceptance passed. This is user-performed testing, not agent-operated device testing. Accessibility, Android, and standalone offline launch remain unverified.

## M2 task milestone

Automated coverage includes schema-1 upgrade without losing the intention, task creation/editing, completion/reopening idempotence, archive/restore, historical weekly commitments after rescheduling, explicit withdrawal, validation without writes, atomic rollback on simulated history failure, Today deduplication, date-only rules across DST/year/leap-day boundaries, and form submission/error retention. Native date-picker rendering is mocked in component tests and still requires physical-device testing.

The dependency installation reports 66 affected dependency entries (16 moderate, 50 high). Previous counts are historical. No forced Expo-incompatible fixes were applied.

### Pending M2 iPhone checklist

1. Stop the old Metro server, run `npm start -- --clear`, and reopen with the new QR code.
2. Confirm your saved intention is still present below the Today task list.
3. Quick-add a task on Today. Switch to Tasks and confirm it appears there too.
4. Edit it: change its title, add notes, set High priority, and try the planned/due date pickers. Save and reopen the editor to confirm those values.
5. Complete it. Confirm it leaves Today and appears in Tasks → Completed; reopen it and confirm it returns to Today if still planned for today.
6. Archive it, then restore it from Archived. Reload and confirm its data persists.
7. Optional edge checks: create an unplanned task in Inbox, set a deadline yesterday to make it overdue, and set both overdue + planned today to confirm it only appears once. Try a blank title and check that it is rejected without losing other form input.

Device result: pending. No agent claim of iPhone or Android execution for M2.

M2 desktop result: all 24 tests across five suites passed; typecheck, lint (no warnings), formatting, Expo compatibility, and iOS Hermes export passed. Native iPhone task flow still pending. Jest initially encountered sandbox cache-write restrictions; approved execution outside the sandbox succeeded.
