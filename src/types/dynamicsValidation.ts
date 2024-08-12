import { IDynamicsLanding } from "mmo-shared-reference-data";
import { CertificateAudit, CertificateExporterAndCompany, ICountry } from "./defraValidation";

export interface IDynamicsCatchCertificateCase {
  da: string;
  caseType1: CaseOneType;
  caseType2: CaseTwoType;
  numberOfFailedSubmissions: number;
  isDirectLanding: boolean;
  documentNumber: string;
  documentUrl?: string;
  documentDate?: string;
  exporter: CertificateExporterAndCompany;
  exportedTo: ICountry;
  landings?: IDynamicsLanding[] | null;
  _correlationId: string;
  requestedByAdmin: boolean;
  isUnblocked?: boolean;
  vesselOverriddenByAdmin?: boolean;
  speciesOverriddenByAdmin?: boolean;
  audits?: CertificateAudit[];
  failureIrrespectiveOfRisk?: boolean;
  clonedFrom?: string;
  landingsCloned?: boolean;
  parentDocumentVoid?: boolean;
}

export enum CaseOneType {
  CatchCertificate = 'CC',
  ProcessingStatement = 'PS',
  StorageDocument = 'SD'
}

export enum CaseTwoType {
  RealTimeValidation_Rejected = 'Real Time Validation - Rejected',
  RealTimeValidation_NoLandingData = 'Real Time Validation - No Landing Data',
  RealTimeValidation_Overuse = 'Real Time Validation - Overuse Failure',
  PendingLandingData = 'Pending Landing Data',
  DataNeverExpected = 'Data Never Expected',
  Success = 'Real Time Validation - Successful',
  VoidByExporter = 'Void by an Exporter',
  VoidByAdmin = 'Void by SMO/PMO'
}