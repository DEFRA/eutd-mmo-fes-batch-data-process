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
    let mockRunCatchSubmissionStats;

    beforeEach(() => {
      mockLoggerInfo = jest.spyOn(logger, 'info');
      mockLoggerError = jest.spyOn(logger, 'error');
			mockRunLandingsAndReporting = jest.spyOn(Controller, 'runLandingsAndReportingJob');
      mockLoadFishCountriesAndSpecies = jest.spyOn(Cache, 'loadFishCountriesAndSpecies');
      mockLoadFishCountriesAndSpecies.mockResolvedValue(undefined);
      mockLoadExporterBehaviour = jest.spyOn(Cache, 'loadExporterBehaviour');
      mockLoadExporterBehaviour.mockResolvedValue(undefined);
      mockRunCatchSubmissionStats = jest.spyOn(Controller, 'runCatchSubmissionStats');
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

    describe('GET /v1/jobs/eu-submission-report', () => {

      const validQuery = 'documentType=catchCert&dateFrom=2025-01-01&dateTo=2025-03-01';

      it('returns 200 and the result from runCatchSubmissionStats on a valid request', async () => {
        const mockResult = { documentType: 'catchCert', successCount: 42, failureCount: 0, failures: [] };
        mockRunCatchSubmissionStats.mockResolvedValue(mockResult);

        const response = await server.inject({ method: 'GET', url: `/v1/jobs/eu-submission-report?${validQuery}` });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload)).toEqual(mockResult);
      });

      it('calls runCatchSubmissionStats with the correct arguments', async () => {
        mockRunCatchSubmissionStats.mockResolvedValue({});

        await server.inject({ method: 'GET', url: `/v1/jobs/eu-submission-report?${validQuery}` });

        expect(mockRunCatchSubmissionStats).toHaveBeenCalledWith('catchCert', '2025-01-01T00:00:00.000Z', '2025-03-01T00:00:00.000Z');
      });

      it('logs start and success info messages on a valid request', async () => {
        mockRunCatchSubmissionStats.mockResolvedValue({});

        await server.inject({ method: 'GET', url: `/v1/jobs/eu-submission-report?${validQuery}` });

        expect(mockLoggerInfo).toHaveBeenCalledWith('[EU-SUBMISSION-REPORT][GET][START] documentType=catchCert dateFrom=2025-01-01T00:00:00.000Z dateTo=2025-03-01T00:00:00.000Z');
        expect(mockLoggerInfo).toHaveBeenCalledWith('[EU-SUBMISSION-REPORT][GET][SUCCESS]');
      });

      it('returns 500 and logs an error when runCatchSubmissionStats throws', async () => {
        const error = new Error('db failure');
        mockRunCatchSubmissionStats.mockRejectedValue(error);

        const response = await server.inject({ method: 'GET', url: `/v1/jobs/eu-submission-report?${validQuery}` });

        expect(response.statusCode).toBe(500);
        expect(mockLoggerError).toHaveBeenCalledWith({ err: error }, `[EU-SUBMISSION-REPORT][GET][ERROR] ${error}`);
      });

      it('returns 400 when documentType is not one of the allowed values', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/v1/jobs/eu-submission-report?documentType=invalidType&dateFrom=2025-01-01&dateTo=2025-03-01',
        });

        expect(response.statusCode).toBe(400);
      });

      it('returns 400 when documentType is missing', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/v1/jobs/eu-submission-report?dateFrom=2025-01-01&dateTo=2025-03-01',
        });

        expect(response.statusCode).toBe(400);
      });

      it('returns 400 when dateFrom is not a valid ISO date', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/v1/jobs/eu-submission-report?documentType=catchCert&dateFrom=not-a-date&dateTo=2025-03-01',
        });

        expect(response.statusCode).toBe(400);
      });

      it('returns 400 when dateFrom is missing', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/v1/jobs/eu-submission-report?documentType=catchCert&dateTo=2025-03-01',
        });

        expect(response.statusCode).toBe(400);
      });

      it('returns 400 when dateTo is not a valid ISO date', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/v1/jobs/eu-submission-report?documentType=catchCert&dateFrom=2025-01-01&dateTo=not-a-date',
        });

        expect(response.statusCode).toBe(400);
      });

      it('returns 400 when dateTo is missing', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/v1/jobs/eu-submission-report?documentType=catchCert&dateFrom=2025-01-01',
        });

        expect(response.statusCode).toBe(400);
      });

      it('returns 400 when dateTo is earlier than dateFrom', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/v1/jobs/eu-submission-report?documentType=catchCert&dateFrom=2025-03-01&dateTo=2025-01-01',
        });

        expect(response.statusCode).toBe(400);
      });

      it('accepts processingStatement as a valid documentType', async () => {
        mockRunCatchSubmissionStats.mockResolvedValue({});

        const response = await server.inject({
          method: 'GET',
          url: '/v1/jobs/eu-submission-report?documentType=processingStatement&dateFrom=2025-01-01&dateTo=2025-03-01',
        });

        expect(response.statusCode).toBe(200);
        expect(mockRunCatchSubmissionStats).toHaveBeenCalledWith('processingStatement', '2025-01-01T00:00:00.000Z', '2025-03-01T00:00:00.000Z');
      });

      it('accepts storageDocument as a valid documentType', async () => {
        mockRunCatchSubmissionStats.mockResolvedValue({});

        const response = await server.inject({
          method: 'GET',
          url: '/v1/jobs/eu-submission-report?documentType=storageDocument&dateFrom=2025-01-01&dateTo=2025-03-01',
        });

        expect(response.statusCode).toBe(200);
        expect(mockRunCatchSubmissionStats).toHaveBeenCalledWith('storageDocument', '2025-01-01T00:00:00.000Z', '2025-03-01T00:00:00.000Z');
      });

      it('accepts dateTo equal to dateFrom', async () => {
        mockRunCatchSubmissionStats.mockResolvedValue({});

        const response = await server.inject({
          method: 'GET',
          url: '/v1/jobs/eu-submission-report?documentType=catchCert&dateFrom=2025-01-01&dateTo=2025-01-01',
        });

        expect(response.statusCode).toBe(200);
      });

    });

	});

});
