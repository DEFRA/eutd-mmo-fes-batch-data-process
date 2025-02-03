import * as Hapi from '@hapi/hapi';

let server;
const mockTrackEvent = jest.fn();

beforeAll(async () => {
  jest.mock('applicationinsights', () => {
    return {
      defaultClient: {
        trackEvent: mockTrackEvent
      }
    }
  });

  const { staticRoutesWithoutAuth } = require('../../src/handler/static-routes');

  server = Hapi.server({
    port: 9019,
    host: 'localhost'
  });

  staticRoutesWithoutAuth(server);

  await server.initialize();
  await server.start();
});

afterEach(() => {
  mockTrackEvent.mockReset();
});

afterAll(async () => {
  await server.stop();
});

describe("Routes", () => {

  it('should GET /', async () => {
    const response = await server.inject({
      url: '/'
    });

    expect(response.statusCode).toBe(200);
  });

  it('should GET /health', async () => {
    const response = await server.inject({
      url: '/health'
    });
    expect(response.statusCode).toBe(200);
  });

});