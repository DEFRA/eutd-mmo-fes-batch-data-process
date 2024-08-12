import { Server } from '@hapi/hapi';
import { runLandingsAndReportingJob } from '../controllers/jobs';
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
	]);

};