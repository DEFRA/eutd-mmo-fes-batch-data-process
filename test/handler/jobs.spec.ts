import * as Controller from '../../src/controllers/jobs';
import * as Hapi from '@hapi/hapi';
import logger from '../../src/logger';
import * as Cache from '../../src/data/cache';

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

  const { jobsRoutes } = require('../../src/handler/jobs');

  server = Hapi.server({
    port: 9018,
    host: 'localhost'
  });

  jobsRoutes(server);

  await server.initialize();
  await server.start();
});

afterEach(() => {
  mockTrackEvent.mockReset();
});

afterAll(async () => {
  await server.stop();
});

describe('scheduled jobs handler', () => {

  describe('routes', () => {

    let mockLoggerInfo;
    let mockLoggerError;
		let mockRunLandingsAndReporting;
    let mockLoadFishCountriesAndSpecies;
    let mockLoadExporterBehaviour;

    beforeEach(() => {
      mockLoggerInfo = jest.spyOn(logger, 'info');
      mockLoggerError = jest.spyOn(logger, 'error');
			mockRunLandingsAndReporting = jest.spyOn(Controller, 'runLandingsAndReportingJob');
      mockLoadFishCountriesAndSpecies = jest.spyOn(Cache, 'loadFishCountriesAndSpecies');
      mockLoadFishCountriesAndSpecies.mockResolvedValue(undefined);
      mockLoadExporterBehaviour = jest.spyOn(Cache, 'loadExporterBehaviour');
      mockLoadExporterBehaviour.mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('POST /v1/jobs/landings', () => {

      it('will log success', async () => {
				mockRunLandingsAndReporting.mockResolvedValue(null);

        const req = {
          method: 'POST',
          url: '/v1/jobs/landings',
        };

        await server.inject(req);

				expect(mockLoggerInfo).toHaveBeenCalledWith('[SCHEDULED-JOBS][LANDINGS-AND-REPORTING][START]');
				expect(mockLoggerInfo).toHaveBeenCalledWith(`[SCHEDULED-JOBS][LANDINGS-AND-REPORTING][SUCCESS]`);
			});

      it('will log failure', async () => {
				const error = new Error('testing');

				mockRunLandingsAndReporting.mockRejectedValue(error);

        const req = {
          method: 'POST',
          url: '/v1/jobs/landings',
        };

				await server.inject(req);

				expect(mockLoggerInfo).toHaveBeenCalledWith('[SCHEDULED-JOBS][LANDINGS-AND-REPORTING][START]');
				expect(mockLoggerError).toHaveBeenCalledWith(`[SCHEDULED-JOBS][LANDINGS-AND-REPORTING][ERROR][${error}]`);
      });

      it('will always return a status of 200 to acknowledge the request', async () => {
				const error = new Error('testing');

				mockRunLandingsAndReporting.mockRejectedValue(error);

        const req = {
          method: 'POST',
          url: '/v1/jobs/landings',
        };

				const response = await server.inject(req);

        expect(response.statusCode).toBe(200);
				expect(mockRunLandingsAndReporting).toHaveBeenCalled();
			});

      it('will track an event in app insights if an error is thrown', async () => {
        const error = new Error('testing');

				mockRunLandingsAndReporting.mockRejectedValue(error);

        const req = {
          method: 'POST',
          url: '/v1/jobs/landings',
        };

				await server.inject(req);

        expect(mockTrackEvent).toHaveBeenCalledWith({name: '[SCHEDULED-JOBS][LANDINGS-AND-REPORTING][ERROR]', properties: {error: error.stack}});
      });

      it('will track an event in app insights if the job is rejected', async () => {
        mockRunLandingsAndReporting.mockRejectedValue('an error');

        const req = {
          method: 'POST',
          url: '/v1/jobs/landings',
        };

				await server.inject(req);

        expect(mockTrackEvent).toHaveBeenCalledWith({name: '[SCHEDULED-JOBS][LANDINGS-AND-REPORTING][ERROR]', properties: {error: 'an error'}});
      });

      it('will not track an event in app insights if an error is not thrown', async () => {
        mockRunLandingsAndReporting.mockResolvedValue(null);

        const req = {
          method: 'POST',
          url: '/v1/jobs/landings',
        };

        await server.inject(req);

        expect(mockTrackEvent).not.toHaveBeenCalled();
      });

		});

    describe('POST /v1/jobs/purge', () => {
    
      it('will always return a status of 200 to acknowledge the request', async () => {
        const req = {
          method: 'POST',
          url: '/v1/jobs/purge',
        };
    
        const response = await server.inject(req);
    
        expect(mockLoggerInfo).toHaveBeenCalledWith('[LOAD-FISH-COUNTRIES-SPECIES][POST][START]');
        expect(mockLoadFishCountriesAndSpecies).toHaveBeenCalled()
        expect(mockLoggerInfo).toHaveBeenCalledWith('[LOAD-FISH-COUNTRIES-SPECIES][POST][SUCCESS]');
        expect(response.statusCode).toBe(200);
      });
    
      it('will return a status of 500 if something goes wrong when trying to load data', async () => {
        mockLoadFishCountriesAndSpecies.mockRejectedValue(new Error('something has gone wrong'));
    
        const req = {
          method: 'POST',
          url: '/v1/jobs/purge',
        }
    
        const response = await server.inject(req);
    
        expect(mockLoggerError).toHaveBeenCalled();
    
        expect(response.statusCode).toBe(500);
      });
    
    });

	});

});