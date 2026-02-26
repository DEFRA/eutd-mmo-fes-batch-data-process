import moment from 'moment';
import { missingLandingRefreshQuery, exceedingLimitLandingQuery } from "../query/ccQuery";
import { getCatchCerts, getCertificateByDocumentNumber, upsertCertificate } from "../persistence/catchCerts";
import { reportExceeding14DaysLandings, reportNewLandings, processReports, resendSdToTrade } from "../services/report.service";
import { fetchRefereshLandings, updateConsolidateLandings } from '../services/landingConsolidate.service';
import { fetchAndProcessNewLandings } from './landingsRefresh';
import { getToLiveWeightFactor, loadLandingReprocessData, updateLandingReprocessData } from "../data/cache";
import {
  type ILanding,
  type ICcQueryResult,
  type Product,
  LandingStatus,
  mapLandingWithLandingStatus,
  ILandingQuery,
  IDocument,
  DocumentStatuses,
  postCodeToDa
} from 'mmo-shared-reference-data';
import logger from '../logger';
import appConfig from '../config';
import _ from 'lodash';
import { DocumentModel, IDocumentModel } from '../types/document';
import { FilterQuery } from 'mongoose';
import { ILandingQueryWithIsLegallyDue } from '../types/landing';
import { ISdPsQueryResult } from '../types/query';
import { sdpsQuery } from './query/sdpsQuery';

export const getMissingLandingsArray = async (queryTime: moment.Moment): Promise<ILandingQuery[]> => {
  const landingStatuses: LandingStatus[] = [LandingStatus.Pending];

  const catchCerts = await getCatchCerts({ landingStatuses });

  logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][NUMBER-CERTIFICATES-WITH-PENDING-LANDING: FOR-MISSING-LANDINGS][${catchCerts.length}]`);

  return missingLandingRefreshQuery(catchCerts, queryTime);
}

export const getExceedingLandingsArray = async (queryTime: moment.Moment): Promise<ICcQueryResult[]> => {
  const landingStatuses: LandingStatus[] = [LandingStatus.Pending];

  const catchCerts = await getCatchCerts({ landingStatuses });

  logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][NUMBER-CERTIFICATES-WITH-PENDING-LANDING: FOR-EXCEEDING-14-DAY-LIMIT-LANDINGS][${catchCerts.length}]`);

  return exceedingLimitLandingQuery(catchCerts, queryTime);
}

export const landingsAndReportingCron = async (): Promise<void> => {
  try {
    const landingsRefresh: ILandingQuery[] = await fetchRefereshLandings()
      .catch((e: Error) => {
        logger.error(`[RUN-LANDINGS-AND-REPORTING-JOB][OVERUSED-ELOG-DEMINMUS-LANDINGS][FAILED][${e.stack || e}]`)
        return [];
      });

    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][OVERUSED-ELOG-DEMINMUS-LANDINGS][${landingsRefresh.length}]`);

    const queryTime: moment.Moment = moment.utc();
    const missingLandings: ILandingQuery[] = await getMissingLandingsArray(queryTime);
    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS][${missingLandings.length}]`);

    const fetchLandings: ILandingQuery[] = landingsRefresh
      .concat(missingLandings)
      .reduce(
        (l: ILandingQuery[], cur: ILandingQuery) =>
          l.some((landing: ILandingQuery) => landing.dateLanded === cur.dateLanded && landing.rssNumber === cur.rssNumber) ? l : [...l, cur], []
      );

    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS-PLUS-OVERUSED-ELOG-DEMINMUS-LANDINGS][${fetchLandings.length}]`);

    const newLandings: ILanding[] = await fetchAndProcessNewLandings(fetchLandings);

    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][NEW-LANDINGS][${newLandings?.length}]`);

    if (newLandings?.length) {
      await reportNewLandings(newLandings, queryTime);
      await updateConsolidateLandings(newLandings);
    }
  } catch (e) {
    logger.error(`[RUN-LANDINGS-AND-REPORTING-JOB][LANDING-AND-REPORTING-CRON][ERROR][${e}]`);
  } finally {
    await processReports();
  }
}

export function uniquifyLandings(landingQuery: ILandingQueryWithIsLegallyDue[]): ILandingQueryWithIsLegallyDue[] {
  return landingQuery.reduce((landings: ILandingQueryWithIsLegallyDue[], landing: ILandingQueryWithIsLegallyDue) => {
    const hasLanding: ILandingQueryWithIsLegallyDue = landings.find((l: ILandingQueryWithIsLegallyDue) => _.isEqual(l, landing));
    if (hasLanding) {
      return landings;
    }

    return [...landings, landing]
  }, []);
}

export const exceeding14DayLandingsAndReportingCron = async (): Promise<void> => {
  try {
    const exceeding14DayLimitLandings: ICcQueryResult[] = await getExceedingLandingsArray(moment.utc());

    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][EXCEEDING-14-DAYS-LANDINGS][${exceeding14DayLimitLandings.length}]`);

    if (exceeding14DayLimitLandings.length) {
      await reportExceeding14DaysLandings(exceeding14DayLimitLandings);
    }

  } catch (e) {
    logger.error(`[RUN-LANDINGS-AND-REPORTING-JOB][EXCEEDING-14-DAYS-LANDINGS][ERROR][${e}]`);
  }
}

export const runUpdateForLandings = async (rawValidatedCertificates: ICcQueryResult[], documentNumber: string): Promise<void> => {
  const certificate = await getCertificateByDocumentNumber(documentNumber);
  const { exportData = {} } = certificate;

  logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][RUN-UPDATE-FOR-LANDINGS][${documentNumber}]`);
  if (exportData.products?.length) {
    rawValidatedCertificates
      .filter(c => c.documentNumber === documentNumber)
      .forEach((validation: ICcQueryResult) => {
        exportData.products = exportData.products.map((item: Product) => mapLandingWithLandingStatus(item, validation, getToLiveWeightFactor))
      });

    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][RUN-UPDATE-FOR-LANDINGS][UPSERT][${documentNumber}]`);
    await upsertCertificate(documentNumber, { exportData });
  }
}

export const resetLandingStatusJob = async (): Promise<void> => {
  try {
    if (!appConfig.runLandingReprocessingJob) return;
    const landings = await loadLandingReprocessData();
    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][REPROCESS-LANDINGS][NUMBER-LANDINGS-TO-REPROCESS][${landings.length}]`);
    const limit = appConfig.landingReprocessingLimit;
    let landingIds = landings.length > limit ? landings.slice(0, limit) : landings;
    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][REPROCESS-LANDINGS][NUMBER-LANDINGS-TO-REPROCESS-WITH-LIMIT][${landingIds.length}]`);

    if (landingIds.length === 0) return;
    const catchCerts: IDocument[] = await getCatchCerts({ landingIds });

    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][REPROCESS-LANDINGS][NUMBER-CERTIFICATES-WITH-LANDINGS-TO-REPROCESS][${catchCerts.length}]`);

    if (catchCerts.length) {
      for (const certificate of catchCerts) {
        const { exportData } = certificate;
        exportData.products.map((product) => {
          product.caughtBy.map(cb => {
            if (landingIds.includes(cb.id)) {
              cb._status = LandingStatus.Pending
            }
          })
        });
        await upsertCertificate(certificate.documentNumber, { exportData });
      }
      const unProcessedLandings = landings.filter(id => !landingIds.includes(id));
      logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][REPROCESS-LANDINGS][UPDATING-REPROCESS-FILE-FOR-NEXT-RUN][NUMBER-OF-UNPROCESSED-LANDINGS][${unProcessedLandings.length}]`);
      await updateLandingReprocessData(unProcessedLandings);
    } else {
      landingIds = [];
    }

    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][REPROCESS-LANDINGS][REPROCESS-FILE-UPDATED]`);
  } catch (e) {
    logger.error(`[RUN-LANDINGS-AND-REPORTING-JOB][REPROCESS-LANDINGS][ERROR][${e}]`);
  }
}

export const processResubmitSdToTrade = async (certsToUpdate: IDocument[]): Promise<void> => {
  for (const certToUpdate of certsToUpdate) {
    logger.info(`[RUN-RESUBMIT-SD-TRADE-DOCUMENT][CERT][${certToUpdate.documentNumber}]`);
    let results: ISdPsQueryResult[] = [];
    results = Array.from(sdpsQuery([certToUpdate], postCodeToDa));
    logger.info(`[RUN-RESUBMIT-SD-TRADE-DOCUMENT][${certToUpdate.documentNumber}][RESULT][${results.length}]`);
    await resendSdToTrade(results);
    logger.info(`[RUN-RESUBMIT-SD-TRADE-DOCUMENT][${certToUpdate.documentNumber}][RESULT][${results.length}][COMPLETE]`);
    logger.info(`[RUN-RESUBMIT-SD-TRADE-DOCUMENT][${certToUpdate.documentNumber}][UPDATE-COMPLETE]`);
  }
}
export const resubmitSdToTrade = async (): Promise<void> => {
  try {
    if (!appConfig.runResubmitCcToTrade) return;
    logger.info('[RESUBMIT-SD-TO-TRADE][FAILED-TRADE-CC][START]');
    const query: FilterQuery<IDocumentModel> = {
       createdAt: {
        $gte: new Date("2025-11-20T00:00:00.000Z"),
        $lte: new Date("2026-01-12T23:59:59.999Z"),
      },
      __t: "storageDocument",
      status: DocumentStatuses.Complete      
    }
    const certsToUpdate: IDocument[] = await DocumentModel
      .find(query, null, { timeout: true, lean: true })
      .sort({ createdAt: -1 });
    logger.info(`[RUN-RESUBMIT-SD-TRADE-DOCUMENT][CERTS][LENGTH:${certsToUpdate.length}]`);
    await processResubmitSdToTrade(certsToUpdate);
    logger.info(`[RUN-RESUBMIT-SD-TRADE-DOCUMENT][COMPLETE]`);
  } catch (e) {
    logger.error(`[RUN-RESUBMIT-SD-TRADE-DOCUMENT][ERROR][${e}]`);
  }
}

