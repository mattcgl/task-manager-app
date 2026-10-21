# Task & Goal

An iPhone-first personal planner built with Expo, React Native, TypeScript, and SQLite. The goal is to connect daily tasks to personal goals and thoughtful weekly reviews, with local storage and no required backend.

**Status: tasks, goals, and weekly reviews preview.** The user verified intention persistence, goal creation, linked task completion, progress updates, and reload on iPhone. M4 adds weekly summaries, saved reflections, finalized history, and optional next-week planning; its iPhone acceptance is pending. Android is not yet verified.

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

## Work toward a goal

Create a goal in **Goals**, optionally add a description and target date, and link tasks using their **Edit** form. The Goals tab shows completed versus total nonarchived linked tasks. An empty goal has no percentage yet; task completion never automatically completes the goal. Use **Complete goal** when you decide it is achieved, or **Reopen goal** later.

Archiving a goal leaves its tasks and links intact. Restore it through **Goals → Archived**. New tasks cannot be assigned to archived goals, but existing links can be retained or removed. Use **Tasks → Filter by goal** to see its work.

## Review your week

Open **Review** and choose a Monday–Sunday week. Accomplishments include unplanned completed work; unfinished commitments come from tasks you planned for that week. Rescheduling does not erase the original commitment. Archived/withdrawn work is shown separately, and repeated completion toggles never count a task twice.

Write reflections and next-week priorities, then **Save draft**. Draft summaries refresh when reopened or through **Refresh summary**, which preserves unsaved reflection text. **Finalize review** freezes the historical summary; you can still edit reflection text. Finalizing an ongoing week requires confirmation and labels the result as the week so far. Saved reviews retain their original time zone when traveling.

Under **Choose what comes next**, explicitly choose unfinished tasks to plan for the following week. Moving an existing planned date requires confirmation. Nothing carries over automatically, and older reviews cannot plan tasks into an elapsed week. Save reflections before leaving the app; week navigation warns about unsaved edits.

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

Schema version 4 adds weekly reviews and a database guard against rewriting finalized summaries. Earlier migrations introduced goals, tasks, task events, and weekly commitments. Existing records are preserved by migrations. A task mutation and its history are saved in one exclusive transaction: either all changes succeed or none are saved. Events have stable sequence numbers to order changes that happen in the same millisecond. Reviews reconstruct task state at the selected week's cutoff, with calendar boundaries that account for daylight saving. Shared state refreshes tasks and goals together after changes, so progress stays consistent across tabs. Domain logic and persistence remain separate so a future backend does not require rewriting every screen.

## Roadmap and working agreement

Read [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) before changes and follow [AGENTS.md](AGENTS.md). The plan records scope, acceptance criteria, costs, data safety, and deferred features. Implementation checkpoints are committed per milestone; pending device checks are recorded honestly.

Working title: Task & Goal. App name and visual design can evolve after the first device preview. This repository contains only source and synthetic examples, never personal database files or signing credentials.

See [validation notes](docs/VALIDATION.md) for completed checks, dependency advisories, and the pending iPhone checklist.
