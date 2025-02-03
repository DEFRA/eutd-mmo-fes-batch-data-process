import * as Cache from '../../src/data/cache';
import * as SUT from '../../src/data/risking';
import * as shared from "mmo-shared-reference-data";

const defaultRiskScore = 0.5;
const defaultWeighting = 1;
const defaultSpeciesRiskToggle = false;

describe('isHighRisk', () => {
  let mockGetThreshold;

  beforeAll(() => {
      mockGetThreshold = jest.spyOn(Cache, 'getRiskThreshold');
      mockGetThreshold.mockReturnValue(1);
  });

  afterAll(() => {
      jest.restoreAllMocks();
  });

  it('should return false if the total risk score falls below the threshold', () => {
      const result = SUT.isHighRisk(0.9);

      expect(result).toBe(false);
  });

  it('should return true if the total risk score is above to the threshold', () => {
      const result = SUT.isHighRisk(1.1);

      expect(result).toBe(true);
  });
});

describe('isHighRisk when threshold is passed as a parameter', () => {
  it('should return false if the total risk score falls below the threshold', () => {
      const result = SUT.isHighRisk(0.9, 1);

      expect(result).toBe(false);
  });

  it('should return true if the total risk score is above to the threshold', () => {
      const result = SUT.isHighRisk(1.1, 1);

      expect(result).toBe(true);
  });
});

describe('getTotalRiskScore', () => {

  const accountId = 'some-account-id';
  const contactId = 'some-contact-id';

  let mockGetVesselRiskScore;
  let mockGetSpeciesRiskScore;
  let mockGetExporterRiskScore;
  let mockGetWeighting;

  beforeAll(() => {
      mockGetVesselRiskScore = jest.spyOn(Cache, 'getVesselRiskScore');
      mockGetSpeciesRiskScore = jest.spyOn(Cache, 'getSpeciesRiskScore');
      mockGetExporterRiskScore = jest.spyOn(Cache, 'getExporterRiskScore');
      mockGetWeighting = jest.spyOn(Cache, 'getWeighting');
  });

  afterAll(() => {
      jest.restoreAllMocks();
  });

  describe('when all risk scores are low', () => {

  it('should return the correct total risk score with a default weighting', () => {
      const pln = 'H1100';
      const speciesCode = 'HER';

      mockGetWeighting.mockReturnValue(defaultWeighting);
      mockGetVesselRiskScore.mockReturnValue(defaultRiskScore);
      mockGetSpeciesRiskScore.mockReturnValue(defaultRiskScore);
      mockGetExporterRiskScore.mockReturnValue(defaultRiskScore);

      const result = SUT.getTotalRiskScore(pln, speciesCode, accountId, contactId);

      expect(result).toBe(0.125);

      expect(mockGetVesselRiskScore).toHaveBeenCalledWith('H1100');
      expect(mockGetSpeciesRiskScore).toHaveBeenCalledWith('HER');
      expect(mockGetExporterRiskScore).toHaveBeenCalledWith(accountId, contactId);

      expect(mockGetWeighting).toHaveBeenNthCalledWith(1, shared.WEIGHT.VESSEL);
      expect(mockGetWeighting).toHaveBeenNthCalledWith(2, shared.WEIGHT.SPECIES);
      expect(mockGetWeighting).toHaveBeenNthCalledWith(3, shared.WEIGHT.EXPORTER);
  });

  it('should return the correct total risk score', () => {
      const pln = 'H1100';
      const speciesCode = 'HER';
      const weighting = 0.5;

      mockGetWeighting.mockReturnValue(weighting);
      mockGetVesselRiskScore.mockReturnValue(defaultRiskScore);
      mockGetSpeciesRiskScore.mockReturnValue(defaultRiskScore);
      mockGetExporterRiskScore.mockReturnValue(defaultRiskScore);

      const result = SUT.getTotalRiskScore(pln, speciesCode, accountId, contactId);

      expect(result).toBe(0.015625);

      expect(mockGetVesselRiskScore).toHaveBeenCalledWith('H1100');
      expect(mockGetSpeciesRiskScore).toHaveBeenCalledWith('HER');
      expect(mockGetExporterRiskScore).toHaveBeenCalledWith(accountId, contactId);

      expect(mockGetWeighting).toHaveBeenNthCalledWith(1, shared.WEIGHT.VESSEL);
      expect(mockGetWeighting).toHaveBeenNthCalledWith(2, shared.WEIGHT.SPECIES);
      expect(mockGetWeighting).toHaveBeenNthCalledWith(3, shared.WEIGHT.EXPORTER);
    });

  });

    describe('when all risk scores are high', () => {

      const highRiskScore = 1.0;

      it('should return the correct total risk score with a default weighting', () => {
          const pln = 'H1100';
          const speciesCode = 'HER';

          mockGetWeighting.mockReturnValue(defaultWeighting);
          mockGetVesselRiskScore.mockReturnValue(highRiskScore);
          mockGetSpeciesRiskScore.mockReturnValue(highRiskScore);
          mockGetExporterRiskScore.mockReturnValue(highRiskScore);

          const result = SUT.getTotalRiskScore(pln, speciesCode, accountId, contactId);

          expect(result).toBe(1.0);

          expect(mockGetVesselRiskScore).toHaveBeenCalledWith('H1100');
          expect(mockGetSpeciesRiskScore).toHaveBeenCalledWith('HER');
          expect(mockGetExporterRiskScore).toHaveBeenCalledWith(accountId, contactId);

          expect(mockGetWeighting).toHaveBeenNthCalledWith(1, shared.WEIGHT.VESSEL);
          expect(mockGetWeighting).toHaveBeenNthCalledWith(2, shared.WEIGHT.SPECIES);
          expect(mockGetWeighting).toHaveBeenNthCalledWith(3, shared.WEIGHT.EXPORTER);
      });

    it('should return the correct total risk score', () => {
        const pln = 'H1100';
        const speciesCode = 'HER';
        const weighting = 0.5;

        mockGetWeighting.mockReturnValue(weighting);
        mockGetVesselRiskScore.mockReturnValue(highRiskScore);
        mockGetSpeciesRiskScore.mockReturnValue(highRiskScore);
        mockGetExporterRiskScore.mockReturnValue(highRiskScore);

        const result = SUT.getTotalRiskScore(pln, speciesCode, accountId, contactId);

        expect(result).toBe(0.125);

        expect(mockGetVesselRiskScore).toHaveBeenCalledWith('H1100');
        expect(mockGetSpeciesRiskScore).toHaveBeenCalledWith('HER');
        expect(mockGetExporterRiskScore).toHaveBeenCalledWith(accountId, contactId);

        expect(mockGetWeighting).toHaveBeenNthCalledWith(1, shared.WEIGHT.VESSEL);
        expect(mockGetWeighting).toHaveBeenNthCalledWith(2, shared.WEIGHT.SPECIES);
        expect(mockGetWeighting).toHaveBeenNthCalledWith(3, shared.WEIGHT.EXPORTER);
    });
    });
});

describe('calcRiskScore', () => {

    it('should return the correct product of two numbers', () => {
        expect(SUT.calcRiskScore(0.5, 0.5)).toBe(0.25);
        expect(SUT.calcRiskScore(0.5, 1)).toBe(0.5);
        expect(SUT.calcRiskScore(1, 1)).toBe(1);
    });
  
  });
  
  describe('isRiskEnabled', () => {
  
    let mockGetSpeciesRiskToggle;
  
    beforeEach(() => {
      mockGetSpeciesRiskToggle = jest.spyOn(Cache, 'getSpeciesRiskToggle');
    });
  
    afterEach(() => {
      mockGetSpeciesRiskToggle.mockRestore();
    });
  
    it('should return false', () => {
      mockGetSpeciesRiskToggle.mockReturnValue(defaultSpeciesRiskToggle);
    });
  
    it('should return true', () => {
      mockGetSpeciesRiskToggle.mockReturnValue(true);
      expect(SUT.isRiskEnabled()).toBeTruthy();
    });
  
  });
  
