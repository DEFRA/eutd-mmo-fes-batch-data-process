import { Schema, model, Document } from 'mongoose';
import { ILanding, ILandingQuery } from 'mmo-shared-reference-data';

export interface ILandingModel extends ILanding, Document {}

export const enum LandingSources {
  LandingDeclaration  = 'LANDING_DECLARATION',
  CatchRecording      = 'CATCH_RECORDING',
  ELog                = 'ELOG'
}

export interface ILandingQueryWithIsLegallyDue extends ILandingQuery {
  isLegallyDue: boolean;
}

const LandingItemSchema = new Schema({
  species:      { type: String, required: true },
  weight:       { type: Number, required: true },
  factor:       { type: Number, required: true },
  state:        { type: String, required: false },
  presentation: { type: String, required: false }
});

const LandingSchema = new Schema({
  rssNumber:         { type: String, required: true },
  dateTimeLanded:    { type: Date, required: true },
  dateTimeRetrieved: { type: Date, default: Date.now },
  source:            { type: String, required: true },
  items:             [ LandingItemSchema ]
});

export const LandingModel = model<ILandingModel>('Landing', LandingSchema);