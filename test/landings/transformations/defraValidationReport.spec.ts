import { ICcQueryResult, CertificateLanding , InvestigationStatus, LandingSources} from 'mmo-shared-reference-data';
import {
  toLandings
} from "../../../src/landings/transformations/defraValidation";
import * as shared from "mmo-shared-reference-data";
import { ApplicationConfig } from '../../../src/config';
import moment from 'moment';
import  * as isHighRisk from '../../../src/data/risking';
import * as DynamicValidations from '../../../src/landings/transformations/dynamicsValidation';

describe('toLandings', () => {
  const queryTime = moment.utc()
  const input: ICcQueryResult = {
    documentNumber: 'CC1',
    documentType: 'catchCertificate',
    createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
    status: 'COMPLETE',
    rssNumber: 'rssWA1',
    da: 'Guernsey',
    startDate: moment.utc('2019-07-10').format('YYYY-MM-DD'),
    dateLanded: moment.utc('2019-07-10').format('YYYY-MM-DD'),
    species: 'LBE',
    weightOnCert: 121,
    rawWeightOnCert: 122,
    weightOnAllCerts: 200,
    weightOnAllCertsBefore: 0,
    weightOnAllCertsAfter: 100,
    weightFactor: 5,
    gearType: "Type 1",
    isLandingExists: true,
    isSpeciesExists: true,
    numberOfLandingsOnDay: 1,
    weightOnLanding: 30,
    weightOnLandingAllSpecies: 30,
    landingTotalBreakdown: [
      {
        factor: 1,
        isEstimate: true,
        weight: 30,
        liveWeight: 30,
        source: LandingSources.CatchRecording
      }
    ],
    isOverusedThisCert: true,
    isOverusedAllCerts: true,
    isExceeding14DayLimit: false,
    overUsedInfo: [],
    durationSinceCertCreation: moment.duration(
      queryTime
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
    durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
      moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
    durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
      moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
    firstDateTimeLandingDataRetrieved: moment.utc('2023-01-01T00:00:00.000Z').toISOString(),
    extended: {
      landingId: 'rssWA12019-07-10',
      exporterName: 'Mr Bob',
      exporterPostCode: 'SE1 2XX',
      exportTo: 'Italy',
      presentation: 'SLC',
      presentationName: 'sliced',
      vessel: 'DAYBREAK',
      fao: 'FAO27',
      pln: 'WA1',
      flag: 'GBR',
      cfr: 'GBRC20514',
      highSeasArea: 'yes',
      exclusiveEconomicZones: [
        {
          officialCountryName: "Nigeria", 
          isoCodeAlpha2: "NG", 
          isoCodeAlpha3: "NGA", 
          isoNumericCode: "566"
        }, 
        { 
          officialCountryName: "France",
          isoCodeAlpha2: "FR",
          isoCodeAlpha3: "FRA",
          isoNumericCode: "250"
        }
      ],
      rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
      species: 'Lobster',
      state: 'FRE',
      stateName: 'fresh',
      commodityCode: '1234',
      commodityCodeAdmin: '1234 - ADMIN',
      investigation: {
        investigator: "Investigator Gadget",
        status: InvestigationStatus.Open
      },
      transportationVehicle: 'directLanding',
      isLegallyDue: false,
      dataEverExpected: true,
      landingDataExpectedDate: '2023-02-05',
      landingDataEndDate: '2023-02-06'
    }
  }

  let mockLicenceLookUp;
  let mockVesselLookup;
  let mockGetTotalRiskScore;
  let mockIsRejectedLAnding


  beforeEach(() => {
    mockLicenceLookUp = jest.fn().mockImplementation(() => ({
      vesselLength: 10,
      adminPort: 'testPort',
      flag: 'GBR',
      rssNumber: 'some-rssNumber',
      da: 'England',
      homePort: 'some-home-port',
      imoNumber: null,
      licenceNumber: 'licence-number',
      licenceValidTo: '2023-01-01',
      licenceHolder: 'some licence holder'
    }));
    mockVesselLookup = jest.spyOn(shared, 'vesselLookup').mockImplementation(() => mockLicenceLookUp);
    mockGetTotalRiskScore = jest.spyOn(isHighRisk, 'getTotalRiskScore');
    mockGetTotalRiskScore.mockReturnValue(1.0);
    mockIsRejectedLAnding = jest.spyOn(DynamicValidations, 'isRejectedLanding');
    mockIsRejectedLAnding.mockReturnValue(true);
  });

  afterEach(() => {
    mockLicenceLookUp.mockRestore();
    mockVesselLookup.mockRestore();
  });

  it('should map all 1 to 1 root properties that require no behaviour', () => {
    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].exportWeight).toEqual(121);
    expect(result[0].daysWithNoLandingData).toEqual("0.0.0.0");
    expect(result[0].isDirectLanding).toEqual(true);
    expect(result[0].totalWeightRecordedAgainstLanding).toEqual(30);
    expect(result[0].totalWeightExported).toEqual(200);
    expect(result[0].totalWeightExported).toEqual(200);
    expect(result[0].isNoLandingDataTimeExceeded).toEqual(false);
    expect(result[0].exportWeightFactor).toEqual(5);
    expect(result[0].landingBreakdown).toEqual([
      {
        factor: 1,
        isEstimate: true,
        weight: 30,
        liveWeight: 30,
        source: LandingSources.CatchRecording
      }
    ]);
    expect(result[0].isLandingDataAvailable).toEqual(true);
    expect(result[0].rss).toEqual('rssWA1');
    expect(result[0].isSpeciesMisMatch).toEqual(false);
    expect(result[0].isOveruse).toEqual(true);
    expect(result[0].isExporterLandingOveruse).toEqual(true);
    expect(result[0].isValidationFailed).toEqual(true);
    expect(result[0].startDate).toEqual('2019-07-10');
    expect(result[0].date).toEqual('2019-07-10');
    expect(result[0].cnCode).toEqual('1234');
    expect(result[0].isLegallyDue).toBe(false);
  });

  it('should check is Low risk', () => {
    const inputData: ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      startDate: moment.utc('2019-07-10').format('YYYY-MM-DD'),
      dateLanded: moment.utc('2019-07-10').format('YYYY-MM-DD'),
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      firstDateTimeLandingDataRetrieved: moment.utc('2023-01-01T00:00:00.000Z').toISOString(),
      extended: {
        landingId: 'rssWA12019-07-10',
        exporterName: 'Mr Bob',
        exporterPostCode: 'SE1 2XX',
        exportTo: 'Italy',
        presentation: 'SLC',
        presentationName: 'sliced',
        vessel: 'DAYBREAK',
        fao: 'FAO27',
        pln: 'WA1',
        flag: 'GBR',
        cfr: 'GBRC20514',
        species: 'Lobster',
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '1234',
        commodityCodeAdmin: '1234 - ADMIN',
        investigation: {
          investigator: "Investigator Gadget",
          status: InvestigationStatus.Open
        },
        transportationVehicle: 'directLanding',
        isLegallyDue: false,
        dataEverExpected: false,
        landingDataExpectedDate: '2023-02-05',
        landingDataEndDate: '2023-02-06'
      }
    }
    mockGetTotalRiskScore.mockReturnValue(0);
    mockIsRejectedLAnding.mockReturnValue(false);
    const result: CertificateLanding[] = toLandings([inputData]);

    expect(result[0].exportWeight).toEqual(121);
    expect(result[0].daysWithNoLandingData).toEqual("0.0.0.0");
    expect(result[0].isDirectLanding).toEqual(true);
    expect(result[0].totalWeightRecordedAgainstLanding).toEqual(30);
    expect(result[0].totalWeightExported).toEqual(200);
    expect(result[0].totalWeightExported).toEqual(200);
    expect(result[0].isNoLandingDataTimeExceeded).toEqual(false);
    expect(result[0].exportWeightFactor).toEqual(5);
    expect(result[0].landingBreakdown).toEqual([
      {
        factor: 1,
        isEstimate: true,
        weight: 30,
        liveWeight: 30,
        source: LandingSources.CatchRecording
      }
    ]);
    expect(result[0].isLandingDataAvailable).toEqual(true);
    expect(result[0].rss).toEqual('rssWA1');
    expect(result[0].isSpeciesMisMatch).toEqual(false);
    expect(result[0].isOveruse).toEqual(true);
    expect(result[0].isExporterLandingOveruse).toEqual(true);
    expect(result[0].isValidationFailed).toEqual(true);
    expect(result[0].startDate).toEqual('2019-07-10');
    expect(result[0].date).toEqual('2019-07-10');
    expect(result[0].cnCode).toEqual('1234');
    expect(result[0].isLegallyDue).toBe(false);
  });

  it('will show the amount you are exceeded by for actual landings', () => {
    const input: ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: moment.utc('2019-07-10').format('YYYY-MM-DD'),
      species: 'LBE',
      weightOnCert: 200,
      rawWeightOnCert: 200,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 200,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 60,
      weightOnLandingAllSpecies: 60,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: false,
          weight: 30,
          liveWeight: 30,
          source: LandingSources.LandingDeclaration
        },
        {
          factor: 1,
          isEstimate: false,
          weight: 30,
          liveWeight: 30,
          source: LandingSources.LandingDeclaration
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        landingId: 'rssWA12019-07-10',
        exporterName: 'Mr Bob',
        exporterPostCode: 'XX1 2XX',
        presentation: 'SLC',
        presentationName: 'sliced',
        vessel: 'DAYBREAK',
        fao: 'FAO27',
        pln: 'WA1',
        species: 'Lobster',
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '1234',
        investigation: {
          investigator: "Investigator Gadget",
          status: InvestigationStatus.Open
        }
      }
    }

    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].landedWeightExceededAmount).toEqual(140);
  });

  it('will show the amount you are exceeded by for estimated landings with the 10% tolerance', () => {
    const input: ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: moment.utc('2019-07-10').format('YYYY-MM-DD'),
      species: 'LBE',
      weightOnCert: 200,
      rawWeightOnCert: 200,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 200,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 60,
      weightOnLandingAllSpecies: 60,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: LandingSources.ELog
        },
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: LandingSources.ELog
        }
      ],
      overUsedInfo: [],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        landingId: 'rssWA12019-07-10',
        exporterName: 'Mr Bob',
        exporterPostCode: 'XX1 2XX',
        presentation: 'SLC',
        presentationName: 'sliced',
        vessel: 'DAYBREAK',
        fao: 'FAO27',
        pln: 'WA1',
        species: 'Lobster',
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '1234',
        investigation: {
          investigator: "Investigator Gadget",
          status: InvestigationStatus.Open
        }
      }
    }

    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].landedWeightExceededAmount).toEqual(134);
  })

  it('should map fully qualified urls for external information', () => {
    ApplicationConfig.prototype.internalAppUrl = "http://localhost:6500"

    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].rawLandingsDataUrl)
      .toEqual(`http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2019-07-10&rssNumber=rssWA1`);
    expect(result[0].rawSalesNotesDataUrl)
      .toEqual(`http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2019-07-10&rssNumber=rssWA1`);
  });

  it('should map the species code and name', () => {
    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].species).toEqual({
      name: "Lobster",
      code: "LBE"
    });
  });

  it('should map the state name and code', () => {
    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].state).toEqual({
      name: "fresh",
      code: "FRE"
    });
  });

  it('should map the presentation name and code', () => {
    const result: CertificateLanding[] = toLandings([input]);
    expect(result[0].presentation).toEqual({
      name: "sliced",
      code: "SLC"
    });
  });

  it('should map a vessel over 10M', () => {
    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].vessel).toEqual({
      name: "DAYBREAK",
      pln: "WA1",
      length: 10,
      fao: "FAO27",
      flag: "GBR",
      cfr: "GBRC20514"
    });
  });

  it('should map a vessel less than 10M', () => {
    mockLicenceLookUp = jest.fn().mockImplementation(() => ({
      vesselLength: 8,
      adminPort: 'testPort',
      flag: 'GBR',
      rssNumber: 'some-rssNumber',
      da: 'England',
      homePort: 'some-home-port',
      imoNumber: null,
      licenceNumber: 'licence-number',
      licenceValidTo: '2023-01-01',
      licenceHolder: 'some licence holder'
    }));

    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].vessel).toEqual({
      name: "DAYBREAK",
      pln: "WA1",
      length: 8,
      fao: "FAO27",
      flag: "GBR",
      cfr: "GBRC20514"
    });
  })

  it('should map correctly the isLegally due', () => {
    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].isLegallyDue).toBe(false);
  })

  it('should map isSpeciesMisMatch as false when no landing exists', () => {
    const input: ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: moment.utc('2019-07-10').format('YYYY-MM-DD'),
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: false,
      isSpeciesExists: false,
      numberOfLandingsOnDay: 0,
      weightOnLanding: 0,
      weightOnLandingAllSpecies: 0,
      landingTotalBreakdown: [],
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: null,
      durationBetweenCertCreationAndLastLandingRetrieved: null,
      extended: {
        landingId: 'rssWA12019-07-10',
        exporterName: 'Mr Bob',
        presentation: 'SLC',
        presentationName: 'sliced',
        vessel: 'DAYBREAK',
        fao: 'FAO27',
        pln: 'WA1',
        species: 'Lobster',
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '1234',
        investigation: {
          investigator: "Investigator Gadget",
          status: InvestigationStatus.Open
        },
        transportationVehicle: 'directLanding'
      }
    }

    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].isSpeciesMisMatch).toEqual(false);
  });

  it('should map a cfr and a flag', () => {
    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].vessel.cfr).toBe("GBRC20514");
    expect(result[0].vessel.flag).toBe("GBR");
  });

  it('should map the validation out when vessel details is undefined', () => {
    mockLicenceLookUp.mockReturnValue(undefined);

    const result: CertificateLanding[] = toLandings([{
      ...input,
      extended: {
        ...input.extended,
        cfr: undefined
      }
    }]);

    expect(result).toBeDefined();
  });

  it('should map EoD related data', () => {
    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].vesselAdministration).toBe('Guernsey');
    expect(result[0].dataEverExpected).toBe(true);
    expect(result[0].landingDataExpectedDate).toBe('2023-02-05');
    expect(result[0].landingDataEndDate).toBe('2023-02-06');
    expect(result[0].landingDataExpectedAtSubmission).toBe(false);
    expect(result[0].isLate).toBe(false);
    expect(result[0].dateDataReceived).toBe('2023-01-01T00:00:00.000Z');
  })

  it('should read the risk details from input object and sets risk as Low', () => {
    const result: CertificateLanding[] = toLandings([{
      ...input,
      extended: {
        ...input.extended,
        exporterRiskScore: 0.3,
        riskScore: 0.2,
        threshold: 1,
        speciesRiskScore: 0.1,
        isSpeciesRiskEnabled: false,
        vesselRiskScore: 1
      }
    }]);
    expect(result[0]).toStrictEqual(
      {
        "adminCommodityCode": "1234 - ADMIN",
        "adminPresentation": undefined,
        "adminSpecies": undefined,
        "adminState": undefined,
        "cnCode": "1234",
        "cnCodeDesc": undefined,
        "dataEverExpected": true,
        "startDate": "2019-07-10",
        "date": "2019-07-10",
        "dateDataReceived": "2023-01-01T00:00:00.000Z",
        "daysWithNoLandingData": "0.0.0.0",
        "exportWeight": 121,
        "gearType": "Type 1",
        "highSeasArea": 'yes',
        "exclusiveEconomicZones": [
          {
            "officialCountryName": "Nigeria", 
            "isoCodeAlpha2": "NG", 
            "isoCodeAlpha3": "NGA", 
            "isoNumericCode": "566"
          }, 
          { 
            "officialCountryName": "France",
            "isoCodeAlpha2": "FR",
            "isoCodeAlpha3": "FRA",
            "isoNumericCode": "250"
          }
        ],
        "rfmo": 'General Fisheries Commission for the Mediterranean (GFCM)',
        "exportWeightFactor": 5,
        "isDirectLanding": true,
        "isExporterLandingOveruse": true,
        "isLandingDataAvailable": true,
        "isLate": false,
        "isLegallyDue": false,
        "isNoLandingDataTimeExceeded": false,
        "isOveruse": true,
        "isSpeciesMisMatch": false,
        "isValidationFailed": true,
        "landedWeightExceededAmount": 167,
        "landingBreakdown": [
          {
            "factor": 1,
            "isEstimate": true,
            "liveWeight": 30,
            "source": "CATCH_RECORDING",
            "weight": 30
          }
        ],
        "landingDataEndDate": "2023-02-06",
        "landingDataExpectedAtSubmission": false,
        "landingDataExpectedDate": "2023-02-05",
        "landingOutcomeAtRetrospectiveCheck": "Failure",
        "landingValidationstatusAtRetrospective": "Validation Failure - No Licence Holder",
        "presentation": {
          "code": "SLC",
          "name": "sliced"
        },
        "rawLandingsDataUrl": "http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2019-07-10&rssNumber=rssWA1",
        "rawSalesNotesDataUrl": "http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2019-07-10&rssNumber=rssWA1",
        "risking": {
          "exporterRiskScore": "0.3",
          "highOrLowRisk": "Low",
          "isSpeciesRiskEnabled": false,
          "landingRiskScore": "0.2",
          "speciesRisk": "0.1",
          "vessel": "1"
        },
        "rss": "rssWA1",
        "species": {
          "code": "LBE",
          "name": "Lobster",
          "scientificName": undefined
        },
        "speciesOverriddenByAdmin": undefined,
        "state": {
          "code": "FRE",
          "name": "fresh"
        },
        "totalWeightExported": 200,
        "totalWeightRecordedAgainstLanding": 30,
        "vessel": {
          "cfr": "GBRC20514",
          "fao": "FAO27",
          "flag": "GBR",
          "length": 10,
          "name": "DAYBREAK",
          "pln": "WA1"
        },
        "vesselAdministration": "Guernsey"
      }
    );
  });
});

describe('toDefraSdStorageFacility', () => {
  const { toDefraSdStorageFacility } = require("../../../src/landings/transformations/defraValidation");

  it('should return undefined when sdStorageFacility is null', () => {
    const result = toDefraSdStorageFacility(null);
    expect(result).toBeUndefined();
  });

  it('should return undefined when sdStorageFacility is undefined', () => {
    const result = toDefraSdStorageFacility(undefined);
    expect(result).toBeUndefined();
  });

  it('should map all fields correctly when sdStorageFacility is provided', () => {
    const input = {
      facilityName: 'Test Facility',
      facilityBuildingNumber: '123',
      facilitySubBuildingName: 'Unit A',
      facilityBuildingName: 'Warehouse',
      facilityStreetName: 'Test Street',
      facilityCounty: 'Test County',
      facilityCountry: 'UK',
      facilityAddressOne: 'Line 1',
      facilityTownCity: 'Test City',
      facilityPostcode: 'TE1 1ST',
      facilityArrivalDate: '15/01/2021',
      facilityApprovalNumber: 'APPR-001',
      facilityStorage: 'Cold Storage'
    };

    const result = toDefraSdStorageFacility(input);

    expect(result.name).toEqual('Test Facility');
    expect(result.address.building_number).toEqual('123');
    expect(result.address.sub_building_name).toEqual('Unit A');
    expect(result.address.building_name).toEqual('Warehouse');
    expect(result.address.street_name).toEqual('Test Street');
    expect(result.address.county).toEqual('Test County');
    expect(result.address.country).toEqual('UK');
    expect(result.address.line1).toEqual('Line 1');
    expect(result.address.city).toEqual('Test City');
    expect(result.address.postCode).toEqual('TE1 1ST');
    expect(result.dateOfUnloading).toEqual('2021-01-15');
    expect(result.approvalNumber).toEqual('APPR-001');
    expect(result.productHandling).toEqual('Cold Storage');
  });

  it('should return undefined for approvalNumber when it is empty', () => {
    const input = {
      facilityName: 'Test Facility',
      facilityArrivalDate: '15/01/2021',
      facilityApprovalNumber: ''
    };

    const result = toDefraSdStorageFacility(input);

    expect(result.approvalNumber).toBeUndefined();
  });

  it('should return undefined for productHandling when it is empty', () => {
    const input = {
      facilityName: 'Test Facility',
      facilityArrivalDate: '15/01/2021',
      facilityStorage: ''
    };

    const result = toDefraSdStorageFacility(input);

    expect(result.productHandling).toBeUndefined();
  });
});
