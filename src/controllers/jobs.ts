import { refreshRiskingData } from '../data/cache';
import { landingsAndReportingCron, exceeding14DayLandingsAndReportingCron, resetLandingStatusJob, resubmitCCToTrade } from "../landings/landingsUpdater";
import logger from "../logger";

export const runLandingsAndReportingJob = async (): Promise<void> => {
  logger.info('[RUN-LANDINGS-AND-REPORTING-JOB][START]');

  logger.info('[RUN-LANDINGS-AND-REPORTING-JOB][REFRESH-RISKING-DATA]');
  await refreshRiskingData()
    .catch(e => logger.error(`[RUN-LANDINGS-AND-REPORTING-JOB][REFRESH-RISKING-DATA][ERROR][${e}]`));

  logger.info('[RUN-LANDINGS-AND-REPORTING-JOB][REPROCESS-LANDINGS]');
  await resetLandingStatusJob()
    .catch(e => logger.error(`[RUN-LANDINGS-AND-REPORTING-JOB][REPROCESS-LANDINGS][ERROR][${e}]`));

  logger.info('[RUN-LANDINGS-AND-REPORTING-JOB][LANDINGS-AND-REPORTING-CRON]');
  await landingsAndReportingCron()
    .catch(e => logger.error(`[RUN-LANDINGS-AND-REPORTING-JOB][LANDINGS-AND-REPORTING-CRON][ERROR][${e}]`));

  logger.info('[RUN-LANDINGS-AND-REPORTING-JOB][EXCEEDING-14-DAY-LANDINGS-AND-REPORTING-CRON]');
  await exceeding14DayLandingsAndReportingCron()
    .catch(e => logger.error(`[RUN-LANDINGS-AND-REPORTING-JOB][EXCEEDING-14-DAY-LANDINGS-AND-REPORTING-CRON][ERROR][${e}]`));

  await resubmitCCToTrade()
    .catch(e => logger.error(`[RESUBMIT-CC-TO-TRADE][FAILED-TRADE-CC][ERROR][${e}]`));

  logger.info('[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS]');
}