import mingo from 'mingo';
import { ICommodityCodeExtended } from "../types/species";
import { getSpeciesData } from "./cache";

export const commoditySearch = (
  code: string,
  state: string,
  presentation: string
): ICommodityCodeExtended[] => {
  const allCommodityCodes: ICommodityCodeExtended[] = [];
  const species = getSpeciesData();
  const cursor = mingo.find(
    species,
    {
      faoCode: code,
      preservationState: state,
      presentationState: presentation,
    },
    {
      faoName: 1,
      scientificName: 1,
      preservationDescr: 1,
      presentationDescr: 1,
      commodityCode: 1,
      commodityCodeDescr: 1
    }
  );

  while (cursor.hasNext()) {
    const item: any = cursor.next();

    allCommodityCodes.push({
      code: item.commodityCode,
      description: item.commodityCodeDescr,
      faoName: item.faoName,
      stateLabel: item.preservationDescr,
      presentationLabel: item.presentationDescr,
    } as ICommodityCodeExtended);
  }


  return allCommodityCodes;
};

export const isSpeciesFailure = (func: (riskScore: number) => boolean) => (
  enabled: boolean,
  isSpeciesExists: boolean,
  riskScore: number
): boolean => {
  if (isSpeciesExists) {
    return false;
  }

  if (enabled) {
    return func(riskScore);
  }

  return true;
}