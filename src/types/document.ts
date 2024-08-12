import { Schema, model, Document } from 'mongoose';
import { DocumentStatuses, LandingStatus, type IDocument } from 'mmo-shared-reference-data';

export interface IDocumentModel extends IDocument, Document {}

const documentSchema = new Schema({
  __t:            { type: String, required: true  },
  documentNumber: { type: String, required: true  },
  status:         { type: String, required: false, enum: Object.values(DocumentStatuses) },
  createdAt:      { type: Date,   required: true  },
  createdBy:      { type: String, required: true  },
  createdByEmail: { type: String },
  documentUri:    { type: String, required: false },
  audit:          { type: Array,  required: false },
  investigation:  { type: Schema.Types.Mixed, required: false },
  exportData:     { type: Schema.Types.Mixed, required: false },
  requestByAdmin: { type: Boolean,required: false },
  clonedFrom:     { type: String,required: false },
  landingsCloned: { type: Boolean,required: false },
  parentDocumentVoid: { type: Boolean,required: false },
},
{strict: false}
)

export const DocumentModel = model<IDocumentModel>('exportCertificate', documentSchema, 'exportCertificates')

export interface Catch {
  id: string;
  vessel?: string;
  pln?: string;
  homePort?: string;
  flag?: string; // jurisdiction under whose laws the vessel is registered or licensed
  cfr?: string; // cost and freight (CFR) is a legal term
  imoNumber?: string | null;
  licenceNumber?: string;
  licenceValidTo?: string;
  licenceHolder?: string;
  date?: string;
  faoArea?: string;
  weight?: number;
  _status?: LandingStatus;
  numberOfSubmissions?: number;
  vesselOverriddenByAdmin?: boolean;
  vesselNotFound?: boolean;
  dataEverExpected?: boolean;
  landingDataExpectedDate?: string;
  landingDataEndDate?: string;
  isLegallyDue?: boolean;
}