import axios, { AxiosResponse, AxiosInstance } from 'axios';
import appConfig from '../config';
import { ILanding, ILandingQuery } from 'mmo-shared-reference-data';
import logger from "../logger";

export const fetchRefereshLandings = async (): Promise<ILandingQuery[]> => {
  try {
    const baseUrl = appConfig.consolidationServicUrl;
    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][LANDINGS-REFRESH]`);
    const client: AxiosInstance = axios.create({ baseURL: baseUrl });
    const response: AxiosResponse = await client.get('/v1/landings/refresh');
    return response.data;
  } catch (e) {
    logger.error(`[RUN-LANDINGS-AND-REPORTING-JOB][LANDINGS-REFRESH][ERROR][${e}]`);
    throw e;
  }
};

export const updateConsolidateLandings = (landings: ILanding[]): void => {
  try {
    logger.info(`[RUN-LANDINGS-AND-REPORTING-JOB][${landings.length}][LANDINGS-UPDATE]`);
    const baseUrl = appConfig.consolidationServicUrl;
    const client: AxiosInstance = axios.create({ baseURL: baseUrl });
    client.post('/v1/jobs/landings', { landings });
  } catch (e) {
    logger.error(`[RUN-LANDINGS-AND-REPORTING-JOB][LANDINGS-UPDATE][ERROR][${e}]`);
  }
}