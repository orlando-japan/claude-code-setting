import test from 'node:test';
import assert from 'node:assert/strict';
import { runReleaseVerify, REQUIRED_PACKAGED_PATHS } from '../src/lib/release-verify.js';
import { verifyRelease } from '../src/commands/verify-release.js';

async function captureConsole(fn) {
  const calls = { stdout: '', stderr: '' };
  const origLog = console.log;
  const origErr = console.error;

  console.log = (...args) => {
    calls.stdout += `${args.join(' ')}\n`;
  };
  console.error = (...args) => {
    calls.stderr += `${args.join(' ')}\n`;
  };

  try {
    const status = await fn();
    return { status, ...calls };
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

test('runReleaseVerify passes when tests pass and pack contains required docs', async () => {
  const calls = [];
  const result = await runReleaseVerify({
    cwd: '/tmp/example',
    runner(command, args) {
      calls.push([command, ...args].join(' '));
      if (args[0] === 'src/cli.js') {
        return { ok: true, exitCode: 0, stdout: 'company-cc — AI coding harness installer', stderr: '' };
      }
      if (args[0] === 'test') {
        return { ok: true, exitCode: 0, stdout: 'TAP version 13', stderr: '' };
      }
      return {
        ok: true,
        exitCode: 0,
        stdout: JSON.stringify([{
          name: '@company/claude-code-setting',
          version: '0.6.0',
          filename: 'company-claude-code-setting-0.6.0.tgz',
          entryCount: 42,
          files: REQUIRED_PACKAGED_PATHS.map((path) => ({ path })),
        }]),
        stderr: '',
      };
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.summary.failedSteps, []);
  assert.equal(result.package.filename, 'company-claude-code-setting-0.6.0.tgz');
  assert.equal(result.package.missingRequiredPaths.length, 0);
  assert.deepEqual(calls, [`${process.execPath} src/cli.js --help`, 'npm test --silent', 'npm pack --dry-run --json']);
});

test('runReleaseVerify fails when tarball misses required docs', async () => {
  const result = await runReleaseVerify({
    runner(_command, args) {
      if (args[0] === 'src/cli.js') {
        return { ok: true, exitCode: 0, stdout: 'company-cc — AI coding harness installer', stderr: '' };
      }
      if (args[0] === 'test') {
        return { ok: true, exitCode: 0, stdout: 'ok', stderr: '' };
      }
      return {
        ok: true,
        exitCode: 0,
        stdout: JSON.stringify([{
          name: '@company/claude-code-setting',
          version: '0.6.0',
          filename: 'company-claude-code-setting-0.6.0.tgz',
          files: [{ path: 'README.md' }],
        }]),
        stderr: '',
      };
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.summary.failedSteps, ['pack']);
  const packStep = result.steps.find((step) => step.name === 'pack');
  assert.ok(packStep);
  assert.match(packStep.summary, /missing required packaged docs/);
});

test('verifyRelease --json returns structured payload and non-zero on failure', async () => {
  const res = await captureConsole(() => verifyRelease({ json: true }, {
    runReleaseVerify: async () => ({
      ok: false,
      command: 'verify-release',
      cwd: '/tmp/project',
      steps: [{ name: 'tests', ok: false, exitCode: 1, summary: 'test suite failed' }],
      package: null,
      summary: { stepCount: 1, failedSteps: ['tests'] },
    }),
  }));

  assert.equal(res.status, 1);
  const payload = JSON.parse(res.stdout);
  assert.equal(payload.command, 'verify-release');
  assert.equal(payload.ok, false);
  assert.deepEqual(payload.summary.failedSteps, ['tests']);
});

test('verifyRelease text mode renders step summaries', async () => {
  const res = await captureConsole(() => verifyRelease({}, {
    runReleaseVerify: async () => ({
      ok: true,
      command: 'verify-release',
      cwd: '/tmp/project',
      steps: [
        { name: 'cli-help', ok: true, exitCode: 0, summary: 'CLI help entrypoint responded' },
        { name: 'tests', ok: true, exitCode: 0, summary: 'test suite passed' },
        { name: 'pack', ok: true, exitCode: 0, summary: 'tarball contains 42 files' },
      ],
      package: { filename: 'company-claude-code-setting-0.6.0.tgz', entryCount: 42 },
      summary: { stepCount: 3, failedSteps: [] },
    }),
  }));

  assert.equal(res.status, 0);
  assert.match(res.stdout, /Verify release/);
  assert.match(res.stdout, /cli-help — CLI help entrypoint responded/);
  assert.match(res.stdout, /tests — test suite passed/);
  assert.match(res.stdout, /pack — tarball contains 42 files/);
  assert.match(res.stdout, /package: company-claude-code-setting-0.6.0.tgz/);
});
