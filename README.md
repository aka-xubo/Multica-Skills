# Multica Skills for Codex / Claude

This repository contains skills for working with [Multica](https://github.com/multica-ai/multica) issues from native agent environments such as Codex and Claude Cowork.

## Why This Exists

In day-to-day work, many teams still spend most of their agent time inside Codex or Claude rather than starting work directly from an agent inside Multica. Calling agents from Multica may be the long-term direction, but it is not always how work happens today.

These skills are built for that current reality.

The goal is not only to "work in Multica." The goal is to let an agent working in Codex or Claude Cowork use Multica as the source of issue context, decisions, and status updates while staying inside the native coding or collaboration environment.

In other words:

- Multica remains the system of record for issues.
- Codex / Claude remains the place where the agent does reading, clarification, coding, and coordination.
- These skills connect the two without forcing every workflow to start inside Multica.

## Skills

### `multica-issue-intake`

Read a Multica issue by URL, UUID, or issue key and summarize its live content.

Use it when you want to inspect an issue before doing anything else.

This skill is read-only. It does not change status, post comments, or modify local files.

### `multica-issue-clarifier`

Clarify an issue after its content has been read.

Use it when an issue is vague, contradictory, missing acceptance criteria, or not ready for action. It asks one focused clarification question at a time and does not write back to Multica.

### `multica-issue-updater`

Update an existing Multica issue.

Use it only when the user explicitly asks to add a comment, change status, or do both on a specific existing issue.

This skill never creates new issues.

### `multica-issue-creator`

Create a new Multica issue.

Use it only when the user explicitly asks to create a new issue, including catch-up issues for work already done without an issue.

This skill never updates existing issues.

### `multica-agent-invoker`

Invoke a specific Multica agent from Codex or Claude.

Use it when you want to explicitly `@` a Multica agent in an issue comment or assign an existing issue to a specific agent, such as asking a code review agent to review a scoped diff.

This skill lists the current CLI user's agents by default so the user can choose one. It can list all visible agents in the current Multica workspace/profile only when explicitly requested. It does not choose agents automatically and does not support rerun mode.

Agent selection is intentionally scoped:

- Default: list and match only agents owned by the current CLI user.
- Ownership check: resolve the current user with `multica user profile get --output json`, then filter `multica agent list --output json` by `owner_id`.
- Expanded scope: list all visible workspace/profile agents only when the user explicitly asks for all, workspace, or shared agents.
- Safety: if a named agent is outside the current user's owned agents, ask for confirmation before invoking it.

## Typical Workflow

1. Read the issue:

   ```text
   Use multica-issue-intake to read MUL-123.
   ```

2. Clarify gaps if needed:

   ```text
   Clarify what is still ambiguous in this issue.
   ```

3. Work in Codex or Claude Cowork using the issue as context.

4. Write a final update back to Multica only when explicitly requested:

   ```text
   Add this summary as a comment on MUL-123.
   ```

5. Create a catch-up issue only when there was no issue and the user explicitly asks:

   ```text
   Create a Multica issue for the work we just completed.
   ```

6. Invoke a Multica agent only when the user explicitly wants another agent involved:

   ```text
   Ask the code review agent to review MUL-123 with this file scope.
   ```

   If the user does not know which agent to use, list their own agents first:

   ```text
   List my Multica agents, then let me choose one for MUL-123.
   ```

   To intentionally broaden the list:

   ```text
   List all visible Multica agents in this workspace.
   ```

## Requirements

- The `multica` CLI must be installed.
- The CLI must be configured with a server URL, workspace, and authentication.
- For issue creation, configure the project mapping when prompted by `multica-issue-creator`.

Useful CLI checks:

```bash
multica config show
multica auth status
```

## Design Principles

- Keep read and write operations separate.
- Never write to Multica unless the user explicitly asks.
- Never create an issue from a skill meant to update an existing issue.
- Never update an existing issue from a skill meant to create a new issue.
- Treat Multica as the issue source of truth.
- Preserve user language for issue-facing content.
- Avoid team-specific workflow assumptions.

## Installation

Copy the skill directories you want into your Codex / Claude skills directory.

For this pack, the community-facing skills are:

```text
multica-issue-intake/
multica-issue-clarifier/
multica-issue-updater/
multica-issue-creator/
multica-agent-invoker/
```

After installation, restart or reload your agent environment if it does not automatically discover new skills.

## Safety Notes

`multica-issue-intake` and `multica-issue-clarifier` are read-only/conversation-only skills.

`multica-issue-updater` and `multica-issue-creator` can write to Multica through the CLI. They are intentionally strict about explicit user intent so that comments, status changes, and issue creation do not happen as side effects.

`multica-agent-invoker` can notify or assign work to a Multica agent. It requires an explicit issue reference and a specific target agent; it does not guess which agent to use.
