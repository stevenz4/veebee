// Read-only handles for automated checks (Playwright scripts) and the browser console: window.__veebee.
const handles: Record<string, unknown> = {};
Object.assign(window, { __veebee: handles });

export function expose(name: string, value: unknown) {
  handles[name] = value;
}
