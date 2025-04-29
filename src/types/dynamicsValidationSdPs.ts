import { ICountry } from "mmo-shared-reference-data";
import { CertificateCompany } from "./defraValidation";

export interface IDynamicsStorageDocumentCase {
    exporter: CertificateCompany;
    documentUrl: string | undefined;
    documentDate: string;
    caseType1: string;
    caseType2: SdPsCaseTwoType;
    numberOfFailedSubmissions: number;
    documentNumber: string;
    companyName: string;
    exportedTo: ICountry;
    products?: IDynamicsStorageDocumentProduct[];
    _correlationId: string;
    da: string;
    requestedByAdmin: boolean;
    clonedFrom?: string;
    parentDocumentVoid?: boolean;
}

export interface IDynamicsStorageDocumentProduct {
    foreignCatchCertificateNumber: string;
    isDocumentIssuedInUK?: boolean;
    species: string;
    id: string;
    cnCode: string;
    scientificName: string;
    importedWeight: number;
    exportedWeight: number;
    validation: IDynamicsStorageDocumentValidation;
}

export interface IDynamicsStorageDocumentValidation {
    status: SdPsStatus;
    totalWeightExported: number;
    weightExceededAmount?: number;
    overuseInfo?: string[];
}

export enum SdPsCaseTwoType {
    RealTimeValidation_Success = 'Real Time Validation - Successful',
    RealTimeValidation_Overuse = 'Real Time Validation - Overuse Failure',
    RealTimeValidation_Weight = 'Real Time Validation - Weight Failure',
    VoidByExporter = 'Void by an Exporter',
    VoidByAdmin = 'Void by SMO/PMO'
}

export enum SdPsStatus {
    Success = 'Validation Success',
    Overuse = 'Overuse Failure',
    Weight = 'Weight Failure'
}