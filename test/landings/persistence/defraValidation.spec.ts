import { IDefraValidationReport, IDefraValidationCatchCertificate } from 'mmo-shared-reference-data';
import { ApplicationConfig } from '../../../src/config';
import { DefraValidationCatchCertificateModel, DefraValidationReportData, DefraValidationReportModel } from '../../../src/types/defraValidation';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as SUT from '../../../src/persistence/defraValidation'
import moment from 'moment';

const mongoose = require('mongoose');

let mongoServer;
const opts = { connectTimeoutMS:60000, socketTimeoutMS:600000, serverSelectionTimeoutMS:60000 }

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, opts).catch(err => {console.log(err)});
});

afterEach(async () => {
  await DefraValidationReportData.deleteMany({});
})

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const sampleReport = (certificateId: string, status: string, requestedByAdmin: boolean, landingId?: string | null, validationPass?: boolean, lastUpdated?: string, isUnblocked?: boolean, documentType?: string, processed?: boolean) => ({
  certificateId     : certificateId,
  status            : status,
  landingId         : landingId || undefined,
  validationPass    : validationPass || undefined,
  lastUpdated       : lastUpdated ? moment.utc(lastUpdated).toDate() : new Date('2020-06-01'),
  isUnblocked       : isUnblocked || false,
  requestedByAdmin  : requestedByAdmin || false,
  documentType      : documentType || undefined,
  _processed        : processed || false
});


describe('getUnprocessedReports', () => {

  it('returns any reports which havent been processed', async () => {

    const report : IDefraValidationReport = {
      certificateId: '1234',
      status: 'COMPLETE',
      landingId: 'C02514',
      validationPass: true,
      lastUpdated: new Date(),
      isUnblocked: true,
      requestedByAdmin: false
    };

    await SUT.insertDefraValidationReport(report);

    const all = await SUT.getAllDefraValidationReports();
    const unprocessed = await SUT.getUnprocessedReports();

    expect(unprocessed.length).toBe(all.length);

  });

  it('does not return any reports which have been processed', async () => {

    const report : IDefraValidationReport = {
      certificateId: '1234',
      status: 'COMPLETE',
      landingId: 'C02514',
      validationPass: true,
      lastUpdated: new Date(),
      isUnblocked: true,
      requestedByAdmin: false
    };

    await SUT.insertDefraValidationReport(report);

    await DefraValidationReportData.updateMany({}, { _processed: true }, { strict: false });

    const all = await SUT.getAllDefraValidationReports();
    const unprocessed = await SUT.getUnprocessedReports();

    expect(all.length).toBe(1);
    expect(unprocessed.length).toBe(0);

  });

  it('does return only the number of entries in batch size', async () => {

    const report : IDefraValidationReport = {
      certificateId: '1234',
      status: 'COMPLETE',
      landingId: 'C02514',
      validationPass: true,
      lastUpdated: new Date(),
      isUnblocked: true,
      requestedByAdmin: false
    };

    await SUT.insertDefraValidationReport(report);
    await SUT.insertDefraValidationReport(report);
    await SUT.insertDefraValidationReport(report);

    await DefraValidationReportData.updateMany({}, { _processed: false }, { strict: false });

    const all = await SUT.getAllDefraValidationReports();

    const backup_maximumDefraValidationReportBatchSize = ApplicationConfig.prototype.maximumDefraValidationReportBatchSize;
    ApplicationConfig.prototype.maximumDefraValidationReportBatchSize = 2;
    const unprocessed = await SUT.getUnprocessedReports();
    ApplicationConfig.prototype.maximumDefraValidationReportBatchSize = backup_maximumDefraValidationReportBatchSize;


    expect(all.length).toBe(3);
    expect(unprocessed.length).toBe(2);

  });

  it('will return all the specified data points for each record', async () => {

    const report : IDefraValidationCatchCertificate = {
      documentType: 'PS',
      documentNumber: 'DOC1',
      status: 'STATUS',
      devolvedAuthority: 'ENGLAND',
      dateCreated: new Date(Date.now()),
      lastUpdated: new Date(Date.now()),
      userReference: 'User Ref',
      audits: [{
        auditAt: new Date(Date.now()),
        auditOperation: 'INVESTIGATE',
        user: 'Bob'
      }],
      exporterDetails: {
        fullName: 'Bob',
        companyName: 'Bob Exporter',
        address: {
          line1: 'Line 1',
          city: 'City',
          postCode: 'Postcode'
        },
        contactId : 'a contact id',
        accountId : 'an account id',
        dynamicsAddress : {dynamicsData : 'original address'}
      },
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    await SUT.insertCcDefraValidationReport(report);

    const res = await SUT.getUnprocessedReports();

    expect(res.length).toBe(1);
    expect(res[0]).toMatchObject(report);

    expect(res[0]._id).not.toBe(undefined);
    expect(res[0].__v).toBe(undefined);
    expect(res[0].__t).toBe(undefined);
    expect(res[0]._processed).toBe(undefined);
  });

});

describe('markAsProcessed', () => {

  it('will mark reports as processed by id', async () => {

    await Promise.all([1,2,3,4,5].map(i => {
      const report : IDefraValidationReport = {
        certificateId: i.toString(),
        status: 'COMPLETE',
        landingId: 'C02514',
        validationPass: true,
        lastUpdated: new Date(),
        isUnblocked: true,
        requestedByAdmin: false
      };

      return SUT.insertDefraValidationReport(report);
    }));

    const all = await SUT.getUnprocessedReports();
    const ids = all.map(_ => _._id);

    expect(all.length).toBe(5);

    await SUT.markAsProcessed([ids[0], ids[1]]);

    const unprocessed = await SUT.getUnprocessedReports();

    expect(unprocessed.length).toBe(3);

  });

});

describe('getAllDefraValidationReports', () => {

  it('will return ALL defra reports if no dateFrom and no dateTo are specified', async () => {
    await new DefraValidationReportModel(sampleReport('1234', 'COMPLETE', false, '2019-02-19CS214')).save();
    await new DefraValidationReportModel(sampleReport('1235', 'DRAFT', false, '2019-02-19CS214')).save();
    await new DefraValidationCatchCertificateModel({
      documentType : "CatchCertificate",
      documentNumber: "ZZZ-34234-CC-234234",
      status: "DRAFT",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    }).save();
    await new DefraValidationReportModel(sampleReport('1237', 'BLOCKED', false, '2019-02-19CS214', false, '2019-12-01')).save();
    await new DefraValidationReportModel(sampleReport('1238', 'BLOCKED', false, '2019-02-19CS214', false, '2019-12-02', true)).save();

    const result = await SUT.getAllDefraValidationReports();

    expect(result).toHaveLength(5);
  });

  it('will filter defra reports by lastUpdated if a dateFrom is specified', async () => {
    await Promise.all([
      new DefraValidationReportModel(sampleReport('1234', 'COMPLETE', false, null, true, '2019-02-19')).save(),
      new DefraValidationReportModel(sampleReport('1235', 'DRAFT',    false, null, true, '2019-02-20')).save(),
      new DefraValidationReportModel(sampleReport('1237', 'BLOCKED',  false, null, true, '2019-02-21')).save(),
      new DefraValidationReportModel(sampleReport('1238', 'BLOCKED',  false, null, true, '2019-02-22')).save()
    ]);

    const result = await SUT.getAllDefraValidationReports('2019-02-21', undefined);
    const certIds = result.map(_ => _.certificateId);

    expect(result).toHaveLength(2);
    expect(certIds).toContain('1237');
    expect(certIds).toContain('1238');
  });

  it('will filter defra reports by lastUpdated if a dateTo is specified', async () => {
    await Promise.all([
      new DefraValidationReportModel(sampleReport('1234', 'COMPLETE', false, null, true, '2019-02-19')).save(),
      new DefraValidationReportModel(sampleReport('1235', 'DRAFT',    false, null, true, '2019-02-20')).save(),
      new DefraValidationReportModel(sampleReport('1237', 'BLOCKED',  false, null, true, '2019-02-21')).save(),
      new DefraValidationReportModel(sampleReport('1238', 'BLOCKED',  false, null, true, '2019-02-22')).save()
    ]);

    const result = await SUT.getAllDefraValidationReports(undefined, '2019-02-21');
    const certIds = result.map(_ => _.certificateId);

    expect(result).toHaveLength(3);
    expect(certIds).toContain('1234');
    expect(certIds).toContain('1235');
  });

  it('will filter defra reports by lastUpdated if a dateFrom and dateTo are specified', async () => {
    await Promise.all([
      new DefraValidationReportModel(sampleReport('1234', 'COMPLETE', false, null, true, '2019-02-19')).save(),
      new DefraValidationReportModel(sampleReport('1235', 'DRAFT',    false, null, true, '2019-02-20')).save(),
      new DefraValidationReportModel(sampleReport('1237', 'BLOCKED',  false, null, true, '2019-02-21')).save(),
      new DefraValidationReportModel(sampleReport('1238', 'BLOCKED',  false, null, true, '2019-02-22')).save()
    ]);

    const result = await SUT.getAllDefraValidationReports('2019-02-20', '2019-02-21');
    const certIds = result.map(_ => _.certificateId);

    expect(result).toHaveLength(2);
    expect(certIds).toContain('1235');
    expect(certIds).toContain('1235');
  });

  it('will return no defra reports if dateFrom is after dateTo', async () => {
    await Promise.all([
      new DefraValidationReportModel(sampleReport('1234', 'COMPLETE', false, null, true, '2019-02-19')).save(),
      new DefraValidationReportModel(sampleReport('1235', 'DRAFT',    false, null, true, '2019-02-20')).save(),
      new DefraValidationReportModel(sampleReport('1237', 'BLOCKED',  false, null, true, '2019-02-21')).save(),
      new DefraValidationReportModel(sampleReport('1238', 'BLOCKED',  false, null, true, '2019-02-22')).save()
    ]);

    const result = await SUT.getAllDefraValidationReports('2019-02-21', '2019-02-20');

    expect(result).toHaveLength(0);
  });

  it('will return no defra reports if the collection is empty', async () => {
    const result = await SUT.getAllDefraValidationReports();

    expect(result).toHaveLength(0);
  });

  it('will filter out internal fields from the response', async () => {
    await new DefraValidationReportModel(sampleReport('1234', 'COMPLETE', false, '2019-02-19CS214')).save();

    const result = await SUT.getAllDefraValidationReports();

    expect(result[0]['certificateId']).toBe('1234');
    expect(result[0]['_id']).toBeUndefined();
    expect(result[0]['_processed']).toBeUndefined();
    expect(result[0]['__v']).toBeUndefined();
    expect(result[0]['__t']).toBeUndefined();
  });

});