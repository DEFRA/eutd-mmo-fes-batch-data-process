import { type IConversionFactor } from "mmo-shared-reference-data";
import { getConversionFactors } from '../data/local-file';
import logger from "../logger";

export const loadConversionFactorsFromLocalFile = async (): Promise<IConversionFactor[]> => {
  try {
    const factors: IConversionFactor[] = await getConversionFactors(`${__dirname}/../../data/conversionfactors.csv`) || [];

    logger.info(`[CONVERSION-FACTORS][LOAD-CONVERSION-FACTORS][${factors.length}]`);
    
    return factors;
  } catch (e) {
    logger.error(`[CONVERSION-FACTORS][LOAD-CONVERSION-FACTORS][ERROR][${e}]`);
  }
};