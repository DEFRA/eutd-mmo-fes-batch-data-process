import * as SUT from '../../src/data/cache';
import * as blob from '../../src/data/blob-storage';
import * as file from '../../src/data/local-file';
import * as RiskingService from "../../src/persistence/risking"
import * as ConversionFactorService from '../../src/persistence/conversionfactors';
import * as shared from "mmo-shared-reference-data";
import fs from 'fs';
import { IConversionFactor, IExporterBehaviour, ISpeciesRiskToggle, IVesselOfInterest, IWeighting, WEIGHT } from 'mmo-shared-reference-data';
import appConfig from '../../src/config'
import logger from '../../src/logger';

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

const vesselData: shared.IVessel[] = [{
  'fishingVesselName': 'MARLENA',
  'ircs': null,
  'flag': 'GBR',
  'homePort': 'WESTRAY',
  'registrationNumber': 'K529',
  'imo': null,
  'fishingLicenceNumber': '30117',
  'fishingLicenceValidFrom': '2006-06-07T00:00:00',
  'fishingLicenceValidTo': '2006-06-30T00:00:00',
  'adminPort': 'STORNOWAY',
  'rssNumber': 'A12032',
  'vesselLength': 8.84,
  'cfr': 'GBRA12032',
  "licenceHolderName": "I am the Licence Holder name for this fishing boat"
},
{
  "fishingVesselName": "WIRON 5",
  "ircs": "2HGD8",
  "cfr": "NLD200202641",
  "flag": "GBR",
  "homePort": "PLYMOUTH",
  "registrationNumber": "H1100",
  "imo": 9249556,
  "fishingLicenceNumber": "12480",
  "fishingLicenceValidFrom": "2021-08-10T00:00:00",
  "fishingLicenceValidTo": "2030-12-31T00:00:00",
  "adminPort": "PLYMOUTH",
  "rssNumber": "C20514",
  "vesselLength": 50.63,
  "licenceHolderName": "INTERFISH WIRONS LIMITED"
},
{
  "fishingVesselName": "ATLANTA II",
  "ircs": "MJAU2",
  "cfr": "GBR000A21401",
  "flag": "GBR",
  "homePort": "MILFORD HAVEN",
  "registrationNumber": "M82",
  "imo": null,
  "fishingLicenceNumber": "11685",
  "fishingLicenceValidFrom": "2016-05-03T00:00:00",
  "fishingLicenceValidTo": "2030-12-31T00:00:00",
  "adminPort": "MILFORD HAVEN",
  "rssNumber": "A21401",
  "vesselLength": 11.75,
  "licenceHolderName": "MR  SIMON COLL"
}];

const vesselNotFoundData: shared.IVessel[] = [{
  "adminPort": "N/A",
  "cfr": null,
  "fishingLicenceNumber": "27619",
  "fishingLicenceValidFrom": "2016-07-01T00:01:00",
  "fishingLicenceValidTo": "2300-12-31T00:01:00",
  "fishingVesselName": "Vessel not found",
  "flag": "GBR",
  "homePort": "N/A",
  "imo": null,
  "ircs": "",
  "registrationNumber": "N/A",
  "rssNumber": "N/A",
  "vesselLength": 0,
  "vesselNotFound": true,
  "licenceHolderName": "licenced holder not found"
}]

const speciesAliasesData: any = [
  {
    "speciesName": "Monkfish",
    "speciesCode": "MON",
    "speciesAlias": ["ANF"]
  },
  {
    "speciesName": "Anglerfish",
    "speciesCode": "ANF",
    "speciesAlias": ["MON"]
  },
  {
    "speciesName": "Megrim",
    "speciesCode": "MEG",
    "speciesAlias": ["LEZ"]
  },
  {
    "speciesName": "Megrim",
    "speciesCode": "LEZ",
    "speciesAlias": ["MEG"]
  },
  {
    "speciesName": "Cuttlefish",
    "speciesCode": "CTL",
    "speciesAlias": ["CTC"]
  },
  {
    "speciesName": "Squid",
    "speciesCode": "SQC",
    "speciesAlias": ["SQR", "SQZ", "SQI"]
  },
  {
    "speciesName": "Squid",
    "speciesCode": "SQR",
    "speciesAlias": ["SQC", "SQZ", "SQI"]
  },
];

const connectionString: string = 'connection-string';

const vesselsOfInterestData: IVesselOfInterest[] = [{
  registrationNumber: 'H1100', fishingVesselName: 'WIRON 5', homePort: 'PLYMOUTH', da: 'England'
}, {
  registrationNumber: 'NN732', fishingVesselName: 'CLAR INNIS', homePort: 'EASTBOURNE', da: 'England'
}, {
  registrationNumber: 'RX1', fishingVesselName: 'JOCALINDA', homePort: 'RYE', da: 'England'
}, {
  registrationNumber: 'SM161', fishingVesselName: 'JUST REWARD', homePort: 'WORTHING', da: 'England'
}];

const speciesToggleData: ISpeciesRiskToggle = { enabled: true };

const weightingRiskData: IWeighting = {
  exporterWeight: 1,
  vesselWeight: 1,
  speciesWeight: 1,
  threshold: 1
}

describe('getSpeciesRiskScore', () => {

  let mockConversionFactors: IConversionFactor[] = [{
    species: 'COD',
    state: 'FRE',
    presentation: 'FIL',
    toLiveWeightFactor: 1.2,
    quotaStatus: 'quota',
    riskScore: 1
  },
  {
    species: 'BOB',
    state: 'FRE',
    presentation: 'FIL',
    toLiveWeightFactor: 1.2,
    quotaStatus: 'quota',
    riskScore: undefined
  }];

  beforeEach(() => {
    SUT.updateCache([], mockConversionFactors, []);
  });

  it('should return its riskScore when the riskScore is available', () => {
    const speciesCode = SUT.getSpeciesRiskScore('COD');
    expect(speciesCode).toBe(1);
  });

  it('should return 0.5 when the species is not found', () => {
    const speciesCode = SUT.getSpeciesRiskScore('ASK');
    expect(speciesCode).toBe(0.5);
  });

  it('should return 0.5 when the species is found BUT does not have a risk score', () => {
    const speciesCode = SUT.getSpeciesRiskScore('BOB');
    expect(speciesCode).toBe(0.5);
  });
});

describe('loadExporterBehaviour', () => {

  let mockLoadBlob;
  let mockLoadLocal;

  beforeEach(() => {
    mockLoadBlob = jest.spyOn(SUT, 'loadExporterBehaviourFromAzureBlob');
    mockLoadLocal = jest.spyOn(SUT, 'loadExporterBehaviourFromLocalFile');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('if in dev mode will call loadExporterBehaviourFromLocalFile', async () => {
    mockLoadLocal.mockResolvedValue(null);

    appConfig.inDev = true;

    await SUT.loadExporterBehaviour();

    expect(mockLoadLocal).toHaveBeenCalled();
  });

  it('if not in dev mode will call loadExporterBehaviourFromAzureBlob', async () => {
    mockLoadBlob.mockResolvedValue(null);

    appConfig.inDev = false;

    await SUT.loadExporterBehaviour();

    expect(mockLoadBlob).toHaveBeenCalled();
  });

});

describe('loadExporterBehaviourFromLocalFile', () => {

  let mockGetExporterBehaviourFromCSV;
  let mockLogError;

  beforeEach(() => {
    mockGetExporterBehaviourFromCSV = jest.spyOn(file, 'getExporterBehaviourFromCSV');
    mockLogError = jest.spyOn(logger, 'error');
  });

  it('will call and return the result from file.getExporterBehaviourFromCSV', async () => {
    const data = [
      { accountId: 'ID1', name: 'Exporter 1', score: 0 },
      { accountId: 'ID2', name: 'Exporter 2', score: 0.5 }
    ];

    mockGetExporterBehaviourFromCSV.mockResolvedValue(data);

    const result = await SUT.loadExporterBehaviourFromLocalFile();

    expect(result).toBe(data);
  });

  it('will handle any errors from file.getExporterBehaviourFromCSV and return an empty array', async () => {
    const error = new Error('boom');

    mockGetExporterBehaviourFromCSV.mockRejectedValue(error);

    const result = await SUT.loadExporterBehaviourFromLocalFile();

    expect(result).toEqual([]);
    expect(mockLogError).toHaveBeenNthCalledWith(1, error);
  });

});

describe('loadExporterBehaviourFromAzureBlob', () => {

  let mockGetExporterBehaviourData;
  let mockLogInfo;

  beforeEach(() => {
    mockGetExporterBehaviourData = jest.spyOn(blob, 'getExporterBehaviourData');
    mockLogInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    mockLogInfo.mockRestore();
  });

  it('will call and return the result from blob.getExporterBehaviourData', async () => {
    const data = [
      { accountId: 'ID1', name: 'Exporter 1', score: 0 },
      { accountId: 'ID2', name: 'Exporter 2', score: 0.5 }
    ];

    mockGetExporterBehaviourData.mockResolvedValue(data);

    const result = await SUT.loadExporterBehaviourFromAzureBlob('connStr');

    expect(result).toBe(data);
    expect(mockLogInfo).toHaveBeenCalledWith('[BLOB-STORAGE-DATA-LOAD][EXPORTER-BEHAVIOUR]');
  });

  it('will rethrow any errors from blob.getExporterBehaviourData', async () => {
    const error = new Error('boom');

    mockGetExporterBehaviourData.mockRejectedValue(error);

    await expect(SUT.loadExporterBehaviourFromAzureBlob('connStr'))
      .rejects
      .toThrow(new Error(`[BLOB-STORAGE-LOAD-ERROR][EXPORTER-BEHAVIOUR] ${error}`));
  });

});

describe('loadSpeciesAliases', () => {

  let mockGetSpeciesAliases;
  let mockLogInfo;

  beforeEach(() => {
    mockGetSpeciesAliases = jest.spyOn(blob, 'getSpeciesAliases');
    mockLogInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    mockLogInfo.mockRestore();
  });

  it('will call and return the result from blob.getSpeciesAliases', async () => {
    const speciesmissmatchData = [
      {
        "SQC": ["SQR", "SQZ", "SQI"]
      },
      {
        "SQR": ["SQC", "SQZ", "SQI"]
      },
    ];

    mockGetSpeciesAliases.mockResolvedValue(speciesmissmatchData);

    const result = await SUT.loadSpeciesAliases('connStr');

    expect(result).toBe(speciesmissmatchData);
    expect(mockLogInfo).toHaveBeenCalledWith('[BLOB-STORAGE-DATA-LOAD][SPECIES-ALIASES]');
  });

  it('will call and return the result [] from blob.getSpeciesAliases', async () => {

    const speciesmissmatchData = [];

    mockGetSpeciesAliases.mockResolvedValue(speciesmissmatchData);

    const result = await SUT.loadSpeciesAliases('connStr');

    expect(result).toEqual(speciesmissmatchData);
    expect(mockLogInfo).toHaveBeenCalledWith('[BLOB-STORAGE-DATA-LOAD][SPECIES-ALIASES]');
  });

  it('will rethrow any errors from blob.getSpeciesAliases', async () => {
    const error = new Error('tis the error');

    mockGetSpeciesAliases.mockRejectedValue(error);

    await expect(SUT.loadSpeciesAliases('connStr'))
      .rejects
      .toThrow(new Error(`[BLOB-STORAGE-LOAD-ERROR][SPECIES-ALIASES] ${error}`));
  });

});

describe('loadSpeciesDataFromLocalFile', () => {

  let mockGetSpeciesData;
  let mockLoggerError;

  beforeEach(() => {
    mockGetSpeciesData = jest.spyOn(file, 'getSpeciesDataFromFile');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will call getSpeciesDataFromFile in file storage', async () => {
    mockGetSpeciesData.mockResolvedValue('test');

    await SUT.loadSpeciesDataFromLocalFile();

    expect(mockGetSpeciesData).toHaveBeenCalled();
  });

  it('will return data from file storage', async () => {
    mockGetSpeciesData.mockResolvedValue('test');

    const result = await SUT.loadSpeciesDataFromLocalFile();

    expect(result).toBe('test');
  });

  it('will log an error and return void if file storage throws an error', async () => {
    const error = new Error('something went wrong');

    mockGetSpeciesData.mockRejectedValue(error);

    const result = await SUT.loadSpeciesDataFromLocalFile();

    expect(mockLoggerError).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

});

describe('loadSpeciesData', () => {

  const connString = 'connection string';

  let mockGetSpeciesData;
  let mockLoggerInfo;

  beforeEach(() => {
    mockGetSpeciesData = jest.spyOn(blob, 'getSpeciesData');
    mockLoggerInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will log being called', async () => {
    mockGetSpeciesData.mockResolvedValue('test');

    await SUT.loadSpeciesData(connString);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[BLOB-STORAGE-DATA-LOAD][SPECIES]');
  });

  it('will call getSpeciesData in blob storage', async () => {
    mockGetSpeciesData.mockResolvedValue('test');

    await SUT.loadSpeciesData(connString);

    expect(mockGetSpeciesData).toHaveBeenCalledWith(connString);
  });

  it('will return data from blob storage', async () => {
    mockGetSpeciesData.mockResolvedValue('test');

    const result = await SUT.loadSpeciesData(connString);

    expect(result).toBe('test');
  });

  it('will throw an error if blob storage throws an error', async () => {
    const error = new Error('something went wrong');

    mockGetSpeciesData.mockRejectedValue(error);

    const expected = `[BLOB-STORAGE-LOAD-ERROR][SPECIES] ${error}`;

    await expect(async () => SUT.loadSpeciesData(connString)).rejects.toThrow(expected);
  });

});

describe('getWeighting', () => {
  beforeAll(() => {
    SUT.updateWeightingCache(weightingRiskData);
  });

  afterAll(() => {
    SUT.updateWeightingCache({
      exporterWeight: 0,
      speciesWeight: 0,
      vesselWeight: 0,
      threshold: 0
    });
  });

  it('will return the correct weighting', () => {
    expect(SUT.getWeighting(WEIGHT.EXPORTER)).toBe(1);
    expect(SUT.getWeighting(WEIGHT.VESSEL)).toBe(1);
    expect(SUT.getWeighting(WEIGHT.SPECIES)).toBe(1);
  });

  it('will return the correct risk thres hold', () => {
    expect(SUT.getRiskThreshold()).toBe(1);
  });
});

describe('getExporterRiskScore', () => {

  const testExporters: IExporterBehaviour[] = [
    { name: 'Organisation 1, Contact 1', accountId: 'acc1', contactId: 'con1', score: 0.9 },
    { name: 'Organisation 1, Contact 2', accountId: 'acc1', contactId: 'con2', score: 0.7 },
    { name: 'Organisation 1, Contact 3', contactId: 'con3', score: 0.8 },
    { name: 'Organisation 1, All Other Contacts', accountId: 'acc1', score: 0.3 },
    { name: 'Individual fisherman', contactId: 'con2', score: 0.2 },
  ];

  beforeAll(async () => {
    appConfig.inDev = true;

    jest.spyOn(SUT, 'loadExporterBehaviourFromLocalFile')
      .mockResolvedValue(testExporters);

    await SUT.loadExporterBehaviour();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('will return a default of 1.0 if no ids are provided', () => {
    const score = SUT.getExporterRiskScore(null, null);

    expect(score).toBe(1.0);
  });

  describe('for an individual user (no accountId)', () => {

    it('will find an individual fisherman by contactId only', () => {
      const score = SUT.getExporterRiskScore(null, 'con2');

      expect(score).toBe(0.2);
    });

    it('will return a default of 1.0 if no match is found', () => {
      const score = SUT.getExporterRiskScore(null, 'xx');

      expect(score).toBe(1.0);
    });

  });

  describe('for a user within an organisation (has an accountId)', () => {

    it('will use both ids to find an exact match', () => {
      const score = SUT.getExporterRiskScore('acc1', 'con2');

      expect(score).toBe(0.7);
    });

    it('will match on contactId if no exact match', () => {
      const score = SUT.getExporterRiskScore('acc1', 'con3');

      expect(score).toBe(0.8);
    });

    it('will match on accountId if no contact match', () => {
      const score = SUT.getExporterRiskScore('acc1', 'con99');

      expect(score).toBe(0.3);
    });

    it('will return a default of 1.0 if no match is found', () => {
      const score = SUT.getExporterRiskScore('xx', 'xx');

      expect(score).toBe(1.0);
    });

  });

});

describe('getSpeciesRiskScore', () => {

  let mockConversionFactors: IConversionFactor[] = [];

  beforeEach(() => {
    mockConversionFactors = [
      {
        species: 'COD',
        state: 'FRE',
        presentation: 'FRO',
        toLiveWeightFactor: undefined,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'HER',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.2,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'ALB',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: undefined,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'LBE',
        state: 'FRO',
        presentation: 'WHO',
        toLiveWeightFactor: 1.5,
        quotaStatus: 'nonquota',
        riskScore: 1
      },
      {
        species: 'WHO',
        state: 'FRE',
        presentation: 'WHO',
        quotaStatus: 'quota',
        riskScore: 1,
        toLiveWeightFactor: null
      },
      {
        species: 'COD',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.2,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'BOB',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.2,
        quotaStatus: 'quota',
        riskScore: undefined
      }
    ];

    SUT.updateCache([], mockConversionFactors, []);
  });

  it('should return default value when undefined riskScore ', () => {
    const speciesRisk = SUT.getSpeciesRiskScore('COD');
    expect(speciesRisk).toBe(1);
  });

  it('should return default value when missing riskScore ', () => {
    const speciesRisk = SUT.getSpeciesRiskScore('WHO');
    expect(speciesRisk).toBe(1);
  });

  it('should return riskScore value when riskScore is a number ', () => {
    const speciesRisk = SUT.getSpeciesRiskScore('LBE');
    expect(speciesRisk).toBe(1);
  });

  it('should return riskScore value when riskScore is a string valid number ', () => {
    const speciesRisk = SUT.getSpeciesRiskScore('HER');
    expect(speciesRisk).toBe(1);
  });

  it('should return default value when riskScore string is a string not valid number', () => {
    const speciesRisk = SUT.getSpeciesRiskScore('ALB');
    expect(speciesRisk).toBe(1);
  });

});

describe('getVesselRiskScore', () => {

  beforeEach(() => {
    SUT.updateVesselsOfInterestCache(vesselsOfInterestData);
  });

  afterEach(() => {
    SUT.updateVesselsOfInterestCache([]);
  });

  it('returns a score of 1 if the vessel is present within the vessels of interest list', async () => {
    const pln: string = 'H1100';
    const result = SUT.getVesselRiskScore(pln);
    expect(result).toBe(1);
  });

  it('return a score of 0.5 if the vessel is not present within the vessels of interest list', async () => {
    const pln: string = 'WA1';
    const result = SUT.getVesselRiskScore('WA1');
    expect(result).toBe(0.5);
  });
});

describe('getSpeciesRiskToggle', () => {

  afterEach(() => {
    SUT.updateSpeciesToggleCache({ enabled: false });
  });

  it('should return true', () => {
    SUT.updateSpeciesToggleCache(speciesToggleData);
    expect(SUT.getSpeciesRiskToggle()).toBe(true);
  });

  it('should return false', () => {
    expect(SUT.getSpeciesRiskToggle()).toBe(false);
  });

});

describe('Refresh Risking Data', () => {

  const conversionFactors: IConversionFactor[] = [
    {
      species: 'COD',
      state: 'FRE',
      presentation: 'FIL',
      toLiveWeightFactor: 1.2,
      quotaStatus: 'quota',
      riskScore: 0
    },
    {
      species: 'LBE',
      state: 'FRO',
      presentation: 'WHO',
      toLiveWeightFactor: 1,
      quotaStatus: 'nonquota',
      riskScore: 1
    }
  ];


  let mockGetVesselsOfInterest;
  let mockUpdateVesselsOfInterestCache;
  let mockGetWeightingRisk;
  let mockUpdateWeightingCache;
  let mockGetSpeciesToggle;
  let mockUpdateSpeciesToggleCache;


  beforeEach(() => {
    SUT.updateVesselsCache(vesselData);

    SUT.updateCache([], conversionFactors, []);

    mockGetVesselsOfInterest = jest.spyOn(RiskingService, 'getVesselsOfInterest');
    mockGetWeightingRisk = jest.spyOn(RiskingService, 'getWeightingRisk');
    mockGetSpeciesToggle = jest.spyOn(RiskingService, 'getSpeciesToggle');
    mockUpdateVesselsOfInterestCache = jest.spyOn(SUT, 'updateVesselsOfInterestCache');
    mockUpdateWeightingCache = jest.spyOn(SUT, 'updateWeightingCache');
    mockUpdateSpeciesToggleCache = jest.spyOn(SUT, 'updateSpeciesToggleCache');


    mockGetVesselsOfInterest.mockResolvedValue(vesselsOfInterestData);
    mockGetWeightingRisk.mockResolvedValue(weightingRiskData);
    mockGetSpeciesToggle.mockResolvedValue(speciesToggleData);

  });

  afterEach(() => {
    SUT.updateVesselsOfInterestCache([]);
    SUT.updateWeightingCache({
      exporterWeight: 0,
      vesselWeight: 0,
      speciesWeight: 0,
      threshold: 0
    });
    SUT.updateSpeciesToggleCache({
      enabled: true
    });


    SUT.updateVesselsCache([]);

    SUT.updateCache([], [], []);

    mockGetVesselsOfInterest.mockRestore();
    mockUpdateVesselsOfInterestCache.mockRestore();

    mockGetSpeciesToggle.mockRestore();
    mockGetWeightingRisk.mockRestore();
    mockUpdateWeightingCache.mockRestore();
  });

  it('should refresh the vessels of interest', async () => {
    await SUT.refreshRiskingData();

    expect(mockGetVesselsOfInterest).toHaveBeenCalled();
    expect(mockUpdateVesselsOfInterestCache).toHaveBeenCalledWith(vesselsOfInterestData);

    expect(mockGetWeightingRisk).toHaveBeenCalled();
    expect(mockUpdateWeightingCache).toHaveBeenCalledWith(weightingRiskData);

    expect(SUT.getVesselRiskScore('H1100')).toBe(1);
    expect(SUT.getVesselRiskScore('WA1')).toBe(0.5);

    expect(SUT.getWeighting(WEIGHT.VESSEL)).toBe(1);
    expect(SUT.getWeighting(WEIGHT.SPECIES)).toBe(1);
    expect(SUT.getWeighting(WEIGHT.EXPORTER)).toBe(1);
    expect(SUT.getRiskThreshold()).toBe(1);
  });

  it('should check if the refreshRiskingData calls the toggle functionality and get eod settings', async () => {
    await SUT.refreshRiskingData();

    expect(mockGetSpeciesToggle).toHaveBeenCalled();
    expect(mockUpdateSpeciesToggleCache).toHaveBeenCalledWith(speciesToggleData);
  });

  it('should return a vesselIdx for K529', () => {
    expect(SUT.getVesselsIdx()('K529')).toHaveLength(1);
  });

  it('should return vessels data', () => {
    expect(SUT.getVesselsData()).toHaveLength(3);
  });
});

describe('addVesselNotFound', () => {
  const ActualVesselNotFoundEnabled = appConfig.vesselNotFoundEnabled

  beforeEach(() => {
    appConfig.vesselNotFoundEnabled = ActualVesselNotFoundEnabled;
  });

  it('should add vessel not found as valid vessel to vessel data if vesselNotFoundEnabled is true', () => {
    appConfig.vesselNotFoundEnabled = true;
    appConfig.vesselNotFoundName = 'Vessel not found';
    appConfig.vesselNotFoundPln = 'N/A';

    const result = SUT.addVesselNotFound(vesselData);
    expect(result).toEqual([...vesselData, ...vesselNotFoundData])
  })

  it('should NOT add `vessel not found` as valid vessel to vessel data if vesselNotFoundEnabled is false', () => {
    appConfig.vesselNotFoundEnabled = false;

    const result = SUT.addVesselNotFound(vesselData);
    expect(result).toEqual(vesselData)
  })

});

describe('loadConversionFactorsData', () => {

  const connString = 'connection string';

  let mockGetConversionFactorsData;
  let mockLoggerInfo;

  beforeEach(() => {
    mockGetConversionFactorsData = jest.spyOn(blob, 'getConversionFactorsData');
    mockLoggerInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will log being called', async () => {
    mockGetConversionFactorsData.mockResolvedValue('test');

    await SUT.loadConversionFactorsData(connString);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[BLOB-STORAGE-DATA-LOAD][CONVERSION-FACTORS]');
  });

  it('will call getSeasonalFishData in blob storage', async () => {
    mockGetConversionFactorsData.mockResolvedValue('test');

    await SUT.loadConversionFactorsData(connString);

    expect(mockGetConversionFactorsData).toHaveBeenCalledWith(connString);
  });

  it('will return data from blob storage', async () => {
    mockGetConversionFactorsData.mockResolvedValue('test');

    const result = await SUT.loadConversionFactorsData(connString);

    expect(result).toBe('test');
  });

  it('will throw an error if blob storage throws an error', async () => {
    const error = new Error('something went wrong');

    mockGetConversionFactorsData.mockRejectedValue(error);

    const expected = `[BLOB-STORAGE-LOAD-ERROR][CONVERSION-FACTORS] ${error}`;

    await expect(async () => SUT.loadConversionFactorsData(connString)).rejects.toThrow(expected);
  });

});

describe('loadVesselsDataFromLocalFile', () => {

  let mockGetVesselData;
  let mockLoggerError;

  beforeEach(() => {
    mockGetVesselData = jest.spyOn(file, 'getVesselsDataFromFile');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will call getVesselDataFromFile in file storage', async () => {
    mockGetVesselData.mockResolvedValue('test');

    await SUT.loadVesselsDataFromLocalFile();

    expect(mockGetVesselData).toHaveBeenCalled();
  });

  it('will return data from file storage', async () => {
    mockGetVesselData.mockResolvedValue('test');

    const result = await SUT.loadVesselsDataFromLocalFile();

    expect(result).toBe('test');
  });

  it('will log an error and return void if file storage throws an error', async () => {

    mockGetVesselData.mockImplementation(() => {
      throw 'something went wrong'
    });

    const result = await SUT.loadVesselsDataFromLocalFile();

    expect(mockLoggerError).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

});

describe('loadSpeciesAliasesFromLocalFile', () => {

  let mockgetSpeciesAliasesFromFile;
  let mockLoggerError;

  beforeEach(() => {
    mockgetSpeciesAliasesFromFile = jest.spyOn(file, 'getSpeciesAliasesFromFile');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will call getSpeciesAliasesFromFile', () => {
    mockgetSpeciesAliasesFromFile.mockReturnValue(speciesAliasesData);

    SUT.loadSpeciesAliasesFromLocalFile();

    expect(mockgetSpeciesAliasesFromFile).toHaveBeenCalled();
  });

  it('will return species aliases data from local file', () => {
    mockgetSpeciesAliasesFromFile.mockReturnValue(speciesAliasesData);

    const expected: any = {
      ANF: ['MON'],
      CTL: ['CTC'],
      LEZ: ['MEG'],
      MEG: ['LEZ'],
      MON: ['ANF'],
      SQC: ['SQR', 'SQZ', 'SQI'],
      SQR: ['SQC', 'SQZ', 'SQI'],
    };

    const result: any = SUT.loadSpeciesAliasesFromLocalFile();

    expect(result).toStrictEqual(expected);
  });

  it('will log an error and return {} read from speciesmismatch file if there is an error', () => {
    const error = new Error('something went wrong');

    mockgetSpeciesAliasesFromFile.mockImplementation(() => {
      throw error;
    });

    const result = SUT.loadSpeciesAliasesFromLocalFile();

    expect(mockLoggerError).toHaveBeenCalledWith(error);
    expect(result).toStrictEqual({});
  });

});

describe('when getting vessels from a blob storage', () => {

  const expected: shared.IVessel[] = [
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

  let mockLoggerInfo;
  let mockLoggerError;
  let mockGetVesselData;

  beforeEach(() => {
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
    mockGetVesselData = jest.spyOn(blob, 'getVesselsData');
    mockGetVesselData.mockResolvedValue(expected);
  });

  afterEach(() => {
    mockLoggerInfo.mockRestore();
    mockLoggerError.mockRestore();
    mockGetVesselData.mockRestore();
  });

  it('will check if the loadVesselsData is returning the correct data', async () => {

    const result = await SUT.loadVesselsData(connectionString);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[BLOB-STORAGE-DATA-LOAD][VESSELS]');
    expect(mockGetVesselData).toHaveBeenCalledWith('connection-string');
    expect(result).toEqual(expected);
  })

  it('will fail if the loadVesselsData is not returning the correct data', async () => {
    const fakeError = {};
    mockGetVesselData.mockRejectedValue(fakeError);

    await expect(SUT.loadVesselsData(connectionString)).rejects.toThrow(`[BLOB-STORAGE-LOAD-ERROR][VESSELS] ${fakeError}`);
  });

});

describe('getToLiveWeightFactor', () => {
  let mockConversionFactors: IConversionFactor[] = [];

  beforeEach(() => {
    mockConversionFactors = [
      {
        species: 'COD',
        state: 'FRE',
        presentation: 'FRO',
        toLiveWeightFactor: undefined,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'HER',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.2,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'ALB',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: undefined,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'LBE',
        state: 'FRO',
        presentation: 'WHO',
        toLiveWeightFactor: 1.5,
        quotaStatus: 'nonquota',
        riskScore: 1
      },
      {
        species: 'WHO',
        state: 'FRE',
        presentation: 'WHO',
        quotaStatus: 'quota',
        riskScore: 1,
        toLiveWeightFactor: null
      },
      {
        species: 'COD',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.2,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'BOB',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.2,
        quotaStatus: 'quota',
        riskScore: undefined
      }
    ];

    SUT.updateCache([], mockConversionFactors, []);
  });

  afterEach(() => {
    SUT.updateCache([], [], []);
  });

  it('should return default value when toLiveWeightFactor is undefined', () => {
    expect(SUT.getToLiveWeightFactor('COD', 'FRE', 'FRO')).toBe(1);
  });

  it('should return default value when toLiveWeightFactor is missing', () => {
    expect(SUT.getToLiveWeightFactor('WHO', 'FRE', 'WHO')).toBe(1);
    expect(SUT.getToLiveWeightFactor('ALB', 'FRE', 'FIL')).toBe(1);
  });

  it('should return conversion factor value when toLiveWeightFactor is a number', () => {
    expect(SUT.getToLiveWeightFactor('LBE', 'FRO', 'WHO')).toBe(1.5);
  });

  it('should return conversion factor value when toLiveWeightFactor is a valid number', () => {
    expect(SUT.getToLiveWeightFactor('HER', 'FRE', 'FIL')).toBe(1.2);
  });

  it('should return default value when conversion factor is not a valid number', () => {
    expect(SUT.getToLiveWeightFactor('ALB', 'FRE', 'FIL')).toBe(1);
  });

  it('should return species\'s corresponding toliveWeightFactor', () => {
    expect(SUT.getToLiveWeightFactor('COD', 'FRE', 'FIL')).toBe(1.2);
  });

  it('should return 1 when the to live weight factor is not found', () => {
    expect(SUT.getToLiveWeightFactor('ASK', 'FRE', 'FIL')).toBe(1);
  });

  it('should return 1 as a to live weight factor when the species is found BUT does match on presentation and state', () => {
    expect(SUT.getToLiveWeightFactor('BOB', 'FRO', 'GUT')).toBe(1);
  });

});

describe('when in production mode', () => {

  let mockaddVesselNotFound;
  let mockLoadSpecies;
  let mockVesselsData;
  let mockLoadConversionFactors;
  let mockGetAllVesselsOfInterest;
  let mockGetWeightingRisk;
  let mockGetSpeciesToggle;
  let mockGetVesselData;
  let mockLoadSpeciesAliases;

  beforeEach(() => {
    appConfig.inDev = false;
    appConfig.vesselNotFoundEnabled = true;
    appConfig.blobStorageConnection = 'blob-connection';
    mockLoadSpecies = jest.spyOn(SUT, 'loadSpeciesData');
    mockVesselsData = jest.spyOn(SUT, 'loadVesselsData');
    mockaddVesselNotFound = jest.spyOn(SUT, 'addVesselNotFound')
    mockGetVesselData = jest.spyOn(file, 'getVesselsDataFromFile');
    mockLoadSpeciesAliases = jest.spyOn(SUT, 'loadSpeciesAliases');
    mockLoadConversionFactors = jest.spyOn(SUT, 'loadConversionFactorsData');
    mockGetAllVesselsOfInterest = jest.spyOn(RiskingService, 'getVesselsOfInterest');
    mockGetWeightingRisk = jest.spyOn(RiskingService, 'getWeightingRisk');
    mockGetSpeciesToggle = jest.spyOn(RiskingService, 'getSpeciesToggle')
    mockLoadSpecies.mockResolvedValue(speciesData);
    mockVesselsData.mockResolvedValue(vesselData);
    mockLoadSpeciesAliases.mockReturnValue(speciesAliasesData);
    mockLoadConversionFactors.mockReturnValue([]);
    mockGetSpeciesToggle.mockResolvedValue(speciesToggleData);
    mockGetAllVesselsOfInterest.mockResolvedValue(vesselsOfInterestData);
    mockGetWeightingRisk.mockResolvedValue(weightingRiskData);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    SUT.updateCache([], [], []);
    SUT.updateVesselsCache([]);
    SUT.updateVesselsOfInterestCache([]);
    SUT.updateWeightingCache({
      exporterWeight: 0,
      vesselWeight: 0,
      speciesWeight: 0,
      threshold: 0
    });
    SUT.updateSpeciesToggleCache({
      enabled: false
    });
  });


  describe('loadProdFishCountriesAndSpecies ', () => {

    it('should call loadConversionFactors ', async () => {
      await SUT.loadProdFishCountriesAndSpecies();
      expect(mockLoadConversionFactors).toBeTruthy();
    });

    it('should call getAllVesselsOfInterest', async () => {
      await SUT.loadProdFishCountriesAndSpecies();
      expect(mockGetAllVesselsOfInterest).toHaveBeenCalled();
    });

    it('should call get weighting risk data', async () => {
      await SUT.loadProdFishCountriesAndSpecies();
      expect(mockGetWeightingRisk).toHaveBeenCalled();
    });

    it('will initialise the cache for Species Toggle', async () => {
      await SUT.loadProdFishCountriesAndSpecies();
      expect(mockGetSpeciesToggle).toHaveBeenCalled();
    });
  });


  describe('loadFishCountriesAndSpecies', () => {

    it('should call loadProdFishCountriesAndSpecies', async () => {
      let mockloadProdFishCountriesAndSpecies;
      mockloadProdFishCountriesAndSpecies = jest.spyOn(SUT, 'loadProdFishCountriesAndSpecies');
      mockloadProdFishCountriesAndSpecies.mockReturnValue({ some: 'data' });
      await SUT.loadFishCountriesAndSpecies();
      expect(mockloadProdFishCountriesAndSpecies).toBeTruthy();
    });
  });

  describe('loadVessels', () => {

    it('should call load vesssel data with addVesselNotFound', async () => {
      await SUT.loadVessels();
      expect(mockVesselsData).toBeTruthy();
      expect(mockaddVesselNotFound).toBeTruthy();
    });
  });

});

describe('when in development mode', () => {

  describe('loadFishCountriesAndSpecies', () => {

    const enableVesselNotFound = appConfig.vesselNotFoundEnabled;

    let mockLoadSpeciesDataFromLocalFile;
    let mockLoadSpeciesAliases;
    let mockLoggerInfo;
    let mockLoadConversionFactors;
    let mockSeedWeightingRisk;
    let mockSeedVesselsOfInterest;
    let mockGetSpeciesToggle;

    beforeEach(() => {
      appConfig.inDev = true;
      mockLoadSpeciesDataFromLocalFile = jest.spyOn(SUT, 'loadSpeciesDataFromLocalFile');
      mockLoadSpeciesAliases = jest.spyOn(SUT, 'loadSpeciesAliasesFromLocalFile');
      mockLoadConversionFactors = jest.spyOn(ConversionFactorService, 'loadConversionFactorsFromLocalFile');
      mockSeedWeightingRisk = jest.spyOn(RiskingService, 'seedWeightingRisk')
      mockSeedVesselsOfInterest = jest.spyOn(RiskingService, 'seedVesselsOfInterest');
      mockGetSpeciesToggle = jest.spyOn(RiskingService, 'getSpeciesToggle');
      mockLoggerInfo = jest.spyOn(logger, 'info');

      mockLoadSpeciesDataFromLocalFile.mockResolvedValue(speciesData);
      mockLoadSpeciesAliases.mockReturnValue(speciesAliasesData);
      mockLoadConversionFactors.mockResolvedValue([]);
      mockSeedVesselsOfInterest.mockResolvedValue(vesselsOfInterestData);

      mockSeedWeightingRisk.mockResolvedValue(weightingRiskData);
      mockGetSpeciesToggle.mockResolvedValue(speciesToggleData);

    });

    afterEach(() => {
      jest.restoreAllMocks();
      appConfig.vesselNotFoundEnabled = enableVesselNotFound;

      SUT.updateCache([], [], []);
      SUT.updateVesselsOfInterestCache([]);
      SUT.updateSpeciesToggleCache({
        enabled: false
      });

    });


    it('should call all data related methods', async () => {
      await SUT.loadLocalFishCountriesAndSpecies();

      expect(mockLoggerInfo).toHaveBeenCalledWith('Loading data from local files in dev mode');
      expect(mockLoadSpeciesDataFromLocalFile).toHaveBeenCalled();
      expect(mockLoadSpeciesAliases).toHaveBeenCalled();
      expect(mockLoadConversionFactors).toHaveBeenCalled();
      expect(mockSeedWeightingRisk).toHaveBeenCalled();
      expect(mockSeedVesselsOfInterest).toHaveBeenCalled();
      expect(mockGetSpeciesToggle).toHaveBeenCalled();
    });

    it('should return species data', async () => {
      await SUT.loadLocalFishCountriesAndSpecies();
      expect(SUT.getSpeciesData()).toEqual(speciesData);
    });
  });

  describe('loadVessels', () => {

    let mockLoadVesselsDataFromLocalFile;
    let mockaddVesselNotFound;

    beforeEach(() => {
      appConfig.inDev = true;

      mockLoadVesselsDataFromLocalFile = jest.spyOn(SUT, 'loadVesselsDataFromLocalFile');
      mockLoadVesselsDataFromLocalFile.mockResolvedValue(vesselData);
      mockaddVesselNotFound = jest.spyOn(SUT, 'addVesselNotFound');
    })

    afterEach(() => {
      jest.restoreAllMocks();
    })

    it('should call loadVesselsDataFromLocalFile', async () => {
      await SUT.loadVessels();

      expect(mockLoadVesselsDataFromLocalFile).toHaveBeenCalled();
      expect(mockaddVesselNotFound).toBeTruthy();
    });

    it('should return vessel data', async () => {
      const expected = [
        {
          da: "England",
          flag: "GBR",
          holder: "INTERFISH WIRONS LIMITED",
          homePort: "PLYMOUTH",
          imoNumber: 9249556,
          number: "12480",
          rssNumber: "C20514",
          validFrom: "2021-08-10",
          validTo: "2030-12-31",
          vesselLength: 50.63
        }]
      await SUT.loadVessels();
      expect(SUT.getVesselsIdx()('H1100')).toEqual(expected);
    });

  });

  describe('loadFishCountriesAndSpecies', () => {
    let mockLoadLocalFishCountriesAndSpecies;
    appConfig.inDev = true;

    it('should call loadProdFishCountriesAndSpecies', async () => {
      mockLoadLocalFishCountriesAndSpecies = jest.spyOn(SUT, 'loadLocalFishCountriesAndSpecies');
      mockLoadLocalFishCountriesAndSpecies.mockReturnValue({ some: 'data' });

      await SUT.loadFishCountriesAndSpecies();

      expect(mockLoadLocalFishCountriesAndSpecies).toBeTruthy();
    });
  });

  describe('getSpeciesAliases', () => {

    let mockSpeciesAliases: any = {
      ANF: ['MON'],
      CTL: ['CTC'],
      LEZ: ['MEG'],
      MEG: ['LEZ'],
      MON: ['ANF'],
      SQC: ['SQR', 'SQZ', 'SQI'],
      SQR: ['SQC', 'SQZ', 'SQI']
    };

    beforeEach(() => {
      SUT.updateCache([], [], mockSpeciesAliases);
    });

    it('should return species aliases', () => {
      const speciesAliases = SUT.getSpeciesAliases('SQC');
      const expected = ['SQR', 'SQZ', 'SQI'];
      expect(speciesAliases).toEqual(expected);
    });

    it('should return an empty array if no species code passed in', () => {
      const speciesAliases = SUT.getSpeciesAliases('');
      expect(speciesAliases).toEqual([]);
    });

    it('should return empty array if there is no species aliases', () => {
      const speciesAliases = SUT.getSpeciesAliases('COD');
      expect(speciesAliases).toEqual([]);
    });
  });

});

describe('loadLandingReprocessData', () => {

  let mockLoggerError;
  let mockgetReprocessLandings;

  beforeEach(() => {
    mockgetReprocessLandings = jest.spyOn(file, 'getReprocessLandings');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    mockgetReprocessLandings.mockImplementation(() => {
      throw new Error('File does not exist');
    });
    const result = await SUT.loadLandingReprocessData();
    expect(result).toBeInstanceOf(Array);
    expect(result.length === 0).toBeTruthy();
  });

  it('should return an array of landings to be reprocessed', async () => {
    const result = await SUT.loadLandingReprocessData();
    expect(result).toBeInstanceOf(Array);
  });
});

describe('updateLandingReprocessData', () => {

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
      await SUT.updateLandingReprocessData(['CB1', 'CB2']);
    } catch (e) {
      expect(e.message).toContain('File does not exist');
      expect(mockLoggerError).toHaveBeenCalledWith('Cannot update reprocess landings file from local file system', filePath);
    }
  });

  it('should return an array of landings to be reprocessed', async () => {
    const dir = __dirname.split('/');
    dir.splice(-2, 2);

    await SUT.updateLandingReprocessData(['CB1', 'CB2']);
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    expect(mockWriteFileSync).toHaveBeenCalledWith(`${dir.join('/')}/src/data/../../data/reprocess-landings.csv`, 'CB1\nCB2');
  });
});