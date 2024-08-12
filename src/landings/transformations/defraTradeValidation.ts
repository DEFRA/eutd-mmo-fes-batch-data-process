import { ICcQueryResult, IDocument, IDynamicsLanding, Product } from "mmo-shared-reference-data";
import { CertificateTransport } from "../../types/defraValidation";
import { IDynamicsCatchCertificateCase } from "../../types/dynamicsValidation";
import { CertificateStatus, IDefraTradeCatchCertificate, IDefraTradeLanding } from "../../types/defraTradeValidation";
import { toLanding } from "./dynamicsValidation";
import { Catch } from "../../types/document";
import { ApplicationConfig } from "../../config";

const TRANSPORT_VEHICLE_TRUCK  = 'truck';
const TRANSPORT_VEHICLE_TRAIN  = 'train';
const TRANSPORT_VEHICLE_PLANE  = 'plane';
const TRANSPORT_VEHICLE_VESSEL = 'vessel';
const TRANSPORT_VEHICLE_CONTAINER_VESSEL = 'containerVessel';

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

  return {
    ...dynamicsLanding,
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
  const transportation: CertificateTransport = toTransportation(document.exportData?.transportation);
  
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
    exportedTo: document.exportData?.transportation?.exportedTo,
    transportation,
    multiVesselSchedule: isMultiVessel(document.exportData?.products)
  }
};

export function toTransportation(transportation) : CertificateTransport {
  if(transportation === undefined)
     return undefined;

  switch (transportation.vehicle) {
     case TRANSPORT_VEHICLE_TRUCK:
        return {
           modeofTransport: transportation.vehicle,
           hasRoadTransportDocument: transportation.cmr,
           nationality: transportation.nationalityOfVehicle,
           registration: transportation.registrationNumber,
           exportLocation: transportation.departurePlace,
           exportDate: transportation.exportDate
        }
     case TRANSPORT_VEHICLE_TRAIN:
        return {
           modeofTransport: transportation.vehicle,
           billNumber: transportation.railwayBillNumber,
           exportLocation: transportation.departurePlace,
           exportDate: transportation.exportDate
        }
     case TRANSPORT_VEHICLE_PLANE:
        return {
           modeofTransport: transportation.vehicle,
           flightNumber: transportation.flightNumber,
           containerId: transportation.containerNumber,
           exportLocation: transportation.departurePlace,
           exportDate: transportation.exportDate
        }
     case TRANSPORT_VEHICLE_CONTAINER_VESSEL:
        return {
           modeofTransport: TRANSPORT_VEHICLE_VESSEL,
           name: transportation.vesselName,
           flag: transportation.flagState,
           containerId: transportation.containerNumber,
           exportLocation: transportation.departurePlace,
           exportDate: transportation.exportDate
        }
     default:
        return {
           modeofTransport: transportation.vehicle,
           exportLocation: transportation.departurePlace,
           exportDate: transportation.exportDate
        }
  }
}