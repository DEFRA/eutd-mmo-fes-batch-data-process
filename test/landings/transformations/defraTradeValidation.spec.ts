import moment from "moment";
import * as SUT from "../../../src/landings/transformations/defraTradeValidation";
import * as vessel from "../../../src/data/vessel";
import { ICcQueryResult, IDocument, InvestigationStatus, LandingRetrospectiveOutcomeType, LandingSources, DefraCcLandingStatusType, LevelOfRiskType, IDefraTradeCatchCertificate, LandingStatusType, CatchArea, CertificateStatus } from "mmo-shared-reference-data";
import { CaseOneType, CaseTwoType, IDynamicsCatchCertificateCase } from "../../../src/types/dynamicsValidation";
import { ISdPsQueryResult } from "../../../src/types/query";
import {  SdPsStatus } from "../../../src/types/dynamicsValidationSdPs";
import { IDefraTradeSdPsStatus } from "../../../src/types/defraTradeSdPsCase";
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
              "gearType": "Type 1",
              "highSeasArea": "yes",
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
              "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)",
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
        "gearType": "Type 1",
        "highSeasArea": "yes",
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
        "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)",
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
    gearType: "Type 1",
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
      highSeasArea: "yes",
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
      rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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
    gearType: "Type 1",
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
      highSeasArea: "yes",
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
      rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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
          gearType: "Type 1",
          highSeasArea: "yes",
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
          rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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
          gearType: "Type 1",
          highSeasArea: "yes",
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
          rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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
          gearType: "Type 1",
          highSeasArea: "yes",
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
          rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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
          gearType: "Type 1",
          highSeasArea: "yes",
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
          rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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

  it('will return a IDefraTradeCatchCertificate payload with truck without cmr', () => {
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc({
      ...exampleCc, exportData: {
        ...exampleCc.exportData, transportation: undefined, transportations: [{
          id: 4914860403,
          vehicle: "truck",
          departurePlace: "qsd",
          nationalityOfVehicle: "a",
          registrationNumber: "123",
          freightBillNumber: "12ws",
          transportDocuments: []
        }],
        exportedFrom: "United Kingdom",
        exportedTo: {
          officialCountryName: "Åland Islands",
          isoCodeAlpha2: "AX",
          isoCodeAlpha3: "ALA",
          isoNumericCode: "248"
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
          gearType: "Type 1",
          highSeasArea: "yes",
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
          rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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
        exportLocation: "qsd",
        nationality: "a",
        registration: "123",
        hasRoadTransportDocument: false
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
          gearType: "Type 1",
          highSeasArea: "yes",
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
          rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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
          gearType: "Type 1",
          highSeasArea: "yes",
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
          rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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
    const result: IDefraTradeCatchCertificate = SUT.toDefraTradeCc({ ...exampleCc, exportData: { ...exampleCc.exportData, transportation: undefined, transportations: []} }, dynamicsCatchCertificateCase, ccQueryResults);
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
          gearType: "Type 1",
          highSeasArea: "yes",
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
          rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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
          gearType: "Type 1",
          highSeasArea: "yes",
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
          rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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
        hasRoadTransportDocument: false,
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
          gearType: "Type 1",
          highSeasArea: "yes",
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
          rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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
          gearType: "Type 1",
          highSeasArea: "yes",
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
          rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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
      gearType: "Type 1",
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
        highSeasArea: "yes",
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
        rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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
          gearType: "Type 1",
          highSeasArea: "yes",
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
          rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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
          gearType: "Type 1",
          highSeasArea: "yes",
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
          rfmo: "General Fisheries Commission for the Mediterranean (GFCM)",
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
describe('When mapping from an ISdPsQueryResult to a IDefraTradeProcessingStatementCatch', () => {
  const input: ISdPsQueryResult = {
    documentNumber: "PS1",
    catchCertificateNumber: "PS2",
    catchCertificateType: "uk",
    documentType: "PS",
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
      id: 'PS2-1610018839',
    }
  };

  it('will map the foreignCatchCertificateNumber', () => {
    const result = SUT.toDefraTradePsCatch(input);

    expect(result.foreignCatchCertificateNumber).toEqual("PS2");
  });

  it('will map the species code', () => {
    const result = SUT.toDefraTradePsCatch(input);

    expect(result.species).toEqual("Atlantic cod (COD)");
  });

  it('will map the commodity code', () => {
    const result = SUT.toDefraTradePsCatch(input);

    expect(result.cnCode).toEqual("FRESHCOD");
  })

  it('will map the importedWeight', () => {
    const result = SUT.toDefraTradePsCatch(input);

    expect(result.importedWeight).toEqual(200);
  });

  it('will map usedWeightAgainstCertificate', () => {
    const result = SUT.toDefraTradePsCatch(input);

    expect(result.usedWeightAgainstCertificate).toEqual(100)
  });

  it('will map processedWeight', () => {
    const result = SUT.toDefraTradePsCatch(input);

    expect(result.processedWeight).toEqual(80)
  });

  it('will map a scientific name', () => {
    const result = SUT.toDefraTradePsCatch(input);

    expect(result.scientificName).toBe("Gadus morhua");
  });

  describe("The validation within IDynamicsProcessingStatementCatch", () => {
    it('will contain totalUsedWeightAgainstCertificate', () => {
      const result = SUT.toDefraTradePsCatch(input);

      expect(result.validation.totalUsedWeightAgainstCertificate).toEqual(150)
    });

    it('will highlight `Success` if there is no failure', () => {
      const input: ISdPsQueryResult = {
        documentNumber: "PS1",
        catchCertificateNumber: "PS2",
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 100,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        isMismatch: false,
        overAllocatedByWeight: 0,
        overUsedInfo: [],
        da: null,
        extended: {
          id: 'PS2-1610018839',
        }
      };

      const result = SUT.toDefraTradePsCatch(input);

      expect(result.validation.status).toEqual(SdPsStatus.Success)
    });

    it('will highlight when the failure reason is the weight', () => {
      const input: ISdPsQueryResult = {
        documentNumber: "PS1",
        catchCertificateNumber: "PS2",
        documentType: "PS",
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
          id: 'PS2-1610018839',
        }
      };

      const result = SUT.toDefraTradePsCatch(input);

      expect(result.validation.status).toEqual(IDefraTradeSdPsStatus.Weight);
    });

    it('will highlight when the failure reason is overuse', () => {
      const input: ISdPsQueryResult = {
        documentNumber: "PS1",
        catchCertificateNumber: "PS2",
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
        isMismatch: false,
        overAllocatedByWeight: 50,
        overUsedInfo: [],
        da: null,
        extended: {
          id: 'PS2-1610018839',
        }
      };

      const result = SUT.toDefraTradePsCatch(input);

      expect(result.validation.weightExceededAmount).toEqual(50)
    });

    it('will have the over use array when the failure reason is overuse', () => {
      const input: ISdPsQueryResult = {
        documentNumber: "PS1",
        catchCertificateNumber: "PS2",
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: ["PS3"],
        isMismatch: false,
        overAllocatedByWeight: 50,
        da: null,
        extended: {
          id: 'PS2-1610018839',
        }
      };

      const result = SUT.toDefraTradePsCatch(input);

      expect(result.validation.overuseInfo).toEqual(["PS3"])
    });

    it('will not have an overuse array when the failure overuse occurs on this document', () => {
      const input: ISdPsQueryResult = {
        documentNumber: "PS1",
        catchCertificateNumber: "PS2",
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: ["PS1"],
        isMismatch: false,
        overAllocatedByWeight: 50,
        da: null,
        extended: {
          id: 'PS2-1610018839',
        }
      };

      const result = SUT.toDefraTradePsCatch(input);

      expect(result.validation.overuseInfo).toBeUndefined();
    });

    it('will not include current document number in overuseInfo array when the failure overuse occurs on this document', () => {
      const input: ISdPsQueryResult = {
        documentNumber: "PS1",
        catchCertificateNumber: "PS2",
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: ["PS1", "PS2"],
        isMismatch: false,
        overAllocatedByWeight: 50,
        da: null,
        extended: {
          id: 'PS2-1610018839',
        }
      };

      const result = SUT.toDefraTradePsCatch(input);

      expect(result.validation.overuseInfo).toStrictEqual(["PS2"]);
    });
  });
});

