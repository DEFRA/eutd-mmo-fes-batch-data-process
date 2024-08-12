import { Schema, Document, model } from 'mongoose';
import type { ISpeciesRiskToggle, IVesselOfInterest, IWeighting } from 'mmo-shared-reference-data';

export const baseConfig = {
  discriminationKey: '_type',
  collection: 'risk'
};

const VesselOfInterestSchema = new Schema({
  registrationNumber: { type: String, required: true },
  fishingVesselName:  { type: String, required: true }, 
  homePort:           { type: String, required: true }, 
  da:                 { type: String, required: true } 
});

const WeightingSchema = new Schema({
  vesselWeight:   { type: Number, required: true },
  speciesWeight:  { type: Number, required: true },
  exporterWeight: { type: Number, required: true },
  threshold:      { type: Number, required: true },
});

const SpeciesRiskToggleSchema = new Schema({
  enabled:        { type: Boolean, required: true}
})

export type IRisk = Document;
export interface IVesselOfInterestModel extends IVesselOfInterest, Document {}
export interface IWeightingModel extends IWeighting, Document { }
export interface ISpeciesRiskToggleModel extends ISpeciesRiskToggle, Document {}

export const Risk = model<IRisk>('Risk', new Schema({}, baseConfig));
export const WeightingModel = Risk.discriminator<IWeightingModel>('weights', WeightingSchema);
export const SpeciesRiskToggleModel = Risk.discriminator<ISpeciesRiskToggleModel>('speciesRiskToggle', SpeciesRiskToggleSchema); 
export const VesselOfInterestModel = Risk.discriminator<IVesselOfInterestModel>('vesselOfInterest', VesselOfInterestSchema);