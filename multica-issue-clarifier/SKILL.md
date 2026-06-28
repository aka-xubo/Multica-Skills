---
name: multica-issue-clarifier
description: Use this skill when the user wants to clarify, challenge, or refine a Multica issue after its content has been read, especially when requirements, acceptance criteria, constraints, or next decisions are ambiguous. This skill pressure-tests the issue content by identifying gaps and asking one focused clarification question at a time. It does not fetch issues, write Multica comments, change status, or implement code.
---

# Multica Issue Clarifier

## Goal

Clarify what a Multica issue is really asking for before anyone acts on it.

Use this after the issue content is available from `multica-issue-intake`, pasted issue text, or a user-provided summary. The job is to find ambiguity, contradictions, missing decisions, and risky assumptions, then ask targeted questions until the issue is clear enough for the user's next step.

## Boundaries

This skill is conversation-only.

Do not:

- Fetch issue content from Multica.
- Post Multica comments.
- Change Multica issue status.
- Modify repository files.
- Start implementation or verification.
- Produce a full design unless the user explicitly asks for one after clarification.

If the user only provides an issue URL/key and no issue content, ask them to run/read the issue first or use `multica-issue-intake`. Do not guess issue details from the reference alone.

## Clarification Style

Be direct, specific, and evidence-based.

- Challenge vague requirements, hidden assumptions, and unsupported conclusions.
- Prefer concrete examples over abstract debate.
- Ask one question at a time.
- Ask the highest-leverage question first.
- Do not ask questions whose answers are already present in the issue content.
- If a question can be answered by inspecting provided context or local repository files, inspect first instead of asking.
- Stop asking when the remaining ambiguity no longer affects the user's stated next step.

Do not soften important gaps. If an issue is too vague to act on, say exactly what is missing.

## Workflow

1. Read the available issue content or issue context package.
2. Extract the stated request, acceptance criteria, constraints, dependencies, and open questions.
3. Identify the smallest set of ambiguities that could change the outcome.
4. Prioritize the ambiguity with the highest impact.
5. Ask one focused clarification question.
6. After the user answers, update the working understanding and repeat only if another material ambiguity remains.
7. When the issue is clear enough, summarize the clarified understanding and remaining assumptions.

## Question Selection

Prefer questions in this order:

1. Outcome: What user-visible result is expected?
2. Acceptance: How will success be judged?
3. Scope: What is explicitly included or excluded?
4. Data: Which records, environments, tenants, users, or examples matter?
5. Constraints: Are there compatibility, security, performance, timeline, or rollout constraints?
6. Ownership: Who needs to decide, approve, test, or provide missing information?

Ask about implementation only when the issue already constrains implementation or the user's next step depends on that decision.

## Output Shapes

When asking a question:

```md
I need one clarification before this is actionable:

<single focused question>
```

When summarizing clarified issue content:

```md
## Clarified Issue

- Request: <what needs to happen>
- Acceptance: <how success will be judged>
- Scope: <included work>
- Out of Scope: <excluded work, or "None stated">
- Constraints: <constraints, or "None stated">
- Open Questions: <remaining material questions, or "None">
- Assumptions: <assumptions still being made, or "None">
```

For a quick readout, use:

```md
The issue is clear enough for <next step>. Remaining assumption: <assumption or "None">.
```

## Safety Rules

- Do not invent missing requirements.
- Do not convert guesses into acceptance criteria.
- Do not imply the issue is ready if material ambiguity remains.
- Do not write anything back to Multica unless another explicit write skill is invoked by the user.
- Do not ask multiple questions at once unless the user explicitly requests a full clarification checklist.
