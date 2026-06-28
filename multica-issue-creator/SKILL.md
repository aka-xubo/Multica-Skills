---
name: multica-issue-creator
description: Use this skill only when the user explicitly asks to create a new Multica issue, including a catch-up issue for work that was already done without an issue. This skill handles issue title/description drafting, project resolution, optional repository project mapping, assignee resolution, optional parent/attachment fields, and running multica issue create. It never updates existing issues unless the user separately invokes an existing-issue update flow.
---

# Multica Issue Creator

## Goal

Create a new Multica issue when the user explicitly asks for issue creation.

Supported creation modes:

- Create a new issue from user-provided requirements or summary.
- Create a catch-up issue for work already done without an issue.
- Attach the useful work summary as the new issue description.

This skill does not update existing issues. Use `multica-issue-updater` when the user asks to add a comment or change status on an existing issue.

## Language Rules

Write Multica issue-facing content in the user's language by default, including issue titles and descriptions.

If the user's language is unclear, use English. If the user explicitly requests a language, follow that requested language for that operation only.

Keep code identifiers, file paths, commands, issue keys, enum values, and quoted user-provided text unchanged when translating them would reduce accuracy.

Internal CLI arguments, status values, config keys, and command output labels may remain in English when required by tooling.

## Trigger Boundary

Use this skill only when the user explicitly asks to create a Multica issue, such as:

- "Create a Multica issue for this work."
- "I already did the work without an issue; create a catch-up issue."
- "Open a new issue from this summary."
- "Create an issue and put this summary in the description."

Do not create an issue merely because the user says work is done, asks for a summary, or discusses a possible task.

## Required Inputs

Before creating anything, identify:

- Current repository root when repository-to-project mapping is needed.
- Issue title, drafted by the agent from the work summary unless the user provides one.
- Issue description content.
- Project reference from repository config or user input.
- Assignee, resolved from the current logged-in `multica` CLI user unless config overrides it.
- Optional status, priority, start date, due date, parent issue, or attachments when configured or explicitly requested.

If repository project config is missing, ask the user for the Multica project reference and persist it before creating the issue. Do not ask for an assignee unless the current CLI user cannot be resolved or the user wants an override.

If the requested creation details are ambiguous, ask one concise clarification before writing.

## Explicitness Rules

- A user asking for a summary in chat is not permission to create an issue.
- A user asking to draft a new issue means draft in chat only unless they also ask to create it.
- A user asking for a catch-up issue authorizes issue creation plus attaching the supplied or current summary.
- For catch-up issue creation, the issue description is the canonical work record. It should cover the useful content that would otherwise go into a work summary: goal, status, scope, changes, key decisions when relevant, verification, risks/blockers, and next step.
- Do not create a thin issue description and put the richer summary somewhere else.
- Do not also post a separate comment on the newly created issue unless the user explicitly asks for a separate non-duplicate comment after creation.
- Do not change existing issue status from this skill.

## Creation Defaults

Use these defaults when creating a new issue:

- Title: agent-generated, concise, action-oriented, specific to the work, and written according to the Language Rules. Prefer a shape like `<area>: <completed change or investigation result>`.
- Status: omit unless configured or explicitly requested. Do not infer `done`, `in_progress`, or any other status.
- Start date: omit unless configured or explicitly requested.
- Due date: omit unless configured or explicitly requested.
- Project: required, loaded from repository config or user input.
- Assignee: default to the current logged-in `multica` CLI user. Use configured `assignee` or `assignee_id` only when the user wants to override the current CLI user.
- Priority: optional; omit unless configured or explicitly requested.
- Parent issue: optional; include only when explicitly requested.
- Attachments: optional; include only when explicitly requested and file paths are available.
- Description: complete work summary markdown, written according to the Language Rules.

The required persisted config is:

```json
{
  "repositories": {
    "/absolute/path/to/repo": {
      "project": "<multica-project-id-or-ref>",
      "assignee": "<optional-assignee-override>",
      "assignee_id": "<optional-member-or-agent-uuid>",
      "workspace_id": "<optional-workspace-uuid>",
      "profile": "<optional-multica-cli-profile>",
      "status": "<optional-status>",
      "priority": "<optional-priority>",
      "start_date": "<optional-rfc3339-or-YYYY-MM-DD>",
      "due_date": "<optional-rfc3339-or-YYYY-MM-DD>"
    }
  }
}
```

Config file location:

```text
~/.config/multica/issue-creator/config.json
```

To inspect or maintain the config, use:

```bash
node <this-skill-dir>/scripts/create-issue.js show --repo <repo-root>
node <this-skill-dir>/scripts/create-issue.js set --repo <repo-root> --project <project-id-or-ref>
```

By default, the helper resolves the assignee from `multica user profile get --output json` at issue creation time. If the user wants a different owner than the current CLI login, persist an override with `--assignee <name>` or `--assignee-id <uuid>`.

If the machine uses multiple Multica workspaces or CLI profiles, also persist `--workspace-id <workspace-uuid>` or `--profile <profile-name>` during `set`.

If the user gives a project reference and the CLI rejects it, run `multica project list --output json` and ask the user which project to map for this repository. Do not guess from fuzzy project names when multiple projects could match.

If the current CLI user cannot be resolved, or the user gives an assignee display name and assignment fails, run `multica workspace member list --output json` and ask for the exact member or UUID. Do not guess when multiple members match.

## Workflow

1. Confirm the user explicitly requested issue creation.
2. Resolve the repository root when repository config is needed. Prefer `git rev-parse --show-toplevel`; if unavailable, use the current working directory.
3. Run the config helper:

   ```bash
   node <this-skill-dir>/scripts/create-issue.js show --repo <repo-root>
   ```

4. If config is missing, ask the user for:
   - Multica project reference for this repository.
   - Optional assignee override only if the current CLI user should not be the owner.
   - Optional priority only if the user cares; otherwise omit.
5. Persist the first-time config:

   ```bash
   node <this-skill-dir>/scripts/create-issue.js set --repo <repo-root> --project <project-id-or-ref>
   ```

6. Build the issue title from the summary according to the Language Rules. Keep it under 80 characters when possible.
7. Build the issue description from the current work summary using the issue description shape below.
8. Remove secrets and sensitive values before writing:
   - API keys, tokens, cookies, passwords.
   - Private credentials or connection strings.
   - Raw personal data not needed for the issue.
9. Write the description to a temporary UTF-8 no BOM markdown file.
10. Create the issue:

   ```bash
   node <this-skill-dir>/scripts/create-issue.js create --repo <repo-root> --title "<generated-title>" --summary-file <summary_file>
   ```

11. If the create command fails because the project or assignee cannot be resolved, use `multica project list --output json` or `multica workspace member list --output json` to gather options, then ask the user for the exact mapping. Do not retry with guessed values.
12. Report the created issue key/id or URL when the CLI returns it.

## Description Shape

Translate template headings and labels into the target language selected by the Language Rules; keep command strings, file paths, issue keys, and status enum values literal.

```md
## Summary

- Goal: <what this issue tracks>
- Status: <not started / in progress / completed / partially completed / blocked / investigation only / unknown>
- Start date: <YYYY-MM-DD, if set>
- Due date: <YYYY-MM-DD, if set>
- Repository: <repository name or path, if relevant>

## Details

- <requirement, change, operation, or decision>: <details>

## Verification

- `<command or check>`: <passed / failed / not run, with reason when useful>

## Risks / Blockers

- <risk, blocker, open question, or "None">

## Next Step

- <specific next step, or "Unknown">
```

Remove sections that truly do not apply, but keep the description useful as the canonical issue record.

## Tooling Rules

- Use `scripts/create-issue.js` for repository config and issue creation.
- Use temp files under `/private/tmp` or another writable temporary directory for generated description markdown.
- Do not use shell heredocs for description creation if a safer file edit path is available.
- The description file must be UTF-8 without BOM.
- Do not commit generated temporary files.

## Output To User

Keep the final response short:

- Issue created: yes/no and created issue key/id or URL when available.
- Project used.
- Assignee used when known.
- Comment posted: no, unless the user separately requested a distinct non-duplicate comment.
- Any CLI failure or missing input.

## Safety Rules

- Never create a Multica issue unless the user explicitly requested issue creation in this turn or an immediately active instruction.
- Never update existing issues from this skill.
- Never post secrets or credentials.
- Never guess repository-to-project mappings or assignee identities when the stored config is missing or a CLI lookup is ambiguous.
- Never claim an issue was created unless the CLI command succeeded and returned success.
- Never run development, testing, review, or repository mutation from this skill.
