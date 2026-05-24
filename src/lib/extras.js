import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { TEMPLATES_ROOT } from './template.js';
import { resolveSkillNames } from './skills.js';
import { log } from './log.js';

export async function resolveExtras(extrasFlag) {
  const skillsDir = join(TEMPLATES_ROOT, 'extra', 'skills');
  if (!existsSync(skillsDir)) {
    log.warn('extras directory not found in package, skipping');
    return null;
  }

  if (extrasFlag === '' || extrasFlag === false) return [];

  let selection;
  if (extrasFlag === undefined || extrasFlag === null || extrasFlag === true) {
    selection = 'core';
  } else if (extrasFlag === 'all') {
    selection = true;
  } else {
    selection = extrasFlag;
  }

  return resolveSkillNames(selection, skillsDir);
}
