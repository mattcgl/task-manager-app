# Task & Goal

An iPhone-first personal planner built with Expo, React Native, TypeScript, and SQLite. The goal is to connect daily tasks to personal goals and thoughtful weekly reviews, with local storage and no required backend.

**Status: task milestone preview.** The user verified the M1 intention save/reload flow on iPhone. M2 adds task creation/editing, completion/reopening, archive/restore, priorities, native date pickers, and Today/Inbox/Completed/Archived views. M2 iPhone acceptance is pending. Goals and reviews remain planned screens. Android is not yet verified.

## Run on your iPhone

1. Install Node.js 24 (developed with 24.13.1) and run `npm ci` in this folder.
2. Install Expo Go from the App Store. This project uses Expo SDK 57; Expo Go must support that SDK.
3. Connect your Windows computer and iPhone to the same Wi-Fi network.
4. Run `npm start` and leave the terminal running.
5. Scan the displayed QR code with the iPhone Camera and open it in Expo Go. Allow local-network access when prompted.
6. Add a task on Today, then find it in Tasks. Complete it, find it under Completed, and reopen it. Reload and confirm it remains saved. Your previous intention is preserved below the task list on Today.

After updating dependencies, stop Metro and run `npm start -- --clear` before reopening the project. Never delete app storage to apply a schema update; migrations preserve existing data.

## Plan a task

- Quick-add on **Today** plans a task for today; quick-add on **Tasks** places it in the inbox without a planned date.
- **Add with details** and **Edit** let you set notes, priority, planned date, and due date. Planned date means when you intend to work; due date means the deadline. Both are optional.
- Today includes unfinished work planned for today plus overdue tasks, without duplicates. A deadline today is not overdue until the next calendar day.
- Complete a task using its checkbox. Reopen it from **Tasks → Completed**.
- Archive removes work from active lists; **Tasks → Archived → Restore** brings it back.
- Moving a planned task to another week retains the original commitment for future reviews. Clearing its planned date withdraws its current weekly commitment. Nothing is automatically carried forward.

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
- `src/features/tasks/` contains the form and lists plus a shared React context. That context gives Today and Tasks one current task list, so a completion in either tab updates both.
- `src/domain/` contains validation, calendar-date arithmetic, and list-selection rules independent of screens or SQLite.
- `tests/` checks real SQLite migrations and rollback, task history/commitments, calendar rules in America/Denver, and form interactions. Physical-device persistence is a separate acceptance check.

Schema version 2 adds tasks, task events, and weekly commitments to the original settings table. A task mutation and its history are saved in one exclusive transaction: either all changes succeed or none are saved. Events have stable sequence numbers to order changes that happen in the same millisecond. Goal schemas will follow in M3. Domain logic and persistence remain separate so a future backend does not require rewriting every screen.

## Roadmap and working agreement

Read [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) before changes and follow [AGENTS.md](AGENTS.md). The plan records scope, acceptance criteria, costs, data safety, and deferred features. Implementation checkpoints are committed per milestone; pending device checks are recorded honestly.

Working title: Task & Goal. App name and visual design can evolve after the first device preview. This repository contains only source and synthetic examples, never personal database files or signing credentials.

See [validation notes](docs/VALIDATION.md) for completed checks, dependency advisories, and the pending iPhone checklist.
