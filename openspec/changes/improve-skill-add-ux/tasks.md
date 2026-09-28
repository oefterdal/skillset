# Tasks

## 1. Batch add transaction

- [ ] 1.1 Parse repeated `--skill` and reject duplicates; verify CLI parsing tests
- [ ] 1.2 Resolve, install, and atomically persist a batch only after all success; verify two entries and second-install failure preservation
- [ ] 1.3 Detect existing identical declarations without duplicating manifest or lock entries; verify fixtures

## 2. Agent selection

- [ ] 2.1 Add a versioned ID/display-name registry and prompt abstraction; verify default preselection and toggling with a mock chooser
- [ ] 2.2 Add a Bun-compatible keyboard multi-select prompt and explicit-agent bypass; verify `--yes` precedence, fallbacks, and no-agent failure
- [ ] 2.3 Normalize expected upstream invalid-agent failures and suggestions; verify arbitrary IDs pass through and errors are concise

## 3. Validation

- [ ] 3.1 Run tests, lint, typecheck, build, strict OpenSpec validation, diff check, and compiled add-help smoke test
