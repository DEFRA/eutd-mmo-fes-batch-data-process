import Logger from 'bunyan';

describe('logger', () => {
  const OLD_ENV = process.env;
  let mockCreateLogger: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    mockCreateLogger = jest.spyOn(Logger, 'createLogger');
  });

  afterEach(() => {
    process.env = OLD_ENV;
    mockCreateLogger.mockRestore();
  });

  it('will log with WEBSITE_NAME', () => {
    process.env.WEBSITE_NAME = 'WEBSITE_NAME';

    const logger = require('../src/logger').default;
    expect(logger.fatal()).toBe(false);
  });

  it('will log without WEBSITE_NAME', () => {
    const logger = require('../src/logger').default;
    expect(logger.fatal()).toBe(false);
  });
});