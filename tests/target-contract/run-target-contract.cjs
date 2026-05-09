const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const baseUrlIndex = args.indexOf('--base-url');
const baseUrlArgs = baseUrlIndex >= 0 && args[baseUrlIndex + 1]
  ? ['--base-url', args[baseUrlIndex + 1]]
  : [];

function run(commandArgs, env = {}) {
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

run(['tests/target-contract/seed-target-data.cjs']);
run(['tests/target-contract/verify-target-contract.cjs', ...baseUrlArgs]);
