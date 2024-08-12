import fs from 'fs';
import { IVessel } from "mmo-shared-reference-data";
import {
  getConversionFactors,
  getVesselsOfInterestFromFile,
  getWeightingRiskFromFile,
  getExporterBehaviourFromCSV,
  getSpeciesAliasesFromFile,
  getVesselsDataFromFile,
  getReprocessLandings,
  updateReprocessLandingsFile,
  getSpeciesDataFromFile
} from "../../src/data/local-file";
import logger from "../../src/logger";

describe('get conversion factors ', () => {

  let mockLoggerError;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    const filePath = 'pathToNonExistingFile';

    try {
      await getConversionFactors(filePath)
    }
    catch (e) {
      expect(e.message).toContain('File does not exist');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load conversion factors data from file', filePath);
    }
  });

  it('should return an array conversion factor object', async () => {
    const filePath = `${__dirname}/../../data/conversionfactors.csv`;

    const result = await getConversionFactors(filePath);
    expect(result).toBeInstanceOf(Array);
    expect(result[0]).toMatchObject({
      species: expect.any(String),
      state: expect.any(String),
      presentation: expect.any(String),
      toLiveWeightFactor: expect.any(String),
      quotaStatus: expect.any(String),
      riskScore: expect.any(String)
    });
  });

});

describe('get exporter behaviour csv', () => {

  let mockLoggerInfo;
  let mockLoggerError;

  beforeEach(() => {
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    const filePath = 'pathToNonExistingFile';

    try {
      await getExporterBehaviourFromCSV(filePath)
    }
    catch (e) {
      expect(e.message).toContain('File does not exist');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load exporter behaviour data from file', filePath);
    }
  });

  it('should return an array of exporter behaviour objects', async () => {
    const filePath = `${__dirname}/../../data/exporter_behaviour.csv`;

    const result = await getExporterBehaviourFromCSV(filePath);

    expect(result).toBeInstanceOf(Array);

    try {
      expect(result[0]).toMatchObject({
        accountId: expect.any(String),
        contactId: expect.any(String),
        name: expect.any(String),
        score: expect.any(Number)
      });
    } catch {
      try {
        expect(result[0]).toMatchObject({
          contactId: expect.any(String),
          name: expect.any(String),
          score: expect.any(Number)
        });
      } catch {
        expect(result[0]).toMatchObject({
          accountId: expect.any(String),
          name: expect.any(String),
          score: expect.any(Number)
        });
      }
    }
  });

});

describe('get vessels of interest', () => {

  let mockLoggerError;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    const filePath = 'pathToNonExistingFile';

    try {
      await getVesselsOfInterestFromFile(filePath)
    }
    catch (e) {
      expect(e.message).toContain('File does not exist');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load vessels of interest data from file', filePath);
    }
  });

  it('should return an array of vessels of interests', async () => {
    const filePath = `${__dirname}/../../data/vesselsOfInterest.csv`;

    const result = await getVesselsOfInterestFromFile(filePath);
    expect(result).toBeInstanceOf(Array);
    expect(result[0]).toMatchObject({
      "__t": 'vesselOfInterest',
      registrationNumber: expect.any(String)
    });
  });

});

describe('get weighting risk factors', () => {

  let mockLoggerError;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    const filePath = 'pathToNonExistingFile';

    try {
      await getWeightingRiskFromFile(filePath)
    }
    catch (e) {
      expect(e.message).toContain('File does not exist');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load weighting risk data from file', filePath);
    }
  });

  it('should return an array of weighting rick factors', async () => {
    const filePath = `${__dirname}/../../data/weightingRisk.csv`;

    const result = await getWeightingRiskFromFile(filePath);
    expect(result).toBeInstanceOf(Array);
    expect(result[0]).toMatchObject({
      vesselWeight: expect.any(Number),
      speciesWeight: expect.any(Number),
      exporterWeight: expect.any(Number),
      threshold: expect.any(Number)
    });
  });

});

describe('get species data', () => {

  let mockLoggerError;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    const filePath = 'pathToNonExistingFile';

    try {
      await getSpeciesDataFromFile(filePath)
    }
    catch (e) {
      expect(e.message).toContain('File does not exist');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load species data from file', filePath);
    }
  });

  it('should return an array of species', async () => {
    const filePath = `${__dirname}/../../data/commodity_code.txt`;

    const result = await getSpeciesDataFromFile(filePath);
    expect(result).toBeInstanceOf(Array);
  });

});


describe('get species aliases from file', () => {

  let mockLoggerError;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', () => {
    const filePath = 'pathToNonExistingFile';

    try {
      getSpeciesAliasesFromFile(filePath);
    }
    catch (e) {
      expect(e.message).toContain('no such file or directory');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load species aliases data from file', filePath);
    }
  });

  it('should return an array of species aliases', () => {
    const filePath = `${__dirname}/../../data/speciesmismatch.json`;

    const result = getSpeciesAliasesFromFile(filePath);
    expect(result).toBeInstanceOf(Array);
  });
});

describe('When getting vessels from a local file', () => {
  const path = `${__dirname}/../../data/vessels.json`;
  const expected: IVessel[] = [
    {
      "fishingVesselName": "MARLENA",
      "ircs": null,
      "flag": "GBR",
      "homePort": "WESTRAY",
      "registrationNumber": "K529",
      "imo": null,
      "fishingLicenceNumber": "30117",
      "fishingLicenceValidFrom": "2006-06-07T00:00:00",
      "fishingLicenceValidTo": "2006-06-30T00:00:00",
      "adminPort": "STORNOWAY",
      "rssNumber": "A12032",
      "vesselLength": 8.84,
      "cfr": "GBRA12032",
      "licenceHolderName": "I am the Licence Holder name for this fishing boat"
    }
  ];

  let mockLoggerInfo: jest.SpyInstance;
  let mockLoggerError: jest.SpyInstance;
  let mockReadFileSync: jest.SpyInstance;

  beforeEach(() => {
      mockLoggerInfo = jest.spyOn(logger, 'info');
      mockLoggerError = jest.spyOn(logger, 'error');
      mockReadFileSync = jest.spyOn(fs, 'readFileSync');
  });

  afterEach(() => {
      mockLoggerInfo.mockRestore();
      mockLoggerError.mockRestore();
      mockReadFileSync.mockRestore();
  });

  it('will return the data for export vessels from file', () => {
      mockReadFileSync.mockReturnValue(JSON.stringify(expected));
      const vessels = getVesselsDataFromFile(path);

      expect(mockReadFileSync).toHaveBeenCalledWith(path, "utf-8");
      expect(vessels).toEqual(expected);
  });

  it('will return an error if getVesselsFromLocalFile throws a parse error', () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("parse error")
      });

      expect(() => getVesselsDataFromFile(path)).toThrow('parse error');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load vessels data from file', path);
  });

});

describe('get landings to reprocess', () => {

  let mockLoggerError;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    const filePath = 'pathToNonExistingFile';

    try {
      await getReprocessLandings(filePath)
    }
    catch (e) {
      expect(e.message).toContain('File does not exist');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load reprocess landings data', filePath);
    }
  });

  it('should return an array of landings to be reprocessed', async () => {
    const filePath = `${__dirname}/../../data/reprocess-landings.csv`;

    const result = await getReprocessLandings(filePath);
    expect(result).toBeInstanceOf(Array);
  });
});

describe('update reprocess landings file', () => {

  let mockLoggerError;
  let mockWriteFileSync;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
    mockWriteFileSync = jest.spyOn(fs, 'writeFileSync');
    mockWriteFileSync.mockReturnValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    const filePath = 'pathToNonExistingFile';
    mockWriteFileSync.mockImplementation(() => {
      throw new Error('File does not exist');
    });

      try {
        await updateReprocessLandingsFile(filePath, ['CB1','CB2']);
      } catch (e) {
        expect(e.message).toContain('File does not exist');
        expect(mockLoggerError).toHaveBeenCalledWith('Could not update reprocess landings data', filePath);
      }
  });

  it('should return an array of landings to be reprocessed', async () => {
    const filePath = `${__dirname}/../../data/reprocess-landings.csv`;

    const result = await updateReprocessLandingsFile(filePath, ['CB1','CB2']);
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    expect(mockWriteFileSync).toHaveBeenCalledWith(filePath, 'CB1\nCB2');
  });
});