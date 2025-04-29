import moment from "moment";
import {
  type ICcBatchValidationReport,
  type IDynamicsLandingCase,
  type ICcQueryResult,
  type IDocument,
  type IDynamicsLanding,
  LandingSources,
  isElog,
  isWithinDeminimus,
  isLandingDataExpectedAtSubmission,
  isInRetrospectivePeriod,
  isLandingDataLate,
  ccBatchReport,
  toLandingStatus,
  LevelOfRiskType,
  toExporter,
  toExportedTo,
  LandingRetrospectiveOutcomeType,
  has14DayLimitReached,
  postCodeDaLookup,
  postCodeToDa,
  DocumentStatuses,
  TRANSPORT_VEHICLE_DIRECT,
  toFailureIrrespectiveOfRisk,
  LandingStatusType,
  ICountry
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
import { isEmpty } from "lodash";
import { CertificateAudit, CertificateCompany, IAuditEvent } from "../../types/defraValidation";
import { ISdPsQueryResult } from "../../types/query";
import {  IDynamicsStorageDocumentCase, IDynamicsStorageDocumentProduct, SdPsCaseTwoType, SdPsStatus } from "../../types/dynamicsValidationSdPs";

export const isSpeciesFailure = (func: (riskScore: number, threshold?: number) => boolean) => (
  enabled: boolean,
  isSpeciesExists: boolean,
  riskScore: number,
  threshold?: number
): boolean => {
  if (isSpeciesExists) {
    return false;
  }

  if (enabled) {
    return func(riskScore, threshold);
  }

  return true;
}

const getRiskScore = (ccQueryLanding: ICcQueryResult): number => {
  const riskScore = ccQueryLanding.extended.riskScore === undefined ? getTotalRiskScore(
    ccQueryLanding.extended.pln,
    ccQueryLanding.species,
    ccQueryLanding.extended.exporterAccountId,
    ccQueryLanding.extended.exporterContactId) : ccQueryLanding.extended.riskScore;
  return riskScore;
}

const isFailedWeightCheck = (ccQueryLanding: ICcQueryResult) =>
  ccQueryLanding.isSpeciesExists &&
  ccQueryLanding.isOverusedThisCert &&
  isHighRisk(getRiskScore(ccQueryLanding), ccQueryLanding.extended.threshold)

const isFailedSpeciesCheck = (ccQueryLanding: ICcQueryResult) => {
  return isSpeciesFailure(isHighRisk)(ccQueryLanding.extended.isSpeciesRiskEnabled ?? isRiskEnabled(), ccQueryLanding.isSpeciesExists, getRiskScore(ccQueryLanding), ccQueryLanding.extended.threshold) &&
  !isElog(isWithinDeminimus)(ccQueryLanding) &&
  ccQueryLanding.isLandingExists
}

const isFailedNoLandingDataCheck = (ccQueryLanding: ICcQueryResult) =>
  !ccQueryLanding.isLandingExists &&
  isHighRisk(getRiskScore(ccQueryLanding), ccQueryLanding.extended.threshold) &&
  ((ccQueryLanding.extended.dataEverExpected !== false && isLandingDataExpectedAtSubmission(ccQueryLanding.createdAt, ccQueryLanding.extended.landingDataExpectedDate)) || ccQueryLanding.extended.vesselOverriddenByAdmin)


const isFailedNoLandingDataCheckAtRetro = (ccQueryLanding: ICcQueryResult) => !ccQueryLanding.isLandingExists &&
  isHighRisk(getRiskScore(ccQueryLanding), ccQueryLanding.extended.threshold) &&
  ((ccQueryLanding.extended.dataEverExpected !== false && isLandingDataExpectedAtRetro(ccQueryLanding.extended.landingDataExpectedDate)) || ccQueryLanding.extended.vesselOverriddenByAdmin)

const pendingLandingDataRetrospectiveTransformation = (status: LandingStatusType) => {
  if (status === LandingStatusType.PendingLandingData_ElogSpecies) {
    return LandingStatusType.PendingLandingData
  } else if (status === LandingStatusType.PendingLandingData_DataExpected) {
    return LandingStatusType.PendingLandingData
  } else if (status === LandingStatusType.PendingLandingData_DataNotYetExpected) {
    return LandingStatusType.PendingLandingData
  } else {
    return status;
  }
}

export const isLandingDataExpectedAtRetro = (landingExpectedDate: string): boolean => 
  landingExpectedDate === undefined ? true : moment.utc().isSameOrAfter(moment.utc(landingExpectedDate), 'day');

export const isRejectedLanding = (ccQuery: ICcQueryResult): boolean => (
  isFailedWeightCheck(ccQuery)
  || isFailedSpeciesCheck(ccQuery)
  || isFailedNoLandingDataCheckAtRetro(ccQuery)) && !ccQuery.isPreApproved

export function toLanding(validatedLanding: ICcQueryResult): IDynamicsLanding {
  const ccBatchReportForLanding: ICcBatchValidationReport = Array.from(ccBatchReport([validatedLanding][Symbol.iterator]()))[0];
  const hasLegalTimeLimitPassed = (validatedLanding.extended.vesselOverriddenByAdmin && !validatedLanding.rssNumber) ? false : validatedLanding.extended.isLegallyDue;

  const riskScore = validatedLanding.extended.riskScore === undefined ? getTotalRiskScore(
    validatedLanding.extended.pln,
    validatedLanding.species,
    validatedLanding.extended.exporterAccountId,
    validatedLanding.extended.exporterContactId) : validatedLanding.extended.riskScore;

  const isDataNeverExpected = validatedLanding.extended.dataEverExpected === false;
  const hasLandingData = !isDataNeverExpected && validatedLanding.firstDateTimeLandingDataRetrieved !== undefined
  const landingStatus = toLandingStatus(validatedLanding, isHighRisk(riskScore, validatedLanding.extended.threshold));
  const riskingObject = getRiskingObject(validatedLanding, riskScore);
  const validationObject = getValidationObject(validatedLanding, ccBatchReportForLanding, isDataNeverExpected, hasLegalTimeLimitPassed);
  return {
    status: pendingLandingDataRetrospectiveTransformation(landingStatus),
    id: validatedLanding.extended.landingId,
    landingDate: validatedLanding.dateLanded,
    startDate: validatedLanding.startDate,
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
    isLate: hasLandingData ? isLandingDataLate(moment.utc(validatedLanding.firstDateTimeLandingDataRetrieved).subtract(1, 'day').toISOString(), validatedLanding.extended.landingDataExpectedDate) : undefined,
    dateDataReceived: hasLandingData ? moment.utc(validatedLanding.firstDateTimeLandingDataRetrieved).subtract(1, 'day').toISOString() : undefined,
    validation: validationObject,
    risking: riskingObject,
    landingDataExpectedAtSubmission: !isDataNeverExpected ? isLandingDataExpectedAtSubmission(validatedLanding.createdAt, validatedLanding.extended.landingDataExpectedDate) : undefined,
    landingOutcomeAtRetrospectiveCheck: isRejectedLanding(validatedLanding) ? LandingRetrospectiveOutcomeType.Failure : LandingRetrospectiveOutcomeType.Success,
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
    vessel: (validatedLanding.extended.vesselRiskScore ?? getVesselOfInterestRiskScore(validatedLanding.extended.pln)).toString(),
    speciesRisk: (validatedLanding.extended.speciesRiskScore ?? getExportedSpeciesRiskScore(validatedLanding.species)).toString(),
    exporterRiskScore: (validatedLanding.extended.exporterRiskScore ?? getExporterBehaviourRiskScore(validatedLanding.extended.exporterAccountId, validatedLanding.extended.exporterContactId)).toString(),
    landingRiskScore: riskScore.toString(),
    highOrLowRisk: isHighRisk(riskScore, validatedLanding.extended.threshold) ? LevelOfRiskType.High : LevelOfRiskType.Low,
    isSpeciesRiskEnabled: validatedLanding.extended.isSpeciesRiskEnabled ?? isRiskEnabled()
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
  isHighRisk(getRiskScore(item), item.extended.threshold) &&
  item.isOverusedAllCerts

const isNoLandingDataAvailable = (ccQuery: ICcQueryResult) =>
  ccQuery.extended.dataEverExpected !== false &&
  moment.utc(ccQuery.createdAt).isAfter(moment.utc(ccQuery.extended.landingDataEndDate), 'day');

export function toDynamicsCase2(validatedLandings: ICcQueryResult[]): CaseTwoType {
  let caseType2Status: CaseTwoType = CaseTwoType.Success;

  const dataNeverExpected = validatedLandings.some((landing: ICcQueryResult) => landing.extended.dataEverExpected === false &&
    isHighRisk(getRiskScore(landing), landing.extended.threshold));

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

export function toExporterPsSd(psSdCertificate: any): CertificateCompany {  
  return {
    companyName: psSdCertificate.exportData.exporterDetails.exporterCompanyName,
    contactId: psSdCertificate.exportData.exporterDetails.contactId,
    accountId: psSdCertificate.exportData.exporterDetails.accountId,
    address: {
      building_number: psSdCertificate.exportData.exporterDetails.buildingNumber,
      sub_building_name: psSdCertificate.exportData.exporterDetails.subBuildingName,
      building_name: psSdCertificate.exportData.exporterDetails.buildingName,
      street_name: psSdCertificate.exportData.exporterDetails.streetName,
      county: psSdCertificate.exportData.exporterDetails.county,
      country: psSdCertificate.exportData.exporterDetails.country,
      line1: psSdCertificate.exportData.exporterDetails.addressOne,
      city: psSdCertificate.exportData.exporterDetails.townCity,
      postCode: psSdCertificate.exportData.exporterDetails.postcode
    },
    dynamicsAddress: psSdCertificate.exportData.exporterDetails._dynamicsAddress
  };
}
export function toSdPsCaseTwoType(validatedSdPsCatches: ISdPsQueryResult[]) {
  let output = SdPsCaseTwoType.RealTimeValidation_Success;
  const isMisMatch = validatedSdPsCatches.filter(_ => _.isMismatch).length > 0;
  const isOverUse = validatedSdPsCatches.filter(_ => _.isOverAllocated).length > 0;
  if (isMisMatch) output = SdPsCaseTwoType.RealTimeValidation_Weight;
  if (isOverUse) output = SdPsCaseTwoType.RealTimeValidation_Overuse;
  return output;
}
export function toSpeciesCode(speciesWithCode: string | undefined): string | undefined {
  if (speciesWithCode) {
    const regex = /(.*) \((.*)\)/g;
    const matches = regex.exec(speciesWithCode);
    if (matches && matches.length >= 3) {
      return matches[2];
    }
  }
}
export function toExportedToSd(psSdCertificate: IDocument): ICountry {
  return {
    officialCountryName: psSdCertificate.exportData?.exportedTo?.officialCountryName,
    isoCodeAlpha2: psSdCertificate.exportData?.exportedTo?.isoCodeAlpha2,
    isoCodeAlpha3: psSdCertificate.exportData?.exportedTo?.isoCodeAlpha3
  }
}
export function toDynamicsSd(
  validatedSdProducts: ISdPsQueryResult[] | null,
  storageDocument: IDocument,
  correlationId: string,
  caseTypeTwo?: SdPsCaseTwoType
): IDynamicsStorageDocumentCase {
  const daLookUp = postCodeDaLookup(postCodeToDa);
  return {
    exporter: toExporterPsSd(storageDocument),
    documentUrl: `${ApplicationConfig.prototype.externalAppUrl}/qr/export-certificates/${storageDocument.documentUri}`,
    documentDate: moment.utc(storageDocument.createdAt).toISOString(),
    caseType1: CaseOneType.StorageDocument,
    caseType2: caseTypeTwo || toSdPsCaseTwoType(validatedSdProducts),
    numberOfFailedSubmissions: storageDocument.numberOfFailedAttempts,
    documentNumber: storageDocument.documentNumber,
    clonedFrom: storageDocument.clonedFrom,
    parentDocumentVoid: storageDocument.parentDocumentVoid,
    companyName: storageDocument.exportData.exporterDetails.exporterCompanyName,
    products: validatedSdProducts ? validatedSdProducts.map(_ => toSdProduct(_)) : undefined,
    da: daLookUp(storageDocument.exportData.exporterDetails.postcode),
    _correlationId: correlationId,
    requestedByAdmin: storageDocument.requestByAdmin,
    exportedTo: toExportedToSd(storageDocument)
  };
}
export function toSdProduct(validatedSdProducts: ISdPsQueryResult): IDynamicsStorageDocumentProduct {
  let status = SdPsStatus.Success;
  if (validatedSdProducts.isMismatch) {
    status = SdPsStatus.Weight
  }
  if (validatedSdProducts.isOverAllocated) {
    status = SdPsStatus.Overuse
  }
  return {
    foreignCatchCertificateNumber: validatedSdProducts.catchCertificateNumber,
    isDocumentIssuedInUK: validatedSdProducts.catchCertificateType === 'uk',
    species: toSpeciesCode(validatedSdProducts.species),
    id: validatedSdProducts.extended.id,
    cnCode: validatedSdProducts.commodityCode,
    scientificName: validatedSdProducts.scientificName,
    importedWeight: validatedSdProducts.weightOnFCC,
    exportedWeight: validatedSdProducts.weightOnDoc,
    validation: {
      totalWeightExported: validatedSdProducts.weightOnAllDocs,
      status: status,
      weightExceededAmount: validatedSdProducts.overAllocatedByWeight,
      overuseInfo: validatedSdProducts.overUsedInfo.some(_ => _ !== validatedSdProducts.documentNumber)
        ? validatedSdProducts.overUsedInfo.filter(_ => _ !== validatedSdProducts.documentNumber) : undefined
    }
  }
}
