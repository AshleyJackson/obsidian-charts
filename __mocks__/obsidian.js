/**
 * Mock implementation for obsidian package
 * The obsidian npm package is type definitions only - no runtime
 * This mock provides minimal implementations for testing
 */

// Mock moment - minimal implementation for testing
const moment = (date) => {
  const d = date ? new Date(date) : new Date();
  const obj = {
    _date: d,
    format: (fmt) => d.toISOString(),
    isValid: () => !isNaN(d.getTime()),
    valueOf: () => d.valueOf(),
    add: (amount, unit) => {
      const newDate = new Date(d);
      if (unit === 'day') newDate.setDate(newDate.getDate() + amount);
      else if (unit === 'month') newDate.setMonth(newDate.getMonth() + amount);
      else if (unit === 'year') newDate.setFullYear(newDate.getFullYear() + amount);
      return moment(newDate);
    },
    diff: (other, unit) => {
      const diff = d.getTime() - other._date.getTime();
      if (unit === 'day') return diff / (1000 * 60 * 60 * 24);
      return diff;
    },
    startOf: (unit) => {
      const newDate = new Date(d);
      if (unit === 'day') {
        newDate.setHours(0, 0, 0, 0);
      } else if (unit === 'month') {
        newDate.setDate(1);
        newDate.setHours(0, 0, 0, 0);
      }
      return moment(newDate);
    },
    endOf: (unit) => {
      const newDate = new Date(d);
      if (unit === 'day') {
        newDate.setHours(23, 59, 59, 999);
      } else if (unit === 'month') {
        newDate.setMonth(newDate.getMonth() + 1);
        newDate.setDate(0);
        newDate.setHours(23, 59, 59, 999);
      }
      return moment(newDate);
    },
    isoWeekday: (day) => {
      const newDate = new Date(d);
      const currentDay = newDate.getDay();
      const diff = day - currentDay;
      newDate.setDate(newDate.getDate() + diff);
      return moment(newDate);
    }
  };
  return obj;
};

// Mock parseYaml - basic YAML parser
const parseYaml = jest.fn((content) => {
  // Simple YAML parsing for test purposes
  const lines = content.split('\n');
  const result = {};
  let currentKey = null;
  let currentArray = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Array item
    if (trimmed.startsWith('- ')) {
      if (currentArray) {
        const item = trimmed.slice(2).trim();
        // Check for key-value in array item
        const kvMatch = item.match(/^(\w+):\s*(.+)$/);
        if (kvMatch) {
          currentArray.push({ [kvMatch[1]]: parseValue(kvMatch[2]) });
        } else {
          currentArray.push(parseValue(item));
        }
      }
      continue;
    }
    
    // Key-value pair
    const match = trimmed.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (value === '' || value === '|' || value === '[') {
        // Multi-line value or array
        if (value === '[') {
          // Inline array - parse it
          result[key] = [];
        } else {
          currentKey = key;
          if (value === '|') {
            result[key] = '';
          } else {
            result[key] = [];
            currentArray = result[key];
          }
        }
      } else {
        result[key] = parseValue(value);
        currentKey = null;
        currentArray = null;
      }
    }
  }
  
  return result;
});

function parseValue(value) {
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  // Number
  const num = Number(value);
  if (!isNaN(num)) return num;
  // Array
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map(v => parseValue(v.trim()));
  }
  return value;
}

// Mock Notice class
class Notice {
  constructor(message) {
    console.log('Notice:', message);
  }
}

// Mock Plugin class
class Plugin {
  constructor(app) {
    this.app = app;
    this.settings = {};
  }
  
  async loadData() {
    return {};
  }
  
  async saveData(data) {
    Object.assign(this.settings, data);
  }
  
  addSettingTab() {}
  addCommand() {}
  registerMarkdownCodeBlockProcessor() {}
  registerEvent() {}
}

// Mock MarkdownView class
class MarkdownView {
  constructor() {}
}

// Mock Editor class
class Editor {
  constructor() {
    this._selection = '';
    this._content = '';
  }
  
  getSelection() {
    return this._selection;
  }
  
  replaceSelection(replacement) {
    this._selection = replacement;
  }
  
  setSelection(selection) {
    this._selection = selection;
  }
}

// Mock View class
class View {}

// Mock Menu class
class Menu {
  addItem(callback) {
    return this;
  }
}

// Mock TFile class
class TFile {
  constructor(path) {
    this.path = path;
    this.basename = path?.split('/').pop()?.replace(/\.[^.]+$/, '');
  }
}

// Mock MarkdownPostProcessorContext
class MarkdownPostProcessorContext {
  constructor() {
    this.sourcePath = 'test.md';
  }
}

// Mock Modal class
class Modal {
  constructor(app) {
    this.app = app;
  }
  
  open() {}
  close() {}
}

// Mock PluginSettingTab class
class PluginSettingTab {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
  }
}

// Mock MarkdownRenderChild
class MarkdownRenderChild {
  constructor(el) {
    this.el = el;
  }
  
  onload() {}
  onunload() {}
}

// Mock App class
class App {
  constructor() {
    this.workspace = {
      activeLeaf: null,
      onLayoutReady: (cb) => cb(),
      on: () => {},
      off: () => {}
    };
    this.vault = {
      getAbstractFileByPath: () => null,
      cachedRead: async () => '',
      createBinary: async () => new TFile('test.png')
    };
    this.metadataCache = {
      getFileCache: () => null,
      getFirstLinkpathDest: () => null,
      on: () => {},
      off: () => {}
    };
    this.fileManager = {
      generateMarkdownLink: (file, path) => `![[${file.path}]]`
    };
  }
}

module.exports = {
  moment,
  parseYaml,
  Notice,
  Plugin,
  PluginSettingTab,
  Modal,
  MarkdownView,
  Editor,
  View,
  Menu,
  TFile,
  MarkdownPostProcessorContext,
  MarkdownRenderChild,
  App
};
