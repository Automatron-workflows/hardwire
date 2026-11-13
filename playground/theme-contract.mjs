// A contract for the one reversible operation owned by this demonstration.
// Each caller gets independent data, so callers cannot mutate the reviewed copy.
export function themePanel() {
  return {
    panel: 'hardwire.panel/1',
    origin: 'https://automatron-workflows.github.io',
    revision: 'theme-demo/1',
    ports: [{
      id: 'set-theme', kind: 'write', reversible: true, confirmation: 'none',
      summary: 'Change the theme of this demo tab.',
      parameters: {
        properties: { theme: { type: 'string', enum: ['light', 'dark'] } },
        required: ['theme'],
      },
    }],
  };
}
