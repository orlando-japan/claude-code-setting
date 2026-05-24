export const REQUIRED_PROJECT_SECTIONS = {
  claude: [
    { prefix: '## 1.', label: 'What this project is' },
    { prefix: '## 2.', label: 'How to run and verify' },
    { prefix: '## 4.', label: 'Current priorities' },
    { prefix: '## 6.', label: 'Guardrails / do-not-touch' },
  ],
  codex: [
    { prefix: '## 1.', label: 'What this project is' },
    { prefix: '## 2.', label: 'How to run and verify' },
    { prefix: '## 3.', label: 'Important paths' },
    { prefix: '## 4.', label: 'Current priorities' },
    { prefix: '## 6.', label: 'Guardrails / do-not-touch' },
  ],
};

export function getRequiredProjectSections(target, customTargets = {}) {
  return customTargets[target]?.requiredProjectSections ?? REQUIRED_PROJECT_SECTIONS[target] ?? [];
}

export function findMissingProjectSections(content, target, customTargets = {}) {
  const required = getRequiredProjectSections(target, customTargets);
  const lines = content.split('\n');
  return required.filter(({ prefix }) => !lines.some(line => line.startsWith(prefix)));
}
