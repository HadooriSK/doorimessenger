# Project requirements

- Every user-facing addition or change must be implemented and verified in all five supported languages at the same time: German (`de`), English (`en`), Arabic (`ar`), Persian (`fa`) and Turkish (`tr`).
- Do not ship a user-facing string when any of these five translations is missing.
- Arabic and Persian interfaces must retain their right-to-left behavior.

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

