---
name: multica-issue-updater
description: Use this skill when the user explicitly asks to update an existing Multica issue: add/post/write a comment, summarize context into a comment for a specific issue, change/set/move issue status, or post a blocker/status update for an existing issue such as MUL-123 or an issue URL. This skill requires a target issue reference and never creates issues, fetches issue context, performs development work, or writes to Multica unless the user clearly requests that exact existing-issue update.
---

# Multica Issue Updater

## Goal

Write explicit user-requested updates to an existing Multica issue:

- Add a comment to a specified issue.
- Change a specified issue's status.
- Add a comment first, then change status.

This skill is intentionally narrow. It does not create new issues. Use `multica-issue-creator` when the user asks to create a new or catch-up issue.

## Language Rules

Write Multica issue-facing content in the user's language by default, including existing issue comments and status-change explanation comments.

If the user's language is unclear, use English. If the user explicitly requests a language, follow that requested language for that operation only.

Keep code identifiers, file paths, commands, issue keys, enum values, and quoted user-provided text unchanged when translating them would reduce accuracy.

Internal CLI arguments, status values, config keys, and command output labels may remain in English when required by tooling.

## Trigger Boundary

Use this skill only when the user explicitly asks for at least one write operation on an existing Multica issue, such as:

- "Add this summary as a comment on issue MUL-123."
- "Comment on this issue with the current context."
- "Change MUL-123 to in_progress."
- "Post a blocker comment and move the issue to blocked."

Do not use this skill when the user asks to create a new issue, create a catch-up issue, read an issue, investigate code, implement a change, or draft a comment without posting it. If the user needs to read or inspect an issue before writing anything, use `multica-issue-intake` instead.

## Required Inputs

Before writing anything, identify:

- Issue reference: issue key, UUID, or URL.
- Requested operation:
  - `comment`
  - `status`
  - `comment + status`
- For comments: source context to summarize or exact comment content.
- For status changes: target status.

If the issue reference is missing, ask the user for it before drafting or posting anything. A request such as "summarize the current context" is not enough to trigger this skill unless the user also identifies the existing issue to update.

If the requested operation is ambiguous, ask one concise clarification before writing.

## Explicitness Rules

- A user asking for a summary in chat is not permission to post a comment.
- A user asking to draft, prepare, or propose a comment means draft in chat only unless they also ask to post it.
- A user saying work is done is not permission to change status.
- A user asking to add, post, write, or submit an issue comment means post the comment.
- A user asking to adjust, change, move, or set issue status means change issue status.
- A user asking to create or open a new issue belongs to `multica-issue-creator`, not this skill.
- Do not infer `done`, `blocked`, `in_progress`, or `in_review`; use only the exact target status requested by the user.

## Workflow

1. Confirm the issue reference and requested operation.
2. For comment requests, apply the Issue-Scoped Relevance Filter before drafting the comment.
3. Build the comment only from available conversation context, user-provided facts, and command results already present in the current session that passed the relevance filter.
4. Do not invent verification, files changed, decisions, blockers, or people.
5. Remove secrets and sensitive values before posting:
   - API keys, tokens, cookies, passwords.
   - Private credentials or connection strings.
   - Raw personal data not needed for the issue update.
6. For a comment request, write the comment content to a temporary UTF-8 no BOM markdown file and run:

   ```bash
   multica issue comment add <issue_ref> --content-file <comment_file>
   ```

7. For a status request, run:

   ```bash
   multica issue status <issue_ref> <target_status>
   ```

8. If both comment and status are requested, post the comment first, then update the status. This preserves the reasoning trail before the state changes.
9. Report the result to the user, including whether the comment was posted and whether the status changed.

## Issue-Scoped Relevance Filter

Before writing an issue comment, classify each candidate fact from the current session into one of these buckets:

- `Include`: directly affects the target issue's request, observed facts, performed actions, checks, risks, blockers, decisions, or next step.
- `Exclude`: meta-discussion about workflow, skill behavior, prompt wording, unrelated repository changes, or another task.
- `Include only if requested`: broader session context, skill/tool changes, process notes, unrelated dirty files, or commentary about how the update was produced.

Default behavior:

- Include only facts classified as `Include`.
- Do not include facts classified as `Exclude`.
- Include `Include only if requested` facts only when the user explicitly asks for a full-session summary or asks to mention that topic.

Decision test:

> A fact is issue-relevant only if someone reading the target issue would need it to understand the current state, what happened, what remains risky or blocked, or what to do next.

If unsure, prefer excluding the fact from the issue comment. If the uncertainty matters, mention it in chat instead of posting it to the issue, unless the uncertainty itself blocks the issue.

## Comment Shape

Prefer concise comments. Choose the smallest shape that captures the useful context. Translate template headings and labels into the target language selected by the Language Rules; keep command strings, file paths, issue keys, and status enum values literal.

When the comment is being posted directly under the same target issue, omit an `Issue:` line by default because the issue context is already visible in the UI. Include an `Issue:` line only when the comment needs to stand alone outside the issue, summarizes multiple issues, references another issue, or the user explicitly asks for the issue identifier in the body.

For a work summary:

```md
## Summary

- Goal: <task or phase goal>
- Status: <completed / partially completed / blocked / investigation only / unknown>
- Scope: <what this update covers>
- Out of Scope: <explicit exclusions, or "None">

## Changes / Actions

- <area, file, module, command, or decision>: <what happened>

## Verification

- `<command or check>`: <passed / failed / not run, with reason when useful>
- Manual check: <scenario, or "None">

## Risks / Blockers

- <risk, blocker, open question, or "None">

## Next Step

- <specific next step, or "Unknown">
```

Use the work summary shape only when the user is posting an update about completed or ongoing work. For general notes, meeting context, decisions, or lightweight status information, use the lightweight context summary shape instead.

For a lightweight context summary:

```md
## Context Summary

- Current request: <user request>
- Relevant context:
  - <fact>
- Actions taken:
  - <operation, command, decision, or "None">
- Verification:
  - <check result, or "Not run / Unknown">
- Risks / Blockers:
  - <risk, blocker, or "None">
- Current status: <known status, or "Unknown">
- Next step: <requested or obvious next step, or "Unknown">
```

For a status-change explanation comment:

```md
## Status Update

- Target status: <target status>
- Reason:
  - <user-provided or session-known reason>
- Next step: <next step, or "Unknown">
```

Remove sections that truly do not apply, but keep the comment specific enough to be useful later.

## Tooling Rules

- Use the `multica` CLI for Multica writes.
- Use temp files under `/private/tmp` or another writable temporary directory for generated comment markdown.
- Do not use shell heredocs for comment creation if a safer file edit path is available.
- The comment file must be UTF-8 without BOM.
- Do not commit generated temporary files.

## Output To User

Keep the final response short:

- Issue reference used.
- Comment posted: yes/no.
- Status updated: yes/no and target status when applicable.
- Any CLI failure or missing input.

## Safety Rules

- Never write to Multica unless the user explicitly requested that write in this turn or an immediately active instruction.
- Never create a new issue from this skill.
- Never post secrets or credentials.
- Never claim a status changed unless the CLI command succeeded.
- Never claim a comment was posted unless the CLI command succeeded.
- Never run development, testing, review, or repository mutation from this skill.
