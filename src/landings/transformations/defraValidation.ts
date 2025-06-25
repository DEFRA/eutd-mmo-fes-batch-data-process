import moment from 'moment';
import {
  ccBatchReport,
  isLandingDataLate,
  ICcQueryResult,
  LevelOfRiskType,
  LandingRetrospectiveOutcomeType,
  toDefraCcLandingStatus,
  getIsLegallyDue,
  CertificateLanding,
  ICcBatchValidationReport,
  vesselLookup,
  ILicence
} from 'mmo-shared-reference-data';

import { ApplicationConfig } from '../../config';
import { getVesselsIdx } from '../../data/cache';
import {
   getExportedSpeciesRiskScore,
   getExporterBehaviourRiskScore,
   getTotalRiskScore,
   getVesselOfInterestRiskScore,
   isHighRisk,
   isRiskEnabled,
 } from "../../data/risking";
 import { isRejectedLanding } from '../transformations/dynamicsValidation';


export function toLandings(queryRes: ICcQueryResult[]): CertificateLanding[] {
   return queryRes.map((rawValidatedLanding: ICcQueryResult) => {

      const ccBatchReportForLanding : ICcBatchValidationReport = Array.from(ccBatchReport([rawValidatedLanding][Symbol.iterator]()))[0]
      const licenceLookup = vesselLookup(getVesselsIdx());
      const licence: ILicence = licenceLookup(rawValidatedLanding.extended.pln, rawValidatedLanding.dateLanded);
      const isDataNeverExpected = rawValidatedLanding.extended.dataEverExpected === false;
      const riskScore = rawValidatedLanding.extended.riskScore === undefined ? getTotalRiskScore(
         rawValidatedLanding.extended.pln,
         rawValidatedLanding.species,
         rawValidatedLanding.extended.exporterAccountId,
         rawValidatedLanding.extended.exporterContactId) : rawValidatedLanding.extended.riskScore;

      return {
         startDate: rawValidatedLanding.startDate,
         date: rawValidatedLanding.dateLanded,
         species: {
            name: rawValidatedLanding.extended.species,
            code: rawValidatedLanding.species,
            scientificName: rawValidatedLanding.extended.scientificName
         },
         state: {
            name: rawValidatedLanding.extended.stateName,
            code: rawValidatedLanding.extended.state
         },
         presentation: {
            name: rawValidatedLanding.extended.presentationName,
            code: rawValidatedLanding.extended.presentation
         },
         cnCode: rawValidatedLanding.extended.commodityCode,
         cnCodeDesc: rawValidatedLanding.extended.commodityCodeDescription,
         vessel: {
            name: rawValidatedLanding.extended.vessel,
            pln: rawValidatedLanding.extended.pln,
            length: licence ? licence.vesselLength : null,
            fao: rawValidatedLanding.extended.fao,
            flag: rawValidatedLanding.extended.flag,
            cfr: rawValidatedLanding.extended.cfr
         },
         exportWeight: rawValidatedLanding.weightOnCert,
         exportWeightFactor: rawValidatedLanding.weightFactor,
         gearType: rawValidatedLanding.gearType,
         isLandingDataAvailable: rawValidatedLanding.numberOfLandingsOnDay > 0,
         isDirectLanding: ccBatchReportForLanding.directLanding === 'Y',
         isValidationFailed: ccBatchReportForLanding.FI0_136_numberOfFailedValidations > 0,
         isSpeciesMisMatch: rawValidatedLanding.isLandingExists ? ccBatchReportForLanding.FI0_289_speciesMismatch === 'Fail' : false,
         isExporterLandingOveruse: rawValidatedLanding.isOverusedThisCert,
         isOveruse: rawValidatedLanding.isOverusedAllCerts,
         rss: rawValidatedLanding.rssNumber,
         isNoLandingDataTimeExceeded: ccBatchReportForLanding.FI0_47_unavailabilityExceeds14Days === 'Fail',
         landingBreakdown: rawValidatedLanding.landingTotalBreakdown,
         totalWeightRecordedAgainstLanding: rawValidatedLanding.weightOnLanding,
         daysWithNoLandingData: ccBatchReportForLanding.FI0_41_unavailabilityDuration,
         landedWeightExceededAmount: ccBatchReportForLanding.exportedWeightExceedingEstimateLandedWeight ? Number(ccBatchReportForLanding.exportedWeightExceedingEstimateLandedWeight) : Number(ccBatchReportForLanding.FI0_290_exportedWeightExceedingLandedWeight),
         totalWeightExported: rawValidatedLanding.weightOnAllCerts,
         rawLandingsDataUrl:  ccBatchReportForLanding.rawLandingsUrl.replace('{BASE_URL}',ApplicationConfig.prototype.internalAppUrl),
         rawSalesNotesDataUrl: ccBatchReportForLanding.salesNotesUrl.replace('{BASE_URL}', ApplicationConfig.prototype.internalAppUrl),
         isLegallyDue: getIsLegallyDue(rawValidatedLanding),
         vesselAdministration: rawValidatedLanding.da,
         dataEverExpected: !isDataNeverExpected,
         landingDataExpectedDate: rawValidatedLanding.extended.landingDataExpectedDate,
         landingDataEndDate: rawValidatedLanding.extended.landingDataEndDate,
         landingDataExpectedAtSubmission: (rawValidatedLanding.createdAt !== undefined && rawValidatedLanding.extended.landingDataExpectedDate !== undefined) ? moment.utc(rawValidatedLanding.createdAt).isSameOrAfter(moment.utc(rawValidatedLanding.extended.landingDataExpectedDate), 'day') : undefined,
         isLate: !isDataNeverExpected ? isLandingDataLate(rawValidatedLanding.firstDateTimeLandingDataRetrieved, rawValidatedLanding.extended.landingDataExpectedDate) : undefined,
         dateDataReceived: rawValidatedLanding.firstDateTimeLandingDataRetrieved,
         adminSpecies: rawValidatedLanding.extended.speciesAdmin,
         adminPresentation: rawValidatedLanding.extended.presentationAdmin,
         adminState: rawValidatedLanding.extended.stateAdmin,
         adminCommodityCode: rawValidatedLanding.extended.commodityCodeAdmin,
         speciesOverriddenByAdmin: rawValidatedLanding.extended.speciesOverriddenByAdmin,
         risking: {
            vessel: (rawValidatedLanding.extended.vesselRiskScore ?? getVesselOfInterestRiskScore(rawValidatedLanding.extended.pln)).toString(),
            speciesRisk: (rawValidatedLanding.extended.speciesRiskScore ?? getExportedSpeciesRiskScore(rawValidatedLanding.species)).toString(),
            exporterRiskScore: (rawValidatedLanding.extended.exporterRiskScore ?? getExporterBehaviourRiskScore(rawValidatedLanding.extended.exporterAccountId, rawValidatedLanding.extended.exporterContactId)).toString(),
            landingRiskScore: riskScore.toString(),
            highOrLowRisk: isHighRisk(riskScore, rawValidatedLanding.extended.threshold) ? LevelOfRiskType.High : LevelOfRiskType.Low,
            isSpeciesRiskEnabled: rawValidatedLanding.extended.isSpeciesRiskEnabled ?? isRiskEnabled()
          },
          landingValidationstatusAtRetrospective: toDefraCcLandingStatus(rawValidatedLanding, isHighRisk(riskScore, rawValidatedLanding.extended.threshold)),
          landingOutcomeAtRetrospectiveCheck: isRejectedLanding(rawValidatedLanding) ? LandingRetrospectiveOutcomeType.Failure : LandingRetrospectiveOutcomeType.Success,
      }
   });
}