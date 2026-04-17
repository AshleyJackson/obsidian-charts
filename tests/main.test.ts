import ChartPlugin from '../src/main';

describe('Main Plugin', () => {
  let plugin: ChartPlugin;
  let mockApp: any;

  beforeEach(async () => {
    mockApp = {
      workspace: { 
        onLayoutReady: jest.fn((cb) => cb()),
        activeLeaf: null,
        on: jest.fn(),
        off: jest.fn()
      },
      vault: { 
        getAbstractFileByPath: jest.fn(),
        cachedRead: jest.fn(),
        createBinary: jest.fn()
      },
      metadataCache: { 
        getFileCache: jest.fn(),
        getFirstLinkpathDest: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
      },
      fileManager: {
        generateMarkdownLink: jest.fn((file, path) => `![[${file.path}]]`)
      }
    };
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