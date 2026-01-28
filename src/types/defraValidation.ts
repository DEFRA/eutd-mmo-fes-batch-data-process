import { Schema, model, Document } from 'mongoose';
import { IDefraValidationCatchCertificate, IDefraValidationReport } from 'mmo-shared-reference-data'

export const countrySchema = new Schema({
    officialCountryName:  { type: String, required: true },
    isoCodeAlpha2:        { type: String, required: false },
    isoCodeAlpha3:        { type: String, required: false },
    isoNumericCode:       { type: String, required: false }
  }, { _id: false });
  
  export const DefraValidationCatchCertificateSchema = new Schema ({
      documentType:          { type: String,  required: true  },
      documentNumber:        { type: String,  required: true  },
      status:                { type: String,  required: true  },
      _correlationId:        { type: String,  required: true  },
      requestedByAdmin:      { type: Boolean, required: false, default: false },
      lastUpdated:           { type: Date,    required: false, default: Date.now },
      devolvedAuthority:     { type: String,  required: false },
      dateCreated:           { type: Date,    required: false },
      created:               { type: Object,  required: false },
      userReference:         { type: String,  required: false },
      audits:                { type: [Schema.Types.Mixed],  required: false },
      exporterDetails:       { type: Object,  required: false },
      landings:              { type: [Schema.Types.Mixed],  required: false },
      conservationReference: { type: String,  required: false },
      documentUri:           { type: String,  required: false },
      exportedFrom:          { type: String,  required: false },
      exportedTo:            { type: countrySchema, required: false },
      transportation:        { type: Object,  required: false },
      failedSubmissions:     { type: Number,  required: false },
      _processed:            { type: Boolean, required: false, default: false },
      clonedFrom:            { type: String,  required: false },
      landingsCloned:        { type: Boolean, required: false },
      parentDocumentVoid:    { type: Boolean, required: false }
  });
  
  export const DefraValidationReportSchema = new Schema({
      certificateId:      { type: String,  required: true  },
      status:             { type: String,  required: true  },
      requestedByAdmin:   { type: Boolean, required: false, default: false },
      landingId:          { type: String,  required: false },
      validationPass:     { type: Boolean, required: false },
      lastUpdated:        { type: Date,    required: false, default: Date.now },
      isUnblocked:        { type: Boolean, required: false, default: false },
      _processed:         { type: Boolean, required: false, default: false }
  });

export const baseConfig = {
    discriminationKey: '_type',
    collection: 'defravalidationreports'
};

export type IDefraValidationReportData = Document
export interface IDefraValidationCatchCertificateModel extends IDefraValidationCatchCertificate, Document {}
export interface IDefraValidationReportModel extends IDefraValidationReport, Document {}

export const DefraValidationReportData = model<IDefraValidationReportData>('DefraValidationReportData', new Schema({}, baseConfig));
export const DefraValidationReportModel = DefraValidationReportData.discriminator<IDefraValidationReportModel>('defraValidationReport', DefraValidationReportSchema);
export const DefraValidationCatchCertificateModel = DefraValidationReportData.discriminator<IDefraValidationCatchCertificateModel>('defraValidationCatchCertificate', DefraValidationCatchCertificateSchema);


export type CertificateTransport = Truck | Train | Plane | Vessel | FishingVessel;

export interface CertificateExporterAndCompany {
    fullName: string;
    companyName: string;
    contactId?: string;
    accountId?: string;
    address: CertificateAddress;
    dynamicsAddress?: any;
}

export interface ICountry {
    officialCountryName: string;
    isoCodeAlpha2?: string;
    isoCodeAlpha3?: string;
    isoNumericCode?: string;
}

export interface CertificateAddress {
    address_line?: string;
    building_number?: string | null;
    sub_building_name?: string;
    building_name?: string;
    street_name?: string;
    county?: string | null;
    country?: string;
    line1?: string;
    line2?: string;
    city: string;
    postCode?: string;
}

export interface CertificateAudit {
    auditOperation: string;
    investigationStatus?: string;
    user: string;
    auditAt: Date;
}

export interface IAuditEvent {
    eventType: string,
    triggeredBy: string,
    timestamp: Date,
    data?: any
}
export interface CertificateCompany {
    companyName: string;
    address: CertificateAddress;
    contactId? : string;
    accountId?: string;
    dynamicsAddress?: any;
}
export interface CertificateAuthority {
    name: string,
    companyName: string,
    address: CertificateAddress,
    tel: string,
    email:  string,
    dateIssued: string,
  }

export interface CertificateStorageFacility {
    name?: string;
    address: CertificateAddress;
    dateOfUnloading?: string,
    approvalNumber?: string,
    productHandling?: string
}


interface ModeOfTransport {
    modeofTransport: string;
    placeOfUnloading?: string;
    exportLocation?: string;
    exportDate?: string;
    freightbillNumber?: string;
    countryofDeparture?: string;
    whereDepartsFrom?: string;
    departureDate?: string;
    pointOfDestination?: string;
}

export interface Truck extends ModeOfTransport {
    hasRoadTransportDocument: boolean;
    nationality?: string;
    registration?: string;
    containerId?: string;
}

export interface Train extends ModeOfTransport {
    billNumber?: string;
    containerId?: string;
}

export interface Plane extends ModeOfTransport {
    flightNumber?: string;
    containerId: string;
    airwaybillNumber?: string;
}

export interface Vessel extends ModeOfTransport {
    name?: string;
    flag: string;
    containerId: string;
}

type FishingVessel = ModeOfTransport;
