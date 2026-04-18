/**
 * Mock for chartjs-plugin-annotation v3 module
 * v3 exports a plugin object with id, defaults, and lifecycle hooks
 */

const annotationPlugin = {
  id: 'annotation',
  version: '3.1.0',
  defaults: {
    annotations: {},
    common: {},
  },
  beforeRegister: jest.fn(),
  afterRegister: jest.fn(),
  afterUnregister: jest.fn(),
  beforeInit: jest.fn(),
  beforeUpdate: jest.fn(),
  afterDataLimits: jest.fn(),
  afterUpdate: jest.fn(),
  beforeDatasetsDraw: jest.fn(),
  afterDatasetsDraw: jest.fn(),
  beforeDatasetDraw: jest.fn(),
  beforeDraw: jest.fn(),
  afterDraw: jest.fn(),
  beforeEvent: jest.fn(),
  afterDestroy: jest.fn(),
  getAnnotations: jest.fn().mockReturnValue({}),
  descriptors: { _scriptable: true },
  additionalOptionScopes: [],
};

module.exports = annotationPlugin;
