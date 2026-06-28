import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CONFIG_PATH = path.join(os.homedir(), '.config', 'multica', 'issue-creator', 'config.json');

function parseArgs(argv) {
  const result = {};
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (typeof next === 'string' && !next.startsWith('--')) {
      if (key === 'attachment') {
        result[key] = result[key] || [];
        result[key].push(next);
      } else {
        result[key] = next;
      }
      i += 1;
    } else {
      result[key] = true;
    }
  }

  result._ = positional;
  return result;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function normalizeRepoPath(repoPath) {
  return path.resolve(repoPath || process.cwd());
}

function repoKey(repoPath) {
  return normalizeRepoPath(repoPath);
}

function toLocalRfc3339(date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  const yyyy = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${month}-${day}T${hour}:${minute}:${second}${sign}${hh}:${mm}`;
}

function normalizeDateInput(value, endOfDay = false) {
  const text = firstString(value);
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, 0);
    return toLocalRfc3339(date);
  }
  return text;
}

function normalizeAttachments(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function loadConfig(configPath = CONFIG_PATH) {
  const config = readJson(configPath, { repositories: {} });
  if (!config.repositories || typeof config.repositories !== 'object') {
    config.repositories = {};
  }
  return config;
}

function saveRepoConfig(repoPath, repoConfig, configPath = CONFIG_PATH) {
  const config = loadConfig(configPath);
  const key = repoKey(repoPath);
  config.repositories[key] = {
    ...config.repositories[key],
    ...repoConfig,
    updated_at: new Date().toISOString(),
  };
  writeJson(configPath, config);
  return config.repositories[key];
}

function getRepoConfig(repoPath, configPath = CONFIG_PATH) {
  const config = loadConfig(configPath);
  return config.repositories[repoKey(repoPath)] || null;
}

function requireValue(value, label) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  throw new Error(`missing required value: ${label}`);
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function extractCurrentUserAssignee(profile) {
  if (!profile || typeof profile !== 'object') {
    return { assigneeId: '', assignee: '' };
  }

  const assigneeId = firstString(profile.id, profile.user_id, profile.userId);
  const assignee = firstString(profile.username, profile.name, profile.email, profile.display_name, profile.displayName);

  return {
    assigneeId,
    assignee,
  };
}

function resolveCurrentUserAssignee(baseArgs = []) {
  const result = spawnSync('multica', baseArgs.concat(['user', 'profile', 'get', '--output', 'json']), {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    return { assigneeId: '', assignee: '' };
  }

  try {
    return extractCurrentUserAssignee(JSON.parse(result.stdout));
  } catch {
    return { assigneeId: '', assignee: '' };
  }
}

function selectAssignee(config, currentUserAssignee) {
  const configuredAssigneeId = firstString(config.assignee_id);
  if (configuredAssigneeId) {
    return {
      assigneeId: configuredAssigneeId,
      assignee: firstString(config.assignee),
    };
  }

  const configuredAssignee = firstString(config.assignee);
  if (configuredAssignee) {
    return {
      assigneeId: '',
      assignee: configuredAssignee,
    };
  }

  const assigneeId = firstString(currentUserAssignee.assigneeId);
  const assignee = firstString(currentUserAssignee.assignee);

  if (!assigneeId && !assignee) {
    throw new Error('cannot resolve assignee from config or current multica CLI user');
  }

  return {
    assigneeId,
    assignee,
  };
}

function buildCreateArgs(options) {
  const title = requireValue(options.title, 'title');
  const summaryFile = requireValue(options.summaryFile, 'summary-file');
  const project = requireValue(options.project, 'project');

  const args = [
    'issue',
    'create',
    '--title',
    title,
    '--description-file',
    summaryFile,
    '--project',
    project,
    '--output',
    'json',
  ];

  const startDate = normalizeDateInput(options.startDate);
  if (startDate) {
    args.push('--start-date', startDate);
  }

  const dueDate = normalizeDateInput(options.dueDate, true);
  if (dueDate) {
    args.push('--due-date', dueDate);
  }

  if (options.status) {
    args.push('--status', options.status);
  }

  if (options.assigneeId) {
    args.push('--assignee-id', options.assigneeId);
  } else if (options.assignee) {
    args.push('--assignee', options.assignee);
  }

  if (options.priority) {
    args.push('--priority', options.priority);
  }

  if (options.parent) {
    args.push('--parent', options.parent);
  }

  for (const attachment of normalizeAttachments(options.attachments)) {
    args.push('--attachment', attachment);
  }

  if (options.allowDuplicate === true) {
    args.push('--allow-duplicate');
  }

  return args;
}

function buildMulticaArgs(options) {
  const args = [];

  if (options.profile) {
    args.push('--profile', options.profile);
  }

  if (options.workspaceId) {
    args.push('--workspace-id', options.workspaceId);
  }

  return args.concat(buildCreateArgs(options));
}

function usage() {
  return `Usage:
  node create-issue.js show [--repo <path>]
  node create-issue.js set --repo <path> --project <project-id-or-ref> [--assignee <name>] [--assignee-id <id>] [--workspace-id <id>] [--profile <name>] [--status <status>] [--priority <priority>] [--start-date <date-or-rfc3339>] [--due-date <date-or-rfc3339>]
  node create-issue.js create --title <title> --summary-file <file> [--repo <path>] [--status <status>] [--priority <priority>] [--start-date <date-or-rfc3339>] [--due-date <date-or-rfc3339>] [--parent <issue-id>] [--attachment <file>] [--allow-duplicate] [--dry-run]

Config path:
  ${CONFIG_PATH}`;
}

function runCli(args) {
  return spawnSync('multica', args, {
    stdio: 'inherit',
    encoding: 'utf8',
  });
}

function main(argv) {
  const args = parseArgs(argv);
  const command = args._[0];
  const repoPath = normalizeRepoPath(args.repo || process.cwd());

  if (!command || args.help) {
    console.log(usage());
    return 0;
  }

  if (command === 'show') {
    const config = getRepoConfig(repoPath);
    console.log(JSON.stringify({
      repo: repoPath,
      config_path: CONFIG_PATH,
      configured: Boolean(config),
      config,
    }, null, 2));
    return config ? 0 : 2;
  }

  if (command === 'set') {
    const saved = saveRepoConfig(repoPath, {
      project: requireValue(args.project, 'project'),
      assignee: args.assignee ? String(args.assignee).trim() : undefined,
      assignee_id: args['assignee-id'] ? String(args['assignee-id']).trim() : undefined,
      workspace_id: args['workspace-id'] ? String(args['workspace-id']).trim() : undefined,
      profile: args.profile ? String(args.profile).trim() : undefined,
      status: args.status ? String(args.status).trim() : undefined,
      priority: args.priority ? String(args.priority).trim() : undefined,
      start_date: args['start-date'] ? String(args['start-date']).trim() : undefined,
      due_date: args['due-date'] ? String(args['due-date']).trim() : undefined,
    });
    console.log(JSON.stringify({
      repo: repoPath,
      config_path: CONFIG_PATH,
      config: saved,
    }, null, 2));
    return 0;
  }

  if (command === 'create') {
    const config = getRepoConfig(repoPath);
    if (!config) {
      console.error(`No config for repo: ${repoPath}`);
      console.error(`Run: node ${fileURLToPath(import.meta.url)} set --repo "${repoPath}" --project <project-id-or-ref>`);
      return 2;
    }

    const baseArgs = [];
    if (config.profile) {
      baseArgs.push('--profile', config.profile);
    }
    if (config.workspace_id) {
      baseArgs.push('--workspace-id', config.workspace_id);
    }
    const currentUserAssignee = config.assignee || config.assignee_id
      ? { assignee: '', assigneeId: '' }
      : resolveCurrentUserAssignee(baseArgs);
    let selectedAssignee;
    try {
      selectedAssignee = selectAssignee(config, currentUserAssignee);
    } catch (error) {
      console.error(error.message);
      console.error(`Run: node ${fileURLToPath(import.meta.url)} set --repo "${repoPath}" --project <project-id-or-ref> --assignee <name>`);
      return 2;
    }

    const createArgs = buildMulticaArgs({
      title: args.title,
      summaryFile: args['summary-file'],
      project: config.project,
      assignee: selectedAssignee.assignee,
      assigneeId: selectedAssignee.assigneeId,
      workspaceId: config.workspace_id,
      profile: config.profile,
      status: args.status || config.status,
      startDate: args['start-date'] || config.start_date,
      dueDate: args['due-date'] || config.due_date,
      priority: args.priority || config.priority,
      parent: args.parent,
      attachments: args.attachment,
      allowDuplicate: args['allow-duplicate'] === true,
    });

    if (args['dry-run']) {
      console.log(JSON.stringify({
        command: 'multica',
        args: createArgs,
      }, null, 2));
      return 0;
    }

    const result = runCli(createArgs);
    return result.status ?? 1;
  }

  console.error(`Unknown command: ${command}`);
  console.error(usage());
  return 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  process.exitCode = main(process.argv.slice(2));
}

export {
  CONFIG_PATH,
  buildCreateArgs,
  buildMulticaArgs,
  extractCurrentUserAssignee,
  getRepoConfig,
  loadConfig,
  main,
  normalizeDateInput,
  normalizeRepoPath,
  repoKey,
  saveRepoConfig,
  selectAssignee,
  toLocalRfc3339,
};
