import moment from 'moment';
import mingo from 'mingo';
import type { ILanding, IVessel } from 'mmo-shared-reference-data';
import { getVesselsData, getVesselsIdx } from './cache';
import logger from '../logger';

export const getVesselDetails = (rssNumber: string) => {
  const vessel =  mingo.find(getVesselsData(), { rssNumber: rssNumber }).next() as IVessel;

  if (vessel) {
    logger.info(`[VESSELSERVICE][GETVESSELDETAILS][${rssNumber}][${JSON.stringify(vessel)}]`)
    return { vesselLength :  vessel.vesselLength, cfr : vessel.cfr, adminPort : vessel.adminPort, flag: vessel.flag }
  } else {
    logger.info(`[VESSELSERVICE][GETVESSELDETAILS][${rssNumber}][NOT-FOUND]`)
    return undefined
  }
}

export function getPlnsForLandings(landings: ILanding[]): {rssNumber: string, dateLanded: string, pln: string}[] {
  const matches = new Map();

  landings.forEach(landing => {
    const landedDate = moment.utc(landing.dateTimeLanded);
    const landedDateISO = landedDate.toISOString();

    const qry = new mingo.Query({
      rssNumber: { $eq: landing.rssNumber },
      fishingLicenceValidTo: { "$gte" : landedDateISO.substring(0, landedDateISO.length - 5) },
      fishingLicenceValidFrom: { "$lte" : landedDateISO.substring(0, landedDateISO.length - 5) }
    });

    const res = qry.find(getVesselsData()).next() as IVessel;

    if (res) {
      const match = {
        rssNumber: landing.rssNumber,
        dateLanded: moment.utc(landing.dateTimeLanded).format('YYYY-MM-DD'),
        pln: res.registrationNumber
      };

      matches.set(`${match.rssNumber}-${match.dateLanded}-${match.pln}`, match);
    }
  });

  return Array.from(matches.values());
}

const _vesselLookup = (pln: string, date: string): any => {

  const vesselsIdx = getVesselsIdx()

  const licences: any = vesselsIdx(pln)

  if (!licences) {
    logger.error(`[VESSEL-SERVICE][VESSEL-LOOKUP][NOT-FOUND]${pln}:${date}`)
    return undefined
  }

  for (const licence of licences) {
    if (licence.validFrom <= date && date <= licence.validTo) {
      return {
        rssNumber: licence.rssNumber,
        da: licence.da
      }
    }
  }
}

export const getRssNumber = (pln: string, date: string):string | undefined => {
  const license = _vesselLookup(pln, date);

  if (!license) {
    logger.error(`[VESSEL-SERVICE][RSS-NUMBER][NOT-FOUND]${pln}:${date}`)
  }

  return license ? license.rssNumber : undefined;
}

export const getVesselLength = (pln: string, date: string): number => {
  const vesselRss = getRssNumber(pln, date);

  if (vesselRss) {
     const vesselDetails = getVesselDetails(vesselRss);

     if (vesselDetails && vesselDetails.vesselLength) {
        return vesselDetails.vesselLength;
     }
  }

  return undefined;
}