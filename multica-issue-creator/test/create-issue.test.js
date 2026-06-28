import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildCreateArgs,
  buildMulticaArgs,
  extractCurrentUserAssignee,
  getRepoConfig,
  normalizeDateInput,
  saveRepoConfig,
  selectAssignee,
} from '../scripts/create-issue.js';

test('normalizeDateInput converts date-only values to local RFC3339', () => {
  assert.match(normalizeDateInput('2026-06-24'), /^2026-06-24T00:00:00[+-]\d\d:\d\d$/);
  assert.match(normalizeDateInput('2026-06-28', true), /^2026-06-28T23:59:59[+-]\d\d:\d\d$/);
});

test('buildCreateArgs includes required fields and omits optional defaults', () => {
  const args = buildCreateArgs({
    title: 'Create issue summary',
    summaryFile: '/private/tmp/summary.md',
    project: 'project-123',
    assignee: 'alex@example.com',
  });

  assert.deepEqual(args.slice(0, 8), [
    'issue',
    'create',
    '--title',
    'Create issue summary',
    '--description-file',
    '/private/tmp/summary.md',
    '--project',
    'project-123',
  ]);
  assert.equal(args.includes('--assignee'), true);
  assert.equal(args[args.indexOf('--assignee') + 1], 'alex@example.com');
  assert.equal(args.includes('--start-date'), false);
  assert.equal(args.includes('--due-date'), false);
  assert.equal(args.includes('--status'), false);
});

test('buildCreateArgs includes explicit status, dates, parent, and attachments', () => {
  const args = buildCreateArgs({
    title: 'Create issue summary',
    summaryFile: '/private/tmp/summary.md',
    project: 'project-123',
    status: 'in_progress',
    startDate: '2026-06-24',
    dueDate: '2026-06-28',
    parent: 'MUL-100',
    attachments: ['/private/tmp/a.log', '/private/tmp/b.png'],
  });

  assert.equal(args[args.indexOf('--status') + 1], 'in_progress');
  assert.match(args[args.indexOf('--start-date') + 1], /^2026-06-24T00:00:00[+-]\d\d:\d\d$/);
  assert.match(args[args.indexOf('--due-date') + 1], /^2026-06-28T23:59:59[+-]\d\d:\d\d$/);
  assert.equal(args[args.indexOf('--parent') + 1], 'MUL-100');
  assert.deepEqual(args.filter((value) => value === '--attachment').length, 2);
});

test('buildMulticaArgs prefixes optional workspace and profile flags', () => {
  const args = buildMulticaArgs({
    title: 'Create issue summary',
    summaryFile: '/private/tmp/summary.md',
    project: 'project-123',
    assignee: 'alex@example.com',
    workspaceId: 'workspace-123',
    profile: 'dev',
  });

  assert.deepEqual(args.slice(0, 4), ['--profile', 'dev', '--workspace-id', 'workspace-123']);
  assert.deepEqual(args.slice(4, 6), ['issue', 'create']);
});

test('extractCurrentUserAssignee prefers the current CLI user id', () => {
  assert.deepEqual(extractCurrentUserAssignee({
    id: 'user-123',
    username: 'alex',
    email: 'alex@example.com',
  }), {
    assigneeId: 'user-123',
    assignee: 'alex',
  });
});

test('extractCurrentUserAssignee falls back to a profile name when id is missing', () => {
  assert.deepEqual(extractCurrentUserAssignee({
    name: 'Alex Example',
    email: 'alex@example.com',
  }), {
    assigneeId: '',
    assignee: 'Alex Example',
  });
});

test('selectAssignee uses config override before current CLI user', () => {
  assert.deepEqual(selectAssignee(
    { assignee: 'override.user' },
    { assigneeId: 'user-123', assignee: 'alex' },
  ), {
    assigneeId: '',
    assignee: 'override.user',
  });
});

test('selectAssignee requires either config override or current CLI user', () => {
  assert.throws(() => selectAssignee({}, { assigneeId: '', assignee: '' }), /cannot resolve assignee/);
});

test('repo config is stored by normalized repository path', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'summary-issue-test-'));
  const configPath = path.join(dir, 'config.json');
  const repo = path.join(dir, 'repo');

  saveRepoConfig(repo, {
    project: 'project-123',
    assignee: 'alex@example.com',
    workspace_id: 'workspace-123',
  }, configPath);

  assert.deepEqual(getRepoConfig(repo, configPath).project, 'project-123');
  assert.equal(getRepoConfig(repo, configPath).assignee, 'alex@example.com');
  assert.equal(getRepoConfig(repo, configPath).workspace_id, 'workspace-123');
});
