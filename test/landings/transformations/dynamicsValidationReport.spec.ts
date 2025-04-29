import moment from "moment";
import { ApplicationConfig } from "../../../src/config";
import * as SUT from "../../../src/landings/transformations/dynamicsValidation";
import * as Cache from "../../../src/data/cache";
import * as risking from '../../../src/data/risking';
import * as Vessel from '../../../src/data/vessel';
import  * as Shared from 'mmo-shared-reference-data' ;
import { ISdPsQueryResult } from "../../../src/types/query";
import { SdPsCaseTwoType, SdPsStatus } from "../../../src/types/dynamicsValidationSdPs";

const queryTime = moment.utc();

const exampleCc: Shared.IDocument = {
  "createdAt": new Date("2020-06-24T10:39:32.000Z"),
  "__t": "catchCert",
  "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
  "status": "COMPLETE",
  "documentNumber": "GBR-2020-CC-1BC924FCF",
  "requestByAdmin": false,
  "audit": [
    {
      "eventType": "INVESTIGATED",
      "triggeredBy": "Chris Waugh",
      "timestamp": new Date("2020-06-24T10:40:18.780Z"),
      "data": {
        "investigationStatus": "UNDER_INVESTIGATION"
      }
    },
    {
      "eventType": "INVESTIGATED",
      "triggeredBy": "Chris Waugh",
      "timestamp": new Date("2020-06-24T10:40:23.439Z"),
      "data": {
        "investigationStatus": "CLOSED_NFA"
      }
    }
  ],
  "userReference": "MY REF",
  "exportData": {
    "exporterDetails": {
      "contactId": "a contact id",
      "accountId": "an account id",
      "exporterFullName": "Bob Exporter",
      "exporterCompanyName": "Exporter Co",
      "addressOne": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
      "townCity": "T",
      "postcode": "AB1 1AB",
      "buildingNumber": "123",
      "subBuildingName": "Unit 1",
      "buildingName": "CJC Fish Ltd",
      "streetName": "17  Old Edinburgh Road",
      "county": "West Midlands",
      "country": "England",
      "_dynamicsAddress": { "dynamicsData": 'original address' },
      "_dynamicsUser": {
        "firstName": 'Bob',
        "lastName": 'Exporter'
      }
    },
    "products": [
      {
        "species": "European lobster (LBE)",
        "speciesId": "4e5fff23-184c-4a46-beef-e93ccd040392",
        "speciesCode": "LBE",
        "commodityCode": "03063210",
        "commodityCodeDescription": "Fresh or chilled fillets of cod \"Gadus morhua, Gadus ogac, Gadus macrocephalus\" and of Boreogadus saida",
        "scientificName": "Gadus morhua",
        "state": {
          "code": "ALI",
          "name": "Alive"
        },
        "presentation": {
          "code": "WHL",
          "name": "Whole"
        },
        "factor": 1,
        "caughtBy": [
          {
            "vessel": "WIRON 5",
            "pln": "H1100",
            "id": "5a259dc5-b05c-44fe-8d3f-7ee8cc99bfca",
            "date": "2020-06-24",
            "faoArea": "FAO27",
            "weight": 100
          }
        ]
      },
      {
        "species": "Atlantic cod (COD)",
        "speciesId": "6763576e-c5b8-41cf-a708-f4b9a470623e",
        "speciesCode": "COD",
        "commodityCode": "03025110",
        "state": {
          "code": "FRE",
          "name": "Fresh"
        },
        "presentation": {
          "code": "GUT",
          "name": "Gutted"
        },
        "factor": 1.17,
        "caughtBy": [
          {
            "vessel": "WIRON 5",
            "pln": "H1100",
            "id": "2e9da3e5-5e31-4555-abb4-9e5e53b8d0ef",
            "date": "2020-06-02",
            "faoArea": "FAO27",
            "weight": 200
          },
          {
            "vessel": "WIRON 6",
            "pln": "H2200",
            "id": "4cf6cb44-28ad-4731-bea4-05051ae2edd9",
            "date": "2020-05-31",
            "faoArea": "FAO27",
            "weight": 200
          }
        ]
      }
    ],
    "conservation": {
      "conservationReference": "UK Fisheries Policy"
    },
    "transportation": {
      "vehicle": "truck",
      "exportedFrom": "United Kingdom",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGA",
        "isoNumericCode": "566"
      },
      "cmr": true
    }
  },
  "createdByEmail": "foo@foo.com",
  "documentUri": "_44fd226f-598f-4615-930f-716b2762fea4.pdf",
  "investigation": {
    "investigator": "Chris Waugh",
    "status": "CLOSED_NFA"
  },
  "numberOfFailedAttempts": 5
}

const correlationId = 'some-uuid-correlation-id';

describe("When mapping from an Shared.ICcQueryResult to a Shared.IDynamicsLanding", () => {

  let mockIsHighRisk;
  let mockGetTotalRiskScore;
  let mockGetExporterRiskScore;
  let mockGetVesselLength;

  beforeEach(() => {
    mockIsHighRisk = jest.spyOn(risking, 'isHighRisk');
    mockIsHighRisk.mockReturnValue(false);
  
    mockGetTotalRiskScore = jest.spyOn(risking, 'getTotalRiskScore');
    mockGetTotalRiskScore.mockReturnValue(1);
  
    mockGetExporterRiskScore = jest.spyOn(risking, 'getExporterBehaviourRiskScore');
    mockGetExporterRiskScore.mockReturnValue(1);

    mockGetVesselLength = jest.spyOn(Vessel, 'getVesselLength');
    mockGetVesselLength.mockReturnValue(9);
  });

  afterEach(() => {
    mockIsHighRisk.mockRestore();
    mockGetTotalRiskScore.mockRestore();
    mockGetExporterRiskScore.mockRestore();
    mockGetVesselLength.mockRestore();
  });

  const input: Shared.ICcQueryResult = {
    documentNumber: 'CC1',
    documentType: 'catchCertificate',
    createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
    status: 'COMPLETE',
    rssNumber: 'rssWA1',
    da: 'Guernsey',
    dateLanded: '2019-07-10',
    startDate: '2019-07-10',
    species: 'LBE',
    weightOnCert: 121,
    rawWeightOnCert: 122,
    weightOnAllCerts: 200,
    weightOnAllCertsBefore: 0,
    weightOnAllCertsAfter: 100,
    weightFactor: 5,
    isLandingExists: false,
    isSpeciesExists: true,
    numberOfLandingsOnDay: 1,
    weightOnLanding: 51,
    weightOnLandingAllSpecies: 30,
    isOverusedThisCert: false,
    isOverusedAllCerts: true,
    isExceeding14DayLimit: true,
    overUsedInfo: ["CC2", "CC3"],
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
      exporterPostCode: 'AB1 2XX',
      documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
      presentation: 'SLC',
      presentationAdmin: 'sliced admin',
      presentationName: 'sliced',
      vessel: 'DAYBREAK',
      licenceHolder: 'MASTER OF VESSEL',
      fao: 'FAO27',
      pln: 'WA1',
      species: 'Lobster',
      speciesAdmin: 'Lobster Admin',
      scientificName: "Gadus morhua",
      state: 'FRE',
      stateAdmin: 'fresh admin',
      stateName: 'fresh',
      commodityCode: '1234',
      commodityCodeAdmin: '1234 - ADMIN',
      commodityCodeDescription: "Fresh or chilled fillets of cod",
      investigation: {
        investigator: "Investigator Gadget",
        status: 'OPEN_UNDER_ENQUIRY'
      },
      transportationVehicle: 'directLanding',
      numberOfSubmissions: 1,
      dataEverExpected: true,
      landingDataExpectedDate: "2019-07-10",
      landingDataEndDate: "2019-07-12"
    }
  }

  it('will map all root properties', () => {
    const result: Shared.IDynamicsLanding = SUT.toLanding(input);

    expect(result.status).toEqual('No Landing Data Failure');
    expect(result.id).toEqual('rssWA12019-07-10');
    expect(result.landingDate).toEqual('2019-07-10');
    expect(result.startDate).toEqual('2019-07-10');
    expect(result.species).toEqual('LBE');
    expect(result.state).toEqual('FRE');
    expect(result.vesselPln).toEqual('WA1');
    expect(result.vesselLength).toBe(9);
    expect(result.licenceHolder).toBe('MASTER OF VESSEL')
    expect(result.source).toBeUndefined();
    expect(result.weight).toEqual(122);
    expect(result.numberOfTotalSubmissions).toEqual(1);
    expect(result.risking?.overuseInfo).toEqual(["CC2", "CC3"]);
    expect(result.vesselOverriddenByAdmin).toBe(false);
    expect(result.cnCode).toBe("1234");
    expect(result.commodityCodeDescription).toBe("Fresh or chilled fillets of cod");
    expect(result.scientificName).toBe("Gadus morhua");
    expect(result.landingDataExpectedAtSubmission).toBe(true);
    expect(result.is14DayLimitReached).toBe(true);
    expect(result.adminSpecies).toBe('Lobster Admin');
    expect(result.adminCommodityCode).toBe('1234 - ADMIN');
    expect(result.adminState).toBe('fresh admin');
    expect(result.adminPresentation).toBe('sliced admin');
  });

  it('will not have a source if there is no landings', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: false,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 51,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        landingId: 'rssWA12019-07-10',
        exporterName: 'Mr Bob',
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: 'OPEN_UNDER_ENQUIRY'
        },
        transportationVehicle: 'directLanding'
      }
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);

    expect(result.source).toEqual(undefined)
  });

  it('will include a vessel overridden flag if the vessel has been overridden', () => {

    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: false,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 51,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        landingId: 'rssWA12019-07-10',
        exporterName: 'Mr Bob',
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: 'OPEN_UNDER_ENQUIRY'
        },
        transportationVehicle: 'directLanding',
        vesselOverriddenByAdmin: true
      }
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);

    expect(result.vesselOverriddenByAdmin).toBeTruthy();
  });

  it('will include a landingDataExpectedAtSubmission flag as false if the submission date is before the expected date for landing data', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
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
      weightOnLanding: 51,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: Shared.LandingSources.CatchRecording
        }
      ],
      source: Shared.LandingSources.CatchRecording,
      isOverusedThisCert: false,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: ["CC2", "CC3"],
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
        exporterPostCode: 'AB1 2XX',
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
        presentationName: 'sliced',
        vessel: 'DAYBREAK',
        licenceHolder: 'MASTER OF VESSEL',
        fao: 'FAO27',
        pln: 'WA1',
        species: 'Lobster',
        scientificName: "Gadus morhua",
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '1234',
        commodityCodeDescription: "Fresh or chilled fillets of cod",
        investigation: {
          investigator: "Investigator Gadget",
          status: 'OPEN_UNDER_ENQUIRY'
        },
        transportationVehicle: 'directLanding',
        numberOfSubmissions: 1,
        dataEverExpected: true,
        landingDataExpectedDate: "2019-07-14",
        landingDataEndDate: "2019-07-20",
        isLegallyDue: true
      }
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);
    expect(result.landingDataExpectedAtSubmission).toBe(false);
  });

});

describe('When mapping from an Shared.ICcQueryResult to an IDynamicsLandingValidation', () => {

  const input: Shared.ICcQueryResult = {
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
    isLandingExists: true,
    hasSalesNote: true,
    isSpeciesExists: true,
    numberOfLandingsOnDay: 1,
    weightOnLanding: 51,
    weightOnLandingAllSpecies: 30,
    landingTotalBreakdown: [
      {
        factor: 1,
        isEstimate: true,
        weight: 30,
        liveWeight: 30,
        source: Shared.LandingSources.CatchRecording
      }
    ],
    source: Shared.LandingSources.CatchRecording,
    speciesAlias: 'Y',
    speciesAnomaly: 'CAA',
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
      exporterPostCode: 'SE1 2XX',
      presentation: 'SLC',
      documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
        status: 'OPEN_UNDER_ENQUIRY'
      },
      transportationVehicle: 'directLanding',
      isLegallyDue: false
    }
  }

  ApplicationConfig.prototype.internalAppUrl = "http://localhost:6500"

  let mockIsHighRisk;
  let mockGetTotalRiskScore;
  let mockGetExporterRiskScore;
  let mockGetVesselLength;

  beforeEach(() => {
    mockIsHighRisk = jest.spyOn(risking, 'isHighRisk');
    mockIsHighRisk.mockReturnValue(false);
  
    mockGetTotalRiskScore = jest.spyOn(risking, 'getTotalRiskScore');
    mockGetTotalRiskScore.mockReturnValue(1);
  
    mockGetExporterRiskScore = jest.spyOn(risking, 'getExporterBehaviourRiskScore');
    mockGetExporterRiskScore.mockReturnValue(1);

    mockGetVesselLength = jest.spyOn(Vessel, 'getVesselLength');
    mockGetVesselLength.mockReturnValue(9);
  });

  afterEach(() => {
    mockIsHighRisk.mockRestore();
    mockGetTotalRiskScore.mockRestore();
    mockGetExporterRiskScore.mockRestore();
    mockGetVesselLength.mockRestore();
  });

  it('will map all root properties', () => {
    const result: Shared.IDynamicsLanding = SUT.toLanding(input);

    expect(result.validation.liveExportWeight).toEqual(121)
    expect(result.validation.totalEstimatedForExportSpecies).toEqual(30)
    expect(result.validation.totalEstimatedWithTolerance).toEqual(33)
    expect(result.validation.totalRecordedAgainstLanding).toEqual(200)
    expect(result.validation.landedWeightExceededBy).toEqual(167)
    expect(result.validation.rawLandingsUrl).toEqual('http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2019-07-10&rssNumber=rssWA1');
    expect(result.validation.salesNoteUrl).toEqual('http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2019-07-10&rssNumber=rssWA1');
    expect(result.validation.isLegallyDue).toBe(false);
    expect(result.source).toBe('CATCH_RECORDING');
    expect(result.speciesAlias).toBe('Y');
    expect(result.speciesAnomaly).toBe('CAA');
  });

  it('will not include a rawLandingURL or salesNoteURL if no landing data is found', () => {

    const input: Shared.ICcQueryResult = {
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
        exporterPostCode: 'SE1 2XX',
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: 'OPEN_UNDER_ENQUIRY'
        },
        transportationVehicle: 'directLanding',
        isLegallyDue: false
      }
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);

    expect(result.validation.rawLandingsUrl).toBeUndefined();
    expect(result.validation.salesNoteUrl).toBeUndefined();
    expect(result.source).toBeUndefined();
  });

  it('will not include a rawLandingURL or salesNoteURL if landing data is not expected', () => {

    const input: Shared.ICcQueryResult = {
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
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 51,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: Shared.LandingSources.CatchRecording
        }
      ],
      source: Shared.LandingSources.CatchRecording,
      speciesAlias: 'Y',
      speciesAnomaly: 'CAA',
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
        exporterPostCode: 'SE1 2XX',
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: 'OPEN_UNDER_ENQUIRY'
        },
        transportationVehicle: 'directLanding',
        isLegallyDue: false,
        dataEverExpected: false
      }
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);

    expect(result.validation.rawLandingsUrl).toBeUndefined();
    expect(result.validation.salesNoteUrl).toBeUndefined();
  });

  it('will have a totalWeightForSpecies (raw weight)', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
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
      weightOnLanding: 51,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1.7,
          isEstimate: false,
          weight: 30,
          liveWeight: 51,
          source: Shared.LandingSources.LandingDeclaration
        }],
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
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: 'OPEN_UNDER_ENQUIRY'
        },
        transportationVehicle: 'directLanding'
      }
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);

    expect(result.validation.totalWeightForSpecies).toEqual(30)
  });

  it('will have a landedWeightExceededBy for landing decs', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: moment('2019-07-10').format('YYYY-MM-DD'),
      species: 'LBE',
      weightOnCert: 500,
      rawWeightOnCert: 500,
      weightOnAllCerts: 500,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 500,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      isExceeding14DayLimit: false,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 50,
      weightOnLandingAllSpecies: 500,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: false,
          weight: 50,
          liveWeight: 50,
          source: Shared.LandingSources.LandingDeclaration
        }
      ],
      source: Shared.LandingSources.LandingDeclaration,
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
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
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: 'OPEN_UNDER_ENQUIRY'
        },
        transportationVehicle: 'directLanding'
      }
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);

    expect(result.validation.landedWeightExceededBy).toEqual(450)
  });

  it('will have a legally due value', () => {
    const result: Shared.IDynamicsLanding = SUT.toLanding(input);

    expect(mockGetVesselLength).toHaveBeenCalledWith('WA1', input.dateLanded);
    expect(result.validation.isLegallyDue).toEqual(false);
  });

  describe('when species exists', () => {

    let mockIsHighRisk;
    let mockGetTotalRiskScore;
    let mockGetExporterRiskScore;
    let mockGetVesselLength;
  
    beforeEach(() => {
      mockIsHighRisk = jest.spyOn(risking, 'isHighRisk');
      mockIsHighRisk.mockReturnValue(false);
    
      mockGetTotalRiskScore = jest.spyOn(risking, 'getTotalRiskScore');
      mockGetTotalRiskScore.mockReturnValue(1);
    
      mockGetExporterRiskScore = jest.spyOn(risking, 'getExporterBehaviourRiskScore');
      mockGetExporterRiskScore.mockReturnValue(1);
  
      mockGetVesselLength = jest.spyOn(Vessel, 'getVesselLength');
      mockGetVesselLength.mockReturnValue(9);
    });
  
    afterEach(() => {
      mockIsHighRisk.mockRestore();
      mockGetTotalRiskScore.mockRestore();
      mockGetExporterRiskScore.mockRestore();
      mockGetVesselLength.mockRestore();
    });

    it('will have a `totalLiveForExportSpecies` property only when cert is validated by Landing Declation', () => {
      const inputValidatedByLandingDeclaration = {
        ...input,
        source: Shared.LandingSources.LandingDeclaration
      };

      const result: Shared.IDynamicsLanding = SUT.toLanding(inputValidatedByLandingDeclaration);

      expect(result.validation.totalLiveForExportSpecies).toBeDefined();
    });

    it('will not have a `totalLiveForExportSpecies` property only when cert is validated by Catch Recording', () => {
      const result: Shared.IDynamicsLanding = SUT.toLanding(input);
      expect(result.validation.totalLiveForExportSpecies).toBeUndefined();
    });

    it('will not have a `totalLiveForExportSpecies` property only when cert is validated by ELog', () => {
      const inputValidatedByElog = {
        ...input,
        source: Shared.LandingSources.ELog
      };

      const result: Shared.IDynamicsLanding = SUT.toLanding(inputValidatedByElog);
      expect(result.validation.totalLiveForExportSpecies).toBeUndefined();
    });
  });

  describe('when species does not exists', () => {

    let mockIsHighRisk;
    let mockGetTotalRiskScore;
    let mockGetExporterRiskScore;
    let mockGetVesselLength;
  
    beforeEach(() => {
      mockIsHighRisk = jest.spyOn(risking, 'isHighRisk');
      mockIsHighRisk.mockReturnValue(false);
    
      mockGetTotalRiskScore = jest.spyOn(risking, 'getTotalRiskScore');
      mockGetTotalRiskScore.mockReturnValue(1);
    
      mockGetExporterRiskScore = jest.spyOn(risking, 'getExporterBehaviourRiskScore');
      mockGetExporterRiskScore.mockReturnValue(1);
  
      mockGetVesselLength = jest.spyOn(Vessel, 'getVesselLength');
      mockGetVesselLength.mockReturnValue(9);
    });
  
    afterEach(() => {
      mockIsHighRisk.mockRestore();
      mockGetTotalRiskScore.mockRestore();
      mockGetExporterRiskScore.mockRestore();
      mockGetVesselLength.mockRestore();
    });

    it('will not have a `totalLiveForExportSpecies` property if cert has a species mis-match', () => {
      const inputWithSpeciesMisMatch = {
        ...input,
        isSpeciesExists: false
      };

      const result: Shared.IDynamicsLanding = SUT.toLanding(inputWithSpeciesMisMatch);
      expect(result.validation.totalLiveForExportSpecies).toBeUndefined();
    });

    it('will not have a `totalLiveForExportSpecies` property when cert is validated by Landing Declation', () => {
      const inputWithSpeciesMisMatchValidatedByLandingDeclaration = {
        ...input,
        source: Shared.LandingSources.LandingDeclaration,
        isSpeciesExists: false
      };

      const result: Shared.IDynamicsLanding = SUT.toLanding(inputWithSpeciesMisMatchValidatedByLandingDeclaration);

      expect(result.validation.totalLiveForExportSpecies).toBeUndefined();
    });

  });

});

describe('When mapping from an Shared.ICcQueryResult to an IDynamicsRisk', () => {

  let mockTotalRiskScore;
  let mockVesselOfInterestRiskScore;
  let mockExporterSpeciesRiskScore;
  let mockSpeciesRiskScore;
  let mockGetRiskThreshold;
  let mockIsHighRisk;

  beforeEach(() => {
    mockTotalRiskScore = jest.spyOn(risking, 'getTotalRiskScore');
    mockVesselOfInterestRiskScore = jest.spyOn(risking, 'getVesselOfInterestRiskScore');
    mockExporterSpeciesRiskScore = jest.spyOn(risking, 'getExporterBehaviourRiskScore');
    mockSpeciesRiskScore = jest.spyOn(risking, 'getExportedSpeciesRiskScore');
    mockGetRiskThreshold = jest.spyOn(Cache, 'getRiskThreshold');

    mockTotalRiskScore.mockReturnValue(1.0);
    mockVesselOfInterestRiskScore.mockReturnValue(1.0);
    mockExporterSpeciesRiskScore.mockReturnValue(1.0);
    mockSpeciesRiskScore.mockReturnValue(1.0);
    mockGetRiskThreshold.mockReturnValue(1.0);

    mockIsHighRisk = jest.spyOn(risking, 'isHighRisk');
    mockIsHighRisk.mockReturnValue(false);
  });

  afterAll(() => {
    mockTotalRiskScore.mockRestore();
    mockVesselOfInterestRiskScore.mockRestore();
    mockExporterSpeciesRiskScore.mockRestore();
    mockSpeciesRiskScore.mockRestore();
    mockGetRiskThreshold.mockRestore();
    mockIsHighRisk.mockRestore();
  });

  it('will map all root properties', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: false,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 51,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: ["CC2", "CC3"],
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
        exporterAccountId: 'some-account-id',
        exporterContactId: 'some-contact-id',
        exporterName: 'Mr Bob',
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: 'OPEN_UNDER_ENQUIRY'
        },
        transportationVehicle: 'directLanding'
      }
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);

    expect(mockIsHighRisk).toHaveBeenCalledWith(1.0, undefined);
    expect(mockTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
    expect(mockVesselOfInterestRiskScore).toHaveBeenCalledWith('WA1');
    expect(mockExporterSpeciesRiskScore).toHaveBeenCalledWith('some-account-id', 'some-contact-id');
    expect(mockSpeciesRiskScore).toHaveBeenCalledWith('LBE');

    expect(result.risking?.overuseInfo).toEqual(["CC2", "CC3"]);
    expect(result.risking?.landingRiskScore).toEqual("1");
    expect(result.risking?.exporterRiskScore).toEqual("1");
    expect(result.risking?.speciesRisk).toEqual("1");
    expect(result.risking?.vessel).toEqual("1");
    expect(result.risking?.highOrLowRisk).toBe(Shared.LevelOfRiskType.Low);
  });

  it('will not display over use info if its empty', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: false,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 51,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [],
      isOverusedThisCert: true,
      isOverusedAllCerts: false,
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
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: 'OPEN_UNDER_ENQUIRY'
        },
        transportationVehicle: 'directLanding'
      }
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);

    expect(result.risking?.overuseInfo).toBeUndefined();
  });

  it('will not have an overuse array when the failure overuse occurs on this document', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: false,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 51,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [],
      isOverusedThisCert: true,
      isOverusedAllCerts: false,
      isExceeding14DayLimit: false,
      overUsedInfo: ['CC1'],
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
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: 'OPEN_UNDER_ENQUIRY'
        },
        transportationVehicle: 'directLanding'
      }
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);

    expect(result.risking?.overuseInfo).toBeUndefined();
  });

  it('will not include current document number in overuseInfo array when the failure overuse occurs on this document', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: false,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 51,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [],
      isOverusedThisCert: true,
      isOverusedAllCerts: false,
      isExceeding14DayLimit: false,
      overUsedInfo: ['CC1', 'CC2'],
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
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: 'OPEN_UNDER_ENQUIRY'
        },
        transportationVehicle: 'directLanding'
      }
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);

    expect(result.risking?.overuseInfo).toStrictEqual(["CC2"])
  });
});

describe('toDynamicsLandingCase', () => {
  let res: Shared.IDynamicsLandingCase;

  const input: Shared.ICcQueryResult = {
    documentNumber: 'CC1',
    documentType: 'catchCertificate',
    createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
    status: 'COMPLETE',
    rssNumber: 'rssWA1',
    da: 'Guernsey',
    dateLanded: '2019-07-10',
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
        factor: 1.7,
        isEstimate: true,
        weight: 30,
        liveWeight: 51,
        source: Shared.LandingSources.CatchRecording
      }
    ],
    isOverusedThisCert: false,
    isOverusedAllCerts: false,
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
      presentation: 'SLC',
      documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
        status: 'OPEN_UNDER_ENQUIRY'
      },
      transportationVehicle: 'directLanding',
      numberOfSubmissions: 1,
    }
  };

  let mockToLanding: jest.SpyInstance;

  beforeEach(() => {
    mockToLanding = jest.spyOn(SUT, 'toLanding');
    mockToLanding.mockResolvedValue({});

    res = SUT.toDynamicsLandingCase(input, exampleCc, correlationId);
  });

  afterEach(() => {
    mockToLanding.mockRestore();
  });

  it('should include all the properties from the standard landing mapper', () => {
    expect(res.status).not.toBeUndefined();
  });

  it('should include all the properties from the standard exporter mapper', () => {
    expect(res.exporter).not.toBeUndefined();
  });

  it('should include the documentNumber', () => {
    expect(res.documentNumber).toBe("GBR-2020-CC-1BC924FCF");
  });

  it('should include the documentDate', () => {
    expect(res.documentDate).toBe("2020-06-24T10:39:32.000Z");
  });

  it('should include the documentUrl', () => {
    expect(res.documentUrl).toBe(`${ApplicationConfig.prototype.externalAppUrl}/qr/export-certificates/${exampleCc.documentUri}`);
  });

  it('should include a correlationId', () => expect(res._correlationId).toEqual('some-uuid-correlation-id'));

  it('should include a requestedByAdmin flag', () => expect(res.requestedByAdmin).toEqual(false));

  it('should include a numberOfFailedSubmissions field', () => expect(res.numberOfFailedSubmissions).toEqual(5));

  it('should include a numberOfSubmissions field', () => expect(res.numberOfTotalSubmissions).toEqual(1));

  it('should include an exportedTo', () => {
    expect(res.exportedTo).toEqual({
      officialCountryName: "Nigeria",
      isoCodeAlpha2: "NG",
      isoCodeAlpha3: "NGA"
    });
  })
});

describe('toDynamicsLandingDetails', () => {

  it('will process all ICcQueryResults to a collection of IDynamicsLandingCase', () => {
    const input: Shared.ICcQueryResult[] = [{
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: false,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 0,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [],
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
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
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: 'OPEN_UNDER_ENQUIRY'
        },
        transportationVehicle: 'directLanding',
        dataEverExpected: true,
        landingDataExpectedDate: '2023-09-01',
        landingDataEndDate: '2023-09-02'
      }
    }];

    const result = SUT.toDynamicsLandingDetails(input, exampleCc, correlationId);

    expect(result).toHaveLength(1);
  });

});

describe('toLanding', () => {
  let mockToLandingStatus;
  let mockCcBatchReport;
  let mockGetTotalRiskScore;
  let mockGetExporterRisk;
  let mockIsRiskEnabled;
  let mockVesselLength;

  const sampleBatchReport = [{
    FI0_47_unavailabilityExceeds14Days: ' Fail',
    aggregatedLandedDecWeight: 89,
    aggregatedEstimateWeight: 89,
    aggregatedEstimateWeightPlusTolerance: 89,
    exportedWeightExceedingEstimateLandedWeight: 89,
    rawLandingsUrl: 'a url',
    salesNotesUrl: 'a url'
  }];

  const sampleICcQueryResult: Shared.ICcQueryResult = {
    documentNumber: '',
    documentType: '',
    status: 'COMPLETE',
    createdAt: '2019-01-01',
    rssNumber: '',
    da: 'England',
    dateLanded: '2019-01-01',
    species: ' a species',
    weightFactor: 0,
    weightOnCert: 89,
    rawWeightOnCert: 89,
    weightOnAllCerts: 0,
    weightOnAllCertsBefore: 0,
    weightOnAllCertsAfter: 0,
    // Is there a landing?
    isLandingExists: true,
    isSpeciesExists: true,
    // From the landing
    numberOfLandingsOnDay: 0,
    weightOnLanding: 0,
    weightOnLandingAllSpecies: 0,
    // Some derivations
    isOverusedThisCert: true,
    isOverusedAllCerts: true,
    // Linked certs
    overUsedInfo: [],
    durationSinceCertCreation: '',
    durationBetweenCertCreationAndFirstLandingRetrieved: null,
    durationBetweenCertCreationAndLastLandingRetrieved: null,
    extended: {
      landingId: 'an id',
      state: 'a state',
      presentation: 'a presentation',
      vessel: 'a vessel name',
      pln: ' a pln',
      dataEverExpected: true,
      landingDataExpectedDate: "2023-05-26",
      landingDataEndDate: "2023-06-05",
      isLegallyDue: true
    },
    isExceeding14DayLimit: true
  };


  beforeEach(() => {
    mockVesselLength = jest.spyOn(Vessel, 'getVesselLength');
    mockVesselLength.mockReturnValue(undefined);
    mockToLandingStatus = jest.spyOn(Shared, 'toLandingStatus');
    mockCcBatchReport = jest.spyOn(Shared, 'ccBatchReport');
    mockGetTotalRiskScore = jest.spyOn(risking, 'getTotalRiskScore');
    mockGetTotalRiskScore.mockReturnValue(1.0);
    mockGetExporterRisk = jest.spyOn(risking, 'getExporterBehaviourRiskScore');
    mockGetExporterRisk.mockReturnValue(1.0);
    mockIsRiskEnabled = jest.spyOn(risking, 'isRiskEnabled');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should set source when landingTotalBreakdown does not exists', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);
    mockToLandingStatus.mockReturnValue('a status');

    sampleICcQueryResult.isLandingExists = true;
    sampleICcQueryResult.landingTotalBreakdown = undefined;
    sampleICcQueryResult.source = 'a landing source';

    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.source).toBeDefined();

  });

  it('should set source when landingTotalBreakdown is empty', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);
    mockToLandingStatus.mockReturnValue('a status');

    const copySampleICcQueryResult: Shared.ICcQueryResult = {
      ...sampleICcQueryResult,
      isLandingExists: true,
      landingTotalBreakdown: [],
      source: 'a landing source'
    };

    const result = SUT.toLanding(copySampleICcQueryResult);

    expect(result.source).toBeDefined();
  });

  it('should set source when landingTotalBreakdown is an empty array', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);
    mockToLandingStatus.mockReturnValue('a status');

    sampleICcQueryResult.isLandingExists = true;
    sampleICcQueryResult.landingTotalBreakdown = [];
    sampleICcQueryResult.source = 'a landing source';

    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.source).toBeDefined();

  });

  it('should set source as undefined when isLandingExists is false and source is undefined', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);
    mockToLandingStatus.mockReturnValue('a status');

    sampleICcQueryResult.isLandingExists = false;
    sampleICcQueryResult.source = undefined;

    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.source).toBeUndefined();

  });

  it('should set source when isLandingExists is true and source is defined', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);
    mockToLandingStatus.mockReturnValue('a status');

    sampleICcQueryResult.isLandingExists = true;
    sampleICcQueryResult.landingTotalBreakdown = [{
      factor: 1,
      isEstimate: true,
      liveWeight: 100,
      source: 'a source',
      weight: 100,
    }];
    sampleICcQueryResult.source = 'the real source';

    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.source).toEqual('the real source');

  });

  it('should set set vesselName the extended.vessel property', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);
    mockToLandingStatus.mockReturnValue('a status');

    sampleICcQueryResult.isLandingExists = true;
    sampleICcQueryResult.landingTotalBreakdown = undefined;

    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.vesselName).toEqual('a vessel name');

  });

  it('should set vaidation.speciesRiskToggle to the output of isRiskEnabled', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);
    mockToLandingStatus.mockReturnValue('a status');

    mockIsRiskEnabled.mockReturnValue(true);
    let result = SUT.toLanding(sampleICcQueryResult);
    expect(result.risking?.isSpeciesRiskEnabled).toBeTruthy();

    mockIsRiskEnabled.mockReturnValue(false);
    result = SUT.toLanding(sampleICcQueryResult);
    expect(result.risking?.isSpeciesRiskEnabled).toBeFalsy();

  });

  it('will set validation.isLegallyDue to true if the isLegallyDue check returns true', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);

    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.validation.isLegallyDue).toBe(true);
  });

  it('will set validation.isLegallyDue to false if extended.vesselOverriddenByAdmin is true', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);

    sampleICcQueryResult.extended.vesselOverriddenByAdmin = true;

    const result = SUT.toLanding({
      ...sampleICcQueryResult,
      extended: {
        ...sampleICcQueryResult.extended,
        isLegallyDue: false
      }
    });

    expect(result.validation.isLegallyDue).toBe(false);
  });

  it('should set dataEverExpected as true', async () => {
    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.dataEverExpected).toBe(true);
  });

  it('should set dataEverExpected as false', async () => {
    sampleICcQueryResult.extended.dataEverExpected = false;
    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.dataEverExpected).toBe(false);
  });

  it('should set dataEverExpected as true when it is undefined', async () => {
    sampleICcQueryResult.extended.dataEverExpected = undefined;
    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.dataEverExpected).toBe(true);
  });

  it('should set vesselAdministration as England', async () => {
    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.vesselAdministration).toBe('England');
  });

  it('should set landing data expectation dates', () => {
    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.landingDataExpectedDate).toBe('2023-05-26');
    expect(result.landingDataEndDate).toBe('2023-06-05');
  });

  it('should set landingDataExpectedAtSubmission when dataEverExpected is true', async () => {
    sampleICcQueryResult.extended.isLegallyDue = false;
    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.landingDataExpectedAtSubmission).toBe(false);
  });

  it('should set landingDataExpectedAtSubmission when dataEverExpected is undefined', async () => {
    sampleICcQueryResult.extended.dataEverExpected = undefined;
    sampleICcQueryResult.extended.isLegallyDue = false;
    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.landingDataExpectedAtSubmission).toBe(false);
  });

  it('should not set landingDataExpectedAtSubmission when dataEverExpected is false', async () => {
    sampleICcQueryResult.extended.dataEverExpected = false;
    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.landingDataExpectedAtSubmission).toBeUndefined();
  });

  it('should set landingDataExpectedAtSubmission=true when expected date is before date of submission', async () => {
    sampleICcQueryResult.createdAt="2023-05-30";
    sampleICcQueryResult.extended.dataEverExpected = true;
    sampleICcQueryResult.extended.landingDataExpectedDate="2023-05-27";

    const result = SUT.toLanding(sampleICcQueryResult);
    expect(result.landingDataExpectedAtSubmission).toBe(true);
  });

  it('should set landingDataExpectedAtSubmission=false when expected date is after date of submission', async () => {
    sampleICcQueryResult.createdAt = "2023-05-30";
    sampleICcQueryResult.extended.dataEverExpected = true;
    sampleICcQueryResult.extended.landingDataExpectedDate = "2023-06-01";
    sampleICcQueryResult.extended.isLegallyDue = false;

    const result = SUT.toLanding(sampleICcQueryResult);
    expect(result.landingDataExpectedAtSubmission).toBe(false);
  });

  it('should set landingOutcomeAtRetrospectiveCheck as failure', async () => {
    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.landingOutcomeAtRetrospectiveCheck).toBe("Failure");
  });

  it('should set landingOutcomeAtRetrospectiveCheck as success when risk is LOW', async () => {
    mockGetTotalRiskScore.mockReturnValue(0);

    const result = SUT.toLanding(sampleICcQueryResult);

    expect(result.landingOutcomeAtRetrospectiveCheck).toBe("Success");
  });

  it('should set landingOutcomeAtRetrospectiveCheck as failure when vessel has been overriden by admin and landing does not exists', async () => {
    const result = SUT.toLanding({
      ...sampleICcQueryResult,
      isLandingExists: false,
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
      extended: {
        ...sampleICcQueryResult.extended,
        vesselOverriddenByAdmin: true
      }
    });

    expect(result.landingOutcomeAtRetrospectiveCheck).toBe("Failure");
  });

  it('should set isLate=true when firstDateTimeLandingDataRetrieved is after the expected date and before or on the end date', async () => {
    const result = SUT.toLanding({
      ...sampleICcQueryResult,
      firstDateTimeLandingDataRetrieved: '2023-06-01T07:23:52.264Z',
      extended: {
        ...sampleICcQueryResult.extended,
        landingDataExpectedDate: "2023-05-30",
        landingDataEndDate: "2023-06-07",
        vesselOverriddenByAdmin: false
      }
    });

    expect(result.isLate).toEqual(true);
  });

  it('should set isLate=false when isLandingExists is true and firstDateTimeLandingDataRetrieved is after the expected date and before or on the end date', async () => {
    const result = SUT.toLanding({
      ...sampleICcQueryResult,
      firstDateTimeLandingDataRetrieved: '2023-06-01T07:23:52.264Z',
      extended: {
        ...sampleICcQueryResult.extended,
        landingDataExpectedDate: "2023-06-01"
      }
    });

    expect(result.isLate).toEqual(false);
  });

  it('should not set isLate when firstDateTimeLandingDataRetrieved is undefined and submission date is on end date', async () => {
    const result = SUT.toLanding({
      ...sampleICcQueryResult,
      firstDateTimeLandingDataRetrieved: undefined,
      extended: {
        ...sampleICcQueryResult.extended,
        landingDataEndDate: "2023-06-01",
        dataEverExpected: true,
        vesselOverriddenByAdmin: false
      }
    });

    expect(result.isLate).toBeUndefined();
  });

  it('should not set isLate when landing status is Data Never Expected', async () => {
    const result = SUT.toLanding({
      ...sampleICcQueryResult,
      extended: {
        ...sampleICcQueryResult.extended,
        dataEverExpected: false
      }
    });

    expect(result.status).toEqual('Data Never Expected');
    expect(result.isLate).toBeUndefined();
  });

  it('should set dateDataReceived when isLandingExists is true and dateLandingReceived is available', async () => {
    const copySampleICcQueryResult: Shared.ICcQueryResult = {
      ...sampleICcQueryResult,
      isLandingExists: true,
      firstDateTimeLandingDataRetrieved: '2023-06-02T07:23:52.264Z'
    };
    const result = SUT.toLanding(copySampleICcQueryResult);
    expect(result.dateDataReceived).toEqual('2023-06-01T07:23:52.264Z');
  });

  it('should not set dateDataReceived when isLandingExists is false and dateLandingReceived is not available', async () => {
    const copySampleICcQueryResult: Shared.ICcQueryResult = {
      ...sampleICcQueryResult,
      isLandingExists: false,
      firstDateTimeLandingDataRetrieved: undefined
    };
    const result = SUT.toLanding(copySampleICcQueryResult);
    expect(result.dateDataReceived).toBeUndefined();
  });

  it('will set 14DayLimitReached to true when species failure for an under 50 kg landing using Elog outside of retrospective period', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: "GBR-2024-CC-5D31C8ADF",
      documentType: "catchCertificate",
      createdAt: "2024-06-12T13:05:35.209Z",
      status: "COMPLETE",
      extended: {
        exporterContactId: "0eee9e71-61d5-ee11-904d-000d3ab00f0f",
        exporterName: "Gosia Miksza",
        exporterCompanyName: "Scenario 12",
        exporterPostCode: "PE2 8YY",
        vessel: "CELTIC",
        landingId: "GBR-2024-CC-5D31C8ADF-7949086400",
        pln: "M509",
        fao: "FAO27",
        flag: "GBR",
        cfr: "GBR000C18051",
        presentation: "WHL",
        presentationName: "Whole",
        species: "Wolffishes(=Catfishes) nei (CAT)",
        scientificName: "Anarhichas spp",
        state: "FRE",
        stateName: "Fresh",
        commodityCode: "03028990",
        commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
        transportationVehicle: "directLanding",
        numberOfSubmissions: 1,
        speciesOverriddenByAdmin: false,
        licenceHolder: "MR A G PHILLIPS",
        dataEverExpected: true,
        landingDataExpectedDate: "2024-06-12",
        landingDataEndDate: moment.utc().subtract(2, 'day').format('YYYY-MM-DD'),
        isLegallyDue: false,
        homePort: "MILFORD HAVEN",
        imoNumber: null,
        licenceNumber: "11704",
        licenceValidTo: "2030-12-31"
      },
      rssNumber: "C18051",
      da: "Wales",
      dateLanded: "2024-06-11",
      species: "CAT",
      weightFactor: 1,
      weightOnCert: 20,
      rawWeightOnCert: 20,
      weightOnAllCerts: 20,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 20,
      isLandingExists: true,
      isExceeding14DayLimit: false,
      speciesAlias: "N",
      durationSinceCertCreation: "PT0.046S",
      source: "ELOG",
      weightOnLandingAllSpecies: 20,
      numberOfLandingsOnDay: 1,
      durationBetweenCertCreationAndFirstLandingRetrieved: "-PT0.107S",
      durationBetweenCertCreationAndLastLandingRetrieved: "-PT0.107S",
      firstDateTimeLandingDataRetrieved: "2024-06-12T13:05:35.102Z",
      isSpeciesExists: false,
      weightOnLanding: 0,
      isOverusedAllCerts: false,
      isOverusedThisCert: false,
      overUsedInfo: []
    };

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);
    expect(result.is14DayLimitReached).toBe(true);
  });

  it('will set 14DayLimitReached to false when CT2 is Pending landing Data or species failure for an under 50 kg landing using Elog', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: "GBR-2024-CC-5D31C8ADF",
      documentType: "catchCertificate",
      createdAt: "2024-06-12T13:05:35.209Z",
      status: "COMPLETE",
      extended: {
        exporterContactId: "0eee9e71-61d5-ee11-904d-000d3ab00f0f",
        exporterName: "Gosia Miksza",
        exporterCompanyName: "Scenario 12",
        exporterPostCode: "PE2 8YY",
        vessel: "CELTIC",
        landingId: "GBR-2024-CC-5D31C8ADF-7949086400",
        pln: "M509",
        fao: "FAO27",
        flag: "GBR",
        cfr: "GBR000C18051",
        presentation: "WHL",
        presentationName: "Whole",
        species: "Wolffishes(=Catfishes) nei (CAT)",
        scientificName: "Anarhichas spp",
        state: "FRE",
        stateName: "Fresh",
        commodityCode: "03028990",
        commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
        transportationVehicle: "directLanding",
        numberOfSubmissions: 1,
        speciesOverriddenByAdmin: false,
        licenceHolder: "MR A G PHILLIPS",
        dataEverExpected: true,
        landingDataExpectedDate: "2024-06-12",
        landingDataEndDate: moment.utc().add(1, 'day').format('YYYY-MM-DD'),
        isLegallyDue: false,
        homePort: "MILFORD HAVEN",
        imoNumber: null,
        licenceNumber: "11704",
        licenceValidTo: "2030-12-31"
      },
      rssNumber: "C18051",
      da: "Wales",
      dateLanded: "2024-06-11",
      species: "CAT",
      weightFactor: 1,
      weightOnCert: 20,
      rawWeightOnCert: 20,
      weightOnAllCerts: 20,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 20,
      isLandingExists: true,
      isExceeding14DayLimit: false,
      speciesAlias: "N",
      durationSinceCertCreation: "PT0.046S",
      source: "ELOG",
      weightOnLandingAllSpecies: 20,
      numberOfLandingsOnDay: 1,
      durationBetweenCertCreationAndFirstLandingRetrieved: "-PT0.107S",
      durationBetweenCertCreationAndLastLandingRetrieved: "-PT0.107S",
      firstDateTimeLandingDataRetrieved: "2024-06-12T13:05:35.102Z",
      isSpeciesExists: false,
      weightOnLanding: 0,
      isOverusedAllCerts: false,
      isOverusedThisCert: false,
      overUsedInfo: []
    };

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);
    expect(result.is14DayLimitReached).toBe(false);
  });

  it('will set 14DayLimitReached to true when Species Failure - Validation Failure - occurs for a landing using Landing Declaration', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: "GBR-2024-CC-5D31C8ADF",
      documentType: "catchCertificate",
      createdAt: "2024-06-12T13:05:35.209Z",
      status: "COMPLETE",
      extended: {
        exporterContactId: "0eee9e71-61d5-ee11-904d-000d3ab00f0f",
        exporterName: "Gosia Miksza",
        exporterCompanyName: "Scenario 12",
        exporterPostCode: "PE2 8YY",
        vessel: "CELTIC",
        landingId: "GBR-2024-CC-5D31C8ADF-7949086400",
        pln: "M509",
        fao: "FAO27",
        flag: "GBR",
        cfr: "GBR000C18051",
        presentation: "WHL",
        presentationName: "Whole",
        species: "Wolffishes(=Catfishes) nei (CAT)",
        scientificName: "Anarhichas spp",
        state: "FRE",
        stateName: "Fresh",
        commodityCode: "03028990",
        commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
        transportationVehicle: "directLanding",
        numberOfSubmissions: 1,
        speciesOverriddenByAdmin: false,
        licenceHolder: "MR A G PHILLIPS",
        dataEverExpected: true,
        landingDataExpectedDate: "2024-06-12",
        landingDataEndDate: moment.utc().add(1, 'day').format('YYYY-MM-DD'),
        isLegallyDue: false,
        homePort: "MILFORD HAVEN",
        imoNumber: null,
        licenceNumber: "11704",
        licenceValidTo: "2030-12-31"
      },
      rssNumber: "C18051",
      da: "Wales",
      dateLanded: "2024-06-11",
      species: "CAT",
      weightFactor: 1,
      weightOnCert: 20,
      rawWeightOnCert: 20,
      weightOnAllCerts: 20,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 20,
      isLandingExists: true,
      isExceeding14DayLimit: false,
      speciesAlias: "N",
      durationSinceCertCreation: "PT0.046S",
      source: "LANDING_DECLARATION",
      weightOnLandingAllSpecies: 20,
      numberOfLandingsOnDay: 1,
      durationBetweenCertCreationAndFirstLandingRetrieved: "-PT0.107S",
      durationBetweenCertCreationAndLastLandingRetrieved: "-PT0.107S",
      firstDateTimeLandingDataRetrieved: "2024-06-12T13:05:35.102Z",
      isSpeciesExists: false,
      weightOnLanding: 0,
      isOverusedAllCerts: false,
      isOverusedThisCert: false,
      overUsedInfo: []
    };

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);
    expect(result.is14DayLimitReached).toBe(true);
  });

  it('will set 14DayLimitReached to true when Overuse - Validation Failure - occurs for a landing using Landing Declaration', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: "GBR-2024-CC-5D31C8ADF",
      documentType: "catchCertificate",
      createdAt: "2024-06-12T13:05:35.209Z",
      status: "COMPLETE",
      extended: {
        exporterContactId: "0eee9e71-61d5-ee11-904d-000d3ab00f0f",
        exporterName: "Gosia Miksza",
        exporterCompanyName: "Scenario 12",
        exporterPostCode: "PE2 8YY",
        vessel: "CELTIC",
        landingId: "GBR-2024-CC-5D31C8ADF-7949086400",
        pln: "M509",
        fao: "FAO27",
        flag: "GBR",
        cfr: "GBR000C18051",
        presentation: "WHL",
        presentationName: "Whole",
        species: "Wolffishes(=Catfishes) nei (CAT)",
        scientificName: "Anarhichas spp",
        state: "FRE",
        stateName: "Fresh",
        commodityCode: "03028990",
        commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
        transportationVehicle: "directLanding",
        numberOfSubmissions: 1,
        speciesOverriddenByAdmin: false,
        licenceHolder: "MR A G PHILLIPS",
        dataEverExpected: true,
        landingDataExpectedDate: "2024-06-12",
        landingDataEndDate: moment.utc().add(1, 'day').format('YYYY-MM-DD'),
        isLegallyDue: false,
        homePort: "MILFORD HAVEN",
        imoNumber: null,
        licenceNumber: "11704",
        licenceValidTo: "2030-12-31"
      },
      rssNumber: "C18051",
      da: "Wales",
      dateLanded: "2024-06-11",
      species: "CAT",
      weightFactor: 1,
      weightOnCert: 20,
      rawWeightOnCert: 20,
      weightOnAllCerts: 20,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 20,
      isLandingExists: true,
      isExceeding14DayLimit: false,
      speciesAlias: "N",
      durationSinceCertCreation: "PT0.046S",
      source: "LANDING_DECLARATION",
      weightOnLandingAllSpecies: 20,
      numberOfLandingsOnDay: 1,
      durationBetweenCertCreationAndFirstLandingRetrieved: "-PT0.107S",
      durationBetweenCertCreationAndLastLandingRetrieved: "-PT0.107S",
      firstDateTimeLandingDataRetrieved: "2024-06-12T13:05:35.102Z",
      isSpeciesExists: true,
      weightOnLanding: 0,
      isOverusedAllCerts: true,
      isOverusedThisCert: true,
      overUsedInfo: ['CC1']
    };

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);
    expect(result.is14DayLimitReached).toBe(true);
  });

  it('will set status as Pending Landing Data for retrospective landing where status is Pending Landing Data - Elog species', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 20,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: false,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1.7,
          isEstimate: true,
          weight: 30,
          liveWeight: 51,
          source: Shared.LandingSources.ELog
        }
      ],
      source: Shared.LandingSources.ELog,
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
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
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: Shared.InvestigationStatus.Open
        },
        transportationVehicle: 'directLanding',
        licenceHolder: 'Mr Bob'
      }
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);
    expect(result.status).toBe('Pending Landing Data');
  });

  it('will set status as Pending Landing Data for retrospective landing where status is Pending Landing Data - Data Not Yet Expected', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
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
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [],
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
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
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: Shared.InvestigationStatus.Open
        },
        transportationVehicle: 'directLanding',
        licenceHolder: 'Mr Bob',
        dataEverExpected: true,
        landingDataExpectedDate: moment.utc().add(2, 'day').format('YYYY-MM-DD'),
        landingDataEndDate: moment.utc().add(3, 'day').format('YYYY-MM-DD')
      }
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);
    expect(result.status).toBe('Pending Landing Data');
  });

  it('will set status as Pending Landing Data for retrospective landing where status is Pending Landing Data - Data Expected', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc().toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: false,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 0,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [],
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
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
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: Shared.InvestigationStatus.Open
        },
        transportationVehicle: 'directLanding',
        licenceHolder: 'Mr Bob',
        dataEverExpected: true,
        landingDataExpectedDate: moment.utc().format('YYYY-MM-DD'),
        landingDataEndDate: moment.utc().add(1, 'day').format('YYYY-MM-DD')
      }
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);
    expect(result.status).toBe('Pending Landing Data');
  });

  it('will set status as found status for retrospective landing where status is Validation Success', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
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
      landingTotalBreakdown: [{
        factor: 1.7,
        isEstimate: true,
        weight: 30,
        liveWeight: 51,
        source: Shared.LandingSources.LandingDeclaration
      }],
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
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
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: Shared.InvestigationStatus.Open
        },
        transportationVehicle: 'directLanding',
        licenceHolder: 'Mr Bob'
      }
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);
    expect(result.status).toBe('Validation Success');
  });

  it('will set status as found status for retrospective landing where status is Validation Failure', () => {
    const input: Shared.ICcQueryResult = {
      documentNumber: "GBR-2024-CC-26F85FD5A",
      documentType: "catchCertificate",
      createdAt: "2024-09-13T10:40:40.023Z",
      status: "COMPLETE",
      extended: {
        exporterContactId: "42baa958-e498-e911-a962-000d3ab6488a",
        exporterName: "harshal edake",
        exporterCompanyName: "Capgemini",
        exporterPostCode: "CH3 7PN",
        vessel: "CATHARINA OF LADRAM",
        landingId: "GBR-2024-CC-26F85FD5A-6863951470",
        pln: "BM111",
        fao: "FAO27",
        flag: "GBR",
        cfr: "GBR000C19045",
        presentation: "WHL",
        presentationName: "Whole",
        species: "Common squids nei (SQC)",
        scientificName: "Loligo spp",
        state: "FRE",
        stateName: "Fresh",
        commodityCode: "03074220",
        commodityCodeDescription: "Squid \"Loligo spp.\", live, fresh or chilled",
        transportationVehicle: "truck",
        numberOfSubmissions: 1,
        speciesOverriddenByAdmin: false,
        licenceHolder: "WATERDANCE LIMITED ",
        dataEverExpected: true,
        landingDataExpectedDate: "2024-07-19",
        landingDataEndDate: "2024-08-02",
        isLegallyDue: true,
        homePort: "BRIXHAM",
        imoNumber: 9019365,
        licenceNumber: "11930",
        licenceValidTo: "2030-12-31"
      },
      rssNumber: "C19045",
      da: "England",
      dateLanded: "2024-07-19",
      species: "SQC",
      weightFactor: 1,
      weightOnCert: 100,
      rawWeightOnCert: 100,
      weightOnAllCerts: 400,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      isLandingExists: true,
      isExceeding14DayLimit: false,
      speciesAlias: "N",
      durationSinceCertCreation: "PT0.008S",
      source: "LANDING_DECLARATION",
      weightOnLandingAllSpecies: 100,
      numberOfLandingsOnDay: 1,
      durationBetweenCertCreationAndFirstLandingRetrieved: "-PT19H49M5.517S",
      durationBetweenCertCreationAndLastLandingRetrieved: "-PT19H49M5.517S",
      firstDateTimeLandingDataRetrieved: "2024-09-12T14:51:34.506Z",
      isSpeciesExists: true,
      weightOnLanding: 100,
      landingTotalBreakdown: [
        {
          presentation: "WHL",
          state: "FRE",
          source: "LANDING_DECLARATION",
          isEstimate: false,
          factor: 1,
          weight: 100,
          liveWeight: 100
        }
      ],
      isOverusedThisCert: false,
      isOverusedAllCerts: true,
      overUsedInfo: [
        "GBR-2024-CC-26F85FD5A"
      ]
    }

    const result: Shared.IDynamicsLanding = SUT.toLanding(input);
    expect(result.status).toBe('Overuse Failure');
  });
});

describe('When mapping fron an ISdPsQueryResult to a IDynamicsStorageDocumentProduct', () => {
  const input: ISdPsQueryResult = {
    documentNumber: "SD1",
    catchCertificateNumber: "SD2",
    catchCertificateType: "uk",
    documentType: "SD",
    createdAt: "2020-01-01",
    status: "COMPLETE",
    species: "Atlantic cod (COD)",
    scientificName: "Gadus morhua",
    commodityCode: "FRESHCOD",
    weightOnDoc: 100,
    weightOnAllDocs: 150,
    weightOnFCC: 200,
    weightAfterProcessing: 80,
    isOverAllocated: false,
    overUsedInfo: [],
    isMismatch: false,
    overAllocatedByWeight: 0,
    da: null,
    extended: {
      id: 'SD2-1610018839',
    }
  };

  it('will map the foreignCatchCertificateNumber', () => {
    const result = SUT.toSdProduct(input);

    expect(result.foreignCatchCertificateNumber).toEqual("SD2");
  });

  it('will map the certificateType', () => {
    const result = SUT.toSdProduct(input);

    expect(result.isDocumentIssuedInUK).toEqual(true);
  });

  it('will map the species code', () => {
    const result = SUT.toSdProduct(input);

    expect(result.species).toEqual("COD");
  });

  it('will map the commodity code', () => {
    const result = SUT.toSdProduct(input);

    expect(result.cnCode).toEqual("FRESHCOD");
  })

  it('will map the importedWeight', () => {
    const result = SUT.toSdProduct(input);

    expect(result.importedWeight).toEqual(200);
  });

  it('will map exportedWeight', () => {
    const result = SUT.toSdProduct(input);

    expect(result.exportedWeight).toEqual(100)
  });

  it('will map a scientific name', () => {
    const result = SUT.toSdProduct(input);

    expect(result.scientificName).toBe("Gadus morhua");
  });

  describe("The validation within IDynamicsStorageDocumentProduct", () => {
    it('will contain totalUsedWeightAgainstCertificate', () => {
      const result = SUT.toSdProduct(input);

      expect(result.validation.totalWeightExported).toEqual(150)
    });

    it('will highlight when the failure reason is the weight', () => {
      const input: ISdPsQueryResult = {
        documentNumber: "SD1",
        catchCertificateNumber: "SD2",
        documentType: "SD",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: [],
        isMismatch: true,
        overAllocatedByWeight: 0,
        da: null,
        extended: {
          id: 'SD2-1610018839',
        }
      };

      const result = SUT.toSdProduct(input);

      expect(result.validation.status).toEqual(SdPsStatus.Weight)
    });

    it('will highlight when the failure reason is overuse', () => {
      const input: ISdPsQueryResult = {
        documentNumber: "SD1",
        catchCertificateNumber: "SD2",
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: true,
        overUsedInfo: [],
        isMismatch: false,
        overAllocatedByWeight: 50,
        da: null,
        extended: {
          id: 'SD2-1610018839',
        }
      };

      const result = SUT.toSdProduct(input);

      expect(result.validation.status).toEqual(SdPsStatus.Overuse)
    });

    it('will highlight the weight exceeded amount when the failure reason is overuse', () => {
      const input: ISdPsQueryResult = {
        documentNumber: "SD1",
        catchCertificateNumber: "SD2",
        documentType: "SD",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: [],
        isMismatch: false,
        overAllocatedByWeight: 50,
        da: null,
        extended: {
          id: 'SD2-1610018839',
        }
      };

      const result = SUT.toSdProduct(input);

      expect(result.validation.weightExceededAmount).toEqual(50)
    });

    it('will have over use array when the failure reason is overuse', () => {
      const input: ISdPsQueryResult = {
        documentNumber: "SD1",
        catchCertificateNumber: "SD2",
        documentType: "SD",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: ["SD3"],
        isMismatch: false,
        overAllocatedByWeight: 50,
        da: null,
        extended: {
          id: 'SD2-1610018839',
        }
      };

      const result = SUT.toSdProduct(input);

      expect(result.validation.overuseInfo).toEqual(["SD3"])
    });

    it('will not have an overuse array when the failure overuse occurs on this document', () => {
      const input: ISdPsQueryResult = {
        documentNumber: "SD1",
        catchCertificateNumber: "SD2",
        documentType: "SD",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: ["SD1"],
        isMismatch: false,
        overAllocatedByWeight: 50,
        da: null,
        extended: {
          id: 'SD2-1610018839',
        }
      };

      const result = SUT.toSdProduct(input);

      expect(result.validation.overuseInfo).toBeUndefined();
    });

    it('will not include current document number in overuseInfo array when the failure overuse occurs on this document', () => {
      const input: ISdPsQueryResult = {
        documentNumber: "SD1",
        catchCertificateNumber: "SD2",
        documentType: "SD",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: ["SD1", "SD2"],
        isMismatch: false,
        overAllocatedByWeight: 50,
        da: null,
        extended: {
          id: 'SD2-1610018839',
        }
      };

      const result = SUT.toSdProduct(input);

      expect(result.validation.overuseInfo).toStrictEqual(["SD2"]);
    });
  });

});

describe('When mapping from an ISdPsQueryResult to IDynamicsStorageDocumentCase', () => {

  const exampleSd: Shared.IDocument = {
    "createdAt": new Date("2020-06-12T20:12:28.201Z"),
    "__t": "storageDocument",
    "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
    "createdByEmail": "foo@foo.com",
    "status": "COMPLETE",
    "documentNumber": "GBR-2020-SD-C90A88218",
    "requestByAdmin": false,
    "audit": [{
      "eventType": Shared.AuditEventTypes.PreApproved,
      "triggeredBy": "Bob",
      "timestamp": new Date(),
      "data": null
    }, {
      "eventType": Shared.AuditEventTypes.Investigated,
      "triggeredBy": "Bob",
      "timestamp": new Date(),
      "data": null
    }],
    "userReference": "My Reference",
    "exportData": {
      "exporterDetails": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "exporterCompanyName": "Exporter Ltd",
        "addressOne": "Building Name",
        "buildingName": "BuildingName",
        "buildingNumber": "BuildingNumber",
        "subBuildingName": "SubBuildingName",
        "streetName": "StreetName",
        "country": "Country",
        "county": "County",
        "townCity": "Town",
        "postcode": "TF1 3AA",
        "_dynamicsAddress": { "dynamicsData": 'original address' }
      },
      "catches": [{
        "product": "Atlantic herring (HER)",
        "commodityCode": "0345603",
        "productWeight": "1000",
        "dateOfUnloading": "12/06/2020",
        "placeOfUnloading": "Dover",
        "transportUnloadedFrom": "BA078",
        "certificateNumber": "GBR-3453-3453-3443",
        "weightOnCC": "1000",
        "scientificName": "Gadus morhua"
      }],
      "storageFacilities": [{
        "facilityName": "Exporter Person",
        "facilityAddressOne": "Building Name",
        "facilityAddressTwo": "Building Street",
        "facilityTownCity": "Town",
        "facilityPostcode": "XX12 X34"
      }],
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGA",
        "isoNumericCode": "566"
      },
      "transportation": {
        "vehicle": "truck",
        "cmr": true
      }
    },
    "documentUri": "_0d8f98a1-c372-47c4-803f-dafd642c4941.pdf",
    "numberOfFailedAttempts": 5
  };

  const input: ISdPsQueryResult = {
    documentNumber: "SD1",
    catchCertificateNumber: "SD2",
    documentType: "SD",
    createdAt: "2020-01-01",
    status: "COMPLETE",
    species: "Atlantic cod (COD)",
    commodityCode: "FRESHCOD",
    weightOnDoc: 100,
    weightOnAllDocs: 150,
    weightOnFCC: 200,
    weightAfterProcessing: 80,
    isOverAllocated: false,
    isMismatch: false,
    overAllocatedByWeight: 0,
    overUsedInfo: [],
    da: null,
    extended: {
      id: 'SD2-1610018839',
    }
  };

  it('will map the products', () => {
    const result = SUT.toDynamicsSd([input], exampleSd, correlationId);

    expect(result.products?.length).toBeGreaterThan(0);
  });

  it('will map the documentNumber', () => {
    const result = SUT.toDynamicsSd([input], exampleSd, correlationId);

    expect(result.documentNumber).toEqual('GBR-2020-SD-C90A88218');
  });

  it('will map the Case type One', () => {
    const result = SUT.toDynamicsSd([input], exampleSd, correlationId);

    expect(result.caseType1).toEqual('SD');
  });

  it('will map the company name', () => {
    const result = SUT.toDynamicsSd([input], exampleSd, correlationId);

    expect(result.companyName).toEqual("Exporter Ltd");
  });

  it('will map the number of failed submissions', () => {
    const result = SUT.toDynamicsSd([input], exampleSd, correlationId);

    expect(result.numberOfFailedSubmissions).toEqual(5);
  });

  it('will map the case two type', () => {
    const result = SUT.toDynamicsSd([input], exampleSd, correlationId);

    expect(result.caseType2).toEqual(SdPsCaseTwoType.RealTimeValidation_Success);
  });

  it('will map an exporter details', () => {
    const result = SUT.toDynamicsSd([input], exampleSd, correlationId);

    expect(result.exporter).toMatchObject({
      companyName: "Exporter Ltd",
      address: {
        line1: "Building Name",
        building_name: "BuildingName",
        building_number: "BuildingNumber",
        sub_building_name: "SubBuildingName",
        street_name: "StreetName",
        country: "Country",
        county: "County",
        city: "Town",
        postCode: "TF1 3AA"
      },
      contactId: 'a contact id',
      accountId: 'an account id',
    }
    )
  });

  it('will contains documentDate', () => {
    const result = SUT.toDynamicsSd([input], exampleSd, correlationId);

    expect(result.documentDate).toBe('2020-06-12T20:12:28.201Z');
  });

  it('will contains documentURI', () => {
    const result = SUT.toDynamicsSd([input], exampleSd, correlationId);

    expect(result.documentUrl).toContain('_0d8f98a1-c372-47c4-803f-dafd642c4941.pdf');
  });

  it('will include a correlationId', () => {
    const result = SUT.toDynamicsSd([input], exampleSd, correlationId);

    expect(result._correlationId).toEqual('some-uuid-correlation-id');
  });

  it('will include a requestedByAdmin flag', () => {
    const result = SUT.toDynamicsSd([input], exampleSd, correlationId);

    expect(result.requestedByAdmin).toEqual(false);
  });

  it('will include all root properties required for a VOID payload', () => {
    const result = SUT.toDynamicsSd(null, exampleSd, correlationId, SdPsCaseTwoType.VoidByExporter);

    expect(result.caseType2).toEqual("Void by an Exporter");
    expect(result.products).toBeUndefined();
  });

  it('will include an exportedTo', () => {
    const result = SUT.toDynamicsSd([input], exampleSd, correlationId);

    expect(result.exportedTo).toEqual({
      officialCountryName: "Nigeria",
      isoCodeAlpha2: "NG",
      isoCodeAlpha3: "NGA"
    });
  });

  it('isMismatch is true', () => {
    const result = SUT.toDynamicsSd([{ ...input, isMismatch: true }], exampleSd, correlationId);

    expect(result.exporter).toStrictEqual({
      "accountId": "an account id",
      "address":  {
        "building_name": "BuildingName",
        "building_number": "BuildingNumber",
        "city": "Town",
        "country": "Country",
        "county": "County",
        "line1": "Building Name",
        "postCode": "TF1 3AA",
        "street_name": "StreetName",
        "sub_building_name": "SubBuildingName",
      },
      "companyName": "Exporter Ltd",
      "contactId": "a contact id",
      "dynamicsAddress":  {
        "dynamicsData": "original address",
      },
       })
  })
  it('isOverUse is true', () => {
    const result = SUT.toDynamicsSd([{ ...input, isOverAllocated: true }], exampleSd, correlationId);

    expect(result.exporter).toStrictEqual({
      "accountId": "an account id",
      "address":  {
        "building_name": "BuildingName",
        "building_number": "BuildingNumber",
        "city": "Town",
        "country": "Country",
        "county": "County",
        "line1": "Building Name",
        "postCode": "TF1 3AA",
        "street_name": "StreetName",
        "sub_building_name": "SubBuildingName",
      },
      "companyName": "Exporter Ltd",
      "contactId": "a contact id",
      "dynamicsAddress":  {
        "dynamicsData": "original address",
      },
       })
  })
});

describe("Covering toExportedToPsSd optional cases", () => {
  const examplePS: Shared.IDocument = {
    createdAt: new Date("2020-06-09T11:27:49.000Z"),
    __t: "processingStatement",
    createdBy: "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
    status: "COMPLETE",
    documentNumber: "GBR-2020-SD-BA8A6BE06",
    requestByAdmin: false,
    audit: [{
      eventType: 'AuditEventTypes.PreApproved',
      triggeredBy: "Bob",
      timestamp: new Date(),
      data: null
    }, {
      eventType: 'AuditEventTypes.Investigated',
      triggeredBy: "Bob",
      timestamp: new Date(),
      data: null
    }],
    userReference: "test",
    exportData: {
      catches: [
        {
          species: "Atlantic herring (HER)",
          catchCertificateNumber: "23462436",
          totalWeightLanded: 3,
          exportWeightBeforeProcessing: 3,
          exportWeightAfterProcessing: 3,
          scientificName: "Gadus morhua"
        }],
      exporterDetails: {
        contactId: "a contact id",
        accountId: "an account id",
        exporterCompanyName: "Exporter Co",
        addressOne: "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
        townCity: "T",
        postcode: "AB1 1AB",
        buildingNumber: "123",
        subBuildingName: "Unit 1",
        buildingName: "CJC Fish Ltd",
        streetName: "17 Old Edinburgh Road",
        county: "West Midlands",
        country: "England",
        _dynamicsAddress: "dynamics"
      },
      consignmentDescription: "test",
      healthCertificateNumber: "3",
      healthCertificateDate: "01/06/2020",
      personResponsibleForConsignment: "Bob Bobby",
      plantApprovalNumber: "111-222",
      plantName: "Bob's plant",
      plantAddressOne: "test1",
      plantAddressTwo: "test2",
      plantTownCity: "city Test",
      plantPostcode: "RRR",
      dateOfAcceptance: "09/06/2020",
      exportedTo: {
        officialCountryName: "Nigeria",
        isoCodeAlpha2: "NG",
        isoCodeAlpha3: "NGA",
        isoNumericCode: "566"
      }
    },
    createdByEmail: "foo@foo.com",
    documentUri: "_fd91895a-85e5-4e1b-90ef-53cffe3ac758.pdf",
    numberOfFailedAttempts: 5
  }
  it("Will cover toExportedToPsSd optional cases", () => {
    const result = SUT.toExportedToSd({ ...examplePS, exportData: undefined })
    expect(result).toEqual({})
  })
})