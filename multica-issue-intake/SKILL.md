---
name: multica-issue-intake
description: Use this skill whenever an agent needs to resolve a Multica issue URL, issue UUID, or issue key and read its live content. This skill only handles input parsing, CLI/config checks, issue/comment fetching, attachment discovery, and producing a concise issue context package. It is useful when the user asks to read, inspect, or summarize a Multica issue.
---

# Multica Issue Intake

## Goal

Resolve one Multica issue reference, fetch the live issue context, and return a concise context package that summarizes what the issue says.

The issue is the source of truth. Do not rely only on pasted text when the `multica` CLI can fetch live data.

## Inputs

Accept any of these forms:

- Full web URL: `https://multica.example.com/example-workspace/issues/9b000092-8ed9-4047-9564-7f8301c4626e`
- Issue UUID: `9b000092-8ed9-4047-9564-7f8301c4626e`
- Issue key: `MUL-123`, `HT1-42`
- A sentence that contains one of the above

Use the bundled parser:

```bash
python3 <skill-dir>/scripts/parse_issue_input.py "<user input>"
```

The script prints JSON with `issue_ref`, `workspace_slug`, and `url` fields.

## CLI Prerequisites

Use the `multica` CLI for platform data:

```bash
multica config show
multica auth status
```

CLI configuration failures block intake because the live issue cannot be fetched reliably. If the CLI is not configured, stop and report the missing setup instead of guessing:

- `server_url`: set with `multica config set server_url <api-url>` or pass `--server-url`.
- `workspace_id`: set with `multica config set workspace_id <workspace-id>` or pass `--workspace-id`.
- Auth token: run `multica login`.

If the user pasted a frontend URL, do not assume the API URL is the same host/port. Check local config first. If the issue cannot be fetched, report the exact failing command and error.

## Workflow

1. Parse the input.
2. Fetch the issue:

   ```bash
   multica issue get <issue_ref> --output json
   ```

3. Fetch recent discussion:

   ```bash
   multica issue comment list <issue_ref> --recent 10 --output json
   ```

4. Inspect the issue and comments for attachment references. If attachments are required for understanding the issue, list or download them with available Multica attachment commands or the platform tools available in the current environment.
5. Produce an issue context package using the Output Contract below.

## Output Contract

Return a concise issue context package. This skill is read-only: do not change issue status, post comments, or modify repository files.

Use this structure for the issue summary:

```md
## Issue Context Package

- Issue: <issue key/id and title>
- Workspace/Project: <workspace or project when available, or "Unknown">
- Status: <current status or "Unknown">
- Priority: <priority or "Unknown">
- Assignee: <assignee or "Unassigned">
- Labels: <labels or "None">

## Request / Acceptance

- User-visible Request: <what the issue asks for>
- Acceptance Criteria: <explicit criteria, inferred criteria, or "Not specified">
- Open Questions: <unclear requirements or missing decisions, or "None">

## Source Material

- Description Summary: <concise summary of the issue description>
- Recent Discussion: <relevant comment summary, or "None">
- Attachments: <attachment names and whether downloaded, or "None">
- Linked Resources: <URLs, attachments, referenced documents, or "None">

## Constraints / Dependencies

- Constraints: <technical/product/process constraints, or "None">
- Dependencies: <linked issues, external systems, approvals, or "None">
- Blockers: <blockers, or "None">

## Intake Notes

- Commands Used:
  - `multica issue get <issue_ref> --output json`
  - `multica issue comment list <issue_ref> --recent 10 --output json`
- Missing Context: <anything important not found, or "None">
```

Field rules:

- Keep the package concise while preserving the facts needed to understand the issue.
- Mark absent fields as `Unknown`, `None`, or `Not specified`; do not omit fields that help explain what was or was not found.
- If acceptance criteria are inferred from the description or comments, label them as inferred.
- Capture relevant links, attachments, and referenced documents from issue descriptions or comments.

If blocked during intake, include:

- The unresolved issue reference or URL.
- The exact command that failed.
- The error message.
- The next setup step needed from the user.

## Safety Rules

- Never invent issue content. Fetch it first.
- Do not change issue status from this skill.
- Do not post comments from this skill.
- Do not download attachments unless they are needed for understanding the issue.
- Do not expose credentials or secrets in summaries.
