import { ServiceBusMessage } from "@azure/service-bus";
import { toDynamicsLandingDetails } from "../landings/transformations/dynamicsValidation";
import { 
  type ICcQueryResult, 
  type IDocument, 
  type IDynamicsLandingCase, 
  addToReportQueue,
  MessageLabel
} from "mmo-shared-reference-data";
import config from "../config";
import logger from "../logger";

export const reportCc = async (
  ccValidationData: ICcQueryResult[],
  certificate: IDocument,
  correlationId: string,
  caselabel: MessageLabel
): Promise<void> => {

  const dynamicsLandingsCase: IDynamicsLandingCase[] = toDynamicsLandingDetails(ccValidationData, certificate, correlationId);

  if (!Array.isArray(dynamicsLandingsCase) || dynamicsLandingsCase.length === 0) {
    logger.error(`[LANDING-DETAIL-CC][DOCUMENT-NUMBER][${certificate.documentNumber}][CORRELATION-ID][${correlationId}][NO-LANDING-UPDATES]`);
    return;
  }

  logger.info(`[LANDING-DETAIL-CC][DOCUMENT-NUMBER][${certificate.documentNumber}][CORRELATION-ID][${correlationId}][NUMBER-OF-LANDINGS][${dynamicsLandingsCase.length}]`);

  const message: ServiceBusMessage = {
    body: dynamicsLandingsCase,
    subject: `${caselabel}-${certificate.documentNumber}`,
    sessionId: correlationId
  };

  await addToReportQueue(
    certificate.documentNumber,
    message,
    config.azureQueueUrl,
    config.azureReportQueueName,
    config.enableReportToQueue
  );
}

export const report14DayLimitReached = async (
  ccValidationData: ICcQueryResult[],
  certificate: IDocument,
  correlationId: string,
  caselabel: MessageLabel
): Promise<void> => {
  const dynamicsLandingsCase: IDynamicsLandingCase[] = toDynamicsLandingDetails(ccValidationData, certificate, correlationId);

  logger.info(`[REPORTING-CC-14-DAY-LIMIT-REACHED][DOCUMENT-NUMBER][${certificate.documentNumber}][CORRELATION-ID][${correlationId}][NUMBER-OF-LANDINGS][${dynamicsLandingsCase.length}]`);

  const message: ServiceBusMessage = {
    body: dynamicsLandingsCase,
    subject: `${caselabel}-${certificate.documentNumber}`,
    sessionId: correlationId
  };

  await addToReportQueue(
    certificate.documentNumber,
    message,
    config.azureQueueUrl,
    config.azureReportQueueName,
    config.enableReportToQueue
  );
}