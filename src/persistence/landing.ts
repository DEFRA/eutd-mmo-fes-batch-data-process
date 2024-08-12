const moment = require('moment');
import { isEqual } from "lodash";
import { type ILanding, type ILandingQuery, LandingSources } from "mmo-shared-reference-data";
import { LandingModel } from "../types/landing";
import logger from "../logger";

export const getLandings = async (rssNumber: string, dateLanded: string): Promise<ILanding[]> => {

  const theDay = moment.utc(dateLanded);

  const documents: any = await LandingModel.find({
    rssNumber: rssNumber,
    dateTimeLanded: {
      $gte: theDay.startOf('day').toDate(),
      $lte: theDay.endOf('day').toDate()
    }
  }).lean()

  return documents

}

export const getLandingsMultiple =
  async (landings: ILandingQuery[]): Promise<ILanding[]> => {

  logger.info(`[LANDINGS][GET-MULTIPLE-LANDINGS][LENGTH][${landings.length}]`);

  if (landings.length === 0) return []

  const landingsMultiple:ILanding[] = [];

  for (const landing of landings) {

    const theDay = moment.utc(landing.dateLanded);

    logger.info(`[LANDINGS][GET-MULTIPLE-LANDINGS][LANDING][RSS-NUMBER][${landing.rssNumber}]`);

    const query = {
      rssNumber: landing.rssNumber,
      dateTimeLanded: {
        $gte: theDay.startOf('day').toDate(),
        $lte: theDay.endOf('day').toDate()
      }
    }

    logger.info(`[LANDINGS][GET-MULTIPLE-LANDINGS][QUERY][${JSON.stringify(query)}]`);

    const landings = await LandingModel.find(query).lean();

    logger.info(`[LANDINGS][GET-MULTIPLE-LANDINGS][LANDING-FROM-MONGO][${JSON.stringify(landings)}]`);

    landingsMultiple.push(...landings);
  }

  return landingsMultiple.reduce((acc, landing) =>
    acc.some(l => isEqual(l, landing)) ? acc : [...acc, landing], []);

}

export const getAllLandings = async (): Promise<ILanding[]> =>
  await LandingModel.find({}).lean() // when retrieving all landings how far back should we go, currently we have 103k+ landings excluding ELOGs in this collection?

export const updateLandings = async (landings: ILanding[]) => {

  const isMultipleWithDateOnly = (landings.length > 1) && landings.every(landing =>
    moment.utc(landing.dateTimeLanded).format('HH:mm:ss.SSS ZZ') === '00:00:00.000 +0000')

  for (const [i, landing] of landings.entries()) {

    if (isMultipleWithDateOnly) {

      logger.info(`[LANDINGS][UPDATE-LANDINGS] landings on the same day all at midnight. Adding ${i} milliseconds to create a key`)

      const dateTimeLanded = moment.utc(landing.dateTimeLanded)
      dateTimeLanded.add(i, 'milliseconds')

      landing.dateTimeLanded = dateTimeLanded.toISOString()
    }

    await updateLanding(landing)
      .catch(e => logger.error(`[LANDINGS][UPDATE-LANDINGS][ERROR][${e}]`));
  }

}

export const updateLanding = async (landing: ILanding) => {

  await LandingModel.findOneAndUpdate(
    {
      rssNumber: landing.rssNumber,
      dateTimeLanded: landing.dateTimeLanded
    },
    landing,
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true    // create the dateTimeRetrieved the first time we see this landing
    }
  )
};

export const clearElogs = async (landings: ILanding[]) => {
  const landingDecs = landings.filter((l: ILanding) => l.source === LandingSources.LandingDeclaration);

  await Promise.all(
    landingDecs.map(async (landing) => {
      const searchDate = landing.dateTimeLanded;

      return LandingModel.deleteMany(
        {
          rssNumber: landing.rssNumber,
          dateTimeLanded: {
            $gte: moment(searchDate).startOf('day').toDate(),
            $lte: moment(searchDate).endOf('day').toDate()
          },
          source: LandingSources.ELog
        }
      );
    })
  );
}
