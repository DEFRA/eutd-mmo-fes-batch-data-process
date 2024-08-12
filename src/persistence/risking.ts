import { 
  type IVesselOfInterest,
  type ISpeciesRiskToggle,
  type IWeighting,
} from 'mmo-shared-reference-data';
import {  
  VesselOfInterestModel,
  WeightingModel,
  SpeciesRiskToggleModel
} from "../types/risking";
import { getVesselsOfInterestFromFile, getWeightingRiskFromFile } from '../data/local-file';
import logger from '../logger';

export const getVesselsOfInterest = async (): Promise<IVesselOfInterest[]> => {
  const vesselsOfInterest = await VesselOfInterestModel.find({})
    .select([ '-_id', '-__v', '-__t'])  // not excluding the __t when querying so we have to use map, to get the atts that we need. this is temporary.
    .lean();

    return vesselsOfInterest.map(voi => ({
        registrationNumber: voi.registrationNumber,
        fishingVesselName: voi.fishingVesselName,
        homePort: voi.homePort,
        da: voi.da
    }))

}

export const getWeightingRisk = async (): Promise<IWeighting> => {
  const weighting = await WeightingModel.findOne({})
    .select(['-_id', '-__v', '-__t'])
    .lean();

    if (!weighting) return null

    return {
      vesselWeight: weighting.vesselWeight, 
      speciesWeight: weighting.speciesWeight,
      exporterWeight: weighting.exporterWeight,
      threshold: weighting.threshold,
    }
}

export const getSpeciesToggle = async (): Promise<ISpeciesRiskToggle> =>
  await SpeciesRiskToggleModel.findOne({})
    .select(['-_id', '-__v', '-__t'])
    .lean();

export const seedVesselsOfInterest = async () => {
  try {
    const vesselsOfInterest = await getVesselsOfInterestFromFile(`${__dirname}/../../data/vesselsOfInterest.csv`);

    logger.info(`[RISKING-SAVE-VESSELS-OF-INTEREST][${JSON.stringify(vesselsOfInterest)}`);

    await VesselOfInterestModel.deleteMany({});
    await VesselOfInterestModel.insertMany([...vesselsOfInterest]);

    return vesselsOfInterest;
  } catch (e) {
    logger.error(`[RISKING-SAVE-VESSELS-OF-INTEREST][ERROR][LOADING LOCAL MODE][${e}]`);
  }
};

export const seedWeightingRisk = async (): Promise<IWeighting> => {
  try {
    const weighting = await getWeightingRiskFromFile(`${__dirname}/../../data/weightingRisk.csv`)
      .then(result => result[0]);

    logger.info(`[RISKING-WEIGHTING][${JSON.stringify(weighting)}`);

    await WeightingModel.deleteMany({});
    await WeightingModel.create(weighting);

    return weighting;
  }
  catch (e) {
    logger.error(`[RISKING-WEIGHTING][ERROR][LOADING LOCAL MODE][${e}]`);
  }
};