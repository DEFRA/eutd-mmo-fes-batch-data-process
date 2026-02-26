import { SdPsCaseTwoType } from "./dynamicsValidationSdPs";
import { CertificateAuthority, CertificateCompany,CertificateAddress,CertificateStorageFacility, CertificateTransport  } from "./defraValidation";
import { ICountry } from "mmo-shared-reference-data";
export enum IDefraTradeSdPsStatus {
  Success = 'Validation Success',
  Overuse = "Validation Failure - Overuse",
  Weight = "Validation Failure - Weight",
}
export interface IDynamicsProcessingStatementCase {
    exporter: CertificateCompany;
    documentUrl: string;
    documentDate: string;
    caseType1: string;
    caseType2: SdPsCaseTwoType;
    numberOfFailedSubmissions: number;
    documentNumber: string;
    plantName: string;
    personResponsible: string;
    exportedTo: ICountry;
    processedFisheryProducts: string;
    catches?: IDynamicsProcessingStatementCatch[];
    da: string;
    _correlationId: string;
    requestedByAdmin: boolean;
    clonedFrom?: string;
    parentDocumentVoid?: boolean;
}

export interface IDefraTradeProcessingStatementValidation {
  status: IDefraTradeSdPsStatus;
  totalUsedWeightAgainstCertificate: number;
  weightExceededAmount?: number;
  overuseInfo?: string[];
}

export interface IDefraTradeProcessingStatementCatch {
  foreignCatchCertificateNumber: string;
  id: string;
  species: string;
  cnCode: string;
  scientificName: string;
  importedWeight: number;
  usedWeightAgainstCertificate: number;
  processedWeight: number;
  validation: IDefraTradeProcessingStatementValidation;
}

export interface IDefraTradeProcessingStatement {
    exporter: CertificateCompany;
    documentUrl: string;
    documentDate: string;
    caseType1: string;
    caseType2: SdPsCaseTwoType;
    numberOfFailedSubmissions: number;
    documentNumber: string;
    plantName: string;
    plantAddress: CertificateAddress;
    plantApprovalNumber: string;
    plantDateOfAcceptance: string;
    personResponsible : string;
    exportedTo: ICountry;
    processedFisheryProducts: string;
    catches?: IDefraTradeProcessingStatementCatch[];
    healthCertificateNumber: string;
    healthCertificateDate: string;
    da: string;
    _correlationId: string;
    requestedByAdmin: boolean;
    authority: CertificateAuthority;
}

export interface IDynamicsProcessingStatementCatch {
    foreignCatchCertificateNumber: string;
    isDocumentIssuedInUK?: boolean;
    id: string;
    species: string;
    cnCode: string;
    scientificName: string;
    importedWeight: number;
    usedWeightAgainstCertificate: number;
    processedWeight: number;
    validation: IDynamicsProcessingStatementValidation;
}

export interface IDynamicsProcessingStatementValidation {
    status: SdPsStatus;
    totalUsedWeightAgainstCertificate: number;
    weightExceededAmount?: number;
    overuseInfo?: string[];
}

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
  issuingCountry: string;
  supportingDocuments?: string,
  productDescription?: string,
  netWeightProductArrival?: string,
  netWeightFisheryProductArrival? : string,
  netWeightProductDeparture? : string,
  netWeightFisheryProductDeparture? : string
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
  arrivalTransportation?: CertificateTransport;
  storageFacilities?: CertificateStorageFacility[];
  storageFacility: CertificateStorageFacility;
  authority: CertificateAuthority;
}
export enum SdPsStatus {
    Success = 'Validation Success',
    Overuse = 'Overuse Failure',
    Weight = 'Weight Failure'
}