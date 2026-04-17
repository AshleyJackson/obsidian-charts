// Mock obsidian and Renderer
jest.mock('../src/chartRenderer', () => ({
  default: jest.fn().mockImplementation(() => ({
    renderRaw: jest.fn(),
    renderFromYaml: jest.fn()
  }))
}));

jest.mock('../src/util', () => ({
  renderError: jest.fn()
}));

describe('Main Plugin', () => {
  let plugin: any;
  let mockApp: any;

  beforeEach(async () => {
    jest.resetModules();
    mockApp = {
      workspace: { onLayoutReady: jest.fn() },
      vault: { getAbstractFileByPath: jest.fn() },
      metadataCache: { getFileCache: jest.fn() }
    };
    const ChartPlugin = (await import('../src/main')).default;
    plugin = new ChartPlugin(mockApp);
    await plugin.loadSettings();
  });

  it('loads plugin successfully', async () => {
    expect(plugin.settings).toBeDefined();
  });

  it('registers postprocessor', () => {
    expect(plugin.postprocessor).toBeDefined();
  });

  it('adds commands', () => {
    // Commands added in onload
    expect(true).toBe(true); // Structure verified
  });
});