import * as blob from './blob-storage';
import * as file from '../data/local-file';
import { 
  type IVesselOfInterest,
  type ISpeciesRiskToggle,
  type IWeighting,
  type IVessel,
  type IConversionFactor,
  type IExporterBehaviour,
  generateIndex,
  WEIGHT
} from 'mmo-shared-reference-data'
import { getVesselsOfInterest, getWeightingRisk, getSpeciesToggle, seedVesselsOfInterest, seedWeightingRisk } from "../persistence/risking";
import { loadConversionFactorsFromLocalFile } from '../persistence/conversionfactors';
import appConfig from '../config';
import logger from '../logger';

let SPECIES: any[] = [];
let VESSELS: IVessel[] = [];
let VESSELS_OF_INTEREST: IVesselOfInterest[] = [];
let VESSELS_IDX = (pln: string) => undefined;
let EXPORTER_BEHAVIOUR: IExporterBehaviour[] = [];
let SPECIES_TOGGLE = false;
let SPECIES_ALIASES: any = {};
let CONVERSION_FACTORS: IConversionFactor[] = [];
let WEIGHTING: IWeighting = {
  exporterWeight: 0,
  vesselWeight: 0,
  speciesWeight: 0,
  threshold: 0
};

export const addVesselNotFound = (vessels: IVessel[] | undefined): IVessel[] => {
  const updatedVessels: IVessel[] = [...vessels];

  if (appConfig.vesselNotFoundEnabled) {
    updatedVessels.push({
      fishingVesselName: appConfig.vesselNotFoundName,
      ircs: '',
      flag: 'GBR',
      homePort: 'N/A',
      registrationNumber: appConfig.vesselNotFoundPln,
      imo: null,
      fishingLicenceNumber: '27619',
      fishingLicenceValidFrom: '2016-07-01T00:01:00',
      fishingLicenceValidTo: '2300-12-31T00:01:00',
      adminPort: 'N/A',
      rssNumber: 'N/A',
      vesselLength: 0,
      cfr: null,
      licenceHolderName: 'licenced holder not found',
      vesselNotFound: true
    });
  }

  return updatedVessels;
};

export const loadLocalFishCountriesAndSpecies = async () => {
  logger.info('Loading data from local files in dev mode');
  const species = await loadSpeciesDataFromLocalFile();
  const speciesAliases = loadSpeciesAliasesFromLocalFile();
  const factors = await loadConversionFactorsFromLocalFile();
  const vesselsOfInterest = await seedVesselsOfInterest();
  const weightingRisk = await seedWeightingRisk();
  const speciesToggle = await getSpeciesToggle();

  logger.info(`Finished reading data from local file system, previously species: ${SPECIES.length}, factors: ${CONVERSION_FACTORS.length}, speciesAliases: ${Object.keys(SPECIES_ALIASES).length}`);
  updateCache(species, factors, speciesAliases);
  logger.info(`Finished loading data into cache from local file system, currently species: ${SPECIES.length}, factors: ${CONVERSION_FACTORS.length}, speciesAliases: ${Object.keys(SPECIES_ALIASES).length}`);

  logger.info(`Start setting the vessels of interest, previously vessels of interest: ${VESSELS_OF_INTEREST.length}`);
  updateVesselsOfInterestCache(vesselsOfInterest);
  logger.info(`Finished saving vessels of interest, currently vessels of interest: ${VESSELS_OF_INTEREST.length}`);

  logger.info(`Start setting the weighting risk, previously exporterWeight: ${WEIGHTING.exporterWeight}, vesselWeight: ${WEIGHTING.vesselWeight}, speciesWeight: ${WEIGHTING.speciesWeight}, threshold: ${WEIGHTING.threshold}`);
  updateWeightingCache(weightingRisk);
  logger.info(`Finish setting the weighting risk, currently exporterWeight: ${WEIGHTING.exporterWeight}, vesselWeight: ${WEIGHTING.vesselWeight}, speciesWeight: ${WEIGHTING.speciesWeight}, threshold: ${WEIGHTING.threshold}`);

  logger.info(`Start setting the species toggle, previously: ${SPECIES_TOGGLE}`);
  updateSpeciesToggleCache(speciesToggle);
  logger.info(`Finish setting the species toggle, currently: ${SPECIES_TOGGLE}`);
};

export const loadProdFishCountriesAndSpecies = async () => {
  logger.info('[LOAD-PROD-CONFIG] Loading data from blob storage in production mode');

  const blobStorageConnStr = appConfig.blobStorageConnection;
  const species = await loadSpeciesData(blobStorageConnStr);
  const speciesAliases = await loadSpeciesAliases(blobStorageConnStr);
  const factors = await loadConversionFactorsData(blobStorageConnStr);
  const vesselsOfInterest = await getVesselsOfInterest();
  const weightingRisk = await getWeightingRisk();
  const speciesToggle = await getSpeciesToggle();

  logger.info(`[LOAD-PROD-CONFIG] Finished reading data, previously species: ${SPECIES.length}, factors: ${CONVERSION_FACTORS.length}, speciesAliases: ${Object.keys(SPECIES_ALIASES).length}`);
  updateCache(species, factors, speciesAliases);
  logger.info(`[LOAD-PROD-CONFIG] Finished loading data into cache, currently species: ${SPECIES.length}, factors: ${CONVERSION_FACTORS.length}, speciesAliases: ${Object.keys(SPECIES_ALIASES).length}`);

  logger.info(`[LOAD-PROD-CONFIG] Finished reading vessels of interest, previously: ${VESSELS_OF_INTEREST.length}`);
  updateVesselsOfInterestCache(vesselsOfInterest);
  logger.info(`[LOAD-PROD-CONFIG] Finished loading vessels of interest, currently: ${VESSELS_OF_INTEREST.length}`);

  logger.info(`[LOAD-PROD-CONFIG] Finished reading weighting risk, previously exporterWeight: ${WEIGHTING.exporterWeight}, vesselWeight: ${WEIGHTING.vesselWeight}, speciesWeight: ${WEIGHTING.speciesWeight}, threshold: ${WEIGHTING.threshold}`);
  updateWeightingCache(weightingRisk);
  logger.info(`[LOAD-PROD-CONFIG] Finished loading weighting, currently exporterWeight: ${WEIGHTING.exporterWeight}, vesselWeight: ${WEIGHTING.vesselWeight}, speciesWeight: ${WEIGHTING.speciesWeight}, threshold: ${WEIGHTING.threshold}`);


  logger.info(`[LOAD-PROD-CONFIG] Finished reading the species toggle, previously: ${SPECIES_TOGGLE}`);
  updateSpeciesToggleCache(speciesToggle);
  logger.info(`[LOAD-PROD-CONFIG] Finished loading the species toggle, currently: ${SPECIES_TOGGLE}`);
};

export const loadVesselsDataFromLocalFile = async (vesselFilePath?: string): Promise<IVessel[] | undefined> => {
  const path = vesselFilePath || `${__dirname}/../../data/vessels.json`;
  try {
    return file.getVesselsDataFromFile(path);
  } catch (e) {
    logger.error(e);
    logger.error(`Cannot load vessels file from local file system, path: ${path}`);
  }
};

export const loadFishCountriesAndSpecies = async () =>
  (appConfig.inDev) ? loadLocalFishCountriesAndSpecies() : loadProdFishCountriesAndSpecies();
  
export const loadVessels = async () => {
  let vessels = undefined;
  if (appConfig.inDev) {
    vessels = await loadVesselsDataFromLocalFile();
  } else {
    const blobStorageConnStr = appConfig.blobStorageConnection;
    vessels = await loadVesselsData(blobStorageConnStr);
  }

  updateVesselsCache(addVesselNotFound(vessels));
};

export const loadSpeciesData = async (blobConnStr: string): Promise<any[] | undefined> => {
  try {
    logger.info('[BLOB-STORAGE-DATA-LOAD][SPECIES]');
    return await blob.getSpeciesData(blobConnStr);
  } catch (e) {
    throw new Error(`[BLOB-STORAGE-LOAD-ERROR][SPECIES] ${e}`)
  }
}

export const loadVesselsData = async (blobConnStr: string): Promise<IVessel[] | undefined> => {
  try {
    logger.info('[BLOB-STORAGE-DATA-LOAD][VESSELS]');
    return await blob.getVesselsData(blobConnStr);
  } catch (e) {
    throw new Error(`[BLOB-STORAGE-LOAD-ERROR][VESSELS] ${e}`)
  }
};

export const updateVesselsCache = (vessels: IVessel[] | undefined) => {
  if (vessels) {
    VESSELS = vessels;
    VESSELS_IDX = generateIndex(vessels);
  }
}

export const loadSpeciesDataFromLocalFile = async (speciesFilePath?: string): Promise<any[] | undefined> => {
  const path = speciesFilePath || `${__dirname}/../../data/commodity_code.txt`;
  try {
    return await file.getSpeciesDataFromFile(path);

  } catch (e) {
    logger.error(e);
    logger.error(`Cannot load species file from local file system, path: ${path}`);
  }
}

export const loadSpeciesAliasesFromLocalFile = (speciesmismatchFilePath?: string) => {
  const path = speciesmismatchFilePath || `${__dirname}/../../data/speciesmismatch.json`;
  try {
    return file.getSpeciesAliasesFromFile(path)
      .map((species) => ({ [species.speciesCode]: species.speciesAlias }))
      .reduce((result, current) => Object.assign(result, current), {});
  } catch (e) {
    logger.error(e);
    logger.error(`Cannot load speciesmismatch file from local file system, path: ${path}`);
    return {};
  }
};


export const loadSpeciesAliases = async (blobConnStr: string): Promise<any> => {
  try {
    logger.info('[BLOB-STORAGE-DATA-LOAD][SPECIES-ALIASES]');
    return await blob.getSpeciesAliases(blobConnStr);
  } catch (e) {
    throw new Error(`[BLOB-STORAGE-LOAD-ERROR][SPECIES-ALIASES] ${e}`)
  }
};

export const loadConversionFactorsData = async (blobConnStr: string): Promise<IConversionFactor[]> => {
  try {
    logger.info('[BLOB-STORAGE-DATA-LOAD][CONVERSION-FACTORS]');
    return await blob.getConversionFactorsData(blobConnStr);
  } catch (e) {
    throw new Error(`[BLOB-STORAGE-LOAD-ERROR][CONVERSION-FACTORS] ${e}`)
  }
};

export const loadLandingReprocessData = async () => {
  const path = `${__dirname}/../../data/reprocess-landings.csv`;
  try {
    const result: string [] = [];
    (await file.getReprocessLandings(path))
      .forEach((d: string) => {
        result.push(d);
      });
    return result;
  } catch (e) {
    logger.error(e);
    logger.error(`Cannot load reprocess landings file from local file system, path: ${path}`);
    return [];
  }
};

export const updateLandingReprocessData = async (data: string[]) => {
  const path = `${__dirname}/../../data/reprocess-landings.csv`;
  try {
    file.updateReprocessLandingsFile(path, data);
  } catch (e) {
    logger.error(e);
    logger.error(`Cannot update reprocess landings file from local file system, path: ${path}`);
  }
};

export const loadExporterBehaviour = async () =>
  EXPORTER_BEHAVIOUR = (appConfig.inDev)
    ? await loadExporterBehaviourFromLocalFile()
    : await loadExporterBehaviourFromAzureBlob(appConfig.blobStorageConnection);

export const loadExporterBehaviourFromLocalFile = async (): Promise<IExporterBehaviour[]> => {
  const path = `${__dirname}/../../data/exporter_behaviour.csv`;
  try {
    return await file.getExporterBehaviourFromCSV(path);
  }
  catch (e) {
    logger.error(e);
    logger.error(`Cannot load exporter behaviour file from local file system, path: ${path}`);
    return [];
  }
};

export const loadExporterBehaviourFromAzureBlob = async (blobConnStr: string): Promise<IExporterBehaviour[]> => {
  try {
    logger.info('[BLOB-STORAGE-DATA-LOAD][EXPORTER-BEHAVIOUR]');
    return await blob.getExporterBehaviourData(blobConnStr);
  }
  catch (e) {
    throw new Error(`[BLOB-STORAGE-LOAD-ERROR][EXPORTER-BEHAVIOUR] ${e}`);
  }
};

export const updateCache = (
  species: any[] | undefined,
  factors: IConversionFactor[] | undefined,
  speciesAliases?: any | undefined
) => {
  if (species) {
    SPECIES = species;
  }

  if (factors) {
    CONVERSION_FACTORS = factors.map(factorData => {
      return {
        species: factorData.species,
        state: factorData.state,
        presentation: factorData.presentation,
        toLiveWeightFactor: isNaN(factorData.toLiveWeightFactor) ? undefined : Number(factorData.toLiveWeightFactor),
        quotaStatus: factorData.quotaStatus,
        riskScore: isNaN(factorData.riskScore) ? undefined : Number(factorData.riskScore)
      }
    });
  }

  if (speciesAliases) {
    SPECIES_ALIASES = speciesAliases;
  }
};

export const updateVesselsOfInterestCache = (vesselsOfInterest: IVesselOfInterest[]) => {
  if (Array.isArray(vesselsOfInterest))
    VESSELS_OF_INTEREST = vesselsOfInterest;
};

export const updateSpeciesToggleCache = (speciesToggle: ISpeciesRiskToggle): void => {
  SPECIES_TOGGLE = speciesToggle.enabled;
};

export const updateWeightingCache = (weighting: IWeighting) => {
  if (weighting)
  WEIGHTING = weighting;
};

export const refreshRiskingData = async () => {
  const vesselsOfInterest = await getVesselsOfInterest();
  const weightingRisk = await getWeightingRisk();
  const speciesToggle = await getSpeciesToggle();
  
  updateVesselsOfInterestCache(vesselsOfInterest);
  updateWeightingCache(weightingRisk);
  updateSpeciesToggleCache(speciesToggle);
};

export const getSpeciesAliases = (speciesCode: string): string[] => SPECIES_ALIASES[speciesCode] ?? [];
export const getConversionFactor: (species: string, state: string, presentation: string) => IConversionFactor | undefined = (species: string, state: string, presentation: string): IConversionFactor | undefined =>
  CONVERSION_FACTORS.find((f: IConversionFactor) => f.species === species && f.state === state && f.presentation === presentation);

export const getToLiveWeightFactor: (species: string, state: string, presentation: string) => number = (species: string, state: string, presentation: string): number => {
  const conversionFactor: IConversionFactor | undefined = getConversionFactor(species, state, presentation);

  if (!conversionFactor?.toLiveWeightFactor) {
    return 1;
  }

  return conversionFactor.toLiveWeightFactor;
};
export const getVesselsIdx: () => (pln: string) => any = () => { return VESSELS_IDX };
export const getVesselsData: () => IVessel[] = () => { return VESSELS };
export const getRiskThreshold = (): number => WEIGHTING['threshold'];
export const getSpeciesRiskToggle = (): boolean => SPECIES_TOGGLE;
export const getVesselRiskScore = (pln: string) => VESSELS_OF_INTEREST.find(v => v && v.registrationNumber === pln) ? 1 : 0.5;
export const getWeighting = (type: WEIGHT): number => WEIGHTING[type];
export const getSpeciesRiskScore = (speciesCode: string) => {
  const speciesData = CONVERSION_FACTORS.find(f => f.species === speciesCode);
  return speciesData && speciesData.riskScore !== undefined ? speciesData.riskScore : 0.5;
};
export const getSpeciesData: () => any[] = () => SPECIES;
export const getExporterRiskScore = (accountId: string, contactId: string) => {

  const defaultScore = 1.0;

  if (!accountId && !contactId) {
    return defaultScore;
  }

  if (EXPORTER_BEHAVIOUR.length) {
    if (!accountId) {
      const individual = EXPORTER_BEHAVIOUR.find(e => e.contactId === contactId && !e.accountId);
      if (individual) {
        return individual.score;
      }
    } else {
      const otherMatches = checkForMatches(accountId, contactId);
      if (otherMatches) {
        return otherMatches
      }
    }
  }

  return defaultScore;
};

function checkForMatches(accountId: string, contactId: string): number | null {
  const exactMatch = EXPORTER_BEHAVIOUR.find(e => e.accountId === accountId && e.contactId === contactId);

  if (exactMatch) {
    return exactMatch.score;
  }

  const contactMatch = EXPORTER_BEHAVIOUR.find(e => e.contactId === contactId && !e.accountId);

  if (contactMatch) {
    return contactMatch.score;
  }

  const accountMatch = EXPORTER_BEHAVIOUR.find(e => e.accountId === accountId && !e.contactId);

  if (accountMatch) {
    return accountMatch.score;
  }
  return null;
}