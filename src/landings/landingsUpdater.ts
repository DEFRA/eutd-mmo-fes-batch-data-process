import moment from 'moment';
import { missingLandingRefreshQuery, exceedingLimitLandingQuery } from "../query/ccQuery";
import { getCatchCerts, getCertificateByDocumentNumber, upsertCertificate } from "../persistence/catchCerts";
import { reportExceeding14DaysLandings, reportNewLandings, processReports, resendCcToTrade } from "../services/report.service";
import { fetchRefereshLandings, updateConsolidateLandings } from '../services/landingConsolidate.service';
import { fetchAndProcessNewLandings } from './landingsRefresh';
import { getSpeciesAliases, getToLiveWeightFactor, getVesselsIdx, loadLandingReprocessData, updateLandingReprocessData } from "../data/cache";
import {
  type ILanding,
  type ICcQueryResult,
  type Product,
  ccQuery,
  LandingStatus,
  mapLandingWithLandingStatus,
  ILandingQuery,
  IDocument,
  getLandingsFromCatchCertificate,
  DocumentStatuses
} from 'mmo-shared-reference-data';
import logger from '../logger';
import appConfig from '../config';
import _ from 'lodash';
import { mapPlnLandingsToRssLandings } from '../query/plnToRss';
import { getLandingsMultiple } from '../persistence/landing';
import { DocumentModel, IDocumentModel } from '../types/document';
import { FilterQuery } from 'mongoose';
import { commoditySearch } from '../data/species';
import { ICommodityCodeExtended } from '../types/species';
import { ILandingQueryWithIsLegallyDue } from '../types/landing';

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

    const missingLandings: ILandingQuery[] = await getMissingLandingsArray(moment.utc());
    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS][${missingLandings.length}]`);

    const fetchLandings: ILandingQuery[] = landingsRefresh
      .concat(missingLandings)
      .reduce(
        (l: ILandingQuery[], cur: ILandingQuery) =>
          l.some((landing: ILandingQuery) => landing.dateLanded === cur.dateLanded && landing.rssNumber === cur.rssNumber) ? l : [...l, cur], []
      );

    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS-PLUS-OVERUSED-ELOG-DEMINMUS-LANDINGS][${fetchLandings.length}]`);

    const newLandings: ILanding[] = await fetchAndProcessNewLandings(fetchLandings);

    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][NEW-LANDINGS][${newLandings.length}]`);

    if (newLandings && newLandings.length) {
      await reportNewLandings(newLandings);
      updateConsolidateLandings(newLandings);
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

export const processResubmitCCToTrade = async (certsToUpdate: IDocument[]): Promise<void> => {
  for (const certToUpdate of certsToUpdate) {
    logger.info(`[RUN-RESUBMIT-TRADE-DOCUMENT][CERT][${certToUpdate.documentNumber}]`);

    let results: ICcQueryResult[] = [];
    const landings = _.flatten((getLandingsFromCatchCertificate(certToUpdate, true) || []));
    logger.info(`[RUN-RESUBMIT-TRADE-DOCUMENT][${landings.length}-DOCUMENT-LANDINGS][${certToUpdate.documentNumber}]`);

    if (landings.length) {
      const landingsByRss: ILandingQueryWithIsLegallyDue[] = uniquifyLandings(mapPlnLandingsToRssLandings(landings));
      logger.info(`[RUN-RESUBMIT-TRADE-DOCUMENT][FOR][${JSON.stringify(landingsByRss)}]`);
      const multipleLandings: ILanding[] = await getLandingsMultiple(landingsByRss);
      logger.info(`[RUN-RESUBMIT-TRADE-DOCUMENT][RUNNING-CCQUERY][WITH][${multipleLandings.length}][LANDINGS]`);
      results = Array.from(ccQuery([certToUpdate], multipleLandings, getVesselsIdx(), moment(certToUpdate.createdAt), getSpeciesAliases));
      logger.info(`[RUN-RESUBMIT-TRADE-DOCUMENT][${certToUpdate.documentNumber}][RESULT][${results.length}]`);
    } else {
      logger.info(`[RUN-RESUBMIT-TRADE-DOCUMENT][${certToUpdate.documentNumber}][NO-LANDINGS-FOUND][${certToUpdate.documentNumber}]`);
      continue;
    }

    if (results.length <= 0) {
      logger.info(`[RUN-RESUBMIT-TRADE-DOCUMENT][${certToUpdate.documentNumber}][NO-VALIDATIONS][${certToUpdate.documentNumber}]`);
      continue;
    }

    await resendCcToTrade(results);
    logger.info(`[RUN-RESUBMIT-TRADE-DOCUMENT][${certToUpdate.documentNumber}][RESULT][${results.length}][COMPLETE]`);

    const { exportData } = certToUpdate;
    exportData.products.map((product: any) => {
      if (product.commodityCodeDescription === undefined) {
        const commodityCode: ICommodityCodeExtended[] = commoditySearch(product.speciesCode, product.state.code, product.presentation.code);
        const description: string | undefined = commodityCode.find((c: ICommodityCodeExtended) => c.code === product.commodityCode)?.description;
        if (description) {
          product.commodityCodeDescription = description;
          logger.info(`[RUN-RESUBMIT-TRADE-DOCUMENT][DESCRIPTION-UPDATED][${product.speciesId}][WITH][${description}]`);
        }
      }
    });

    await upsertCertificate(certToUpdate.documentNumber, { exportData });

    logger.info(`[RUN-RESUBMIT-TRADE-DOCUMENT][${certToUpdate.documentNumber}][UPDATE-COMPLETE]`);
  }
}

export const resubmitCCToTrade = async (): Promise<void> => {
  try {
    if (!appConfig.runResubmitCcToTrade) return;

    const query: FilterQuery<IDocumentModel> = {
      __t: 'catchCert',
      'exportData.products': { $exists: true },
      'exportData.products.commodityCodeDescription': { $exists: false },
      'status': DocumentStatuses.Complete
    }

    const certsToUpdate: IDocument[]  = await DocumentModel
      .find(query, null, { timeout: true, lean: true })
      .sort({ createdAt: -1 });

    logger.info(`[RUN-RESUBMIT-TRADE-DOCUMENT][CERTS][LENGTH:${certsToUpdate.length}]`);
    await processResubmitCCToTrade(certsToUpdate);

    logger.info(`[RUN-RESUBMIT-TRADE-DOCUMENT][COMPLETE]`);
  } catch (e) {
    logger.error(`[RUN-RESUBMIT-TRADE-DOCUMENT][ERROR][${e}]`);
  }
}

export const exceeding14DayLandingsAndReportingCron = async (): Promise<void> => {
  try {
    const exceeding14DayLimitLandings: ICcQueryResult[] = await getExceedingLandingsArray(moment.utc());

    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][EXCEEDING-14-DAYS-LANDINGS][${exceeding14DayLimitLandings.length}]`);

    if (exceeding14DayLimitLandings && exceeding14DayLimitLandings.length) {
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
  if (exportData.products && exportData.products.length) {
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
