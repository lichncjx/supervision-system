const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'db', 'postgres']);
const SAFE_ENVS = new Set(['local', 'test']);
const BLOCKED_DB_MARKERS = [
  'supabase.co',
  'pooler.supabase.com',
  'vercel',
  'production',
  'prod',
  'preview',
];

function maskDatabaseUrl(rawUrl = process.env.DATABASE_URL || '') {
  if (!rawUrl) return '<missing>';

  try {
    const url = new URL(rawUrl);
    if (url.username) url.username = '***';
    if (url.password) url.password = '***';
    return url.toString();
  } catch {
    return rawUrl.replace(/\/\/([^:/?#]+):([^@/]+)@/, '//***:***@');
  }
}

function getDatabaseHost(rawUrl = process.env.DATABASE_URL || '') {
  if (!rawUrl) return '';
  try {
    return new URL(rawUrl).hostname.replace(/^\[|\]$/g, '');
  } catch {
    return '';
  }
}

function getEnvironmentSummary() {
  return {
    NODE_ENV: process.env.NODE_ENV || '<unset>',
    APP_ENV: process.env.APP_ENV || '<unset>',
    TARGET_CONTRACT_ENV: process.env.TARGET_CONTRACT_ENV || '<unset>',
    VERCEL: process.env.VERCEL || '<unset>',
    VERCEL_ENV: process.env.VERCEL_ENV || '<unset>',
    DATABASE_URL: maskDatabaseUrl(),
  };
}

function assertLocalOrTestEnvironment() {
  const targetEnv = (process.env.TARGET_CONTRACT_ENV || '').toLowerCase();
  if (!SAFE_ENVS.has(targetEnv)) {
    throw new Error(
      'TARGET_CONTRACT_ENV must be explicitly set to "local" or "test" before running target-contract scripts.'
    );
  }

  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
  if (nodeEnv && !['development', 'local', 'test'].includes(nodeEnv)) {
    throw new Error(`NODE_ENV must be development/local/test or unset. Current NODE_ENV=${process.env.NODE_ENV}`);
  }

  const appEnv = (process.env.APP_ENV || '').toLowerCase();
  if (appEnv && !['development', 'local', 'test'].includes(appEnv)) {
    throw new Error(`APP_ENV must be development/local/test or unset. Current APP_ENV=${process.env.APP_ENV}`);
  }

  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    throw new Error('Refusing to run target-contract scripts in a Vercel environment.');
  }
}

function assertSafeDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL || '';
  if (!rawUrl) {
    throw new Error('DATABASE_URL is required for target-contract scripts.');
  }

  const lowerUrl = rawUrl.toLowerCase();
  const blockedMarker = BLOCKED_DB_MARKERS.find((marker) => lowerUrl.includes(marker));
  if (blockedMarker) {
    throw new Error(`Refusing to use DATABASE_URL containing blocked marker "${blockedMarker}".`);
  }

  const host = getDatabaseHost(rawUrl);
  if (!LOCAL_DB_HOSTS.has(host)) {
    throw new Error(
      `Refusing to use non-local database host "${host}". Allowed hosts: ${Array.from(LOCAL_DB_HOSTS).join(', ')}.`
    );
  }
}

function assertSafeBaseUrl(baseUrl) {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== 'http:') {
    throw new Error(`Refusing base URL protocol "${parsed.protocol}". Use local http:// only.`);
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (!isLocal) {
    throw new Error(`Refusing to call non-local base URL "${baseUrl}". Use localhost/127.0.0.1 only.`);
  }
}

function printEnvironmentSummary(prefix = '[target-contract]') {
  console.log(`${prefix} safety environment`);
  console.log(JSON.stringify(getEnvironmentSummary(), null, 2));
}

function assertResetApproved() {
  if (process.env.TARGET_CONTRACT_RESET !== '1') {
    throw new Error('TARGET_CONTRACT_RESET=1 is required because this script clears test data.');
  }
}

module.exports = {
  assertLocalOrTestEnvironment,
  assertResetApproved,
  assertSafeBaseUrl,
  assertSafeDatabaseUrl,
  getEnvironmentSummary,
  maskDatabaseUrl,
  printEnvironmentSummary,
};
