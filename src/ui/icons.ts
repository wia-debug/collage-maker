const files = import.meta.glob('../assets/icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const map: Record<string, string> = {};
for (const [path, svg] of Object.entries(files)) {
  map[path.split('/').pop()!.replace('.svg', '')] = svg;
}

export const ICON_NAMES = Object.keys(map);

export function iconSvg(name: string): string | undefined {
  return map[name];
}
