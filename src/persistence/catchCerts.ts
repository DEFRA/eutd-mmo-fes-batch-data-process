import { type IGetCatchCerts, DocumentStatuses, IDocument, getCertificateByDocumentNumberWithNumberOfFailedAttemptsQuery } from "mmo-shared-reference-data";
import { DocumentModel } from "../types/document";
import logger from "../logger";

export const getCatchCerts = async (
  { fromDate, documentStatus = DocumentStatuses.Complete, landings, documentNumber, exporter, pln, landingStatuses, landingIds }: IGetCatchCerts) => {

  if (landings && landings.length === 0) return []

  if (landings && pln) return []  // conflicting filters

  const query: any = {
    __t: 'catchCert',
    createdAt: { $type: 9 },
    'exportData.products': { $exists: true },
    $and: [{ status: { $exists: true } }, { status: documentStatus }]
  }

  if (landings) {
    /*
     * filter by catch certificates referencing one of the supplied landings
     */
    const landingsClause = {
      $elemMatch: {
        $or: landings.map(landing => ({
          pln: landing.pln,
          date: landing.dateLanded
        }))
      }
    }
    query['exportData.products.caughtBy'] = landingsClause
  }

  if (landingStatuses) {
    /**
     * filter by catch certificates with landings of specific landing status
     */
    const landingsClause = {
      $elemMatch: {
        $or: landingStatuses.map(_ => ({
          _status: _
        }))
      }
    }

    query['exportData.products.caughtBy'] = landingsClause
  }

  if (landingIds) {
    /**
     * filter by catch certificates with landings of specific landing Ids
     */
    const landingsClause = {
      $in: landingIds
    };

    query['exportData.products.caughtBy.id'] = landingsClause
  }

  /*
   * Filters from the investigation function.
   * Should result in mutually exclusive filters, but will not protect against this here
   */
  if (documentNumber) query.documentNumber = documentNumber

  if (exporter) {
    query['exportData.exporterDetails.exporterCompanyName'] = { '$regex': exporter, $options: 'i' }
  }

  if (pln) query['exportData.products.caughtBy.pln'] = pln


  /*
   * From date filtering used to support go-live feature of only 'seeing'
   * data from after a cut off date as business will not archive pre go-live data
   */
  if (fromDate) query.createdAt = { $gte: fromDate.toDate() }

  logger.info(`[LANDINGS][PERSISTENCE][GET-ALL-CATCH-CERTS][QUERY]${JSON.stringify(query)}`)

  return await DocumentModel
    .find(query, null, { timeout: true, lean: true })
    .sort({ createdAt: -1 })
}

export const getCertificateByDocumentNumberWithNumberOfFailedAttempts = async (documentNumber: string, discriminator: string): Promise<IDocument> => {
  return await DocumentModel.aggregate(getCertificateByDocumentNumberWithNumberOfFailedAttemptsQuery(documentNumber, discriminator)).then(results => results[0]);
}

export const getCertificateByDocumentNumber = async (documentNumber: string): Promise<IDocument> => {
  return await DocumentModel.findOne({ documentNumber: documentNumber }).lean()
}

export const upsertCertificate = async (documentNumber: string, parametersToUpdate: Object) => {
  const certificate: any = await DocumentModel.findOne({
    documentNumber: documentNumber,
    status: { $nin: [DocumentStatuses.Locked, DocumentStatuses.Void] }
  });

  if (!certificate) return null;

  for (const [key, value] of Object.entries(parametersToUpdate))
    certificate[key] = value

  const response: any = await DocumentModel.findOneAndUpdate(
    {
      documentNumber: documentNumber
    },
    certificate,
    { new: true }
  )

  return response;
}