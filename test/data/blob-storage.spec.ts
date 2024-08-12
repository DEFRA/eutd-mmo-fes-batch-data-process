import sinon from 'sinon';
import logger from "../../src/logger";
import { getVesselsData } from '../../src/data/blob-storage';
import * as blob from '../../src/data/blob-storage';
import * as storage from '../../__mocks__/azure-storage';
import { type IVessel } from 'mmo-shared-reference-data';
import config from '../../src/config';


describe('saving validation reporting data to remote blob storage', () => {

    let mockLoggerInfo;
    let mockLoggerError;
    let mockWriteToBlobWithSas;
    let mockDateNow;

    beforeEach(() => {
        mockLoggerInfo = jest.spyOn(logger, 'info');
        mockLoggerError = sinon.spy(logger, 'error');
        mockWriteToBlobWithSas = sinon.spy(blob, 'writeToBlobWithSas');
        mockDateNow = jest.spyOn(global.Date, 'now')
            .mockImplementation(() => new Date('2019-10-15T11:01:58.135Z').valueOf())
    });

    afterEach(() => {
        mockLoggerError.restore();
        mockWriteToBlobWithSas.restore();
        sinon.restore();
        mockLoggerInfo.mockRestore();
        mockDateNow.mockRestore();
    });



    it('should save a reporting validation JSON object to a file', async () => {
        storage.__setMockService();
        config.azureContainer = "t1-catchcerts";
        config.externalAppUrl = 'some-snd-url'

        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        const expected = {
            blob: expect.stringContaining('.json'),
            container: 't1-catchcerts',
            text: JSON.stringify(data)
        };

        const result = await blob.saveReportingValidation(data, 'CC');

        expect(mockWriteToBlobWithSas.getCall(0).args[0]).toBe(storage.createBlobServiceWithSas());
        expect(mockWriteToBlobWithSas.getCall(0).args[1]).toEqual('t1-catchcerts');
        expect(mockWriteToBlobWithSas.getCall(0).args[2].includes('.json')).toBeTruthy();
        expect(mockWriteToBlobWithSas.getCall(0).args[3]).toEqual(JSON.stringify(data));

        expect(result).toEqual(expected);

        mockWriteToBlobWithSas.restore();
    });

    it('the filename of the file generated will be prepended with doc type', async () => {
        storage.__setMockService();
        config.azureContainer = "t1-catchcerts";

        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        await blob.saveReportingValidation(data, 'CC');

        expect(mockWriteToBlobWithSas.getCall(0).args[2].includes('CC')).toBeTruthy();

        mockWriteToBlobWithSas.restore();
    });

    it('the filename of the file generated will be appended with the date and time', async () => {
        storage.__setMockService();
        config.azureContainer = "t1-catchcerts";

        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        const expected = "20191015_11-01-58-135";
        const environment = "SND"

        await blob.saveReportingValidation(data, 'CC');

        expect(mockWriteToBlobWithSas.getCall(0).args[2]).toBe(`_CC_${environment}_${expected}.json`);
        expect(mockLoggerInfo).toHaveBeenCalledWith(`[PUSHING-TO-BLOB][_CC_${environment}_${expected}.json]`);

        mockWriteToBlobWithSas.restore();
    });

    it('the filename of the file generated will be appended with the correct environment name when its tst', async () => {
        storage.__setMockService();
        config.azureContainer = "t1-catchcerts";
        config.externalAppUrl = 'some-tst-url'

        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        const expected = "20191015_11-01-58-135";
        const environment = "TST"

        await blob.saveReportingValidation(data, 'CC');

        expect(mockWriteToBlobWithSas.getCall(0).args[2]).toBe(`_CC_${environment}_${expected}.json`);
        expect(mockLoggerInfo).toHaveBeenCalledWith(`[PUSHING-TO-BLOB][_CC_${environment}_${expected}.json]`);

        mockWriteToBlobWithSas.restore();
    });

    it('the filename of the file generated will be appended with the correct environment name when its pre', async () => {
        storage.__setMockService();
        config.azureContainer = "t1-catchcerts";
        config.externalAppUrl = 'some-preprod-url'

        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        const expected = "20191015_11-01-58-135";
        const environment = "PRE"

        await blob.saveReportingValidation(data, 'CC');

        expect(mockWriteToBlobWithSas.getCall(0).args[2]).toBe(`_CC_${environment}_${expected}.json`);
        expect(mockLoggerInfo).toHaveBeenCalledWith(`[PUSHING-TO-BLOB][_CC_${environment}_${expected}.json]`);

        mockWriteToBlobWithSas.restore();
    });

    it('the filename of the file generated will be appended with the correct environment name when its premo', async () => {
        storage.__setMockService();
        config.azureContainer = "t1-catchcerts";
        config.externalAppUrl = 'some-premo-url'

        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        const expected = "20191015_11-01-58-135";
        const environment = "PREMO"

        await blob.saveReportingValidation(data, 'CC');

        expect(mockWriteToBlobWithSas.getCall(0).args[2]).toBe(`_CC_${environment}_${expected}.json`);
        expect(mockLoggerInfo).toHaveBeenCalledWith(`[PUSHING-TO-BLOB][_CC_${environment}_${expected}.json]`);

        mockWriteToBlobWithSas.restore();
    });

    it('the filename of the file generated will be appended with the correct environment name when its production', async () => {
        storage.__setMockService();
        config.azureContainer = "t1-catchcerts";
        config.externalAppUrl = 'some-other-gov.uk'

        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        const expected = "20191015_11-01-58-135";
        const environment = "PRD"

        await blob.saveReportingValidation(data, 'CC');

        expect(mockWriteToBlobWithSas.getCall(0).args[2]).toBe(`_CC_${environment}_${expected}.json`);
        expect(mockLoggerInfo).toHaveBeenCalledWith(`[PUSHING-TO-BLOB][_CC_${environment}_${expected}.json]`);

        mockWriteToBlobWithSas.restore();
    });

    it('the filename of the file generated will be appended with the correct environment name when its local host', async () => {
        storage.__setMockService();
        config.azureContainer = "t1-catchcerts";
        config.externalAppUrl = 'localhost:1234'

        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        const expected = "20191015_11-01-58-135";
        const environment = "localhost"

        await blob.saveReportingValidation(data, 'CC');

        expect(mockWriteToBlobWithSas.getCall(0).args[2]).toBe(`_CC_${environment}_${expected}.json`);
        expect(mockLoggerInfo).toHaveBeenCalledWith(`[PUSHING-TO-BLOB][_CC_${environment}_${expected}.json]`);

        mockWriteToBlobWithSas.restore();
    });

    it('should catch errors when attempting to save a reporting validation JSON object to a file', async () => {
        storage.__setMockServiceWithError();
        config.azureContainer = "t1-catchcerts";
        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        await expect(blob.saveReportingValidation(data, 'CC')).rejects.toThrow("Cannot save validation report to container t1-catchcerts");
        expect(mockLoggerError.getCall(0).args[0]).toContain('Cannot save validation report to container t1-catchcerts');
    });

});

describe('getExporterBehaviourData', () => {

    let mockLogError;

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('ExporterBehaviourMockError');

        storage.__setMockServiceWithError();

        await expect(blob.getExporterBehaviourData('connString')).rejects.toThrow(error);

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, 'Cannot read remote file exporter_behaviour.csv from container exporterbehaviour')
    });

    it('will return exporter behaviour data', async () => {
        storage.__setMockService();

        const expected = [
            { accountId: 'ID1', name: 'Exporter 1', score: 0.5 },
            { accountId: 'ID2', name: 'Exporter 2', score: 0.75 }
        ]

        const res = await blob.getExporterBehaviourData('connString');

        expect(res).toStrictEqual(expected);
    });

});

describe('getConversionFactorsData', () => {

    let mockLogError;

    const container = 'conversionfactors';
    const file = 'conversionfactors.csv'

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('ConversionFactorsMockError');

        storage.__setMockServiceWithError();

        await expect(blob.getConversionFactorsData('connString')).rejects.toThrow('Error: ConversionFactorsMockError');

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, `Cannot read remote file ${file} from container ${container}`);
    });

    it('will return conversion factors data', async () => {
        storage.__setMockService();

        const res = await blob.getConversionFactorsData('connString');

        expect(res).toHaveLength(1);
        expect(res[0]).toStrictEqual({
            presentation: "GUT",
            quotaStatus: "quota",
            riskScore: "1",
            species: "ALB",
            state: "FRE",
            toLiveWeightFactor: "1.11"
        });
    });

});

describe('getSpeciesData', () => {

    let mockLogError;

    const container = 'commoditycodedata';
    const file = 'commodity_code.txt'

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('SpeciesMockError');

        storage.__setMockServiceWithError();

        await expect(blob.getSpeciesData('connString')).rejects.toThrow('Error: SpeciesMockError');

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, `Cannot read remote file ${file} from container ${container}`);
    });

    it('will return species data', async () => {
        storage.__setMockService();

        const res = await blob.getSpeciesData('connString');

        expect(res.length).toBeGreaterThan(0);
    });

});

describe('getSpeciesAliases', () => {
    let mockLogError;

    const container = 'speciesmismatch';
    const file = 'speciesmismatch.json';

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('SpeciesAliasesMockError');

        storage.__setMockServiceWithError();

        await expect(blob.getSpeciesAliases('connString')).rejects.toThrow('Error: SpeciesAliasesMockError');

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, `Cannot read remote file ${file} from container ${container}`);
    });

    it('will return species aliases data', async () => {
        storage.__setMockService();

        const res = await blob.getSpeciesAliases('connString');

        expect(res).toBeInstanceOf(Object);
        expect.objectContaining({ "SQC": ["SQR", "SQZ", "SQI"] })
    });
});

describe('When getting vessels from a blob storage', () => {
    const connectionString: string = 'connection-string';
    let mockLoggerInfo;
    let mockLoggerError;

    beforeEach(() => {
        mockLoggerInfo = sinon.spy(logger, 'info');
        mockLoggerError = sinon.spy(logger, 'error');
    });

    afterEach(() => {
        mockLoggerInfo.restore();
        mockLoggerError.restore();

        sinon.restore();
    });

    it('should return a list of vessels with valid connection string', async () => {
        const expected: IVessel[] = [{
            "fishingVesselName": "3 STROKES",
            "ircs": null,
            "cfr": "GBR000C16710",
            "flag": "GBR",
            "homePort": "PORTAFERRY",
            "registrationNumber": "B906",
            "imo": null,
            "fishingLicenceNumber": "30621",
            "fishingLicenceValidFrom": "2017-06-05T00:00:00",
            "fishingLicenceValidTo": "2030-12-31T00:00:00",
            "adminPort": "BELFAST",
            "rssNumber": "C16710",
            "vesselLength": 5.12,
            "licenceHolderName": "MR  KEVIN MCMILLEN "
        }];

        storage.__setMockService();

        const result = await getVesselsData(connectionString);
        const vessels = [result[0]];

        expect(mockLoggerInfo.getCall(0).args[0]).toEqual('connecting to blob storage');
        expect(mockLoggerInfo.getCall(1).args[0]).toEqual('reading notification file');
        expect(mockLoggerInfo.getCall(2).args[0]).toEqual('parsing notification file to json');
        expect(mockLoggerInfo.getCall(3).args[0]).toEqual('searching notification json');
        expect(mockLoggerInfo.getCall(4).args[0]).toEqual('Reading vessel data from');
        expect(vessels).toEqual(expected);
    });

    it('should throw an error if vessels key is not defined in notification JSON', async () => {
        storage.__setMockServiceWithError();

        await expect(getVesselsData(connectionString)).rejects.toThrow('Cannot find vessel data in notification json, looking for key VesselAndLicenceData');

        expect(mockLoggerInfo.getCall(0).args[0]).toEqual('connecting to blob storage');
        expect(mockLoggerInfo.getCall(1).args[0]).toEqual('reading notification file');
        expect(mockLoggerInfo.getCall(2).args[0]).toEqual('parsing notification file to json');
        expect(mockLoggerInfo.getCall(3).args[0]).toEqual('searching notification json');
        expect(mockLoggerInfo.getCall(4)).toEqual(null);
    });

    it('should throw an error if an error is thorwn in the try block', async () => {
        const fakeError = { name: 'error', message: 'something went wrong' };
        const mockReadToText = sinon.stub(blob, 'readToText');
        mockReadToText.throws(fakeError);

        storage.__setMockService();

        await expect(getVesselsData(connectionString)).rejects.toThrow(fakeError.toString());

        expect(mockLoggerInfo.getCall(0).args[0]).toEqual('connecting to blob storage');
        expect(mockLoggerInfo.getCall(1).args[0]).toEqual('reading notification file');

        expect(mockLoggerError.getCall(0).args[0]).toEqual(fakeError);
        expect(mockLoggerError.getCall(1).args[0]).toEqual('Cannot read remote file Notification.json from container catchcertdata');

        mockLoggerError.restore();
    });
});