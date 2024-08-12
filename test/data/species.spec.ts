import * as cache from "../../src/data/cache";
import * as SUT from "../../src/data/species";

const speciesData: any[] = [{
  commodityCode: '03023190',
  commodityCodeDescr: `Fresh or chilled albacore or longfinned tunas 'Thunnus alalunga' (excl. for industrial processing or preservation)`,
  faoCode: 'ALB',
  faoName: 'Albacore',
  presentationDescr: 'gutted and headed',
  presentationState: 'GUH',
  preservationDescr: 'fresh',
  preservationState: 'FRE',
  scientificName: 'Thunnus alalunga'
}];

describe('when searching for commodity code', () => {

  let mockGetSpeciesData;

  beforeEach(() => {
    mockGetSpeciesData = jest.spyOn(cache, 'getSpeciesData');
    mockGetSpeciesData.mockReturnValue(speciesData);
  });

  afterEach(() => {
    mockGetSpeciesData.mockRestore();
  })

  it('will return all found commodity codes', () => {
    expect(SUT.commoditySearch('ALB', 'FRE', 'GUH')).toHaveLength(1);
  })
});