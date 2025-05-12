const moment = require('moment')
const _ = require('lodash');
import Ajv from 'ajv';
import addFormats from "ajv-formats";
import { v4 as uuidv4 } from 'uuid';
import {
  type ICcQueryResult,
  type ILanding,
  toCcDefraReport,
  MessageLabel,
  IDocument,
  addToReportQueue,
  IDefraTradeCatchCertificate,
  LandingStatus,
  CertificateStatus
} from 'mmo-shared-reference-data';
import { ServiceBusMessage } from "@azure/service-bus";
import { isInWithinRetrospectiveWindow } from '../query/ccQuery';
import { getUnprocessedReports, markAsProcessed, insertCcDefraValidationReport } from '../persistence/defraValidation';
import { getCertificateByDocumentNumberWithNumberOfFailedAttempts } from '../persistence/catchCerts';
import { getExtendedValidationData } from '../persistence/extendedValidationDataService';
import { runCcQueryForLandings } from '../query/runCcQueryForLandings';
import { getVesselsIdx } from '../data/cache';
import { reportCc, report14DayLimitReached } from './caseManagement.service';
import { runUpdateForLandings } from '../landings/landingsUpdater';
import { saveReportingValidation } from '../data/blob-storage';
import logger from '../logger';
import { ICommodityCodeExtended } from '../types/species';
import { commoditySearch } from '../data/species';
import { toDynamicsCcCase, toDynamicsSd } from '../landings/transformations/dynamicsValidation';
import { toLandings } from '../landings/transformations/defraValidation';
import { IDynamicsCatchCertificateCase } from '../types/dynamicsValidation';
import { Type } from '../types/defraTradeValidation';
import { toDefraTradeCc, toDefraTradeSd } from '../landings/transformations/defraTradeValidation';
import config from "../config";
import { readFileSync } from 'fs';
import path from 'path';
import { getTotalRiskScore, isHighRisk } from '../data/risking';
import { ISdPsQueryResult } from '../types/query';
import {  IDefraTradeStorageDocument } from '../types/defraTradeSdPsCase';
import {  IDynamicsStorageDocumentCase, IDynamicsStorageDocumentProduct } from '../types/dynamicsValidationSdPs';

export const reportExceeding14DaysLandings = async (queryResults: ICcQueryResult[]): Promise<void> => {
  await reportLandings(queryResults, reportCc14DayLimitReached, '14-DAY-LIMIT-REACHED');
}

export const findNewLandings = (queryResults: ICcQueryResult[], landings: ILanding[], queryTime: moment.Moment): ICcQueryResult[] =>
  queryResults.filter((_: ICcQueryResult) => {

    // checking 14 day / EoD limit+1 day here
    if (!isInWithinRetrospectiveWindow(queryTime, _)) {
      return false;
    }

    // Landing data is in the system
    // Landing status is PENDING LANDING DATA
    // Update Case Management irrespective of ignore flag 
    if (_.extended.landingStatus === LandingStatus.Pending) {
      return landings.some((landing: ILanding) =>
        moment(landing.dateTimeLanded).isSame(_.dateLanded, "day") &&
        landing.rssNumber === _.rssNumber &&
        landing.source === _.source);
    }

    const riskScore = _.extended.riskScore === undefined ? getTotalRiskScore(_.extended.pln, _.species, _.extended.exporterAccountId, _.extended.exporterContactId) : _.extended.riskScore;
    const _isHighRisk = isHighRisk(riskScore, _.extended.threshold);
    if (_.extended.landingStatus === LandingStatus.Elog || (_.extended.landingStatus === LandingStatus.LandingOveruse && _isHighRisk)) {
      return landings.some((landing: ILanding) =>
        moment(landing.dateTimeLanded).isSame(_.dateLanded, "day") &&
        landing.rssNumber === _.rssNumber &&
        landing.source === _.source &&
        (!landing._ignore || (_.isExceeding14DayLimit && _.extended.landingStatus === LandingStatus.Elog)));
    }

    return false;

  })

export const reportNewLandings = async (landings: ILanding[], queryTime: moment.Moment): Promise<void> => {
  const qry: IterableIterator<ICcQueryResult> = await runCcQueryForLandings(landings);
  const newLandings: ICcQueryResult[] = findNewLandings(Array.from(qry), landings, queryTime);

  logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][REPORTING-NEW-LANDINGS][${newLandings.length}]`);
  await reportLandings(newLandings, reportCcSubmitted, 'CC-SUBMITTED');
}

export const reportLandings = async (
  landingValidations: ICcQueryResult[],
  report: (queryResults: ICcQueryResult[], retrospective?: boolean) => Promise<void>,
  type?: string
): Promise<void> => {
  const validatedCertificates = _(landingValidations)
    .groupBy((landingValidation: ICcQueryResult) => landingValidation.documentNumber)
    .map((validatedLanding: ICcQueryResult, documentNumber: string) => ({ documentNumber: documentNumber, landings: validatedLanding }))
    .value();

  logger.info(`[LANDINGS][LANDINGS-AND-REPORTING][${type}][RETROSPECTIVE-VALIDATION-CERTIFICATES][${validatedCertificates.length}]`);

  for (const validatedCertificate of validatedCertificates) {
    try {
      logger.info(`[LANDINGS][LANDINGS-AND-REPORTING][${type}][REPORTING][${validatedCertificate.documentNumber}]`);

      await report(validatedCertificate.landings);

      logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][UPDATING-LANDINGS][${validatedCertificate.documentNumber}]`);

      await runUpdateForLandings(validatedCertificate.landings, validatedCertificate.documentNumber);
    } catch (err) {
      logger.error(`[RUN-LANDINGS-AND-REPORTING-JOB][${validatedCertificate.documentNumber}][ERROR][${err}]`);
    }
  }
}

export const reportEvents = async (unprocessed: any[], documentType: string) => {
  await saveReportingValidation(unprocessed, documentType);
  await markAsProcessed(unprocessed.map(_ => _._id));
  logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][SUCCESS][${documentType}-PROCESSED: ${unprocessed.length}]`);
}

export const reportCcSubmitted = async (ccValidationData: ICcQueryResult[]): Promise<void> => {
  try {
    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][VALIDATIONS][${ccValidationData.length}]`);
    if (ccValidationData.length > 0) {
      let ccReport, catchCertificate;
      const certificateId = ccValidationData[0].documentNumber;
      const correlationId = uuidv4();

      logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][REPORTING-CC][${certificateId}][REPORT-ID][${correlationId}]`);

      try {
        catchCertificate = await getCertificateByDocumentNumberWithNumberOfFailedAttempts(certificateId, "catchCert");
        logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][getCertificateByDocumentNumberWithNumberOfFailedAttempts][${certificateId}][SUCCESS]`);
      }
      catch (e) {
        logger.warn(`[RUN-LANDINGS-AND-REPORTING-JOB][getCertificateByDocumentNumberWithNumberOfFailedAttempts][${e}][ERROR]`);
        throw e;
      }

      const requestByAdmin = catchCertificate.requestByAdmin;

      try {
        ccReport = toCcDefraReport(certificateId, correlationId, ccValidationData[0].status, requestByAdmin, getVesselsIdx(), catchCertificate);
        logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][toCcDefraReport][${certificateId}][SUCCESS]`);
      }
      catch (e) {
        logger.warn(`[RUN-LANDINGS-AND-REPORTING-JOB][toCcDefraReport][${e}][ERROR]`);
        throw e;
      }

      try {
        ccReport.landings = toLandings(ccValidationData);
        logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][toLandings][${certificateId}][SUCCESS]`);
      }
      catch (e) {
        logger.warn(`[RUN-LANDINGS-AND-REPORTING-JOB][toLandings][${e}][ERROR]`);
        throw e;
      }

      try {
        await insertCcDefraValidationReport(ccReport);
        logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][insertCcDefraValidationReport][${certificateId}][SUCCESS]`);
      }
      catch (e) {
        logger.warn(`[RUN-LANDINGS-AND-REPORTING-JOB][insertCcDefraValidationReport][${e}][ERROR]`);
        throw e;
      }

      await sendReport(catchCertificate, ccValidationData, correlationId, certificateId);
    }
  } catch (e) {
    logger.warn(`[RUN-LANDINGS-AND-REPORTING-JOB][ERROR][${e}]`);
    throw e;
  }
};

async function sendReport(catchCertificate, ccValidationData, correlationId, certificateId) {
  if (Object.hasOwn(catchCertificate, 'exportData') && catchCertificate.exportData.exporterDetails !== undefined) {

    for (const landing of ccValidationData) {
      const requestedDate = moment.utc(landing.dateLanded);
      const requestedDateISO = requestedDate.format('YYYY-MM-DD')

      if (!requestedDate.isValid() || _.isEmpty(landing.rssNumber)) {
        logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][${landing.extended.landingId}][NO-SALES-NOTE]`);
        continue;
      }

      const salesNote = await getExtendedValidationData(requestedDateISO, landing.rssNumber, 'salesNotes');
      const _hasSaveNote = !_.isEmpty(salesNote);
      logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][${landing.extended.landingId}][HAS-SALES-NOTE][${_hasSaveNote}]`);
      landing.hasSalesNote = _hasSaveNote;
    }

    await reportCc(ccValidationData, catchCertificate, correlationId, MessageLabel.NEW_LANDING);
    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][SUCCESS][${certificateId}]`);
  } else {
    logger.error(`[RUN-LANDINGS-AND-REPORTING-JOB][FAIL][${certificateId}][NO-EXPORTER-DETAILS]`);
  }
}

export const reportCc14DayLimitReached = async (ccValidationData: ICcQueryResult[]): Promise<void> => {
  const validations = ccValidationData || [];

  if (validations.length) {
    const certificateId = validations[0].documentNumber;

    logger.info(`[REPORTING-CC-14-DAY-LIMIT-REACHED][DOCUMENT-NUMBER][${certificateId}]`);

    const catchCertificate = await getCertificateByDocumentNumberWithNumberOfFailedAttempts(certificateId, "catchCert");

    if (Object.hasOwn(catchCertificate, 'exportData') && catchCertificate.exportData.exporterDetails !== undefined) {

      for (const landing of ccValidationData) {
        const requestedDate = moment.utc(landing.dateLanded);
        const requestedDateISO = requestedDate.format('YYYY-MM-DD')

        if (!requestedDate.isValid() || _.isEmpty(landing.rssNumber)) {
          logger.info(`[REPORT-CC-14-DAY-LIMIT-REACHED][${landing.extended.landingId}][NO-SALES-NOTE]`);
          continue;
        }

        const salesNote = await getExtendedValidationData(requestedDateISO, landing.rssNumber, 'salesNotes');
        const _hasSaveNote = !_.isEmpty(salesNote);
        logger.info(`[REPORT-CC-14-DAY-LIMIT-REACHED][${landing.extended.landingId}][HAS-SALES-NOTE][${_hasSaveNote}]`);
        landing.hasSalesNote = _hasSaveNote;
      }

      const correlationId = uuidv4();
      await report14DayLimitReached(ccValidationData, catchCertificate, correlationId, MessageLabel.EXCEEDED_LANDING);
      logger.info(`[REPORT-CC-14-DAY-LIMIT-REACHED][SUCCESS][${certificateId}]`);
    } else {
      logger.error(`[REPORT-CC-14-DAY-LIMIT-REACHED][FAIL][${certificateId}][NO-EXPORTER-DETAILS]`);
    }
  }
};

const getValidator = (schema: string): any => {
  const ajv = new Ajv();
  ajv.addKeyword("definition")
  addFormats(ajv)
  const schemaData = readFileSync(path.join(__dirname + '../../../data/schemas/Defra Trade Reporting/', schema), { encoding: 'utf8' });
  const schemaJson = JSON.parse(schemaData);
  return ajv.compile(schemaJson);
}

export const reportCcToTrade = async (
  certificate: IDocument,
  caselabel: MessageLabel,
  certificateCase: IDynamicsCatchCertificateCase,
  ccQueryResults: ICcQueryResult[] | null
): Promise<void> => {

  const catchCertificateCase = { ...certificateCase }

  delete catchCertificateCase.clonedFrom;
  delete catchCertificateCase.landingsCloned;
  delete catchCertificateCase.parentDocumentVoid;

  if (!config.azureTradeQueueEnabled) {
    logger.info(`[DEFRA-TRADE-CC][DOCUMENT-NUMBER][${certificate.documentNumber}][CHIP-DISABLED]`);

    const message: ServiceBusMessage = {
      body: catchCertificateCase,
      subject: `${caselabel}-${certificate.documentNumber}`,
      sessionId: catchCertificateCase._correlationId
    };

    await addToReportQueue(
      certificate.documentNumber,
      message,
      config.azureTradeQueueUrl,
      config.azureReportTradeQueueName,
      config.enableReportToQueue
    );

    return;
  }

  const ccDefraTrade: IDefraTradeCatchCertificate = toDefraTradeCc(certificate, catchCertificateCase, ccQueryResults);

  const validate_cc_defra_trade = getValidator('CatchCertificateCase.json')
  const valid: boolean = validate_cc_defra_trade(ccDefraTrade);
  if (!valid) {
    logger.error(`[DEFRA-TRADE-CC][DOCUMENT-NUMBER][${certificate.documentNumber}][INVALID-PAYLOAD][${JSON.stringify(validate_cc_defra_trade.errors)}]`);
    return;
  }
  const messageId = uuidv4();
  const message: ServiceBusMessage = {
    body: ccDefraTrade,
    messageId,
    correlationId: ccDefraTrade._correlationId,
    contentType: 'application/json',
    applicationProperties: {
      EntityKey: certificate.documentNumber,
      PublisherId: 'FES',
      OrganisationId: ccDefraTrade.exporter.accountId ?? null,
      UserId: ccDefraTrade.exporter.contactId ?? null,
      SchemaVersion: parseInt(validate_cc_defra_trade.schema.properties.version.const, 10),
      Type: Type.INTERNAL,
      Status: ccDefraTrade.certStatus,
      TimestampUtc: moment.utc().toISOString()
    },
    subject: `${caselabel}-${certificate.documentNumber}`,
  };

  await addToReportQueue(
    certificate.documentNumber,
    message,
    config.azureTradeQueueUrl,
    config.azureReportTradeQueueName,
    config.enableReportToQueue
  );
}

const getUpdatedValidationData = (ccValidationData: ICcQueryResult[]): ICcQueryResult[] => {
  for (const validationData of ccValidationData) {
    const commodities: ICommodityCodeExtended[] = commoditySearch(validationData.species, validationData.extended.state, validationData.extended.presentation);
    const commodity: ICommodityCodeExtended = commodities.find((c: ICommodityCodeExtended) => c.code === validationData.extended.commodityCode);
    if (commodity && !validationData.extended.commodityCodeDescription) {
      logger.info(`[LANDINGS][COMMODITY-CODE-SEARCH-FOR][${validationData.species}][FOUND][${commodity.description}]`);
      validationData.extended.commodityCodeDescription = commodity.description;
    }
  }

  return ccValidationData;
}

const sendCctoTrade = async (ccValidationData: ICcQueryResult[]): Promise<void> => {
  let catchCertificate: IDocument
  const certificateId = ccValidationData[0].documentNumber;
  const correlationId = uuidv4();

  logger.info(`[LANDINGS][REREPORTING-CC][${certificateId}][REPORT-ID][${correlationId}]`);

  try {
    catchCertificate = await getCertificateByDocumentNumberWithNumberOfFailedAttempts(certificateId, "catchCert");
    logger.info(`[REREPORT-CC-SUBMITTED][SUCCESS][getCertificateByDocumentNumberWithNumberOfFailedAttempts][${certificateId}]`);
  }
  catch (e) {
    logger.warn(`[REREPORT-CC-SUBMITTED][ERROR][getCertificateByDocumentNumberWithNumberOfFailedAttempts][${e}]`);
    throw e;
  }

  if (catchCertificate.exportData?.exporterDetails !== undefined) {
    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = toDynamicsCcCase(
      ccValidationData,
      catchCertificate,
      correlationId
    );

    if (!dynamicsCatchCertificateCase.clonedFrom) {
      delete dynamicsCatchCertificateCase.clonedFrom;
      delete dynamicsCatchCertificateCase.landingsCloned;
      delete dynamicsCatchCertificateCase.parentDocumentVoid;
    }

    logger.info(`[REREPORT-CC-SUBMITTED][GENERATED-CC][${certificateId}][${JSON.stringify(catchCertificate)}]`);
    await reportCcToTrade(catchCertificate, MessageLabel.CATCH_CERTIFICATE_SUBMITTED, dynamicsCatchCertificateCase, getUpdatedValidationData(ccValidationData));
  } else {
    logger.error(`[REREPORT-CC-SUBMITTED][FAIL][${certificateId}][NO-EXPORTER-DETAILS]`);
  }
}

export const resendCcToTrade = async (ccValidationData: ICcQueryResult[]): Promise<void> => {
  try {
    logger.info(`[REPORT-CC-RESUBMITTED][ccValidationData][${ccValidationData.length}]`);

    if (ccValidationData.length > 0) {
      await sendCctoTrade(ccValidationData);
    }
  } catch (e) {
    logger.error(`[REREPORT-CC-SUBMITTED][ERROR][${e}]`);
    throw e;
  }
};

export const resendSdToTrade = async (
  ccValidationData: ISdPsQueryResult[],
): Promise<void> => {
  try {
    logger.info(
      `[REPORT-SD-RESUBMITTED][ccValidationData][${ccValidationData.length}]`,
    );
    if (ccValidationData.length > 0) {
      await sendSdToTrade(ccValidationData);
    }
  } catch (e) {
    logger.error(`[REREPORT-SD-SUBMITTED][ERROR][${e}]`);
    throw e;
  }
};

export const sendSdToTrade = async (sdpsValidationData: ISdPsQueryResult[]): Promise<void> => {
  if (sdpsValidationData.length > 0) {
    const certificateId = sdpsValidationData[0].documentNumber;
    const correlationId = uuidv4();
    logger.info(`[DATA-HUB][REPORT-SD-SUBMITTED][${certificateId}]`);
    const certificate = await getCertificateByDocumentNumberWithNumberOfFailedAttempts(certificateId, "storageDocument");
    
    if (certificate?.documentNumber) {
      logger.info(`[DATA-HUB][REPORT-SD-SUBMITTED][${certificateId}][FOUND]`);      
      const storageDocumentCase: IDynamicsStorageDocumentCase = toDynamicsSd(sdpsValidationData, certificate, correlationId);
      await reportSdToTrade(certificate, MessageLabel.STORAGE_DOCUMENT_SUBMITTED, storageDocumentCase, sdpsValidationData);      
    }
    else {
      logger.info(`[DATA-HUB][REPORT-SD-SUBMITTED][${certificateId}][NOT-FOUND]`);
    }
  }
};

export const reportSdToTrade = async (storageDocument: IDocument, caselabel: MessageLabel, storageDocumentCase: IDynamicsStorageDocumentCase, sdQueryResults: ISdPsQueryResult[] | null): Promise<void> => {
  delete storageDocumentCase.clonedFrom;
  delete storageDocumentCase.parentDocumentVoid;
  if (!config.azureTradeQueueEnabled) {
    logger.info(`[DEFRA-TRADE-SD][DOCUMENT-NUMBER][${storageDocument.documentNumber}][CHIP-DISABLED]`);
    const message: ServiceBusMessage = {
      body: {
        ...storageDocumentCase,
        products: storageDocumentCase.products ? storageDocumentCase.products.map((_: IDynamicsStorageDocumentProduct) => {
          delete _['isDocumentIssuedInUK'];
          return {
            ..._,
          }
        }) : undefined
      },
      subject: `${caselabel}-${storageDocument.documentNumber}`,
      sessionId: storageDocumentCase._correlationId
    };
    await addToReportQueue(
      storageDocument.documentNumber,
      message,
      config.azureTradeQueueUrl,
      config.azureReportTradeQueueName,
      config.enableReportToQueue
    );
    return;
  }
  const sdDefraTrade: IDefraTradeStorageDocument = toDefraTradeSd(storageDocument, storageDocumentCase, sdQueryResults);
  logger.info(`[DEFRA-TRADE-SD][DOCUMENT-NUMBER][${storageDocument.documentNumber}][PAYLOAD][${JSON.stringify(sdDefraTrade)}]`);
  const validate_sd_defra_trade = getValidator('StorageDocument.json')
  const valid: boolean = validate_sd_defra_trade(sdDefraTrade);
  if (!valid) {
    logger.error(`[DEFRA-TRADE-SD][DOCUMENT-NUMBER][${storageDocument.documentNumber}][INVALID-PAYLOAD][${JSON.stringify(validate_sd_defra_trade.errors)}]`);
    return;
  }
  let status: CertificateStatus;
  if (!Array.isArray(sdQueryResults)) {  
    status = CertificateStatus.VOID
  } else {    
    status = sdQueryResults.some((_: ISdPsQueryResult) => _.status === CertificateStatus.BLOCKED) ? CertificateStatus.BLOCKED : CertificateStatus.COMPLETE
  }
  const messageId = uuidv4();
  const message: ServiceBusMessage = {
    body: sdDefraTrade,
    messageId,
    correlationId: sdDefraTrade._correlationId,
    contentType: 'application/json',
    applicationProperties: {
      EntityKey: storageDocument.documentNumber,
      PublisherId: 'FES',
      OrganisationId: sdDefraTrade.exporter.accountId ?? null,
      UserId: sdDefraTrade.exporter.contactId ?? null,
      SchemaVersion: parseInt(validate_sd_defra_trade.schema.properties.version.const),
      Type: Type.INTERNAL,
      Status: status,
      TimestampUtc: moment.utc().toISOString()
    },
    subject: `${caselabel}-${storageDocument.documentNumber}`,
  };
  await addToReportQueue(
    storageDocument.documentNumber,
    message,
    config.azureTradeQueueUrl,
    config.azureReportTradeQueueName,
    config.enableReportToQueue
  );
};

export const filterReports = async (unprocessed: any[]): Promise<void> => {
  const processingStatements = unprocessed.filter(_ => _.documentType === "ProcessingStatement");
  if (processingStatements.length > 0) {
    await reportEvents(processingStatements, 'PS');
  }

  const storageDocuments = unprocessed.filter(_ => _.documentType === "StorageDocument");
  if (storageDocuments.length > 0) {
    await reportEvents(storageDocuments, 'SD');
  }

  const catchCertificates = unprocessed.filter(_ => _.documentType === "CatchCertificate");
  if (catchCertificates.length > 0) {
    await reportEvents(catchCertificates, 'CC');
  }
}

export const processReports = async (): Promise<void> => {
  try {
    logger.info('[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][START]');

    let unprocessed: any[] = await getUnprocessedReports();

    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: ${unprocessed?.length}]`);

    while (unprocessed?.length) {
      await filterReports(unprocessed);
      unprocessed = await getUnprocessedReports();
      logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: ${unprocessed.length}]`);
    }

    logger.info('[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][END]');
  }
  catch (e) {
    logger.error(`[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][ERROR]${e.message}`)
  }
}
