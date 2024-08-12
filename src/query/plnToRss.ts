import moment from "moment";
import { getRssNumber } from "../data/vessel";
import { shouldIncludeLanding } from "mmo-shared-reference-data";

export function mapPlnLandingsToRssLandings(plnLandings) {
    return plnLandings.map(landing => ({
      rssNumber: getRssNumber(landing.pln, moment(landing.dateLanded).format('YYYY-MM-DD')),
      dateLanded: landing.dateLanded,
      dataEverExpected: landing.dataEverExpected,
      landingDataExpectedDate: landing.landingDataExpectedDate,
      landingDataEndDate: landing.landingDataEndDate,
      createdAt: landing.createdAt,
      isLegallyDue: landing.isLegallyDue
    })).reduceRight((rssLandings, rssLanding) => shouldIncludeLanding(rssLanding) ? [rssLanding, ...rssLandings] : [...rssLandings], [])
  }