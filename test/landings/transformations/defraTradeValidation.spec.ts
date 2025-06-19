import moment from "moment";
import * as SUT from "../../../src/landings/transformations/defraTradeValidation";
import * as vessel from "../../../src/data/vessel";
import { ICcQueryResult, IDocument, InvestigationStatus, LandingRetrospectiveOutcomeType, LandingSources, DefraCcLandingStatusType, LevelOfRiskType, IDefraTradeCatchCertificate, LandingStatusType, CatchArea, CertificateStatus } from "mmo-shared-reference-data";
import { CaseOneType, CaseTwoType, IDynamicsCatchCertificateCase } from "../../../src/types/dynamicsValidation";
import { ISdPsQueryResult } from "../../../src/types/query";
import { IDynamicsStorageDocumentCase, SdPsCaseTwoType, SdPsStatus } from "../../../src/types/dynamicsValidationSdPs";
import { IDefraTradeSdPsStatus, IDefraTradeStorageDocument } from "../../../src/types/defraTradeSdPsCase";

describe('when transforming Catch Certificate data from IDocument, ICcQuery to IDefraTradeCatchCertificate', () => {

  const exampleCc: IDocument = {
    "createdAt": new Date("2020-06-24T10:39:32.000Z"),
    "__t": "catchCert",
    "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
    "status": "COMPLETE",
    "documentNumber": "GBR-2020-CC-1BC924FCF",
    "clonedFrom": "GBR-2023-CC-C3A82642B",
    "landingsCloned": false,
    "parentDocumentVoid": false,
    "audit": [
      {
        "eventType": "INVESTIGATED",
        "triggeredBy": "Chris Waugh",
        "timestamp": {
          "$date": "2020-06-24T10:40:18.780Z"
        },
        "data": {
          "investigationStatus": "UNDER_INVESTIGATION"
        }
      },
      {
        "eventType": "INVESTIGATED",
        "triggeredBy": "Chris Waugh",
        "timestamp": {
          "$date": "2020-06-24T10:40:23.439Z"
        },
        "data": {
          "investigationStatus": "CLOSED_NFA"
        }
      }
    ],
    "userReference": "MY REF",
    "exportData": {
      "products": [
        {
          "speciesId": "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
          "species": "Black scabbardfish (BSF)",
          "speciesCode": "BSF",
          "commodityCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "state": {
            "code": "FRE",
            "name": "Fresh"
          },
          "presentation": {
            "code": "GUT",
            "name": "Gutted"
          },
          "factor": 1.24,
          "caughtBy": [
            {
              "vessel": "AGAN BORLOWEN",
              "pln": "SS229",
              "homePort": "NEWLYN",
              "flag": "GBR",
              "cfr": "GBR000C20415",
              "imoNumber": null,
              "licenceNumber": "25072",
              "licenceValidTo": "2030-12-31",
              "licenceHolder": "MR S CLARY-BROM ",
              "id": "GBR-2023-CC-C58DF9A73-1777642314",
              "startDate": "2023-08-31",
              "date": "2023-08-31",
              "faoArea": "FAO27",
              "weight": 122,
              "numberOfSubmissions": 1,
              "isLegallyDue": false,
              "dataEverExpected": true,
              "landingDataExpectedDate": "2023-08-31",
              "landingDataEndDate": "2023-09-02",
              "_status": "PENDING_LANDING_DATA"
            }
          ]
        }
      ],
      "transportation": {
        "exportedFrom": "United Kingdom",
        "exportedTo": {
          "officialCountryName": "Åland Islands",
          "isoCodeAlpha2": "AX",
          "isoCodeAlpha3": "ALA",
          "isoNumericCode": "248"
        },
        "vehicle": "truck",
        "cmr": true
      },
      "transportations": [{
        "id": '0',
        "freightBillNumber": '0',
        "vehicle": "truck",
        "departurePlace": "Hull",
        "nationalityOfVehicle": "",
        "registrationNumber": "",
        "transportDocuments": [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      }, {
        "id": '0',
        "freightBillNumber": '0',
        "vehicle": "plane",
        "departurePlace": "Hull",
        "flightNumber": "",
        "containerNumber": "",
        "transportDocuments": [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      }, {
        "id": '0',
        "freightBillNumber": '0',
        "vehicle": "train",
        "departurePlace": "Hull",
        "railwayBillNumber": "",
        "transportDocuments": [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      }, {
        "id": '0',
        "freightBillNumber": '0',
        "vehicle": "containerVessel",
        "departurePlace": "Hull",
        "vesselName": "",
        "flagState": "",
        "containerNumber": "",
        "transportDocuments": [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      }, {
        "id": '0',
        "freightBillNumber": '0',
        "vehicle": "unknown",
        "departurePlace": "Hull",
        "nationalityOfVehicle": "",
        "registrationNumber": "",
        "transportDocuments": []
      }
      ],
      "conservation": {
        "conservationReference": "UK Fisheries Policy"
      },
      "exporterDetails": {
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
        "buildingNumber": null,
        "subBuildingName": "NATURAL ENGLAND",
        "buildingName": "LANCASTER HOUSE",
        "streetName": "HAMPSHIRE COURT",
        "county": null,
        "country": "United Kingdom of Great Britain and Northern Ireland",
        "postcode": "NE4 7YH",
        "townCity": "NEWCASTLE UPON TYNE",
        "exporterCompanyName": "Automation Testing Ltd",
        "exporterFullName": "Automation Tester",
        "_dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        },
        "_dynamicsUser": {
          "firstName": "Automation",
          "lastName": "Tester"
        }
      },
      "landingsEntryOption": "manualEntry"
    },
    "createdByEmail": "foo@foo.com",
    "documentUri": "_44fd226f-598f-4615-930f-716b2762fea4.pdf",
    "investigation": {
      "investigator": "Chris Waugh",
      "status": "CLOSED_NFA"
    },
    "numberOfFailedAttempts": 5
  };

  const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
    "documentNumber": "GBR-2023-CC-C58DF9A73",
    "caseType1": CaseOneType.CatchCertificate,
    "caseType2": CaseTwoType.PendingLandingData,
    "numberOfFailedSubmissions": 0,
    "isDirectLanding": false,
    "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
    "documentDate": "2023-08-31T18:27:00.000Z",
    "exporter": {
      "fullName": "Automation Tester",
      "companyName": "Automation Testing Ltd",
      "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
      "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
      "address": {
        "building_number": null,
        "sub_building_name": "NATURAL ENGLAND",
        "building_name": "LANCASTER HOUSE",
        "street_name": "HAMPSHIRE COURT",
        "county": null,
        "country": "United Kingdom of Great Britain and Northern Ireland",
        "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
        "city": "NEWCASTLE UPON TYNE",
        "postCode": "NE4 7YH"
      },
      "dynamicsAddress": {
        "defra_uprn": "10091818796",
        "defra_buildingname": "LANCASTER HOUSE",
        "defra_subbuildingname": "NATURAL ENGLAND",
        "defra_premises": null,
        "defra_street": "HAMPSHIRE COURT",
        "defra_locality": "NEWCASTLE BUSINESS PARK",
        "defra_dependentlocality": null,
        "defra_towntext": "NEWCASTLE UPON TYNE",
        "defra_county": null,
        "defra_postcode": "NE4 7YH",
        "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
        "defra_internationalpostalcode": null,
        "defra_fromcompanieshouse": false,
        "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
        "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
        "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
        "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
        "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
      }
    },
    "landings": [
      {
        "status": LandingStatusType.DataNeverExpected,
        "id": "GBR-2023-CC-C58DF9A73-4248789552",
        "landingDate": "2023-08-31",
        "species": "BSF",
        "cnCode": "03028990",
        "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
        "scientificName": "Aphanopus carbo",
        "is14DayLimitReached": true,
        "state": "FRE",
        "presentation": "GUT",
        "vesselName": "ASHLEIGH JANE",
        "vesselPln": "OB81",
        "vesselLength": 9.91,
        "vesselAdministration": "Scotland",
        "licenceHolder": "C & J SHELLFISH LTD",
        "speciesAlias": "N",
        "weight": 89,
        "numberOfTotalSubmissions": 1,
        "vesselOverriddenByAdmin": false,
        "speciesOverriddenByAdmin": false,
        "dataEverExpected": false,
        "isLate": undefined,
        "validation": {
          "liveExportWeight": 110.36,
          "totalRecordedAgainstLanding": 220.72,
          "landedWeightExceededBy": null,
          "rawLandingsUrl": "http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=A12860",
          "salesNoteUrl": "http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=A12860",
          "isLegallyDue": false
        },
        "risking": {
          "vessel": "0.5",
          "speciesRisk": "1",
          "exporterRiskScore": "1",
          "landingRiskScore": "0.5",
          "highOrLowRisk": LevelOfRiskType.Low,
          "isSpeciesRiskEnabled": false
        }
      }
    ],
    "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
    "requestedByAdmin": false,
    "isUnblocked": false,
    "da": "England",
    "vesselOverriddenByAdmin": false,
    "speciesOverriddenByAdmin": false,
    "failureIrrespectiveOfRisk": true,
    "exportedTo": {
      "officialCountryName": "Åland Islands",
      "isoCodeAlpha2": "AX",
      "isoCodeAlpha3": "ALA"
    }
  };

  const ccQueryResults: ICcQueryResult[] = [{
    documentNumber: 'CC1',
    documentType: 'catchCertificate',
    createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
    status: 'COMPLETE',
    rssNumber: 'C20415',
    da: 'Scotland',
    dateLanded: '2023-08-31',
    startDate: '2023-08-31',
    species: 'BSF',
    weightOnCert: 121,
    rawWeightOnCert: 122,
    weightOnAllCerts: 200,
    weightOnAllCertsBefore: 0,
    weightOnAllCertsAfter: 100,
    weightFactor: 5,
    isLandingExists: true,
    hasSalesNote: true,
    isSpeciesExists: false,
    numberOfLandingsOnDay: 1,
    weightOnLanding: 30,
    weightOnLandingAllSpecies: 30,
    speciesAlias: "N",
    landingTotalBreakdown: [
      {
        factor: 1.7,
        isEstimate: true,
        weight: 30,
        liveWeight: 51,
        source: LandingSources.CatchRecording
      }
    ],
    source: LandingSources.CatchRecording,
    isExceeding14DayLimit: false,
    isOverusedThisCert: false,
    isOverusedAllCerts: false,
    overUsedInfo: [],
    durationSinceCertCreation: moment.duration(
      moment.utc()
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
    durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
      moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
    durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
      moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
    extended: {
      landingId: 'GBR-2023-CC-C58DF9A73-1777642314',
      exporterName: 'Mr Bob',
      presentation: 'GUT',
      documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
      presentationName: 'sliced',
      vessel: 'AGAN BORLOWEN',
      fao: 'FAO27',
      pln: 'SS229',
      species: 'Lobster',
      scientificName: "Aphanopus carbo",
      state: 'FRE',
      stateName: 'fresh',
      commodityCode: '03028990',
      commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
      investigation: {
        investigator: "Investigator Gadget",
        status: InvestigationStatus.Open
      },
      transportationVehicle: 'truck',
      flag: "GBR",
      homePort: "NEWLYN",
      licenceNumber: "25072",
      licenceValidTo: "2030-12-31",
      licenceHolder: "MR S CLARY-BROM ",
      imoNumber: null,
      numberOfSubmissions: 1,
      isLegallyDue: true
    }
  }]

  const ccQueryResultsWithRiskScore: ICcQueryResult[] = [{
    documentNumber: 'CC1',
    documentType: 'catchCertificate',
    createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
    status: 'COMPLETE',
    rssNumber: 'C20415',
    da: 'Scotland',
    startDate: '2023-08-31',
    dateLanded: '2023-08-31',
    species: 'BSF',
    weightOnCert: 121,
    rawWeightOnCert: 122,
    weightOnAllCerts: 200,
    weightOnAllCertsBefore: 0,
    weightOnAllCertsAfter: 100,
    weightFactor: 5,
    isLandingExists: true,
    hasSalesNote: true,
    isSpeciesExists: false,
    numberOfLandingsOnDay: 1,
    weightOnLanding: 30,
    weightOnLandingAllSpecies: 30,
    speciesAlias: "N",
    landingTotalBreakdown: [
      {
        factor: 1.7,
        isEstimate: true,
        weight: 30,
        liveWeight: 51,
        source: LandingSources.CatchRecording
      }
    ],
    source: LandingSources.CatchRecording,
    isExceeding14DayLimit: false,
    isOverusedThisCert: false,
    isOverusedAllCerts: false,
    overUsedInfo: [],
    durationSinceCertCreation: moment.duration(
      moment.utc()
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
    durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
      moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
    durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
      moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
    extended: {
      landingId: 'GBR-2023-CC-C58DF9A73-1777642314',
      exporterName: 'Mr Bob',
      presentation: 'GUT',
      documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
      presentationName: 'sliced',
      vessel: 'AGAN BORLOWEN',
      fao: 'FAO27',
      pln: 'SS229',
      species: 'Lobster',
      scientificName: "Aphanopus carbo",
      state: 'FRE',
      stateName: 'fresh',
      commodityCode: '03028990',
      commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
      investigation: {
        investigator: "Investigator Gadget",
        status: InvestigationStatus.Open
      },
      transportationVehicle: 'truck',
      flag: "GBR",
      homePort: "NEWLYN",
      licenceNumber: "25072",
      licenceValidTo: "2030-12-31",
      licenceHolder: "MR S CLARY-BROM ",
      imoNumber: null,
      numberOfSubmissions: 1,
      isLegallyDue: true,
      riskScore: 0.2,
      threshold: 1,
      vesselRiskScore: 1,
      speciesRiskScore: 0.1,
      exporterRiskScore: 0.3,
      isSpeciesRiskEnabled: false
    }
  }]
  let mockGetRssNumber;
  let mockGetVesselService;

  beforeEach(() => {
    mockGetRssNumber = jest.spyOn(vessel, 'getRssNumber');
    mockGetRssNumber.mockReturnValue("C20415");

    mockGetVesselService = jest.spyOn(vessel, 'getVesselDetails');
    mockGetVesselService.mockReturnValue({
      fishingVesselName: "AGAN BORLOWEN",
      ircs: null,
      cfr: "GBR000C20415",
      flag: "GBR",
      homePort: "NEWLYN",
      registrationNumber: "SS229",
      imo: null,
      fishingLicenceNumber: "25072",
      fishingLicenceValidFrom: "2014-07-01T00:00:00",
      fishingLicenceValidTo: "2030-12-31T00:00:00",
      adminPort: "NEWLYN",
      rssNumber: "C20415",
      vesselLength: 6.88,
      licenceHolderName: "MR S CLARY-BROM "
    })
  });

  afterEach(() => {
    mockGetRssNumber.mockRestore();
    mockGetVesselService.mockRestore();
  })

  it('will return a IDefraTradeCatchCertificate payload', () => {
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc(exampleCc, dynamicsCatchCertificateCase, ccQueryResults);
    const expected: IDefraTradeCatchCertificate = {
      documentNumber: "GBR-2023-CC-C58DF9A73",
      certStatus: CertificateStatus.COMPLETE,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.PendingLandingData,
      numberOfFailedSubmissions: 0,
      isDirectLanding: false,
      documentUrl: "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      documentDate: "2023-08-31T18:27:00.000Z",
      exporter: {
        fullName: "Automation Tester",
        companyName: "Automation Testing Ltd",
        contactId: "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        accountId: "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        address: {
          building_number: null,
          sub_building_name: "NATURAL ENGLAND",
          building_name: "LANCASTER HOUSE",
          street_name: "HAMPSHIRE COURT",
          county: null,
          country: "United Kingdom of Great Britain and Northern Ireland",
          line1: "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          city: "NEWCASTLE UPON TYNE",
          postCode: "NE4 7YH"
        },
        dynamicsAddress: {
          defra_uprn: "10091818796",
          defra_buildingname: "LANCASTER HOUSE",
          defra_subbuildingname: "NATURAL ENGLAND",
          defra_premises: null,
          defra_street: "HAMPSHIRE COURT",
          defra_locality: "NEWCASTLE BUSINESS PARK",
          defra_dependentlocality: null,
          defra_towntext: "NEWCASTLE UPON TYNE",
          defra_county: null,
          defra_postcode: "NE4 7YH",
          _defra_country_value: "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          defra_internationalpostalcode: null,
          defra_fromcompanieshouse: false,
          defra_addressid: "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          _defra_country_value_OData_Community_Display_V1_FormattedValue: "United Kingdom of Great Britain and Northern Ireland",
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: "defra_Country",
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: "defra_country",
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: "No"
        }
      },
      landings: [
        {
          status: DefraCcLandingStatusType.ValidationFailure_Species,
          id: "GBR-2023-CC-C58DF9A73-1777642314",
          startDate: "2023-08-31",
          landingDate: "2023-08-31",
          species: "Lobster",
          cnCode: "03028990",
          commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
          scientificName: "Aphanopus carbo",
          is14DayLimitReached: true,
          state: "FRE",
          presentation: "GUT",
          vesselName: "AGAN BORLOWEN",
          vesselPln: "SS229",
          vesselLength: 6.88,
          vesselAdministration: "Scotland",
          licenceHolder: "MR S CLARY-BROM ",
          speciesAlias: "N",
          speciesAnomaly: undefined,
          weight: 122,
          numberOfTotalSubmissions: 1,
          vesselOverriddenByAdmin: false,
          speciesOverriddenByAdmin: false,
          dataEverExpected: true,
          dateDataReceived: undefined,
          isLate: undefined,
          landingDataEndDate: undefined,
          landingDataExpectedAtSubmission: true,
          landingDataExpectedDate: undefined,
          landingOutcomeAtRetrospectiveCheck: LandingRetrospectiveOutcomeType.Failure,
          catchArea: CatchArea.FAO27,
          fishingLicenceNumber: "25072",
          fishingLicenceValidTo: "2030-12-31",
          flag: "GBR",
          homePort: "NEWLYN",
          source: "CATCH_RECORDING",
          imo: null,
          validation: {
            isLegallyDue: true,
            landedWeightExceededBy: 143.9,
            liveExportWeight: 121,
            rawLandingsUrl: "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            salesNoteUrl: "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            totalEstimatedForExportSpecies: 30,
            totalEstimatedWithTolerance: 56.1,
            totalLiveForExportSpecies: undefined,
            totalRecordedAgainstLanding: 200,
            totalWeightForSpecies: undefined,
          },
          risking: {
            vessel: "0",
            speciesRisk: "0",
            exporterRiskScore: "0",
            landingRiskScore: "0",
            highOrLowRisk: LevelOfRiskType.Low,
            isSpeciesRiskEnabled: false,
            overuseInfo: undefined,
          },
          adminCommodityCode: undefined,
          adminPresentation: undefined,
          adminSpecies: undefined,
          adminState: undefined,
        }
      ],
      _correlationId: "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      requestedByAdmin: false,
      isUnblocked: false,
      da: "England",
      vesselOverriddenByAdmin: false,
      speciesOverriddenByAdmin: false,
      failureIrrespectiveOfRisk: true,
      exportedTo: {
        officialCountryName: "Åland Islands",
        isoCodeAlpha2: "AX",
        isoCodeAlpha3: "ALA",
        isoNumericCode: "248",
      },
      multiVesselSchedule: false,
      transportation: {
        modeofTransport: "truck",
        hasRoadTransportDocument: true,
      },
    };

    expect(result).toStrictEqual(expected);
  });

  it('will return a IDefraTradeCatchCertificate payload with direct landing', () => {
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc({
      ...exampleCc, exportData: {
        ...exampleCc.exportData, transportation: {
          exportedFrom: "United Kingdom",
          exportedTo: {
            officialCountryName: "France",
            isoCodeAlpha2: "FR",
            isoCodeAlpha3: "FRA",
            isoNumericCode: "250"
          },
          vehicle: "directLanding"
        },
      }
    }, dynamicsCatchCertificateCase, ccQueryResults);

    const expected: IDefraTradeCatchCertificate = {
      documentNumber: "GBR-2023-CC-C58DF9A73",
      certStatus: CertificateStatus.COMPLETE,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.PendingLandingData,
      numberOfFailedSubmissions: 0,
      isDirectLanding: false,
      documentUrl: "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      documentDate: "2023-08-31T18:27:00.000Z",
      exporter: {
        fullName: "Automation Tester",
        companyName: "Automation Testing Ltd",
        contactId: "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        accountId: "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        address: {
          building_number: null,
          sub_building_name: "NATURAL ENGLAND",
          building_name: "LANCASTER HOUSE",
          street_name: "HAMPSHIRE COURT",
          county: null,
          country: "United Kingdom of Great Britain and Northern Ireland",
          line1: "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          city: "NEWCASTLE UPON TYNE",
          postCode: "NE4 7YH"
        },
        dynamicsAddress: {
          defra_uprn: "10091818796",
          defra_buildingname: "LANCASTER HOUSE",
          defra_subbuildingname: "NATURAL ENGLAND",
          defra_premises: null,
          defra_street: "HAMPSHIRE COURT",
          defra_locality: "NEWCASTLE BUSINESS PARK",
          defra_dependentlocality: null,
          defra_towntext: "NEWCASTLE UPON TYNE",
          defra_county: null,
          defra_postcode: "NE4 7YH",
          _defra_country_value: "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          defra_internationalpostalcode: null,
          defra_fromcompanieshouse: false,
          defra_addressid: "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          _defra_country_value_OData_Community_Display_V1_FormattedValue: "United Kingdom of Great Britain and Northern Ireland",
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: "defra_Country",
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: "defra_country",
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: "No"
        }
      },
      landings: [
        {
          status: DefraCcLandingStatusType.ValidationFailure_Species,
          id: "GBR-2023-CC-C58DF9A73-1777642314",
          startDate: "2023-08-31",
          landingDate: "2023-08-31",
          species: "Lobster",
          cnCode: "03028990",
          commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
          scientificName: "Aphanopus carbo",
          is14DayLimitReached: true,
          state: "FRE",
          presentation: "GUT",
          vesselName: "AGAN BORLOWEN",
          vesselPln: "SS229",
          vesselLength: 6.88,
          vesselAdministration: "Scotland",
          licenceHolder: "MR S CLARY-BROM ",
          speciesAlias: "N",
          speciesAnomaly: undefined,
          weight: 122,
          numberOfTotalSubmissions: 1,
          vesselOverriddenByAdmin: false,
          speciesOverriddenByAdmin: false,
          dataEverExpected: true,
          dateDataReceived: undefined,
          isLate: undefined,
          landingDataEndDate: undefined,
          landingDataExpectedAtSubmission: true,
          landingDataExpectedDate: undefined,
          landingOutcomeAtRetrospectiveCheck: LandingRetrospectiveOutcomeType.Failure,
          catchArea: CatchArea.FAO27,
          fishingLicenceNumber: "25072",
          fishingLicenceValidTo: "2030-12-31",
          flag: "GBR",
          homePort: "NEWLYN",
          source: "CATCH_RECORDING",
          imo: null,
          validation: {
            isLegallyDue: true,
            landedWeightExceededBy: 143.9,
            liveExportWeight: 121,
            rawLandingsUrl: "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            salesNoteUrl: "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            totalEstimatedForExportSpecies: 30,
            totalEstimatedWithTolerance: 56.1,
            totalLiveForExportSpecies: undefined,
            totalRecordedAgainstLanding: 200,
            totalWeightForSpecies: undefined,
          },
          risking: {
            vessel: "0",
            speciesRisk: "0",
            exporterRiskScore: "0",
            landingRiskScore: "0",
            highOrLowRisk: LevelOfRiskType.Low,
            isSpeciesRiskEnabled: false,
            overuseInfo: undefined,
          },
          adminCommodityCode: undefined,
          adminPresentation: undefined,
          adminSpecies: undefined,
          adminState: undefined,
        }
      ],
      _correlationId: "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      requestedByAdmin: false,
      isUnblocked: false,
      da: "England",
      vesselOverriddenByAdmin: false,
      speciesOverriddenByAdmin: false,
      failureIrrespectiveOfRisk: true,
      exportedTo: {
        officialCountryName: "France",
        isoCodeAlpha2: "FR",
        isoCodeAlpha3: "FRA",
        isoNumericCode: "250",
      },
      multiVesselSchedule: false,
      transportation: {
        modeofTransport: 'directLanding'
      }
    };

    expect(result).toStrictEqual(expected);
  });

  it('will return a IDefraTradeCatchCertificate payload containing true for multischedule for a submission with multiple vessels', () => {
    const exampleCcMultipleVessels: IDocument = {
      ...exampleCc,
      exportData: {
        ...exampleCc.exportData,
        products: [
          {
            speciesId: "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            species: "Black scabbardfish (BSF)",
            speciesCode: "BSF",
            commodityCode: "03028990",
            commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
            scientificName: "Aphanopus carbo",
            state: {
              code: "FRE",
              name: "Fresh"
            },
            presentation: {
              code: "GUT",
              name: "Gutted"
            },
            factor: 1.24,
            caughtBy: [
              {
                vessel: "AGAN BORLOWEN",
                pln: "SS229",
                homePort: "NEWLYN",
                flag: "GBR",
                cfr: "GBR000C20415",
                imoNumber: null,
                licenceNumber: "25072",
                licenceValidTo: "2030-12-31",
                licenceHolder: "MR S CLARY-BROM ",
                id: "GBR-2023-CC-C58DF9A73-1777642314",
                date: "2023-08-31",
                faoArea: "FAO27",
                weight: 122,
                numberOfSubmissions: 1,
                isLegallyDue: false,
                dataEverExpected: true,
                landingDataExpectedDate: "2023-08-31",
                landingDataEndDate: "2023-09-02",
                _status: "PENDING_LANDING_DATA"
              },
              {
                vessel: "WIRON 5",
                pln: "H100",
                homePort: "PLYMOUTH",
                flag: "GBR",
                cfr: "NLD200202641",
                imoNumber: null,
                licenceNumber: "12480",
                licenceValidTo: "2021-08-09",
                licenceHolder: "INTERFISH WIRONS LIMITED",
                id: "GBR-2023-CC-C58DF9A73-1777642314",
                date: "2023-08-31",
                faoArea: "FAO27",
                weight: 122,
                numberOfSubmissions: 1,
                isLegallyDue: false,
                dataEverExpected: true,
                landingDataExpectedDate: "2023-08-31",
                landingDataEndDate: "2023-09-02",
                _status: "PENDING_LANDING_DATA"
              }
            ]
          }
        ]
      },
    };

    const exampleCcQueryResults: ICcQueryResult[] = [
      ...ccQueryResults,
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'C20415',
        da: 'Scotland',
        dateLanded: '2023-08-31',
        species: 'BSF',
        weightOnCert: 121,
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
        speciesAlias: "N",
        landingTotalBreakdown: [
          {
            factor: 1.7,
            isEstimate: true,
            weight: 30,
            liveWeight: 51,
            source: LandingSources.CatchRecording
          }
        ],
        source: LandingSources.CatchRecording,
        isExceeding14DayLimit: false,
        isOverusedThisCert: false,
        isOverusedAllCerts: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          moment.utc()
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          landingId: 'GBR-2023-CC-C58DF9A73-1777642314',
          exporterName: 'Mr Bob',
          presentation: 'GUT',
          documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
          presentationName: 'sliced',
          vessel: 'AGAN BORLOWEN',
          fao: 'FAO27',
          pln: 'SS229',
          species: 'Lobster',
          scientificName: "Aphanopus carbo",
          state: 'FRE',
          stateName: 'fresh',
          commodityCode: '03028990',
          commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
          investigation: {
            investigator: "Investigator Gadget",
            status: InvestigationStatus.Open
          },
          transportationVehicle: 'truck',
          flag: "GBR",
          homePort: "PLYMOUTH",
          licenceNumber: "12480",
          licenceValidTo: "2030-12-31",
          licenceHolder: "INTERFISH WIRONS LIMITED",
          imo: null,
          numberOfSubmissions: 1,
          isLegallyDue: true
        }
      }
    ]
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc(exampleCcMultipleVessels, dynamicsCatchCertificateCase, exampleCcQueryResults);

    expect(result.landings).toHaveLength(2);
    expect(result.multiVesselSchedule).toBe(true);
  });

  it('will return a IDefraTradeCatchCertificate payload containing true for multischedule for a submission with more than 6 landings', () => {
    const exampleCcMultipleLandings: IDocument = {
      ...exampleCc,
      exportData: {
        ...exampleCc.exportData,
        products: [
          {
            speciesId: "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            species: "Black scabbardfish (BSF)",
            speciesCode: "BSF",
            commodityCode: "03028990",
            commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
            scientificName: "Aphanopus carbo",
            state: {
              code: "FRE",
              name: "Fresh"
            },
            presentation: {
              code: "GUT",
              name: "Gutted"
            },
            factor: 1.24,
            caughtBy: [
              {
                vessel: "AGAN BORLOWEN",
                pln: "SS229",
                homePort: "NEWLYN",
                flag: "GBR",
                cfr: "GBR000C20415",
                imoNumber: null,
                licenceNumber: "25072",
                licenceValidTo: "2030-12-31",
                licenceHolder: "MR S CLARY-BROM ",
                id: "GBR-2023-CC-C58DF9A73-1777642314",
                date: "2023-08-31",
                faoArea: "FAO27",
                weight: 122,
                numberOfSubmissions: 1,
                isLegallyDue: false,
                dataEverExpected: true,
                landingDataExpectedDate: "2023-08-31",
                landingDataEndDate: "2023-09-02",
                _status: "PENDING_LANDING_DATA"
              }
            ]
          },
          {
            speciesId: "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            species: "Black scabbardfish (BSF)",
            speciesCode: "BSF",
            commodityCode: "03028990",
            commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
            scientificName: "Aphanopus carbo",
            state: {
              code: "FRE",
              name: "Fresh"
            },
            presentation: {
              code: "GUT",
              name: "Gutted"
            },
            factor: 1.24,
            caughtBy: [
              {
                vessel: "AGAN BORLOWEN",
                pln: "SS229",
                homePort: "NEWLYN",
                flag: "GBR",
                cfr: "GBR000C20415",
                imoNumber: null,
                licenceNumber: "25072",
                licenceValidTo: "2030-12-31",
                licenceHolder: "MR S CLARY-BROM ",
                id: "GBR-2023-CC-C58DF9A73-1777642314",
                date: "2023-08-31",
                faoArea: "FAO27",
                weight: 122,
                numberOfSubmissions: 1,
                isLegallyDue: false,
                dataEverExpected: true,
                landingDataExpectedDate: "2023-08-31",
                landingDataEndDate: "2023-09-02",
                _status: "PENDING_LANDING_DATA"
              }
            ]
          },
          {
            speciesId: "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            species: "Black scabbardfish (BSF)",
            speciesCode: "BSF",
            commodityCode: "03028990",
            commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
            scientificName: "Aphanopus carbo",
            state: {
              code: "FRE",
              name: "Fresh"
            },
            presentation: {
              code: "GUT",
              name: "Gutted"
            },
            factor: 1.24,
            caughtBy: [
              {
                vessel: "AGAN BORLOWEN",
                pln: "SS229",
                homePort: "NEWLYN",
                flag: "GBR",
                cfr: "GBR000C20415",
                imoNumber: null,
                licenceNumber: "25072",
                licenceValidTo: "2030-12-31",
                licenceHolder: "MR S CLARY-BROM ",
                id: "GBR-2023-CC-C58DF9A73-1777642314",
                date: "2023-08-31",
                faoArea: "FAO27",
                weight: 122,
                numberOfSubmissions: 1,
                isLegallyDue: false,
                dataEverExpected: true,
                landingDataExpectedDate: "2023-08-31",
                landingDataEndDate: "2023-09-02",
                _status: "PENDING_LANDING_DATA"
              }
            ]
          },
          {
            speciesId: "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            species: "Black scabbardfish (BSF)",
            speciesCode: "BSF",
            commodityCode: "03028990",
            commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
            scientificName: "Aphanopus carbo",
            state: {
              code: "FRE",
              name: "Fresh"
            },
            presentation: {
              code: "GUT",
              name: "Gutted"
            },
            factor: 1.24,
            caughtBy: [
              {
                vessel: "AGAN BORLOWEN",
                pln: "SS229",
                homePort: "NEWLYN",
                flag: "GBR",
                cfr: "GBR000C20415",
                imoNumber: null,
                licenceNumber: "25072",
                licenceValidTo: "2030-12-31",
                licenceHolder: "MR S CLARY-BROM ",
                id: "GBR-2023-CC-C58DF9A73-1777642314",
                date: "2023-08-31",
                faoArea: "FAO27",
                weight: 122,
                numberOfSubmissions: 1,
                isLegallyDue: false,
                dataEverExpected: true,
                landingDataExpectedDate: "2023-08-31",
                landingDataEndDate: "2023-09-02",
                _status: "PENDING_LANDING_DATA"
              }
            ]
          },
          {
            speciesId: "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            species: "Black scabbardfish (BSF)",
            speciesCode: "BSF",
            commodityCode: "03028990",
            commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
            scientificName: "Aphanopus carbo",
            state: {
              code: "FRE",
              name: "Fresh"
            },
            presentation: {
              code: "GUT",
              name: "Gutted"
            },
            factor: 1.24,
            caughtBy: [
              {
                vessel: "AGAN BORLOWEN",
                pln: "SS229",
                homePort: "NEWLYN",
                flag: "GBR",
                cfr: "GBR000C20415",
                imoNumber: null,
                licenceNumber: "25072",
                licenceValidTo: "2030-12-31",
                licenceHolder: "MR S CLARY-BROM ",
                id: "GBR-2023-CC-C58DF9A73-1777642314",
                date: "2023-08-31",
                faoArea: "FAO27",
                weight: 122,
                numberOfSubmissions: 1,
                isLegallyDue: false,
                dataEverExpected: true,
                landingDataExpectedDate: "2023-08-31",
                landingDataEndDate: "2023-09-02",
                _status: "PENDING_LANDING_DATA"
              }
            ]
          }, {
            speciesId: "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            species: "Black scabbardfish (BSF)",
            speciesCode: "BSF",
            commodityCode: "03028990",
            commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
            scientificName: "Aphanopus carbo",
            state: {
              code: "FRE",
              name: "Fresh"
            },
            presentation: {
              code: "GUT",
              name: "Gutted"
            },
            factor: 1.24,
            caughtBy: [
              {
                vessel: "AGAN BORLOWEN",
                pln: "SS229",
                homePort: "NEWLYN",
                flag: "GBR",
                cfr: "GBR000C20415",
                imoNumber: null,
                licenceNumber: "25072",
                licenceValidTo: "2030-12-31",
                licenceHolder: "MR S CLARY-BROM ",
                id: "GBR-2023-CC-C58DF9A73-1777642314",
                date: "2023-08-31",
                faoArea: "FAO27",
                weight: 122,
                numberOfSubmissions: 1,
                isLegallyDue: false,
                dataEverExpected: true,
                landingDataExpectedDate: "2023-08-31",
                landingDataEndDate: "2023-09-02",
                _status: "PENDING_LANDING_DATA"
              }
            ]
          },
          {
            speciesId: "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            species: "Black scabbardfish (BSF)",
            speciesCode: "BSF",
            commodityCode: "03028990",
            commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
            scientificName: "Aphanopus carbo",
            state: {
              code: "FRE",
              name: "Fresh"
            },
            presentation: {
              code: "GUT",
              name: "Gutted"
            },
            factor: 1.24,
            caughtBy: [
              {
                vessel: "AGAN BORLOWEN",
                pln: "SS229",
                homePort: "NEWLYN",
                flag: "GBR",
                cfr: "GBR000C20415",
                imoNumber: null,
                licenceNumber: "25072",
                licenceValidTo: "2030-12-31",
                licenceHolder: "MR S CLARY-BROM ",
                id: "GBR-2023-CC-C58DF9A73-1777642314",
                date: "2023-08-31",
                faoArea: "FAO27",
                weight: 122,
                numberOfSubmissions: 1,
                isLegallyDue: false,
                dataEverExpected: true,
                landingDataExpectedDate: "2023-08-31",
                landingDataEndDate: "2023-09-02",
                _status: "PENDING_LANDING_DATA"
              }
            ]
          }
        ]
      },
    };
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc(exampleCcMultipleLandings, dynamicsCatchCertificateCase, ccQueryResults);
    expect(result.multiVesselSchedule).toBe(true);
  });

  it('will return a IDefraTradeCatchCertificate payload for a VOID event', () => {
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc(exampleCc, { ...dynamicsCatchCertificateCase, caseType2: CaseTwoType.VoidByExporter }, null);
    const expected: IDefraTradeCatchCertificate = {
      documentNumber: "GBR-2023-CC-C58DF9A73",
      certStatus: CertificateStatus.VOID,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.VoidByExporter,
      numberOfFailedSubmissions: 0,
      isDirectLanding: false,
      documentUrl: "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      documentDate: "2023-08-31T18:27:00.000Z",
      exporter: {
        fullName: "Automation Tester",
        companyName: "Automation Testing Ltd",
        contactId: "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        accountId: "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        address: {
          building_number: null,
          sub_building_name: "NATURAL ENGLAND",
          building_name: "LANCASTER HOUSE",
          street_name: "HAMPSHIRE COURT",
          county: null,
          country: "United Kingdom of Great Britain and Northern Ireland",
          line1: "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          city: "NEWCASTLE UPON TYNE",
          postCode: "NE4 7YH"
        },
        dynamicsAddress: {
          defra_uprn: "10091818796",
          defra_buildingname: "LANCASTER HOUSE",
          defra_subbuildingname: "NATURAL ENGLAND",
          defra_premises: null,
          defra_street: "HAMPSHIRE COURT",
          defra_locality: "NEWCASTLE BUSINESS PARK",
          defra_dependentlocality: null,
          defra_towntext: "NEWCASTLE UPON TYNE",
          defra_county: null,
          defra_postcode: "NE4 7YH",
          _defra_country_value: "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          defra_internationalpostalcode: null,
          defra_fromcompanieshouse: false,
          defra_addressid: "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          _defra_country_value_OData_Community_Display_V1_FormattedValue: "United Kingdom of Great Britain and Northern Ireland",
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: "defra_Country",
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: "defra_country",
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: "No"
        }
      },
      landings: null,
      _correlationId: "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      requestedByAdmin: false,
      isUnblocked: false,
      da: "England",
      vesselOverriddenByAdmin: false,
      speciesOverriddenByAdmin: false,
      failureIrrespectiveOfRisk: true,
      exportedTo: {
        officialCountryName: "Åland Islands",
        isoCodeAlpha2: "AX",
        isoCodeAlpha3: "ALA",
        isoNumericCode: "248",
      },
      multiVesselSchedule: false,
      transportation: {
        modeofTransport: "truck",
        hasRoadTransportDocument: true,
      }
    };

    expect(result).toStrictEqual(expected);
  });

  it('will return a IDefraTradeCatchCertificate payload for a VOID event by an admin', () => {
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc(exampleCc, { ...dynamicsCatchCertificateCase, caseType2: CaseTwoType.VoidByAdmin }, null);
    const expected: IDefraTradeCatchCertificate = {
      documentNumber: "GBR-2023-CC-C58DF9A73",
      certStatus: CertificateStatus.VOID,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.VoidByAdmin,
      numberOfFailedSubmissions: 0,
      isDirectLanding: false,
      documentUrl: "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      documentDate: "2023-08-31T18:27:00.000Z",
      exporter: {
        fullName: "Automation Tester",
        companyName: "Automation Testing Ltd",
        contactId: "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        accountId: "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        address: {
          building_number: null,
          sub_building_name: "NATURAL ENGLAND",
          building_name: "LANCASTER HOUSE",
          street_name: "HAMPSHIRE COURT",
          county: null,
          country: "United Kingdom of Great Britain and Northern Ireland",
          line1: "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          city: "NEWCASTLE UPON TYNE",
          postCode: "NE4 7YH"
        },
        dynamicsAddress: {
          defra_uprn: "10091818796",
          defra_buildingname: "LANCASTER HOUSE",
          defra_subbuildingname: "NATURAL ENGLAND",
          defra_premises: null,
          defra_street: "HAMPSHIRE COURT",
          defra_locality: "NEWCASTLE BUSINESS PARK",
          defra_dependentlocality: null,
          defra_towntext: "NEWCASTLE UPON TYNE",
          defra_county: null,
          defra_postcode: "NE4 7YH",
          _defra_country_value: "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          defra_internationalpostalcode: null,
          defra_fromcompanieshouse: false,
          defra_addressid: "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          _defra_country_value_OData_Community_Display_V1_FormattedValue: "United Kingdom of Great Britain and Northern Ireland",
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: "defra_Country",
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: "defra_country",
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: "No"
        }
      },
      landings: null,
      _correlationId: "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      requestedByAdmin: false,
      isUnblocked: false,
      da: "England",
      vesselOverriddenByAdmin: false,
      speciesOverriddenByAdmin: false,
      failureIrrespectiveOfRisk: true,
      exportedTo: {
        officialCountryName: "Åland Islands",
        isoCodeAlpha2: "AX",
        isoCodeAlpha3: "ALA",
        isoNumericCode: "248",
      },
      multiVesselSchedule: false,
      transportation: {
        modeofTransport: "truck",
        hasRoadTransportDocument: true,
      },
    };

    expect(result).toStrictEqual(expected);
  });

  it('will return a IDefraTradeCatchCertificate payload with no products', () => {
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc({ ...exampleCc, exportData: { ...exampleCc.exportData, products: [] } }, dynamicsCatchCertificateCase, ccQueryResults);
    const expected: IDefraTradeCatchCertificate = {
      documentNumber: "GBR-2023-CC-C58DF9A73",
      certStatus: CertificateStatus.COMPLETE,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.PendingLandingData,
      numberOfFailedSubmissions: 0,
      isDirectLanding: false,
      documentUrl: "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      documentDate: "2023-08-31T18:27:00.000Z",
      exporter: {
        fullName: "Automation Tester",
        companyName: "Automation Testing Ltd",
        contactId: "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        accountId: "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        address: {
          building_number: null,
          sub_building_name: "NATURAL ENGLAND",
          building_name: "LANCASTER HOUSE",
          street_name: "HAMPSHIRE COURT",
          county: null,
          country: "United Kingdom of Great Britain and Northern Ireland",
          line1: "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          city: "NEWCASTLE UPON TYNE",
          postCode: "NE4 7YH"
        },
        dynamicsAddress: {
          defra_uprn: "10091818796",
          defra_buildingname: "LANCASTER HOUSE",
          defra_subbuildingname: "NATURAL ENGLAND",
          defra_premises: null,
          defra_street: "HAMPSHIRE COURT",
          defra_locality: "NEWCASTLE BUSINESS PARK",
          defra_dependentlocality: null,
          defra_towntext: "NEWCASTLE UPON TYNE",
          defra_county: null,
          defra_postcode: "NE4 7YH",
          _defra_country_value: "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          defra_internationalpostalcode: null,
          defra_fromcompanieshouse: false,
          defra_addressid: "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          _defra_country_value_OData_Community_Display_V1_FormattedValue: "United Kingdom of Great Britain and Northern Ireland",
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: "defra_Country",
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: "defra_country",
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: "No"
        }
      },
      landings: [
        {
          status: DefraCcLandingStatusType.ValidationFailure_Species,
          id: "GBR-2023-CC-C58DF9A73-1777642314",
          startDate: "2023-08-31",
          landingDate: "2023-08-31",
          species: "Lobster",
          cnCode: "03028990",
          commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
          scientificName: "Aphanopus carbo",
          is14DayLimitReached: true,
          state: "FRE",
          presentation: "GUT",
          vesselName: "AGAN BORLOWEN",
          vesselPln: "SS229",
          vesselLength: 6.88,
          vesselAdministration: "Scotland",
          licenceHolder: "MR S CLARY-BROM ",
          speciesAlias: "N",
          speciesAnomaly: undefined,
          weight: 122,
          numberOfTotalSubmissions: 1,
          vesselOverriddenByAdmin: false,
          speciesOverriddenByAdmin: false,
          dataEverExpected: true,
          dateDataReceived: undefined,
          isLate: undefined,
          landingDataEndDate: undefined,
          landingDataExpectedAtSubmission: true,
          landingDataExpectedDate: undefined,
          landingOutcomeAtRetrospectiveCheck: LandingRetrospectiveOutcomeType.Failure,
          catchArea: CatchArea.FAO27,
          fishingLicenceNumber: "25072",
          fishingLicenceValidTo: "2030-12-31",
          flag: "GBR",
          homePort: "NEWLYN",
          source: "CATCH_RECORDING",
          imo: null,
          validation: {
            isLegallyDue: true,
            landedWeightExceededBy: 143.9,
            liveExportWeight: 121,
            rawLandingsUrl: "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            salesNoteUrl: "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            totalEstimatedForExportSpecies: 30,
            totalEstimatedWithTolerance: 56.1,
            totalLiveForExportSpecies: undefined,
            totalRecordedAgainstLanding: 200,
            totalWeightForSpecies: undefined,
          },
          risking: {
            vessel: "0",
            speciesRisk: "0",
            exporterRiskScore: "0",
            landingRiskScore: "0",
            highOrLowRisk: LevelOfRiskType.Low,
            isSpeciesRiskEnabled: false,
            overuseInfo: undefined,
          },
          adminCommodityCode: undefined,
          adminPresentation: undefined,
          adminSpecies: undefined,
          adminState: undefined,
        }
      ],
      _correlationId: "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      requestedByAdmin: false,
      isUnblocked: false,
      da: "England",
      vesselOverriddenByAdmin: false,
      speciesOverriddenByAdmin: false,
      failureIrrespectiveOfRisk: true,
      exportedTo: {
        officialCountryName: "Åland Islands",
        isoCodeAlpha2: "AX",
        isoCodeAlpha3: "ALA",
        isoNumericCode: "248",
      },
      multiVesselSchedule: false,
      transportation: {
        modeofTransport: "truck",
        hasRoadTransportDocument: true,
      },
    };

    expect(result).toStrictEqual(expected);
  })

  it('will return a IDefraTradeCatchCertificate payload with train', () => {
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc({
      ...exampleCc, exportData: {
        ...exampleCc.exportData, transportation: {
          exportedFrom: "United Kingdom",
          exportedTo: {
            officialCountryName: "Åland Islands",
            isoCodeAlpha2: "AX",
            isoCodeAlpha3: "ALA",
            isoNumericCode: "248"
          },
          vehicle: "train"
        }
      }
    }, dynamicsCatchCertificateCase, ccQueryResults);
    const expected: IDefraTradeCatchCertificate = {
      documentNumber: "GBR-2023-CC-C58DF9A73",
      certStatus: CertificateStatus.COMPLETE,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.PendingLandingData,
      numberOfFailedSubmissions: 0,
      isDirectLanding: false,
      documentUrl: "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      documentDate: "2023-08-31T18:27:00.000Z",
      exporter: {
        fullName: "Automation Tester",
        companyName: "Automation Testing Ltd",
        contactId: "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        accountId: "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        address: {
          building_number: null,
          sub_building_name: "NATURAL ENGLAND",
          building_name: "LANCASTER HOUSE",
          street_name: "HAMPSHIRE COURT",
          county: null,
          country: "United Kingdom of Great Britain and Northern Ireland",
          line1: "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          city: "NEWCASTLE UPON TYNE",
          postCode: "NE4 7YH"
        },
        dynamicsAddress: {
          defra_uprn: "10091818796",
          defra_buildingname: "LANCASTER HOUSE",
          defra_subbuildingname: "NATURAL ENGLAND",
          defra_premises: null,
          defra_street: "HAMPSHIRE COURT",
          defra_locality: "NEWCASTLE BUSINESS PARK",
          defra_dependentlocality: null,
          defra_towntext: "NEWCASTLE UPON TYNE",
          defra_county: null,
          defra_postcode: "NE4 7YH",
          _defra_country_value: "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          defra_internationalpostalcode: null,
          defra_fromcompanieshouse: false,
          defra_addressid: "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          _defra_country_value_OData_Community_Display_V1_FormattedValue: "United Kingdom of Great Britain and Northern Ireland",
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: "defra_Country",
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: "defra_country",
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: "No"
        }
      },
      landings: [
        {
          status: DefraCcLandingStatusType.ValidationFailure_Species,
          id: "GBR-2023-CC-C58DF9A73-1777642314",
          startDate: "2023-08-31",
          landingDate: "2023-08-31",
          species: "Lobster",
          cnCode: "03028990",
          commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
          scientificName: "Aphanopus carbo",
          is14DayLimitReached: true,
          state: "FRE",
          presentation: "GUT",
          vesselName: "AGAN BORLOWEN",
          vesselPln: "SS229",
          vesselLength: 6.88,
          vesselAdministration: "Scotland",
          licenceHolder: "MR S CLARY-BROM ",
          speciesAlias: "N",
          speciesAnomaly: undefined,
          weight: 122,
          numberOfTotalSubmissions: 1,
          vesselOverriddenByAdmin: false,
          speciesOverriddenByAdmin: false,
          dataEverExpected: true,
          dateDataReceived: undefined,
          isLate: undefined,
          landingDataEndDate: undefined,
          landingDataExpectedAtSubmission: true,
          landingDataExpectedDate: undefined,
          landingOutcomeAtRetrospectiveCheck: LandingRetrospectiveOutcomeType.Failure,
          catchArea: CatchArea.FAO27,
          fishingLicenceNumber: "25072",
          fishingLicenceValidTo: "2030-12-31",
          flag: "GBR",
          homePort: "NEWLYN",
          source: "CATCH_RECORDING",
          imo: null,
          validation: {
            isLegallyDue: true,
            landedWeightExceededBy: 143.9,
            liveExportWeight: 121,
            rawLandingsUrl: "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            salesNoteUrl: "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            totalEstimatedForExportSpecies: 30,
            totalEstimatedWithTolerance: 56.1,
            totalLiveForExportSpecies: undefined,
            totalRecordedAgainstLanding: 200,
            totalWeightForSpecies: undefined,
          },
          risking: {
            vessel: "0",
            speciesRisk: "0",
            exporterRiskScore: "0",
            landingRiskScore: "0",
            highOrLowRisk: LevelOfRiskType.Low,
            isSpeciesRiskEnabled: false,
            overuseInfo: undefined,
          },
          adminCommodityCode: undefined,
          adminPresentation: undefined,
          adminSpecies: undefined,
          adminState: undefined,
        }
      ],
      _correlationId: "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      requestedByAdmin: false,
      isUnblocked: false,
      da: "England",
      vesselOverriddenByAdmin: false,
      speciesOverriddenByAdmin: false,
      failureIrrespectiveOfRisk: true,
      exportedTo: {
        officialCountryName: "Åland Islands",
        isoCodeAlpha2: "AX",
        isoCodeAlpha3: "ALA",
        isoNumericCode: "248",
      },
      multiVesselSchedule: false,
      transportation: {
        modeofTransport: "train",
      },
    };

    expect(result).toStrictEqual(expected);
  })

  it('will return a IDefraTradeCatchCertificate payload with plane', () => {
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc({
      ...exampleCc, exportData: {
        ...exampleCc.exportData, transportation: {
          exportedFrom: "United Kingdom",
          exportedTo: {
            officialCountryName: "Åland Islands",
            isoCodeAlpha2: "AX",
            isoCodeAlpha3: "ALA",
            isoNumericCode: "248"
          },
          vehicle: "plane"
        }
      }
    }, dynamicsCatchCertificateCase, ccQueryResults);
    const expected: IDefraTradeCatchCertificate = {
      documentNumber: "GBR-2023-CC-C58DF9A73",
      certStatus: CertificateStatus.COMPLETE,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.PendingLandingData,
      numberOfFailedSubmissions: 0,
      isDirectLanding: false,
      documentUrl: "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      documentDate: "2023-08-31T18:27:00.000Z",
      exporter: {
        fullName: "Automation Tester",
        companyName: "Automation Testing Ltd",
        contactId: "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        accountId: "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        address: {
          building_number: null,
          sub_building_name: "NATURAL ENGLAND",
          building_name: "LANCASTER HOUSE",
          street_name: "HAMPSHIRE COURT",
          county: null,
          country: "United Kingdom of Great Britain and Northern Ireland",
          line1: "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          city: "NEWCASTLE UPON TYNE",
          postCode: "NE4 7YH"
        },
        dynamicsAddress: {
          defra_uprn: "10091818796",
          defra_buildingname: "LANCASTER HOUSE",
          defra_subbuildingname: "NATURAL ENGLAND",
          defra_premises: null,
          defra_street: "HAMPSHIRE COURT",
          defra_locality: "NEWCASTLE BUSINESS PARK",
          defra_dependentlocality: null,
          defra_towntext: "NEWCASTLE UPON TYNE",
          defra_county: null,
          defra_postcode: "NE4 7YH",
          _defra_country_value: "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          defra_internationalpostalcode: null,
          defra_fromcompanieshouse: false,
          defra_addressid: "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          _defra_country_value_OData_Community_Display_V1_FormattedValue: "United Kingdom of Great Britain and Northern Ireland",
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: "defra_Country",
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: "defra_country",
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: "No"
        }
      },
      landings: [
        {
          status: DefraCcLandingStatusType.ValidationFailure_Species,
          id: "GBR-2023-CC-C58DF9A73-1777642314",
          startDate: "2023-08-31",
          landingDate: "2023-08-31",
          species: "Lobster",
          cnCode: "03028990",
          commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
          scientificName: "Aphanopus carbo",
          is14DayLimitReached: true,
          state: "FRE",
          presentation: "GUT",
          vesselName: "AGAN BORLOWEN",
          vesselPln: "SS229",
          vesselLength: 6.88,
          vesselAdministration: "Scotland",
          licenceHolder: "MR S CLARY-BROM ",
          speciesAlias: "N",
          speciesAnomaly: undefined,
          weight: 122,
          numberOfTotalSubmissions: 1,
          vesselOverriddenByAdmin: false,
          speciesOverriddenByAdmin: false,
          dataEverExpected: true,
          dateDataReceived: undefined,
          isLate: undefined,
          landingDataEndDate: undefined,
          landingDataExpectedAtSubmission: true,
          landingDataExpectedDate: undefined,
          landingOutcomeAtRetrospectiveCheck: LandingRetrospectiveOutcomeType.Failure,
          catchArea: CatchArea.FAO27,
          fishingLicenceNumber: "25072",
          fishingLicenceValidTo: "2030-12-31",
          flag: "GBR",
          homePort: "NEWLYN",
          source: "CATCH_RECORDING",
          imo: null,
          validation: {
            isLegallyDue: true,
            landedWeightExceededBy: 143.9,
            liveExportWeight: 121,
            rawLandingsUrl: "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            salesNoteUrl: "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            totalEstimatedForExportSpecies: 30,
            totalEstimatedWithTolerance: 56.1,
            totalLiveForExportSpecies: undefined,
            totalRecordedAgainstLanding: 200,
            totalWeightForSpecies: undefined,
          },
          risking: {
            vessel: "0",
            speciesRisk: "0",
            exporterRiskScore: "0",
            landingRiskScore: "0",
            highOrLowRisk: LevelOfRiskType.Low,
            isSpeciesRiskEnabled: false,
            overuseInfo: undefined,
          },
          adminCommodityCode: undefined,
          adminPresentation: undefined,
          adminSpecies: undefined,
          adminState: undefined,
        }
      ],
      _correlationId: "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      requestedByAdmin: false,
      isUnblocked: false,
      da: "England",
      vesselOverriddenByAdmin: false,
      speciesOverriddenByAdmin: false,
      failureIrrespectiveOfRisk: true,
      exportedTo: {
        officialCountryName: "Åland Islands",
        isoCodeAlpha2: "AX",
        isoCodeAlpha3: "ALA",
        isoNumericCode: "248",
      },
      multiVesselSchedule: false,
      transportation: {
        modeofTransport: "plane",
      },
    };

    expect(result).toStrictEqual(expected);
  })

  it('will return a IDefraTradeCatchCertificate payload with container vessel', () => {
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc({
      ...exampleCc, exportData: {
        ...exampleCc.exportData, transportation: {
          exportedFrom: "United Kingdom",
          exportedTo: {
            officialCountryName: "Åland Islands",
            isoCodeAlpha2: "AX",
            isoCodeAlpha3: "ALA",
            isoNumericCode: "248"
          },
          vehicle: "containerVessel"
        }
      }
    }, dynamicsCatchCertificateCase, ccQueryResults);
    const expected: IDefraTradeCatchCertificate = {
      documentNumber: "GBR-2023-CC-C58DF9A73",
      certStatus: CertificateStatus.COMPLETE,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.PendingLandingData,
      numberOfFailedSubmissions: 0,
      isDirectLanding: false,
      documentUrl: "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      documentDate: "2023-08-31T18:27:00.000Z",
      exporter: {
        fullName: "Automation Tester",
        companyName: "Automation Testing Ltd",
        contactId: "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        accountId: "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        address: {
          building_number: null,
          sub_building_name: "NATURAL ENGLAND",
          building_name: "LANCASTER HOUSE",
          street_name: "HAMPSHIRE COURT",
          county: null,
          country: "United Kingdom of Great Britain and Northern Ireland",
          line1: "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          city: "NEWCASTLE UPON TYNE",
          postCode: "NE4 7YH"
        },
        dynamicsAddress: {
          defra_uprn: "10091818796",
          defra_buildingname: "LANCASTER HOUSE",
          defra_subbuildingname: "NATURAL ENGLAND",
          defra_premises: null,
          defra_street: "HAMPSHIRE COURT",
          defra_locality: "NEWCASTLE BUSINESS PARK",
          defra_dependentlocality: null,
          defra_towntext: "NEWCASTLE UPON TYNE",
          defra_county: null,
          defra_postcode: "NE4 7YH",
          _defra_country_value: "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          defra_internationalpostalcode: null,
          defra_fromcompanieshouse: false,
          defra_addressid: "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          _defra_country_value_OData_Community_Display_V1_FormattedValue: "United Kingdom of Great Britain and Northern Ireland",
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: "defra_Country",
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: "defra_country",
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: "No"
        }
      },
      landings: [
        {
          status: DefraCcLandingStatusType.ValidationFailure_Species,
          id: "GBR-2023-CC-C58DF9A73-1777642314",
          startDate: "2023-08-31",
          landingDate: "2023-08-31",
          species: "Lobster",
          cnCode: "03028990",
          commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
          scientificName: "Aphanopus carbo",
          is14DayLimitReached: true,
          state: "FRE",
          presentation: "GUT",
          vesselName: "AGAN BORLOWEN",
          vesselPln: "SS229",
          vesselLength: 6.88,
          vesselAdministration: "Scotland",
          licenceHolder: "MR S CLARY-BROM ",
          speciesAlias: "N",
          speciesAnomaly: undefined,
          weight: 122,
          numberOfTotalSubmissions: 1,
          vesselOverriddenByAdmin: false,
          speciesOverriddenByAdmin: false,
          dataEverExpected: true,
          dateDataReceived: undefined,
          isLate: undefined,
          landingDataEndDate: undefined,
          landingDataExpectedAtSubmission: true,
          landingDataExpectedDate: undefined,
          landingOutcomeAtRetrospectiveCheck: LandingRetrospectiveOutcomeType.Failure,
          catchArea: CatchArea.FAO27,
          fishingLicenceNumber: "25072",
          fishingLicenceValidTo: "2030-12-31",
          flag: "GBR",
          homePort: "NEWLYN",
          source: "CATCH_RECORDING",
          imo: null,
          validation: {
            isLegallyDue: true,
            landedWeightExceededBy: 143.9,
            liveExportWeight: 121,
            rawLandingsUrl: "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            salesNoteUrl: "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            totalEstimatedForExportSpecies: 30,
            totalEstimatedWithTolerance: 56.1,
            totalLiveForExportSpecies: undefined,
            totalRecordedAgainstLanding: 200,
            totalWeightForSpecies: undefined,
          },
          risking: {
            vessel: "0",
            speciesRisk: "0",
            exporterRiskScore: "0",
            landingRiskScore: "0",
            highOrLowRisk: LevelOfRiskType.Low,
            isSpeciesRiskEnabled: false,
            overuseInfo: undefined,
          },
          adminCommodityCode: undefined,
          adminPresentation: undefined,
          adminSpecies: undefined,
          adminState: undefined,
        }
      ],
      _correlationId: "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      requestedByAdmin: false,
      isUnblocked: false,
      da: "England",
      vesselOverriddenByAdmin: false,
      speciesOverriddenByAdmin: false,
      failureIrrespectiveOfRisk: true,
      exportedTo: {
        officialCountryName: "Åland Islands",
        isoCodeAlpha2: "AX",
        isoCodeAlpha3: "ALA",
        isoNumericCode: "248",
      },
      multiVesselSchedule: false,
      transportation: {
        modeofTransport: "vessel",
      },
    };

    expect(result).toStrictEqual(expected);
  })

  it('will return a IDefraTradeCatchCertificate payload with no transport', () => {
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc({ ...exampleCc, exportData: { ...exampleCc.exportData, transportation: undefined, transportations: undefined} }, dynamicsCatchCertificateCase, ccQueryResults);
    expect(result).toStrictEqual({
      documentNumber: "GBR-2023-CC-C58DF9A73",
      certStatus: CertificateStatus.COMPLETE,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.PendingLandingData,
      numberOfFailedSubmissions: 0,
      isDirectLanding: false,
      documentUrl: "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      exportedTo: undefined,
      documentDate: "2023-08-31T18:27:00.000Z",
      exporter: {
        fullName: "Automation Tester",
        companyName: "Automation Testing Ltd",
        contactId: "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        accountId: "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        address: {
          building_number: null,
          sub_building_name: "NATURAL ENGLAND",
          building_name: "LANCASTER HOUSE",
          street_name: "HAMPSHIRE COURT",
          county: null,
          country: "United Kingdom of Great Britain and Northern Ireland",
          line1: "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          city: "NEWCASTLE UPON TYNE",
          postCode: "NE4 7YH"
        },
        dynamicsAddress: {
          defra_uprn: "10091818796",
          defra_buildingname: "LANCASTER HOUSE",
          defra_subbuildingname: "NATURAL ENGLAND",
          defra_premises: null,
          defra_street: "HAMPSHIRE COURT",
          defra_locality: "NEWCASTLE BUSINESS PARK",
          defra_dependentlocality: null,
          defra_towntext: "NEWCASTLE UPON TYNE",
          defra_county: null,
          defra_postcode: "NE4 7YH",
          _defra_country_value: "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          defra_internationalpostalcode: null,
          defra_fromcompanieshouse: false,
          defra_addressid: "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          _defra_country_value_OData_Community_Display_V1_FormattedValue: "United Kingdom of Great Britain and Northern Ireland",
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: "defra_Country",
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: "defra_country",
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: "No"
        }
      },
      landings: [
        {
          status: DefraCcLandingStatusType.ValidationFailure_Species,
          id: "GBR-2023-CC-C58DF9A73-1777642314",
          startDate: "2023-08-31",
          landingDate: "2023-08-31",
          species: "Lobster",
          cnCode: "03028990",
          commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
          scientificName: "Aphanopus carbo",
          is14DayLimitReached: true,
          state: "FRE",
          presentation: "GUT",
          vesselName: "AGAN BORLOWEN",
          vesselPln: "SS229",
          vesselLength: 6.88,
          vesselAdministration: "Scotland",
          licenceHolder: "MR S CLARY-BROM ",
          speciesAlias: "N",
          speciesAnomaly: undefined,
          weight: 122,
          numberOfTotalSubmissions: 1,
          vesselOverriddenByAdmin: false,
          speciesOverriddenByAdmin: false,
          dataEverExpected: true,
          dateDataReceived: undefined,
          isLate: undefined,
          landingDataEndDate: undefined,
          landingDataExpectedAtSubmission: true,
          landingDataExpectedDate: undefined,
          landingOutcomeAtRetrospectiveCheck: LandingRetrospectiveOutcomeType.Failure,
          catchArea: CatchArea.FAO27,
          fishingLicenceNumber: "25072",
          fishingLicenceValidTo: "2030-12-31",
          flag: "GBR",
          homePort: "NEWLYN",
          source: "CATCH_RECORDING",
          imo: null,
          validation: {
            isLegallyDue: true,
            landedWeightExceededBy: 143.9,
            liveExportWeight: 121,
            rawLandingsUrl: "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            salesNoteUrl: "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            totalEstimatedForExportSpecies: 30,
            totalEstimatedWithTolerance: 56.1,
            totalLiveForExportSpecies: undefined,
            totalRecordedAgainstLanding: 200,
            totalWeightForSpecies: undefined,
          },
          risking: {
            vessel: "0",
            speciesRisk: "0",
            exporterRiskScore: "0",
            landingRiskScore: "0",
            highOrLowRisk: LevelOfRiskType.Low,
            isSpeciesRiskEnabled: false,
            overuseInfo: undefined,
          },
          adminCommodityCode: undefined,
          adminPresentation: undefined,
          adminSpecies: undefined,
          adminState: undefined,
        }
      ],
      _correlationId: "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      requestedByAdmin: false,
      isUnblocked: false,
      da: "England",
      vesselOverriddenByAdmin: false,
      speciesOverriddenByAdmin: false,
      failureIrrespectiveOfRisk: true,
      multiVesselSchedule: false,
      transportation: undefined,
    });
  })

  it('will return a IDefraTradeCatchCertificate payload with exportTo', () => {
    const transportations = [{
      "id": '0',
      "freightBillNumber": '0',
      "vehicle": "truck",
      "departurePlace": "Hull",
      "nationalityOfVehicle": "",
      "registrationNumber": "",
      "transportDocuments": [{
        "name": "Invoice",
        "reference": "INV001"
      }]
    }]

    const exportedFrom = "United Kingdom";
    const exportedTo = {
      "officialCountryName": "Åland Islands",
      "isoCodeAlpha2": "AX",
      "isoCodeAlpha3": "ALA",
      "isoNumericCode": "248"
    }
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc({ ...exampleCc, exportData: { ...exampleCc.exportData, transportation: undefined, transportations, exportedFrom, exportedTo } }, dynamicsCatchCertificateCase, ccQueryResults);
    expect(result).toStrictEqual({
      documentNumber: "GBR-2023-CC-C58DF9A73",
      certStatus: CertificateStatus.COMPLETE,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.PendingLandingData,
      numberOfFailedSubmissions: 0,
      isDirectLanding: false,
      documentUrl: "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      exportedTo: {
        officialCountryName: "Åland Islands",
        isoCodeAlpha2: "AX",
        isoCodeAlpha3: "ALA",
        isoNumericCode: "248"
      },
      documentDate: "2023-08-31T18:27:00.000Z",
      exporter: {
        fullName: "Automation Tester",
        companyName: "Automation Testing Ltd",
        contactId: "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        accountId: "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        address: {
          building_number: null,
          sub_building_name: "NATURAL ENGLAND",
          building_name: "LANCASTER HOUSE",
          street_name: "HAMPSHIRE COURT",
          county: null,
          country: "United Kingdom of Great Britain and Northern Ireland",
          line1: "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          city: "NEWCASTLE UPON TYNE",
          postCode: "NE4 7YH"
        },
        dynamicsAddress: {
          defra_uprn: "10091818796",
          defra_buildingname: "LANCASTER HOUSE",
          defra_subbuildingname: "NATURAL ENGLAND",
          defra_premises: null,
          defra_street: "HAMPSHIRE COURT",
          defra_locality: "NEWCASTLE BUSINESS PARK",
          defra_dependentlocality: null,
          defra_towntext: "NEWCASTLE UPON TYNE",
          defra_county: null,
          defra_postcode: "NE4 7YH",
          _defra_country_value: "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          defra_internationalpostalcode: null,
          defra_fromcompanieshouse: false,
          defra_addressid: "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          _defra_country_value_OData_Community_Display_V1_FormattedValue: "United Kingdom of Great Britain and Northern Ireland",
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: "defra_Country",
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: "defra_country",
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: "No"
        }
      },
      landings: [
        {
          status: DefraCcLandingStatusType.ValidationFailure_Species,
          id: "GBR-2023-CC-C58DF9A73-1777642314",
          startDate: "2023-08-31",
          landingDate: "2023-08-31",
          species: "Lobster",
          cnCode: "03028990",
          commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
          scientificName: "Aphanopus carbo",
          is14DayLimitReached: true,
          state: "FRE",
          presentation: "GUT",
          vesselName: "AGAN BORLOWEN",
          vesselPln: "SS229",
          vesselLength: 6.88,
          vesselAdministration: "Scotland",
          licenceHolder: "MR S CLARY-BROM ",
          speciesAlias: "N",
          speciesAnomaly: undefined,
          weight: 122,
          numberOfTotalSubmissions: 1,
          vesselOverriddenByAdmin: false,
          speciesOverriddenByAdmin: false,
          dataEverExpected: true,
          dateDataReceived: undefined,
          isLate: undefined,
          landingDataEndDate: undefined,
          landingDataExpectedAtSubmission: true,
          landingDataExpectedDate: undefined,
          landingOutcomeAtRetrospectiveCheck: LandingRetrospectiveOutcomeType.Failure,
          catchArea: CatchArea.FAO27,
          fishingLicenceNumber: "25072",
          fishingLicenceValidTo: "2030-12-31",
          flag: "GBR",
          homePort: "NEWLYN",
          source: "CATCH_RECORDING",
          imo: null,
          validation: {
            isLegallyDue: true,
            landedWeightExceededBy: 143.9,
            liveExportWeight: 121,
            rawLandingsUrl: "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            salesNoteUrl: "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            totalEstimatedForExportSpecies: 30,
            totalEstimatedWithTolerance: 56.1,
            totalLiveForExportSpecies: undefined,
            totalRecordedAgainstLanding: 200,
            totalWeightForSpecies: undefined,
          },
          risking: {
            vessel: "0",
            speciesRisk: "0",
            exporterRiskScore: "0",
            landingRiskScore: "0",
            highOrLowRisk: LevelOfRiskType.Low,
            isSpeciesRiskEnabled: false,
            overuseInfo: undefined,
          },
          adminCommodityCode: undefined,
          adminPresentation: undefined,
          adminSpecies: undefined,
          adminState: undefined,
        }
      ],
      _correlationId: "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      requestedByAdmin: false,
      isUnblocked: false,
      da: "England",
      vesselOverriddenByAdmin: false,
      speciesOverriddenByAdmin: false,
      failureIrrespectiveOfRisk: true,
      multiVesselSchedule: false,
      transportation: {
        exportLocation: "Hull",
        modeofTransport: "truck",
        nationality: "",
        registration: "",
      },
    });
  })

  it('will return a IDefraTradeCatchCertificate payload with no export data', () => {
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc({ ...exampleCc, exportData: undefined }, dynamicsCatchCertificateCase, ccQueryResults);
    expect(result).toStrictEqual({
      documentNumber: "GBR-2023-CC-C58DF9A73",
      certStatus: CertificateStatus.COMPLETE,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.PendingLandingData,
      numberOfFailedSubmissions: 0,
      isDirectLanding: false,
      documentUrl: "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      exportedTo: undefined,
      documentDate: "2023-08-31T18:27:00.000Z",
      exporter: {
        fullName: "Automation Tester",
        companyName: "Automation Testing Ltd",
        contactId: "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        accountId: "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        address: {
          building_number: null,
          sub_building_name: "NATURAL ENGLAND",
          building_name: "LANCASTER HOUSE",
          street_name: "HAMPSHIRE COURT",
          county: null,
          country: "United Kingdom of Great Britain and Northern Ireland",
          line1: "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          city: "NEWCASTLE UPON TYNE",
          postCode: "NE4 7YH"
        },
        dynamicsAddress: {
          defra_uprn: "10091818796",
          defra_buildingname: "LANCASTER HOUSE",
          defra_subbuildingname: "NATURAL ENGLAND",
          defra_premises: null,
          defra_street: "HAMPSHIRE COURT",
          defra_locality: "NEWCASTLE BUSINESS PARK",
          defra_dependentlocality: null,
          defra_towntext: "NEWCASTLE UPON TYNE",
          defra_county: null,
          defra_postcode: "NE4 7YH",
          _defra_country_value: "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          defra_internationalpostalcode: null,
          defra_fromcompanieshouse: false,
          defra_addressid: "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          _defra_country_value_OData_Community_Display_V1_FormattedValue: "United Kingdom of Great Britain and Northern Ireland",
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: "defra_Country",
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: "defra_country",
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: "No"
        }
      },
      landings: [
        {
          status: DefraCcLandingStatusType.ValidationFailure_Species,
          id: "GBR-2023-CC-C58DF9A73-1777642314",
          startDate: "2023-08-31",
          landingDate: "2023-08-31",
          species: "Lobster",
          cnCode: "03028990",
          commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
          scientificName: "Aphanopus carbo",
          is14DayLimitReached: true,
          state: "FRE",
          presentation: "GUT",
          vesselName: "AGAN BORLOWEN",
          vesselPln: "SS229",
          vesselLength: 6.88,
          vesselAdministration: "Scotland",
          licenceHolder: "MR S CLARY-BROM ",
          speciesAlias: "N",
          speciesAnomaly: undefined,
          weight: 122,
          numberOfTotalSubmissions: 1,
          vesselOverriddenByAdmin: false,
          speciesOverriddenByAdmin: false,
          dataEverExpected: true,
          dateDataReceived: undefined,
          isLate: undefined,
          landingDataEndDate: undefined,
          landingDataExpectedAtSubmission: true,
          landingDataExpectedDate: undefined,
          landingOutcomeAtRetrospectiveCheck: LandingRetrospectiveOutcomeType.Failure,
          catchArea: CatchArea.FAO27,
          fishingLicenceNumber: "25072",
          fishingLicenceValidTo: "2030-12-31",
          flag: "GBR",
          homePort: "NEWLYN",
          source: "CATCH_RECORDING",
          imo: null,
          validation: {
            isLegallyDue: true,
            landedWeightExceededBy: 143.9,
            liveExportWeight: 121,
            rawLandingsUrl: "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            salesNoteUrl: "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            totalEstimatedForExportSpecies: 30,
            totalEstimatedWithTolerance: 56.1,
            totalLiveForExportSpecies: undefined,
            totalRecordedAgainstLanding: 200,
            totalWeightForSpecies: undefined,
          },
          risking: {
            vessel: "0",
            speciesRisk: "0",
            exporterRiskScore: "0",
            landingRiskScore: "0",
            highOrLowRisk: LevelOfRiskType.Low,
            isSpeciesRiskEnabled: false,
            overuseInfo: undefined,
          },
          adminCommodityCode: undefined,
          adminPresentation: undefined,
          adminSpecies: undefined,
          adminState: undefined,
        }
      ],
      _correlationId: "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      requestedByAdmin: false,
      isUnblocked: false,
      da: "England",
      vesselOverriddenByAdmin: false,
      speciesOverriddenByAdmin: false,
      failureIrrespectiveOfRisk: true,
      multiVesselSchedule: false,
      transportation: undefined,
    });
  })

  it('will return a IDefraTradeCatchCertificate payload with NI export data', () => {
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc({
      ...exampleCc, exportData: {
        ...exampleCc.exportData, transportation: {
          exportedFrom: "United Kingdom",
          exportedTo: {
            officialCountryName: "Northen Ireland",
            isoCodeAlpha2: "AX1",
            isoCodeAlpha3: null,
            isoNumericCode: null
          },
          vehicle: "directLanding"
        },
      }
    }, dynamicsCatchCertificateCase, ccQueryResults);
    expect(result).toStrictEqual({
      documentNumber: "GBR-2023-CC-C58DF9A73",
      certStatus: CertificateStatus.COMPLETE,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.PendingLandingData,
      numberOfFailedSubmissions: 0,
      isDirectLanding: false,
      documentUrl: "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      exportedTo: {
        isoCodeAlpha2: "AX1",
        isoCodeAlpha3: null,
        isoNumericCode: null,
        officialCountryName: "Northen Ireland",
      },
      documentDate: "2023-08-31T18:27:00.000Z",
      exporter: {
        fullName: "Automation Tester",
        companyName: "Automation Testing Ltd",
        contactId: "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        accountId: "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        address: {
          building_number: null,
          sub_building_name: "NATURAL ENGLAND",
          building_name: "LANCASTER HOUSE",
          street_name: "HAMPSHIRE COURT",
          county: null,
          country: "United Kingdom of Great Britain and Northern Ireland",
          line1: "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          city: "NEWCASTLE UPON TYNE",
          postCode: "NE4 7YH"
        },
        dynamicsAddress: {
          defra_uprn: "10091818796",
          defra_buildingname: "LANCASTER HOUSE",
          defra_subbuildingname: "NATURAL ENGLAND",
          defra_premises: null,
          defra_street: "HAMPSHIRE COURT",
          defra_locality: "NEWCASTLE BUSINESS PARK",
          defra_dependentlocality: null,
          defra_towntext: "NEWCASTLE UPON TYNE",
          defra_county: null,
          defra_postcode: "NE4 7YH",
          _defra_country_value: "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          defra_internationalpostalcode: null,
          defra_fromcompanieshouse: false,
          defra_addressid: "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          _defra_country_value_OData_Community_Display_V1_FormattedValue: "United Kingdom of Great Britain and Northern Ireland",
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: "defra_Country",
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: "defra_country",
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: "No"
        }
      },
      landings: [
        {
          status: DefraCcLandingStatusType.ValidationFailure_Species,
          id: "GBR-2023-CC-C58DF9A73-1777642314",
          startDate: "2023-08-31",
          landingDate: "2023-08-31",
          species: "Lobster",
          cnCode: "03028990",
          commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
          scientificName: "Aphanopus carbo",
          is14DayLimitReached: true,
          state: "FRE",
          presentation: "GUT",
          vesselName: "AGAN BORLOWEN",
          vesselPln: "SS229",
          vesselLength: 6.88,
          vesselAdministration: "Scotland",
          licenceHolder: "MR S CLARY-BROM ",
          speciesAlias: "N",
          speciesAnomaly: undefined,
          weight: 122,
          numberOfTotalSubmissions: 1,
          vesselOverriddenByAdmin: false,
          speciesOverriddenByAdmin: false,
          dataEverExpected: true,
          dateDataReceived: undefined,
          isLate: undefined,
          landingDataEndDate: undefined,
          landingDataExpectedAtSubmission: true,
          landingDataExpectedDate: undefined,
          landingOutcomeAtRetrospectiveCheck: LandingRetrospectiveOutcomeType.Failure,
          catchArea: CatchArea.FAO27,
          fishingLicenceNumber: "25072",
          fishingLicenceValidTo: "2030-12-31",
          flag: "GBR",
          homePort: "NEWLYN",
          source: "CATCH_RECORDING",
          imo: null,
          validation: {
            isLegallyDue: true,
            landedWeightExceededBy: 143.9,
            liveExportWeight: 121,
            rawLandingsUrl: "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            salesNoteUrl: "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            totalEstimatedForExportSpecies: 30,
            totalEstimatedWithTolerance: 56.1,
            totalLiveForExportSpecies: undefined,
            totalRecordedAgainstLanding: 200,
            totalWeightForSpecies: undefined,
          },
          risking: {
            vessel: "0",
            speciesRisk: "0",
            exporterRiskScore: "0",
            landingRiskScore: "0",
            highOrLowRisk: LevelOfRiskType.Low,
            isSpeciesRiskEnabled: false,
            overuseInfo: undefined,
          },
          adminCommodityCode: undefined,
          adminPresentation: undefined,
          adminSpecies: undefined,
          adminState: undefined,
        }
      ],
      _correlationId: "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      requestedByAdmin: false,
      isUnblocked: false,
      da: "England",
      vesselOverriddenByAdmin: false,
      speciesOverriddenByAdmin: false,
      failureIrrespectiveOfRisk: true,
      multiVesselSchedule: false,
      transportation: {
        modeofTransport: "directLanding"
      },
    });
  })

  it('will return a IDefraTradeCatchCertificate payload with no ccQueryResults', () => {
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc(exampleCc, dynamicsCatchCertificateCase, null);
    expect(result).toStrictEqual({
      documentNumber: "GBR-2023-CC-C58DF9A73",
      certStatus: CertificateStatus.VOID,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.PendingLandingData,
      numberOfFailedSubmissions: 0,
      isDirectLanding: false,
      documentUrl: "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      exportedTo: {
        isoCodeAlpha2: "AX",
        isoCodeAlpha3: "ALA",
        isoNumericCode: "248",
        officialCountryName: "Åland Islands",
      },
      documentDate: "2023-08-31T18:27:00.000Z",
      exporter: {
        fullName: "Automation Tester",
        companyName: "Automation Testing Ltd",
        contactId: "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        accountId: "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        address: {
          building_number: null,
          sub_building_name: "NATURAL ENGLAND",
          building_name: "LANCASTER HOUSE",
          street_name: "HAMPSHIRE COURT",
          county: null,
          country: "United Kingdom of Great Britain and Northern Ireland",
          line1: "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          city: "NEWCASTLE UPON TYNE",
          postCode: "NE4 7YH"
        },
        dynamicsAddress: {
          defra_uprn: "10091818796",
          defra_buildingname: "LANCASTER HOUSE",
          defra_subbuildingname: "NATURAL ENGLAND",
          defra_premises: null,
          defra_street: "HAMPSHIRE COURT",
          defra_locality: "NEWCASTLE BUSINESS PARK",
          defra_dependentlocality: null,
          defra_towntext: "NEWCASTLE UPON TYNE",
          defra_county: null,
          defra_postcode: "NE4 7YH",
          _defra_country_value: "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          defra_internationalpostalcode: null,
          defra_fromcompanieshouse: false,
          defra_addressid: "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          _defra_country_value_OData_Community_Display_V1_FormattedValue: "United Kingdom of Great Britain and Northern Ireland",
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: "defra_Country",
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: "defra_country",
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: "No"
        }
      },
      landings: null,
      _correlationId: "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      requestedByAdmin: false,
      isUnblocked: false,
      da: "England",
      vesselOverriddenByAdmin: false,
      speciesOverriddenByAdmin: false,
      failureIrrespectiveOfRisk: true,
      multiVesselSchedule: false,
      transportation: {
        hasRoadTransportDocument: true,
        modeofTransport: "truck",
      },
    });
  })

  it('will return a IDefraTradeCatchCertificate payload with a blocked validation', () => {
    const ccQueryResultsBlocked: ICcQueryResult[] = [{
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'BLOCKED',
      rssNumber: 'C20415',
      da: 'Scotland',
      dateLanded: '2023-08-31',
      startDate: '2023-08-31',
      species: 'BSF',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      hasSalesNote: true,
      isSpeciesExists: false,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      speciesAlias: "N",
      landingTotalBreakdown: [
        {
          factor: 1.7,
          isEstimate: true,
          weight: 30,
          liveWeight: 51,
          source: LandingSources.CatchRecording
        }
      ],
      source: LandingSources.CatchRecording,
      isExceeding14DayLimit: false,
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        moment.utc()
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        landingId: 'GBR-2023-CC-C58DF9A73-1777642314',
        exporterName: 'Mr Bob',
        presentation: 'GUT',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
        presentationName: 'sliced',
        vessel: 'AGAN BORLOWEN',
        fao: 'FAO27',
        pln: 'SS229',
        species: 'Lobster',
        scientificName: "Aphanopus carbo",
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '03028990',
        commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
        investigation: {
          investigator: "Investigator Gadget",
          status: InvestigationStatus.Open
        },
        transportationVehicle: 'truck',
        flag: "GBR",
        homePort: "NEWLYN",
        licenceNumber: "25072",
        licenceValidTo: "2030-12-31",
        licenceHolder: "MR S CLARY-BROM ",
        imoNumber: null,
        numberOfSubmissions: 1,
        isLegallyDue: true
      }
    }]

    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc(exampleCc, dynamicsCatchCertificateCase, ccQueryResultsBlocked);
    expect(result).toStrictEqual({
      documentNumber: "GBR-2023-CC-C58DF9A73",
      certStatus: CertificateStatus.BLOCKED,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.PendingLandingData,
      numberOfFailedSubmissions: 0,
      isDirectLanding: false,
      documentUrl: "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      exportedTo: {
        isoCodeAlpha2: "AX",
        isoCodeAlpha3: "ALA",
        isoNumericCode: "248",
        officialCountryName: "Åland Islands",
      },
      documentDate: "2023-08-31T18:27:00.000Z",
      exporter: {
        fullName: "Automation Tester",
        companyName: "Automation Testing Ltd",
        contactId: "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        accountId: "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        address: {
          building_number: null,
          sub_building_name: "NATURAL ENGLAND",
          building_name: "LANCASTER HOUSE",
          street_name: "HAMPSHIRE COURT",
          county: null,
          country: "United Kingdom of Great Britain and Northern Ireland",
          line1: "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          city: "NEWCASTLE UPON TYNE",
          postCode: "NE4 7YH"
        },
        dynamicsAddress: {
          defra_uprn: "10091818796",
          defra_buildingname: "LANCASTER HOUSE",
          defra_subbuildingname: "NATURAL ENGLAND",
          defra_premises: null,
          defra_street: "HAMPSHIRE COURT",
          defra_locality: "NEWCASTLE BUSINESS PARK",
          defra_dependentlocality: null,
          defra_towntext: "NEWCASTLE UPON TYNE",
          defra_county: null,
          defra_postcode: "NE4 7YH",
          _defra_country_value: "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          defra_internationalpostalcode: null,
          defra_fromcompanieshouse: false,
          defra_addressid: "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          _defra_country_value_OData_Community_Display_V1_FormattedValue: "United Kingdom of Great Britain and Northern Ireland",
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: "defra_Country",
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: "defra_country",
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: "No"
        }
      },
      landings: [
        {
          status: DefraCcLandingStatusType.ValidationFailure_Species,
          id: "GBR-2023-CC-C58DF9A73-1777642314",
          startDate: "2023-08-31",
          landingDate: "2023-08-31",
          species: "Lobster",
          cnCode: "03028990",
          commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
          scientificName: "Aphanopus carbo",
          is14DayLimitReached: true,
          state: "FRE",
          presentation: "GUT",
          vesselName: "AGAN BORLOWEN",
          vesselPln: "SS229",
          vesselLength: 6.88,
          vesselAdministration: "Scotland",
          licenceHolder: "MR S CLARY-BROM ",
          speciesAlias: "N",
          speciesAnomaly: undefined,
          weight: 122,
          numberOfTotalSubmissions: 1,
          vesselOverriddenByAdmin: false,
          speciesOverriddenByAdmin: false,
          dataEverExpected: true,
          dateDataReceived: undefined,
          isLate: undefined,
          landingDataEndDate: undefined,
          landingDataExpectedAtSubmission: true,
          landingDataExpectedDate: undefined,
          landingOutcomeAtRetrospectiveCheck: LandingRetrospectiveOutcomeType.Failure,
          catchArea: CatchArea.FAO27,
          fishingLicenceNumber: "25072",
          fishingLicenceValidTo: "2030-12-31",
          flag: "GBR",
          homePort: "NEWLYN",
          source: "CATCH_RECORDING",
          imo: null,
          validation: {
            isLegallyDue: true,
            landedWeightExceededBy: 143.9,
            liveExportWeight: 121,
            rawLandingsUrl: "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            salesNoteUrl: "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            totalEstimatedForExportSpecies: 30,
            totalEstimatedWithTolerance: 56.1,
            totalLiveForExportSpecies: undefined,
            totalRecordedAgainstLanding: 200,
            totalWeightForSpecies: undefined,
          },
          risking: {
            vessel: "0",
            speciesRisk: "0",
            exporterRiskScore: "0",
            landingRiskScore: "0",
            highOrLowRisk: LevelOfRiskType.Low,
            isSpeciesRiskEnabled: false,
            overuseInfo: undefined,
          },
          adminCommodityCode: undefined,
          adminPresentation: undefined,
          adminSpecies: undefined,
          adminState: undefined,
        }
      ],
      _correlationId: "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      requestedByAdmin: false,
      isUnblocked: false,
      da: "England",
      vesselOverriddenByAdmin: false,
      speciesOverriddenByAdmin: false,
      failureIrrespectiveOfRisk: true,
      multiVesselSchedule: false,
      transportation: {
        hasRoadTransportDocument: true,
        modeofTransport: "truck",
      },
    });
  })

  it('will return a IDefraTradeCatchCertificate payload with risk score data', () => {
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc({ ...exampleCc, exportData: undefined }, dynamicsCatchCertificateCase, ccQueryResultsWithRiskScore);
    expect(result).toStrictEqual({
      documentNumber: "GBR-2023-CC-C58DF9A73",
      certStatus: CertificateStatus.COMPLETE,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.PendingLandingData,
      numberOfFailedSubmissions: 0,
      isDirectLanding: false,
      documentUrl: "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      exportedTo: undefined,
      documentDate: "2023-08-31T18:27:00.000Z",
      exporter: {
        fullName: "Automation Tester",
        companyName: "Automation Testing Ltd",
        contactId: "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        accountId: "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        address: {
          building_number: null,
          sub_building_name: "NATURAL ENGLAND",
          building_name: "LANCASTER HOUSE",
          street_name: "HAMPSHIRE COURT",
          county: null,
          country: "United Kingdom of Great Britain and Northern Ireland",
          line1: "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          city: "NEWCASTLE UPON TYNE",
          postCode: "NE4 7YH"
        },
        dynamicsAddress: {
          defra_uprn: "10091818796",
          defra_buildingname: "LANCASTER HOUSE",
          defra_subbuildingname: "NATURAL ENGLAND",
          defra_premises: null,
          defra_street: "HAMPSHIRE COURT",
          defra_locality: "NEWCASTLE BUSINESS PARK",
          defra_dependentlocality: null,
          defra_towntext: "NEWCASTLE UPON TYNE",
          defra_county: null,
          defra_postcode: "NE4 7YH",
          _defra_country_value: "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          defra_internationalpostalcode: null,
          defra_fromcompanieshouse: false,
          defra_addressid: "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          _defra_country_value_OData_Community_Display_V1_FormattedValue: "United Kingdom of Great Britain and Northern Ireland",
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: "defra_Country",
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: "defra_country",
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: "No"
        }
      },
      landings: [
        {
          status: DefraCcLandingStatusType.ValidationFailure_Species,
          id: "GBR-2023-CC-C58DF9A73-1777642314",
          startDate: "2023-08-31",
          landingDate: "2023-08-31",
          species: "Lobster",
          cnCode: "03028990",
          commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
          scientificName: "Aphanopus carbo",
          is14DayLimitReached: true,
          state: "FRE",
          presentation: "GUT",
          vesselName: "AGAN BORLOWEN",
          vesselPln: "SS229",
          vesselLength: 6.88,
          vesselAdministration: "Scotland",
          licenceHolder: "MR S CLARY-BROM ",
          speciesAlias: "N",
          speciesAnomaly: undefined,
          weight: 122,
          numberOfTotalSubmissions: 1,
          vesselOverriddenByAdmin: false,
          speciesOverriddenByAdmin: false,
          dataEverExpected: true,
          dateDataReceived: undefined,
          isLate: undefined,
          landingDataEndDate: undefined,
          landingDataExpectedAtSubmission: true,
          landingDataExpectedDate: undefined,
          landingOutcomeAtRetrospectiveCheck: LandingRetrospectiveOutcomeType.Failure,
          catchArea: CatchArea.FAO27,
          fishingLicenceNumber: "25072",
          fishingLicenceValidTo: "2030-12-31",
          flag: "GBR",
          homePort: "NEWLYN",
          source: "CATCH_RECORDING",
          imo: null,
          validation: {
            isLegallyDue: true,
            landedWeightExceededBy: 143.9,
            liveExportWeight: 121,
            rawLandingsUrl: "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            salesNoteUrl: "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            totalEstimatedForExportSpecies: 30,
            totalEstimatedWithTolerance: 56.1,
            totalLiveForExportSpecies: undefined,
            totalRecordedAgainstLanding: 200,
            totalWeightForSpecies: undefined,
          },
          risking: {
            vessel: "1",
            speciesRisk: "0.1",
            exporterRiskScore: "0.3",
            landingRiskScore: "0.2",
            highOrLowRisk: LevelOfRiskType.Low,
            isSpeciesRiskEnabled: false,
            overuseInfo: undefined,
          },
          adminCommodityCode: undefined,
          adminPresentation: undefined,
          adminSpecies: undefined,
          adminState: undefined,
        }
      ],
      _correlationId: "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      requestedByAdmin: false,
      isUnblocked: false,
      da: "England",
      vesselOverriddenByAdmin: false,
      speciesOverriddenByAdmin: false,
      failureIrrespectiveOfRisk: true,
      multiVesselSchedule: false,
      transportation: undefined,
    });
  })
});
describe('when tranforming Storage Document data from IDocument to IDefraTradeStorageDocument', () => {

  const exampleSd: IDocument = {
    "createdAt": new Date("2020-06-24T10:39:32.000Z"),
    "documentNumber": "GBR-2023-SD-74EA9D198",
    "clonedFrom": "GBR-2023-SD-C3A82642B",
    "parentDocumentVoid": false,
    "status": "COMPLETE",
    "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
    "createdByEmail": "foo@foo.com",
    "requestByAdmin": false,
    "contactId": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ13",
    "__t": "storageDocument",
    "audit": [],
    "exportData": {
      "catches": [
        {
          "product": "Atlantic cod (COD)",
          "id": "GBR-2023-CC-0123456789-1693931464",
          "commodityCode": "03089090",
          "certificateNumber": "GBR-2023-CC-0123456789",
          "productWeight": "100",
          "dateOfUnloading": "05/09/2023",
          "placeOfUnloading": "Dover",
          "transportUnloadedFrom": "BA078",
          "weightOnCC": "100",
          "scientificName": "Gadus morhua",
          "certificateType": "non_uk",
        }
      ],
      "storageFacilities": [
        {
          "facilityName": "name",
          "facilityAddressOne": "MMO SUB, LANCASTER HOUSE, HAMPSHIRE COURT",
          "facilityTownCity": "NEWCASTLE UPON TYNE",
          "facilityPostcode": "NE4 7YH",
          "facilitySubBuildingName": "MMO SUB",
          "facilityBuildingNumber": "",
          "facilityBuildingName": "LANCASTER HOUSE",
          "facilityStreetName": "HAMPSHIRE COURT",
          "facilityCounty": "TYNESIDE",
          "facilityCountry": "ENGLAND"
        }
      ],
      "exporterDetails": {
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
        "buildingNumber": null,
        "subBuildingName": "NATURAL ENGLAND",
        "buildingName": "LANCASTER HOUSE",
        "streetName": "HAMPSHIRE COURT",
        "county": null,
        "country": "United Kingdom of Great Britain and Northern Ireland",
        "postcode": "NE4 7YH",
        "townCity": "NEWCASTLE UPON TYNE",
        "exporterCompanyName": "Automation Testing Ltd",
        "_dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        },
        "_dynamicsUser": {
          "firstName": "Automation",
          "lastName": "Tester"
        }
      },
      "exportedTo": {
        "officialCountryName": "Afghanistan",
        "isoCodeAlpha2": "AF",
        "isoCodeAlpha3": "AFG",
        "isoNumericCode": "004"
      },
      "transportation": {
        "exportedTo": {
          "officialCountryName": "Afghanistan",
          "isoCodeAlpha2": "AF",
          "isoCodeAlpha3": "AFG",
          "isoNumericCode": "004"
        },
        "vehicle": "truck",
        "cmr": true,
        "exportDate": "05/09/2023"
      },
      "transportations": [{
        "id": '0',
        "freightBillNumber": '0',
        "vehicle": "truck",
        "departurePlace": "Hull",
        "nationalityOfVehicle": "",
        "registrationNumber": "",
        "exportedTo": {
          "officialCountryName": "Nigeria",
          "isoCodeAlpha2": "NG",
          "isoCodeAlpha3": "NGA",
          "isoNumericCode": "566"
        },
        "transportDocuments": [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      }, {
        "id": '0',
        "freightBillNumber": '0',
        "vehicle": "plane",
        "departurePlace": "Hull",
        "flightNumber": "",
        "containerNumber": "",
        "exportedTo": {
          "officialCountryName": "Nigeria",
          "isoCodeAlpha2": "NG",
          "isoCodeAlpha3": "NGA",
          "isoNumericCode": "566"
        },
        "transportDocuments": [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      }, {
        "id": '0',
        "freightBillNumber": '0',
        "vehicle": "train",
        "departurePlace": "Hull",
        "railwayBillNumber": "",
        "exportedTo": {
          "officialCountryName": "Nigeria",
          "isoCodeAlpha2": "NG",
          "isoCodeAlpha3": "NGA",
          "isoNumericCode": "566"
        },
        "transportDocuments": [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      }, {
        "id": '0',
        "freightBillNumber": '0',
        "vehicle": "containerVessel",
        "departurePlace": "Hull",
        "vesselName": "",
        "flagState": "",
        "containerNumber": "",
        "exportedTo": {
          "officialCountryName": "Nigeria",
          "isoCodeAlpha2": "NG",
          "isoCodeAlpha3": "NGA",
          "isoNumericCode": "566"
        },
        "transportDocuments": [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      }, {
        "id": '0',
        "freightBillNumber": '0',
        "vehicle": "unknown",
        "departurePlace": "Hull",
        "nationalityOfVehicle": "",
        "registrationNumber": "",
        "exportedTo": {
          "officialCountryName": "Nigeria",
          "isoCodeAlpha2": "NG",
          "isoCodeAlpha3": "NGA",
          "isoNumericCode": "566"
        },
        "transportDocuments": []
      }
      ],
    },
    "userReference": "some-reference",
    "documentUri": "_ab830758-1c18-4dad-b756-e3dc10fe7efa.pdf"
  };

  const exampleSdQueryResult: ISdPsQueryResult[] = [{
    documentNumber: '',
    status: '',
    documentType: '',
    createdAt: '',
    da: '',
    species: 'Atlantic cod (COD)',
    commodityCode: "03089090",
    weightOnDoc: 100,
    extended: {
      id: 'GBR-2023-CC-0123456789-1693931464',
    },
    weightOnAllDocs: 100,
    weightOnFCC: 100,
    isOverAllocated: false,
    overAllocatedByWeight: 100,
    overUsedInfo: ["GBR-SD-123234-123-234”,”GBR-SD-123234-123-234"],
    isMismatch: false,
    dateOfUnloading: "25/08/2023",
    placeOfUnloading: "Dover",
    transportUnloadedFrom: "BA078",
    catchCertificateNumber: 'GBR-2023-CC-0123456789',
    scientificName: 'Gadus morhua'
  }];

  const exampleSdDynamicsCase: IDynamicsStorageDocumentCase = {
    "exporter": {
      "contactId": "a contact id",
      "accountId": "an account id",
      "dynamicsAddress": {
        "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
        "defra_buildingname": "Lancaster House",
        "defra_fromcompanieshouse": false,
        "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
        "defra_postcode": "NE4 7YJ",
        "defra_premises": "23",
        "defra_street": "Newcastle upon Tyne",
        "defra_towntext": "Newcastle upon Tyne",
        "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
        "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
        "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
        "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
      },
      "companyName": "FISH LTD",
      "address": {
        "building_number": "123",
        "sub_building_name": "Unit 1",
        "building_name": "CJC Fish Ltd",
        "street_name": "17  Old Edinburgh Road",
        "county": "West Midlands",
        "country": "England",
        "line1": "Vue Red",
        "city": "ROWTR",
        "postCode": "WN90 23A"
      }
    },
    "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
    "documentDate": "2019-01-01 05:05:05",
    "caseType1": "SD",
    "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
    "numberOfFailedSubmissions": 4,
    "documentNumber": "GBR-SD-234234-234-234",
    "companyName": "Bob's Fisheries LTD",
    "exportedTo": {
      "officialCountryName": "Nigeria",
      "isoCodeAlpha2": "NG",
      "isoCodeAlpha3": "NGR"
    },
    "products": [
      {
        "id": "some-product-id",
        "foreignCatchCertificateNumber": "FR-SD-234234-23423-234234",
        "isDocumentIssuedInUK": false,
        "species": "HER",
        "cnCode": "324234324432234",
        "scientificName": "scientific name",
        "importedWeight": 500,
        "exportedWeight": 700,
        "validation": {
          "status": SdPsStatus.Overuse,
          "totalWeightExported": 700,
          "weightExceededAmount": 200,
          "overuseInfo": ["GBR-SD-123234-123-234”,”GBR-SD-123234-123-234"]

        }
      }
    ],
    "da": "Northern Ireland",
    "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
    "requestedByAdmin": false
  };

  it('will return an authority within the IDefraTradeStorageDocument payload', () => {
    const result: IDefraTradeStorageDocument = SUT.toDefraTradeSd(exampleSd, exampleSdDynamicsCase, exampleSdQueryResult);
    const expected = {
      name: "Illegal Unreported and Unregulated (IUU) Fishing Team",
      companyName: "Marine Management Organisation",
      address: {
        line1: "Lancaster House, Hampshire Court",
        building_name: "Lancaster House",
        street_name: "Hampshire Court",
        city: "Newcastle upon Tyne",
        postCode: "NE4 7YJ",
        country: "United Kingdom"
      },
      tel: "0300 123 1032",
      email: "ukiuuslo@marinemanagement.org.uk",
      dateIssued: moment().format('YYYY-MM-DD')
    };

    expect(result.authority).toStrictEqual(expected);
  });

  it('branch covering with no export data', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-04-29'))

    const result: IDefraTradeStorageDocument = SUT.toDefraTradeSd({ ...exampleSd, exportData: undefined }, exampleSdDynamicsCase, exampleSdQueryResult);
    expect(result).toStrictEqual({
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "authority": {
        "address": {
          "building_name": "Lancaster House",
          "city": "Newcastle upon Tyne",
          "country": "United Kingdom",
          "line1": "Lancaster House, Hampshire Court",
          "postCode": "NE4 7YJ",
          "street_name": "Hampshire Court",
        },
        "companyName": "Marine Management Organisation",
        "dateIssued": "2025-04-29",
        "email": "ukiuuslo@marinemanagement.org.uk",
        "name": "Illegal Unreported and Unregulated (IUU) Fishing Team",
        "tel": "0300 123 1032",
      },
      "caseType1": "SD",
      "caseType2": "Real Time Validation - Overuse Failure",
      "companyName": "Bob's Fisheries LTD",
      "da": "Northern Ireland",
      "documentDate": "2019-01-01 05:05:05",
      "documentNumber": "GBR-SD-234234-234-234",
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "exportedTo": undefined,
      "exporter": {
        "accountId": "an account id",
        "address": {
          "building_name": "CJC Fish Ltd",
          "building_number": "123",
          "city": "ROWTR",
          "country": "England",
          "county": "West Midlands",
          "line1": "Vue Red",
          "postCode": "WN90 23A",
          "street_name": "17  Old Edinburgh Road",
          "sub_building_name": "Unit 1",
        },
        "companyName": "FISH LTD",
        "contactId": "a contact id",
        "dynamicsAddress": {
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
        },
      },
      "numberOfFailedSubmissions": 4,
      "products": [
        {
          "cnCode": "03089090",
          "dateOfUnloading": "2023-08-25",
          "exportedWeight": 100,
          "foreignCatchCertificateNumber": "GBR-2023-CC-0123456789",
          "id": "GBR-2023-CC-0123456789-1693931464",
          "importedWeight": 100,
          "placeOfUnloading": "Dover",
          "scientificName": "Gadus morhua",
          "species": "Atlantic cod (COD)",
          "transportUnloadedFrom": "BA078",
          "validation": {
            "overuseInfo": [
              "GBR-SD-123234-123-234”,”GBR-SD-123234-123-234",
            ],
            "status": "Validation Success",
            "totalWeightExported": 100,
            "weightExceededAmount": 100,
          },
        },
      ],
      "requestedByAdmin": false,
      "storageFacilities": undefined,
      "transportation": undefined,
    })
  })
  it('branch covering with no document', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-04-29'))

    const expected =
    {
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "authority": {
        "address": {
          "building_name": "Lancaster House",
          "city": "Newcastle upon Tyne",
          "country": "United Kingdom",
          "line1": "Lancaster House, Hampshire Court",
          "postCode": "NE4 7YJ",
          "street_name": "Hampshire Court",
        },
        "companyName": "Marine Management Organisation",
        "dateIssued": "2025-04-29",
        "email": "ukiuuslo@marinemanagement.org.uk",
        "name": "Illegal Unreported and Unregulated (IUU) Fishing Team",
        "tel": "0300 123 1032",
      },
      "caseType1": "SD",
      "caseType2": "Real Time Validation - Overuse Failure",
      "companyName": "Bob's Fisheries LTD",
      "da": "Northern Ireland",
      "documentDate": "2019-01-01 05:05:05",
      "documentNumber": "GBR-SD-234234-234-234",
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "exportedTo": undefined,
      "exporter": {
        "accountId": "an account id",
        "address": {
          "building_name": "CJC Fish Ltd",
          "building_number": "123",
          "city": "ROWTR",
          "country": "England",
          "county": "West Midlands",
          "line1": "Vue Red",
          "postCode": "WN90 23A",
          "street_name": "17  Old Edinburgh Road",
          "sub_building_name": "Unit 1",
        },
        "companyName": "FISH LTD",
        "contactId": "a contact id",
        "dynamicsAddress": {
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
        },
      },
      "numberOfFailedSubmissions": 4,
      "products": [
        {
          "cnCode": "03089090",
          "dateOfUnloading": "2023-08-25",
          "exportedWeight": 100,
          "foreignCatchCertificateNumber": "GBR-2023-CC-0123456789",
          "id": "GBR-2023-CC-0123456789-1693931464",
          "importedWeight": 100,
          "placeOfUnloading": "Dover",
          "scientificName": "Gadus morhua",
          "species": "Atlantic cod (COD)",
          "transportUnloadedFrom": "BA078",
          "validation": {
            "overuseInfo": [
              "GBR-SD-123234-123-234”,”GBR-SD-123234-123-234",
            ],
            "status": "Validation Success",
            "totalWeightExported": 100,
            "weightExceededAmount": 100,
          },
        },
      ],
      "requestedByAdmin": false,
      "storageFacilities": undefined,
      "transportation": undefined,

    }

    const result: IDefraTradeStorageDocument = SUT.toDefraTradeSd(undefined, exampleSdDynamicsCase, exampleSdQueryResult);
    expect(result).toStrictEqual(expected)
  })

  it('will return a transport within the IDefraTradeStorageDocument payload', () => {
    const result: IDefraTradeStorageDocument = SUT.toDefraTradeSd(exampleSd, exampleSdDynamicsCase, exampleSdQueryResult);
    const expected = {
      modeofTransport: "truck",
      hasRoadTransportDocument: true,
      exportDate: '2023-09-05'
    };

    expect(result.transportation).toStrictEqual(expected);
  });

  it('will cover undefined part when sdStorageFacility is undefined', () => {
    expect(SUT.toDefraSdStorageFacility(undefined)).toBeUndefined();
  });
  it('will return a storageFacilities within the IDefraTradeStorageDocument payload', () => {
    const result: IDefraTradeStorageDocument = SUT.toDefraTradeSd(exampleSd, exampleSdDynamicsCase, exampleSdQueryResult);
    const expected = [
      {
        "name": "name",
        "address": {
          "line1": "MMO SUB, LANCASTER HOUSE, HAMPSHIRE COURT",
          "sub_building_name": "MMO SUB",
          "building_number": "",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH",
          "county": "TYNESIDE",
          "country": "ENGLAND"
        }
      }
    ];

    expect(result.storageFacilities).toStrictEqual(expected);
  });

  it('will return a products within the IDefraTradeStorageDocument payload', () => {
    const result: IDefraTradeStorageDocument = SUT.toDefraTradeSd(exampleSd, exampleSdDynamicsCase, exampleSdQueryResult);
    const expected = {
      "id": "GBR-2023-CC-0123456789-1693931464",
      "foreignCatchCertificateNumber": "GBR-2023-CC-0123456789",
      "species": "Atlantic cod (COD)",
      "cnCode": "03089090",
      "scientificName": "Gadus morhua",
      "importedWeight": 100,
      "exportedWeight": 100,
      "dateOfUnloading": "2023-08-25",
      "placeOfUnloading": "Dover",
      "transportUnloadedFrom": "BA078",
      "validation": {
        "status": SdPsStatus.Success,
        "totalWeightExported": 100,
        "weightExceededAmount": 100,
        "overuseInfo": ["GBR-SD-123234-123-234”,”GBR-SD-123234-123-234"]
      }
    };

    expect(result.products?.[0]).toStrictEqual(expected);
  });

});
describe('When mapping fron an ISdPsQueryResult to a IDefraTradeStorageDocumentProduct', () => {
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
    const result = SUT.toDefraTradeSdProduct(input);

    expect(result.foreignCatchCertificateNumber).toEqual("SD2");
  });

  it('will map the species code', () => {
    const result = SUT.toDefraTradeSdProduct(input);

    expect(result.species).toEqual("Atlantic cod (COD)");
  });

  it('will map the commodity code', () => {
    const result = SUT.toDefraTradeSdProduct(input);

    expect(result.cnCode).toEqual("FRESHCOD");
  })

  it('will map the importedWeight', () => {
    const result = SUT.toDefraTradeSdProduct(input);

    expect(result.importedWeight).toEqual(200);
  });

  it('will map exportedWeight', () => {
    const result = SUT.toDefraTradeSdProduct(input);

    expect(result.exportedWeight).toEqual(100)
  });

  it('will map a scientific name', () => {
    const result = SUT.toDefraTradeSdProduct(input);

    expect(result.scientificName).toBe("Gadus morhua");
  });

  describe("The validation within IDynamicsStorageDocumentProduct", () => {
    it('will contain totalUsedWeightAgainstCertificate', () => {
      const result = SUT.toDefraTradeSdProduct(input);

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

      const result = SUT.toDefraTradeSdProduct(input);

      expect(result.validation.status).toEqual(IDefraTradeSdPsStatus.Weight)
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

      const result = SUT.toDefraTradeSdProduct(input);

      expect(result.validation.status).toEqual(IDefraTradeSdPsStatus.Overuse)
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

      const result = SUT.toDefraTradeSdProduct(input);

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

      const result = SUT.toDefraTradeSdProduct(input);

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

      const result = SUT.toDefraTradeSdProduct(input);

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

      const result = SUT.toDefraTradeSdProduct(input);

      expect(result.validation.overuseInfo).toStrictEqual(["SD2"]);
    });
  });

});