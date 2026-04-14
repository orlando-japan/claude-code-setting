import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export function hashBuffer(buf) {
  return 'sha256:' + createHash('sha256').update(buf).digest('hex');
}

export async function hashFile(path) {
  return hashBuffer(await readFile(path));
}
