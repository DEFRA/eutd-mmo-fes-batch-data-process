import { SdPsCaseTwoType } from "./dynamicsValidationSdPs";
import { CertificateAuthority, CertificateCompany, CertificateStorageFacility, CertificateTransport } from "./defraValidation";
import { ICountry } from "mmo-shared-reference-data";
export interface IDefraTradeStorageDocumentValidation {
  status: IDefraTradeSdPsStatus;
  totalWeightExported: number;
  weightExceededAmount?: number;
  overuseInfo?: string[];
}

export interface IDefraTradeStorageDocumentProduct {
  foreignCatchCertificateNumber: string;
  species: string;
  id: string;
  cnCode: string;
  scientificName: string;
  importedWeight: number;
  exportedWeight: number;
  validation: IDefraTradeStorageDocumentValidation;
  dateOfUnloading: string,
  placeOfUnloading: string,
  transportUnloadedFrom: string,
}

export interface IDefraTradeStorageDocument {
  exporter: CertificateCompany;
  documentUrl: string;
  documentDate: string;
  caseType1: string;
  caseType2: SdPsCaseTwoType;
  numberOfFailedSubmissions: number;
  documentNumber: string;
  companyName: string;
  exportedTo: ICountry;
  products?: IDefraTradeStorageDocumentProduct[];
  _correlationId: string;
  da: string;
  requestedByAdmin: boolean;
  transportation: CertificateTransport;
  storageFacilities: CertificateStorageFacility[];
  authority: CertificateAuthority;
}

export enum IDefraTradeSdPsStatus {
  Success = 'Validation Success',
  Overuse = "Validation Failure - Overuse",
  Weight = "Validation Failure - Weight",
}
