import logger from '../../src/logger';
import * as file from "../../src/data/local-file";
import{ loadConversionFactorsFromLocalFile } from '../../src/persistence/conversionfactors';

describe('Load conversion factors', () => {
    let mockGetConversionFactors, mockLoggerInfo, mockLoggerError: jest.SpyInstance; 

    const factorsJson = [{ species: 'COD', factor: 1 }, { species: 'HER', factor: 2 }];

    beforeEach(() => {
        mockGetConversionFactors = jest.spyOn(file, 'getConversionFactors');
        mockGetConversionFactors.mockResolvedValue(factorsJson);

        mockLoggerInfo = jest.spyOn(logger, 'info');
        mockLoggerError = jest.spyOn(logger, 'error');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should call insert many with the right params', async () => {
        await loadConversionFactorsFromLocalFile();

        expect(mockLoggerInfo).toHaveBeenCalledWith('[CONVERSION-FACTORS][LOAD-CONVERSION-FACTORS][2]');
        expect(mockGetConversionFactors).toHaveBeenCalledTimes(1);
    });

    it('should return the factors loaded from file', async () => {
        const factors = await loadConversionFactorsFromLocalFile();

        expect(factors).toBe(factorsJson);
    });

    it('should return no factors if none provided', async () => {
      mockGetConversionFactors.mockResolvedValue(undefined);

      const factors = await loadConversionFactorsFromLocalFile();

      expect(mockLoggerInfo).toHaveBeenCalledWith('[CONVERSION-FACTORS][LOAD-CONVERSION-FACTORS][0]');
      expect(factors).toStrictEqual([]);
  });

  it('will log an error message', async () => {
    mockGetConversionFactors.mockRejectedValue(new Error('something went wrong'));

    const factors = await loadConversionFactorsFromLocalFile();

    expect(mockLoggerError).toHaveBeenCalledWith('[CONVERSION-FACTORS][LOAD-CONVERSION-FACTORS][ERROR][Error: something went wrong]');
    expect(factors).toBeUndefined();
});
});