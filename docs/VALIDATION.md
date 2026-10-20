# Foundation validation — 2026-10-20

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
