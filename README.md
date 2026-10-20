# Task & Goal

An iPhone-first personal planner built with Expo, React Native, TypeScript, and SQLite. The goal is to connect daily tasks to personal goals and thoughtful weekly reviews, with local storage and no required backend.

**Status: foundation preview.** Navigation and a persistent intention note are implemented. Tasks, goals, and reviews are clearly labeled planned screens, not completed features. iPhone acceptance testing is pending. Android is not yet verified.

## Run on your iPhone

1. Install Node.js 24 (developed with 24.13.1) and run `npm ci` in this folder.
2. Install Expo Go from the App Store. This project uses Expo SDK 57; Expo Go must support that SDK.
3. Connect your Windows computer and iPhone to the same Wi-Fi network.
4. Run `npm start` and leave the terminal running.
5. Scan the displayed QR code with the iPhone Camera and open it in Expo Go. Allow local-network access when prompted.
6. Enter an intention on Today, tap **Save intention**, and reload through Expo Go. The text should remain.

If connection fails, check the same-network requirement, Windows firewall permission for Node on your private network, and iPhone local-network permission. Do not disable your firewall. If Expo Go reports an SDK mismatch, record its version so we can select a compatible SDK deliberately.

Expo Go is a development environment; it may need the running development server. A standalone offline iPhone build is a later milestone with Apple signing requirements. No paid service is configured here. Local records are not cloud-backed; avoid important personal data until backup/restore is implemented.

## Development checks

```sh
npm run typecheck
npm run lint
npm test
npm run format:check
# Or all four:
npm run check
```

`npm run format` formats source and documentation. GitHub Actions runs the checks on pushes and pull requests using a standard Linux runner.

## How the code fits together

- `app/` contains route components: functions that describe a screen. Expo Router maps these files to navigation destinations.
- `src/components/` contains reusable views. Props are the inputs a component receives; state tracks values that change while it is displayed.
- `src/theme/` holds shared colors so screens stay consistent.
- `src/data/` owns SQLite queries and versioned schema initialization. React state holds the current input; SQLite keeps the saved value across reloads.
- `tests/` checks migration control flow and real SQLite persistence/rollback using Node's built-in SQLite. Physical-device persistence is a separate acceptance check.

Storage starts with a single settings table. Task and goal schemas will be added through migrations in their milestones, keeping the foundation small. Domain logic and persistence remain separate so a future backend does not require rewriting every screen.

## Roadmap and working agreement

Read [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) before changes and follow [AGENTS.md](AGENTS.md). The plan records scope, acceptance criteria, costs, data safety, and deferred features. Implementation checkpoints are committed per milestone; pending device checks are recorded honestly.

Working title: Task & Goal. App name and visual design can evolve after the first device preview. This repository contains only source and synthetic examples, never personal database files or signing credentials.

See [validation notes](docs/VALIDATION.md) for completed checks, dependency advisories, and the pending iPhone checklist.
