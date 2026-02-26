import * as SUT from '../../src/controllers/jobs';
import * as cache from '../../src/data/cache';
import * as landingsUpdater from '../../src/landings/landingsUpdater';
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

});