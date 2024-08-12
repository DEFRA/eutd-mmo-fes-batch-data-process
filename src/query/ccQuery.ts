
import moment from "moment";
import { getSpeciesAliases, getVesselsIdx } from "../data/cache";
import {
  type ICcQueryResult,
  ifilter,
  mapCatchCerts,
  LandingStatus,
  ccQuery,
  IDocument,
  ILandingQuery,
  vesselLookup,
  unwindCatchCerts
} from "mmo-shared-reference-data";

export const isInWithinRetrospectiveWindow: (queryTime: moment.Moment, item: ICcQueryResult) => boolean = (queryTime: moment.Moment, item: ICcQueryResult) => {
  const durationSinceCertCreation = moment.duration(queryTime.diff(item.createdAt)).toISOString();

  if (!item.extended.landingDataExpectedDate) {
    return moment.duration(durationSinceCertCreation) <= moment.duration(14, 'days');
  }

  if (queryTime.isBefore(moment.utc(item.extended.landingDataExpectedDate), 'day')) {
    return false;
  }

  return item.extended.landingDataEndDate === undefined ?
    moment.duration(durationSinceCertCreation) <= moment.duration(14, 'days') :
    queryTime.isSameOrBefore(moment.utc(item.extended.landingDataEndDate).add(1, 'day'), 'day')
}

export const retrospectiveValidationRequired = (queryTime: moment.Moment, item: ICcQueryResult) =>
  isInWithinRetrospectiveWindow(queryTime, item) && (item.extended.landingStatus === LandingStatus.Pending || item.extended.landingStatus === undefined) && typeof item.rssNumber !== 'undefined'

export const missingLandingRefreshQuery = (catchCerts: IDocument[], queryTime: moment.Moment): ILandingQuery[] => 
  Array.from(ifilter(
    mapCatchCerts(unwindCatchCerts(catchCerts), vesselLookup(getVesselsIdx())), (c: ICcQueryResult) => retrospectiveValidationRequired(queryTime, c)
  ))
  .map(_ => ({ rssNumber: _.rssNumber, dateLanded: _.dateLanded }))
  .reduce((l: ILandingQuery[], cur: ILandingQuery) => l.some((landing: ILandingQuery) => landing.dateLanded === cur.dateLanded && landing.rssNumber === cur.rssNumber) ? l : [...l, cur], [])

export const exceedingLimitLandingQuery = (
  catchCerts: IDocument[],
  queryTime: moment.Moment): ICcQueryResult[] =>
    Array.from(ifilter(ccQuery(catchCerts, [], getVesselsIdx(), queryTime, getSpeciesAliases), (item: ICcQueryResult) => (item.isExceeding14DayLimit)))