---
name: multica-agent-invoker
description: Use this skill when the user explicitly asks to invoke, mention, tag, @, assign, hand off an existing Multica issue to a Multica agent, or list/select one of the current user's Multica agents before invoking one from Codex or Claude. This skill lists the current user's agents by default, can list all visible agents only when explicitly requested, resolves a real Multica agent, posts a task comment with a real agent mention, or assigns the issue to that agent. It never chooses an agent automatically, never creates issues, never reads issue content unless another skill is used, and does not support rerun mode.
---

# Multica Agent Invoker

## Goal

Invoke a specific Multica agent from a Codex or Claude workflow while keeping Multica as the issue system of record.

Use this when the user wants to explicitly involve a Multica agent on an existing issue, such as asking a review agent to review code, asking a test agent to inspect a scenario, or assigning an issue to an agent.

## Supported Modes

### Mention Mode

Post a Multica issue comment that contains a real agent mention and a clear task brief.

Use this when the user wants to `@agent`, ask an agent to review something, or send a focused handoff without changing issue ownership.

### Assign Mode

Assign the issue to a specific Multica agent.

Use this when the user wants the issue owner/assignee to become that agent.

This skill does not support rerun mode. If an issue already has an agent assignment and the user wants to rerun it, handle that outside this skill or add a separate rerun-specific skill later.

## Boundaries

This skill only invokes a named agent for an existing issue.

Do not:

- Choose an agent automatically.
- Guess an agent from assignee, author, comments, branch name, or repository conventions.
- Create a new issue.
- Read issue content from Multica.
- Implement code, run tests, or perform review locally.
- Change issue status unless the user separately asks for a status update through another skill.
- Use plain `@name` text when the intent is to notify an agent.

If the user needs to read issue content first, use `multica-issue-intake`.

If the user asks to create a new issue, use `multica-issue-creator`.

If the user asks to comment or change status without invoking an agent, use `multica-issue-updater`.

## Required Inputs

Before invoking an agent, identify:

- Issue reference: issue key, UUID, or URL.
- Agent name or agent ID, unless the user explicitly asks to list/select an agent first.
- Invocation mode:
  - `mention`
  - `assign`
- Task brief for mention mode.
- Any relevant context for the task brief:
  - review scope
  - files or modules
  - repository root
  - suggested commands
  - checks already run
  - risks, blockers, or ignore list

If the issue reference is missing, ask for it.

If the agent name or ID is missing and the user did not ask to choose from a list, ask for it.

If the user asks to choose, select, list agents, show available agents, or does not know which agent to use, follow Agent Selection Flow before invoking anything.

By default, restrict agent selection and name matching to the current CLI user's agents. Expand to all visible agents only when the user explicitly asks for all agents, workspace agents, shared agents, or a specific agent that is not owned by the current CLI user.

If the mode is ambiguous, prefer mention mode when the user says `@`, `mention`, `ask`, `review`, `please look at`, or gives a task brief. Use assign mode only when the user says `assign`, `hand off ownership`, or equivalent.

## Agent Resolution

Resolve the agent before writing anything:

```bash
multica user profile get --output json
multica agent list --output json
```

By default, filter the agent list to entries whose `owner_id` equals the current user profile `id`, then match by agent ID or unambiguous name.

If the current user profile cannot be resolved, explain that the skill cannot safely determine "my agents" and ask whether to list all visible agents instead.

If a user explicitly gives an agent ID or exact name that is not owned by the current CLI user, do not silently use it. Tell the user it is outside the default "my agents" scope and ask for confirmation before invoking it.

If there is no match or multiple possible matches, ask the user to choose. Do not guess.

When writing a mention, use real Multica mention markdown:

```md
[@Agent Name](mention://agent/<agent_id>)
```

Plain `@Agent Name` is only text and may not notify the agent.

## Agent Selection Flow

Use this flow when the user asks to choose an agent or has not identified a target agent.

1. Resolve the current CLI user:

   ```bash
   multica user profile get --output json
   ```

2. Run:

   ```bash
   multica agent list --output json
   ```

3. By default, filter to agents whose `owner_id` equals the current user profile `id`.
4. Present a concise numbered list of the current user's agents. Include agent name, ID, and a short description or status when available in the CLI output.
5. If no owned agents are found, say so and ask whether to show all visible agents in the current Multica workspace/profile.
6. If the user explicitly asked for all visible agents, skip the owner filter and describe the result as visible workspace/profile agents, not "my agents".
7. If the list is long, show the most relevant entries and ask the user for a keyword or exact agent choice.
8. Ask the user to choose one agent by number, name, or ID.
9. Do not post a comment, assign an issue, or invoke any agent until the user chooses.

Do not call entries "my agents" unless the CLI output includes `owner_id` and it matches the current user profile `id`. Without an ownership field, describe them as agents visible in the current Multica workspace/profile.

## Mention Workflow

1. Confirm the issue reference, target agent, and task brief.
2. Resolve the current user with `multica user profile get --output json`, then resolve the agent with `multica agent list --output json`.
3. Build a concise task comment in the user's language by default.
4. Include the real agent mention.
5. Remove secrets and sensitive data before posting.
6. Write the comment to a temporary UTF-8 no BOM markdown file.
7. Post the comment:

   ```bash
   multica issue comment add <issue_ref> --content-file <comment_file>
   ```

8. Report whether the comment was posted and which agent was mentioned.

## Assign Workflow

1. Confirm the issue reference and target agent.
2. Resolve the current user with `multica user profile get --output json`, then resolve the agent with `multica agent list --output json`.
3. Assign the issue:

   ```bash
   multica issue assign <issue_ref> --to-id <agent_id>
   ```

4. Report whether the assignment succeeded and which agent was assigned.

## Task Comment Shape

Use the user's language by default. If the user's language is unclear, use English. Keep file paths, commands, issue keys, status values, and code identifiers literal.

```md
[@Agent Name](mention://agent/<agent_id>) please handle the task below.

## Task

- Goal: <what the agent should do>
- Issue: <issue ref, if useful in the body>
- Scope: <what to inspect or handle>
- Out of Scope: <what to ignore, or "None">

## Context

- <fact, file, command, decision, or constraint>

## Suggested Inputs

- Repo root: `<absolute path, if relevant>`
- Files: `<path>`, `<path>`
- Suggested command: `<command, if relevant>`

## Checks / Evidence

- `<command or observation>`: <result, or "Not run">

## Ignore

- <unrelated local change, unrelated file, or "None">
```

Remove sections that do not apply. Keep the task brief specific enough that the target agent can act without guessing.

## Code Review Handoff

For code review requests, include:

- Repository root when known.
- Review scope.
- Files to review.
- Suggested diff command, if available.
- Checks already run.
- Known failures or skipped checks.
- Unrelated dirty files or pre-existing changes to ignore.

Do not claim tests passed unless they were actually run and passed.

## Safety Rules

- Never invoke an agent unless the user explicitly requested that agent invocation.
- Never use an ambiguous agent match.
- Never post a plain `@name` when a real agent mention is needed.
- Never create a new issue from this skill.
- Never update status from this skill.
- Never run `multica issue rerun` from this skill.
- Never post secrets, credentials, private tokens, or unnecessary personal data.
- Never claim a comment was posted or an issue was assigned unless the CLI command succeeded.
