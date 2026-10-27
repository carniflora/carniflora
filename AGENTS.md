https://fabiensanglard.net/agent.md/index.html

# FAB's AGENT.MD

- When writing something intended for human consumption, (comment, commit message, reply to prompt) use as few words as possible. Pick every word meticulously to reduce the volume to a strict minimum. Be down to the point. Less is more.

- Avoid superlatives and praise. Stop telling me I am absolutely right. Give me the cold hard truth.

- Avoid magic numbers and strings by extracting recurring or meaningful values into descriptive constants (const) or enums. Keep self-explanatory, one-off values inline to avoid clutter. If a value comes from a spec (e.g. HTTP 200 OK), use a constant regardless.

- Reduce code indentation. Avoid Arrow Anti-Pattern. Leverage early return and continue.

- Keep function names short. Less than 30 characters.

- Use enums instead of booleans for function parameters.

- Let the reader of the code breathe. Add empty lines between logical blocks of code.

- Add a small, to the point, comment to explain _what_ the block does and _why_. Use examples when possible. Propose ASCII drawings to explain complete systems.

- Treat member visibility changes as a breaking design shift. Keep all fields and functions private unless external access is strictly required by the design. Prompt the user for explicit approval before changing any access modifier from private to internal or public.

- Program to levels of abstraction. Lower-level mechanics (e.g., raw hardware I/O, sector parsing, direct socket streams) must be encapsulated in a dedicated driver/abstraction layer. Expose clean, high-level APIs to the rest of the application so calling code works with domain concepts, not raw implementation details.

- Don't touch blocks of code unrelated to the feature you implement. e.g. Don't add comments to a block of code if you did not create it or modify it. As much as possible try to minimize the number of changed lines when implementing a feature.

- Strictly adhere to the layered boundary hierarchy: each layer may only communicate with its immediate neighbor directly below it. Never "punch holes" through layers (e.g., controllers or UI components must never directly call database queries, raw hardware drivers, or low-level network clients; always route through the intermediate service/abstraction layer).

- Always use {}, even on a one-line "if" statement.

When you write a commit message, follow these 7 rules:
Rule 1: Separate the subject line from the body with a single blank line.
Rule 2: Limit the subject line to 50 characters (72 is the absolute hard limit).
Rule 3: Capitalize the first letter of the subject line.
Rule 4: Do not end the subject line with a period.
Rule 5: Use the imperative mood in the subject line (e.g., "Fix bug," "Add feature,"
not "Fixed" or "Adds"). Test formula: It must complete the sentence: "If applied,
this commit will [your subject line here]".
Rule 6: Wrap the body text manually at 72 characters to prevent Git formatting issues.
Rule 7: Use the body to explain what and why vs. how. Assume the code explains the how;
the message must explain the context and reasoning.

- If the prompt indicates that a bug is being fixed, don't write the fix right away. First write the test. Observe it failing. Then write the fix. And observe the test passing.

---

## Setup and commands

Use Node.js 24 and npm, matching the README and CI. Run commands from the
repository root.

| Command                                     | Purpose                                          |
| ------------------------------------------- | ------------------------------------------------ |
| `npm ci`                                    | Install dependencies from the committed lockfile |
| `npm test`                                  | Run all tests once                               |
| `npm test -- tests/path.test.js`            | Run a specific test file                         |
| `npm run test:watch`                        | Run tests interactively                          |
| `npm run lint`                              | Run ESLint                                       |
| `npm run format:check`                      | Check formatting without changing files          |
| `npx --no-install prettier --write <files>` | Format only the files you changed                |

## Testing instructions

- Find the CI plan in the .github/workflows folder.
- Run `pnpm turbo run test --filter <project_name>` to run every check defined for that package.
- From the package root you can just call `pnpm test`. The commit should pass all tests before you merge.
- To focus on one step, add the Vitest pattern: `pnpm vitest run -t "<test name>"`.
- Fix any test or type errors until the whole suite is green.
- After moving files or changing imports, run `pnpm lint --filter <project_name>` to be sure ESLint and TypeScript rules still pass.
- Add or update tests for the code you change, even if nobody asked.

## Implementation conventions

- Follow nearby code and let Prettier handle formatting. Use ES module imports
  with explicit `.js` extensions.
- Keep simulation rules testable independently of the DOM and canvas. Put
  browser interaction in the UI layer and rendering in the appropriate renderer.
- Reuse existing state, plant definitions, path helpers, and placement checks.
  Avoid duplicating gameplay rules in UI handlers.
- Respect coordinate units: map/path coordinates and canvas pixels differ.
  Use existing map dimensions and `TILE` conversions rather than new magic values.
- Preserve normal and boss battle behavior when changing shared controls or UI.
- Keep gameplay balance, costs, timing, and level geometry unchanged unless the
  task calls for those changes.
- Keep controls usable with existing input methods, preserve accessible labels,
  and check layout at narrow and wide viewport sizes when changing the UI.
- Add dependencies only when they materially simplify the requested work. Use
  npm and update `package-lock.json` together with `package.json`.
- Treat `src/` as publicly served content. Never place secrets, private data,
  or development-only artifacts there.

## Validation

- Add or update focused Vitest tests for changed game behavior and bug fixes.
  Prefer observable outcomes and edge cases over tests that copy implementation.
- Reset shared mutable state between tests. Control randomness or time when a
  test depends on them so results are repeatable.
- For code changes, run the relevant tests, then the CI checks:
  `npm run lint`, `npm run format:check`, and `npm test`.
- For UI or rendering changes, also check the game in a browser: look for console
  errors and exercise the affected controls and battle modes. Automated rule
  tests do not verify canvas appearance.
- For documentation-only changes, check the edited document's formatting;
  gameplay tests are unnecessary.
- Report checks actually run and any failures or unavailable checks. Distinguish
  existing failures from regressions; do not change unrelated files to make
  checks pass.

## Working practices

- Inspect `git status` and relevant code before editing. Preserve existing user
  changes, including untracked files; never reset or overwrite unrelated work.
- Make focused changes. Avoid broad refactors, repository-wide formatting, and
  generated or dependency-directory edits unless required by the task.
- Update documentation when commands, setup, controls, or behavior change.
- Do not commit, push, or deploy unless requested. Pushing to `main` triggers
  production deployment after CI succeeds.
- Finish with a concise description of the change, validation results, and any
  remaining limitations.
