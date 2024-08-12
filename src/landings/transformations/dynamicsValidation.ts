import moment from "moment";
import {
  type ICcBatchValidationReport,
  type IDynamicsLandingCase,
  type ICcQueryResult,
  type IDocument,
  type IDynamicsLanding,
  LandingSources,
  isLandingDataExpectedAtSubmission,
  isInRetrospectivePeriod,
  isLandingDataLate,
  ccBatchReport,
  toLandingStatus,
  LevelOfRiskType,
  toExporter,
  toExportedTo,
  postCodeDaLookup,
  postCodeToDa,
  isElog,
  isWithinDeminimus,
  DocumentStatuses,
  TRANSPORT_VEHICLE_DIRECT,
  LandingStatusType,
} from "mmo-shared-reference-data";
import {
  getExportedSpeciesRiskScore,
  getExporterBehaviourRiskScore,
  getTotalRiskScore,
  getVesselOfInterestRiskScore,
  isHighRisk,
  isRiskEnabled
} from "../../data/risking";
import { getVesselLength } from "../../data/vessel";
import { ApplicationConfig } from "../../config";
import { CaseOneType, CaseTwoType, IDynamicsCatchCertificateCase } from "../../types/dynamicsValidation";
import { isSpeciesFailure } from "../../data/species";
import { isEmpty } from "lodash";
import { CertificateAudit, IAuditEvent } from "../../types/defraValidation";

export function toLanding(validatedLanding: ICcQueryResult): IDynamicsLanding {
  const ccBatchReportForLanding: ICcBatchValidationReport = Array.from(ccBatchReport([validatedLanding][Symbol.iterator]()))[0];
  const hasLegalTimeLimitPassed = (validatedLanding.extended.vesselOverriddenByAdmin && !validatedLanding.rssNumber) ? false : validatedLanding.extended.isLegallyDue;

  const riskScore = getTotalRiskScore(
    validatedLanding.extended.pln,
    validatedLanding.species,
    validatedLanding.extended.exporterAccountId,
    validatedLanding.extended.exporterContactId);


  const has14DayLimitReached: (item: ICcQueryResult, landingDataNotExpected: boolean) => boolean = (item: ICcQueryResult, landingDataNotExpected: boolean) =>
    landingDataNotExpected || !isInRetrospectivePeriod(moment.utc(), item) ? true : item.isLandingExists;

  const isDataNeverExpected = validatedLanding.extended.dataEverExpected === false;
  const hasLandingData = !isDataNeverExpected && validatedLanding.firstDateTimeLandingDataRetrieved !== undefined
  const landingStatus = toLandingStatus(validatedLanding, isHighRisk(riskScore));
  const riskingObject = getRiskingObject(validatedLanding, riskScore);
  const validationObject = getValidationObject(validatedLanding, ccBatchReportForLanding, isDataNeverExpected, hasLegalTimeLimitPassed);
  return {
    status: landingStatus,
    id: validatedLanding.extended.landingId,
    landingDate: validatedLanding.dateLanded,
    species: validatedLanding.species,
    cnCode: validatedLanding.extended.commodityCode,
    commodityCodeDescription: validatedLanding.extended.commodityCodeDescription,
    scientificName: validatedLanding.extended.scientificName,
    is14DayLimitReached: has14DayLimitReached(validatedLanding, isDataNeverExpected) ? true : ccBatchReportForLanding.FI0_47_unavailabilityExceeds14Days === 'Fail',
    state: validatedLanding.extended.state,
    presentation: validatedLanding.extended.presentation,
    vesselName: validatedLanding.extended.vessel,
    vesselPln: validatedLanding.extended.pln,
    vesselLength: getVesselLength(validatedLanding.extended.pln, validatedLanding.dateLanded),
    vesselAdministration: validatedLanding.da,
    licenceHolder: validatedLanding.extended.licenceHolder,
    source: validatedLanding.isLandingExists ? validatedLanding.source : undefined,
    speciesAlias: validatedLanding.speciesAlias,
    speciesAnomaly: validatedLanding.speciesAnomaly,
    weight: validatedLanding.rawWeightOnCert,
    numberOfTotalSubmissions: validatedLanding.extended.numberOfSubmissions,
    vesselOverriddenByAdmin: validatedLanding.extended.vesselOverriddenByAdmin === true,
    speciesOverriddenByAdmin: validatedLanding.extended.speciesOverriddenByAdmin === true,
    dataEverExpected: !isDataNeverExpected,
    landingDataExpectedDate: validatedLanding.extended.landingDataExpectedDate,
    landingDataEndDate: validatedLanding.extended.landingDataEndDate,
    landingDataExpectedAtSubmission: !isDataNeverExpected ? isLandingDataExpectedAtSubmission(validatedLanding.createdAt, validatedLanding.extended.landingDataExpectedDate) : undefined,
    isLate: hasLandingData ? isLandingDataLate(moment.utc(validatedLanding.firstDateTimeLandingDataRetrieved).subtract(1, 'day').toISOString(), validatedLanding.extended.landingDataExpectedDate) : undefined,
    dateDataReceived: hasLandingData ? moment.utc(validatedLanding.firstDateTimeLandingDataRetrieved).subtract(1, 'day').toISOString() : undefined,
    validation: validationObject,
    risking: riskingObject,
    adminSpecies: validatedLanding.extended.speciesAdmin,
    adminState: validatedLanding.extended.stateAdmin,
    adminPresentation: validatedLanding.extended.presentationAdmin,
    adminCommodityCode: validatedLanding.extended.commodityCodeAdmin,
  };
}

function getValidationObject(validatedLanding: ICcQueryResult, ccBatchReportForLanding: ICcBatchValidationReport, isDataNeverExpected: boolean, hasLegalTimeLimitPassed: boolean) {
  return {
    liveExportWeight: validatedLanding.weightOnCert,
    totalWeightForSpecies: ccBatchReportForLanding.aggregatedLandedDecWeight,
    totalLiveForExportSpecies: validatedLanding.isSpeciesExists && validatedLanding.source === LandingSources.LandingDeclaration
      ? validatedLanding.weightOnLanding : undefined,
    totalEstimatedForExportSpecies: ccBatchReportForLanding.aggregatedEstimateWeight,
    totalEstimatedWithTolerance: ccBatchReportForLanding.aggregatedEstimateWeightPlusTolerance,
    totalRecordedAgainstLanding: validatedLanding.weightOnAllCerts,
    landedWeightExceededBy: ccBatchReportForLanding.exportedWeightExceedingEstimateLandedWeight ? Number(ccBatchReportForLanding.exportedWeightExceedingEstimateLandedWeight) : Number(ccBatchReportForLanding.FI0_290_exportedWeightExceedingLandedWeight),
    rawLandingsUrl: validatedLanding.isLandingExists && !isDataNeverExpected ? ccBatchReportForLanding.rawLandingsUrl.replace('{BASE_URL}', ApplicationConfig.prototype.internalAppUrl) : undefined,
    salesNoteUrl: validatedLanding.hasSalesNote ? ccBatchReportForLanding.salesNotesUrl.replace('{BASE_URL}', ApplicationConfig.prototype.internalAppUrl) : undefined,
    isLegallyDue: hasLegalTimeLimitPassed
  }
}

function getRiskingObject(validatedLanding: ICcQueryResult, riskScore: number) {
  return {
    overuseInfo: validatedLanding.overUsedInfo.some(_ => _ !== validatedLanding.documentNumber)
      ? validatedLanding.overUsedInfo.filter(_ => _ !== validatedLanding.documentNumber) : undefined,
    vessel: getVesselOfInterestRiskScore(validatedLanding.extended.pln).toString(),
    speciesRisk: getExportedSpeciesRiskScore(validatedLanding.species).toString(),
    exporterRiskScore: getExporterBehaviourRiskScore(validatedLanding.extended.exporterAccountId, validatedLanding.extended.exporterContactId).toString(),
    landingRiskScore: riskScore.toString(),
    highOrLowRisk: isHighRisk(riskScore) ? LevelOfRiskType.High : LevelOfRiskType.Low,
    isSpeciesRiskEnabled: isRiskEnabled()
  }
}

export function toDynamicsLandingCase(
  validatedLanding: ICcQueryResult,
  catchCertificate: IDocument,
  correlationId: string
): IDynamicsLandingCase {
  const landing = toLanding(validatedLanding);

  return {
    ...landing,
    exporter: toExporter(catchCertificate),
    documentNumber: catchCertificate.documentNumber,
    documentDate: moment.utc(catchCertificate.createdAt).toISOString(),
    documentUrl: `${ApplicationConfig.prototype.externalAppUrl}/qr/export-certificates/${catchCertificate.documentUri}`,
    _correlationId: correlationId,
    requestedByAdmin: catchCertificate.requestByAdmin,
    numberOfFailedSubmissions: catchCertificate.numberOfFailedAttempts,
    exportedTo: toExportedTo(catchCertificate)
  };
}

export function toDynamicsLandingDetails(
  validatedLandings: ICcQueryResult[],
  catchCertificate: IDocument,
  correlationId: string
): IDynamicsLandingCase[] {
  return validatedLandings.map((queryRes: ICcQueryResult) =>
    toDynamicsLandingCase(
      queryRes,
      catchCertificate,
      correlationId
    )
  );
}

export const isValidationOveruse = (item: ICcQueryResult): boolean =>
  item.isSpeciesExists &&
  !item.isOverusedThisCert &&
  !item.isPreApproved &&
  isHighRisk(getTotalRiskScore(item.extended.pln, item.species, item.extended.exporterAccountId, item.extended.exporterContactId)) &&
  item.isOverusedAllCerts

const isNoLandingDataAvailable = (ccQuery: ICcQueryResult) =>
  ccQuery.extended.dataEverExpected !== false &&
  moment.utc(ccQuery.createdAt).isAfter(moment.utc(ccQuery.extended.landingDataEndDate), 'day');

const isFailedWeightCheck = (ccQueryLanding: ICcQueryResult) =>
  ccQueryLanding.isSpeciesExists &&
  ccQueryLanding.isOverusedThisCert &&
  isHighRisk(getTotalRiskScore(ccQueryLanding.extended.pln, ccQueryLanding.species, ccQueryLanding.extended.exporterAccountId, ccQueryLanding.extended.exporterContactId))

const isFailedSpeciesCheck = (ccQueryLanding: ICcQueryResult) =>
  isSpeciesFailure(isHighRisk)(isRiskEnabled(), ccQueryLanding.isSpeciesExists, getTotalRiskScore(ccQueryLanding.extended.pln, ccQueryLanding.species, ccQueryLanding.extended.exporterAccountId, ccQueryLanding.extended.exporterContactId)) &&
  !isElog(isWithinDeminimus)(ccQueryLanding) &&
  ccQueryLanding.isLandingExists

const isFailedNoLandingDataCheck = (ccQueryLanding: ICcQueryResult) =>
  !ccQueryLanding.isLandingExists &&
  isHighRisk(getTotalRiskScore(ccQueryLanding.extended.pln, ccQueryLanding.species, ccQueryLanding.extended.exporterAccountId, ccQueryLanding.extended.exporterContactId)) &&
  ((ccQueryLanding.extended.dataEverExpected !== false && isLandingDataExpectedAtSubmission(ccQueryLanding.createdAt, ccQueryLanding.extended.landingDataExpectedDate)) || ccQueryLanding.extended.vesselOverriddenByAdmin)

export function toDynamicsCase2(validatedLandings: ICcQueryResult[]): CaseTwoType {
  let caseType2Status: CaseTwoType = CaseTwoType.Success;

  const dataNeverExpected = validatedLandings.some((landing: ICcQueryResult) => landing.extended.dataEverExpected === false &&
    isHighRisk(getTotalRiskScore(landing.extended.pln, landing.species, landing.extended.exporterAccountId, landing.extended.exporterContactId)));

  if (dataNeverExpected) {
    caseType2Status = CaseTwoType.DataNeverExpected;
  }

  const isPendingLandingData = validatedLandings.some((landing: ICcQueryResult) =>
    (landing.extended.dataEverExpected !== false && !landing.isLandingExists) || isElog(isWithinDeminimus)(landing) && isInRetrospectivePeriod(moment.utc(), landing));

  if (isPendingLandingData) {
    caseType2Status = CaseTwoType.PendingLandingData;
  }

  const isOveruseFailure = validatedLandings.some((landing: ICcQueryResult) => isValidationOveruse(landing));

  if (isOveruseFailure) {
    caseType2Status = CaseTwoType.RealTimeValidation_Overuse;
  }

  const isNoLandingData = validatedLandings.some((landing: ICcQueryResult) =>
    !landing.isLandingExists && isNoLandingDataAvailable(landing))

  if (isNoLandingData) {
    caseType2Status = CaseTwoType.RealTimeValidation_NoLandingData;
  }

  const isRejected = validatedLandings.some((landing: ICcQueryResult) => isFailedWeightCheck(landing))
    || validatedLandings.some((landing: ICcQueryResult) => isFailedSpeciesCheck(landing))
    || validatedLandings.some((landing: ICcQueryResult) => isFailedNoLandingDataCheck(landing))
    || validatedLandings.some((landing: ICcQueryResult) => isEmpty(landing.extended.licenceHolder));

  const isDocumentPreApproved = validatedLandings.some(landing => landing.isPreApproved);

  if (isRejected && !isDocumentPreApproved) {
    caseType2Status = CaseTwoType.RealTimeValidation_Rejected;
  }

  return caseType2Status;
}

export function toDynamicsCcCase(
  validatedLandings: ICcQueryResult[] | null,
  catchCertificate: IDocument,
  correlationId: string,
  liveReportType?: CaseTwoType
): IDynamicsCatchCertificateCase {
  const daLookUp = postCodeDaLookup(postCodeToDa);
  const landings: IDynamicsLanding[] = validatedLandings ? validatedLandings.map(_ => toLanding(_)) : null;

  const dynamicsCase: IDynamicsCatchCertificateCase = {
    documentNumber: catchCertificate.documentNumber,
    clonedFrom: catchCertificate.clonedFrom,
    landingsCloned: catchCertificate.landingsCloned,
    parentDocumentVoid: catchCertificate.parentDocumentVoid,
    caseType1: CaseOneType.CatchCertificate,
    caseType2: liveReportType || toDynamicsCase2(validatedLandings),
    numberOfFailedSubmissions: catchCertificate.numberOfFailedAttempts,
    isDirectLanding: validatedLandings ? validatedLandings.some(landing => landing.extended.transportationVehicle === TRANSPORT_VEHICLE_DIRECT) : false,
    documentUrl: catchCertificate.status === DocumentStatuses.Complete ? `${ApplicationConfig.prototype.externalAppUrl}/qr/export-certificates/${catchCertificate.documentUri}` : undefined,
    documentDate: moment.utc(catchCertificate.createdAt).toISOString(),
    exporter: toExporter(catchCertificate),
    landings: landings,
    _correlationId: correlationId,
    requestedByAdmin: catchCertificate.requestByAdmin,
    isUnblocked: validatedLandings ? validatedLandings.some(landing => landing.isPreApproved) : undefined,
    audits: catchCertificate.audit.length ? catchCertificate.audit.map(_ => toAudit(_)) : undefined,
    da: daLookUp(catchCertificate.exportData.exporterDetails.postcode),
    vesselOverriddenByAdmin: validatedLandings ? validatedLandings.some((landing: ICcQueryResult) => landing.extended.vesselOverriddenByAdmin) : undefined,
    speciesOverriddenByAdmin: validatedLandings ? validatedLandings.some((landing: ICcQueryResult) => landing.extended.speciesOverriddenByAdmin) : undefined,
    failureIrrespectiveOfRisk: landings ? toFailureIrrespectiveOfRisk(landings) : false,
    exportedTo: toExportedTo(catchCertificate)
  };

  return dynamicsCase;
}

export function toAudit(systemAudit: IAuditEvent): CertificateAudit {
  const result: CertificateAudit = {
    auditOperation: systemAudit.eventType,
    user: systemAudit.triggeredBy,
    auditAt: systemAudit.timestamp,
    investigationStatus: systemAudit.data?.investigationStatus ? systemAudit.data.investigationStatus : undefined
  }

  return result;
}

export function toFailureIrrespectiveOfRisk(landings: IDynamicsLanding[]): boolean {
  return landings.some(landing => [
    LandingStatusType.ValidationFailure_Weight,
    LandingStatusType.ValidationFailure_Species,
    LandingStatusType.ValidationFailure_NoLandingData,
    LandingStatusType.ValidationFailure_NoLicenceHolder
  ].includes(landing.status));
}