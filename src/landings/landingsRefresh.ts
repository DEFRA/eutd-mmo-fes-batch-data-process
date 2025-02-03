const _ = require('lodash');
import moment from 'moment'
import { getVesselDetails } from "../data/vessel";
import { clearElogs, getLandings, updateLandings } from "../persistence/landing";
import { updateExtendedValidationData } from '../persistence/extendedValidationDataService';
import { ILanding, BoomiService, catchRecordingToLandings, cefasToLandings, eLogToLandings, ILandingQuery } from "mmo-shared-reference-data"
import { getToLiveWeightFactor } from '../data/cache';

import logger from '../logger';

export const fetchAndProcessNewLandings = async (missingLandings: ILandingQuery[]): Promise<ILanding[]> => {
  let newLandings = [];

  for (const landing of missingLandings) {
    try {
      logger.info(`[LANDINGS][LANDING-UPDATER][CHECK-FOR-NEW-LANDINGS][FETCH-LANDINGS] for ${landing.rssNumber}-${landing.dateLanded}`)

      const landings: ILanding[] = await fetchLandings(landing.rssNumber, landing.dateLanded);

      if (landings) {
        newLandings = newLandings.concat(landings);
      }
      else {
        logger.info(`[LANDINGS][LANDING-UPDATER][CHECK-FOR-NEW-LANDINGS][FETCH-LANDINGS] FAILED for ${landing.rssNumber}-${landing.dateLanded}`)
      }

    } catch (e) {
      logger.error(`[LANDINGS][LANDING-UPDATER][CHECK-FOR-NEW-LANDINGS][FETCH-LANDINGS] ERROR for ${landing.rssNumber}-${landing.dateLanded}: ${e}`)
    }
  }

  return newLandings;
}

export const fetchLandings = async (rssNumber: string, dateLanded: string): Promise<ILanding[]> => {
  logger.info(`[LANDINGS][FETCH-LANDING][${rssNumber}-${dateLanded}][GET-VESSEL-DETAILS]`);
  const vesselDetails = getVesselDetails(rssNumber);

  if (vesselDetails && vesselDetails.vesselLength !== undefined) {
    logger.info(`[LANDINGS][FETCH-LANDING][${rssNumber}-${dateLanded}][VESSELLENGTH:${vesselDetails.vesselLength}]`)

    let landings : ILanding[] = [];

    if (vesselDetails.vesselLength >= 10) {
      landings = await _fetchLandingsVesselsOver10Meters(rssNumber, dateLanded);
    }
    else {
      landings = await _fetchLandingsVesselsUnder10Meters(rssNumber, dateLanded);
    }

    logger.info(`[LANDINGS][FETCH-LANDING][${rssNumber}-${dateLanded}][LANDINGS-FETCHED: ${landings.length}]`);

    if (landings.length) {
      landings = await _ignoreUnchangedLandings(rssNumber, dateLanded, landings);
      logger.info(`[LANDINGS][FETCH-LANDING][${rssNumber}-${dateLanded}][FILTERED-LANDINGS: ${landings.length}]`);

      await updateLandings(landings);
      logger.info(`[LANDINGS][FETCH-LANDING][${rssNumber}-${dateLanded}][LANDINGS-UPDATE]`);

      await clearElogs(landings)
        .catch(e => logger.error(`[LANDINGS][FETCH-LANDING][${rssNumber}-${dateLanded}][ELOGS-CLEAR-ERROR][${e}]`));

      logger.info(`[LANDINGS][FETCH-LANDING][${rssNumber}-${dateLanded}][ELOGS-CLEARED]`);
    }

    return landings.filter(landing => moment(dateLanded).isSame(moment(landing.dateTimeLanded), 'day'))
  }

  return [];
}

export const _fetchLandingsVesselsOver10Meters = async (rssNumber: string, dateLanded: string): Promise<ILanding[]> => {
  try {

    /*
     * due to overlap of summertime to UTC, there will be an array of payloads from CEFAS
     * with zero, one or two values
     */

    let landings: any[] = await BoomiService.getLandingData(dateLanded, rssNumber, 'landing');
    let domainLandings = _.flatten((landings.map(landing => cefasToLandings(landing, getToLiveWeightFactor))));

    logger.info(`[LANDINGS][FETCH-LANDING-OVER10][${rssNumber}-${dateLanded}][${domainLandings.length}-LANDING-DECS-RETRIEVED]`);

    /*
     * always check for eLogs if we do not found a landing declaration
     */

    if (domainLandings.length === 0) {
      landings = await BoomiService.getLandingData(dateLanded, rssNumber, 'eLogs');
      domainLandings = _.flatten(landings.map(eLog => eLogToLandings(eLog)));

      logger.info(`[LANDINGS][FETCH-LANDING-OVER10][${rssNumber}-${dateLanded}][${domainLandings.length}-ELOGS-RETRIEVED]`);
    }

    BoomiService.getLandingData(dateLanded, rssNumber, 'salesNotes')
      .then( (salesNotes: any[]) => {
        _saveSalesNoteData(salesNotes, 'OVER10', rssNumber, dateLanded)
      })
      .catch(e => {
        logger.error(`[LANDINGS][FETCH-SALES-NOTES-OVER10][ERROR][${rssNumber}-${dateLanded}][${e.stack || e}]`)
      });

    _saveRawLandingData(landings, 'OVER10', rssNumber, dateLanded);

    return domainLandings;
  }
  catch (e) {
    logger.error(`[LANDINGS][FETCH-LANDING-OVER10][ERROR][${rssNumber}-${dateLanded}][${e.stack || e}]`);
    return [];
  }
}

export const _fetchLandingsVesselsUnder10Meters = async (rssNumber: string, dateLanded: string): Promise<ILanding[]> => {
  try {
    const landings: any = await BoomiService.getCatchActivity(dateLanded, rssNumber);

    BoomiService.getLandingData(dateLanded, rssNumber, 'salesNotes')
      .then( (salesNotes: any[]) => {
        _saveSalesNoteData(salesNotes, 'UNDER10', rssNumber, dateLanded)
      })
      .catch(e => {
        logger.error(`[LANDINGS][FETCH-SALES-NOTES-UNDER10][ERROR][${rssNumber}-${dateLanded}][${e.stack || e}]`)
      });

    if (landings === null) {
      logger.info(`[LANDINGS][FETCH-LANDING-UNDER10][NO-DATA][${rssNumber}-${dateLanded}]`)
      return [];
    }

    _saveRawLandingData(landings, 'UNDER10', rssNumber, dateLanded);

    const domainLandings: ILanding[] = catchRecordingToLandings(landings, rssNumber, getToLiveWeightFactor);

    logger.info(`[LANDINGS][FETCH-LANDING-UNDER10][${rssNumber}-${dateLanded}][${domainLandings.length}-LANDINGS-RETRIEVED]`)

    return domainLandings
  }
  catch (e) {
    logger.error(`[LANDINGS][FETCH-LANDING-UNDER10][ERROR][${rssNumber}-${dateLanded}][${e.stack || e}]`);
    return [];
  }
}

export const _saveRawLandingData = async (landings, typeOfTransaction, rssNumber, dateLanded): Promise<void> => {
  if (!_.isEmpty(landings)) {
    logger.info(`[LANDINGS][FETCH-LANDING-${typeOfTransaction}][RETRIEVED][${rssNumber}-${dateLanded}]`);
    await updateExtendedValidationData({rssNumber, dateLanded, data: landings}, 'rawLandings');
  }
  else {
    logger.info(`[LANDINGS][FETCH-LANDING-${typeOfTransaction}][NO-DATA][${rssNumber}-${dateLanded}]`);
  }
}

export const _saveSalesNoteData = async (salesNotes, typeOfTransaction, rssNumber, dateLanded): Promise<void> => {
  if (!_.isEmpty(salesNotes)) {
    logger.info(`[LANDINGS][FETCH-SALESNOTES-${typeOfTransaction}][RETRIEVED][${rssNumber}-${dateLanded}]`);
    await updateExtendedValidationData({rssNumber, dateLanded, data: salesNotes}, 'salesNotes');
  }
  else {
    logger.info(`[LANDINGS][FETCH-SALESNOTES-${typeOfTransaction}][NO-DATA][${rssNumber}-${dateLanded}]`);
  }
}

export const _ignoreUnchangedLandings = async (rssNumber: string, dateLanded: string, landings: ILanding[]): Promise<ILanding[]> => {
    logger.info(`[IGNORE-UNCHANGED-LANDINGS][${rssNumber}-${dateLanded}][LANDINGS: ${landings.length}]`);
    const systemLandings = await getLandings(rssNumber, dateLanded);
    logger.info(`[IGNORE-UNCHANGED-LANDINGS][${rssNumber}-${dateLanded}][FETCHED-SYSTEM-LANDINGS: ${systemLandings.length}]`);

    if (systemLandings.length) {
      return landings.reduce((acc, landing) => {
        const hasLanding = systemLandings.some(systemLanding => (
          moment(systemLanding.dateTimeLanded).isSame(moment(landing.dateTimeLanded),'day') &&
            systemLanding.source === landing.source &&
            systemLanding.items.length === landing.items.length &&
            systemLanding.items.every(item => (
              landing.items.find(_ => (
                item.species === _.species &&
                item.weight === _.weight &&
                item.factor === _.factor &&
                item.state === _.state &&
                item.presentation === _.presentation
                )) !== undefined
            ))
        ));

        logger.info(`[IGNORE-UNCHANGED-LANDINGS][${rssNumber}-${dateLanded}][HAS-LANDING][${hasLanding}]`);
        return hasLanding ? [{...landing, _ignore: true}, ...acc] : [landing, ...acc];
      }, []);
    } else {
      return landings;
    }
}