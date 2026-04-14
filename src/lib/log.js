import pc from 'picocolors';

export const log = {
  info: (msg) => console.log(pc.cyan('›'), msg),
  ok: (msg) => console.log(pc.green('✓'), msg),
  warn: (msg) => console.log(pc.yellow('!'), msg),
  error: (msg) => console.error(pc.red('✗'), msg),
  step: (msg) => console.log(pc.bold(pc.cyan(`\n${msg}`))),
  dim: (msg) => console.log(pc.dim(msg)),
};
