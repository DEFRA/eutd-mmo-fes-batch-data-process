import { ICcQueryResult } from "mmo-shared-reference-data";
import { Document, Schema, model } from "mongoose";
const EmptySchema = new Schema({},{strict:false });

export interface ICcQueryResultModel extends ICcQueryResult, Document {}
export const FailedOnlineCertificates  = model<ICcQueryResultModel>('failedOnlineCertificates', EmptySchema);

// ^ exports introduced when trying in increase coverage for catchCerts.ts - not sure if belongs here or in shared