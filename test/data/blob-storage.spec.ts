import logger from "../../src/logger";
import * as blob from '../../src/data/blob-storage';
import { BlobServiceClient, ContainerClient, BlobClient, BlockBlobClient } from "@azure/storage-blob";
import config from '../../src/config';
import { IVessel } from "mmo-shared-reference-data";
import vesselsJSON from "../../data/vessels.json";
import speciesmismatch from "../../data/speciesmismatch.json";
import { Readable } from "stream";

jest.mock("@azure/storage-blob");

describe('saving validation reporting data to remote blob storage', () => {

    let mockLoggerInfo;
    let mockLoggerError;
    let mockBlobClient;
    let mockWriteToBlob;

    beforeEach(() => {
        config.azureContainer = "t1-catchcerts";
        config.externalAppUrl = 'some-snd-url';

        mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
        const containerObj = new ContainerClient(config.azureContainer);
        containerObj.getBlockBlobClient = (url) => {
            expect(url.includes('CC')).toBeTruthy();
            expect(url.includes('.json')).toBeTruthy();
            return new BlockBlobClient(url);
        };
        mockBlobClient.mockImplementation(() => ({
            getContainerClient: (container) => {
                expect(container).toEqual('t1-catchcerts');
                return containerObj;
            }
        }));

        mockWriteToBlob = jest.spyOn(blob, 'writeToBlob');
        mockLoggerInfo = jest.spyOn(logger, 'info');
        mockLoggerError = jest.spyOn(logger, 'error');
        jest.spyOn(global.Date, 'now').mockImplementation(() => new Date('2019-10-15T11:01:58.135Z').valueOf())
    });

    afterEach(() => {
        jest.restoreAllMocks()
    });

    it('should save a reporting validation JSON object to a file', async () => {
        mockWriteToBlob.mockResolvedValue({});
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

        expect(mockWriteToBlob.mock.calls[0][1]).toEqual(JSON.stringify(data));
        expect(mockLoggerInfo.mock.calls[0][0]).toEqual('[PUSHING-TO-BLOB][_CC_SND_20191015_11-01-58-135.json]');
        expect(result).toEqual(expected);
    });

    it('the filename of the file generated will be prepended with doc type', async () => {
        mockWriteToBlob.mockResolvedValue({});

        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        await blob.saveReportingValidation(data, 'CC');
        expect(mockLoggerInfo.mock.calls[0][0].includes('CC')).toBeTruthy();
    });

    it('the filename of the file generated will be appended with the date and time', async () => {
        mockWriteToBlob.mockResolvedValue({});

        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        const expected = "20191015_11-01-58-135";
        const environment = "SND"

        await blob.saveReportingValidation(data, 'CC');

        expect(mockLoggerInfo).toHaveBeenCalledWith(`[PUSHING-TO-BLOB][_CC_${environment}_${expected}.json]`);
    });

    it('the filename of the file generated will be appended with the correct environment name when its tst', async () => {
        mockWriteToBlob.mockResolvedValue({});
        config.azureContainer = "t1-catchcerts";
        config.externalAppUrl = 'some-tst-url'

        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        const expected = "20191015_11-01-58-135";
        const environment = "TST"

        await blob.saveReportingValidation(data, 'CC');

        expect(mockLoggerInfo).toHaveBeenCalledWith(`[PUSHING-TO-BLOB][_CC_${environment}_${expected}.json]`);
    });

    it('the filename of the file generated will be appended with the correct environment name when its pre', async () => {
        mockWriteToBlob.mockResolvedValue({});
        config.azureContainer = "t1-catchcerts";
        config.externalAppUrl = 'some-preprod-url'

        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        const expected = "20191015_11-01-58-135";
        const environment = "PRE"

        await blob.saveReportingValidation(data, 'CC');

        expect(mockLoggerInfo).toHaveBeenCalledWith(`[PUSHING-TO-BLOB][_CC_${environment}_${expected}.json]`);
    });

    it('the filename of the file generated will be appended with the correct environment name when its premo', async () => {
        mockWriteToBlob.mockResolvedValue({});
        config.azureContainer = "t1-catchcerts";
        config.externalAppUrl = 'some-premo-url'

        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        const expected = "20191015_11-01-58-135";
        const environment = "PREMO"

        await blob.saveReportingValidation(data, 'CC');

        expect(mockLoggerInfo).toHaveBeenCalledWith(`[PUSHING-TO-BLOB][_CC_${environment}_${expected}.json]`);
    });

    it('the filename of the file generated will be appended with the correct environment name when its production', async () => {
        mockWriteToBlob.mockResolvedValue({});
        config.azureContainer = "t1-catchcerts";
        config.externalAppUrl = 'some-other-gov.uk'

        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        const expected = "20191015_11-01-58-135";
        const environment = "PRD"

        await blob.saveReportingValidation(data, 'CC');

        expect(mockLoggerInfo).toHaveBeenCalledWith(`[PUSHING-TO-BLOB][_CC_${environment}_${expected}.json]`);
    });

    it('the filename of the file generated will be appended with the correct environment name when its local host', async () => {
        mockWriteToBlob.mockResolvedValue({});
        config.azureContainer = "t1-catchcerts";
        config.externalAppUrl = 'localhost:1234'

        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        const expected = "20191015_11-01-58-135";
        const environment = "localhost"

        await blob.saveReportingValidation(data, 'CC');

        expect(mockLoggerInfo).toHaveBeenCalledWith(`[PUSHING-TO-BLOB][_CC_${environment}_${expected}.json]`);
    });

    it('should catch errors when attempting to save a reporting validation JSON object to a file', async () => {
        mockWriteToBlob.mockResolvedValue({
            errorCode: 500
        });
        config.azureContainer = "t1-catchcerts";
        const data = {
            certificateId: 'GBR-3434-3434-3434',
            status: "COMPLETE"
        }

        await expect(blob.saveReportingValidation(data, 'CC')).rejects.toThrow("Cannot save validation report to container t1-catchcerts");
        expect(mockLoggerError.mock.calls[0][0]).toContain('Cannot save validation report to container t1-catchcerts');
    });

});

describe('getExporterBehaviourData', () => {

    let mockLogError;
    let mockReadToText;
    let mockBlobClient;

    const container = "exporterbehaviour";
    const file = "exporter_behaviour.csv";

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
        mockReadToText = jest.spyOn(blob, 'readToText');

        mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
        const containerObj = new ContainerClient(container);
        containerObj.getBlobClient = () => new BlobClient(file);
        mockBlobClient.mockImplementation(() => ({
            getContainerClient: () => containerObj,
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('ExporterBehaviourMockError');

        mockReadToText.mockRejectedValue(error);

        await expect(blob.getExporterBehaviourData('connString')).rejects.toThrow('ExporterBehaviourMockError');

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, 'Cannot read remote file exporter_behaviour.csv from container exporterbehaviour')
    });

    it('will return exporter behaviour data', async () => {
        mockReadToText.mockResolvedValue('accountId,contactId,name,score\nID1,,Exporter 1,0.5\nID2,,Exporter 2,0.75');

        const expected = [
            { accountId: 'ID1', name: 'Exporter 1', score: 0.5 },
            { accountId: 'ID2', name: 'Exporter 2', score: 0.75 }
        ];

        const res = await blob.getExporterBehaviourData('connString');

        expect(res).toStrictEqual(expected);
    });

});

describe('getConversionFactorsData', () => {

    let mockLogError;
    let mockReadToText;
    let mockBlobClient;

    const container = 'conversionfactors';
    const file = 'conversionfactors.csv'

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
        mockReadToText = jest.spyOn(blob, 'readToText');

        mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
        const containerObj = new ContainerClient(container);
        containerObj.getBlobClient = () => new BlobClient(file);
        mockBlobClient.mockImplementation(() => ({
            getContainerClient: () => containerObj,
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('ConversionFactorsMockError');

        mockReadToText.mockRejectedValue(error);

        await expect(blob.getConversionFactorsData('connString')).rejects.toThrow('ConversionFactorsMockError');

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, `Cannot read remote file ${file} from container ${container}`);
    });

    it('will return conversion factors data', async () => {
        mockReadToText.mockResolvedValue('species,state,presentation,toLiveWeightFactor,quotaStatus,riskScore\nALB,FRE,GUT,1.11,quota,1');

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
    let mockReadToText;
    let mockBlobClient;

    const container = 'commoditycodedata';
    const file = 'commodity_code.txt'

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
        mockReadToText = jest.spyOn(blob, 'readToText');

        mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
        const containerObj = new ContainerClient(container);
        containerObj.getBlobClient = () => new BlobClient(file);
        mockBlobClient.mockImplementation(() => ({
            getContainerClient: () => containerObj,
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('SpeciesMockError');
        mockReadToText.mockRejectedValue(error);
        await expect(blob.getSpeciesData('connString')).rejects.toThrow('Error: SpeciesMockError');

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, `Cannot read remote file ${file} from container ${container}`);
    });

    it('will return species data', async () => {
        const commodity_code = `faoCode	faoName	scientificName	preservationState	preservationDescr	presentationState	presentationDescr	commodityCode	commodityCodeDescr
ALB	Albacore	Thunnus alalunga	FRE	fresh	GUH	gutted and headed	03023190	"Fresh or chilled albacore or longfinned tunas ""Thunnus alalunga"" (excl. for industrial processing or preservation)"`
        mockReadToText.mockResolvedValue(commodity_code);
        const res = await blob.getSpeciesData('connString');

        expect(res.length).toBeGreaterThan(0);
    });

});

describe('getSpeciesAliases', () => {
    let mockLogError;
    let mockReadToText;
    let mockBlobClient;

    const container = 'speciesmismatch';
    const file = 'speciesmismatch.json';

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
        mockReadToText = jest.spyOn(blob, 'readToText');

        mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
        const containerObj = new ContainerClient(container);
        containerObj.getBlobClient = () => new BlobClient(file);
        mockBlobClient.mockImplementation(() => ({
            getContainerClient: () => containerObj,
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('SpeciesAliasesMockError');
        mockReadToText.mockRejectedValue(error);
        await expect(blob.getSpeciesAliases('connString')).rejects.toThrow('Error: SpeciesAliasesMockError');

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, `Cannot read remote file ${file} from container ${container}`);
    });

    it('will return species aliases data', async () => {
        mockReadToText.mockResolvedValue(JSON.stringify(speciesmismatch));
        const res = await blob.getSpeciesAliases('connString');

        expect(res).toBeInstanceOf(Object);
        expect.objectContaining({ "SQC": ["SQR", "SQZ", "SQI"] })
    });
});

describe('When getting vessels from a blob storage', () => {
    let mockLogError;
    let mockReadToText;
    let mockBlobClient;
    let mockLoggerInfo;

    const container = 'speciesmismatch';
    const file = 'speciesmismatch.json';

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
        mockReadToText = jest.spyOn(blob, 'readToText');
        mockLoggerInfo = jest.spyOn(logger, 'info');

        mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
        const containerObj = new ContainerClient(container);
        containerObj.getBlobClient = () => new BlobClient(file);
        mockBlobClient.mockImplementation(() => ({
            getContainerClient: () => containerObj,
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
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

        mockReadToText
            .mockReturnValueOnce('[{ "viewName": "VesselAndLicenceData", "blobName": "vessels.json" }]')
            .mockReturnValueOnce(JSON.stringify(vesselsJSON));

        const result = await blob.getVesselsData('connString');
        const vessels = [result[0]];

        expect(mockLoggerInfo.mock.calls[0][0]).toEqual('connecting to blob storage');
        expect(mockLoggerInfo.mock.calls[1][0]).toEqual('reading notification file');
        expect(mockLoggerInfo.mock.calls[2][0]).toEqual('parsing notification file to json');
        expect(mockLoggerInfo.mock.calls[3][0]).toEqual('searching notification json');
        expect(mockLoggerInfo.mock.calls[4][0]).toEqual('Reading vessel data from');
        expect(vessels).toEqual(expected);
    });

    it('should throw an error if vessels key is not defined in notification JSON', async () => {
        mockReadToText.mockReturnValueOnce('[{ "viewName": "other", "blobName": "vessels.json" }]');

        await expect(blob.getVesselsData('connString')).rejects.toThrow('Cannot find vessel data in notification json, looking for key VesselAndLicenceData');

        expect(mockLoggerInfo.mock.calls[0][0]).toEqual('connecting to blob storage');
        expect(mockLoggerInfo.mock.calls[1][0]).toEqual('reading notification file');
        expect(mockLoggerInfo.mock.calls[2][0]).toEqual('parsing notification file to json');
        expect(mockLoggerInfo.mock.calls[3][0]).toEqual('searching notification json');
        expect(mockLoggerInfo.mock.calls[4]).toEqual(undefined);
    });

    it('should throw an error if an error is thrown in the try block', async () => {
        const error = new Error('something went wrong')
        mockReadToText.mockRejectedValue(error);

        await expect(blob.getVesselsData('connString')).rejects.toThrow('Error: something went wrong');

        expect(mockLoggerInfo.mock.calls[0][0]).toEqual('connecting to blob storage');
        expect(mockLoggerInfo.mock.calls[1][0]).toEqual('reading notification file');

        expect(mockLogError.mock.calls[0][0]).toEqual(error);
        expect(mockLogError.mock.calls[1][0]).toEqual('Cannot read remote file Notification.json from container catchcertdata');
    });
});

describe('readToText', () => {

    let mockBlobClient;

    it('will return downloaded blob as a string', async () => {
        const stream = new Readable();
        stream.push("testing");
        stream.push(null);

        mockBlobClient = {
            download: () => {
                return {
                    readableStreamBody: stream
                }
            }
        }
        const result = await blob.readToText(mockBlobClient);
        expect(result).toEqual('testing');
    });
});

describe('writeToBlob', () => {

    let mockBlobClient;

    it('will call the upload stream with corect data', async () => {
        mockBlobClient = {
            uploadStream: (data) => {
                expect(data._readableState.length).toEqual(7);
                return true;
            }
        }
        await blob.writeToBlob(mockBlobClient, 'testing');
    });
});
