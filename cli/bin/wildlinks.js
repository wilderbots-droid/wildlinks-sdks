#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const CONFIG_PATH = process.env.WILDLINKS_CONFIG || path.join(os.homedir(), '.wildlinks.json');
const DEFAULT_API_BASE = process.env.WILDLINKS_API_BASE || 'http://localhost:4000';

function printHelp() {
  console.log(`WilderLink CLI

Usage:
  wl login --email you@example.com --password secret [--api-base URL] [--org ORG_ID]
  wl config get
  wl config set --api-base URL [--token TOKEN] [--org ORG_ID] [--api-key KEY]
  wl orgs
  wl links list [--page 1] [--limit 25] [--search text] [--tag tag]
  wl links get LINK_ID
  wl links create --url URL [--domain-id ID] [--title TITLE] [--slug SLUG] [--tag a,b] [--utm-source src] [--utm-medium med] [--utm-campaign name]
  wl qr LINK_ID --out qr.png [--format png|svg|pdf] [--dark 000000] [--light ffffff] [--logo]
  wl utm generate --url URL [--title TITLE] [--source instagram] [--medium social] [--campaign launch] [--content hero]

Environment:
  WILDLINKS_API_BASE, WILDLINKS_TOKEN, WILDLINKS_ORG_ID, WILDLINKS_API_KEY, WILDLINKS_CONFIG`);
}

function parseArgv(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      args._.push(item);
      continue;
    }
    const [rawKey, inlineValue] = item.slice(2).split('=');
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
    } else if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
      args[key] = argv[index + 1];
      index += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

function resolveConfig(args = {}) {
  const file = readConfig();
  return {
    apiBase: String(args.apiBase || process.env.WILDLINKS_API_BASE || file.apiBase || DEFAULT_API_BASE).replace(/\/$/, ''),
    token: args.token || process.env.WILDLINKS_TOKEN || file.token || null,
    orgId: args.org || args.orgId || process.env.WILDLINKS_ORG_ID || file.orgId || null,
    apiKey: args.apiKey || process.env.WILDLINKS_API_KEY || file.apiKey || null,
    organizations: file.organizations || [],
  };
}

function cleanObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''));
}

function requireValue(value, message) {
  if (!value) throw new Error(message);
  return value;
}

async function request(config, method, route, { body, apiKey = false, binary = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (apiKey) headers.Authorization = `ApiKey ${requireValue(config.apiKey, 'Missing API key. Run wl config set --api-key KEY or set WILDLINKS_API_KEY.')}`;
  else headers.Authorization = `Bearer ${requireValue(config.token, 'Missing auth token. Run wl login or set WILDLINKS_TOKEN.')}`;
  if (config.orgId) headers['X-Organization-Id'] = config.orgId;

  const response = await fetch(`${config.apiBase}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (binary) {
    if (!response.ok) throw new Error(await errorMessage(response));
    return Buffer.from(await response.arrayBuffer());
  }

  const text = await response.text();
  const payload = text ? safeJson(text) : {};
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function errorMessage(response) {
  const text = await response.text();
  const body = safeJson(text);
  return typeof body === 'object' && body?.error ? body.error : `Request failed (${response.status})`;
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printLinks(payload) {
  const links = payload.links || [];
  if (!links.length) {
    console.log('No links found.');
    return;
  }
  for (const link of links) {
    console.log(`${link._id}\t${link.shortUrl}\t${link.title || link.slug}\t${link.clickCount || 0} clicks`);
  }
  if (payload.pagination) {
    console.log(`Page ${payload.pagination.page} of ${Math.max(1, Math.ceil(payload.pagination.total / payload.pagination.limit))}`);
  }
}

function tagsFrom(value) {
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function login(args) {
  const config = resolveConfig(args);
  const email = requireValue(args.email, 'Missing --email');
  const password = requireValue(args.password, 'Missing --password');
  const response = await fetch(`${config.apiBase}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, twoFactorCode: args.twoFactorCode }),
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 202 && body.requiresTwoFactor) {
    throw new Error('Two-factor code required. Re-run with --two-factor-code CODE.');
  }
  if (!response.ok) throw new Error(body.error || `Login failed (${response.status})`);

  const orgId = args.org || args.orgId || body.organizations?.[0]?.id || body.organization?.id;
  writeConfig({
    ...readConfig(),
    apiBase: config.apiBase,
    token: body.token,
    orgId,
    organizations: body.organizations || (body.organization ? [body.organization] : []),
  });
  console.log(`Logged in as ${body.user?.email || email}`);
  if (orgId) console.log(`Active organization: ${orgId}`);
}

async function configCommand(args) {
  const sub = args._[1];
  if (sub === 'get') {
    const config = resolveConfig(args);
    printJson({ ...config, token: config.token ? '[set]' : null, apiKey: config.apiKey ? '[set]' : null });
    return;
  }
  if (sub === 'set') {
    const current = readConfig();
    const next = {
      ...current,
      ...(args.apiBase ? { apiBase: String(args.apiBase).replace(/\/$/, '') } : {}),
      ...(args.token ? { token: args.token } : {}),
      ...(args.org || args.orgId ? { orgId: args.org || args.orgId } : {}),
      ...(args.apiKey ? { apiKey: args.apiKey } : {}),
    };
    writeConfig(next);
    console.log(`Config saved to ${CONFIG_PATH}`);
    return;
  }
  throw new Error('Use wl config get or wl config set.');
}

async function linksCommand(args) {
  const sub = args._[1];
  const config = resolveConfig(args);
  if (sub === 'list') {
    requireValue(config.orgId, 'Missing organization. Run wl login or pass --org ORG_ID.');
    const query = new URLSearchParams(cleanObject({
      page: args.page || '1',
      limit: args.limit || '25',
      search: args.search,
      tag: args.tag,
    }));
    printLinks(await request(config, 'GET', `/api/v1/organizations/${config.orgId}/links?${query}`));
    return;
  }
  if (sub === 'get') {
    const id = requireValue(args._[2], 'Missing link id.');
    const route = config.orgId ? `/api/v1/organizations/${config.orgId}/links/${id}` : `/api/v1/links/${id}`;
    printJson(await request(config, 'GET', route, { apiKey: !config.orgId }));
    return;
  }
  if (sub === 'create') {
    const payload = cleanObject({
      domainId: args.domainId,
      appProfileId: args.appProfileId,
      pathPrefix: args.pathPrefix,
      slug: args.slug,
      title: args.title,
      defaultUrl: requireValue(args.url || args.defaultUrl, 'Missing --url'),
      preferShortDomain: args.preferShortDomain,
      tags: tagsFrom(args.tag || args.tags),
      utm: cleanObject({
        source: args.utmSource,
        medium: args.utmMedium,
        campaign: args.utmCampaign,
        term: args.utmTerm,
        content: args.utmContent,
      }),
    });
    const route = config.orgId ? `/api/v1/organizations/${config.orgId}/links` : '/api/v1/links';
    printJson(await request(config, 'POST', route, { body: payload, apiKey: !config.orgId }));
    return;
  }
  throw new Error('Use wl links list, wl links get LINK_ID, or wl links create --url URL.');
}

async function qrCommand(args) {
  const config = resolveConfig(args);
  const id = requireValue(args._[1], 'Missing link id.');
  const format = args.format || path.extname(args.out || '').replace('.', '') || 'png';
  const out = requireValue(args.out, 'Missing --out file path.');
  const query = new URLSearchParams(cleanObject({
    format,
    dark: args.dark,
    light: args.light,
    width: args.width,
    logo: args.logo ? 'auto' : undefined,
  }));
  const route = config.orgId
    ? `/api/v1/organizations/${config.orgId}/links/${id}/qrcode?${query}`
    : `/api/v1/links/${id}/qrcode?${query}`;
  const headers = config.orgId
    ? { Authorization: `Bearer ${requireValue(config.token, 'Missing auth token. Run wl login or set WILDLINKS_TOKEN.')}`, 'X-Organization-Id': config.orgId }
    : { Authorization: `ApiKey ${requireValue(config.apiKey, 'Missing API key. Run wl config set --api-key KEY or set WILDLINKS_API_KEY.')}` };
  const response = await fetch(`${config.apiBase}${route}`, { headers });
  if (!response.ok) throw new Error(await errorMessage(response));
  const contentType = response.headers.get('content-type') || '';
  let buffer;
  if (contentType.includes('application/json')) {
    const body = await response.json();
    const match = String(body.qrCodeDataUrl || '').match(/^data:[^;]+;base64,(.+)$/);
    if (!match) throw new Error('QR response did not contain a data URL.');
    buffer = Buffer.from(match[1], 'base64');
  } else {
    buffer = Buffer.from(await response.arrayBuffer());
  }
  fs.writeFileSync(out, buffer);
  console.log(`QR saved to ${out}`);
}

async function utmCommand(args) {
  const sub = args._[1];
  if (sub !== 'generate') throw new Error('Use wl utm generate --url URL.');
  const config = resolveConfig(args);
  requireValue(config.orgId, 'Missing organization. Run wl login or pass --org ORG_ID.');
  const payload = cleanObject({
    destinationUrl: requireValue(args.url || args.destinationUrl, 'Missing --url'),
    title: args.title,
    source: args.source,
    channel: args.channel,
    platform: args.platform,
    medium: args.medium,
    campaignName: args.campaign || args.campaignName,
    term: args.term,
    keyword: args.keyword,
    content: args.content,
    creative: args.creative,
    variant: args.variant,
  });
  printJson(await request(config, 'POST', `/api/v1/organizations/${config.orgId}/links/utm/generate`, { body: payload }));
}

async function orgsCommand(args) {
  const config = resolveConfig(args);
  const me = await request(config, 'GET', '/api/v1/auth/me');
  for (const org of me.organizations || []) {
    const active = String(org.id) === String(config.orgId) ? '*' : ' ';
    console.log(`${active} ${org.id}\t${org.name}\t${org.role || ''}`);
  }
}

async function main() {
  const args = parseArgv(process.argv.slice(2));
  const command = args._[0];
  if (!command || args.help || command === 'help' || command === '--help') {
    printHelp();
    return;
  }
  if (command === 'login') return login(args);
  if (command === 'config') return configCommand(args);
  if (command === 'orgs') return orgsCommand(args);
  if (command === 'links') return linksCommand(args);
  if (command === 'qr') return qrCommand(args);
  if (command === 'utm') return utmCommand(args);
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
