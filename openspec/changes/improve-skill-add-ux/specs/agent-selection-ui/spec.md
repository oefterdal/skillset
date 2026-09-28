# Spec Delta

## Purpose

Provides guided, non-authoritative agent selection for interactive skill adds
while keeping `npx skills` as the authoritative validator.

## ADDED Requirements

### Requirement: Interactive multi-select
Without `--yes` or explicit agents, `skillset add` SHALL present a keyboard
multi-select using a versioned convenience registry of IDs and display names.
Configured `defaults.agents` MUST start selected and users MAY toggle choices
before confirming. The registry SHALL include Claude Code, Codex, Cursor,
GitHub Copilot, Gemini CLI, and Windsurf.

#### Scenario: Defaults are preselected
- **WHEN** defaults name Claude Code and Codex
- **THEN** both are selected when the agent chooser opens

### Requirement: Deterministic non-interactive selection
With `--yes`, Skillset SHALL use repeated explicit `--agent` values, otherwise
`defaults.agents`, and otherwise fail clearly. Explicit arbitrary IDs MUST pass
through without local rejection.

#### Scenario: No target under --yes
- **WHEN** explicit and default agents are absent
- **THEN** Skillset exits before resolving sources

### Requirement: Concise upstream validation errors
Skillset SHALL recognize upstream invalid-agent responses and report concise
`invalid agent` errors, optionally listing close convenience-registry matches.
Unexpected upstream failures SHALL retain useful diagnostics.

#### Scenario: Invalid arbitrary agent
- **WHEN** upstream rejects an explicitly supplied unknown ID
- **THEN** Skillset reports the invalid ID without the upstream banner
