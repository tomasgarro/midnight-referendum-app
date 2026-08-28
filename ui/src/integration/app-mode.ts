export type AppMode = 'demo' | 'showcase' | 'preview' | 'undeployed';

export function parseAppMode(value: string | undefined): AppMode {
  if (value === 'showcase' || value === 'preview' || value === 'undeployed') return value;
  return 'demo';
}

/**
 * Build modes that intentionally own the runtime boundary take precedence over
 * a copied environment file. This keeps `vite build --mode showcase` from
 * silently producing the generic demo shell.
 */
export function resolveAppMode(
  viteMode: string | undefined,
  configuredMode: string | undefined,
): AppMode {
  if (viteMode === 'showcase' || viteMode === 'undeployed') return viteMode;
  if (viteMode === 'demo') return 'demo';
  return parseAppMode(configuredMode);
}

export function isSyntheticMode(mode: AppMode): boolean {
  return mode !== 'preview';
}
