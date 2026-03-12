import { Server } from '@hapi/hapi';
import Joi from 'joi';
import { runLandingsAndReportingJob, runCatchSubmissionStats } from '../controllers/jobs';
import { defaultClient } from 'applicationinsights';
import logger from '../logger';
import { loadExporterBehaviour, loadFishCountriesAndSpecies } from '../data/cache';

export const jobsRoutes = (server: Server) => {

	server.route([
		{
			method: 'POST',
			path: '/v1/jobs/landings',
			options: {
				auth: false,
				description: 'Retrieve new landings and produce reports'
			},
			handler: async (_req, h) => {
				logger.info('[SCHEDULED-JOBS][LANDINGS-AND-REPORTING][START]');

				runLandingsAndReportingJob()
					.then(() => {
						logger.info('[SCHEDULED-JOBS][LANDINGS-AND-REPORTING][SUCCESS]');
					})
					.catch(e => {
						logger.error(`[SCHEDULED-JOBS][LANDINGS-AND-REPORTING][ERROR][${e}]`);

						if (defaultClient) {
							defaultClient.trackEvent({ name: '[SCHEDULED-JOBS][LANDINGS-AND-REPORTING][ERROR]', properties: { error: `${e.stack || e}` } });
						}
					});

				return h.response('ok');
			}
		},
		{
			method: 'POST',
			path: '/v1/jobs/purge',
			options: {
				auth: false,
				description: 'To reload fish countries and species into cache',
			},
			handler: async (_req, h) => {
				try {
					logger.info('[LOAD-FISH-COUNTRIES-SPECIES][POST][START]');
					await loadFishCountriesAndSpecies();
					await loadExporterBehaviour();
					logger.info('[LOAD-FISH-COUNTRIES-SPECIES][POST][SUCCESS]');
					return h.response().code(200);
				} catch (e) {
					logger.error({ err: e }, `[LOAD-FISH-COUNTRIES-SPECIES][POST][ERROR] ${e}`);
					return h.response().code(500);
				}
			},
		},
		{
			method: 'GET',
			path: '/v1/jobs/eu-submission-report',
			options: {
				auth: false,
				description: 'Retrieve catch submission stats for a document type and date range',
				validate: {
					query: Joi.object({
						documentType: Joi.string()
							.valid('catchCert', 'processingStatement', 'storageDocument')
							.required(),
						dateFrom: Joi.string()
							.isoDate()
							.required(),
						dateTo: Joi.string()
							.isoDate()
							.required()
							.custom((value, helpers) => {
								const { dateFrom } = helpers.state.ancestors[0];
								if (dateFrom && value < dateFrom) {
									return helpers.error('date.range');
								}
								return value;
							})
							.messages({ 'date.range': 'dateTo must be greater than or equal to dateFrom' }),
					}),
					failAction: async (_req, _h, err) => {
						throw err;
					},
				},
			},
			handler: async (req, h) => {
				const { documentType, dateFrom, dateTo } = req.query as { documentType: string; dateFrom: string; dateTo: string };
				logger.info(`[EU-SUBMISSION-REPORT][GET][START] documentType=${documentType} dateFrom=${dateFrom} dateTo=${dateTo}`);
				try {
					const result = await runCatchSubmissionStats(documentType, dateFrom, dateTo);
					logger.info('[EU-SUBMISSION-REPORT][GET][SUCCESS]');
					return h.response(result).code(200);
				} catch (e) {
					logger.error({ err: e }, `[EU-SUBMISSION-REPORT][GET][ERROR] ${e}`);
					return h.response().code(500);
				}
			},
		},
	]);

};