import { execFile } from 'node:child_process';
import { loadTemplateState, removeTemplateFromState } from './state.js';
import { getTemplate } from './templates.js';

export interface UninstallResult {
  template: string;
  removed: string[];
  failed: string[];
  skipped: string[];
}

function removeNixPackage(nixPackage: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('nix', ['profile', 'remove', nixPackage], { encoding: 'utf-8' }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function uninstallTemplate(templateName: string): Promise<UninstallResult> {
  const result: UninstallResult = { template: templateName, removed: [], failed: [], skipped: [] };

  const manifest = getTemplate(templateName);
  if (!manifest) return result;

  const { templates } = loadTemplateState();
  const installed = templates[templateName];
  if (!installed) return result;

  for (const dep of manifest.dependencies) {
    const { nixPackage } = dep;
    if (!installed.dependencies[nixPackage]) {
      result.skipped.push(nixPackage);
      continue;
    }
    try {
      await removeNixPackage(nixPackage);
      result.removed.push(nixPackage);
    } catch {
      result.failed.push(nixPackage);
    }
  }

  removeTemplateFromState(templateName);
  return result;
}
