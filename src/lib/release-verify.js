import { spawnSync } from 'node:child_process';

export const REQUIRED_PACKAGED_PATHS = [
  'README.md',
  'README.zh-CN.md',
  'docs/README.md',
  'docs/README.zh-CN.md',
  'docs/architecture.md',
  'docs/authoring-targets.md',
];

export async function runReleaseVerify({ cwd = process.cwd(), runner = defaultRunner } = {}) {
  const steps = [];

  const helpResult = runner(getNodeCommand(), ['src/cli.js', '--help'], { cwd });
  steps.push({
    name: 'cli-help',
    command: 'node src/cli.js --help',
    ok: helpResult.ok && helpResult.stdout.includes('company-cc'),
    exitCode: helpResult.exitCode,
    summary: helpResult.ok && helpResult.stdout.includes('company-cc')
      ? 'CLI help entrypoint responded'
      : 'CLI help entrypoint failed',
    stdout: helpResult.stdout,
    stderr: helpResult.stderr,
  });

  const testResult = runner(getNpmCommand(), ['test', '--silent'], { cwd });
  steps.push({
    name: 'tests',
    command: 'npm test --silent',
    ok: testResult.ok,
    exitCode: testResult.exitCode,
    summary: testResult.ok ? 'test suite passed' : 'test suite failed',
    stdout: testResult.stdout,
    stderr: testResult.stderr,
  });

  let packPayload = null;
  const packResult = runner(getNpmCommand(), ['pack', '--dry-run', '--json'], { cwd });
  if (packResult.ok) {
    try {
      const parsed = JSON.parse(packResult.stdout);
      packPayload = Array.isArray(parsed) ? parsed[0] : parsed;
    } catch (error) {
      steps.push({
        name: 'pack',
        command: 'npm pack --dry-run --json',
        ok: false,
        exitCode: packResult.exitCode,
        summary: `pack output was not valid JSON: ${error.message}`,
        stdout: packResult.stdout,
        stderr: packResult.stderr,
      });
    }
  }

  if (!steps.some((step) => step.name === 'pack')) {
    if (!packResult.ok) {
      steps.push({
        name: 'pack',
        command: 'npm pack --dry-run --json',
        ok: false,
        exitCode: packResult.exitCode,
        summary: 'npm pack --dry-run failed',
        stdout: packResult.stdout,
        stderr: packResult.stderr,
      });
    } else {
      const packagedPaths = new Set((packPayload?.files ?? []).map((file) => file.path));
      const missingRequiredPaths = REQUIRED_PACKAGED_PATHS.filter((path) => !packagedPaths.has(path));
      steps.push({
        name: 'pack',
        command: 'npm pack --dry-run --json',
        ok: missingRequiredPaths.length === 0,
        exitCode: packResult.exitCode,
        summary: missingRequiredPaths.length === 0
          ? `tarball contains ${packPayload?.entryCount ?? packPayload?.files?.length ?? 0} files`
          : `tarball missing required packaged docs: ${missingRequiredPaths.join(', ')}`,
        stdout: packResult.stdout,
        stderr: packResult.stderr,
        package: {
          name: packPayload?.name ?? null,
          version: packPayload?.version ?? null,
          filename: packPayload?.filename ?? null,
          entryCount: packPayload?.entryCount ?? packPayload?.files?.length ?? 0,
          requiredPathsChecked: REQUIRED_PACKAGED_PATHS,
          missingRequiredPaths,
        },
      });
    }
  }

  const ok = steps.every((step) => step.ok);
  const packStep = steps.find((step) => step.name === 'pack');

  return {
    ok,
    command: 'verify-release',
    cwd,
    steps: steps.map(({ stdout, stderr, ...step }) => step),
    package: packStep?.package ?? null,
    summary: {
      stepCount: steps.length,
      failedSteps: steps.filter((step) => !step.ok).map((step) => step.name),
    },
    details: steps,
  };
}

function defaultRunner(command, args, options) {
  const result = spawnSync(command, args, {
    ...options,
    encoding: 'utf8',
  });

  if (result.error) {
    return {
      ok: false,
      exitCode: 1,
      stdout: result.stdout ?? '',
      stderr: result.error.message,
    };
  }

  return {
    ok: result.status === 0,
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function getNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function getNodeCommand() {
  return process.execPath;
}
