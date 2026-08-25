export type AppMode = 'demo' | 'showcase' | 'preview';

export function parseAppMode(value: string | undefined): AppMode {
  if (value === 'showcase' || value === 'preview') return value;
  return 'demo';
}

export function isSyntheticMode(mode: AppMode): boolean {
  return mode !== 'preview';
}
