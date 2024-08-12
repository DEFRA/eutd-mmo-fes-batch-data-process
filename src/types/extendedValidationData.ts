import { Schema, model } from 'mongoose';

const ExtendedValidationDataSchema = new Schema({
    rssNumber:  { type: String,             required: true },
    dateLanded: { type: String,             required: true },
    data:       { type: Schema.Types.Mixed, required: true }
});

export const RawLandingsModel = model('RawLandings', ExtendedValidationDataSchema);
export const SalesNotesModel = model('SalesNotes', ExtendedValidationDataSchema);
