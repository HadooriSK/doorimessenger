# Project requirements

- Every user-facing addition or change must be implemented and verified in all five supported languages at the same time: German (`de`), English (`en`), Arabic (`ar`), Persian (`fa`) and Turkish (`tr`).
- Do not ship a user-facing string when any of these five translations is missing.
- Arabic and Persian interfaces must retain their right-to-left behavior.
- NEVER mention "Firebase" or backend infrastructure in any user-facing texts, hints, notifications, or error messages in any of the 5 languages. All user-facing communications must strictly use neutral Doori Messenger branding.
- Existing and registered users who log in with their valid credentials (username, password, and 6-digit contact ID) must never be blocked or rejected by unverified email checks; valid credential authentication automatically marks/honors their verified status.

## Handoff before Codex usage runs out

- During active work, check the available Codex usage periodically, especially after long implementation or deployment phases.
- When either active Codex usage window reaches only 3% remaining or less, immediately create or update a dated handoff file in the project root before doing more nonessential work.
- The handoff must cover the period beginning with the most recent AntiGravity handoff supplied by the user and ending at the current state. Include the exact branch and commit, uncommitted files, implemented changes, tests, builds, deployments, unresolved problems, and the safest next steps.
- Also provide the user with a short copyable prompt telling Google AntiGravity which handoff files to read and to continue without rebuilding the project.
- Never claim that this threshold can be monitored while no Codex task is running. Perform the check while actively working and whenever the user mentions a low remaining limit.

## Usage-efficient workflow

- Work economically with the user's Codex usage allowance while preserving correctness and quality.
- Read only files relevant to the current problem and batch independent searches or inspections where practical.
- Do not repeat unchanged tests, builds, deployments, log queries, or documentation reads. Repeat a check only after a relevant change or when a previous result was incomplete.
- Prefer one focused implementation pass followed by the smallest meaningful test set; run the full required suite once before the final handoff or deployment.
- Keep progress updates concise and avoid recreating summaries that already exist unless the handoff state changed.

## Browser verification before deployment

- For every user-facing change, use the available web-browser automation before deploying.
- Open the relevant live or preview page, inspect the visible layout, click through the affected navigation and controls, and verify the resulting states.
- Run the relevant tests and build after browser verification. Deploy only when the browser check, tests, and build pass.
- Do not deploy unchanged or unverified work merely because the build succeeds.

## Persistent User Design Requirements

- Preserve every existing Doori Messenger menu, feature, option, area, and behavior when redesigning the UI. Do not remove or silently change functionality.
- The desired visual direction is exceptionally modern, professional, and aesthetic, inspired by WhatsApp and Telegram while retaining a distinct Doori identity.
- For user-facing changes, maintain German, English, Arabic, Persian, and Turkish translations together; preserve RTL behavior for Arabic and Persian.
- Before every user-facing deployment, open the relevant preview or live page with browser automation, inspect the visible design, click through affected controls, and verify the resulting states.
- Run the relevant tests and build after browser verification. Deploy only after browser checks, tests, and build pass.
- The user requested Superdesign Dev for UI concepts, v0 for component generation, Tailwind CSS for styling, and Color Highlight for color management. These tools are not currently available as controllable integrations in this environment; never claim to have used or tested them unless an actual integration becomes available.
- When those requested tools are unavailable, state that limitation clearly and do not simulate their use. Use the repository's actual HTML/CSS/JavaScript and available browser automation instead only when the user accepts that constraint.
- Work autonomously where possible and make proactive, concrete design-improvement suggestions without sacrificing existing functionality.
- Prettier is installed, but do not use `prettier --write` or automatic whole-project formatting for now; use `prettier --check` only when needed so existing line breaks and formatting remain unchanged.
- Use ESLint and Stylelint for targeted validation without broad automatic rewrites.

## Live Preview & Visual Workflow (Strict Rule)

- NEVER open visible code, file tabs, or editor windows in the user's workspace unless explicitly asked by the user. All code modifications must happen strictly in the background without opening files in the visible editor.
- The user uses the dedicated middle Live Preview window in VS Code (`http://localhost:3000/`) to review all design and functional changes visually in real time.
- Always keep the multi-port Live Preview server running on `http://localhost:3000` (and `3001`).
- Autonomously navigate, test, and present changes directly inside this middle Live Preview window using the hot-reload/navigation controller (`http://localhost:3000/__control`) so the user sees changes immediately without manual steps.
- For EVERY visual and design change, ALWAYS provide visual screenshots / image artifacts directly in the chat response so the user can immediately verify the result with their own eyes.
- The Live Preview server includes an interactive floating switcher (`💬 Chatansicht`, `📋 Chatliste`, `⚙️ Einstellungen`, `🌐 RTL / LTR`) allowing the user to switch between views directly inside the middle preview window.


