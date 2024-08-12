
import * as SUT from "../../src/services/caseManagement.service";
import logger from "../../src/logger";
import { ApplicationConfig } from "../../src/config";
import * as DynamicsMapper from "../../src/landings/transformations/dynamicsValidation";
import * as shared from "mmo-shared-reference-data";
const correlationId = 'some-uuid-correlation-id';

describe('reportCc', () => {

  let mockMapperLandingDetail;
  let mockPersistence;
  let mockLogInfo;
  let mockLogError;

  ApplicationConfig.loadEnv({
    AZURE_QUEUE_CONNECTION_STRING: 'AZURE_QUEUE_CONNECTION_STRING',
    REPORT_QUEUE: 'REPORT_QUEUE'
  });

  beforeEach(() => {
    mockMapperLandingDetail = jest.spyOn(DynamicsMapper, 'toDynamicsLandingDetails');
    mockLogInfo = jest.spyOn(logger, 'info');
    mockLogError = jest.spyOn(logger, 'error');
    mockPersistence = jest.spyOn(shared, 'addToReportQueue');
    mockPersistence.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call the mapper and pass the result to the persistence service for landing detail', async () => {
    const ccQuery: any[] = [{test: 'validation result', extended: {}}];
    const cc: any = {test: 'catch certificate', documentNumber: 'document1'};
    const message: any = {
      body: [{ test: 'mapped', _correlationId: correlationId }],
      subject: "new-landing-document1",
      sessionId: "some-uuid-correlation-id"
    };

    mockMapperLandingDetail.mockReturnValue([{ test: 'mapped', _correlationId: correlationId }]);

    await SUT.reportCc(ccQuery, cc, correlationId, shared.MessageLabel.NEW_LANDING);

    expect(mockMapperLandingDetail).toHaveBeenCalledWith(ccQuery, cc, 'some-uuid-correlation-id');
    expect(mockPersistence).toHaveBeenCalledWith('document1', message, 'AZURE_QUEUE_CONNECTION_STRING', 'REPORT_QUEUE', false);
    expect(mockLogInfo).toHaveBeenCalledWith('[LANDING-DETAIL-CC][DOCUMENT-NUMBER][document1][CORRELATION-ID][some-uuid-correlation-id][NUMBER-OF-LANDINGS][1]');
  });

  it('should call the mapper when the landing end date is in the past', async () => {
    const ccQuery: any[] = [{test: 'validation result', extended: { landingDataEndDate: '1901-01-01' }}];
    const cc: any = {test: 'catch certificate', documentNumber: 'document1'};

    mockMapperLandingDetail.mockReturnValue([]);

    await SUT.reportCc(ccQuery, cc, correlationId, shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED);

    expect(mockMapperLandingDetail).toHaveBeenCalled();
    expect(mockPersistence).not.toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalledWith('[LANDING-DETAIL-CC][DOCUMENT-NUMBER][document1][CORRELATION-ID][some-uuid-correlation-id][NO-LANDING-UPDATES]');
  });

  it('should not send an empty landings details array to case management', async () => {
    const ccQuery: any[] = [];
    const cc: any = {test: 'catch certificate', documentNumber: 'document1'};

    mockMapperLandingDetail.mockReturnValue([]);

    await SUT.reportCc(ccQuery, cc, correlationId, shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED);

    expect(mockMapperLandingDetail).toHaveBeenCalled();
    expect(mockPersistence).not.toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalledWith('[LANDING-DETAIL-CC][DOCUMENT-NUMBER][document1][CORRELATION-ID][some-uuid-correlation-id][NO-LANDING-UPDATES]');
  });

  it('should not send an undefined landings details array to case management', async () => {
    const ccQuery: any = undefined;
    const cc: any = {test: 'catch certificate', documentNumber: 'document1'};

    mockMapperLandingDetail.mockReturnValue(undefined);

    await SUT.reportCc(ccQuery, cc, correlationId, shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED);

    expect(mockMapperLandingDetail).toHaveBeenCalled();
    expect(mockPersistence).not.toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalledWith('[LANDING-DETAIL-CC][DOCUMENT-NUMBER][document1][CORRELATION-ID][some-uuid-correlation-id][NO-LANDING-UPDATES]');
  });
});

describe('report14DayLimitReached', () => {

  let mockMapperLandingDetail;
  let mockPersistence;
  let mockLogInfo;

  ApplicationConfig.loadEnv({
    AZURE_QUEUE_CONNECTION_STRING: 'AZURE_QUEUE_CONNECTION_STRING',
    REPORT_QUEUE: 'REPORT_QUEUE'
  });

  beforeEach(() => {
    mockMapperLandingDetail = jest.spyOn(DynamicsMapper, 'toDynamicsLandingDetails');
    mockLogInfo = jest.spyOn(logger, 'info');
    mockPersistence = jest.spyOn(shared, 'addToReportQueue');
    mockPersistence.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call the mapper and pass the result to the persistence service for landing detail', async () => {
    const ccQuery: any[] = [{test: 'validation result'}];
    const cc: any = {test: 'catch certificate', documentNumber: 'document1'};
    const message: any = {
      body: [{ test: 'mapped', _correlationId: correlationId }],
      subject: "exceeded-landing-document1",
      sessionId: "some-uuid-correlation-id"
    };

    mockMapperLandingDetail.mockReturnValue([{ test: 'mapped', _correlationId: correlationId }]);

    await SUT.report14DayLimitReached(ccQuery, cc, correlationId, shared.MessageLabel.EXCEEDED_LANDING);

    expect(mockMapperLandingDetail).toHaveBeenCalledWith(ccQuery, cc, 'some-uuid-correlation-id');
    expect(mockPersistence).toHaveBeenCalledWith('document1', message, 'AZURE_QUEUE_CONNECTION_STRING', 'REPORT_QUEUE', false);
    expect(mockLogInfo).toHaveBeenCalledWith('[REPORTING-CC-14-DAY-LIMIT-REACHED][DOCUMENT-NUMBER][document1][CORRELATION-ID][some-uuid-correlation-id][NUMBER-OF-LANDINGS][1]');
  });

});