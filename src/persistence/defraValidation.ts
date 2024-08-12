import moment from "moment";
import { IDefraValidationCatchCertificate, IDefraValidationReport } from "mmo-shared-reference-data";
import { DefraValidationReportData, DefraValidationReportModel, DefraValidationCatchCertificateModel } from "../types/defraValidation";
import { ApplicationConfig } from "../config";

export const getUnprocessedReports = async (): Promise<any[]> =>
  await DefraValidationReportData.find({ _processed: false })
    .setOptions({ strictQuery: false })
    .select(['-__v', '-__t', '-_processed'])
    .limit(ApplicationConfig.prototype.maximumDefraValidationReportBatchSize)
    .lean();

export const markAsProcessed = async (ids: string[]): Promise<void> => {
  await DefraValidationReportData.updateMany(
    {
      _id: {
        $in: ids
      }
    },
    { _processed: true },
    { strict: false }
  );
};

export const getAllDefraValidationReports = async (dateFrom: string = undefined, dateTo: string = undefined): Promise<any[]> => {

  const filters = [];

  if (dateFrom) {
    filters.push({'lastUpdated': {'$gte': moment(dateFrom).utc().toDate()}});
  }

  if (dateTo) {
      filters.push({'lastUpdated': {'$lte': moment(dateTo).utc().toDate()}});
  }

  const qry = (filters.length) ? {'$and': filters} : {}

  return await DefraValidationReportData.find(qry)
    .setOptions({ strictQuery: false })
    .select(['-_id', '-__v', '-__t', '-_processed'])
    .lean();
};

export const insertDefraValidationReport = async (report: IDefraValidationReport): Promise<void> => {
  await new DefraValidationReportModel(report).save();
}

export const insertCcDefraValidationReport = async (report: IDefraValidationCatchCertificate): Promise<void> => {
  await new DefraValidationCatchCertificateModel(report).save();
};