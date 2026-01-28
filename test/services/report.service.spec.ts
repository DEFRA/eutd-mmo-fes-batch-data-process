import moment from "moment";
import * as SUT from "../../src/services/report.service";
import * as blobStorage from "../../src/data/blob-storage";
import * as cache from "../../src/data/cache";
import * as shared from "mmo-shared-reference-data";
import * as catchCerts from "../../src/persistence/catchCerts";
import * as defraValidation from "../../src/persistence/defraValidation";
import * as extendedValidationDataService from "../../src/persistence/extendedValidationDataService";
import * as queryForLandings from "../../src/query/runCcQueryForLandings"
import * as report from "../../src/services/report.service";
import * as updater from "../../src/landings/landingsUpdater";
import * as certificatePerstence from "../../src/persistence/catchCerts";
import * as defraDataPersistence from "../../src/persistence/defraValidation";
import * as dynamicsValidation from "../../src/landings/transformations/dynamicsValidation";
import * as defraTradeValidation from "../../src/landings/transformations/defraTradeValidation";
import * as validation from "../../src/landings/transformations/defraValidation";
import * as species from "../../src/data/species";
import * as vessel from "../../src/data/vessel";
import * as risking from "../../src/data/risking";
import { ApplicationConfig } from "../../src/config";
import { CaseOneType, CaseTwoType, IDynamicsCatchCertificateCase } from "../../src/types/dynamicsValidation";
import { ServiceBusMessage } from "@azure/service-bus";
import logger from "../../src/logger";
import { BlobServiceClient, BlockBlobClient, ContainerClient } from "@azure/storage-blob";
import config from '../../src/config';
import { ISdPsQueryResult } from "../../src/types/query";
import { SdPsCaseTwoType, SdPsStatus } from "../../src/types/dynamicsValidationSdPs";
import { IDefraTradeSdPsStatus ,IDefraTradeProcessingStatement} from "../../src/types/defraTradeSdPsCase";
import {
  type IDocument,
} from "mmo-shared-reference-data";
import { IDynamicsProcessingStatementCase } from "../../src/types/dynamicsSdPsCase";
jest.mock("@azure/storage-blob");
import appConfig from '../../src/config'
import * as DefraMapper from "../../src/landings/transformations/defraTradeValidation";
import * as Shared from "mmo-shared-reference-data";


moment.suppressDeprecationWarnings = true;

const { v4:uuid } = require('uuid');

jest.mock('uuid');

Date.now = jest.fn(() => 1487076708000) //14.02.2017

ApplicationConfig.prototype.externalAppUrl = "http://localhost:3001";
ApplicationConfig.prototype.azureContainer = "t1-catchcerts";

describe('filterReports', () => {

  let mockReportEvents;

  beforeEach(() => {
    mockReportEvents = jest.spyOn(SUT, 'reportEvents');
    mockReportEvents.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will not any report unprocessed events', async () => {
    const unprocessed = [];

    await SUT.filterReports(unprocessed);

    expect(mockReportEvents).not.toHaveBeenCalled();
  });

  it('will all report unprocessed processing statement events', async () => {
    const unprocessed = [{ _id: '123', documentType: 'ProcessingStatement' }];

    await SUT.filterReports(unprocessed);

    expect(mockReportEvents).toHaveBeenCalledTimes(1);
    expect(mockReportEvents).toHaveBeenCalledWith(unprocessed, 'PS');
  });

  it('will all report unprocessed storage documents events', async () => {
    const unprocessed = [{ _id: '123', documentType: 'StorageDocument' }];

    await SUT.filterReports(unprocessed);

    expect(mockReportEvents).toHaveBeenCalledTimes(1);
    expect(mockReportEvents).toHaveBeenCalledWith(unprocessed, 'SD');
  });

  it('will all report unprocessed catch certificate events', async () => {
    const unprocessed = [{ _id: '123', documentType: 'CatchCertificate' }];

    await SUT.filterReports(unprocessed);

    expect(mockReportEvents).toHaveBeenCalledTimes(1);
    expect(mockReportEvents).toHaveBeenCalledWith(unprocessed, 'CC');
  });

  it('will all report unprocessed events', async () => {
    const unprocessed = [
      { _id: '123', documentType: 'ProcessingStatement' },
      { _id: '123', documentType: 'StorageDocument' },
      { _id: '123', documentType: 'CatchCertificate' }
    ];

    await SUT.filterReports(unprocessed);
    expect(mockReportEvents).toHaveBeenCalledTimes(3);
    expect(mockReportEvents).toHaveBeenNthCalledWith(1, unprocessed.filter(_ => _.documentType === "ProcessingStatement"), 'PS');
    expect(mockReportEvents).toHaveBeenNthCalledWith(2, unprocessed.filter(_ => _.documentType === "StorageDocument"), 'SD');
    expect(mockReportEvents).toHaveBeenNthCalledWith(3, unprocessed.filter(_ => _.documentType === "CatchCertificate"), 'CC');
  });
});

describe('processReports', () => {

  let mockGetUnprocessed;
  let mockBlobClient;
  let mockMarkAsProcessed;
  let mockLogError;
  let mockLogInfo;
  let mockWriteToBlob;

  beforeEach(() => {
    mockGetUnprocessed = jest.spyOn(defraValidation, 'getUnprocessedReports');
    
    config.azureContainer = "t1-catchcerts";
    config.externalAppUrl = 'some-snd-url';

    mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
    const containerObj = new ContainerClient(config.azureContainer);
    containerObj.getBlockBlobClient = (url) => {
        return new BlockBlobClient(url);
    };
    mockBlobClient.mockImplementation(() => ({
      getContainerClient: () => {
          return containerObj;
      }
    }));
    mockWriteToBlob = jest.spyOn(blobStorage, 'writeToBlob');
    
    mockMarkAsProcessed = jest.spyOn(defraValidation, 'markAsProcessed');
    mockLogError = jest.spyOn(logger, 'error');
    mockLogInfo = jest.spyOn(logger, 'info');
  })

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will not process any reports', async () => {
    mockGetUnprocessed.mockResolvedValueOnce(undefined);
    mockWriteToBlob.mockResolvedValue({});
    mockMarkAsProcessed.mockResolvedValue(null);

    await SUT.processReports();

    expect(mockLogInfo).toHaveBeenNthCalledWith(1, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][START]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(2, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: undefined]');
    expect(mockGetUnprocessed).toHaveBeenCalled();
    expect(mockWriteToBlob.mock.calls.length).toEqual(0);
  });

  it('will get all unprocessed reports and write them to the blob storage, per type', async () => {
    const unprocessed = [{ _id: '123', documentType: 'ProcessingStatement' }, { _id: '456', documentType: 'StorageDocument' }, { _id: '789', documentType: 'CatchCertificate' }];

    mockGetUnprocessed.mockResolvedValueOnce(unprocessed).mockResolvedValue([]);
    mockWriteToBlob.mockResolvedValue({});
    mockMarkAsProcessed.mockResolvedValue(null);

    await SUT.processReports();

    expect(mockLogInfo).toHaveBeenNthCalledWith(1, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][START]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(2, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: 3]');
    expect(mockGetUnprocessed).toHaveBeenCalled();
    expect(mockWriteToBlob.mock.calls.length).toEqual(3);
    expect(mockWriteToBlob.mock.calls[0][1]).toEqual("[{\"_id\":\"123\",\"documentType\":\"ProcessingStatement\"}]");
  });

  it('will mark all the reports which have been sent to the blob storage as having been processed', async () => {
    const unprocessed = [{ _id: '123', documentType: 'ProcessingStatement' }, { _id: '456', documentType: 'ProcessingStatement' }, { _id: '789', documentType: 'ProcessingStatement' }];

    mockGetUnprocessed.mockResolvedValueOnce(unprocessed).mockResolvedValue([]);
    mockWriteToBlob.mockResolvedValue({});
    mockMarkAsProcessed.mockResolvedValue(null);

    await SUT.processReports();

    expect(mockMarkAsProcessed).toHaveBeenCalledWith(['123', '456', '789']);
  });

  it('will log when the process has been started and log when it completes', async () => {
    const unprocessed = [{ _id: '123', documentType: 'ProcessingStatement' }, { _id: '456', documentType: 'ProcessingStatement' }, { _id: '789', documentType: 'ProcessingStatement' }];

    mockGetUnprocessed.mockResolvedValueOnce(unprocessed).mockResolvedValue([]);
    mockWriteToBlob.mockResolvedValue({});
    mockMarkAsProcessed.mockResolvedValue(null);

    await SUT.processReports();

    expect(mockLogInfo).toHaveBeenCalledTimes(6);
    expect(mockLogInfo).toHaveBeenNthCalledWith(1, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][START]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(2, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: 3]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(3, '[PUSHING-TO-BLOB][_PS_SND_20170214_12-51-48-000.json]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(4, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][SUCCESS][PS-PROCESSED: 3]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(5, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: 0]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(6, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][END]');
  });

  it('will log when the process has been skipped due to no records needing to be sent to blog storage', async () => {
    mockGetUnprocessed.mockResolvedValue([]);

    await SUT.processReports();

    expect(mockLogInfo).toHaveBeenCalledTimes(3);
    expect(mockLogInfo).toHaveBeenNthCalledWith(1, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][START]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(2, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: 0]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(3, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][END]');
  });

  it('if there is no Processing Statements, it will not attempt to push to blob', async () => {
    const unprocessed = [{ _id: '456', documentType: 'StorageDocument' }, { _id: '789', documentType: 'CatchCertificate' }];

    mockGetUnprocessed.mockResolvedValueOnce(unprocessed).mockResolvedValue([]);
    mockWriteToBlob.mockResolvedValue({});
    mockMarkAsProcessed.mockResolvedValue(null);

    await SUT.processReports();

    expect(mockGetUnprocessed).toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: 2]');
    expect(mockLogInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: 0]');
    expect(mockWriteToBlob).toHaveBeenCalledTimes(2);
    expect(mockWriteToBlob.mock.calls[0][1]).toEqual(JSON.stringify([unprocessed[0]]));
    expect(mockWriteToBlob.mock.calls[1][1]).toEqual(JSON.stringify([unprocessed[1]]));
  });

  it('if there is no Storage Documents, it will not attempt to push to blob', async () => {
    const unprocessed = [{ _id: '456', documentType: 'ProcessingStatement' }, { _id: '789', documentType: 'CatchCertificate' }];

    mockGetUnprocessed.mockResolvedValueOnce(unprocessed).mockResolvedValue([]);
    mockWriteToBlob.mockResolvedValue({});
    mockMarkAsProcessed.mockResolvedValue(null);

    await SUT.processReports();

    expect(mockGetUnprocessed).toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: 2]');
    expect(mockLogInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: 0]');
    expect(mockWriteToBlob).toHaveBeenCalledTimes(2);
    expect(mockWriteToBlob.mock.calls[0][1]).toEqual(JSON.stringify([unprocessed[0]]));
    expect(mockWriteToBlob.mock.calls[1][1]).toEqual(JSON.stringify([unprocessed[1]]));
  });

  it('if there is no Catch Certificates, it will not attempt to push to blob', async () => {
    const unprocessed = [{ _id: '456', documentType: 'ProcessingStatement' }, { _id: '789', documentType: 'StorageDocument' }];

    mockGetUnprocessed.mockResolvedValueOnce(unprocessed).mockResolvedValue([]);
    mockWriteToBlob.mockResolvedValue({});
    mockMarkAsProcessed.mockResolvedValue(null);

    await SUT.processReports();

    expect(mockGetUnprocessed).toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: 2]');
    expect(mockLogInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: 0]');
    expect(mockWriteToBlob).toHaveBeenCalledTimes(2);
    expect(mockWriteToBlob.mock.calls[0][1]).toEqual(JSON.stringify([unprocessed[0]]));
    expect(mockWriteToBlob.mock.calls[1][1]).toEqual(JSON.stringify([unprocessed[1]]));
  });

  it('will stop processing records and record the error if an error get thrown', async () => {
    const error = new Error('something bad happened');

    mockGetUnprocessed.mockResolvedValue([{ _id: '123', documentType: 'ProcessingStatement' }]);
    mockWriteToBlob.mockRejectedValue(error);
    mockMarkAsProcessed.mockResolvedValue(null);

    await SUT.processReports();

    expect(mockMarkAsProcessed).not.toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: 1]');
    expect(mockLogError).toHaveBeenNthCalledWith(1, `Cannot save validation report to container t1-catchcerts ${error.stack || error}`);
    expect(mockLogError).toHaveBeenNthCalledWith(2, `[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][ERROR]Cannot save validation report to container t1-catchcerts`);
  });

  it('should process batches until no more entries are retrieved', async () => {
    const unprocessed = [{ _id: '123', documentType: 'ProcessingStatement' }, { _id: '456', documentType: 'ProcessingStatement' }, { _id: '789', documentType: 'ProcessingStatement' }];

    mockGetUnprocessed.mockResolvedValueOnce(unprocessed).mockResolvedValueOnce(unprocessed).mockResolvedValue([]);
    mockWriteToBlob.mockResolvedValue({});
    mockMarkAsProcessed.mockResolvedValue(null);

    await SUT.processReports();

    expect(mockLogInfo).toHaveBeenCalledTimes(9);
    expect(mockLogInfo).toHaveBeenNthCalledWith(1, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][START]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(2, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: 3]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(3, '[PUSHING-TO-BLOB][_PS_SND_20170214_12-51-48-000.json]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(4, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][SUCCESS][PS-PROCESSED: 3]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(5, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: 3]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(6, '[PUSHING-TO-BLOB][_PS_SND_20170214_12-51-48-000.json]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(7, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][SUCCESS][PS-PROCESSED: 3]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(8, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][UNPROCESSED-REPORTS: 0]');
    expect(mockLogInfo).toHaveBeenNthCalledWith(9, '[RUN-LANDINGS-AND-REPORTING-JOB][PROCESS-REPORTS][END]');
  });

});

describe('reportNewLandings', () => {

  let mockRunCcQuery;
  let mockReportSubmitted;
  let mockRunUpdateLandings;

  const queryTime = moment.utc();
  const landings: shared.ILanding[] = [{
    dateTimeLanded: '2019-07-10',
    items: [],
    rssNumber: 'rssWA1',
    source: shared.LandingSources.CatchRecording
  }];
  const ccQueryResult: shared.ICcQueryResult[] = [
    {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.CatchRecording
        }
      ],
      source: shared.LandingSources.CatchRecording,
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        dataEverExpected: true,
        landingDataExpectedDate: "2017-02-12",
        landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
        landingStatus: "PENDING_LANDING_DATA"
      }
    },
    {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.CatchRecording
        }
      ],
      source: shared.LandingSources.CatchRecording,
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        dataEverExpected: true,
        landingDataExpectedDate: "2017-02-12",
        landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
        landingStatus: "PENDING_LANDING_DATA"
      }
    },
    {
      documentNumber: 'CC2',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.CatchRecording
        }
      ],
      source: shared.LandingSources.CatchRecording,
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        dataEverExpected: true,
        landingDataExpectedDate: "2017-02-12",
        landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
        landingStatus: "PENDING_LANDING_DATA"
      }
    },
    {
      documentNumber: 'CC2',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.CatchRecording
        }
      ],
      source: shared.LandingSources.CatchRecording,
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        dataEverExpected: true,
        landingDataExpectedDate: "2017-02-12",
        landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
        landingStatus: "PENDING_LANDING_DATA"
      }
    },
    {
      documentNumber: 'CC2',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.LandingDeclaration
        }
      ],
      source: shared.LandingSources.LandingDeclaration,
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        dataEverExpected: true,
        landingDataExpectedDate: "2017-02-12",
        landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
        landingStatus: "PENDING_LANDING_DATA"
      }
    },
    {
      documentNumber: 'CC3',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.CatchRecording
        }
      ],
      source: shared.LandingSources.CatchRecording,
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        dataEverExpected: true,
        landingDataExpectedDate: "2017-02-12",
        landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
        landingStatus: "PENDING_LANDING_DATA"
      }
    },
    {
      documentNumber: 'CC3',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-11',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.CatchRecording
        }
      ],
      source: shared.LandingSources.CatchRecording,
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        dataEverExpected: true,
        landingDataExpectedDate: "2017-02-12",
        landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
        landingStatus: "PENDING_LANDING_DATA"
      }
    },
    {
      documentNumber: 'CC4',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-11',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.CatchRecording
        }
      ],
      source: shared.LandingSources.CatchRecording,
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        dataEverExpected: true,
        landingDataExpectedDate: "2017-02-12",
        landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
        landingStatus: "PENDING_LANDING_DATA"
      }
    }
  ];

  beforeEach(() => {
    mockRunCcQuery = jest.spyOn(queryForLandings, 'runCcQueryForLandings');
    mockRunCcQuery.mockResolvedValue(ccQueryResult[Symbol.iterator]());

    mockReportSubmitted = jest.spyOn(report, 'reportCcSubmitted');
    mockReportSubmitted.mockResolvedValue(null);

    mockRunUpdateLandings = jest.spyOn(updater, 'runUpdateForLandings');
    mockRunUpdateLandings.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call runCcQueryForLandings with the landings', async () => {
    await SUT.reportNewLandings(landings, queryTime);

    expect(mockRunCcQuery).toHaveBeenCalledWith(landings);
  });

  it('will group and save each certificate', async () => {
    await SUT.reportNewLandings(landings, queryTime);

    expect(mockReportSubmitted).toHaveBeenCalledTimes(3);
    expect(mockReportSubmitted).toHaveBeenCalledWith(expect.anything());
  });

  it('will persist the new _status of each landing to mongo', async () => {
    await SUT.reportNewLandings(landings, queryTime);

    expect(mockRunUpdateLandings).toHaveBeenCalledTimes(3);
    expect(mockRunUpdateLandings).toHaveBeenNthCalledWith(1, [ccQueryResult[0], ccQueryResult[1]], 'CC1');
    expect(mockRunUpdateLandings).toHaveBeenNthCalledWith(2, [ccQueryResult[2], ccQueryResult[3]], 'CC2');
    expect(mockRunUpdateLandings).toHaveBeenNthCalledWith(3, [ccQueryResult[5]], 'CC3');
  });

});

describe('reportExceeding14DaysLandings', () => {

  const queryTime = moment.utc();
  const ccQueryResult: shared.ICcQueryResult[] = [
    {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      isExceeding14DayLimit: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {}
    },
    {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      isExceeding14DayLimit: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {}

    },
    {
      documentNumber: 'CC2',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      isExceeding14DayLimit: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {}

    },
    {
      documentNumber: 'CC2',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      isExceeding14DayLimit: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {}
    },
    {
      documentNumber: 'CC3',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      isExceeding14DayLimit: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {}
    }
  ];

  const certificates: any[] = [
    [{ documentNumber: 'CC1' }],
    [{ documentNumber: 'CC2' }],
    [{ documentNumber: 'CC3' }]
  ];
  let mockReport14DayLimitReached;
  let mockRunUpdateLandings;
  let mockGetCatchCerts;

  beforeEach(() => {

    mockReport14DayLimitReached = jest.spyOn(report, 'reportCc14DayLimitReached');
    mockReport14DayLimitReached.mockResolvedValue(null);

    mockRunUpdateLandings = jest.spyOn(updater, 'runUpdateForLandings');
    mockRunUpdateLandings.mockResolvedValue(null);

    mockGetCatchCerts = jest.spyOn(catchCerts, 'getCatchCerts');
    mockGetCatchCerts.mockResolvedValueOnce(certificates[0]);
    mockGetCatchCerts.mockResolvedValueOnce(certificates[1]);
    mockGetCatchCerts.mockResolvedValue(certificates[2]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will group and save each certificate', async () => {
    await SUT.reportExceeding14DaysLandings(ccQueryResult);

    const cc1Landings = [
      {
        ...ccQueryResult[0]
      },
      {
        ...ccQueryResult[1]
      }
    ];

    const cc2Landings = [
      {
        ...ccQueryResult[2]
      },
      {
        ...ccQueryResult[3]
      }
    ];

    const cc3Landings = [
      {
        ...ccQueryResult[4]
      }
    ];

    expect(mockReport14DayLimitReached).toHaveBeenCalledTimes(3);
    expect(mockReport14DayLimitReached).toHaveBeenNthCalledWith(1, cc1Landings);
    expect(mockReport14DayLimitReached).toHaveBeenNthCalledWith(2, cc2Landings);
    expect(mockReport14DayLimitReached).toHaveBeenNthCalledWith(3, cc3Landings);
  });

  it('will persist the new _status of each landing to mongo', async () => {
    await SUT.reportExceeding14DaysLandings(ccQueryResult);

    expect(mockRunUpdateLandings).toHaveBeenCalledTimes(3);
    expect(mockRunUpdateLandings).toHaveBeenNthCalledWith(1, [ccQueryResult[0], ccQueryResult[1]], 'CC1');
    expect(mockRunUpdateLandings).toHaveBeenNthCalledWith(2, [ccQueryResult[2], ccQueryResult[3]], 'CC2');
    expect(mockRunUpdateLandings).toHaveBeenNthCalledWith(3, [ccQueryResult[4]], 'CC3');
  });

});

describe('reportLandings', () => {

  const queryTime = moment.utc();
  const ccQueryResult: shared.ICcQueryResult[] = [
    {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {}
    }
  ];
  const certificates: any[] = [
    [{ documentNumber: 'CC1' }]
  ];

  let mockRunUpdateLandings: jest.SpyInstance;
  let mockGetCatchCerts: jest.SpyInstance;
  let mockReportSubmitted: jest.SpyInstance;
  let mockErrorLogger: jest.SpyInstance;

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  it('calls runUpdateForLandings with the right params', async () => {
    mockRunUpdateLandings = jest.spyOn(updater, 'runUpdateForLandings');
    mockRunUpdateLandings.mockResolvedValue(null);

    mockGetCatchCerts = jest.spyOn(catchCerts, 'getCatchCerts');
    mockGetCatchCerts.mockResolvedValueOnce(certificates[0]);

    mockReportSubmitted = jest.spyOn(report, 'reportCcSubmitted');
    mockReportSubmitted.mockResolvedValue(null);

    await SUT.reportLandings(ccQueryResult, report.reportCcSubmitted);

    expect(mockRunUpdateLandings).toHaveBeenCalledTimes(1);
    expect(mockRunUpdateLandings).toHaveBeenNthCalledWith(1, [ccQueryResult[0]], 'CC1');
  });

  it('will expose error if any errors have occurred', async () => {
    mockErrorLogger = jest.spyOn(logger, 'error');
    mockRunUpdateLandings = jest.spyOn(updater, 'runUpdateForLandings');
    mockRunUpdateLandings.mockRejectedValue(new Error('something terrible has occurred'));

    mockGetCatchCerts = jest.spyOn(catchCerts, 'getCatchCerts');
    mockGetCatchCerts.mockResolvedValueOnce(certificates[0]);

    mockReportSubmitted = jest.spyOn(report, 'reportCcSubmitted');
    mockReportSubmitted.mockResolvedValue(null);

    await SUT.reportLandings(ccQueryResult, report.reportCcSubmitted);

    expect(mockErrorLogger).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][CC1][ERROR][Error: something terrible has occurred]');
  });
});

describe('findNewLandings', () => {

  const queryTime = moment.utc();
  const landings: shared.ILanding[] = [{
    dateTimeLanded: '2019-07-10',
    items: [],
    rssNumber: 'rssWA1',
    source: shared.LandingSources.CatchRecording
  }];

  let mockIsHighRisk;

  beforeEach(() => {
    mockIsHighRisk = jest.spyOn(risking, 'isHighRisk');
    mockIsHighRisk.mockReturnValue(false);
  });

  afterEach(() => {
    mockIsHighRisk.mockRestore();
  })

  it('should include landings that have updated', () => {
    const ccQueryResults: shared.ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightOnCert: 121,
        rawWeightOnCert: 122,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        weightFactor: 5,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.CatchRecording
          }
        ],
        source: shared.LandingSources.CatchRecording,
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "PENDING_LANDING_DATA"
        }
      }
    ];

    expect(SUT.findNewLandings(ccQueryResults, landings, queryTime)).toHaveLength(1);
  });

  it('should include all landings that have updated', () => {
    const ccQueryResults: shared.ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightOnCert: 121,
        rawWeightOnCert: 122,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        weightFactor: 5,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.CatchRecording
          }
        ],
        source: shared.LandingSources.CatchRecording,
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "PENDING_LANDING_DATA"
        }
      },
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightOnCert: 121,
        rawWeightOnCert: 122,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        weightFactor: 5,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.CatchRecording
          }
        ],
        source: shared.LandingSources.CatchRecording,
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "PENDING_LANDING_DATA"
        }
      }
    ];

    expect(SUT.findNewLandings(ccQueryResults, landings, queryTime)).toHaveLength(2);
  });

  it('should include landings that have updated with dateTimeLanded', () => {
    const ccQueryResults: shared.ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightOnCert: 121,
        rawWeightOnCert: 122,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        weightFactor: 5,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.CatchRecording
          }
        ],
        source: shared.LandingSources.CatchRecording,
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "PENDING_LANDING_DATA"
        }
      }
    ];

    expect(SUT.findNewLandings(ccQueryResults, [{
      dateTimeLanded: '2019-07-10T00:30:00.000Z',
      items: [],
      rssNumber: 'rssWA1',
      source: shared.LandingSources.CatchRecording
    }], queryTime)).toHaveLength(1);
  });

  it('should include landings that have are overused', () => {
    mockIsHighRisk.mockReturnValue(true);

    const ccQueryResults: shared.ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightOnCert: 121,
        rawWeightOnCert: 122,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        weightFactor: 5,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.CatchRecording
          }
        ],
        source: shared.LandingSources.CatchRecording,
        isOverusedThisCert: false,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        isPreApproved: false,
        overUsedInfo: ['CC2'],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "LANDING_DATA_OVERUSED"
        }
      }
    ];

    expect(SUT.findNewLandings(ccQueryResults, [{
      dateTimeLanded: '2019-07-10T00:30:00.000Z',
      items: [],
      rssNumber: 'rssWA1',
      source: shared.LandingSources.CatchRecording
    }], queryTime)).toHaveLength(1);
  });

  it('should include landings with elog species mismatch', () => {
    const ccQueryResults: shared.ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightOnCert: 10,
        rawWeightOnCert: 10,
        weightOnAllCerts: 10,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 10,
        weightFactor: 1,
        isLandingExists: true,
        isSpeciesExists: false,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 10,
        weightOnLandingAllSpecies: 10,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.ELog
          }
        ],
        source: shared.LandingSources.ELog,
        isOverusedThisCert: false,
        isOverusedAllCerts: false,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "ELOG_SPECIES_MISMATCH"
        }
      }
    ];

    expect(SUT.findNewLandings(ccQueryResults, [{
      dateTimeLanded: '2019-07-10T00:30:00.000Z',
      items: [],
      rssNumber: 'rssWA1',
      source: shared.LandingSources.ELog
    }], queryTime)).toHaveLength(1);
  });

  it('should exclude landing which do not require an update', () => {
    const ccQueryResults: shared.ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightOnCert: 10,
        rawWeightOnCert: 10,
        weightOnAllCerts: 10,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 10,
        weightFactor: 1,
        isLandingExists: true,
        isSpeciesExists: false,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 10,
        weightOnLandingAllSpecies: 10,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.LandingDeclaration
          }
        ],
        source: shared.LandingSources.LandingDeclaration,
        isOverusedThisCert: false,
        isOverusedAllCerts: false,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "ELOG_SPECIES_MISMATCH"
        }
      },
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'COD',
        weightOnCert: 100,
        rawWeightOnCert: 100,
        weightOnAllCerts: 100,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        weightFactor: 1,
        isLandingExists: true,
        isSpeciesExists: false,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 10,
        weightOnLandingAllSpecies: 10,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.LandingDeclaration
          }
        ],
        source: shared.LandingSources.LandingDeclaration,
        isOverusedThisCert: false,
        isOverusedAllCerts: false,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "HAS_LANDING_DATA"
        }
      }
    ];

    expect(SUT.findNewLandings(ccQueryResults, [{
      dateTimeLanded: '2019-07-10T00:30:00.000Z',
      items: [],
      rssNumber: 'rssWA1',
      source: shared.LandingSources.LandingDeclaration
    }], queryTime)).toHaveLength(1);
  });

  it('should exclude all landings which do not require an update', () => {
    const ccQueryResults: shared.ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightOnCert: 10,
        rawWeightOnCert: 10,
        weightOnAllCerts: 10,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 10,
        weightFactor: 1,
        isLandingExists: true,
        isSpeciesExists: false,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 10,
        weightOnLandingAllSpecies: 10,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.LandingDeclaration
          }
        ],
        source: shared.LandingSources.LandingDeclaration,
        isOverusedThisCert: false,
        isOverusedAllCerts: false,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "ELOG_SPECIES_MISMATCH"
        }
      },
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'COD',
        weightOnCert: 100,
        rawWeightOnCert: 100,
        weightOnAllCerts: 100,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        weightFactor: 1,
        isLandingExists: true,
        isSpeciesExists: false,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 10,
        weightOnLandingAllSpecies: 10,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.LandingDeclaration
          }
        ],
        source: shared.LandingSources.LandingDeclaration,
        isOverusedThisCert: false,
        isOverusedAllCerts: false,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "HAS_LANDING_DATA"
        }
      }
    ];

    expect(SUT.findNewLandings(ccQueryResults, [{
      dateTimeLanded: '2019-07-10T00:30:00.000Z',
      items: [],
      rssNumber: 'rssWA1',
      source: shared.LandingSources.LandingDeclaration,
      _ignore: true
    }], queryTime)).toHaveLength(0);
  });

  it('should exclude reported landings that have are overused', () => {
    mockIsHighRisk.mockReturnValue(true);

    const ccQueryResults: shared.ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightOnCert: 121,
        rawWeightOnCert: 122,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        weightFactor: 5,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.CatchRecording
          }
        ],
        source: shared.LandingSources.CatchRecording,
        isOverusedThisCert: false,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        isPreApproved: false,
        overUsedInfo: ['CC2'],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "HAS_LANDING_DATA"
        }
      }
    ];

    expect(SUT.findNewLandings(ccQueryResults, [{
      dateTimeLanded: '2019-07-10T00:30:00.000Z',
      items: [],
      rssNumber: 'rssWA1',
      source: shared.LandingSources.CatchRecording,
      _ignore: true
    }], queryTime)).toHaveLength(0);
  });

  it('should exclude reported landings with elog species mismatch', () => {
    const ccQueryResults: shared.ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightOnCert: 10,
        rawWeightOnCert: 10,
        weightOnAllCerts: 10,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 10,
        weightFactor: 1,
        isLandingExists: true,
        isSpeciesExists: false,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 10,
        weightOnLandingAllSpecies: 10,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.ELog
          }
        ],
        source: shared.LandingSources.ELog,
        isOverusedThisCert: false,
        isOverusedAllCerts: false,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "ELOG_SPECIES_MISMATCH"
        }
      }
    ];

    expect(SUT.findNewLandings(ccQueryResults, [{
      dateTimeLanded: '2019-07-10T00:30:00.000Z',
      items: [],
      rssNumber: 'rssWA1',
      source: shared.LandingSources.ELog,
      _ignore: true
    }], queryTime)).toHaveLength(0);
  });

  it('should not include landings that have not updated', () => {
    const ccQueryResults: shared.ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA2',
        da: 'Guernsey',
        dateLanded: '2019-07-11',
        species: 'LBE',
        weightOnCert: 121,
        rawWeightOnCert: 122,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        weightFactor: 5,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.CatchRecording
          }
        ],
        source: shared.LandingSources.CatchRecording,
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "PENDING_LANDING_DATA"
        }
      }
    ];

    expect(SUT.findNewLandings(ccQueryResults, landings, queryTime)).toHaveLength(0);
  });

  it('should not include landings that have updated with dateTimeLanded', () => {
    const ccQueryResults: shared.ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightOnCert: 121,
        rawWeightOnCert: 122,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        weightFactor: 5,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.CatchRecording
          }
        ],
        source: shared.LandingSources.CatchRecording,
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "PENDING_LANDING_DATA"
        }
      }
    ];

    expect(SUT.findNewLandings(ccQueryResults, [{
      dateTimeLanded: '2019-07-11T00:30:00.000Z',
      items: [],
      rssNumber: 'rssWA1',
      source: shared.LandingSources.CatchRecording
    }], queryTime)).toHaveLength(0);
  });

  it('should not include landings outside of thier retrospective window', () => {
    const ccQueryResults: shared.ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightOnCert: 121,
        rawWeightOnCert: 122,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        weightFactor: 5,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.CatchRecording
          }
        ],
        source: shared.LandingSources.CatchRecording,
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "PENDING_LANDING_DATA"
        }
      }
    ];

    expect(SUT.findNewLandings(ccQueryResults, [{
      dateTimeLanded: '2019-07-10T00:30:00.000Z',
      items: [],
      rssNumber: 'rssWA1',
      source: shared.LandingSources.CatchRecording,
      _ignore: false
    }], moment.utc('2024-08-16'))).toHaveLength(0);
  });

  it('should include reported landings with elog species mismatch that reached the 14 day limit', () => {
    const ccQueryResults: shared.ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightOnCert: 10,
        rawWeightOnCert: 10,
        weightOnAllCerts: 10,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 10,
        weightFactor: 1,
        isLandingExists: true,
        isSpeciesExists: false,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 10,
        weightOnLandingAllSpecies: 10,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.ELog
          }
        ],
        source: shared.LandingSources.ELog,
        isOverusedThisCert: false,
        isOverusedAllCerts: false,
        isExceeding14DayLimit: true,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "ELOG_SPECIES_MISMATCH"
        }
      }
    ];

    expect(SUT.findNewLandings(ccQueryResults, [{
      dateTimeLanded: '2019-07-10T00:30:00.000Z',
      items: [],
      rssNumber: 'rssWA1',
      source: shared.LandingSources.ELog,
      _ignore: true
    }], queryTime)).toHaveLength(1);
  });

  it('should call the findNewLandings function with riskScore and threshold', () => {
    const ccQueryResults: shared.ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightOnCert: 121,
        rawWeightOnCert: 122,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        weightFactor: 5,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: true,
            weight: 30,
            liveWeight: 30,
            source: shared.LandingSources.CatchRecording
          }
        ],
        source: shared.LandingSources.CatchRecording,
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          dataEverExpected: true,
          landingDataExpectedDate: "2017-02-12",
          landingDataEndDate: moment.utc().add(1).format("YYYY-MM-DD"),
          landingStatus: "HAS_LANDING_DATA",
          riskScore: 0.2,
          threshold: 1
        }
      }
    ];

    expect(SUT.findNewLandings(ccQueryResults, landings, queryTime)).toHaveLength(0);
  })

});

describe('when a CC is submitted', () => {

  const dynamicsMappedData: shared.IDynamicsLandingCase[] = [{
    status: shared.LandingStatusType.PendingLandingData_DataExpected,
    id: 'rssWA12019-07-10',
    landingDate: '2019-07-10',
    numberOfFailedSubmissions: 0,
    species: 'LBE',
    is14DayLimitReached: false,
    state: 'FRE',
    presentation: 'SLC',
    speciesOverriddenByAdmin: true,
    cnCode: '1234',
    commodityCodeDescription: 'some description',
    scientificName: 'some scientific name',
    vesselName: 'a name vessel',
    vesselPln: 'WA1',
    vesselLength: 10,
    dataEverExpected: true,
    vesselAdministration: 'England',
    licenceHolder: 'VESSEL MASTER',
    source: 'CATCH_RECORDING',
    weight: 122,
    numberOfTotalSubmissions: 1,
    vesselOverriddenByAdmin: false,
    adminSpecies: "Sand smelt (ATP)",
    adminState: "Fresh",
    adminPresentation: "Whole",
    adminCommodityCode: "some commodity code",
    validation: {
      liveExportWeight: 121,
      totalWeightForSpecies: undefined,
      totalLiveForExportSpecies: 30,
      totalEstimatedForExportSpecies: 30,
      totalEstimatedWithTolerance: 56.1,
      totalRecordedAgainstLanding: 200,
      landedWeightExceededBy: 143.9,
      rawLandingsUrl: 'a url',
      salesNoteUrl: 'another url',
      isLegallyDue: false
    },
    risking: {
      vessel: "1",
      speciesRisk: "1",
      exporterRiskScore: "0.5",
      landingRiskScore: "0.5",
      highOrLowRisk: shared.LevelOfRiskType.Low
    },
    exporter: {
      fullName: 'Bob Exporter',
      companyName: 'Exporter Co',
      contactId: 'a contact id',
      accountId: 'an account id',
      address: { line1: 'B', city: 'T', postCode: 'P' },
      dynamicsAddress: { dynamicsData: 'original address' }
    },
    documentNumber: 'GBR-2020-CC-1BC924FCF',
    documentDate: 'a date',
    documentUrl: 'a document url',
    _correlationId: 'some-uuid-correlation-id',
    requestedByAdmin: false,
    exportedTo: {
      officialCountryName: "Nigeria",
      isoCodeAlpha2: "NG",
      isoCodeAlpha3: "NGA",
      isoNumericCode: "566"
    },
  }];

  const queryTime = moment.utc();
  const documentNumber = 'X-CC-1';
  const data: shared.ICcQueryResult[] = [{
    documentNumber: documentNumber,
    documentType: 'catchCertificate',
    createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
    status: 'COMPLETE',
    rssNumber: 'rssWA1',
    da: 'Guernsey',
    dateLanded: '2019-07-10',
    species: 'LBE',
    weightOnCert: 121,
    rawWeightOnCert: 122,
    weightOnAllCerts: 200,
    weightOnAllCertsBefore: 0,
    weightOnAllCertsAfter: 100,
    weightFactor: 5,
    isLandingExists: true,
    hasSalesNote: false,
    isSpeciesExists: true,
    numberOfLandingsOnDay: 1,
    weightOnLanding: 30,
    weightOnLandingAllSpecies: 30,
    landingTotalBreakdown: [
      {
        factor: 1,
        isEstimate: true,
        weight: 30,
        liveWeight: 30,
        source: shared.LandingSources.CatchRecording
      }
    ],
    isOverusedThisCert: true,
    isOverusedAllCerts: true,
    isExceeding14DayLimit: false,
    overUsedInfo: [],
    durationSinceCertCreation: moment.duration(
      queryTime
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
    durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
      moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
    durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
      moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
    extended: {
      landingId: 'rssWA12019-07-10',
      exporterName: 'Mr Bob',
      presentation: 'SLC',
      presentationName: 'sliced',
      vessel: 'DAYBREAK',
      fao: 'FAO27',
      pln: 'WA1',
      species: 'Lobster',
      state: 'FRE',
      stateName: 'fresh',
      commodityCode: '1234',
      investigation: {
        investigator: "Investigator Gadget",
        status: shared.InvestigationStatus.Open
      },
      transportationVehicle: 'directLanding',
      dataEverExpected: true,
      landingDataExpectedDate: '1901-01-01',
      landingDataEndDate: '2901-01-01',
    }
  }];

  const mockVesselIdx: jest.Mock = jest.fn();

  let mockGetExtendedValidationData;
  
  let mockInsertCcReport;
  let mockGetCertificate;
  let mockToCcDefraReport;
  let mockToLandings;
  let mockToDynamicsLandingDetails;
  let mockGetVesselIdx;
  let mockLogInfo;
  let mockLogWarn;
  let mockLogError;

  beforeEach(() => {
    mockLogInfo = jest.spyOn(logger, 'info');
    mockGetVesselIdx = jest.spyOn(cache, 'getVesselsIdx');
    mockGetVesselIdx.mockReturnValue(mockVesselIdx);
    mockGetExtendedValidationData = jest.spyOn(extendedValidationDataService, 'getExtendedValidationData');
    mockGetExtendedValidationData.mockResolvedValue(null);
    uuid.mockImplementation(() => 'some-uuid-correlation-id');

    mockInsertCcReport = jest.spyOn(defraDataPersistence, 'insertCcDefraValidationReport');
    mockGetCertificate = jest.spyOn(certificatePerstence, 'getCertificateByDocumentNumberWithNumberOfFailedAttempts');
    mockToCcDefraReport = jest.spyOn(shared, 'toCcDefraReport');
    mockToLandings = jest.spyOn(validation, 'toLandings');
    mockToDynamicsLandingDetails = jest.spyOn(dynamicsValidation, 'toDynamicsLandingDetails');
    mockLogInfo = jest.spyOn(logger, 'info');
    mockLogWarn = jest.spyOn(logger, 'warn');
    mockLogError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockGetExtendedValidationData.mockRestore();
    uuid.mockRestore();
    
    mockInsertCcReport.mockRestore();
    mockGetCertificate.mockRestore();
    mockToCcDefraReport.mockRestore();
    mockToLandings.mockRestore();
    mockToDynamicsLandingDetails.mockRestore();
    mockGetVesselIdx.mockRestore();
    mockLogInfo.mockRestore();
    mockLogWarn.mockRestore();
    mockLogError.mockRestore();
  });

  describe('for a landing update', () => {

    it('all methods required by reportCcSubmitted should be called with the correct data', async () => {
      const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE' };
      const getCatchCertificate = {
        ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
          exporterDetails: {}, products: [{
            species: 'Atlantic Herring (HER)',
          }]
        }
      };
      const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", _correlationId: 'some-uuid-correlation-id', requestedByAdmin: false };
      const toLandingsResponse = [{
        species: 'HER'
      }];

      mockInsertCcReport.mockResolvedValue(null);
      mockGetCertificate.mockResolvedValue(getCatchCertificate);
      mockToCcDefraReport.mockReturnValue(toReportResponse);
      mockToLandings.mockReturnValue(toLandingsResponse);
      mockToDynamicsLandingDetails.mockReturnValue(dynamicsMappedData);

      await SUT.reportCcSubmitted(data);

      expect(mockInsertCcReport).toHaveBeenCalledWith({ ...toReportResponse, landings: toLandingsResponse });
      expect(mockGetCertificate).toHaveBeenCalledWith('X-CC-1', 'catchCert');
      expect(mockToCcDefraReport).toHaveBeenCalledWith('X-CC-1', 'some-uuid-correlation-id', 'COMPLETE', false, mockVesselIdx, getCatchCertificate);
      expect(mockToLandings).toHaveBeenCalledWith(data);
      expect(mockInsertCcReport).toHaveBeenCalledWith(toReportResponse);
      expect(mockToDynamicsLandingDetails).toHaveBeenCalledTimes(1);
      expect(mockToDynamicsLandingDetails).toHaveBeenCalledWith(data, getCatchCertificate, 'some-uuid-correlation-id');
    });

    it('should catch any errors thrown', async () => {

      mockGetCertificate.mockImplementation(() => {
        throw 'error';
      });

      const caughtError = await SUT.reportCcSubmitted(data).catch((err) => err)
      expect(caughtError).toBe('error');
      expect(mockLogWarn).toHaveBeenNthCalledWith(1, '[RUN-LANDINGS-AND-REPORTING-JOB][getCertificateByDocumentNumberWithNumberOfFailedAttempts][error][ERROR]');
      expect(mockLogWarn).toHaveBeenNthCalledWith(2, '[RUN-LANDINGS-AND-REPORTING-JOB][ERROR][error]');
    });

    it('should catch any errors thrown when mapping', async () => {
      const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
      const getCatchCertificate = { ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: { products: [{
        species: 'Atlantic Herring (HER)',
      }]} };

      mockGetCertificate.mockResolvedValue(getCatchCertificate);
      mockToCcDefraReport.mockImplementation(() => {
        throw 'error';
      });

      const caughtError = await SUT.reportCcSubmitted(data).catch((err) =>  err)
      expect(caughtError).toBe('error');
      expect(mockLogWarn).toHaveBeenNthCalledWith(1, '[RUN-LANDINGS-AND-REPORTING-JOB][toCcDefraReport][error][ERROR]');
      expect(mockLogWarn).toHaveBeenNthCalledWith(2, '[RUN-LANDINGS-AND-REPORTING-JOB][ERROR][error]');
    });

    it('should catch any errors thrown when mapping landings', async () => {
      const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
      const getCatchCertificate = { ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: { products: [{
        species: 'Atlantic Herring (HER)',
      }]} };
      const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };

      mockGetCertificate.mockResolvedValue(getCatchCertificate);
      mockToCcDefraReport.mockReturnValue(toReportResponse);
      mockToLandings.mockImplementation(() => {
        throw 'error';
      });

      const caughtError = await SUT.reportCcSubmitted(data).catch((err) => err);
      expect(caughtError).toBe('error');
      expect(mockLogWarn).toHaveBeenNthCalledWith(1, '[RUN-LANDINGS-AND-REPORTING-JOB][toLandings][error][ERROR]');
      expect(mockLogWarn).toHaveBeenNthCalledWith(2, '[RUN-LANDINGS-AND-REPORTING-JOB][ERROR][error]');  
    });

    it('should catch any errors thrown when inserting defra valdation records', async () => {
      const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
      const getCatchCertificate = { ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: { products: [{
        species: 'Atlantic Herring (HER)',
      }]} };
      const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };
      const toLandingsResponse = [{
        species: 'HER'
      }];

      mockGetCertificate.mockResolvedValue(getCatchCertificate);
      mockToCcDefraReport.mockReturnValue(toReportResponse);
      mockToLandings.mockReturnValue(toLandingsResponse);
      mockInsertCcReport.mockImplementation(() => {
        throw 'error';
      });


      const caughtError = await SUT.reportCcSubmitted(data).catch((err) => err);
      expect(caughtError).toBe('error');
      expect(mockLogWarn).toHaveBeenNthCalledWith(1, '[RUN-LANDINGS-AND-REPORTING-JOB][insertCcDefraValidationReport][error][ERROR]');
      expect(mockLogWarn).toHaveBeenNthCalledWith(2, '[RUN-LANDINGS-AND-REPORTING-JOB][ERROR][error]');
    });

    it('should catch any errors thrown when landing has not exporter details', async () => {
      const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
      const getCatchCertificate = { ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: { products: [{
        species: 'Atlantic Herring (HER)',
      }], exporterDetails: undefined, transportation: { exportedTo: {}}}};
      const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };
      const toLandingsResponse = [{
        species: 'HER'
      }];
      
      mockInsertCcReport.mockResolvedValue(null);
      mockGetCertificate.mockResolvedValue(getCatchCertificate);
      mockToCcDefraReport.mockReturnValue(toReportResponse);
      mockToLandings.mockReturnValue(toLandingsResponse);
      mockToDynamicsLandingDetails.mockReturnValue(dynamicsMappedData);

      await SUT.reportCcSubmitted(data);
      expect(mockLogError).toHaveBeenCalledWith(`[RUN-LANDINGS-AND-REPORTING-JOB][FAIL][${documentNumber}][NO-EXPORTER-DETAILS]`);
    });

    it('should not set sales notes if date landed is invalid', async () => {
      const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE' };
      const getCatchCertificate = {
        ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
          exporterDetails: {}, products: [{
            species: 'Atlantic Herring (HER)',
          }]
        }
      };
      const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", _correlationId: 'some-uuid-correlation-id', requestedByAdmin: false };
      const toLandingsResponse = [{
        species: 'HER'
      }];

      mockInsertCcReport.mockResolvedValue(null);
      mockGetCertificate.mockResolvedValue(getCatchCertificate);
      mockToCcDefraReport.mockReturnValue(toReportResponse);
      mockToLandings.mockReturnValue(toLandingsResponse);
      mockToDynamicsLandingDetails.mockReturnValue(dynamicsMappedData);

      await SUT.reportCcSubmitted([{ ...data[0], dateLanded: 'invalid date' }]);

      expect(mockLogInfo).toHaveBeenCalledWith(`[RUN-LANDINGS-AND-REPORTING-JOB][${data[0].extended.landingId}][NO-SALES-NOTE]`);
    });

    it('should call required report 14 day limit reached landing with correct data', async () => {
      const getCatchCertificate = {
          documentNumber: documentNumber,
          status: 'COMPLETE',
          requestByAdmin: false,
          audit: [],
          exportData: {
              product: [{
                  species: 'Atlantic Herring (HER)'
              }],
              exporterDetails: {
                exporterFullName: "Joe Blogg",
                exporterCompanyName: "Company name",
                addressOne: "Building and street",
                addressTwo: "building and street 2",
                townCity: "Aberdeen",
                postcode: "AB1 2XX"
              }
          }
      };

      mockGetCertificate.mockResolvedValue(getCatchCertificate);
      mockToDynamicsLandingDetails.mockReturnValue(dynamicsMappedData);

      await SUT.reportCc14DayLimitReached(data);

      expect(mockLogInfo).toHaveBeenNthCalledWith(1, '[REPORTING-CC-14-DAY-LIMIT-REACHED][DOCUMENT-NUMBER][X-CC-1]');
      expect(mockGetCertificate).toHaveBeenCalledWith('X-CC-1', 'catchCert');
      expect(mockGetExtendedValidationData).toHaveBeenCalledWith('2019-07-10', 'rssWA1', 'salesNotes');
      expect(mockGetExtendedValidationData).toHaveBeenCalledTimes(1);
      expect(mockToDynamicsLandingDetails).toHaveBeenCalledTimes(1);
      expect(mockToDynamicsLandingDetails).toHaveBeenCalledWith(data, getCatchCertificate, 'some-uuid-correlation-id');
      expect(mockLogInfo).toHaveBeenNthCalledWith(3, '[REPORTING-CC-14-DAY-LIMIT-REACHED][DOCUMENT-NUMBER][X-CC-1][CORRELATION-ID][some-uuid-correlation-id][NUMBER-OF-LANDINGS][1]');
      expect(mockLogInfo).toHaveBeenNthCalledWith(4, '[REPORT-CC-14-DAY-LIMIT-REACHED][SUCCESS][X-CC-1]');
  });

  it('should not add to report queue if no validations are given', async () => {
      const getCatchCertificate = {
          documentNumber: documentNumber,
          status: 'COMPLETE',
          requestByAdmin: false,
          audit: [],
          exportData: {
              product: [{
                  species: 'Atlantic Herring (HER)'
              }]
          }
      };

      mockGetCertificate.mockResolvedValue(getCatchCertificate);
      mockToDynamicsLandingDetails.mockReturnValue(dynamicsMappedData);

      await SUT.reportCc14DayLimitReached([]);

      expect(mockLogInfo).not.toHaveBeenCalled();
      expect(mockGetCertificate).not.toHaveBeenCalled();
      expect(mockToDynamicsLandingDetails).not.toHaveBeenCalled();
  });

  it('should not add to report queue if validations are undefined', async () => {
    const getCatchCertificate = {
        documentNumber: documentNumber,
        status: 'COMPLETE',
        requestByAdmin: false,
        audit: [],
        exportData: {
            product: [{
                species: 'Atlantic Herring (HER)'
            }]
        }
    };

    mockGetCertificate.mockResolvedValue(getCatchCertificate);
    mockToDynamicsLandingDetails.mockReturnValue(dynamicsMappedData);

    await SUT.reportCc14DayLimitReached(undefined);

    expect(mockLogInfo).not.toHaveBeenCalled();
    expect(mockGetCertificate).not.toHaveBeenCalled();
    expect(mockToDynamicsLandingDetails).not.toHaveBeenCalled();
  });

  it('should not add to report queue if catch certificate does not contain export details', async () => {
      const getCatchCertificate = {
        __t: "catchCert",
        createdBy: "Bob",
        documentNumber: documentNumber,
        status: "COMPLETE",
        exportData: {
          products: [{
            species: "Greater argentine (ARU)",
            speciesId: "GBR-2020-CC-6F0C3CE8C-c203728d-1c57-4c14-92c2-b1401d327b97",
            speciesCode: "ARU",
            commodityCode: "03048990",
            state: {
              code: "FRO",
              name: "frozen"
            },
            presentation: {
              code: "FIS",
              name: "filleted and skinned"
            },
            factor: 2,
            caughtBy: [{
              vessel: "SOUTHERN STAR",
              pln: "N904",
              id: "GBR-2020-CC-6F0C3CE8C-1602180798",
              date: "2020-10-08",
              faoArea: "FAO27",
              weight: 100,
              _status: "PENDING_LANDING_DATA"
            }]
          }]
        },
        createdByEmail: "foo@foo.com",
        documentUri: "_document.pdf",
        createdAt: "2020-10-08T18:20:22.000Z"
      };

      mockGetCertificate.mockResolvedValue(getCatchCertificate);

      await SUT.reportCc14DayLimitReached(data);

      expect(mockGetCertificate).toHaveBeenCalled();
      expect(mockGetCertificate).toHaveBeenCalledWith(documentNumber, 'catchCert');
      expect(mockToDynamicsLandingDetails).not.toHaveBeenCalled()
      expect(mockToDynamicsLandingDetails).not.toHaveBeenCalled();

      expect(mockLogError).toHaveBeenCalledWith('[REPORT-CC-14-DAY-LIMIT-REACHED][FAIL][X-CC-1][NO-EXPORTER-DETAILS]');
      expect(mockLogInfo).not.toHaveBeenCalledWith('[REPORT-CC-14-DAY-LIMIT-REACHED][ADD-TO-REPORT-QUEUE][SUCCESS]');
  });

  it('should not call get extended validation data if date is invalid', async () => {
    const data: shared.ICcQueryResult[] = [{
      documentNumber: documentNumber,
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: 'invalid-date',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown : [
          {
              factor: 1,
              isEstimate: true,
              weight: 30,
              liveWeight: 30,
              source: shared.LandingSources.CatchRecording
          }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
         queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
         moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
         moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
          landingId: 'rssWA12019-07-10',
          exporterName: 'Mr Bob',
          presentation: 'SLC',
          presentationName: 'sliced',
          vessel: 'DAYBREAK',
          fao: 'FAO27',
          pln: 'WA1',
          species: 'Lobster',
          state: 'FRE',
          stateName: 'fresh',
          commodityCode: '1234',
          investigation: {
              investigator: "Investigator Gadget",
              status: shared.InvestigationStatus.Open
          },
          transportationVehicle: 'directLanding',
          dataEverExpected: true,
          landingDataExpectedDate: '1901-01-01',
          landingDataEndDate: '2901-01-01',
      }
    }];

    const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
    const getCatchCertificate = { ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: { exporterDetails: {}, products: [{
                species: 'Atlantic Herring (HER)',
            }]} };

    mockGetCertificate.mockResolvedValue(getCatchCertificate);

    await SUT.reportCc14DayLimitReached(data);

    expect(mockGetExtendedValidationData).toHaveBeenCalledTimes(0);
    expect(data[0].hasSalesNote).toBeUndefined();
  });

  it('should not call get extended validation data if rssNumber is missing', async () => {
    const data: shared.ICcQueryResult[] = [{
      documentNumber: documentNumber,
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: '',
      da: 'Guernsey',
      dateLanded: '2023-01-01',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown : [
          {
              factor: 1,
              isEstimate: true,
              weight: 30,
              liveWeight: 30,
              source: shared.LandingSources.CatchRecording
          }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
         queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
         moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
         moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
          landingId: 'rssWA12019-07-10',
          exporterName: 'Mr Bob',
          presentation: 'SLC',
          presentationName: 'sliced',
          vessel: 'DAYBREAK',
          fao: 'FAO27',
          pln: 'WA1',
          species: 'Lobster',
          state: 'FRE',
          stateName: 'fresh',
          commodityCode: '1234',
          investigation: {
              investigator: "Investigator Gadget",
              status: shared.InvestigationStatus.Open
          },
          transportationVehicle: 'directLanding',
          dataEverExpected: true,
          landingDataExpectedDate: '1901-01-01',
          landingDataEndDate: '2901-01-01',
      }
    }];

    const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
    const getCatchCertificate = { ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: { exporterDetails: {}, products: [{
                species: 'Atlantic Herring (HER)',
            }]} };

    mockGetCertificate.mockResolvedValue(getCatchCertificate);

    await SUT.reportCc14DayLimitReached(data);

    expect(mockGetExtendedValidationData).toHaveBeenCalledTimes(0);
    expect(data[0].hasSalesNote).toBeUndefined();
  });

  it('should call get extended validation data if landing data does not exist', async () => {
    const data: shared.ICcQueryResult[] = [{
      documentNumber: documentNumber,
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2023-01-01',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: false,
      isSpeciesExists: false,
      numberOfLandingsOnDay: 0,
      weightOnLanding: 0,
      weightOnLandingAllSpecies: 0,
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
         queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: null,
      durationBetweenCertCreationAndLastLandingRetrieved: null,
      extended: {
          landingId: 'rssWA12019-07-10',
          exporterName: 'Mr Bob',
          presentation: 'SLC',
          presentationName: 'sliced',
          vessel: 'DAYBREAK',
          fao: 'FAO27',
          pln: 'WA1',
          species: 'Lobster',
          state: 'FRE',
          stateName: 'fresh',
          commodityCode: '1234',
          investigation: {
              investigator: "Investigator Gadget",
              status: shared.InvestigationStatus.Open
          },
          transportationVehicle: 'directLanding',
          dataEverExpected: true,
          landingDataExpectedDate: '1901-01-01',
          landingDataEndDate: '2901-01-01',
      }
    }];

    const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
    const getCatchCertificate = { ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: { exporterDetails: {}, products: [{
                species: 'Atlantic Herring (HER)',
            }]} };

    mockGetCertificate.mockResolvedValue(getCatchCertificate);

    await SUT.reportCc14DayLimitReached(data);

    expect(mockGetExtendedValidationData).toHaveBeenCalledTimes(1);
    expect(data[0].hasSalesNote).toBe(false);
  });

  it('should not call get extended validation data if landing data is not expected', async () => {
    const data: shared.ICcQueryResult[] = [{
      documentNumber: documentNumber,
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: 'invalid-date',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown : [
          {
              factor: 1,
              isEstimate: true,
              weight: 30,
              liveWeight: 30,
              source: shared.LandingSources.CatchRecording
          }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
         queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
         moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
         moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
          landingId: 'rssWA12019-07-10',
          exporterName: 'Mr Bob',
          presentation: 'SLC',
          presentationName: 'sliced',
          vessel: 'DAYBREAK',
          fao: 'FAO27',
          pln: 'WA1',
          species: 'Lobster',
          state: 'FRE',
          stateName: 'fresh',
          commodityCode: '1234',
          investigation: {
              investigator: "Investigator Gadget",
              status: shared.InvestigationStatus.Open
          },
          transportationVehicle: 'directLanding',
          dataEverExpected: false
      }
    }];

    const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
    const getCatchCertificate = { ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: { exporterDetails: {}, products: [{
                species: 'Atlantic Herring (HER)',
            }]} };

    mockGetCertificate.mockResolvedValue(getCatchCertificate);

    await SUT.reportCc14DayLimitReached(data);

    expect(mockGetExtendedValidationData).toHaveBeenCalledTimes(0);
    expect(data[0].hasSalesNote).toBeUndefined();
  });
  });
});

describe("Report reSubmitted", () => {

  let mockGetCertificate;
  let mockToCCDefraTrade;
  let mockToDynamicsCcCase;

  beforeEach(() => {
    appConfig.runResubmitCcToTrade = true;
    mockGetCertificate = jest.spyOn(certificatePerstence, 'getCertificateByDocumentNumberWithNumberOfFailedAttempts');
    mockToCCDefraTrade = jest.spyOn(report, 'reportCcToTrade');
    mockToDynamicsCcCase = jest.spyOn(dynamicsValidation, 'toDynamicsCcCase');
  });

  afterEach(() => {
    mockToDynamicsCcCase.mockRestore();
    jest.restoreAllMocks();
  });

  describe('when a CC is reSubmitted', () => {

    const queryTime = moment.utc();
    const documentNumber = 'X-CC-1';
    const data: shared.ICcQueryResult[] = [{
      documentNumber: documentNumber,
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      hasSalesNote: false,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        landingId: 'rssWA12019-07-10',
        exporterName: 'Mr Bob',
        presentation: 'SLC',
        presentationName: 'sliced',
        vessel: 'DAYBREAK',
        fao: 'FAO27',
        pln: 'WA1',
        species: 'Lobster',
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '1234',
        investigation: {
          investigator: "Investigator Gadget",
          status: shared.InvestigationStatus.Open
        },
        transportationVehicle: 'directLanding',
        dataEverExpected: true,
        landingDataExpectedDate: '1901-01-01',
        landingDataEndDate: '2901-01-01',
      }
    },
    {
      documentNumber: documentNumber,
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      hasSalesNote: false,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: shared.LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        landingId: 'rssWA12019-07-11',
        exporterName: 'Mr Bob',
        presentation: 'SLC',
        presentationName: 'sliced',
        vessel: 'DAYBREAK',
        fao: 'FAO27',
        pln: 'WA1',
        species: 'Lobster',
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '1234',
        investigation: {
          investigator: "Investigator Gadget",
          status: shared.InvestigationStatus.Open
        },
        transportationVehicle: 'directLanding',
        dataEverExpected: true,
        landingDataExpectedDate: '1901-01-01',
        landingDataEndDate: '2901-01-01',
        commodityCodeDescription: 'blah blah'
      }
    }];

    let mockCommoditySearch;
    let mockGetCertificateByDocumentNumberWithNumberOfFailedAttempts;
    let mockLogWarn;
    let mockLogError;

    beforeEach(() => {
      mockCommoditySearch = jest.spyOn(species, 'commoditySearch');
      mockGetCertificateByDocumentNumberWithNumberOfFailedAttempts = jest.spyOn(certificatePerstence, 'getCertificateByDocumentNumberWithNumberOfFailedAttempts')
      uuid.mockImplementation(() => 'some-uuid-correlation-id');

      mockLogWarn = jest.spyOn(logger, 'warn');
      mockLogError = jest.spyOn(logger, 'error');
    });

    afterEach(() => {
      uuid.mockRestore();

      mockLogWarn.mockRestore();
      mockLogError.mockRestore();
    });

    it('all methods required by resendCcToTrade should be called with the correct data', async () => {
      const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id', };
      const getCatchCertificate = {
        ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
          exporterDetails: {}, products: [{
            species: 'Atlantic Herring (HER)',
          }]
        }
      };
      const commoditySearch = [{
        code: "1234",
        description: "1234-description"
      }]

      mockGetCertificateByDocumentNumberWithNumberOfFailedAttempts.mockResolvedValue(getCatchCertificate)
      mockCommoditySearch.mockReturnValue(commoditySearch)
      mockToDynamicsCcCase.mockReturnValue(mockMapCcResponse);
      mockToCCDefraTrade.mockResolvedValue(undefined);
      mockGetCertificate.mockResolvedValue(getCatchCertificate);

      await SUT.resendCcToTrade(data);

      expect(data[0].extended.commodityCodeDescription).toBe('1234-description');
      expect(data[1].extended.commodityCodeDescription).toBe('blah blah');
      expect(mockCommoditySearch).toHaveBeenCalled();
      expect(mockCommoditySearch).toHaveBeenCalledWith("LBE", "FRE", "SLC");
      expect(mockGetCertificate).toHaveBeenCalledWith('X-CC-1', 'catchCert');
      expect(mockToDynamicsCcCase).toHaveBeenCalledTimes(1);
      expect(mockToCCDefraTrade).toHaveBeenCalledTimes(1);
      expect(mockToCCDefraTrade).toHaveBeenCalledWith(getCatchCertificate, shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED, mockMapCcResponse, data);
    });

    it('should catch any errors thrown', async () => {

      mockGetCertificate.mockImplementation(() => {
        throw 'error';
      });

      const caughtError = await SUT.resendCcToTrade(data).catch((err) => err)
      expect(caughtError).toBe('error');
      expect(mockLogWarn).toHaveBeenNthCalledWith(1, '[REREPORT-CC-SUBMITTED][ERROR][getCertificateByDocumentNumberWithNumberOfFailedAttempts][error]');
      expect(mockLogError).toHaveBeenNthCalledWith(1, '[REREPORT-CC-SUBMITTED][ERROR][error]');

    });

    it('should catch the error of no exporter details', async () => {
      const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id', };
      const getCatchCertificate = {
        ...mockMapCcResponse, requestByAdmin: false, audit: []
      };
      const commoditySearch = [{
        code: "1234",
        description: "1234-description"
      }]

      mockGetCertificateByDocumentNumberWithNumberOfFailedAttempts.mockResolvedValue(getCatchCertificate)
      mockCommoditySearch.mockReturnValue(commoditySearch)
      mockToDynamicsCcCase.mockReturnValue(mockMapCcResponse);
      mockToCCDefraTrade.mockResolvedValue(undefined);
      mockGetCertificate.mockResolvedValue(getCatchCertificate);

      await SUT.resendCcToTrade(data);

      expect(mockLogError).toHaveBeenNthCalledWith(1, '[REREPORT-CC-SUBMITTED][FAIL][X-CC-1][NO-EXPORTER-DETAILS]');
    });
       it('should catch any errors thrown for PS', async () => {
  const psQueryResultsnew: ISdPsQueryResult[] = [{
        documentNumber: "PS1",
        catchCertificateNumber: "PS2",
        catchCertificateType: 'uk',
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "Atlantic cod (COD)",
        scientificName: "Gadus morhua",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: [],
        isMismatch: false,
        overAllocatedByWeight: 0,
        da: 'England',
        extended: {
          id: 'PS2-1610018839',
        }
      }];
      mockGetCertificate.mockImplementation(() => {
        throw 'error';
      });

      const caughtError = await SUT.resendPsToTradeDynamics(psQueryResultsnew).catch((err) => err)
      expect(caughtError).toBe('error');
      expect(mockLogError).toHaveBeenNthCalledWith(1, '[REREPORT-PS-SUBMITTED][ERROR][error]');

    });
  });
   describe('when a PS is submitted', () => {
    const certificateId = 'XXX-PS-XXX';

    let mockLogInfo;
    let mockLogError;
    let mockDynamicsValidation;

    beforeEach(() => {
      mockLogInfo = jest.spyOn(logger, 'info');
      uuid.mockImplementation(() => 'some-uuid-correlation-id');
      mockLogError = jest.spyOn(logger, 'error');
      mockDynamicsValidation = jest.spyOn(dynamicsValidation, 'toDynamicsPs');
    });

    it('will log if the referenced document can not be found', async () => {
      mockGetCertificate.mockResolvedValue(null);

      const input: any[] = [{ documentNumber: certificateId }];

      await SUT.resendPsToTradeDynamics(input);

      expect(mockLogInfo).toHaveBeenCalledTimes(3);
      expect(mockLogInfo).toHaveBeenNthCalledWith(
        2,
        `[DATA-HUB][REPORT-PS-SUBMITTED][${certificateId}]`,
      );
      expect(mockLogInfo).toHaveBeenNthCalledWith(
        3,
        `[DATA-HUB][REPORT-PS-SUBMITTED][${certificateId}][NOT-FOUND]`,
      );

      expect(mockDynamicsValidation).not.toHaveBeenCalled();
    });

    it('will call toDynamicsPs, and defraTrade if the document is found', async () => {
      const examplePs: shared.IDocument = {
        createdAt: new Date('2020-06-12T20:12:28.201Z'),
        __t: 'processingStatement',
        createdBy: 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12',
        createdByEmail: 'foo@foo.com',
        status: 'COMPLETE',
        documentNumber: 'GBR-2020-SD-C90A88218',
        requestByAdmin: false,
        audit: [
          {
            eventType: shared.AuditEventTypes.PreApproved,
            triggeredBy: 'Bob',
            timestamp: new Date(),
            data: null,
          },
          {
            eventType: shared.AuditEventTypes.Investigated,
            triggeredBy: 'Bob',
            timestamp: new Date(),
            data: null,
          },
        ],
        userReference: 'My Reference',
        exportData: {
          exporterDetails: {
            contactId: 'a contact id',
            accountId: 'an account id',
            exporterCompanyName: 'Exporter Ltd',
            addressOne: 'Building Name',
            buildingName: 'BuildingName',
            buildingNumber: 'BuildingNumber',
            subBuildingName: 'SubBuildingName',
            streetName: 'StreetName',
            country: 'Country',
            county: 'County',
            townCity: 'Town',
            postcode: 'TF1 3AA',
            _dynamicsAddress: { dynamicsData: 'original address' },
          },
          catches: [
            {
              product: 'Atlantic herring (HER)',
              commodityCode: '0345603',
              productWeight: '1000',
              dateOfUnloading: '12/06/2020',
              placeOfUnloading: 'Dover',
              transportUnloadedFrom: 'BA078',
              certificateNumber: 'GBR-3453-3453-3443',
              weightOnCC: '1000',
              scientificName: 'Gadus morhua',
            },
          ],
          storageFacilities: [
            {
              facilityName: 'Exporter Person',
              facilityAddressOne: 'Building Name',
              facilityAddressTwo: 'Building Street',
              facilityTownCity: 'Town',
              facilityPostcode: 'XX12 X34',
            },
          ],
          exportedTo: {
            officialCountryName: 'Nigeria',
            isoCodeAlpha2: 'NG',
            isoCodeAlpha3: 'NGA',
            isoNumericCode: '566',
          },
          transportation: {
            vehicle: 'truck',
            cmr: true,
          },
        },
        documentUri: '_0d8f98a1-c372-47c4-803f-dafd642c4941.pdf',
        numberOfFailedAttempts: 5,
      };

      const input: ISdPsQueryResult = {
        documentNumber: 'GBR-2020-PS-C90A88218',
        catchCertificateNumber: 'SD2',
        documentType: 'SD',
        createdAt: '2020-01-01',
        status: 'COMPLETE',
        species: 'Atlantic cod (COD)',
        commodityCode: 'FRESHCOD',
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        isMismatch: false,
        overAllocatedByWeight: 0,
        overUsedInfo: [],
        da: null,
        extended: {
          id: 'PS2-1610018839',
        },
      };

      mockDynamicsValidation.mockReturnValue({
        test: 'mapped',
        _correlationId: 'some-uuid-correlation-id',
      });
      mockGetCertificate.mockResolvedValue(examplePs);
      await SUT.resendPsToTradeDynamics([input]);

      expect(mockLogInfo).toHaveBeenNthCalledWith(
        2,
        `[DATA-HUB][REPORT-PS-SUBMITTED][GBR-2020-PS-C90A88218]`,
      );
      expect(mockLogInfo).toHaveBeenNthCalledWith(
        3,
        `[DATA-HUB][REPORT-PS-SUBMITTED][GBR-2020-PS-C90A88218][FOUND]`,
      );
      expect(mockDynamicsValidation).toHaveBeenCalledWith(
        [input],
        examplePs,
        'some-uuid-correlation-id',
      );
    });

    it('should catch any errors thrown', async () => {
      const error: Error = new Error('error');
      const input: ISdPsQueryResult = {
        documentNumber: 'GBR-2020-PS-BA8A6BE06',
        catchCertificateNumber: 'PS2',
        documentType: 'PS',
        createdAt: '2020-01-01',
        status: 'COMPLETE',
        species: 'COD',
        scientificName: 'Gadus morhua',
        commodityCode: 'FRESHCOD',
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        isMismatch: false,
        overAllocatedByWeight: 0,
        overUsedInfo: [],
        da: null,
        extended: {
          id: 'PS2-1610018839',
        },
      };

      mockGetCertificate.mockImplementation(() => {
        throw error;
      });

      const caughtError = await SUT.resendPsToTradeDynamics([input]).catch(
        (err) => err,
      );
      expect(caughtError).toBe(error);
      expect(mockLogError).toHaveBeenNthCalledWith(
        1,
        `[REREPORT-PS-SUBMITTED][ERROR][${error}]`,
      );
    });
  });

  

});

describe('azureTradeQueueEnabled Feature flag turned on', () => {
  ApplicationConfig.prototype.azureTradeQueueEnabled = true;
  ApplicationConfig.prototype.azureTradeQueueUrl = 'AZURE_QUEUE_TRADE_CONNECTION_STRING';
  ApplicationConfig.prototype.azureReportTradeQueueName = 'REPORT_QUEUE_TRADE';
  ApplicationConfig.prototype.enableReportToQueue = false;

  let mockGetRssNumber;
  let mockGetVesselService;
  let mockPersistence;
  let mockLogError;
  
  beforeEach(() => {
    mockLogError = jest.spyOn(logger, 'error');
    mockPersistence = jest.spyOn(shared, 'addToReportQueue');
    mockPersistence.mockResolvedValue(null);
    mockGetRssNumber = jest.spyOn(vessel, 'getRssNumber');
    mockGetRssNumber.mockReturnValue("C20415");
    mockGetVesselService = jest.spyOn(vessel, 'getVesselDetails');
    mockGetVesselService.mockReturnValue({
      fishingVesselName: "AGAN BORLOWEN",
      ircs: null,
      cfr: "GBR000C20415",
      flag: "GBR",
      homePort: "NEWLYN",
      registrationNumber: "SS229",
      imo: null,
      fishingLicenceNumber: "25072",
      fishingLicenceValidFrom: "2014-07-01T00:00:00",
      fishingLicenceValidTo: "2030-12-31T00:00:00",
      adminPort: "NEWLYN",
      rssNumber: "C20415",
      vesselLength: 6.88,
      licenceHolderName: "MR S CLARY-BROM "
    });

    uuid.mockImplementation(() => 'some-uuid-correlation-id');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will not add CC payload when it contains a validation error', async () => {
    const cc: any = { test: 'catch certificate', documentNumber: 'document1' };
    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
      "documentNumber": "GBR-2023-CC-C58DF9A73",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": shared.LandingStatusType.DataNeverExpected,
          "id": "GBR-2023-CC-C58DF9A73-4248789552",
          "landingDate": "2023-08-31",
          "species": "BSF",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "ASHLEIGH JANE",
          "vesselPln": "OB81",
          "vesselLength": 9.91,
          "vesselAdministration": "Scotland",
          "licenceHolder": "C & J SHELLFISH LTD",
          "speciesAlias": "N",
          "weight": 89,
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": false,
          "isLate": false,
          "validation": {
            "liveExportWeight": 110.36,
            "totalRecordedAgainstLanding": 220.72,
            "landedWeightExceededBy": null,
            "rawLandingsUrl": "http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=A12860",
            "salesNoteUrl": "http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=A12860",
            "isLegallyDue": false
          },
          "risking": {
            "vessel": "0.5",
            "speciesRisk": "1",
            "exporterRiskScore": "1",
            "landingRiskScore": "0.5",
            "highOrLowRisk": shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          }
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA"
      }
    };
    const mapped: any = { _correlationId: 'some-uuid-correlation-id' };

    const mockMapper = jest.spyOn(defraTradeValidation, 'toDefraTradeCc');
    mockMapper.mockReturnValue(mapped);

    await SUT.reportCcToTrade(cc, shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED, dynamicsCatchCertificateCase, []);

    expect(mockMapper).toHaveBeenCalledWith(cc, dynamicsCatchCertificateCase, []);
    expect(mockPersistence).not.toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalled();
  });

  it('will add CC payload to the the report queue', async () => {
    const cc: shared.IDocument = {
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "__t": "catchCert",
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "status": "COMPLETE",
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "audit": [
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:18.780Z"
          },
          "data": {
            "investigationStatus": "UNDER_INVESTIGATION"
          }
        },
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:23.439Z"
          },
          "data": {
            "investigationStatus": "CLOSED_NFA"
          }
        }
      ],
      "userReference": "MY REF",
      "exportData": {
        "products": [
          {
            "speciesId": "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            "species": "Black scabbardfish (BSF)",
            "speciesCode": "BSF",
            "commodityCode": "03028990",
            "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
            "scientificName": "Aphanopus carbo",
            "state": {
              "code": "FRE",
              "name": "Fresh"
            },
            "presentation": {
              "code": "GUT",
              "name": "Gutted"
            },
            "factor": 1.24,
            "caughtBy": [
              {
                "vessel": "AGAN BORLOWEN",
                "pln": "SS229",
                "homePort": "NEWLYN",
                "flag": "GBR",
                "cfr": "GBR000C20415",
                "imoNumber": null,
                "licenceNumber": "25072",
                "licenceValidTo": "2030-12-31",
                "licenceHolder": "MR S CLARY-BROM ",
                "id": "GBR-2023-CC-C58DF9A73-1777642314",
                "date": "2023-08-31",
                "faoArea": "FAO27",
                "weight": 122,
                "numberOfSubmissions": 1,
                "isLegallyDue": false,
                "dataEverExpected": true,
                "landingDataExpectedDate": "2023-08-31",
                "landingDataEndDate": "2023-09-02",
                "_status": "PENDING_LANDING_DATA"
              }
            ]
          }
        ],
        "transportation": {
          "exportedFrom": "United Kingdom",
          "exportedTo": {
            "officialCountryName": "Åland Islands",
            "isoCodeAlpha2": "AX",
            "isoCodeAlpha3": "ALA",
            "isoNumericCode": "248"
          },
          "vehicle": "truck",
          "cmr": true
        },
        "conservation": {
          "conservationReference": "UK Fisheries Policy"
        },
        "exporterDetails": {
          "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
          "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd",
          "exporterFullName": "Automation Tester",
          "_dynamicsAddress": {
            "defra_uprn": "10091818796",
            "defra_buildingname": "LANCASTER HOUSE",
            "defra_subbuildingname": "NATURAL ENGLAND",
            "defra_premises": null,
            "defra_street": "HAMPSHIRE COURT",
            "defra_locality": "NEWCASTLE BUSINESS PARK",
            "defra_dependentlocality": null,
            "defra_towntext": "NEWCASTLE UPON TYNE",
            "defra_county": null,
            "defra_postcode": "NE4 7YH",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "defra_internationalpostalcode": null,
            "defra_fromcompanieshouse": false,
            "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
          },
          "_dynamicsUser": {
            "firstName": "Automation",
            "lastName": "Tester"
          }
        },
        "landingsEntryOption": "manualEntry"
      },
      "createdByEmail": "foo@foo.com",
      "documentUri": "_44fd226f-598f-4615-930f-716b2762fea4.pdf",
      "investigation": {
        "investigator": "Chris Waugh",
        "status": "CLOSED_NFA"
      },
      "numberOfFailedAttempts": 5
    };

    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": shared.LandingStatusType.DataNeverExpected,
          "id": "GBR-2023-CC-C58DF9A73-4248789552",
          "landingDate": "2023-08-31",
          "species": "BSF",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "ASHLEIGH JANE",
          "vesselPln": "OB81",
          "vesselLength": 9.91,
          "vesselAdministration": "Scotland",
          "licenceHolder": "C & J SHELLFISH LTD",
          "speciesAlias": "N",
          "weight": 89,
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": false,
          "isLate": false,
          "validation": {
            "liveExportWeight": 110.36,
            "totalRecordedAgainstLanding": 220.72,
            "landedWeightExceededBy": null,
            "rawLandingsUrl": "http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=A12860",
            "salesNoteUrl": "http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=A12860",
            "isLegallyDue": false
          },
          "risking": {
            "vessel": "0.5",
            "speciesRisk": "1",
            "exporterRiskScore": "1",
            "landingRiskScore": "0.5",
            "highOrLowRisk": shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          }
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA"
      }
    };

    const ccQueryResults: shared.ICcQueryResult[] = [{
      documentNumber: 'GBR-2020-CC-1BC924FCF',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'C20415',
      da: 'Scotland',
      dateLanded: '2023-08-31',
      species: 'BSF',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      hasSalesNote: true,
      isSpeciesExists: false,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      speciesAlias: "N",
      landingTotalBreakdown: [
        {
          factor: 1.7,
          isEstimate: true,
          weight: 30,
          liveWeight: 51,
          source: shared.LandingSources.CatchRecording
        }
      ],
      source: shared.LandingSources.CatchRecording,
      isExceeding14DayLimit: false,
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        moment.utc()
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        landingId: 'GBR-2023-CC-C58DF9A73-1777642314',
        exporterName: 'Mr Bob',
        presentation: 'GUT',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
        presentationName: 'sliced',
        vessel: 'AGAN BORLOWEN',
        fao: 'FAO27',
        pln: 'SS229',
        species: 'Lobster',
        scientificName: "Aphanopus carbo",
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '03028990',
        commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
        investigation: {
          investigator: "Investigator Gadget",
          status: shared.InvestigationStatus.Open
        },
        transportationVehicle: 'truck',
        flag: "GBR",
        homePort: "NEWLYN",
        licenceNumber: "25072",
        licenceValidTo: "2030-12-31",
        licenceHolder: "MR S CLARY-BROM ",
        imoNumber: null,
        numberOfSubmissions: 1,
        isLegallyDue: true
      }
    }];

    const body: shared.IDefraTradeCatchCertificate = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": shared.DefraCcLandingStatusType.ValidationFailure_Species,
          "id": "GBR-2023-CC-C58DF9A73-1777642314",
          "landingDate": "2023-08-31",
          "species": "Lobster",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "AGAN BORLOWEN",
          "vesselPln": "SS229",
          "vesselLength": 6.88,
          "vesselAdministration": "Scotland",
          "licenceHolder": "MR S CLARY-BROM ",
          "source": "CATCH_RECORDING",
          "speciesAlias": "N",
          "weight": 122,
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": true,
          "landingDataExpectedAtSubmission": true,
          "landingOutcomeAtRetrospectiveCheck": shared.LandingRetrospectiveOutcomeType.Failure,
          "validation": {
            "liveExportWeight": 121,
            "totalEstimatedForExportSpecies": 30,
            "totalEstimatedWithTolerance": 56.1,
            "totalRecordedAgainstLanding": 200,
            "landedWeightExceededBy": 143.9,
            "rawLandingsUrl": "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            "salesNoteUrl": "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            "isLegallyDue": true
          },
          "risking": {
            "vessel": "0",
            "speciesRisk": "0",
            "exporterRiskScore": "0",
            "landingRiskScore": "0",
            "highOrLowRisk": shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          },
          "flag": "GBR",
          "catchArea": shared.CatchArea.FAO27,
          "homePort": "NEWLYN",
          "fishingLicenceNumber": "25072",
          "fishingLicenceValidTo": "2030-12-31",
          "imo": null
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA",
        "isoNumericCode": "248"
      },
      "certStatus": shared.CertificateStatus.COMPLETE,
      "transportation": {
        "modeofTransport": "truck",
        "hasRoadTransportDocument": true
      },
      "multiVesselSchedule": false
    };

    const expected: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: dynamicsCatchCertificateCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: dynamicsCatchCertificateCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: dynamicsCatchCertificateCase.exporter.accountId || null,
        UserId: dynamicsCatchCertificateCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: "COMPLETE",
        TimestampUtc: expect.any(String)
      },
      subject: shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED + '-GBR-2020-CC-1BC924FCF'
    };

    const mockMapper = jest.spyOn(defraTradeValidation, 'toDefraTradeCc');

    await SUT.reportCcToTrade(cc, shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED, dynamicsCatchCertificateCase, ccQueryResults);

    expect(mockMapper).toHaveBeenCalledWith(cc, dynamicsCatchCertificateCase, ccQueryResults);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2020-CC-1BC924FCF', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('clonedFrom');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('landingsCloned');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('parentDocumentVoid');
  });
  
  it('will add CC payload to the the report queue for exportedTo with NI', async () => {
    const cc: shared.IDocument = {
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "__t": "catchCert",
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "status": "COMPLETE",
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "audit": [
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:18.780Z"
          },
          "data": {
            "investigationStatus": "UNDER_INVESTIGATION"
          }
        },
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:23.439Z"
          },
          "data": {
            "investigationStatus": "CLOSED_NFA"
          }
        }
      ],
      "userReference": "MY REF",
      "exportData": {
        "products": [
          {
            "speciesId": "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            "species": "Black scabbardfish (BSF)",
            "speciesCode": "BSF",
            "commodityCode": "03028990",
            "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
            "scientificName": "Aphanopus carbo",
            "state": {
              "code": "FRE",
              "name": "Fresh"
            },
            "presentation": {
              "code": "GUT",
              "name": "Gutted"
            },
            "factor": 1.24,
            "caughtBy": [
              {
                "vessel": "AGAN BORLOWEN",
                "pln": "SS229",
                "homePort": "NEWLYN",
                "flag": "GBR",
                "cfr": "GBR000C20415",
                "imoNumber": null,
                "licenceNumber": "25072",
                "licenceValidTo": "2030-12-31",
                "licenceHolder": "MR S CLARY-BROM ",
                "id": "GBR-2023-CC-C58DF9A73-1777642314",
                "date": "2023-08-31",
                "faoArea": "FAO27",
                "weight": 122,
                "numberOfSubmissions": 1,
                "isLegallyDue": false,
                "dataEverExpected": true,
                "landingDataExpectedDate": "2023-08-31",
                "landingDataEndDate": "2023-09-02",
                "_status": "PENDING_LANDING_DATA"
              }
            ]
          }
        ],
        "transportation": {
          "exportedFrom": "United Kingdom",
          "exportedTo" : {
            "officialCountryName" : "Northern Ireland",
            "isoCodeAlpha2" : "XI",
            "isoCodeAlpha3" : null,
            "isoNumericCode" : null
          },
          "vehicle": "truck",
          "cmr": true
        },
        "conservation": {
          "conservationReference": "UK Fisheries Policy"
        },
        "exporterDetails": {
          "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
          "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd",
          "exporterFullName": "Automation Tester",
          "_dynamicsAddress": {
            "defra_uprn": "10091818796",
            "defra_buildingname": "LANCASTER HOUSE",
            "defra_subbuildingname": "NATURAL ENGLAND",
            "defra_premises": null,
            "defra_street": "HAMPSHIRE COURT",
            "defra_locality": "NEWCASTLE BUSINESS PARK",
            "defra_dependentlocality": null,
            "defra_towntext": "NEWCASTLE UPON TYNE",
            "defra_county": null,
            "defra_postcode": "NE4 7YH",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "defra_internationalpostalcode": null,
            "defra_fromcompanieshouse": false,
            "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
          },
          "_dynamicsUser": {
            "firstName": "Automation",
            "lastName": "Tester"
          }
        },
        "landingsEntryOption": "manualEntry"
      },
      "createdByEmail": "foo@foo.com",
      "documentUri": "_44fd226f-598f-4615-930f-716b2762fea4.pdf",
      "investigation": {
        "investigator": "Chris Waugh",
        "status": "CLOSED_NFA"
      },
      "numberOfFailedAttempts": 5
    };

    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": shared.LandingStatusType.DataNeverExpected,
          "id": "GBR-2023-CC-C58DF9A73-4248789552",
          "landingDate": "2023-08-31",
          "species": "BSF",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "ASHLEIGH JANE",
          "vesselPln": "OB81",
          "vesselLength": 9.91,
          "vesselAdministration": "Scotland",
          "licenceHolder": "C & J SHELLFISH LTD",
          "speciesAlias": "N",
          "weight": 89,
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": false,
          "isLate": false,
          "validation": {
            "liveExportWeight": 110.36,
            "totalRecordedAgainstLanding": 220.72,
            "landedWeightExceededBy": null,
            "rawLandingsUrl": "http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=A12860",
            "salesNoteUrl": "http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=A12860",
            "isLegallyDue": false
          },
          "risking": {
            "vessel": "0.5",
            "speciesRisk": "1",
            "exporterRiskScore": "1",
            "landingRiskScore": "0.5",
            "highOrLowRisk": shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          }
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA"
      }
    };

    const ccQueryResults: shared.ICcQueryResult[] = [{
      documentNumber: 'GBR-2020-CC-1BC924FCF',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'C20415',
      da: 'Scotland',
      dateLanded: '2023-08-31',
      species: 'BSF',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      hasSalesNote: true,
      isSpeciesExists: false,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      speciesAlias: "N",
      landingTotalBreakdown: [
        {
          factor: 1.7,
          isEstimate: true,
          weight: 30,
          liveWeight: 51,
          source: shared.LandingSources.CatchRecording
        }
      ],
      source: shared.LandingSources.CatchRecording,
      isExceeding14DayLimit: false,
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        moment.utc()
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        landingId: 'GBR-2023-CC-C58DF9A73-1777642314',
        exporterName: 'Mr Bob',
        presentation: 'GUT',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
        presentationName: 'sliced',
        vessel: 'AGAN BORLOWEN',
        fao: 'FAO27',
        pln: 'SS229',
        species: 'Lobster',
        scientificName: "Aphanopus carbo",
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '03028990',
        commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
        investigation: {
          investigator: "Investigator Gadget",
          status: shared.InvestigationStatus.Open
        },
        transportationVehicle: 'truck',
        flag: "GBR",
        homePort: "NEWLYN",
        licenceNumber: "25072",
        licenceValidTo: "2030-12-31",
        licenceHolder: "MR S CLARY-BROM ",
        imoNumber: null,
        numberOfSubmissions: 1,
        isLegallyDue: true
      }
    }];

    const body: shared.IDefraTradeCatchCertificate = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": shared.DefraCcLandingStatusType.ValidationFailure_Species,
          "id": "GBR-2023-CC-C58DF9A73-1777642314",
          "landingDate": "2023-08-31",
          "species": "Lobster",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "AGAN BORLOWEN",
          "vesselPln": "SS229",
          "vesselLength": 6.88,
          "vesselAdministration": "Scotland",
          "licenceHolder": "MR S CLARY-BROM ",
          "source": "CATCH_RECORDING",
          "speciesAlias": "N",
          "weight": 122,
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": true,
          "landingDataExpectedAtSubmission": true,
          "landingOutcomeAtRetrospectiveCheck": shared.LandingRetrospectiveOutcomeType.Failure,
          "validation": {
            "liveExportWeight": 121,
            "totalEstimatedForExportSpecies": 30,
            "totalEstimatedWithTolerance": 56.1,
            "totalRecordedAgainstLanding": 200,
            "landedWeightExceededBy": 143.9,
            "rawLandingsUrl": "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            "salesNoteUrl": "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            "isLegallyDue": true
          },
          "risking": {
            "vessel": "0",
            "speciesRisk": "0",
            "exporterRiskScore": "0",
            "landingRiskScore": "0",
            "highOrLowRisk": shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          },
          "flag": "GBR",
          "catchArea": shared.CatchArea.FAO27,
          "homePort": "NEWLYN",
          "fishingLicenceNumber": "25072",
          "fishingLicenceValidTo": "2030-12-31",
          "imo": null
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName" : "Northern Ireland",
        "isoCodeAlpha2" : "XI",
        "isoCodeAlpha3": null,
        "isoNumericCode": null
      },
      "certStatus": shared.CertificateStatus.COMPLETE,
      "transportation": {
        "modeofTransport": "truck",
        "hasRoadTransportDocument": true
      },
      "multiVesselSchedule": false
    };

    const expected: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: dynamicsCatchCertificateCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: dynamicsCatchCertificateCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: dynamicsCatchCertificateCase.exporter.accountId || null,
        UserId: dynamicsCatchCertificateCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: "COMPLETE",
        TimestampUtc: expect.any(String)
      },
      subject: shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED + '-GBR-2020-CC-1BC924FCF'
    };

    const mockMapper = jest.spyOn(defraTradeValidation, 'toDefraTradeCc');

    await SUT.reportCcToTrade(cc, shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED, dynamicsCatchCertificateCase, ccQueryResults);

    expect(mockMapper).toHaveBeenCalledWith(cc, dynamicsCatchCertificateCase, ccQueryResults);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2020-CC-1BC924FCF', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('clonedFrom');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('landingsCloned');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('parentDocumentVoid');
  });

  it('will add CC payload to the the report queue for VOID by exporter', async () => {
    const cc: shared.IDocument = {
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "__t": "catchCert",
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "status": "COMPLETE",
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "audit": [
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:18.780Z"
          },
          "data": {
            "investigationStatus": "UNDER_INVESTIGATION"
          }
        },
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:23.439Z"
          },
          "data": {
            "investigationStatus": "CLOSED_NFA"
          }
        }
      ],
      "userReference": "MY REF",
      "exportData": {
        "products": [
          {
            "speciesId": "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            "species": "Black scabbardfish (BSF)",
            "speciesCode": "BSF",
            "commodityCode": "03028990",
            "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
            "scientificName": "Aphanopus carbo",
            "state": {
              "code": "FRE",
              "name": "Fresh"
            },
            "presentation": {
              "code": "GUT",
              "name": "Gutted"
            },
            "factor": 1.24,
            "caughtBy": [
              {
                "vessel": "AGAN BORLOWEN",
                "pln": "SS229",
                "homePort": "NEWLYN",
                "flag": "GBR",
                "cfr": "GBR000C20415",
                "imoNumber": null,
                "licenceNumber": "25072",
                "licenceValidTo": "2030-12-31",
                "licenceHolder": "MR S CLARY-BROM ",
                "id": "GBR-2023-CC-C58DF9A73-1777642314",
                "date": "2023-08-31",
                "faoArea": "FAO27",
                "weight": 122,
                "numberOfSubmissions": 1,
                "isLegallyDue": false,
                "dataEverExpected": true,
                "landingDataExpectedDate": "2023-08-31",
                "landingDataEndDate": "2023-09-02",
                "_status": "PENDING_LANDING_DATA"
              }
            ]
          }
        ],
        "transportation": {
          "exportedFrom": "United Kingdom",
          "exportedTo": {
            "officialCountryName": "Åland Islands",
            "isoCodeAlpha2": "AX",
            "isoCodeAlpha3": "ALA",
            "isoNumericCode": "248"
          },
          "vehicle": "truck",
          "cmr": true
        },
        "conservation": {
          "conservationReference": "UK Fisheries Policy"
        },
        "exporterDetails": {
          "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
          "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd",
          "exporterFullName": "Automation Tester",
          "_dynamicsAddress": {
            "defra_uprn": "10091818796",
            "defra_buildingname": "LANCASTER HOUSE",
            "defra_subbuildingname": "NATURAL ENGLAND",
            "defra_premises": null,
            "defra_street": "HAMPSHIRE COURT",
            "defra_locality": "NEWCASTLE BUSINESS PARK",
            "defra_dependentlocality": null,
            "defra_towntext" : null,
            "defra_county": null,
            "defra_postcode": "NE4 7YH",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "defra_internationalpostalcode": null,
            "defra_fromcompanieshouse": false,
            "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
          },
          "_dynamicsUser": {
            "firstName": "Automation",
            "lastName": "Tester"
          }
        },
        "landingsEntryOption": "manualEntry"
      },
      "createdByEmail": "foo@foo.com",
      "documentUri": "_44fd226f-598f-4615-930f-716b2762fea4.pdf",
      "investigation": {
        "investigator": "Chris Waugh",
        "status": "CLOSED_NFA"
      },
      "numberOfFailedAttempts": 5
    };

    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.VoidByExporter,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": null,
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": null,
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA"
      }
    };

    const body: shared.IDefraTradeCatchCertificate = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.VoidByExporter,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": null,
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": null,
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA",
        "isoNumericCode": "248"
      },
      "certStatus": shared.CertificateStatus.VOID,
      "transportation": {
        "modeofTransport": "truck",
        "hasRoadTransportDocument": true
      },
      "multiVesselSchedule": false
    };

    const expected: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: dynamicsCatchCertificateCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: dynamicsCatchCertificateCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: dynamicsCatchCertificateCase.exporter.accountId || null,
        UserId: dynamicsCatchCertificateCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: shared.CertificateStatus.VOID,
        TimestampUtc: expect.any(String)
      },
      subject: shared.MessageLabel.CATCH_CERTIFICATE_VOIDED + '-GBR-2020-CC-1BC924FCF'
    };

    const mockMapper = jest.spyOn(defraTradeValidation, 'toDefraTradeCc');

    await SUT.reportCcToTrade(cc, shared.MessageLabel.CATCH_CERTIFICATE_VOIDED, dynamicsCatchCertificateCase, null);

    expect(mockMapper).toHaveBeenCalledWith(cc, dynamicsCatchCertificateCase, null);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2020-CC-1BC924FCF', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('clonedFrom');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('landingsCloned');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('parentDocumentVoid');
  });

  it('will add CC payload to the the report queue for VOID by admin', async () => {
    const cc: shared.IDocument = {
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "__t": "catchCert",
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "status": "COMPLETE",
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "audit": [
        {
          "eventType" : "VOIDED",
          "triggeredBy" : "Automated Tester MMO ECC Service Management",
          "timestamp" : {
            "$date": "1702984738656"
          },
          "data" : null
        }
      ],
      "userReference": "MY REF",
      "exportData": {
        "products": [
          {
            "speciesId": "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            "species": "Black scabbardfish (BSF)",
            "speciesCode": "BSF",
            "commodityCode": "03028990",
            "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
            "scientificName": "Aphanopus carbo",
            "state": {
              "code": "FRE",
              "name": "Fresh"
            },
            "presentation": {
              "code": "GUT",
              "name": "Gutted"
            },
            "factor": 1.24,
            "caughtBy": [
              {
                "vessel": "AGAN BORLOWEN",
                "pln": "SS229",
                "homePort": "NEWLYN",
                "flag": "GBR",
                "cfr": "GBR000C20415",
                "imoNumber": null,
                "licenceNumber": "25072",
                "licenceValidTo": "2030-12-31",
                "licenceHolder": "MR S CLARY-BROM ",
                "id": "GBR-2023-CC-C58DF9A73-1777642314",
                "date": "2023-08-31",
                "faoArea": "FAO27",
                "weight": 122,
                "numberOfSubmissions": 1,
                "isLegallyDue": false,
                "dataEverExpected": true,
                "landingDataExpectedDate": "2023-08-31",
                "landingDataEndDate": "2023-09-02",
                "_status": "PENDING_LANDING_DATA"
              }
            ]
          }
        ],
        "transportation": {
          "exportedFrom": "United Kingdom",
          "exportedTo": {
            "officialCountryName": "Åland Islands",
            "isoCodeAlpha2": "AX",
            "isoCodeAlpha3": "ALA",
            "isoNumericCode": "248"
          },
          "vehicle": "truck",
          "cmr": true
        },
        "conservation": {
          "conservationReference": "UK Fisheries Policy"
        },
        "exporterDetails": {
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd",
          "exporterFullName": "Automation Tester",
        },
        "landingsEntryOption": "manualEntry"
      },
      "createdByEmail": "foo@foo.com",
      "documentUri": "_44fd226f-598f-4615-930f-716b2762fea4.pdf",
      "investigation": {
        "investigator": "Chris Waugh",
        "status": "CLOSED_NFA"
      },
      "numberOfFailedAttempts": 5
    };

    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.VoidByAdmin,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        }
      },
      "landings": null,
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA"
      },
      "audits": [{
        "auditOperation": "VOIDED",
        "user": "Automated Tester MMO ECC Service Management",
        "auditAt": expect.any(Date)
      }]
    };

    const body: shared.IDefraTradeCatchCertificate = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.VoidByAdmin,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        }
      },
      "landings": null,
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "audits": [
        {
          "auditAt": expect.any(Date),
          "auditOperation": "VOIDED",
          "user": "Automated Tester MMO ECC Service Management",
        },
      ],
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA",
        "isoNumericCode": "248"
      },
      "certStatus": shared.CertificateStatus.VOID,
      "transportation": {
        "modeofTransport": "truck",
        "hasRoadTransportDocument": true
      },
      "multiVesselSchedule": false
    };

    const expected: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: dynamicsCatchCertificateCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: dynamicsCatchCertificateCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: dynamicsCatchCertificateCase.exporter.accountId || null,
        UserId: dynamicsCatchCertificateCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: shared.CertificateStatus.VOID,
        TimestampUtc: expect.any(String)
      },
      subject: shared.MessageLabel.CATCH_CERTIFICATE_VOIDED + '-GBR-2020-CC-1BC924FCF'
    };

    const mockMapper = jest.spyOn(defraTradeValidation, 'toDefraTradeCc');

    await SUT.reportCcToTrade(cc, shared.MessageLabel.CATCH_CERTIFICATE_VOIDED, dynamicsCatchCertificateCase, null);

    expect(mockMapper).toHaveBeenCalledWith(cc, dynamicsCatchCertificateCase, null);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2020-CC-1BC924FCF', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('clonedFrom');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('landingsCloned');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('parentDocumentVoid');
  });
  it('will add CC payload to the the report queue for transportation with CMR', async () => {
    const cc: IDocument = {
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "__t": "catchCert",
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "status": "COMPLETE",
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "audit": [
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:18.780Z"
          },
          "data": {
            "investigationStatus": "UNDER_INVESTIGATION"
          }
        },
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:23.439Z"
          },
          "data": {
            "investigationStatus": "CLOSED_NFA"
          }
        }
      ],
      "userReference": "MY REF",
      "exportData": {
        "products": [
          {
            "speciesId": "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            "species": "Black scabbardfish (BSF)",
            "speciesCode": "BSF",
            "commodityCode": "03028990",
            "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
            "scientificName": "Aphanopus carbo",
            "state": {
              "code": "FRE",
              "name": "Fresh"
            },
            "presentation": {
              "code": "GUT",
              "name": "Gutted"
            },
            "factor": 1.24,
            "caughtBy": [
              {
                "vessel": "AGAN BORLOWEN",
                "pln": "SS229",
                "homePort": "NEWLYN",
                "flag": "GBR",
                "cfr": "GBR000C20415",
                "imoNumber": null,
                "licenceNumber": "25072",
                "licenceValidTo": "2030-12-31",
                "licenceHolder": "MR S CLARY-BROM ",
                "id": "GBR-2023-CC-C58DF9A73-1777642314",
                "date": "2023-08-31",
                "faoArea": "FAO27",
                "weight": 122,
                "numberOfSubmissions": 1,
                "isLegallyDue": false,
                "dataEverExpected": true,
                "landingDataExpectedDate": "2023-08-31",
                "landingDataEndDate": "2023-09-02",
                "_status": "PENDING_LANDING_DATA"
              }
            ]
          }
        ],
        "transportations": [{
          "id": 0,
          "vehicle": "truck",
          "cmr": true
        }],
        "conservation": {
          "conservationReference": "UK Fisheries Policy"
        },
        "exporterDetails": {
          "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
          "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd",
          "exporterFullName": "Automation Tester",
          "_dynamicsAddress": {
            "defra_uprn": "10091818796",
            "defra_buildingname": "LANCASTER HOUSE",
            "defra_subbuildingname": "NATURAL ENGLAND",
            "defra_premises": null,
            "defra_street": "HAMPSHIRE COURT",
            "defra_locality": "NEWCASTLE BUSINESS PARK",
            "defra_dependentlocality": null,
            "defra_towntext": "NEWCASTLE UPON TYNE",
            "defra_county": null,
            "defra_postcode": "NE4 7YH",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "defra_internationalpostalcode": null,
            "defra_fromcompanieshouse": false,
            "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
          },
          "_dynamicsUser": {
            "firstName": "Automation",
            "lastName": "Tester"
          }
        },
        "landingsEntryOption": "manualEntry",
        "exportedFrom": "United Kingdom",
        "exportedTo": {
          "officialCountryName": "Northern Ireland",
          "isoCodeAlpha2": "XI",
          "isoCodeAlpha3": null,
          "isoNumericCode": null
        },
      },
      "createdByEmail": "foo@foo.com",
      "documentUri": "_44fd226f-598f-4615-930f-716b2762fea4.pdf",
      "investigation": {
        "investigator": "Chris Waugh",
        "status": "CLOSED_NFA"
      },
      "numberOfFailedAttempts": 5
    };

    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": Shared.LandingStatusType.DataNeverExpected,
          "id": "GBR-2023-CC-C58DF9A73-4248789552",
          "startDate": "2023-08-31",
          "landingDate": "2023-08-31",
          "species": "BSF",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "ASHLEIGH JANE",
          "vesselPln": "OB81",
          "vesselLength": 9.91,
          "vesselAdministration": "Scotland",
          "licenceHolder": "C & J SHELLFISH LTD",
          "speciesAlias": "N",
          "weight": 89,
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": false,
          "isLate": false,
          "validation": {
            "liveExportWeight": 110.36,
            "totalRecordedAgainstLanding": 220.72,
            "landedWeightExceededBy": null,
            "rawLandingsUrl": "http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=A12860",
            "salesNoteUrl": "http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=A12860",
            "isLegallyDue": false
          },
          "risking": {
            "vessel": "0.5",
            "speciesRisk": "1",
            "exporterRiskScore": "1",
            "landingRiskScore": "0.5",
            "highOrLowRisk": Shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          }
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA"
      }
    };

    const ccQueryResults: Shared.ICcQueryResult[] = [{
      documentNumber: 'GBR-2020-CC-1BC924FCF',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'C20415',
      da: 'Scotland',
      dateLanded: '2023-08-31',
      species: 'BSF',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      hasSalesNote: true,
      isSpeciesExists: false,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      speciesAlias: "N",
      landingTotalBreakdown: [
        {
          factor: 1.7,
          isEstimate: true,
          weight: 30,
          liveWeight: 51,
          source: shared.LandingSources.CatchRecording
        }
      ],
      source: shared.LandingSources.CatchRecording,
      isExceeding14DayLimit: false,
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        moment.utc()
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        landingId: 'GBR-2023-CC-C58DF9A73-1777642314',
        exporterName: 'Mr Bob',
        presentation: 'GUT',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
        presentationName: 'sliced',
        vessel: 'AGAN BORLOWEN',
        fao: 'FAO27',
        pln: 'SS229',
        species: 'Lobster',
        scientificName: "Aphanopus carbo",
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '03028990',
        commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
        investigation: {
          investigator: "Investigator Gadget",
          status: shared.InvestigationStatus.Open
        },
        transportationVehicle: 'truck',
        flag: "GBR",
        homePort: "NEWLYN",
        licenceNumber: "25072",
        licenceValidTo: "2030-12-31",
        licenceHolder: "MR S CLARY-BROM ",
        imoNumber: null,
        numberOfSubmissions: 1,
        isLegallyDue: true
      }
    }];

    const body: any = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        { "landingOutcomeAtRetrospectiveCheck": "Failure",
          "status": Shared.DefraCcLandingStatusType.ValidationFailure_Species,
          "id": "GBR-2023-CC-C58DF9A73-1777642314",
          "landingDate": "2023-08-31",
          "species": "Lobster",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "AGAN BORLOWEN",
          "vesselPln": "SS229",
          "vesselLength": 6.88,
          "vesselAdministration": "Scotland",
          "licenceHolder": "MR S CLARY-BROM ",
          "source": "CATCH_RECORDING",
          "speciesAlias": "N",
          "weight": 122,
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": true,
          "landingDataExpectedAtSubmission": true,
          "validation": {
            "liveExportWeight": 121,
            "totalEstimatedForExportSpecies": 30,
            "totalEstimatedWithTolerance": 56.1,
            "totalRecordedAgainstLanding": 200,
            "landedWeightExceededBy": 143.9,
            "rawLandingsUrl": "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            "salesNoteUrl": "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            "isLegallyDue": true,
            "totalLiveForExportSpecies": undefined,
            "totalWeightForSpecies": undefined,
          },
          "risking": {
            "vessel": "0",
            "speciesRisk": "0",
            "exporterRiskScore": "0",
            "landingRiskScore": "0",
            "highOrLowRisk": Shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false,
            "overuseInfo": undefined,

          },
          "flag": "GBR",
          "catchArea": Shared.CatchArea.FAO27,
          "homePort": "NEWLYN",
          "fishingLicenceNumber": "25072",
          "fishingLicenceValidTo": "2030-12-31",
          "imo": null,
          "adminCommodityCode": undefined,
          "adminPresentation": undefined,
          "adminSpecies": undefined,
          "adminState": undefined,
          "dateDataReceived": undefined,
          "gearType": undefined,
          "isLate": undefined,
          "landingDataEndDate": undefined,
          "landingDataExpectedDate": undefined,
          "speciesAnomaly": undefined,
          "startDate": undefined,

        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Northern Ireland",
        "isoCodeAlpha2": "XI",
        "isoCodeAlpha3": null,
        "isoNumericCode": null
      },
      "certStatus": Shared.CertificateStatus.COMPLETE,
      "transportation": {
        "modeofTransport": "truck",
        "hasRoadTransportDocument": true
      },
      "multiVesselSchedule": false,
     
    };

    const expected: ServiceBusMessage = {
      body,
      messageId: "some-uuid-correlation-id",
      correlationId: dynamicsCatchCertificateCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: dynamicsCatchCertificateCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: dynamicsCatchCertificateCase.exporter.accountId || null,
        UserId: dynamicsCatchCertificateCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: "COMPLETE",
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED + '-GBR-2020-CC-1BC924FCF'
    };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradeCc');

    await SUT.reportCcToTrade(cc, Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED, dynamicsCatchCertificateCase, ccQueryResults);

    expect(mockMapper).toHaveBeenCalledWith(cc, dynamicsCatchCertificateCase, ccQueryResults);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2020-CC-1BC924FCF', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('clonedFrom');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('landingsCloned');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('parentDocumentVoid');
  });


    it('will not add PS payload when it contains a validation error', async () => {
      const ps: any = { test: 'proccessing statement', documentNumber: 'document1' };
      const mapped: any = { _correlationId: 'some-uuid-correlation-id' };
      const psCase: IDynamicsProcessingStatementCase = {
        "exporter": {
          "contactId": "a contact id",
          "accountId": "an account id",
          "dynamicsAddress": {
            "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
            "defra_buildingname": "Lancaster House",
            "defra_fromcompanieshouse": false,
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
            "defra_postcode": "NE4 7YJ",
            "defra_premises": "23",
            "defra_street": "Newcastle upon Tyne",
            "defra_towntext": "Newcastle upon Tyne",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
          },
          "companyName": "FISH LTD",
          "address": {
            "building_number": "123",
            "sub_building_name": "Unit 1",
            "building_name": "CJC Fish Ltd",
            "street_name": "17  Old Edinburgh Road",
            "county": "West Midlands",
            "country": "England",
            "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
            "city": "ROWTR",
            "postCode": "WN90 23A"
          }
        },
        "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
        "documentDate": "2019-01-01 05:05:05",
        "caseType1": "PS",
        "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
        "numberOfFailedSubmissions": 4,
        "documentNumber": "GBR-PS-234234-234-234",
        "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
        "exportedTo": {
          "officialCountryName": "Nigeria",
          "isoCodeAlpha2": "NG",
          "isoCodeAlpha3": "NGR"
        },
        "catches": [
          {
            "foreignCatchCertificateNumber": "FR-PS-234234-23423-234234",
            "isDocumentIssuedInUK": true,
            "id": "GBR-PS-234234-234-234-1234567890",
            "species": "HER",
            "cnCode": "324234324432234",
            "scientificName": "scientific name",
            "importedWeight": 500,
            "usedWeightAgainstCertificate": 700,
            "processedWeight": 800,
            "validation": {
              "status": SdPsStatus.Overuse,
              "totalUsedWeightAgainstCertificate": 700,
              "weightExceededAmount": 300,
              "overuseInfo": [
                "GBR-PS-123234-123-234”,”GBR-PS-123234-123-234"
              ]
            }
          },
          {
            "foreignCatchCertificateNumber": "IRL-PS-4324-423423-234234",
            "isDocumentIssuedInUK": false,
            "id": "GBR-PS-234234-234-234-1234567890",
            "species": "SAL",
            "cnCode": "523842358",
            "scientificName": "scientific name",
            "importedWeight": 200,
            "usedWeightAgainstCertificate": 100,
            "processedWeight": 150,
            "validation": {
              "status": SdPsStatus.Overuse,
              "totalUsedWeightAgainstCertificate": 200
            }
          }
        ],
        "da": "Northern Ireland",
        "plantName": "Bob's Fisheries LTD",
        "personResponsible": "Mr. Bob",
        "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
        "requestedByAdmin": true,
        "clonedFrom": "GBR-PS-234234-234-234",
        "parentDocumentVoid": false
      };
  
      const psQueryResults: ISdPsQueryResult[] = [{
        documentNumber: "PS1",
        catchCertificateNumber: "PS2",
        catchCertificateType: 'uk',
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "Atlantic cod (COD)",
        scientificName: "Gadus morhua",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: [],
        isMismatch: false,
        overAllocatedByWeight: 0,
        da: 'England',
        extended: {
          id: 'PS2-1610018839',
        }
      }];
  
      const mockMapper = jest.spyOn(defraTradeValidation, 'toDefraTradePs');
      mockMapper.mockReturnValue(mapped);
  
      await SUT.reportPsToTrade(ps, shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED, psCase, psQueryResults);
  
      expect(mockPersistence).not.toHaveBeenCalled();
      expect(mockLogError).toHaveBeenCalled();
    });
  
    it('will add PS payload to the report queue', async () => {
      const ps: IDocument = {
        "documentNumber": "GBR-2023-PS-6D2C91A0A",
        "status": "COMPLETE",
        "createdAt": new Date("2020-06-24T10:39:32.000Z"),
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "createdByEmail": "foo@foo.com",
        "requestByAdmin": false,
        "contactId": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ13",
        "__t": "processingStatement",
        "audit": [],
        "exportData": {
          "catches": [
            {
              "catchCertificateNumber": "GBR-2023-CC-1975CB0F9",
              "catchCertificateType": "non_uk",
              "species": "Northern shortfin squid (SQI)",
              "speciesCode": "SQI",
              "id": "GBR-2023-CC-1975CB0F9-1692962600",
              "totalWeightLanded": "80",
              "exportWeightBeforeProcessing": "80",
              "exportWeightAfterProcessing": "80",
              "scientificName": "Illex illecebrosus",
              "_id": {
                "$oid": "64e88f2814ee5ab32f4a9278"
              }
            }
          ],
          "products": [
            {
              "id": "GBR-2023-PS-6D2C91A0A-1692962523",
              "commodityCode": "03021180",
              "description": "something",
              "_id": {
                "$oid": "64e88f2814ee5ab32f4a9279"
              }
            }
          ],
          "consignmentDescription": null,
          "healthCertificateNumber": "20/2/123456",
          "healthCertificateDate": "25/08/2023",
          "exporterDetails": {
            "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
            "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
            "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
            "buildingNumber": null,
            "subBuildingName": "NATURAL ENGLAND",
            "buildingName": "LANCASTER HOUSE",
            "streetName": "HAMPSHIRE COURT",
            "county": null,
            "country": "United Kingdom of Great Britain and Northern Ireland",
            "postcode": "NE4 7YH",
            "townCity": "NEWCASTLE UPON TYNE",
            "exporterCompanyName": "Automation Testing Ltd",
            "_dynamicsAddress": {
              "defra_uprn": "10091818796",
              "defra_buildingname": "LANCASTER HOUSE",
              "defra_subbuildingname": "NATURAL ENGLAND",
              "defra_premises": null,
              "defra_street": "HAMPSHIRE COURT",
              "defra_locality": "NEWCASTLE BUSINESS PARK",
              "defra_dependentlocality": null,
              "defra_towntext": "NEWCASTLE UPON TYNE",
              "defra_county": null,
              "defra_postcode": "NE4 7YH",
              "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
              "defra_internationalpostalcode": null,
              "defra_fromcompanieshouse": false,
              "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
              "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
              "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
              "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
              "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
            },
            "_dynamicsUser": {
              "firstName": "Automation",
              "lastName": "Tester"
            }
          },
          "personResponsibleForConsignment": "Isaac",
          "plantApprovalNumber": "1234",
          "plantName": "name",
          "plantAddressOne": "LANCASTER HOUSE, MMO SUB, HAMPSHIRE COURT",
          "plantSubBuildingName": "MMO SUB",
          "plantBuildingName": "LANCASTER HOUSE",
          "plantStreetName": "HAMPSHIRE COURT",
          "plantCounty": "TYNESIDE",
          "plantCountry": "ENGLAND",
          "plantTownCity": "NEWCASTLE UPON TYNE",
          "plantPostcode": "NE4 7YH",
          "dateOfAcceptance": "25/08/2023",
          "exportedTo": {
            "officialCountryName": "France",
            "isoCodeAlpha2": "FR",
            "isoCodeAlpha3": "FRA",
            "isoNumericCode": "250"
          }
        },
        "documentUri": "_5831e2cd-faef-4e64-9d67-3eb23ba7d930.pdf"
      };
  
      const psCase: IDynamicsProcessingStatementCase = {
        "exporter": {
          "contactId": "a contact id",
          "accountId": "an account id",
          "dynamicsAddress": {
            "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
            "defra_buildingname": "Lancaster House",
            "defra_fromcompanieshouse": false,
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
            "defra_postcode": "NE4 7YJ",
            "defra_premises": "23",
            "defra_street": "Newcastle upon Tyne",
            "defra_towntext": "Newcastle upon Tyne",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
          },
          "companyName": "FISH LTD",
          "address": {
            "building_number": "123",
            "sub_building_name": "Unit 1",
            "building_name": "CJC Fish Ltd",
            "street_name": "17  Old Edinburgh Road",
            "county": "West Midlands",
            "country": "England",
            "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
            "city": "ROWTR",
            "postCode": "WN90 23A"
          }
        },
        "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
        "documentDate": "2019-01-01 05:05:05",
        "caseType1": "PS",
        "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
        "numberOfFailedSubmissions": 4,
        "documentNumber": "GBR-2023-PS-6D2C91A0A",
        "plantName": "Bob's Fisheries LTD",
        "personResponsible": "Mr. Bob",
        "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
        "exportedTo": {
          "officialCountryName": "Nigeria",
          "isoCodeAlpha2": "NG",
          "isoCodeAlpha3": "NGR"
        },
        "catches": [
          {
            "foreignCatchCertificateNumber": "FR-PS-234234-23423-234234",
            "isDocumentIssuedInUK": false,
            "id": "GBR-2023-PS-6D2C91A0A-1234567890",
            "species": "HER",
            "cnCode": "324234324432234",
            "scientificName": "scientific name",
            "importedWeight": 500,
            "usedWeightAgainstCertificate": 700,
            "processedWeight": 800,
            "validation": {
              "status": SdPsStatus.Overuse,
              "totalUsedWeightAgainstCertificate": 700,
              "weightExceededAmount": 300,
              "overuseInfo": [
                "GBR-PS-123234-123-234”,”GBR-PS-123234-123-234"
              ]
            }
          },
          {
            "foreignCatchCertificateNumber": "IRL-PS-4324-423423-234234",
            "isDocumentIssuedInUK": false,
            "id": "GBR-PS-234234-234-234-1234567890",
            "species": "SAL",
            "cnCode": "523842358",
            "scientificName": "scientific name",
            "importedWeight": 200,
            "usedWeightAgainstCertificate": 100,
            "processedWeight": 150,
            "validation": {
              "status": SdPsStatus.Overuse,
              "totalUsedWeightAgainstCertificate": 200
            }
          }
        ],
        "da": "Northern Ireland",
        "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
        "requestedByAdmin": true,
        "clonedFrom": "GBR-PS-234234-234-234",
        "parentDocumentVoid": false
      };
  
      const body: IDefraTradeProcessingStatement = {
        "exporter": {
          "contactId": "a contact id",
          "accountId": "an account id",
          "dynamicsAddress": {
            "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
            "defra_buildingname": "Lancaster House",
            "defra_fromcompanieshouse": false,
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
            "defra_postcode": "NE4 7YJ",
            "defra_premises": "23",
            "defra_street": "Newcastle upon Tyne",
            "defra_towntext": "Newcastle upon Tyne",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
          },
          "companyName": "FISH LTD",
          "address": {
            "building_number": "123",
            "sub_building_name": "Unit 1",
            "building_name": "CJC Fish Ltd",
            "street_name": "17  Old Edinburgh Road",
            "county": "West Midlands",
            "country": "England",
            "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
            "city": "ROWTR",
            "postCode": "WN90 23A"
          }
        },
        "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
        "documentDate": "2019-01-01 05:05:05",
        "caseType1": "PS",
        "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
        "numberOfFailedSubmissions": 4,
        "documentNumber": "GBR-2023-PS-6D2C91A0A",
        "plantName": "Bob's Fisheries LTD",
        "personResponsible": "Mr. Bob",
        "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
        "exportedTo": {
          "officialCountryName": "France",
          "isoCodeAlpha2": "FR",
          "isoCodeAlpha3": "FRA",
          "isoNumericCode": "250"
        },
        "catches": [
          {
            "foreignCatchCertificateNumber": "PS2",
            "id": "PS2-1610018839",
            "species": "Atlantic cod (COD)",
            "cnCode": "FRESHCOD",
            "scientificName": "Gadus morhua",
            "importedWeight": 200,
            "usedWeightAgainstCertificate": 100,
            "processedWeight": 80,
            "validation": {
              "status": IDefraTradeSdPsStatus.Success,
              "totalUsedWeightAgainstCertificate": 150,
              "weightExceededAmount": 0,
              "overuseInfo": undefined,
            }
          }
        ],
        "da": "Northern Ireland",
        "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
        "requestedByAdmin": true,
        "plantAddress": {
          "line1": "LANCASTER HOUSE, MMO SUB, HAMPSHIRE COURT",
          "building_name": "LANCASTER HOUSE",
          "sub_building_name": "MMO SUB",
          "street_name": "HAMPSHIRE COURT",
          "country": "ENGLAND",
          "county": "TYNESIDE",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "plantApprovalNumber": "1234",
        "plantDateOfAcceptance": "2023-08-25",
        "healthCertificateNumber": "20/2/123456",
        "healthCertificateDate": "2023-08-25",
        "authority": {
          "name": "Illegal Unreported and Unregulated (IUU) Fishing Team",
          "companyName": "Marine Management Organisation",
          "address": {
            "line1": "Lancaster House, Hampshire Court",
            "building_name": "Lancaster House",
            "street_name": "Hampshire Court",
            "city": "Newcastle upon Tyne",
            "postCode": "NE4 7YJ",
            "country": "United Kingdom"
          },
          "tel": "0300 123 1032",
          "email": "ukiuuslo@marinemanagement.org.uk",
          "dateIssued": moment().format('YYYY-MM-DD')
        }
      };
  
      const psQueryResults: ISdPsQueryResult[] = [{
        documentNumber: "GBR-2023-PS-6D2C91A0A",
        catchCertificateNumber: "PS2",
        catchCertificateType: "non_uk",
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "Atlantic cod (COD)",
        scientificName: "Gadus morhua",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: [],
        isMismatch: false,
        overAllocatedByWeight: 0,
        da: 'England',
        extended: {
          id: 'PS2-1610018839',
        }
      }];
  
      const expected: ServiceBusMessage = {
        body,
        messageId: expect.any(String),
        correlationId: psCase._correlationId,
        contentType: 'application/json',
        applicationProperties: {
          EntityKey: psCase.documentNumber,
          PublisherId: 'FES',
          OrganisationId: psCase.exporter.accountId || null,
          UserId: psCase.exporter.contactId || null,
          SchemaVersion: 2,
          Type: "Internal",
          Status: "COMPLETE",
          TimestampUtc: expect.any(String)
        },
        subject: shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED + '-GBR-2023-PS-6D2C91A0A'
      };
  
      const psQueryResultsBlocked: ISdPsQueryResult[] = [{
        documentNumber: "GBR-2023-PS-6D2C91A0A",
        catchCertificateNumber: "PS2",
        catchCertificateType: "non_uk",
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "BLOCKED",
        species: "Atlantic cod (COD)",
        scientificName: "Gadus morhua",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: [],
        isMismatch: false,
        overAllocatedByWeight: 0,
        da: 'England',
        extended: {
          id: 'PS2-1610018839',
        }
      }];
  
      const expectedResult: ServiceBusMessage = {
        body,
        messageId: expect.any(String),
        correlationId: psCase._correlationId,
        contentType: 'application/json',
        applicationProperties: {
          EntityKey: psCase.documentNumber,
          PublisherId: 'FES',
          OrganisationId: psCase.exporter.accountId || null,
          UserId: psCase.exporter.contactId || null,
          SchemaVersion: 2,
          Type: "Internal",
          Status: "BLOCKED",
          TimestampUtc: expect.any(String)
        },
        subject: shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED + '-GBR-2023-PS-6D2C91A0A'
      };
  
      const mockMapper = jest.spyOn(defraTradeValidation, 'toDefraTradePs');
  
      await SUT.reportPsToTrade(ps, shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED, psCase, psQueryResults);
      await SUT.reportPsToTrade(ps, shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED, psCase, psQueryResultsBlocked);
  
      expect(mockMapper).toHaveBeenCalledWith(ps, psCase, psQueryResults);
      expect(mockMapper).toHaveBeenCalledWith(ps, psCase, psQueryResultsBlocked);
  
      expect(mockPersistence).toHaveBeenCalledWith('GBR-2023-PS-6D2C91A0A', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
      expect(mockPersistence).toHaveBeenCalledWith('GBR-2023-PS-6D2C91A0A', expectedResult, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    });
  
    it('will add PS payload to the report queue for exportedTo with NI', async () => {
      const ps: IDocument = {
        "documentNumber": "GBR-2023-PS-6D2C91A0A",
        "status": "COMPLETE",
        "createdAt": new Date("2020-06-24T10:39:32.000Z"),
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "createdByEmail": "foo@foo.com",
        "requestByAdmin": false,
        "contactId": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ13",
        "__t": "processingStatement",
        "audit": [],
        "exportData": {
          "catches": [
            {
              "catchCertificateNumber": "GBR-2023-CC-1975CB0F9",
              "catchCertificateType": "non_uk",
              "species": "Northern shortfin squid (SQI)",
              "speciesCode": "SQI",
              "id": "GBR-2023-CC-1975CB0F9-1692962600",
              "totalWeightLanded": "80",
              "exportWeightBeforeProcessing": "80",
              "exportWeightAfterProcessing": "80",
              "scientificName": "Illex illecebrosus",
              "_id": {
                "$oid": "64e88f2814ee5ab32f4a9278"
              }
            }
          ],
          "products": [
            {
              "id": "GBR-2023-PS-6D2C91A0A-1692962523",
              "commodityCode": "03021180",
              "description": "something",
              "_id": {
                "$oid": "64e88f2814ee5ab32f4a9279"
              }
            }
          ],
          "consignmentDescription": null,
          "healthCertificateNumber": "20/2/123456",
          "healthCertificateDate": "25/08/2023",
          "exporterDetails": {
            "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
            "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
            "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
            "buildingNumber": null,
            "subBuildingName": "NATURAL ENGLAND",
            "buildingName": "LANCASTER HOUSE",
            "streetName": "HAMPSHIRE COURT",
            "county": null,
            "country": "United Kingdom of Great Britain and Northern Ireland",
            "postcode": "NE4 7YH",
            "townCity": "NEWCASTLE UPON TYNE",
            "exporterCompanyName": "Automation Testing Ltd",
            "_dynamicsAddress": {
              "defra_uprn": "10091818796",
              "defra_buildingname": "LANCASTER HOUSE",
              "defra_subbuildingname": "NATURAL ENGLAND",
              "defra_premises": null,
              "defra_street": "HAMPSHIRE COURT",
              "defra_locality": "NEWCASTLE BUSINESS PARK",
              "defra_dependentlocality": null,
              "defra_towntext": "NEWCASTLE UPON TYNE",
              "defra_county": null,
              "defra_postcode": "NE4 7YH",
              "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
              "defra_internationalpostalcode": null,
              "defra_fromcompanieshouse": false,
              "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
              "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
              "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
              "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
              "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
            },
            "_dynamicsUser": {
              "firstName": "Automation",
              "lastName": "Tester"
            }
          },
          "personResponsibleForConsignment": "Isaac",
          "plantApprovalNumber": "1234",
          "plantName": "name",
          "plantAddressOne": "LANCASTER HOUSE, MMO SUB, HAMPSHIRE COURT",
          "plantSubBuildingName": "MMO SUB",
          "plantBuildingName": "LANCASTER HOUSE",
          "plantStreetName": "HAMPSHIRE COURT",
          "plantCounty": "TYNESIDE",
          "plantCountry": "ENGLAND",
          "plantTownCity": "NEWCASTLE UPON TYNE",
          "plantPostcode": "NE4 7YH",
          "dateOfAcceptance": "25/08/2023",
          "exportedTo": {
            "officialCountryName" : "Northern Ireland",
            "isoCodeAlpha2" : "XI",
            "isoCodeAlpha3" : null,
            "isoNumericCode" : null
          }
        },
        "documentUri": "_5831e2cd-faef-4e64-9d67-3eb23ba7d930.pdf"
      };
         const ps2: IDocument = {
        "documentNumber": "GBR-2023-PS-6D2C91A0A",
        "status": "COMPLETE",
        "createdAt": new Date("2020-06-24T10:39:32.000Z"),
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "createdByEmail": "foo@foo.com",
        "requestByAdmin": false,
        "contactId": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ13",
        "__t": "processingStatement",
        "audit": [],
        "exportData": {
          "catches": [
            {
              "catchCertificateNumber": "GBR-2023-CC-1975CB0F9",
              "catchCertificateType": "non_uk",
              "species": "Northern shortfin squid (SQI)",
              "speciesCode": "SQI",
              "id": "GBR-2023-CC-1975CB0F9-1692962600",
              "totalWeightLanded": "80",
              "exportWeightBeforeProcessing": "80",
              "exportWeightAfterProcessing": "80",
              "scientificName": "Illex illecebrosus",
              "_id": {
                "$oid": "64e88f2814ee5ab32f4a9278"
              }
            }
          ],
          "products": [
            {
              "id": "GBR-2023-PS-6D2C91A0A-1692962523",
              "commodityCode": "03021180",
              "description": "something",
              "_id": {
                "$oid": "64e88f2814ee5ab32f4a9279"
              }
            }
          ],
          "consignmentDescription": null,
          "healthCertificateNumber": "20/2/123456",
          "healthCertificateDate": "25/08/2023",
          "exporterDetails": {
            "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
            "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
            "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
            "buildingNumber": null,
            "subBuildingName": "NATURAL ENGLAND",
            "buildingName": "LANCASTER HOUSE",
            "streetName": "HAMPSHIRE COURT",
            "county": null,
            "country": "United Kingdom of Great Britain and Northern Ireland",
            "postcode": "NE4 7YH",
            "townCity": "NEWCASTLE UPON TYNE",
            "exporterCompanyName": "Automation Testing Ltd",
            "_dynamicsAddress": {
              "defra_uprn": "10091818796",
              "defra_buildingname": "LANCASTER HOUSE",
              "defra_subbuildingname": "NATURAL ENGLAND",
              "defra_premises": null,
              "defra_street": "HAMPSHIRE COURT",
              "defra_locality": "NEWCASTLE BUSINESS PARK",
              "defra_dependentlocality": null,
              "defra_towntext": "NEWCASTLE UPON TYNE",
              "defra_county": null,
              "defra_postcode": "NE4 7YH",
              "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
              "defra_internationalpostalcode": null,
              "defra_fromcompanieshouse": false,
              "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
              "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
              "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
              "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
              "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
            },
            "_dynamicsUser": {
              "firstName": "Automation",
              "lastName": "Tester"
            }
          },
          "personResponsibleForConsignment": "Isaac",
          "plantApprovalNumber": "1234",
          "plantName": "name",
          "plantAddressOne": "LANCASTER HOUSE, MMO SUB, HAMPSHIRE COURT",
          "plantSubBuildingName": "MMO SUB",
          "plantBuildingName": "LANCASTER HOUSE",
          "plantStreetName": "HAMPSHIRE COURT",
          "plantCounty": "TYNESIDE",
          "plantCountry": "ENGLAND",
          "plantTownCity": "NEWCASTLE UPON TYNE",
          "plantPostcode": "NE4 7YH",
          "dateOfAcceptance": "25/08/2023",

        },
        "documentUri": "_5831e2cd-faef-4e64-9d67-3eb23ba7d930.pdf"
      };
  
      const psCase: IDynamicsProcessingStatementCase = {
        "exporter": {
          "contactId": "a contact id",
          "accountId": "an account id",
          "dynamicsAddress": {
            "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
            "defra_buildingname": "Lancaster House",
            "defra_fromcompanieshouse": false,
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
            "defra_postcode": "NE4 7YJ",
            "defra_premises": "23",
            "defra_street": "Newcastle upon Tyne",
            "defra_towntext": "Newcastle upon Tyne",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
          },
          "companyName": "FISH LTD",
          "address": {
            "building_number": "123",
            "sub_building_name": "Unit 1",
            "building_name": "CJC Fish Ltd",
            "street_name": "17  Old Edinburgh Road",
            "county": "West Midlands",
            "country": "England",
            "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
            "city": "ROWTR",
            "postCode": "WN90 23A"
          }
        },
        "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
        "documentDate": "2019-01-01 05:05:05",
        "caseType1": "PS",
        "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
        "numberOfFailedSubmissions": 4,
        "documentNumber": "GBR-2023-PS-6D2C91A0A",
        "plantName": "Bob's Fisheries LTD",
        "personResponsible": "Mr. Bob",
        "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
        "exportedTo": {
          "officialCountryName" : "Northern Ireland",
          "isoCodeAlpha2" : "XI",
        },
        "catches": [
          {
            "foreignCatchCertificateNumber": "FR-PS-234234-23423-234234",
            "isDocumentIssuedInUK": false,
            "id": "GBR-2023-PS-6D2C91A0A-1234567890",
            "species": "HER",
            "cnCode": "324234324432234",
            "scientificName": "scientific name",
            "importedWeight": 500,
            "usedWeightAgainstCertificate": 700,
            "processedWeight": 800,
            "validation": {
              "status": SdPsStatus.Overuse,
              "totalUsedWeightAgainstCertificate": 700,
              "weightExceededAmount": 300,
              "overuseInfo": [
                "GBR-PS-123234-123-234”,”GBR-PS-123234-123-234"
              ]
            }
          },
          {
            "foreignCatchCertificateNumber": "IRL-PS-4324-423423-234234",
            "isDocumentIssuedInUK": false,
            "id": "GBR-PS-234234-234-234-1234567890",
            "species": "SAL",
            "cnCode": "523842358",
            "scientificName": "scientific name",
            "importedWeight": 200,
            "usedWeightAgainstCertificate": 100,
            "processedWeight": 150,
            "validation": {
              "status": SdPsStatus.Overuse,
              "totalUsedWeightAgainstCertificate": 200
            }
          }
        ],
        "da": "Northern Ireland",
        "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
        "requestedByAdmin": true,
        "clonedFrom": "GBR-PS-234234-234-234",
        "parentDocumentVoid": false
      };
  
      const body: IDefraTradeProcessingStatement = {
        "exporter": {
          "contactId": "a contact id",
          "accountId": "an account id",
          "dynamicsAddress": {
            "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
            "defra_buildingname": "Lancaster House",
            "defra_fromcompanieshouse": false,
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
            "defra_postcode": "NE4 7YJ",
            "defra_premises": "23",
            "defra_street": "Newcastle upon Tyne",
            "defra_towntext": "Newcastle upon Tyne",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
          },
          "companyName": "FISH LTD",
          "address": {
            "building_number": "123",
            "sub_building_name": "Unit 1",
            "building_name": "CJC Fish Ltd",
            "street_name": "17  Old Edinburgh Road",
            "county": "West Midlands",
            "country": "England",
            "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
            "city": "ROWTR",
            "postCode": "WN90 23A"
          }
        },
        "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
        "documentDate": "2019-01-01 05:05:05",
        "caseType1": "PS",
        "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
        "numberOfFailedSubmissions": 4,
        "documentNumber": "GBR-2023-PS-6D2C91A0A",
        "plantName": "Bob's Fisheries LTD",
        "personResponsible": "Mr. Bob",
        "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
        "exportedTo": {
          "officialCountryName" : "Northern Ireland",
          "isoCodeAlpha2" : "XI",
          "isoCodeAlpha3": null,
          "isoNumericCode": null
        },
        "catches": [
          {
            "foreignCatchCertificateNumber": "PS2",
            "id": "PS2-1610018839",
            "species": "Atlantic cod (COD)",
            "cnCode": "FRESHCOD",
            "scientificName": "Gadus morhua",
            "importedWeight": 200,
            "usedWeightAgainstCertificate": 100,
            "processedWeight": 80,
            "validation": {
              "status": IDefraTradeSdPsStatus.Success,
              "totalUsedWeightAgainstCertificate": 150,
              "weightExceededAmount": 0,
              "overuseInfo": undefined,
            }
          }
        ],
        "da": "Northern Ireland",
        "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
        "requestedByAdmin": true,
        "plantAddress": {
          "line1": "LANCASTER HOUSE, MMO SUB, HAMPSHIRE COURT",
          "building_name": "LANCASTER HOUSE",
          "sub_building_name": "MMO SUB",
          "street_name": "HAMPSHIRE COURT",
          "country": "ENGLAND",
          "county": "TYNESIDE",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "plantApprovalNumber": "1234",
        "plantDateOfAcceptance": "2023-08-25",
        "healthCertificateNumber": "20/2/123456",
        "healthCertificateDate": "2023-08-25",
        "authority": {
          "name": "Illegal Unreported and Unregulated (IUU) Fishing Team",
          "companyName": "Marine Management Organisation",
          "address": {
            "line1": "Lancaster House, Hampshire Court",
            "building_name": "Lancaster House",
            "street_name": "Hampshire Court",
            "city": "Newcastle upon Tyne",
            "postCode": "NE4 7YJ",
            "country": "United Kingdom"
          },
          "tel": "0300 123 1032",
          "email": "ukiuuslo@marinemanagement.org.uk",
          "dateIssued": moment().format('YYYY-MM-DD')
        }
      };
  
      const psQueryResults: ISdPsQueryResult[] = [{
        documentNumber: "GBR-2023-PS-6D2C91A0A",
        catchCertificateNumber: "PS2",
        catchCertificateType: "non_uk",
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "Atlantic cod (COD)",
        scientificName: "Gadus morhua",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: [],
        isMismatch: false,
        overAllocatedByWeight: 0,
        da: 'England',
        extended: {
          id: 'PS2-1610018839',
        }
      }];
  
      const expected: ServiceBusMessage = {
        body,
        messageId: expect.any(String),
        correlationId: psCase._correlationId,
        contentType: 'application/json',
        applicationProperties: {
          EntityKey: psCase.documentNumber,
          PublisherId: 'FES',
          OrganisationId: psCase.exporter.accountId || null,
          UserId: psCase.exporter.contactId || null,
          SchemaVersion: 2,
          Type: "Internal",
          Status: "COMPLETE",
          TimestampUtc: expect.any(String)
        },
        subject: shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED + '-GBR-2023-PS-6D2C91A0A'
      };
  
      const psQueryResultsBlocked: ISdPsQueryResult[] = [{
        documentNumber: "GBR-2023-PS-6D2C91A0A",
        catchCertificateNumber: "PS2",
        catchCertificateType: "non_uk",
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "BLOCKED",
        species: "Atlantic cod (COD)",
        scientificName: "Gadus morhua",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: [],
        isMismatch: false,
        overAllocatedByWeight: 0,
        da: 'England',
        extended: {
          id: 'PS2-1610018839',
        }
      }];
  
      const expectedResult: ServiceBusMessage = {
        body,
        messageId: expect.any(String),
        correlationId: psCase._correlationId,
        contentType: 'application/json',
        applicationProperties: {
          EntityKey: psCase.documentNumber,
          PublisherId: 'FES',
          OrganisationId: psCase.exporter.accountId || null,
          UserId: psCase.exporter.contactId || null,
          SchemaVersion: 2,
          Type: "Internal",
          Status: "BLOCKED",
          TimestampUtc: expect.any(String)
        },
        subject: shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED + '-GBR-2023-PS-6D2C91A0A'
      };
  
      const mockMapper = jest.spyOn(defraTradeValidation, 'toDefraTradePs');
  
      await SUT.reportPsToTrade(ps, shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED, psCase, psQueryResults);
      await SUT.reportPsToTrade(ps2, shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED, psCase, psQueryResults);
      await SUT.reportPsToTrade(ps, shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED, psCase, psQueryResultsBlocked);
  
      expect(mockMapper).toHaveBeenCalledWith(ps, psCase, psQueryResults);
      expect(mockMapper).toHaveBeenCalledWith(ps2, psCase, psQueryResults);
      expect(mockMapper).toHaveBeenCalledWith(ps, psCase, psQueryResultsBlocked);
  
      expect(mockPersistence).toHaveBeenCalledWith('GBR-2023-PS-6D2C91A0A', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
      expect(mockPersistence).toHaveBeenCalledWith('GBR-2023-PS-6D2C91A0A', expectedResult, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    });
  
    it('will add PS voided payload to the the report queue', async () => {
  
      const psVoided: IDocument = {
        "documentNumber": "GBR-2023-PS-6D2C91A0A",
        "status": "VOID",
        "createdAt": new Date("2020-06-24T10:39:32.000Z"),
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "createdByEmail": "foo@foo.com",
        "requestByAdmin": false,
        "contactId": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ13",
        "__t": "processingStatement",
        "audit": [],
        "exportData": {
          "catches": [
            {
              "foreignCatchCertificateNumber": "PS2",
              "id": "PS2-1610018839",
              "species": "Atlantic cod (COD)",
              "cnCode": "FRESHCOD",
              "scientificName": "Gadus morhua",
              "importedWeight": 200,
              "usedWeightAgainstCertificate": 100,
              "processedWeight": 80,
              "validation": {
                "status": SdPsStatus.Success,
                "totalUsedWeightAgainstCertificate": 150,
                "weightExceededAmount": 0,
                "overuseInfo": undefined,
              }
            }
          ],
          "products": [
            {
              "id": "GBR-2023-PS-6D2C91A0A-1692962523",
              "commodityCode": "03021180",
              "description": "something",
              "_id": {
                "$oid": "64e88f2814ee5ab32f4a9279"
              }
            }
          ],
          "consignmentDescription": null,
          "healthCertificateNumber": "20/2/123456",
          "healthCertificateDate": "25/08/2023",
          "exporterDetails": {
            "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
            "buildingNumber": null,
            "subBuildingName": "NATURAL ENGLAND",
            "buildingName": "LANCASTER HOUSE",
            "streetName": "HAMPSHIRE COURT",
            "county": null,
            "country": "United Kingdom of Great Britain and Northern Ireland",
            "postcode": "NE4 7YH",
            "townCity": "NEWCASTLE UPON TYNE",
            "exporterCompanyName": "Automation Testing Ltd"
          },
          "personResponsibleForConsignment": "Isaac",
          "plantApprovalNumber": "1234",
          "plantName": "name",
          "plantAddressOne": "LANCASTER HOUSE, MMO SUB, HAMPSHIRE COURT",
          "plantSubBuildingName": "MMO SUB",
          "plantBuildingName": "LANCASTER HOUSE",
          "plantStreetName": "HAMPSHIRE COURT",
          "plantCounty": "TYNESIDE",
          "plantCountry": "ENGLAND",
          "plantTownCity": "NEWCASTLE UPON TYNE",
          "plantPostcode": "NE4 7YH",
          "dateOfAcceptance": "25/08/2023",
        },
        "documentUri": "_5831e2cd-faef-4e64-9d67-3eb23ba7d930.pdf"
      };
  
      const psCase: IDynamicsProcessingStatementCase = {
        "exporter": {
          "companyName": "FISH LTD",
          "address": {
            "building_number": "123",
            "sub_building_name": "Unit 1",
            "building_name": "CJC Fish Ltd",
            "street_name": "17  Old Edinburgh Road",
            "county": "West Midlands",
            "country": "England",
            "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
            "city": "ROWTR",
            "postCode": "WN90 23A"
          }
        },
        "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
        "documentDate": "2019-01-01 05:05:05",
        "caseType1": "PS",
        "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
        "numberOfFailedSubmissions": 4,
        "documentNumber": "GBR-2023-PS-6D2C91A0A",
        "plantName": "Bob's Fisheries LTD",
        "personResponsible": "Mr. Bob",
        "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
        "exportedTo": {
          "officialCountryName": "Nigeria",
          "isoCodeAlpha2": "NG",
          "isoCodeAlpha3": "NGR"
        },
        "catches": [
          {
            "foreignCatchCertificateNumber": "FR-PS-234234-23423-234234",
            "isDocumentIssuedInUK": false,
            "id": "GBR-2023-PS-6D2C91A0A-1234567890",
            "species": "HER",
            "cnCode": "324234324432234",
            "scientificName": "scientific name",
            "importedWeight": 500,
            "usedWeightAgainstCertificate": 700,
            "processedWeight": 800,
            "validation": {
              "status": SdPsStatus.Overuse,
              "totalUsedWeightAgainstCertificate": 700,
              "weightExceededAmount": 300,
              "overuseInfo": [
                "GBR-PS-123234-123-234”,”GBR-PS-123234-123-234"
              ]
            }
          },
          {
            "foreignCatchCertificateNumber": "IRL-PS-4324-423423-234234",
            "isDocumentIssuedInUK": false,
            "id": "GBR-PS-234234-234-234-1234567890",
            "species": "SAL",
            "cnCode": "523842358",
            "scientificName": "scientific name",
            "importedWeight": 200,
            "usedWeightAgainstCertificate": 100,
            "processedWeight": 150,
            "validation": {
              "status": SdPsStatus.Overuse,
              "totalUsedWeightAgainstCertificate": 200
            }
          }
        ],
        "da": "Northern Ireland",
        "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
        "requestedByAdmin": true,
        "clonedFrom": "GBR-PS-234234-234-234",
        "parentDocumentVoid": false
      };
  
      const expected: ServiceBusMessage = {
        body: expect.any(Object),
        messageId: expect.any(String),
        correlationId: psCase._correlationId,
        contentType: 'application/json',
        applicationProperties: {
          EntityKey: psCase.documentNumber,
          PublisherId: 'FES',
          OrganisationId: psCase.exporter.accountId || null,
          UserId: psCase.exporter.contactId || null,
          SchemaVersion: 2,
          Type: "Internal",
          Status: shared.CertificateStatus.VOID,
          TimestampUtc: expect.any(String)
        },
        subject: shared.MessageLabel.PROCESSING_STATEMENT_VOIDED + '-GBR-2023-PS-6D2C91A0A'
      };
  
      const mockMapper = jest.spyOn(defraTradeValidation, 'toDefraTradePs');
  
      await SUT.reportPsToTrade(psVoided, shared.MessageLabel.PROCESSING_STATEMENT_VOIDED, psCase, null)
      expect(mockMapper).toHaveBeenCalledWith(psVoided, psCase, null)
      expect(mockPersistence).toHaveBeenCalledWith('GBR-2023-PS-6D2C91A0A', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    })

  
  
});

describe('azureTradeQueueEnabled feature flag turned off', () => {
  let mockPersistence;
  let mockLogInfo;

  beforeEach(() => {
    mockLogInfo = jest.spyOn(logger, 'info');
    mockPersistence = jest.spyOn(shared, 'addToReportQueue');

    ApplicationConfig.prototype.azureTradeQueueEnabled = false;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will add CC payload without CHIP to the the report queue, when configuration is false', async () => {
    const cc: any = { test: 'catch certificate', documentNumber: 'document1' };
    const mockMapper = jest.spyOn(defraTradeValidation, 'toDefraTradeCc');
    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
      "documentNumber": "GBR-2023-CC-C58DF9A73",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": shared.LandingStatusType.DataNeverExpected,
          "id": "GBR-2023-CC-C58DF9A73-4248789552",
          "landingDate": "2023-08-31",
          "species": "BSF",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "ASHLEIGH JANE",
          "vesselPln": "OB81",
          "vesselLength": 9.91,
          "vesselAdministration": "Scotland",
          "licenceHolder": "C & J SHELLFISH LTD",
          "speciesAlias": "N",
          "weight": 89,
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": false,
          "isLate": false,
          "validation": {
            "liveExportWeight": 110.36,
            "totalRecordedAgainstLanding": 220.72,
            "landedWeightExceededBy": null,
            "rawLandingsUrl": "http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=A12860",
            "salesNoteUrl": "http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=A12860",
            "isLegallyDue": false
          },
          "risking": {
            "vessel": "0.5",
            "speciesRisk": "1",
            "exporterRiskScore": "1",
            "landingRiskScore": "0.5",
            "highOrLowRisk": shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          }
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA"
      }
    };

    const expected: ServiceBusMessage = {
      body: dynamicsCatchCertificateCase,
      subject: 'catch_certificate_submitted-document1',
      sessionId: 'f59339d6-e1d2-4a46-93d5-7eb9bb139e1b'
    };

    await SUT.reportCcToTrade(cc, shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED, dynamicsCatchCertificateCase, []);

    expect(mockLogInfo).toHaveBeenCalledWith(`[DEFRA-TRADE-CC][DOCUMENT-NUMBER][${cc.documentNumber}][CHIP-DISABLED]`);
    expect(mockPersistence).toHaveBeenCalledWith('document1', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(mockMapper).not.toHaveBeenCalled();
  });

  it('will add PS payload without CHIP to the the report queue, when configuration is false', async () => {
    const ps: any = { test: 'processing statement', documentNumber: 'document1' };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradePs');
    const psCase: IDynamicsProcessingStatementCase = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "PS",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-PS-234234-234-234",
      "plantName": "Bob's Fisheries LTD",
      "personResponsible": "Mr. Bob",
      "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGR"
      },
      "catches": [
        {
          "foreignCatchCertificateNumber": "FR-PS-234234-23423-234234",
          "isDocumentIssuedInUK": true,
          "id": "GBR-PS-234234-234-234-1234567890",
          "species": "HER",
          "cnCode": "324234324432234",
          "scientificName": "scientific name",
          "importedWeight": 500,
          "usedWeightAgainstCertificate": 700,
          "processedWeight": 800,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 700,
            "weightExceededAmount": 300,
            "overuseInfo": [
              "GBR-PS-123234-123-234”,”GBR-PS-123234-123-234"
            ]
          }
        },
        {
          "foreignCatchCertificateNumber": "IRL-PS-4324-423423-234234",
          "isDocumentIssuedInUK": false,
          "id": "GBR-PS-234234-234-234-1234567890",
          "species": "SAL",
          "cnCode": "523842358",
          "scientificName": "scientific name",
          "importedWeight": 200,
          "usedWeightAgainstCertificate": 100,
          "processedWeight": 150,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 200
          }
        }
      ],

      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": true,
    };

    const psCaseExpected: IDynamicsProcessingStatementCase = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "PS",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-PS-234234-234-234",
      "plantName": "Bob's Fisheries LTD",
      "personResponsible": "Mr. Bob",
      "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGR"
      },
      "catches": [
        {
          "foreignCatchCertificateNumber": "FR-PS-234234-23423-234234",
          "id": "GBR-PS-234234-234-234-1234567890",
          "species": "HER",
          "cnCode": "324234324432234",
          "scientificName": "scientific name",
          "importedWeight": 500,
          "usedWeightAgainstCertificate": 700,
          "processedWeight": 800,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 700,
            "weightExceededAmount": 300,
            "overuseInfo": [
              "GBR-PS-123234-123-234”,”GBR-PS-123234-123-234"
            ]
          }
        },
        {
          "foreignCatchCertificateNumber": "IRL-PS-4324-423423-234234",
          "id": "GBR-PS-234234-234-234-1234567890",
          "species": "SAL",
          "cnCode": "523842358",
          "scientificName": "scientific name",
          "importedWeight": 200,
          "usedWeightAgainstCertificate": 100,
          "processedWeight": 150,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 200
          }
        }
      ],

      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": true,
    };

    const psQueryResults: ISdPsQueryResult[] = [{
      documentNumber: "PS1",
      catchCertificateNumber: "PS2",
      catchCertificateType: "uk",
      documentType: "PS",
      createdAt: "2020-01-01",
      status: "COMPLETE",
      species: "Atlantic cod (COD)",
      scientificName: "Gadus morhua",
      commodityCode: "FRESHCOD",
      weightOnDoc: 100,
      weightOnAllDocs: 150,
      weightOnFCC: 200,
      weightAfterProcessing: 80,
      isOverAllocated: false,
      overUsedInfo: [],
      isMismatch: false,
      overAllocatedByWeight: 0,
      da: 'England',
      extended: {
        id: 'PS2-1610018839',
      }
    }];

    const expected: ServiceBusMessage = {
      body: psCaseExpected,
      subject: 'processing_statement_submitted-document1',
      sessionId: 'c03483ba-86ed-49be-ba9d-695ea27b3951'
    };

    await SUT.reportPsToTrade(ps, Shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED, psCase, psQueryResults);

    expect(mockLogInfo).toHaveBeenCalledWith(`[DEFRA-TRADE-PS][DOCUMENT-NUMBER][${ps.documentNumber}][CHIP-DISABLED]`);
    expect(mockPersistence).toHaveBeenCalledWith('document1', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(mockMapper).not.toHaveBeenCalled();
  });

  it('Should covering reportsPs undefined', async () => {
      const psVoided: IDocument = {
        "documentNumber": "GBR-2023-PS-6D2C91A0A",
        "status": "VOID",
        "createdAt": new Date("2020-06-24T10:39:32.000Z"),
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "createdByEmail": "foo@foo.com",
        "requestByAdmin": false,
        "contactId": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ13",
        "__t": "processingStatement",
        "audit": [],
        "documentUri": "_5831e2cd-faef-4e64-9d67-3eb23ba7d930.pdf"
      };
  
    const psCase: IDynamicsProcessingStatementCase = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "PS",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-PS-234234-234-234",
      "plantName": "Bob's Fisheries LTD",
      "personResponsible": "Mr. Bob",
      "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGR"
      },
      "catches": [
        {
          "foreignCatchCertificateNumber": "FR-PS-234234-23423-234234",
          "isDocumentIssuedInUK": true,
          "id": "GBR-PS-234234-234-234-1234567890",
          "species": "HER",
          "cnCode": "324234324432234",
          "scientificName": "scientific name",
          "importedWeight": 500,
          "usedWeightAgainstCertificate": 700,
          "processedWeight": 800,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 700,
            "weightExceededAmount": 300,
            "overuseInfo": [
              "GBR-PS-123234-123-234”,”GBR-PS-123234-123-234"
            ]
          }
        },
        {
          "foreignCatchCertificateNumber": "IRL-PS-4324-423423-234234",
          "isDocumentIssuedInUK": false,
          "id": "GBR-PS-234234-234-234-1234567890",
          "species": "SAL",
          "cnCode": "523842358",
          "scientificName": "scientific name",
          "importedWeight": 200,
          "usedWeightAgainstCertificate": 100,
          "processedWeight": 150,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 200
          }
        }
      ],

      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": true,
    };


    const psQueryResults: ISdPsQueryResult[] = [{
      documentNumber: "PS1",
      catchCertificateNumber: "PS2",
      catchCertificateType: "uk",
      documentType: "PS",
      createdAt: "2020-01-01",
      status: "COMPLETE",
      species: "Atlantic cod (COD)",
      scientificName: "Gadus morhua",
      commodityCode: "FRESHCOD",
      weightOnDoc: 100,
      weightOnAllDocs: 150,
      weightOnFCC: 200,
      weightAfterProcessing: 80,
      isOverAllocated: false,
      overUsedInfo: [],
      isMismatch: false,
      overAllocatedByWeight: 0,
      da: 'England',
      extended: {
        id: 'PS2-1610018839',
      }
    }];
        const expected = {
      exporter: {
        contactId: 'a contact id',
        accountId: 'an account id',
        dynamicsAddress: {
          defra_addressid: '00185463-69c2-e911-a97a-000d3a2cbad9',
          defra_buildingname: 'Lancaster House',
          defra_fromcompanieshouse: false,
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: 'No',
          defra_postcode: 'NE4 7YJ',
          defra_premises: '23',
          defra_street: 'Newcastle upon Tyne',
          defra_towntext: 'Newcastle upon Tyne',
          _defra_country_value: 'f49cf73a-fa9c-e811-a950-000d3a3a2566',
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: 'defra_Country',
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: 'defra_country',
          _defra_country_value_OData_Community_Display_V1_FormattedValue: 'United Kingdom of Great Britain and Northern Ireland'
        },
        companyName: 'FISH LTD',
        address: {
          building_number: '123',
          sub_building_name: 'Unit 1',
          building_name: 'CJC Fish Ltd',
          street_name: '17  Old Edinburgh Road',
          county: 'West Midlands',
          country: 'England',
          line1: '123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road',
          city: 'ROWTR',
          postCode: 'WN90 23A'
        }
      },
      documentUrl: 'http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf',
      documentDate: '2019-01-01 05:05:05',
      caseType1: 'PS',
      caseType2: 'Real Time Validation - Overuse Failure',
      numberOfFailedSubmissions: 4,
      documentNumber: 'GBR-PS-234234-234-234',
      plantName: "Bob's Fisheries LTD",
      personResponsible: 'Mr. Bob',
      processedFisheryProducts: 'Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),',
      exportedTo: undefined,
      catches: [
        {
          foreignCatchCertificateNumber: 'PS2',
          species: 'Atlantic cod (COD)',
          id: 'PS2-1610018839',
          cnCode: 'FRESHCOD',
          scientificName: 'Gadus morhua',
          importedWeight: 200,
          usedWeightAgainstCertificate: 100,
          processedWeight: 80,
          validation: {
         "overuseInfo": undefined,
         "status": "Validation Success",
         "totalUsedWeightAgainstCertificate": 150,
         "weightExceededAmount": 0,
       },
        }
      ],
      da: 'Northern Ireland',
      _correlationId: 'c03483ba-86ed-49be-ba9d-695ea27b3951',
      requestedByAdmin: true,
      plantAddress: {
        line1: undefined,
        building_name: undefined,
        building_number: undefined,
        sub_building_name: undefined,
        street_name: undefined,
        country: undefined,
        county: undefined,
        city: undefined,
        postCode: undefined
      },
      plantApprovalNumber: undefined,
      plantDateOfAcceptance: 'Invalid date',
      healthCertificateNumber: undefined,
      healthCertificateDate: 'Invalid date',
      authority: {
        name: 'Illegal Unreported and Unregulated (IUU) Fishing Team',
        companyName: 'Marine Management Organisation',
        address: {
          line1: 'Lancaster House, Hampshire Court',
          building_name: 'Lancaster House',
          street_name: 'Hampshire Court',
          city: 'Newcastle upon Tyne',
          postCode: 'NE4 7YJ',
          country: 'United Kingdom'
        },
        tel: '0300 123 1032',
        email: 'ukiuuslo@marinemanagement.org.uk',
        dateIssued: '2017-02-14'
      }
    }
    const result = defraTradeValidation.toDefraTradePs(psVoided,psCase,psQueryResults)
    expect(result).toEqual(expected)
  });

   it('Should have catches in Processing Certificate', async () => {
    const ps: any = { test: 'processing statement', documentNumber: 'document1' };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradePs');
    const psCase: IDynamicsProcessingStatementCase = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "PS",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-PS-234234-234-234",
      "plantName": "Bob's Fisheries LTD",
      "personResponsible": "Mr. Bob",
      "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGR"
      },

      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": true,
    };

    const psCaseExpected: IDynamicsProcessingStatementCase = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "PS",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-PS-234234-234-234",
      "plantName": "Bob's Fisheries LTD",
      "personResponsible": "Mr. Bob",
      "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGR"
      },

      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": true,
    };

    const psQueryResults: ISdPsQueryResult[] = [{
      documentNumber: "PS1",
      catchCertificateNumber: "PS2",
      catchCertificateType: "uk",
      documentType: "PS",
      createdAt: "2020-01-01",
      status: "COMPLETE",
      species: "Atlantic cod (COD)",
      scientificName: "Gadus morhua",
      commodityCode: "FRESHCOD",
      weightOnDoc: 100,
      weightOnAllDocs: 150,
      weightOnFCC: 200,
      weightAfterProcessing: 80,
      isOverAllocated: false,
      overUsedInfo: [],
      isMismatch: false,
      overAllocatedByWeight: 0,
      da: 'England',
      extended: {
        id: 'PS2-1610018839',
      }
    }];

    const expected: ServiceBusMessage = {
      body: psCaseExpected,
      subject: 'processing_statement_submitted-document1',
      sessionId: 'c03483ba-86ed-49be-ba9d-695ea27b3951'
    };

    await SUT.reportPsToTrade(ps, Shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED, psCase, psQueryResults);

    expect(mockLogInfo).toHaveBeenCalledWith(`[DEFRA-TRADE-PS][DOCUMENT-NUMBER][${ps.documentNumber}][CHIP-DISABLED]`);
    expect(mockPersistence).toHaveBeenCalledWith('document1', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(mockMapper).not.toHaveBeenCalled();
  });
});

describe('resendSdToTrade', () => {
  let mockSendSdToTrade;
  let mockLogInfo;
  let mockLogError;

  beforeEach(() => {
    mockSendSdToTrade = jest.spyOn(SUT, 'sendSdToTrade');
    mockLogInfo = jest.spyOn(logger, 'info');
    mockLogError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call sendSdToTrade when ccValidationData has items', async () => {
    const ccValidationData: ISdPsQueryResult[] = [{
      documentNumber: "SD-001",
      catchCertificateNumber: "CC1",
      catchCertificateType: "uk",
      documentType: "SD",
      createdAt: "2020-01-01",
      status: "COMPLETE",
      species: "Atlantic cod (COD)",
      commodityCode: "03025110",
      weightOnDoc: 100,
      weightOnAllDocs: 150,
      weightOnFCC: 200,
      isOverAllocated: false,
      overUsedInfo: [],
      isMismatch: false,
      overAllocatedByWeight: 0,
      da: null,
      extended: { id: 'catch-1' }
    }];

    mockSendSdToTrade.mockResolvedValue(undefined);

    await SUT.resendSdToTrade(ccValidationData);

    expect(mockLogInfo).toHaveBeenCalledWith('[REPORT-SD-RESUBMITTED][ccValidationData][1]');
    expect(mockSendSdToTrade).toHaveBeenCalledWith(ccValidationData);
  });

  it('should not call sendSdToTrade when ccValidationData is empty', async () => {
    mockSendSdToTrade.mockResolvedValue(undefined);

    await SUT.resendSdToTrade([]);

    expect(mockLogInfo).toHaveBeenCalledWith('[REPORT-SD-RESUBMITTED][ccValidationData][0]');
    expect(mockSendSdToTrade).not.toHaveBeenCalled();
  });

  it('should throw error and log when sendSdToTrade fails', async () => {
    const ccValidationData: ISdPsQueryResult[] = [{
      documentNumber: "SD-001",
      catchCertificateNumber: "CC1",
      catchCertificateType: "uk",
      documentType: "SD",
      createdAt: "2020-01-01",
      status: "COMPLETE",
      species: "Atlantic cod (COD)",
      commodityCode: "03025110",
      weightOnDoc: 100,
      weightOnAllDocs: 150,
      weightOnFCC: 200,
      isOverAllocated: false,
      overUsedInfo: [],
      isMismatch: false,
      overAllocatedByWeight: 0,
      da: null,
      extended: { id: 'catch-1' }
    }];

    const error = new Error('Test error');
    mockSendSdToTrade.mockRejectedValue(error);

    await expect(SUT.resendSdToTrade(ccValidationData)).rejects.toThrow('Test error');
    expect(mockLogError).toHaveBeenCalledWith('[REREPORT-SD-SUBMITTED][ERROR][Error: Test error]');
  });
});

describe('sendSdToTrade', () => {
  let mockGetCertificate;
  let mockReportSdToTrade;
  let mockLogInfo;

  beforeEach(() => {
    mockGetCertificate = jest.spyOn(catchCerts, 'getCertificateByDocumentNumberWithNumberOfFailedAttempts');
    mockReportSdToTrade = jest.spyOn(SUT, 'reportSdToTrade');
    mockLogInfo = jest.spyOn(logger, 'info');
    uuid.mockReturnValue('test-correlation-id');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should not process when sdpsValidationData is empty', async () => {
    await SUT.sendSdToTrade([]);

    expect(mockGetCertificate).not.toHaveBeenCalled();
    expect(mockReportSdToTrade).not.toHaveBeenCalled();
  });

  it('should call reportSdToTrade when certificate is found', async () => {
    const sdpsValidationData: ISdPsQueryResult[] = [{
      documentNumber: "SD-001",
      catchCertificateNumber: "CC1",
      catchCertificateType: "uk",
      documentType: "SD",
      createdAt: "2020-01-01",
      status: "COMPLETE",
      species: "Atlantic cod (COD)",
      commodityCode: "03025110",
      weightOnDoc: 100,
      weightOnAllDocs: 150,
      weightOnFCC: 200,
      isOverAllocated: false,
      overUsedInfo: [],
      isMismatch: false,
      overAllocatedByWeight: 0,
      da: null,
      extended: { id: 'catch-1' }
    }];

    const mockCertificate = {
      documentNumber: 'SD-001',
      __t: 'storageDocument',
      exportData: {
        exporterDetails: { postcode: 'NE1 1AA', exporterCompanyName: 'Test Co' }
      }
    };

    mockGetCertificate.mockResolvedValue(mockCertificate);
    mockReportSdToTrade.mockResolvedValue(undefined);

    await SUT.sendSdToTrade(sdpsValidationData);

    expect(mockLogInfo).toHaveBeenCalledWith('[DATA-HUB][REPORT-SD-SUBMITTED][SD-001]');
    expect(mockLogInfo).toHaveBeenCalledWith('[DATA-HUB][REPORT-SD-SUBMITTED][SD-001][FOUND]');
    expect(mockReportSdToTrade).toHaveBeenCalled();
  });

  it('should log NOT-FOUND when certificate is not found', async () => {
    const sdpsValidationData: ISdPsQueryResult[] = [{
      documentNumber: "SD-001",
      catchCertificateNumber: "CC1",
      catchCertificateType: "uk",
      documentType: "SD",
      createdAt: "2020-01-01",
      status: "COMPLETE",
      species: "Atlantic cod (COD)",
      commodityCode: "03025110",
      weightOnDoc: 100,
      weightOnAllDocs: 150,
      weightOnFCC: 200,
      isOverAllocated: false,
      overUsedInfo: [],
      isMismatch: false,
      overAllocatedByWeight: 0,
      da: null,
      extended: { id: 'catch-1' }
    }];

    mockGetCertificate.mockResolvedValue(null);

    await SUT.sendSdToTrade(sdpsValidationData);

    expect(mockLogInfo).toHaveBeenCalledWith('[DATA-HUB][REPORT-SD-SUBMITTED][SD-001]');
    expect(mockLogInfo).toHaveBeenCalledWith('[DATA-HUB][REPORT-SD-SUBMITTED][SD-001][NOT-FOUND]');
    expect(mockReportSdToTrade).not.toHaveBeenCalled();
  });
});

describe('reportSdToTrade', () => {
  let mockPersistence;
  let mockLogError;
  let mockLogInfo;
  let mockToDefraTradeSd;

  const baseStorageDocument: any = {
    documentNumber: 'GBR-SD-2023-12345',
    __t: 'storageDocument',
    status: 'COMPLETE',
    documentUri: '_test-document.pdf',
    userReference: 'test-reference',
    exportData: {
      exporterDetails: {
        postcode: 'NE1 1AA',
        exporterCompanyName: 'Test Fish Ltd',
        contactId: 'contact-123',
        accountId: 'account-456'
      },
      exportedTo: {
        officialCountryName: 'France',
        isoCodeAlpha2: 'FR',
        isoCodeAlpha3: 'FRA'
      },
      transportation: {
        vehicle: 'truck',
        cmr: true,
        exportDate: '01/01/2023'
      },
      catches: [
        {
          id: 'catch-1',
          certificateNumber: 'CC-001',
          certificateType: 'uk',
          product: 'COD',
          productWeight: '100',
          weightOnCC: '100'
        }
      ]
    }
  };

  const baseStorageDocumentCase: any = {
    exporter: {
      contactId: 'contact-123',
      accountId: 'account-456',
      companyName: 'Test Fish Ltd',
      address: {
        line1: '123 Test Street',
        city: 'Newcastle',
        postCode: 'NE1 1AA',
        country: 'UK'
      },
      dynamicsAddress: {
        defra_postcode: 'NE1 1AA',
        defra_towntext: 'Newcastle'
      }
    },
    documentUrl: 'http://test.gov.uk/document.pdf',
    documentDate: '2023-01-01',
    caseType1: 'SD',
    caseType2: SdPsCaseTwoType.RealTimeValidation_Success,
    numberOfFailedSubmissions: 0,
    documentNumber: 'GBR-SD-2023-12345',
    companyName: 'Test Fish Ltd',
    exportedTo: {
      officialCountryName: 'France',
      isoCodeAlpha2: 'FR',
      isoCodeAlpha3: 'FRA'
    },
    products: [
      {
        id: 'product-1',
        foreignCatchCertificateNumber: 'CC-001',
        isDocumentIssuedInUK: true,
        species: 'COD',
        cnCode: '03025110',
        scientificName: 'Gadus morhua',
        importedWeight: 100,
        exportedWeight: 100,
        validation: {
          status: SdPsStatus.Success,
          totalWeightExported: 100
        },
        issuingCountry: 'UK'
      }
    ],
    da: 'England',
    _correlationId: 'test-correlation-id',
    requestedByAdmin: false,
    clonedFrom: 'some-cloned-doc',
    parentDocumentVoid: false,
    placeOfUnloading: 'Dover',
    pointOfDestination: 'Calais'
  };

  const baseSdQueryResults: ISdPsQueryResult[] = [{
    documentNumber: 'GBR-SD-2023-12345',
    catchCertificateNumber: 'CC-001',
    catchCertificateType: 'uk',
    documentType: 'storageDocument',
    createdAt: '2023-01-01',
    status: 'COMPLETE',
    species: 'Atlantic cod (COD)',
    commodityCode: '03025110',
    weightOnDoc: 100,
    weightOnAllDocs: 100,
    weightOnFCC: 100,
    isOverAllocated: false,
    overUsedInfo: [],
    isMismatch: false,
    overAllocatedByWeight: 0,
    da: 'England',
    extended: { id: 'catch-1' }
  }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogError = jest.spyOn(logger, 'error');
    mockLogInfo = jest.spyOn(logger, 'info');
    mockPersistence = jest.spyOn(shared, 'addToReportQueue');
    mockPersistence.mockResolvedValue(null);
    mockToDefraTradeSd = jest.spyOn(defraTradeValidation, 'toDefraTradeSd');
    uuid.mockImplementation(() => 'test-uuid');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when azureTradeQueueEnabled is false', () => {
    beforeEach(() => {
      ApplicationConfig.prototype.azureTradeQueueEnabled = false;
    });

    afterEach(() => {
      ApplicationConfig.prototype.azureTradeQueueEnabled = true;
    });

    it('should send message to queue with CHIP-DISABLED and delete sensitive fields from products', async () => {
      const storageDocumentCase = { ...baseStorageDocumentCase };

      await SUT.reportSdToTrade(baseStorageDocument, 'SD' as any, storageDocumentCase, baseSdQueryResults);

      expect(mockLogInfo).toHaveBeenCalledWith(`[DEFRA-TRADE-SD][DOCUMENT-NUMBER][${baseStorageDocument.documentNumber}][CHIP-DISABLED]`);
      expect(mockPersistence).toHaveBeenCalled();
      expect(storageDocumentCase.clonedFrom).toBeUndefined();
      expect(storageDocumentCase.parentDocumentVoid).toBeUndefined();
      expect(storageDocumentCase.placeOfUnloading).toBeUndefined();
      expect(storageDocumentCase.pointOfDestination).toBeUndefined();
    });

    it('should handle products with undefined products array', async () => {
      const storageDocumentCase = { ...baseStorageDocumentCase, products: undefined };

      await SUT.reportSdToTrade(baseStorageDocument, 'SD' as any, storageDocumentCase, baseSdQueryResults);

      expect(mockLogInfo).toHaveBeenCalledWith(`[DEFRA-TRADE-SD][DOCUMENT-NUMBER][${baseStorageDocument.documentNumber}][CHIP-DISABLED]`);
      expect(mockPersistence).toHaveBeenCalled();
    });

    it('should delete isDocumentIssuedInUK from products when CHIP is disabled', async () => {
      const storageDocumentCase = { ...baseStorageDocumentCase };
      
      await SUT.reportSdToTrade(baseStorageDocument, 'SD' as any, storageDocumentCase, baseSdQueryResults);

      const callArgs = mockPersistence.mock.calls[0];
      const message = callArgs[1];
      if (message.body.products) {
        message.body.products.forEach(product => {
          expect(product.isDocumentIssuedInUK).toBeUndefined();
        });
      }
    });
  });

  describe('when azureTradeQueueEnabled is true', () => {
    beforeEach(() => {
      ApplicationConfig.prototype.azureTradeQueueEnabled = true;
    });

    const validSdDefraTrade = {
      version: "2",
      _correlationId: 'test-correlation-id',
      documentNumber: 'GBR-SD-2023-12345',
      documentUrl: 'http://test.gov.uk/document.pdf',
      documentDate: '2023-01-01',
      caseType1: 'SD',
      caseType2: 'Real Time Validation - Successful',
      numberOfFailedSubmissions: 0,
      companyName: 'Test Fish Ltd',
      exporter: {
        contactId: 'contact-123',
        accountId: 'account-456',
        companyName: 'Test Fish Ltd',
        address: {
          building_number: '123',
          sub_building_name: 'Unit 1',
          building_name: 'Test Building',
          street_name: '17 Old Edinburgh Road',
          county: 'Tyne and Wear',
          country: 'England',
          line1: '123 Test Street',
          city: 'Newcastle',
          postCode: 'NE1 1AA'
        },
        dynamicsAddress: {
          defra_addressid: '00185463-69c2-e911-a97a-000d3a2cbad9',
          defra_buildingname: 'Lancaster House',
          defra_fromcompanieshouse: false,
          defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue: 'No',
          defra_postcode: 'NE4 7YJ',
          defra_premises: '23',
          defra_street: 'Newcastle upon Tyne',
          defra_towntext: 'Newcastle upon Tyne',
          _defra_country_value: 'f49cf73a-fa9c-e811-a950-000d3a3a2566',
          _defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty: 'defra_Country',
          _defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname: 'defra_country',
          _defra_country_value_OData_Community_Display_V1_FormattedValue: 'United Kingdom of Great Britain and Northern Ireland'
        }
      },
      exportedTo: {
        officialCountryName: 'France',
        isoCodeAlpha2: 'FR',
        isoCodeAlpha3: 'FRA',
        isoNumericCode: '250'
      },
      authority: {
        name: 'Illegal Unreported and Unregulated (IUU) Fishing Team',
        companyName: 'Marine Management Organisation',
        address: {
          line1: 'Tyneside House',
          street_name: 'Skinnerburn Rd',
          city: 'Newcastle upon Tyne',
          postCode: 'NE4 7AR',
          country: 'United Kingdom'
        },
        tel: '0300 123 1032',
        email: 'ukiuuslo@marinemanagement.org.uk',
        dateIssued: '2023-01-01'
      },
      transportation: {
        modeofTransport: 'truck',
        hasRoadTransportDocument: true,
        exportDate: '2023-01-01'
      },
      storageFacility: {
        name: 'Test Facility',
        address: {
          line1: '456 Storage Lane',
          city: 'Newcastle',
          postCode: 'NE2 2BB',
          country: 'UK'
        }
      },
      products: [
        {
          id: 'product-1',
          foreignCatchCertificateNumber: 'CC-001',
          species: 'COD',
          cnCode: '03025110',
          scientificName: 'Gadus morhua',
          importedWeight: 100,
          exportedWeight: 100,
          validation: {
            status: 'Validation Success',
            totalWeightExported: 100
          },
          issuingCountry: 'UK'
        }
      ],
      da: 'England',
      requestedByAdmin: false
    };

    it('should log INVALID-PAYLOAD and return early when validation fails', async () => {
      const storageDocumentCase = { ...baseStorageDocumentCase };

      // Mock toDefraTradeSd to return an invalid payload
      mockToDefraTradeSd.mockReturnValue({
        // Invalid payload - missing required fields
      });

      await SUT.reportSdToTrade(baseStorageDocument, 'SD' as any, storageDocumentCase, baseSdQueryResults);

      expect(mockLogError).toHaveBeenCalledWith(expect.stringContaining('[DEFRA-TRADE-SD][DOCUMENT-NUMBER]'));
      expect(mockLogError).toHaveBeenCalledWith(expect.stringContaining('[INVALID-PAYLOAD]'));
    });

    it('should set status to VOID when sdQueryResults is not an array', async () => {
      const storageDocumentCase = { ...baseStorageDocumentCase };

      mockToDefraTradeSd.mockReturnValue(validSdDefraTrade);

      await SUT.reportSdToTrade(baseStorageDocument, 'SD' as any, storageDocumentCase, null);
      
      const callArgs = mockPersistence.mock.calls[0];
      const message = callArgs[1];
      expect(message.applicationProperties.Status).toBe('VOID');
    });

    it('should set status to BLOCKED when any sdQueryResult has BLOCKED status', async () => {
      const storageDocumentCase = { ...baseStorageDocumentCase };
      const blockedSdQueryResults: ISdPsQueryResult[] = [{
        ...baseSdQueryResults[0],
        status: 'BLOCKED'
      }];

      mockToDefraTradeSd.mockReturnValue(validSdDefraTrade);

      await SUT.reportSdToTrade(baseStorageDocument, 'SD' as any, storageDocumentCase, blockedSdQueryResults);

      const callArgs = mockPersistence.mock.calls[0];
      const message = callArgs[1];
      expect(message.applicationProperties.Status).toBe('BLOCKED');
    });

    it('should set status to COMPLETE when all sdQueryResults have non-BLOCKED status', async () => {
      const storageDocumentCase = { ...baseStorageDocumentCase };

      mockToDefraTradeSd.mockReturnValue(validSdDefraTrade);

      await SUT.reportSdToTrade(baseStorageDocument, 'SD' as any, storageDocumentCase, baseSdQueryResults);

      const callArgs = mockPersistence.mock.calls[0];
      const message = callArgs[1];
      expect(message.applicationProperties.Status).toBe('COMPLETE');
    });

    it('should include all required application properties in the message', async () => {
      const storageDocumentCase = { ...baseStorageDocumentCase };

      mockToDefraTradeSd.mockReturnValue(validSdDefraTrade);

      await SUT.reportSdToTrade(baseStorageDocument, 'SD' as any, storageDocumentCase, baseSdQueryResults);

      const callArgs = mockPersistence.mock.calls[0];
      const message = callArgs[1];

      expect(message.applicationProperties.EntityKey).toBe('GBR-SD-2023-12345');
      expect(message.applicationProperties.PublisherId).toBe('FES');
      expect(message.applicationProperties.OrganisationId).toBe('account-456');
      expect(message.applicationProperties.UserId).toBe('contact-123');
      expect(message.applicationProperties.Type).toBe('Internal');
      expect(message.applicationProperties.TimestampUtc).toBeDefined();
    });

    it('should handle undefined exporter accountId and contactId', async () => {
      const storageDocumentCase = { ...baseStorageDocumentCase };
      // Create a payload without contactId and accountId (schema allows optional)
      const { contactId, accountId, ...exporterWithoutIds } = validSdDefraTrade.exporter;
      const undefinedExporterPayload = {
        ...validSdDefraTrade,
        exporter: exporterWithoutIds
      };

      mockToDefraTradeSd.mockReturnValue(undefinedExporterPayload);

      await SUT.reportSdToTrade(baseStorageDocument, 'SD' as any, storageDocumentCase, baseSdQueryResults);

      const callArgs = mockPersistence.mock.calls[0];
      const message = callArgs[1];

      // When contactId/accountId are undefined, ?? null returns null
    });
  });
});

