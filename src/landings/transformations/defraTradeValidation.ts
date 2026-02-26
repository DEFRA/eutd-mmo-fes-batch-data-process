import { ICcQueryResult, IDocument, IDynamicsLanding, Product, toDefraCcLandingStatus, IDefraTradeLanding, IDefraTradeCatchCertificate, CertificateStatus } from "mmo-shared-reference-data";
import { CertificateAuthority, CertificateTransport } from "../../types/defraValidation";
import { IDynamicsCatchCertificateCase } from "../../types/dynamicsValidation";
import { toLanding } from "./dynamicsValidation";
import { Catch } from "../../types/document";
import { ApplicationConfig } from "../../config";
import { getTotalRiskScore, isHighRisk } from "../../data/risking";
import { ISdPsQueryResult } from "../../types/query";
import {  IDefraTradeSdPsStatus, IDynamicsProcessingStatementCase, IDefraTradeProcessingStatementCatch,IDefraTradeProcessingStatement, IDefraTradeStorageDocumentProduct, IDefraTradeStorageDocument} from "../../types/defraTradeSdPsCase";
import moment from "moment";
import { toDefraSdStorageFacility } from "./defraValidation";
import { IDynamicsStorageDocumentCase } from "../../types/dynamicsSdPsCase";

const TRANSPORT_VEHICLE_TRUCK  = 'truck';
const TRANSPORT_VEHICLE_TRAIN  = 'train';
const TRANSPORT_VEHICLE_PLANE  = 'plane';
const TRANSPORT_VEHICLE_VESSEL = 'vessel';
const TRANSPORT_VEHICLE_CONTAINER_VESSEL = 'containerVessel';

const toAuthority: () => CertificateAuthority = () => ({
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
});

const createUrl = (rawDataType: string, q: ICcQueryResult) => {
  return `{BASE_URL}/reference/api/v1/extendedData/${rawDataType}?dateLanded=${q.dateLanded}&rssNumber=${q.rssNumber}`
}

const isMultiVessel = (products: Product[]) => {
  const { vesselCounts, catchLength } = getVesselCount(products);
  return Object.keys(vesselCounts).length > 1 || catchLength > 6;
}

const getVesselCount = (products: Product[]) => {
  if (!Array.isArray(products) || products.length <= 0) {
    return { vesselCounts: {}, catchLength: 0 }
  }

  const vesselCounts = {};
  let catchLength = 0;    // calculate number of lines. so we can calculate number of maxPages

  products.forEach((product: Product) => {
    if (Array.isArray(product.caughtBy)) {
      product.caughtBy.forEach((landing: Catch) => {
        vesselCounts[landing.vessel + landing.pln + landing.licenceNumber] = (vesselCounts[landing.vessel + landing.pln + landing.licenceNumber] || 0) + 1;
        catchLength += 1;
      })
    }
  });

  return { vesselCounts, catchLength };
}

export const toDefraTradeLanding = (landing: ICcQueryResult): IDefraTradeLanding => {
  const dynamicsLanding: IDynamicsLanding = toLanding(landing);
  const riskScore = landing.extended.riskScore === undefined ? getTotalRiskScore(
    landing.extended.pln,
    landing.species,
    landing.extended.exporterAccountId,
    landing.extended.exporterContactId) : landing.extended.riskScore;

  return {
    ...dynamicsLanding,
    status: toDefraCcLandingStatus(landing, isHighRisk(riskScore, landing.extended.threshold)),
    species: landing.extended.species,
    flag: landing.extended.flag,
    catchArea: landing.extended.fao,
    homePort: landing.extended.homePort,
    fishingLicenceNumber: landing.extended.licenceNumber,
    fishingLicenceValidTo: landing.extended.licenceValidTo,
    imo: landing.extended.imoNumber,
    validation: {
      ...dynamicsLanding.validation,
      rawLandingsUrl: createUrl('rawLandings', landing).replace('{BASE_URL}', ApplicationConfig.prototype.internalAppUrl),
      salesNoteUrl: createUrl('salesNotes', landing).replace('{BASE_URL}', ApplicationConfig.prototype.internalAppUrl)
    }
  }
};

export const toDefraTradeCc = (document: IDocument, certificateCase: IDynamicsCatchCertificateCase, ccQueryResults: ICcQueryResult[] | null): IDefraTradeCatchCertificate => {
  const transportation: CertificateTransport = document.exportData?.transportation
    ? toTransportation(document.exportData.transportation)
    : toTransportation(document.exportData?.transportations.find((t) => t.departurePlace || t.vehicle === 'truck' && t.cmr));

  if (transportation) {
    Object.keys(transportation).forEach(key => transportation[key] === undefined && delete transportation[key]);
  }

  let status: CertificateStatus;
  if (!Array.isArray(ccQueryResults)) {
    status = CertificateStatus.VOID
  } else {
    status = ccQueryResults.some((_: ICcQueryResult) => _.status === "BLOCKED") ? CertificateStatus.BLOCKED : CertificateStatus.COMPLETE;
  }

  return {
    ...certificateCase,
    certStatus: status,
    landings: Array.isArray(ccQueryResults) ? ccQueryResults.map((_: ICcQueryResult) => toDefraTradeLanding(_)) : null,
    exportedTo: document.exportData?.transportation?.exportedTo ?? document.exportData?.exportedTo,
    transportation,
    multiVesselSchedule: isMultiVessel(document.exportData?.products)
  }
};

export function toTransportation(transportation) : CertificateTransport {
  if(transportation === undefined || transportation === null)
     return undefined;

  const handleEmptyValue = (value) => value !== undefined && value !== null && value !== '' ? value : undefined;

  switch (transportation.vehicle) {
     case TRANSPORT_VEHICLE_TRUCK:
        return {
           modeofTransport: transportation.vehicle,
           hasRoadTransportDocument: transportation.cmr === undefined ? false : transportation.cmr,
           nationality: transportation.nationalityOfVehicle,
           registration: transportation.registrationNumber,
           exportLocation: transportation.departurePlace,
           exportDate: transportation.exportDate,
           freightbillNumber: handleEmptyValue(transportation.freightBillNumber),
           countryofDeparture: transportation.departureCountry,
           whereDepartsFrom: transportation.departurePort,
           departureDate: transportation.departureDate,
           placeOfUnloading: transportation.placeOfUnloading,
           containerId: handleEmptyValue(transportation.containerIdentificationNumber),
           pointOfDestination: transportation.pointOfDestination
        }
     case TRANSPORT_VEHICLE_TRAIN:
        return {
           modeofTransport: transportation.vehicle,
           billNumber: transportation.railwayBillNumber,
           exportLocation: transportation.departurePlace,
           exportDate: transportation.exportDate,
           freightbillNumber: handleEmptyValue(transportation.freightBillNumber),
           countryofDeparture: transportation.departureCountry,
           whereDepartsFrom: transportation.departurePort,
           departureDate: transportation.departureDate,
           placeOfUnloading: transportation.placeOfUnloading,
           containerId: handleEmptyValue(transportation.containerIdentificationNumber),
           pointOfDestination: transportation.pointOfDestination
        }
     case TRANSPORT_VEHICLE_PLANE:
        return {
           modeofTransport: transportation.vehicle,
           flightNumber: transportation.flightNumber,
           containerId: transportation.containerNumbers ? transportation.containerNumbers : transportation.containerNumber,
           exportLocation: transportation.departurePlace,
           exportDate: transportation.exportDate,
           freightbillNumber: handleEmptyValue(transportation.freightBillNumber),
           airwaybillNumber: handleEmptyValue(transportation.airwayBillNumber),
           countryofDeparture: transportation.departureCountry,
           whereDepartsFrom: transportation.departurePort,
           departureDate: transportation.departureDate,
           placeOfUnloading: transportation.placeOfUnloading,
           pointOfDestination: transportation.pointOfDestination
        }
     case TRANSPORT_VEHICLE_CONTAINER_VESSEL:
        return {
           modeofTransport: TRANSPORT_VEHICLE_VESSEL,
           name: transportation.vesselName,
           flag: transportation.flagState,
           containerId: transportation.containerNumbers ? transportation.containerNumbers : transportation.containerNumber,
           exportLocation: transportation.departurePlace,
           exportDate: transportation.exportDate,
           freightbillNumber: handleEmptyValue(transportation.freightBillNumber),
           countryofDeparture: transportation.departureCountry,
           whereDepartsFrom: transportation.departurePort,
           departureDate: transportation.departureDate,
           placeOfUnloading: transportation.placeOfUnloading,
           pointOfDestination: transportation.pointOfDestination
        }
     default:
        return {
           modeofTransport: transportation.vehicle,
           exportLocation: transportation.departurePlace,
           exportDate: transportation.exportDate,
           freightbillNumber: handleEmptyValue(transportation.freightBillNumber),
           countryofDeparture: transportation.countryofDeparture,
           whereDepartsFrom: transportation.departurePort,
           departureDate: transportation.departureDate,
           placeOfUnloading: transportation.placeOfUnloading,
           pointOfDestination: transportation.pointOfDestination
        }
  }
}
export function toDefraTradePsCatch(validatedPsCatches: ISdPsQueryResult): IDefraTradeProcessingStatementCatch {
  let status = IDefraTradeSdPsStatus.Success;

  if (validatedPsCatches.isMismatch) {
    status = IDefraTradeSdPsStatus.Weight
  }

  if (validatedPsCatches.isOverAllocated) {
    status = IDefraTradeSdPsStatus.Overuse
  }

  return {
    foreignCatchCertificateNumber: validatedPsCatches.catchCertificateNumber,
    species: validatedPsCatches.species,
    id: validatedPsCatches.extended.id,
    cnCode: validatedPsCatches.commodityCode,
    scientificName: validatedPsCatches.scientificName,
    importedWeight: validatedPsCatches.weightOnFCC,
    usedWeightAgainstCertificate: validatedPsCatches.weightOnDoc,
    processedWeight: validatedPsCatches.weightAfterProcessing,
    validation: {
      status: status,
      totalUsedWeightAgainstCertificate: validatedPsCatches.weightOnAllDocs,
      weightExceededAmount: validatedPsCatches.overAllocatedByWeight,
      overuseInfo: validatedPsCatches.overUsedInfo.some(_ => _ !== validatedPsCatches.documentNumber)
        ? validatedPsCatches.overUsedInfo.filter(_ => _ !== validatedPsCatches.documentNumber) : undefined
    }
  }
}

export const toDefraTradePs = (document: IDocument, processingStatementCase: IDynamicsProcessingStatementCase, psQueryResults: ISdPsQueryResult[] | null): IDefraTradeProcessingStatement => ({

  ...processingStatementCase,
  catches: Array.isArray(psQueryResults) ? psQueryResults.map((_: ISdPsQueryResult) =>
    toDefraTradePsCatch(_)
  ) : null,
  exportedTo: document.exportData?.exportedTo,
  plantAddress: {
    line1: document.exportData?.plantAddressOne,
    building_name: document.exportData?.plantBuildingName,
    building_number: document.exportData?.plantBuildingNumber,
    sub_building_name: document.exportData?.plantSubBuildingName,
    street_name: document.exportData?.plantStreetName,
    country: document.exportData?.plantCountry,
    county: document.exportData?.plantCounty,
    city: document.exportData?.plantTownCity,
    postCode: document.exportData?.plantPostcode
  },
  plantApprovalNumber: document.exportData?.plantApprovalNumber,
  plantDateOfAcceptance: moment(document.exportData?.dateOfAcceptance, 'DD/MM/YYYY').format('YYYY-MM-DD'),
  healthCertificateNumber: document.exportData?.healthCertificateNumber,
  healthCertificateDate: moment(document.exportData?.healthCertificateDate, ["DD/MM/YYYY", "DD/M/YYYY", "D/MM/YYYY", "D/M/YYYY"]).format('YYYY-MM-DD'),
  authority: toAuthority()
});


export function toDefraTradeSdProduct(validatedSdProducts: ISdPsQueryResult): IDefraTradeStorageDocumentProduct {

  let status = IDefraTradeSdPsStatus.Success;

  if (validatedSdProducts.isMismatch) {
    status = IDefraTradeSdPsStatus.Weight
  }

  if (validatedSdProducts.isOverAllocated) {
    status = IDefraTradeSdPsStatus.Overuse
  }

  return {
    foreignCatchCertificateNumber: validatedSdProducts.catchCertificateNumber,
    species: validatedSdProducts.species,
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
    },
    issuingCountry: validatedSdProducts.catchCertificateType === 'uk' ? 'United Kingdom' : validatedSdProducts.issuingCountry?.officialCountryName,
    supportingDocuments: validatedSdProducts.supportingDocuments,
    productDescription: validatedSdProducts.productDescription,
    netWeightProductArrival: validatedSdProducts.netWeightProductArrival,
    netWeightFisheryProductArrival: validatedSdProducts.netWeightFisheryProductArrival,
    netWeightProductDeparture: validatedSdProducts.netWeightProductDeparture,
    netWeightFisheryProductDeparture: validatedSdProducts.netWeightFisheryProductDeparture
  }
}

export const toDefraTradeProduct = (product: ISdPsQueryResult): IDefraTradeStorageDocumentProduct =>
  toDefraTradeSdProduct(product);

export const toDefraTradeSd = (document: IDocument, documentCase: IDynamicsStorageDocumentCase, sdQueryResults: ISdPsQueryResult[] | null): IDefraTradeStorageDocument => {
  const exportData = document.exportData;
  const transportation: CertificateTransport = toTransportation(exportData ? exportData.transportation : undefined);
  const arrivalTransportation: CertificateTransport = toTransportation(exportData ? exportData.arrivalTransportation : undefined);
  
  if (transportation) {
    Object.keys(transportation).forEach(key => transportation[key] === undefined && delete transportation[key]);
    transportation.exportDate = moment(transportation.exportDate, ['DD/MM/YYYY', 'DD/M/YYYY', 'D/MM/YYYY']).isValid() ? moment(transportation.exportDate, ['DD/MM/YYYY', 'DD/M/YYYY', 'D/MM/YYYY']).format('YYYY-MM-DD') : moment.utc().format('YYYY-MM-DD');
  }

  return {
    ...documentCase,
    products: Array.isArray(sdQueryResults) ? sdQueryResults.map((_: ISdPsQueryResult) => toDefraTradeProduct(_)) : null,
    storageFacility: toDefraSdStorageFacility(document.exportData),
    exportedTo: exportData ? exportData.exportedTo : undefined,
    transportation,
    arrivalTransportation,
    authority: toAuthority()
  }
};
