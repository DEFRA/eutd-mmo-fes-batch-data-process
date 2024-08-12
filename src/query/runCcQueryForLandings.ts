const _ = require('lodash');
import moment from "moment";
import { type ILanding, type ICcQueryResult, getLandingsFromCatchCertificate, ccQuery } from "mmo-shared-reference-data";
import { getPlnsForLandings } from "../data/vessel";
import { getCatchCerts } from "../persistence/catchCerts";
import logger from "../logger";
import { getLandingsMultiple } from "../persistence/landing";
import { getSpeciesAliases, getVesselsIdx } from "../data/cache";
import { mapPlnLandingsToRssLandings } from './plnToRss'


export const runCcQueryForLandings = async (landings: ILanding[]): Promise<IterableIterator<ICcQueryResult>> => {
  logger.info(`[RUN-CC-QUERY-FOR-LANDINGS][LANDINGS][LENGTH: ${landings.length}]`);
  const landingsWithPln = getPlnsForLandings(landings);

  if (landingsWithPln.length) {
    const certsToUpdate = await getCatchCerts({landings: landingsWithPln}) || [];
    logger.info(`[RUN-CC-QUERY-FOR-LANDINGS][CERTS][LENGTH: ${certsToUpdate.length}]`);

    if (certsToUpdate.length) {
      const landingsByPln = _.flatten(certsToUpdate.map(cert => getLandingsFromCatchCertificate(cert, true) || []));
      logger.info(`[RUN-CC-QUERY-FOR-LANDINGS][LANDINGS-BY-PLN][LENGTH: ${landingsByPln.length}]`);

      if (landingsByPln.length) {
        const landingsByRss = mapPlnLandingsToRssLandings(landingsByPln);
        logger.info(`[RUN-CC-QUERY-FOR-LANDINGS][GET-LANDINGS-MULTIPLE][FOR][${JSON.stringify(landingsByRss)}]`);
        const multipleLandings:ILanding[] = await getLandingsMultiple(landingsByRss) || [];
        logger.info(`[RUN-CC-QUERY-FOR-LANDINGS][LANDINGS-BY-RSS][LENGTH: ${multipleLandings.length}]`);

        if (multipleLandings.length) {
          logger.info(`[RUN-CC-QUERY-FOR-LANDINGS][CC-QUERY][QUERY-EXECUTED]`);
          return ccQuery(certsToUpdate, multipleLandings, getVesselsIdx(), moment.utc(), getSpeciesAliases);
        }
      }
    }
  }

  logger.info('[RUN-CC-QUERY-FOR-LANDINGS][CC-QUERY][QUERY-NOT-EXECUTED]');
  return [][Symbol.iterator]();
}