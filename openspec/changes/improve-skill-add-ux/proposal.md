# Proposal: Improve skill add UX

## Why

Adding related skills requires repeated commands, and free-text agent entry is
error-prone. `skillset add` needs a concise batch workflow with guided agent
selection while preserving upstream validation.

## What Changes

- Accept repeated `--skill` flags for one source/ref.
- Make Skillset-owned manifest and lock changes transactional across the batch.
- Add a keyboard multi-select agent prompt with defaults preselected.
- Expand the versioned, non-authoritative agent convenience registry.
- Keep `--yes` deterministic and present concise upstream invalid-agent errors.

## Capabilities

### New Capabilities
- `skill-add-batch`: Batch skill declaration and installation transaction.
- `agent-selection-ui`: Interactive and non-interactive target-agent selection.

### Modified Capabilities

None.

## Impact

Changes the add command parser, agent prompt boundary, and upstream error
adapter; managed-skill update behavior remains unchanged.
