import * as SUT from '../../src/controllers/jobs';
import * as cache from '../../src/data/cache';
import * as landingsUpdater from '../../src/landings/landingsUpdater';
import * as catchCertsPersistence from '../../src/persistence/catchCerts';
import logger from '../../src/logger';

describe('scheduled jobs controller', () => {

  let mockLoggerInfo;
  let mockLoggerError;

  beforeEach(() => {
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('runLandingsAndReportingJob', () => {

    let mockRefreshRisking;
    let mockRunJob;
    let mockRunExceeding14DayLandingsJob;
    let mockCurrentTime;
    let mockResetLandingStatusJob;
    let mockresubmitSdToTrade;


    beforeEach(() => {
      mockRefreshRisking = jest.spyOn(cache, 'refreshRiskingData');
      mockRunJob = jest.spyOn(landingsUpdater, 'landingsAndReportingCron');
      mockRunExceeding14DayLandingsJob = jest.spyOn(landingsUpdater, 'exceeding14DayLandingsAndReportingCron');
      mockResetLandingStatusJob = jest.spyOn(landingsUpdater, 'resetLandingStatusJob');
      mockresubmitSdToTrade = jest.spyOn(landingsUpdater, 'resubmitSdToTrade');


      mockRefreshRisking.mockResolvedValue(null);
      mockResetLandingStatusJob.mockResolvedValue(null);
      mockRunJob.mockResolvedValue(null);
      mockRunExceeding14DayLandingsJob.mockResolvedValue(null);
      mockResetLandingStatusJob.mockResolvedValue(null);
      mockresubmitSdToTrade.mockResolvedValue(null);


      mockCurrentTime = jest.spyOn(Date, 'now').mockImplementation(() => 1693751375000); // Sunday, September 3, 2023 2:29:35 PM
    });

    afterEach(() => {
      mockRefreshRisking.mockRestore();
      mockRunJob.mockRestore();
      mockRunExceeding14DayLandingsJob.mockRestore();
      mockCurrentTime.mockRestore();
      mockResetLandingStatusJob.mockRestore();
      mockresubmitSdToTrade.mockRestore();
    });

    it('will invoke the landings updater', async () => {
      await SUT.runLandingsAndReportingJob();

      expect(mockRefreshRisking).toHaveBeenCalled();
      expect(mockRunJob).toHaveBeenCalled();
      expect(mockRunExceeding14DayLandingsJob).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][START]');
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS]');
    });

    it('will invoke the reset landing data job', async () => {
      await SUT.runLandingsAndReportingJob();

      expect(mockResetLandingStatusJob).toHaveBeenCalled();
      expect(mockRunJob).toHaveBeenCalled();
      expect(mockRunExceeding14DayLandingsJob).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][START]');
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS]');
    });

    it('will catch any errors from landings cron', async () => {
      const error = new Error('testing 123');

      mockRunJob.mockRejectedValue(error);

      await expect(SUT.runLandingsAndReportingJob()).resolves.toBe(undefined);

      expect(mockRunJob).toHaveBeenCalled();
      expect(mockRunExceeding14DayLandingsJob).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][START]');
      expect(mockLoggerError).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][LANDINGS-AND-REPORTING-CRON][ERROR][Error: testing 123]');
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS]');
    });

    it('will catch any errors from unreported landings cron', async () => {
      const error = new Error('testing 123');

      mockRunExceeding14DayLandingsJob.mockRejectedValue(error);

      await expect(SUT.runLandingsAndReportingJob()).resolves.toBe(undefined);

      expect(mockRunJob).toHaveBeenCalled();
      expect(mockRunExceeding14DayLandingsJob).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][START]');
      expect(mockLoggerError).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][EXCEEDING-14-DAY-LANDINGS-AND-REPORTING-CRON][ERROR][Error: testing 123]');
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS]');
    });

    it('will catch errors from refreshing risking data', async () => {
      const error = new Error('testing 123');

      mockRefreshRisking.mockRejectedValue(error);

      await expect(SUT.runLandingsAndReportingJob()).resolves.toBe(undefined);

      expect(mockRunJob).toHaveBeenCalled();
      expect(mockRunExceeding14DayLandingsJob).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][START]');
      expect(mockLoggerError).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][REFRESH-RISKING-DATA][ERROR][Error: testing 123]')
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS]');
    });

    it('will catch errors from reset landing data job', async () => {
      const error = new Error('testing 123');

      mockResetLandingStatusJob.mockRejectedValue(error);

      await expect(SUT.runLandingsAndReportingJob()).resolves.toBe(undefined);

      expect(mockRunJob).toHaveBeenCalled();
      expect(mockRunExceeding14DayLandingsJob).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][START]');
      expect(mockLoggerError).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][REPROCESS-LANDINGS][ERROR][Error: testing 123]')
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS]');
    });

    it('will not invoke the mockRunUnreportedLandingsJob on a Monday', async () => {
      mockCurrentTime = jest.spyOn(Date, 'now').mockImplementation(() => 1693837775000); // Monday, September 4, 2023 2:29:35 PM

      await SUT.runLandingsAndReportingJob();

      expect(mockRefreshRisking).toHaveBeenCalled();
      expect(mockRunJob).toHaveBeenCalled();
      expect(mockRunExceeding14DayLandingsJob).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][START]');
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS]');
    });

    it('will not invoke the mockRunUnreportedLandingsJob on a Tuesday', async () => {
      mockCurrentTime = jest.spyOn(Date, 'now').mockImplementation(() => 1693924175000); // Tuesday, September 5, 2023 2:29:35 PM

      await SUT.runLandingsAndReportingJob();

      expect(mockRefreshRisking).toHaveBeenCalled();
      expect(mockRunJob).toHaveBeenCalled();
      expect(mockRunExceeding14DayLandingsJob).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][START]');
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS]');
    });

    it('will not invoke the mockRunUnreportedLandingsJob on a Wednesday', async () => {
      mockCurrentTime = jest.spyOn(Date, 'now').mockImplementation(() => 1694010575000); // Wednesday, September 6, 2023 2:29:35 PM

      await SUT.runLandingsAndReportingJob();

      expect(mockRefreshRisking).toHaveBeenCalled();
      expect(mockRunJob).toHaveBeenCalled();
      expect(mockRunExceeding14DayLandingsJob).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][START]');
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS]');
    });

    it('will not invoke the mockRunUnreportedLandingsJob on a Thursday', async () => {
      mockCurrentTime = jest.spyOn(Date, 'now').mockImplementation(() => 1694096975000); // Thursday, September 7, 2023 2:29:35 PM

      await SUT.runLandingsAndReportingJob();

      expect(mockRefreshRisking).toHaveBeenCalled();
      expect(mockRunJob).toHaveBeenCalled();
      expect(mockRunExceeding14DayLandingsJob).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][START]');
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS]');
    });

    it('will not invoke the mockRunUnreportedLandingsJob on a Friday', async () => {
      mockCurrentTime = jest.spyOn(Date, 'now').mockImplementation(() => 1694183375000); // Friday, September 8, 2023 2:29:35 PM

      await SUT.runLandingsAndReportingJob();

      expect(mockRefreshRisking).toHaveBeenCalled();
      expect(mockRunJob).toHaveBeenCalled();
      expect(mockRunExceeding14DayLandingsJob).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][START]');
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS]');
    });

    it('will not invoke the mockRunUnreportedLandingsJob on a Saturday', async () => {
      mockCurrentTime = jest.spyOn(Date, 'now').mockImplementation(() => 1694269775000); // Saturday, September 9, 2023 2:29:35 PM

      await SUT.runLandingsAndReportingJob();

      expect(mockRefreshRisking).toHaveBeenCalled();
      expect(mockRunJob).toHaveBeenCalled();
      expect(mockRunExceeding14DayLandingsJob).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][START]');
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS]');
    });

    it('will invoke the Resubmit SD to Trade', async () => {
      await SUT.runLandingsAndReportingJob();

      expect(mockresubmitSdToTrade).toHaveBeenCalled();
      expect(mockRunJob).toHaveBeenCalled();
      expect(mockRunExceeding14DayLandingsJob).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][START]');
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS]');
    });

    it('will catch errors from Resubmit SD to Trade', async () => {
      const error = new Error('testing 123');

      mockresubmitSdToTrade.mockRejectedValue(error);

      await expect(SUT.runLandingsAndReportingJob()).resolves.toBe(undefined);

      expect(mockRunJob).toHaveBeenCalled();
      expect(mockRunExceeding14DayLandingsJob).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][START]');
      expect(mockLoggerError).toHaveBeenCalledWith('[RESUBMIT-SD-TO-TRADE][FAILED-TRADE-SD][ERROR][Error: testing 123]')
      expect(mockLoggerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS]');
    });

  });

  describe('runCatchSubmissionStats', () => {

    let mockGetCatchSubmissionStats: jest.SpyInstance;

    beforeEach(() => {
      mockGetCatchSubmissionStats = jest.spyOn(catchCertsPersistence, 'getCatchSubmissionStats');
    });

    afterEach(() => {
      mockGetCatchSubmissionStats.mockRestore();
    });

    it('returns correct counts and empty failures when there are only successes', async () => {
      mockGetCatchSubmissionStats.mockResolvedValue({
        successes: [{ documentNumber: 'GBR-2025-CC-001' }, { documentNumber: 'GBR-2025-CC-002', catchSubmission: { timestamp: '2025-02-01T08:00:00Z' }}],
        failures: []
      });

      const result = await SUT.runCatchSubmissionStats('catchCert', '2025-01-01', '2025-03-01');

      expect(result).toEqual({
        documentType: 'catchCert',
        dateFrom: '2025-01-01',
        dateTo: '2025-03-01',
        successCount: 2,
        successes: [
          {
            documentNumber: "GBR-2025-CC-001"
          },
          {
            documentNumber: "GBR-2025-CC-002",
            timestamp: "2025-02-01T08:00:00Z"
          }
        ],
        failureCount: 0,
        failures: []
      });
      expect(mockGetCatchSubmissionStats).toHaveBeenCalledWith('catchCert', '2025-01-01', '2025-03-01');
    });

    it('returns correct counts and mapped failures with all fields populated', async () => {
      const failureDoc = {
        documentNumber: 'GBR-2025-CC-ABC123',
        createdAt: new Date('2025-02-14T10:23:00Z'),
        catchSubmission: {
          faultCode: '400',
          faultString: 'Validation failed',
          validationErrors: [{ id: 'err1', field: 'weight', message: 'Weight must be greater than 0' }]
        }
      };

      mockGetCatchSubmissionStats.mockResolvedValue({
        successes: [],
        failures: [failureDoc]
      });

      const result = await SUT.runCatchSubmissionStats('catchCert', '2025-01-01', '2025-03-01');

      expect(result).toEqual({
        documentType: 'catchCert',
        dateFrom: '2025-01-01',
        dateTo: '2025-03-01',
        successCount: 0,
        successes: [],
        failureCount: 1,
        failures: [
          {
            documentNumber: 'GBR-2025-CC-ABC123',
            timestamp: '2025-02-14T10:23:00.000Z',
            code: '400',
            message: 'Validation failed',
            validationErrors: [{ id: 'err1', field: 'weight', message: 'Weight must be greater than 0' }]
          }
        ]
      });
    });

    it('returns validationErrors as empty array when not present on catchSubmission', async () => {
      const failureDoc = {
        documentNumber: 'GBR-2025-CC-XYZ',
        catchSubmission: {
          timestamp: '2025-02-01T08:00:00Z',
          code: '500',
          message: 'Internal server error'
        }
      };

      mockGetCatchSubmissionStats.mockResolvedValue({
        successes: [],
        failures: [failureDoc]
      });

      const result = await SUT.runCatchSubmissionStats('catchCert', '2025-01-01', '2025-03-01');

      expect(result.failures[0].validationErrors).toEqual([]);
    });

    it('returns undefined for optional fields when catchSubmission fields are absent', async () => {
      const failureDoc = {
        documentNumber: 'GBR-2025-CC-NODATA',
        catchSubmission: {}
      };

      mockGetCatchSubmissionStats.mockResolvedValue({
        successes: [],
        failures: [failureDoc]
      });

      const result = await SUT.runCatchSubmissionStats('catchCert', '2025-01-01', '2025-03-01');

      expect(result.failures[0]).toEqual({
        documentNumber: 'GBR-2025-CC-NODATA',
        timestamp: undefined,
        code: undefined,
        message: undefined,
        validationErrors: []
      });
    });

    it('returns correct successCount and failureCount with mixed results', async () => {
      mockGetCatchSubmissionStats.mockResolvedValue({
        successes: [
          { documentNumber: 'GBR-2025-CC-001' },
          { documentNumber: 'GBR-2025-CC-002' },
          { documentNumber: 'GBR-2025-CC-003' }
        ],
        failures: [
          { documentNumber: 'GBR-2025-CC-F01', catchSubmission: { timestamp: '2025-01-15T00:00:00Z', code: '422', message: 'Unprocessable', validationErrors: [] } },
          { documentNumber: 'GBR-2025-CC-F02', catchSubmission: { timestamp: '2025-01-20T00:00:00Z', code: '400', message: 'Bad request', validationErrors: [] } }
        ]
      });

      const result = await SUT.runCatchSubmissionStats('catchCert', '2025-01-01', '2025-03-01');

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(2);
      expect(result.failures).toHaveLength(2);
    });

    it('returns incomplete catch submissions', async () => {
      mockGetCatchSubmissionStats.mockResolvedValue({
        successes: [
          { documentNumber: 'GBR-2025-CC-001' },
          { documentNumber: 'GBR-2025-CC-002' },
          { documentNumber: 'GBR-2025-CC-003' }
        ],
        failures: [
          { documentNumber: 'GBR-2025-CC-F01', catchSubmission: undefined },
          { documentNumber: 'GBR-2025-CC-F02', catchSubmission: { timestamp: '2025-01-20T00:00:00Z', code: '400', message: 'Bad request', validationErrors: [] } }
        ]
      });

      const result = await SUT.runCatchSubmissionStats('catchCert', '2025-01-01', '2025-03-01');

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(2);
      expect(result.failures).toHaveLength(2);
    });

  });

});