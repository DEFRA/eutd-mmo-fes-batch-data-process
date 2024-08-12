import { MongoMemoryServer } from 'mongodb-memory-server';
import { VesselOfInterestModel, WeightingModel, SpeciesRiskToggleModel } from '../../../src/types/risking';
import * as LocalFile from '../../../src/data/local-file';
import * as SUT from '../../../src/persistence/risking';
import type { IVesselOfInterest, IWeighting } from 'mmo-shared-reference-data';
import logger from '../../../src/logger';

const mongoose = require('mongoose');

let mongoServer;
const opts = { connectTimeoutMS:60000, socketTimeoutMS:600000, serverSelectionTimeoutMS:60000 }

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, opts).catch(err => {console.log(err)});
  });

afterEach(async () => {
    await VesselOfInterestModel.deleteMany({});
    await WeightingModel.deleteMany({});
    await SpeciesRiskToggleModel.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('vessels of interest', () => {

    let mockGetVesselsOfInterest: jest.SpyInstance;
    let mockLoggerError: jest.SpyInstance;

    const testVesselsOfInterestData: IVesselOfInterest[] = [{
        registrationNumber: "H1100", fishingVesselName: "WIRON 5",    homePort: "PLYMOUTH",  da: "England"
    },{
        registrationNumber: "NN732", fishingVesselName: "CLAR INNIS", homePort: "EASTBOURNE", da: "England"
    },{
        registrationNumber: "RX1", fishingVesselName: "JOCALINDA", homePort: "RYE", da: "England"
    },{
        registrationNumber: "SM161", fishingVesselName: "JUST REWARD", homePort: "WORTHING", da: "England"
    }];

    beforeEach(async () => {
        mockGetVesselsOfInterest = jest.spyOn(LocalFile, 'getVesselsOfInterestFromFile');
        mockGetVesselsOfInterest.mockResolvedValue(testVesselsOfInterestData);

        mockLoggerError = jest.spyOn(logger, 'error');
    });

    afterEach(async () => {
        mockGetVesselsOfInterest.mockRestore();
        mockLoggerError.mockRestore();
    });

    it('will successfully seed vessels of interest', async () => {
        const vesselsOfInterest = new VesselOfInterestModel({
            registrationNumber: "InitialEntry",
            fishingVesselName: "Test",
            homePort: "test",
            da: "test"
        });

        await vesselsOfInterest.save();

        const result = await SUT.seedVesselsOfInterest();
        const count = await VesselOfInterestModel.countDocuments({});

        expect(count).toEqual(4);
        expect(mockGetVesselsOfInterest).toHaveBeenCalled();
        expect(result).toEqual(testVesselsOfInterestData);
    });

    it('will successfully retrieve all vessels of interest', async () => {
        const testData = new VesselOfInterestModel(testVesselsOfInterestData[0]);
        await testData.save();

        const testData1 = new VesselOfInterestModel(testVesselsOfInterestData[1]);
        await testData1.save();

        const testData2 = new VesselOfInterestModel(testVesselsOfInterestData[2]);
        await testData2.save();

        const testData3 = new VesselOfInterestModel(testVesselsOfInterestData[3]);
        await testData3.save();

        const count = await VesselOfInterestModel.countDocuments({});
        expect(count).toBe(4);

        const result = await SUT.getVesselsOfInterest();
        expect(result).toEqual(testVesselsOfInterestData);
    });

    it('will return an empty array if no vessels of interest have been stored', async () => {
        const count = await VesselOfInterestModel.countDocuments({});
        expect(count).toBe(0);

        const result = await SUT.getVesselsOfInterest();
        expect(result).toEqual([]);
    });

    it('will log an error message', async () => {
        mockGetVesselsOfInterest.mockRejectedValue(new Error('something went wrong'));
        await SUT.seedVesselsOfInterest();

        expect(mockGetVesselsOfInterest).toHaveBeenCalledWith(expect.stringContaining('/../../data/vesselsOfInterest.csv'));
        expect(mockLoggerError).toHaveBeenCalledWith('[RISKING-SAVE-VESSELS-OF-INTEREST][ERROR][LOADING LOCAL MODE][Error: something went wrong]');
    });
});

describe('seedWeightingRisk', () => {

    let mockGetWeighting: jest.SpyInstance;
    let mockLoggerError: jest.SpyInstance;

    const testWeightingData: IWeighting[] = [{
        exporterWeight: 1,
        vesselWeight: 1,
        speciesWeight: 1,
        threshold: 1
    }];

    beforeEach(() => {
        mockGetWeighting = jest.spyOn(LocalFile, 'getWeightingRiskFromFile');
        mockGetWeighting.mockResolvedValue(testWeightingData);

        mockLoggerError = jest.spyOn(logger, 'error');
    });

    afterEach(() => {
        mockGetWeighting.mockRestore();
        mockLoggerError.mockRestore();
    });

    it('will successfully save weighting risking data', async () => {
        const weighting = testWeightingData[0]
        const result = await SUT.seedWeightingRisk();
        const count = await WeightingModel.countDocuments({});

        expect(count).toEqual(1);
        expect(mockGetWeighting).toHaveBeenCalled();

        expect(result.exporterWeight).toEqual(weighting['exporterWeight']);
        expect(result.vesselWeight).toEqual(weighting['vesselWeight']);
        expect(result.speciesWeight).toEqual(weighting['speciesWeight']);
        expect(result.threshold).toEqual(weighting['threshold']);
    });

    it('will log an error message', async () => {
        mockGetWeighting.mockRejectedValue(new Error('something went wrong'));
        await SUT.seedWeightingRisk();
        expect(mockLoggerError).toHaveBeenCalledWith('[RISKING-WEIGHTING][ERROR][LOADING LOCAL MODE][Error: something went wrong]');
    });

});

describe('getWeightingRisk', () => {

    const testWeightingData: IWeighting[] = [{
        exporterWeight: 1,
        vesselWeight: 1,
        speciesWeight: 1,
        threshold: 1
    }];

    it('will successfully retrieve weighting information', async () => {
        await new WeightingModel(testWeightingData[0]).save();

        const count = await WeightingModel.countDocuments({});
        expect(count).toBe(1);

        const result = await SUT.getWeightingRisk();
        expect(result).toEqual(testWeightingData[0]);
    });

    it('will return null if vessel is not of interest', async () => {
        const count = await WeightingModel.countDocuments({});
        expect(count).toBe(0);

        const result = await SUT.getWeightingRisk();
        expect(result).toEqual(null);
    });

});

describe('getSpeciesToggle', () => {

    it('will return null if the toggle isnt set', async () => {
        const result = await SUT.getSpeciesToggle();
        expect(result).toBeNull();
    });

});