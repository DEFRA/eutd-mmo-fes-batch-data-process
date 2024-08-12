import csv from 'csvtojson';
import fs from 'fs';
import type { IConversionFactor, IExporterBehaviour, IVessel, IVesselOfInterest, IWeighting } from "mmo-shared-reference-data";
import logger from '../logger';

export const getConversionFactors = async (conversionFactorsFilePath: string): Promise<IConversionFactor[]> => {
  try {
    return await csv().fromFile(conversionFactorsFilePath);
  } catch(e) {
    logger.error('Could not load conversion factors data from file', conversionFactorsFilePath);
    throw new Error(e);
  }
};

export const getExporterBehaviourFromCSV = async (exporterBehaviourFilePath: string): Promise<IExporterBehaviour[]> => {
  try {
    return await csv({
        colParser:{
          "accountId": "string",
          "contactId": "string",
          "name": "string",
          "score": "number",
        },
        delimiter: ',',
        ignoreEmpty: true
      })
      .fromFile(exporterBehaviourFilePath);
  }
  catch(e) {
    logger.error('Could not load exporter behaviour data from file', exporterBehaviourFilePath);
    throw new Error(e);
  }
};

export const getSpeciesDataFromFile = async (speciesFilePath: string): Promise<any[]> => {
  try {
    return await csv({ delimiter: '\t' }).fromFile(speciesFilePath);

  } catch(e) {
    logger.error('Could not load species data from file', speciesFilePath);
    throw new Error(e);
  }
};

export const getSpeciesAliasesFromFile = (speciesmismatchPath: string): any[] => {
  try {
    return JSON.parse(fs.readFileSync(speciesmismatchPath, 'utf-8'));
  } catch (e) {
    logger.error('Could not load species aliases data from file', speciesmismatchPath);
    throw new Error(e);
  }
};

export const getVesselsDataFromFile = (vesselsFilePath: string): IVessel[] => {
  try {
    return JSON.parse(fs.readFileSync(vesselsFilePath, 'utf-8'));
  } catch(e) {
    logger.error('Could not load vessels data from file', vesselsFilePath);
    throw new Error(e);
  }
};

export const getVesselsOfInterestFromFile = async (vesselsOfInterestFilePath: string): Promise<IVesselOfInterest[]> => {
  try {
    return await csv().fromFile(vesselsOfInterestFilePath);
  } catch(e) {
    logger.error('Could not load vessels of interest data from file', vesselsOfInterestFilePath);
    throw new Error(e);
  }
};

export const getWeightingRiskFromFile = async (weightingRiskFilePath: string): Promise<IWeighting[]> => {
  try {
    return await csv({
      colParser:{
      "vesselWeight":   "Number",
      "speciesWeight":  "Number",
      "exporterWeight": "Number",
      "threshold":      "Number"
      },
      delimiter: ','
    }).fromFile(weightingRiskFilePath);
  } catch(e) {
    logger.error('Could not load weighting risk data from file', weightingRiskFilePath);
    throw new Error(e);
  }
};

export const getReprocessLandings = async (reprocessLandingsPath: string): Promise<string[]> => {
  try {
    const data =  await csv({
      noheader:true
  }).fromFile(reprocessLandingsPath);
    return data.map(d => d.field1);
  } catch (e) {
    logger.error('Could not load reprocess landings data', reprocessLandingsPath);
    throw new Error(e);
  }
};

export const updateReprocessLandingsFile = (reprocessLandingsPath: string, data: string[]) => {
  try {
    fs.writeFileSync(reprocessLandingsPath, data.join('\n'));
  } catch (e) {
    logger.error('Could not update reprocess landings data', reprocessLandingsPath);
    throw new Error(e);
  }
};
