import { log } from '../lib/log.js';
import { runReleaseVerify } from '../lib/release-verify.js';

export async function verifyRelease(flags, deps = {}) {
  const verifier = deps.runReleaseVerify ?? runReleaseVerify;
  const result = await verifier({ cwd: process.cwd() });

  if (flags.json) {
    console.log(JSON.stringify({
      ok: result.ok,
      command: result.command,
      cwd: result.cwd,
      steps: result.steps,
      package: result.package,
      summary: result.summary,
    }, null, 2));
    return result.ok ? 0 : 1;
  }

  log.step('Verify release');
  for (const step of result.steps) {
    if (step.ok) log.ok(`${step.name} — ${step.summary}`);
    else log.error(`${step.name} — ${step.summary}`);
  }

  if (result.package) {
    log.info(`package: ${result.package.filename} (${result.package.entryCount} files)`);
  }

  if (!result.ok && result.summary.failedSteps.length > 0) {
    log.warn(`failed steps: ${result.summary.failedSteps.join(', ')}`);
  }

  return result.ok ? 0 : 1;
}
