import { ICcQueryResult } from "mmo-shared-reference-data";
import { Document, Schema, model } from "mongoose";
const EmptySchema = new Schema({},{strict:false });

export interface ICcQueryResultModel extends ICcQueryResult, Document {}
export const FailedOnlineCertificates  = model<ICcQueryResultModel>('failedOnlineCertificates', EmptySchema);

export interface ISdPsQueryResult {
    documentNumber: string;
    catchCertificateNumber?: string;
    catchCertificateType?: string;
    status: string;
    documentType: string;
    createdAt: string;
    da: string | null;
    species: string;
    scientificName?: string;
    commodityCode: string;
    weightOnDoc: number;
    extended: {
      id: string,
      exporterCompanyName?: string,
      url?: string,
      investigation?: string,
      preApprovedBy?: string,
      voidedBy?: string;
    }
    weightOnAllDocs: number;
    weightOnFCC: number;
    weightAfterProcessing?: number;
    isOverAllocated: boolean;
    overAllocatedByWeight: number;
    overUsedInfo: string[]; //Linked PS or SD
    isMismatch: boolean;
    dateOfUnloading?: string;
    placeOfUnloading?: string;
    transportUnloadedFrom?: string;
  }

  export interface IFlattenedCatch {
    documentNumber: string;
    documentType: string;
    certificateNumber: string;
    certificateType: string;
    status: string;
    createdAt: string;
    da: string;
    species: string;
    scientificName?: string;
    commodityCode: string;
    weight: number;
    weightOnCC: number;
    weightAfterProcessing?: number;
    dateOfUnloading?: string;
    placeOfUnloading?: string;
    transportUnloadedFrom?: string;
    extended: any;
  }

// ^ exports introduced when trying in increase coverage for catchCerts.ts - not sure if belongs here or in shared