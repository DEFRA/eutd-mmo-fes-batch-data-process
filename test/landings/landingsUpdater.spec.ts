const moment = require('moment');
const mongoose = require('mongoose');
import _ from 'lodash';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DocumentModel } from '../../src/types/document';
import { LandingModel } from '../../src/types/landing';
import { generateIndex, LandingStatus, LandingSources, type ILanding, type ICcQueryResult } from 'mmo-shared-reference-data';
import * as SUT from '../../src/landings/landingsUpdater';
import * as cache from '../../src/data/cache';
import * as PlnToRss from '../../src/query/plnToRss';
import * as sharedRefData from "mmo-shared-reference-data"
import * as Landing from '../../src/persistence/landing';
import * as catchCerts from '../../src/persistence/catchCerts';
import * as landingRefresher from '../../src/landings/landingsRefresh';
import * as landingConsolidation from '../../src/services/landingConsolidate.service';
import * as report from '../../src/services/report.service';
import * as risking from '../../src/data/risking';
import * as file from '../../src/data/local-file';
import logger from '../../src/logger';
import appConfig from '../../src/config';
import fs from 'fs';
import * as species from '../../src/data/species';


jest.mock('axios')


const vessels = [
  {
    registrationNumber: "WA1",
    fishingLicenceValidTo: "2020-12-20T00:00:00",
    fishingLicenceValidFrom: "2010-12-29T00:00:00",
    rssNumber: "rssWA1",
    adminPort: 'GUERNSEY'
  },
  {
    registrationNumber: "WA2",
    fishingLicenceValidTo: "2020-12-20T00:00:00",
    fishingLicenceValidFrom: "2010-12-29T00:00:00",
    rssNumber: "rssWA2",
    adminPort: 'GUERNSEY'
  }
];
const vesselsIdx = generateIndex(vessels);

describe('getMissingLandingsArray', () => {

  let mockGetCatchCerts;
  let mockIsHighRisk;
  let dataMock;

  beforeEach(() => {
    mockGetCatchCerts = jest.spyOn(catchCerts, 'getCatchCerts');
    mockIsHighRisk = jest.spyOn(risking, 'isHighRisk');
    mockIsHighRisk.mockReturnValue(true);

    dataMock = jest.spyOn(cache, 'getVesselsIdx');
    dataMock.mockReturnValue(vesselsIdx);
  })

  afterEach(() => {
    mockGetCatchCerts.mockRestore();
    mockIsHighRisk.mockRestore();
    dataMock.mockRestore();
  });

  it('should not return a list if all landings are present', async () => {

    const documents: any[] = [
      {
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "HAS_LANDING_DATA" },
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "HAS_LANDING_DATA" }
              ]
            },
            {
              speciesCode: "LOB",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA2", date: "2019-07-10", weight: 500, _status: "HAS_LANDING_DATA" },
              ]
            },
          ],
        },
      },
      {
        documentNumber: "CC2",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 50, _status: "HAS_LANDING_DATA" }
              ]
            }
          ],
        },
      },
    ]

    // Within 14 days
    const queryTime = moment.utc('20190724T000000Z')

    mockGetCatchCerts.mockResolvedValue(documents);

    generateIndex(cache.getVesselsData());

    const results = await SUT.getMissingLandingsArray(queryTime)

    expect(results.length).toEqual(0);

  })

  it('should return a list of items of missing landings', async () => {

    const documents = [
      {
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "PENDING_LANDING_DATA" },
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "PENDING_LANDING_DATA" }
              ]
            }
          ],
        },
      }
    ]

    mockGetCatchCerts.mockResolvedValue(documents);

    // Within 14 days
    const queryTime = moment.utc('20190724T000000Z')
    generateIndex(cache.getVesselsData());

    const results = await SUT.getMissingLandingsArray(queryTime);
    expect(results.length).toEqual(2);

  })

  it('should not return a list of items of missing landings when landing data is unavailable', async () => {

    const documents = [
      {
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "PENDING_LANDING_DATA", dataEverExpected: true, landingDataExpectedDate: "2019-07-25" },
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "PENDING_LANDING_DATA", dataEverExpected: true, landingDataExpectedDate: "2019-07-25" }
              ]
            }
          ]
        }
      }
    ]

    mockGetCatchCerts.mockResolvedValue(documents);

    // Within 14 days
    const queryTime = moment.utc('20190724T000000Z');
    generateIndex(cache.getVesselsData());

    const results = await SUT.getMissingLandingsArray(queryTime);
    expect(results.length).toEqual(0);

  })

  describe('for landing exceeding their 14 day limit', () => {

    const documents = [
      {
        documentNumber: "CC1",
        createdAt: "2020-08-28T08:00:00.000Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2020-08-25", weight: 100, _status: "PENDING_LANDING_DATA" },
                { vessel: "DAYBREAK", pln: "WA1", date: "2020-08-26", weight: 100, _status: "PENDING_LANDING_DATA" }
              ]
            },
            {
              speciesCode: "LOB",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA2", date: "2020-08-25", weight: 500, _status: "PENDING_LANDING_DATA" },
              ]
            },
          ],
        },
      },
      {
        documentNumber: "CC2",
        createdAt: "2020-08-28T08:00:00.000Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2020-08-25", weight: 50, _status: "EXCEEDED_14_DAY_LIMIT" }
              ]
            }
          ],
        },
      },
    ];

    it('should not return a list if all landings are within the 14 days limit', async () => {

      mockGetCatchCerts.mockResolvedValue([{
        documentNumber: "CC1",
        createdAt: "2020-08-28T08:00:00.000Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2020-08-25", weight: 100, _status: "PENDING_LANDING_DATA", landingDataExpectedDate: "2020-09-12" },
                { vessel: "DAYBREAK", pln: "WA1", date: "2020-08-26", weight: 100, _status: "PENDING_LANDING_DATA", landingDataExpectedDate: "2020-09-12" }
              ]
            },
            {
              speciesCode: "LOB",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA2", date: "2020-08-25", weight: 500, _status: "PENDING_LANDING_DATA", landingDataExpectedDate: "2020-09-12" },
              ]
            },
          ],
        },
      },
      {
        documentNumber: "CC2",
        createdAt: "2020-08-28T08:00:00.000Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2020-08-25", weight: 50, _status: "EXCEEDED_14_DAY_LIMIT" }
              ]
            }
          ],
        },
      }]);

      // within 14 days
      const queryTime = moment.utc('20200911T000000Z');

      generateIndex(cache.getVesselsData());

      const results = await SUT.getExceedingLandingsArray(queryTime);

      expect(mockGetCatchCerts).toHaveBeenCalledTimes(1);
      expect(mockGetCatchCerts).toHaveBeenCalledWith({ landingStatuses: [LandingStatus.Pending] });
      expect(results.length).toEqual(0);
    });

    it('should not return a list if all landings are beyond 14 days and are Real Time Validation successful', async () => {

      mockGetCatchCerts.mockResolvedValue([
        {
          documentNumber: "CC1",
          createdAt: "2020-08-28T08:00:00.000Z",
          exportData: {
            products: [
              {
                speciesCode: "LBE",
                caughtBy: [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2020-08-25", weight: 100, _status: "HAS_LANDING_DATA", dataEverExpected: true, landingDataExpectedDate: '2020-09-11' },
                  { vessel: "DAYBREAK", pln: "WA1", date: "2020-08-26", weight: 100, _status: "EXCEEDED_14_DAY_LIMIT", dataEverExpected: true, landingDataExpectedDate: '2020-09-11' }
                ]
              },
              {
                speciesCode: "LOB",
                caughtBy: [
                  { vessel: "DAYBREAK", pln: "WA2", date: "2020-08-25", weight: 500, _status: "HAS_LANDING_DATA", dataEverExpected: true, landingDataExpectedDate: '2020-09-11' },
                ]
              },
            ],
          },
        },
        {
          documentNumber: "CC2",
          createdAt: "2020-08-28T08:00:00.000Z",
          exportData: {
            products: [
              {
                speciesCode: "LBE",
                caughtBy: [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2020-08-25", weight: 50, _status: "HAS_LANDING_DATA", dataEverExpected: true, landingDataExpectedDate: '2020-09-11' }
                ]
              }
            ],
          },
        },
      ]);

      // beyond 14 days
      const queryTime = moment.utc('20200912T000000Z');

      generateIndex(cache.getVesselsData());

      const results = await SUT.getExceedingLandingsArray(queryTime);

      expect(mockGetCatchCerts).toHaveBeenCalledTimes(1);
      expect(mockGetCatchCerts).toHaveBeenCalledWith({ landingStatuses: [LandingStatus.Pending] });
      expect(results).toHaveLength(0);
    });

    it('should return a list if all landings are beyond 14 days and are Pending landing data', async () => {

      mockGetCatchCerts.mockResolvedValue(documents);

      // beyond 14 days
      const queryTime = moment.utc('20200912T000000Z');

      generateIndex(cache.getVesselsData());

      const results = await SUT.getExceedingLandingsArray(queryTime);

      expect(mockGetCatchCerts).toHaveBeenCalledTimes(1);
      expect(mockGetCatchCerts).toHaveBeenCalledWith({ landingStatuses: [LandingStatus.Pending] });
      expect(results.length).toEqual(3);
    });
  })

  describe('for landings on pre-exisiting COMPLETED certs', () => {

    const documents = [
      {
        documentNumber: "CC1",
        createdAt: "2020-09-01T08:00:00.000Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2020-08-25", weight: 100, landingDataExpectedDate: "2020-09-12" }, // pending
                { vessel: "DAYBREAK", pln: "WA1", date: "2020-08-26", weight: 100, _status: "HAS_LANDING_DATA" }
              ]
            },
          ],
        },
      },
      {
        documentNumber: "CC2",
        createdAt: "2020-09-01T08:00:00.000Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2020-08-25", weight: 50, landingDataExpectedDate: "2020-09-12" } // pending
              ]
            }
          ],
        },
      },
    ];

    it('should not return a list if all landings without a _status are before their landing data expected date', async () => {
      mockGetCatchCerts.mockResolvedValue(documents);

      // within 14 days
      const queryTime = moment.utc('20200911T000000Z');

      generateIndex(cache.getVesselsData());

      const results = await SUT.getMissingLandingsArray(queryTime);

      expect(mockGetCatchCerts).toHaveBeenCalledTimes(1);
      expect(mockGetCatchCerts).toHaveBeenCalledWith({ landingStatuses: [LandingStatus.Pending] });
      expect(results.length).toEqual(0);
    });

    it('should return a list of all landings without a _status within their retrospective window', async () => {
      mockGetCatchCerts.mockResolvedValue(documents);

      // within 14 days
      const queryTime = moment.utc('20200912T000000Z');

      generateIndex(cache.getVesselsData());

      const results = await SUT.getMissingLandingsArray(queryTime);

      expect(mockGetCatchCerts).toHaveBeenCalledTimes(1);
      expect(mockGetCatchCerts).toHaveBeenCalledWith({ landingStatuses: [LandingStatus.Pending] });
      expect(results).toHaveLength(1);
    });

    it('should not return a list of all landings without a _status beyond their retrospective window', async () => {
      mockGetCatchCerts.mockResolvedValue(documents);

      // beyond 14 days
      const queryTime = moment.utc('20200916T000000Z');

      generateIndex(cache.getVesselsData());

      const results = await SUT.getMissingLandingsArray(queryTime);

      expect(mockGetCatchCerts).toHaveBeenCalledTimes(1);
      expect(mockGetCatchCerts).toHaveBeenCalledWith({ landingStatuses: [LandingStatus.Pending] });
      expect(results.length).toEqual(0);
    });

  })

  it('should return a list of items needing a landing refresh for an overuse', async () => {

    const documents = [
      {
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "HAS_LANDING_DATA", landingDataEndDate: "2019-07-25" }
              ]
            }
          ],
        },
      },
      {
        documentNumber: "CC2",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "PENDING_LANDING_DATA", landingDataEndDate: "2019-07-25" }
              ]
            }
          ],
        },
      }
    ]

    mockGetCatchCerts.mockResolvedValue(documents);

    // Within 14 days
    const queryTime = moment.utc('20190724T000000Z')
    generateIndex(cache.getVesselsData());

    const results = await SUT.getMissingLandingsArray(queryTime);

    expect(results).toHaveLength(1);

  })
});

describe('landingAndReportingCronJobs', () => {

  let updateLandings;
  let fetchRefereshLandings;
  let fetchMock;
  let reportNewLandings;
  let reportsMock;
  let loggerMock;
  let loggerErrorMock;
  let dataMock;

  let mongoServer;

  const opts = { connectTimeoutMS: 60000, socketTimeoutMS: 600000, serverSelectionTimeoutMS: 60000 }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, opts).catch(err => { console.log(err) });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    await LandingModel.deleteMany({});
    await DocumentModel.deleteMany({});

    updateLandings = jest.spyOn(landingConsolidation, 'updateConsolidateLandings');
    fetchRefereshLandings = jest.spyOn(landingConsolidation, 'fetchRefereshLandings');
    fetchMock = jest.spyOn(landingRefresher, 'fetchLandings');
    reportNewLandings = jest.spyOn(report, 'reportNewLandings');
    reportsMock = jest.spyOn(report, 'processReports');
    loggerMock = jest.spyOn(logger, 'info');
    loggerErrorMock = jest.spyOn(logger, 'error');
    dataMock = jest.spyOn(cache, 'getVesselsIdx');
    dataMock.mockReturnValue(vesselsIdx);
  });

  it('can fetch missing landings', async () => {
    const catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      status: "COMPLETE",
      createdAt: moment.utc().toISOString(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products: [
          {
            speciesCode: "LBE",
            caughtBy: [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "PENDING_LANDING_DATA" }
            ]
          },
          {
            speciesCode: "COD",
            caughtBy: [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 500, _status: "PENDING_LANDING_DATA" },
            ]
          },
        ],
      },
    });
    await catchCert.save();

    generateIndex(cache.getVesselsData());

    updateLandings.mockImplementation(() => Promise.resolve());
    fetchRefereshLandings.mockResolvedValue([]);
    fetchMock.mockImplementation(() =>
      Promise.resolve([]));

    const result = await SUT.landingsAndReportingCron();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(updateLandings).not.toHaveBeenCalled();
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][OVERUSED-ELOG-DEMINMUS-LANDINGS][0]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS][2]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS-PLUS-OVERUSED-ELOG-DEMINMUS-LANDINGS][2]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][NEW-LANDINGS][0]');
    expect(result).toBeUndefined();
  });

  it('will not fail the process if API call to get landings refresh fails', async () => {
    const catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      status: "COMPLETE",
      createdAt: moment.utc().toISOString(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products: [
          {
            speciesCode: "COD",
            caughtBy: [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-02-12", weight: 500, _status: "PENDING_LANDING_DATA" },
            ]
          },
        ],
      },
    });
    await catchCert.save();

    const newLandings: ILanding[] = [{
      rssNumber: 'rssNumber',
      dateTimeLanded: '2019-02-12',
      source: 'LANDING_DECLARATION',
      items: [{
        species: 'COD',
        weight: 500,
        factor: 1
      }]
    }];

    generateIndex(cache.getVesselsData());

    const error = new Error('something has gone wrong');
    updateLandings.mockImplementation(() => Promise.resolve());
    fetchRefereshLandings.mockRejectedValue(error)
    fetchMock.mockImplementation(() =>
      Promise.resolve(newLandings));

    const result = await SUT.landingsAndReportingCron();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][OVERUSED-ELOG-DEMINMUS-LANDINGS][0]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS][1]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS-PLUS-OVERUSED-ELOG-DEMINMUS-LANDINGS][1]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][NEW-LANDINGS][1]');
    expect(updateLandings).toHaveBeenCalledTimes(1);
    expect(updateLandings).toHaveBeenCalledWith(newLandings);
    expect(loggerErrorMock).toHaveBeenCalledWith(`[RUN-LANDINGS-AND-REPORTING-JOB][OVERUSED-ELOG-DEMINMUS-LANDINGS][FAILED][${error.stack}]`);
    expect(result).toBeUndefined();
  });

  it('will not fail the process if API call to get landings refresh fails with a simple error', async () => {
    const catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      status: "COMPLETE",
      createdAt: moment.utc().toISOString(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products: [
          {
            speciesCode: "COD",
            caughtBy: [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-02-12", weight: 500, _status: "PENDING_LANDING_DATA" },
            ]
          },
        ],
      },
    });
    await catchCert.save();

    const newLandings: ILanding[] = [{
      rssNumber: 'rssNumber',
      dateTimeLanded: '2019-02-12',
      source: 'LANDING_DECLARATION',
      items: [{
        species: 'COD',
        weight: 500,
        factor: 1
      }]
    }];

    generateIndex(cache.getVesselsData());

    updateLandings.mockImplementation(() => Promise.resolve());
    fetchRefereshLandings.mockRejectedValue('something has gone wrong')
    fetchMock.mockImplementation(() =>
      Promise.resolve(newLandings));

    const result = await SUT.landingsAndReportingCron();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][OVERUSED-ELOG-DEMINMUS-LANDINGS][0]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS][1]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS-PLUS-OVERUSED-ELOG-DEMINMUS-LANDINGS][1]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][NEW-LANDINGS][1]');
    expect(updateLandings).toHaveBeenCalledTimes(1);
    expect(updateLandings).toHaveBeenCalledWith(newLandings);
    expect(loggerErrorMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][OVERUSED-ELOG-DEMINMUS-LANDINGS][FAILED][something has gone wrong]');
    expect(result).toBeUndefined();
  });

  it('will update the consolidation service with new landings found during the retrospective landing fetch', async () => {
    const catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      status: "COMPLETE",
      createdAt: moment.utc().toISOString(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products: [
          {
            speciesCode: "COD",
            caughtBy: [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-02-12", weight: 500, _status: "PENDING_LANDING_DATA" },
            ]
          },
        ],
      },
    });
    await catchCert.save();

    const newLandings: ILanding[] = [{
      rssNumber: 'rssNumber',
      dateTimeLanded: '2019-02-12',
      source: 'LANDING_DECLARATION',
      items: [{
        species: 'COD',
        weight: 500,
        factor: 1
      }]
    }];

    generateIndex(cache.getVesselsData());

    updateLandings.mockImplementation(() => Promise.resolve());
    fetchRefereshLandings.mockResolvedValue([]);
    fetchMock.mockImplementation(() =>
      Promise.resolve(newLandings));

    const result = await SUT.landingsAndReportingCron();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][OVERUSED-ELOG-DEMINMUS-LANDINGS][0]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS][1]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS-PLUS-OVERUSED-ELOG-DEMINMUS-LANDINGS][1]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][NEW-LANDINGS][1]');
    expect(updateLandings).toHaveBeenCalledTimes(1);
    expect(updateLandings).toHaveBeenCalledWith(newLandings);
    expect(result).toBeUndefined();
  });

  it('will filter out duplicate landings', async () => {
    const catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      status: "COMPLETE",
      createdAt: moment.utc().toISOString(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products: [
          {
            speciesCode: "LBE",
            caughtBy: [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "PENDING_LANDING_DATA" },
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "PENDING_LANDING_DATA" }
            ]
          },
          {
            speciesCode: "COD",
            caughtBy: [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 500, _status: "PENDING_LANDING_DATA" },
            ]
          },
        ],
      },
    });
    await catchCert.save();

    generateIndex(cache.getVesselsData());

    updateLandings.mockImplementation(() => Promise.resolve());
    fetchRefereshLandings.mockResolvedValue([]);
    fetchMock.mockImplementation(() =>
      Promise.resolve([]));

    const result = await SUT.landingsAndReportingCron();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][OVERUSED-ELOG-DEMINMUS-LANDINGS][0]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS][2]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS-PLUS-OVERUSED-ELOG-DEMINMUS-LANDINGS][2]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][NEW-LANDINGS][0]');
    expect(result).toBeUndefined();
  });

  it('will filter out duplicate landings from landing consolidate service', async () => {
    const catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      status: "COMPLETE",
      createdAt: moment.utc().toISOString(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products: [
          {
            speciesCode: "LBE",
            caughtBy: [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "PENDING_LANDING_DATA" },
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "PENDING_LANDING_DATA" }
            ]
          },
          {
            speciesCode: "COD",
            caughtBy: [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 500, _status: "PENDING_LANDING_DATA" },
            ]
          },
        ],
      },
    });
    await catchCert.save();

    generateIndex(cache.getVesselsData());

    updateLandings.mockImplementation(() => Promise.resolve());
    fetchRefereshLandings.mockResolvedValue([{ rssNumber: "rssWA1", dateLanded: "2019-07-10" }]);
    fetchMock.mockImplementation(() =>
      Promise.resolve([]));

    const result = await SUT.landingsAndReportingCron();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][OVERUSED-ELOG-DEMINMUS-LANDINGS][1]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS][2]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS-PLUS-OVERUSED-ELOG-DEMINMUS-LANDINGS][2]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][NEW-LANDINGS][0]');
    expect(result).toBeUndefined();
  });

  it('wont try and update landings after TTL', async () => {
    const catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      status: "COMPLETE",
      createdAt: moment.utc().subtract(16, 'days').toISOString(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products: [
          {
            speciesCode: "LBE",
            caughtBy: [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "EXCEEDED_14_DAY_LIMIT" },
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "EXCEEDED_14_DAY_LIMIT" }
            ]
          },
          {
            speciesCode: "COD",
            caughtBy: [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 500, _status: "EXCEEDED_14_DAY_LIMIT" },
            ]
          },
        ],
      },
    });
    await catchCert.save();

    updateLandings.mockImplementation(() => Promise.resolve());
    fetchRefereshLandings.mockResolvedValue([]);
    fetchMock.mockImplementation(() =>
      Promise.resolve([]));

    const result = await SUT.landingsAndReportingCron();

    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][OVERUSED-ELOG-DEMINMUS-LANDINGS][0]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS][0]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS-PLUS-OVERUSED-ELOG-DEMINMUS-LANDINGS][0]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][NEW-LANDINGS][0]');
    expect(result).toBeUndefined();
  });

  it('will call processReports', async () => {
    await SUT.landingsAndReportingCron();

    expect(reportsMock).toHaveBeenCalledTimes(1);
  });

  it('will call processReports when errors occurs', async () => {
    const error: Error = new Error('error');
    const newLandings: ILanding[] = [{
      rssNumber: 'rssNumber',
      dateTimeLanded: '2019-02-12',
      source: 'LANDING_DECLARATION',
      items: [{
        species: 'COD',
        weight: 500,
        factor: 1
      }]
    }];

    reportNewLandings.mockRejectedValue(error);

    const catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      status: "COMPLETE",
      createdAt: moment.utc().toISOString(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products: [
          {
            speciesCode: "COD",
            caughtBy: [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 500, _status: "PENDING_LANDING_DATA" },
            ]
          },
        ],
      },
    });

    await catchCert.save();

    generateIndex(cache.getVesselsData());

    updateLandings.mockImplementation(() => Promise.resolve());
    fetchRefereshLandings.mockResolvedValue([]);
    fetchMock.mockImplementation(() =>
      Promise.resolve(newLandings));

    const result = await SUT.landingsAndReportingCron();

    expect(reportNewLandings).toHaveBeenCalledTimes(1);
    expect(reportNewLandings).toHaveBeenCalledWith(newLandings, expect.any(Object));
    expect(loggerErrorMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][LANDING-AND-REPORTING-CRON][ERROR][Error: error]');
    expect(reportsMock).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });

  it('will call processReports when an error occurs', async () => {
    updateLandings.mockImplementation(() => Promise.resolve());
    fetchRefereshLandings.mockResolvedValue([]);

    const error: Error = new Error('error');

    fetchMock.mockRejectedValue(error);

    const catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      status: "COMPLETE",
      createdAt: moment.utc().toISOString(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products: [
          {
            speciesCode: "COD",
            caughtBy: [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 500, _status: "PENDING_LANDING_DATA" },
            ]
          },
        ],
      },
    });

    await catchCert.save();

    generateIndex(cache.getVesselsData());

    const result = await SUT.landingsAndReportingCron();

    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][OVERUSED-ELOG-DEMINMUS-LANDINGS][0]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS][1]');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][MISSING-LANDINGS-PLUS-OVERUSED-ELOG-DEMINMUS-LANDINGS][1]');
    expect(loggerMock).toHaveBeenCalledWith('[LANDINGS][LANDING-UPDATER][CHECK-FOR-NEW-LANDINGS][FETCH-LANDINGS] for rssWA1-2019-07-10');
    expect(loggerErrorMock).toHaveBeenCalledWith('[LANDINGS][LANDING-UPDATER][CHECK-FOR-NEW-LANDINGS][FETCH-LANDINGS] ERROR for rssWA1-2019-07-10: Error: error');
    expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][NEW-LANDINGS][0]');
    expect(fetchMock).toHaveBeenCalled();
    expect(reportsMock).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });

  describe('after calling fetchAndProcessNewLandings', () => {
    let mockFetchRefreshLandings;
    let mockFetchAndProcess;
    let mockReportNew;

    beforeEach(() => {
      mockFetchRefreshLandings = jest.spyOn(landingConsolidation, 'fetchRefereshLandings');
      mockFetchRefreshLandings.mockResolvedValue([]);
      mockFetchAndProcess = jest.spyOn(landingRefresher, 'fetchAndProcessNewLandings');
      mockReportNew = jest.spyOn(report, 'reportNewLandings');
      mockReportNew.mockResolvedValue(null);
    });

    afterEach(() => {
      mockFetchRefreshLandings.mockRestore();
      mockFetchAndProcess.mockRestore();
      mockReportNew.mockRestore();
    });

    it('will report any new landings which get returned', async () => {
      const landings = [{ test: 'landing' }];

      mockFetchAndProcess.mockResolvedValue(landings);

      await SUT.landingsAndReportingCron();

      expect(mockReportNew).toHaveBeenCalledTimes(1);
      expect(mockReportNew).toHaveBeenCalledWith(landings, expect.any(Object));
      expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][NEW-LANDINGS][1]');
    });

    it('will skip reporting if there are no new landings returned', async () => {
      mockFetchAndProcess.mockResolvedValue([]);

      await SUT.landingsAndReportingCron();

      expect(mockReportNew).not.toHaveBeenCalled();
      expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][NEW-LANDINGS][0]');
    });

    it('will not call report new landings', async () => {
      mockFetchAndProcess.mockResolvedValue(undefined);

      await SUT.landingsAndReportingCron();

      expect(mockReportNew).not.toHaveBeenCalled();
      expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][NEW-LANDINGS][undefined]');
    });
  });

  describe('when finding landings that have reached there 14 day limit', () => {

    let reportExceeding14DaysLandings;

    beforeEach(async () => {
      reportExceeding14DaysLandings = jest.spyOn(report, 'reportExceeding14DaysLandings');
      reportExceeding14DaysLandings.mockResolvedValue(null);
    });

    afterEach(() => {
      reportExceeding14DaysLandings.mockRestore();
    });

    it('will filter out landings that have just exceeded their 14 day limit', async () => {
      const catchCert = new DocumentModel({
        __t: "catchCert",
        documentNumber: "CC1",
        status: "COMPLETE",
        createdAt: moment.utc().subtract(14, 'days').toISOString(),
        createdBy: "Bob",
        createdByEmail: "foo@foo.com",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "PENDING_LANDING_DATA" },
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "PENDING_LANDING_DATA" }
              ]
            },
            {
              speciesCode: "COD",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 500, _status: "PENDING_LANDING_DATA" },
              ]
            },
          ],
        },
      });

      await catchCert.save();

      generateIndex(cache.getVesselsData());

      await SUT.exceeding14DayLandingsAndReportingCron();

      expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][EXCEEDING-14-DAYS-LANDINGS][3]');
      expect(reportExceeding14DaysLandings).toHaveBeenCalled();
    });

    it('will not report landings that do not exceeded their 14 day limit', async () => {

      const catchCert = new DocumentModel({
        __t: "catchCert",
        documentNumber: "CC1",
        status: "COMPLETE",
        createdAt: moment.utc().subtract(335, 'hours').toISOString(), // 13 hours and 23 hours
        createdBy: "Bob",
        createdByEmail: "foo@foo.com",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "PENDING_LANDING_DATA" },
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "PENDING_LANDING_DATA" }
              ]
            },
            {
              speciesCode: "COD",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 500, _status: "PENDING_LANDING_DATA" },
              ]
            },
          ],
        },
      });

      await catchCert.save();

      generateIndex(cache.getVesselsData());

      await SUT.exceeding14DayLandingsAndReportingCron();

      expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][EXCEEDING-14-DAYS-LANDINGS][0]');
      expect(reportExceeding14DaysLandings).not.toHaveBeenCalled();
    });

    it('will not report landings that have already exceeded their 14 days limit', async () => {
      const catchCert = new DocumentModel({
        __t: "catchCert",
        documentNumber: "CC1",
        status: "COMPLETE",
        createdAt: moment.utc().subtract(15, 'days').toISOString(),
        createdBy: "Bob",
        createdByEmail: "foo@foo.com",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "EXCEEDED_14_DAY_LIMIT" },
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "EXCEEDED_14_DAY_LIMIT" }
              ]
            },
            {
              speciesCode: "COD",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 500, _status: "EXCEEDED_14_DAY_LIMIT" },
              ]
            },
          ],
        },
      });

      await catchCert.save();

      generateIndex(cache.getVesselsData());

      await SUT.exceeding14DayLandingsAndReportingCron();

      expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][EXCEEDING-14-DAYS-LANDINGS][0]');
      expect(reportExceeding14DaysLandings).not.toHaveBeenCalled();
    });

    it('will catch any errors when find landing that have exceeded their 14 day limit', async () => {
      reportExceeding14DaysLandings.mockRejectedValue(new Error('error'));

      const catchCert = new DocumentModel({
        __t: "catchCert",
        documentNumber: "CC1",
        status: "COMPLETE",
        createdAt: moment.utc().subtract(15, 'days').toISOString(), // 15 days
        createdBy: "Bob",
        createdByEmail: "foo@foo.com",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "PENDING_LANDING_DATA" },
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "PENDING_LANDING_DATA" }
              ]
            },
            {
              speciesCode: "COD",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 500, _status: "PENDING_LANDING_DATA" },
              ]
            },
          ],
        },
      });

      await catchCert.save();

      generateIndex(cache.getVesselsData());

      await SUT.exceeding14DayLandingsAndReportingCron();

      expect(loggerMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][EXCEEDING-14-DAYS-LANDINGS][3]');
      expect(loggerErrorMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][EXCEEDING-14-DAYS-LANDINGS][ERROR][Error: error]');
    });
  });

});

describe('runUpdateForLandings', () => {

  const queryTime = moment.utc();
  const ccQueryResult: ICcQueryResult[] = [
    {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2020-09-26T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2020-09-25',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 1,
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
          source: LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      extended: {}
    },
    {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2020-09-26T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2020-09-25',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 1,
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
          source: LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      extended: {}

    },
    {
      documentNumber: 'CC2',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2020-09-26T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2020-09-25',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 1,
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
          source: LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      extended: {
        landingId: 'GBR-2020-CC-1',
        landingStatus: 'HAS_LANDING_DATA'
      }
    },
    {
      documentNumber: 'CC2',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2020-09-26T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2020-09-25',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 1,
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
          source: LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      extended: {
        landingId: 'GBR-2020-CC-2',
        landingStatus: 'HAS_LANDING_DATA'
      }
    },
    {
      documentNumber: 'CC3',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2020-09-26T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2020-09-25',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 1,
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
          source: LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      extended: {}
    }
  ];

  const certificates: any[] = [
    [
      { documentNumber: 'CC1' }
    ],
    [
      {
        documentNumber: 'CC2',
        exportData: {
          products: [{
            species: "Atlantic cod (COD)",
            speciesId: "GBR-2020-CC-D068305E3-a676d04c-1187-4533-952b-7b96ae034826",
            speciesCode: "COD",
            commodityCode: "03025110",
            state: {
              code: "FRE",
              name: "Fresh"
            },
            presentation: {
              code: "WHL",
              name: "Whole"
            },
            factor: 1,
            caughtBy: [{
              vessel: "WIRON 5",
              pln: "H1100",
              id: "GBR-2020-CC-1",
              date: "2020-09-25",
              faoArea: "FAO27",
              weight: 1000,
              _status: "PENDING_LANDING_DATA"
            }, {
              vessel: "WIRON 5",
              pln: "H1100",
              id: "GBR-2020-CC-2",
              date: "2020-09-25",
              faoArea: "FAO27",
              weight: 1000,
              _status: "PENDING_LANDING_DATA"
            }]
          }]
        }
      }
    ]
  ];

  let mockUpsertCertificate;
  let mockGetCertificateByDocumentNumber;

  beforeEach(() => {
    mockUpsertCertificate = jest.spyOn(catchCerts, 'upsertCertificate');
    mockUpsertCertificate.mockResolvedValue(null);
    mockGetCertificateByDocumentNumber = jest.spyOn(catchCerts, 'getCertificateByDocumentNumber');
  });

  afterEach(() => {
    mockUpsertCertificate.mockRestore();
    mockGetCertificateByDocumentNumber.mockRestore();
  });

  it('will not upsert with an empty certificate list', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue([]);

    await SUT.runUpdateForLandings(ccQueryResult, 'CC1');
    expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith('CC1');
    expect(mockUpsertCertificate).not.toHaveBeenCalled();
  });

  it('will not upsert an empty export data', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue(certificates[0][0]);

    await SUT.runUpdateForLandings(ccQueryResult, 'CC1');
    expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith('CC1');
    expect(mockUpsertCertificate).not.toHaveBeenCalled();
  });

  it('will not upsert when no products are present', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue({
      ...certificates[0][0],
      exportData: {}
    });

    await SUT.runUpdateForLandings(ccQueryResult, 'CC1');
    expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith('CC1');
    expect(mockUpsertCertificate).not.toHaveBeenCalled();
  });

  it('will not upsert when products are empty', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue({
      ...certificates[0][0],
      exportData: {
        products: []
      }
    });

    await SUT.runUpdateForLandings(ccQueryResult, 'CC1');
    expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith('CC1');
    expect(mockUpsertCertificate).not.toHaveBeenCalled();
  });

  it('will upsert an updated products list', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue(certificates[1][0]);
    await SUT.runUpdateForLandings(ccQueryResult, 'CC2');

    expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith('CC2');
    expect(mockUpsertCertificate).toHaveBeenCalledTimes(1);
    expect(mockUpsertCertificate).toHaveBeenCalledWith('CC2', {
      exportData: {
        products: [{
          species: "Atlantic cod (COD)",
          speciesId: "GBR-2020-CC-D068305E3-a676d04c-1187-4533-952b-7b96ae034826",
          speciesCode: "COD",
          commodityCode: "03025110",
          state: {
            code: "FRE",
            name: "Fresh"
          },
          presentation: {
            code: "WHL",
            name: "Whole"
          },
          factor: 1,
          caughtBy: [{
            vessel: "WIRON 5",
            pln: "H1100",
            id: "GBR-2020-CC-1",
            date: "2020-09-25",
            faoArea: "FAO27",
            weight: 1000,
            _status: "HAS_LANDING_DATA"
          },
          {
            vessel: "WIRON 5",
            pln: "H1100",
            id: "GBR-2020-CC-2",
            date: "2020-09-25",
            faoArea: "FAO27",
            weight: 1000,
            _status: "HAS_LANDING_DATA"
          }]
        }]
      }
    });
  });
});

describe('resetLandingStatus', () => {
  let mongoServer;
  let mockWriteFileSync;
  let mockgetReprocessLandings;
  const landingIds = ['CB1', 'CB4', 'CB6'];

  const opts = { connectTimeoutMS: 60000, socketTimeoutMS: 600000, serverSelectionTimeoutMS: 60000 }

  beforeAll(async () => {
    mockgetReprocessLandings = jest.spyOn(file, 'getReprocessLandings');
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, opts).catch(err => { console.log(err) });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    mockgetReprocessLandings.mockImplementation(() => {
      return landingIds;
    });
    await DocumentModel.deleteMany({});
    appConfig.runLandingReprocessingJob = true;
    appConfig.landingReprocessingLimit = 3;
    mockWriteFileSync = jest.spyOn(fs, 'writeFileSync');
    mockWriteFileSync.mockReturnValue(null);

    const doc1 =
    {
      __t: "catchCert",
      documentNumber: "CC1",
      status: "COMPLETE",
      createdAt: moment.utc().subtract(15, 'days').toISOString(), // 15 days
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products: [
          {
            speciesCode: "LBE",
            caughtBy: [
              { id: "CB1", vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "COMPLETE" },
              { id: "CB2", vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "COMPLETE" }
            ]
          },
        ],
      },
    };
    const doc2 = {
      __t: "catchCert",
      documentNumber: "CC2",
      status: "COMPLETE",
      createdAt: moment.utc().subtract(15, 'days').toISOString(), // 15 days
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products: [
          {
            speciesCode: "LBE",
            caughtBy: [
              { id: "CB3", vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "COMPLETE" },
              { id: "CB4", vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "COMPLETE" }
            ]
          },
        ],
      },
    };
    const doc3 = {
      __t: "catchCert",
      documentNumber: "CC3",
      status: "COMPLETE",
      createdAt: moment.utc().subtract(15, 'days').toISOString(), // 15 days
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products: [
          {
            speciesCode: "LBE",
            caughtBy: [
              { id: "CB5", vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "COMPLETE" },
              { id: "CB6", vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "COMPLETE" }
            ]
          },
        ],
      },
    };

    let catchCert = new DocumentModel(doc1);
    await catchCert.save();
    catchCert = new DocumentModel(doc2);
    await catchCert.save();
    catchCert = new DocumentModel(doc3);
    await catchCert.save();
  });

  afterEach(() => {
    mockWriteFileSync.mockRestore();
    jest.resetAllMocks();
  });

  it('should not run job because the environment variable flag is switched off', async () => {
    appConfig.runLandingReprocessingJob = false;
    await SUT.resetLandingStatusJob();
    const result = await DocumentModel.find({});
    const statuses: string[] = [];
    result.map(item => {
      item.exportData.products.map(product => {
        product.caughtBy.map(caughtBy => {
          statuses.push(caughtBy._status);
        })
      })
    });

    expect(statuses).not.toContain('PENDING_LANDING_DATA');
    expect(mockWriteFileSync).toHaveBeenCalledTimes(0);
  })

  it('should get landing ids and mark their statuses as pending landing data', async () => {
    await SUT.resetLandingStatusJob();

    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    const dir = __dirname.split('/');
    dir.splice(-2, 2);
    expect(mockWriteFileSync).toHaveBeenCalledWith(`${dir.join('/')}/src/data/../../data/reprocess-landings.csv`, '');

    const result = await DocumentModel.find();
    const statuses: string[] = [];
    result.map(item => {
      item.exportData.products.map(product => {
        product.caughtBy.map(caughtBy => {
          statuses.push(caughtBy._status);
        })
      })
    });
    expect(statuses).toBeInstanceOf(Array);
    expect(statuses.filter(stat => stat === 'PENDING_LANDING_DATA').length === 3).toBeTruthy();

    expect(statuses[0] === 'PENDING_LANDING_DATA').toBeTruthy();
    expect(statuses[1] === 'PENDING_LANDING_DATA').toBeFalsy();
    expect(statuses[2] === 'PENDING_LANDING_DATA').toBeFalsy();
    expect(statuses[3] === 'PENDING_LANDING_DATA').toBeTruthy();
    expect(statuses[4] === 'PENDING_LANDING_DATA').toBeFalsy();
    expect(statuses[5] === 'PENDING_LANDING_DATA').toBeTruthy();
  });

  it('should fail safely if an error occurs', async () => {
    mockgetReprocessLandings.mockImplementation(() => {
      throw new Error('File not found');
    });
    await SUT.resetLandingStatusJob();
    const result = await DocumentModel.find({});
    const statuses: string[] = [];
    result.map(item => {
      item.exportData.products.map(product => {
        product.caughtBy.map(caughtBy => {
          statuses.push(caughtBy._status);
        })
      })
    });

    expect(statuses).not.toContain('PENDING_LANDING_DATA');
    expect(mockWriteFileSync).toHaveBeenCalledTimes(0);
  })

  it('should only run with one array item limit', async () => {
    appConfig.landingReprocessingLimit = 1;
    await SUT.resetLandingStatusJob();
    const result = await DocumentModel.find();
    const statuses: string[] = [];
    result.map(item => {
      item.exportData.products.map(product => {
        product.caughtBy.map(caughtBy => {
          statuses.push(caughtBy._status);
        })
      })
    });
    expect(statuses).toBeInstanceOf(Array);
    expect(statuses[0] === 'PENDING_LANDING_DATA').toBeTruthy();
    statuses.shift();
    expect(statuses).not.toContain('PENDING_LANDING_DATA');
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    const dir = __dirname.split('/');
    dir.splice(-2, 2);
    expect(mockWriteFileSync).toHaveBeenCalledWith(`${dir.join('/')}/src/data/../../data/reprocess-landings.csv`, 'CB4\nCB6');
  })

  it('should not process landings if theres no data found', async () => {

    mockgetReprocessLandings.mockImplementation(() => {
      return ['CB10', 'CB11'];
    });
    await SUT.resetLandingStatusJob();

    const result = await DocumentModel.find({});
    const statuses: string[] = [];
    result.map(item => {
      item.exportData.products.map(product => {
        product.caughtBy.map(caughtBy => {
          statuses.push(caughtBy._status);
        })
      })
    });

    expect(statuses).not.toContain('PENDING_LANDING_DATA');
    expect(mockWriteFileSync).toHaveBeenCalledTimes(0);
  })

  it('should not process landings if no landing found in file', async () => {

    mockgetReprocessLandings.mockImplementation(() => {
      return [];
    });
    await SUT.resetLandingStatusJob();

    const result = await DocumentModel.find({});
    const statuses: string[] = [];
    result.map(item => {
      item.exportData.products.map(product => {
        product.caughtBy.map(caughtBy => {
          statuses.push(caughtBy._status);
        })
      })
    });

    expect(statuses).not.toContain('PENDING_LANDING_DATA');
    expect(mockWriteFileSync).toHaveBeenCalledTimes(0);
  })

  it('should log error when there is an error in the process', async () => {

    const mockUpsertCertificate = jest.spyOn(catchCerts, 'upsertCertificate');
    const loggerErrorMock = jest.spyOn(logger, 'error');
    mockUpsertCertificate.mockImplementation(() => {
      throw new Error('Cannot update document');
    });

    await SUT.resetLandingStatusJob();

    const result = await DocumentModel.find({});
    const statuses: string[] = [];
    result.map(item => {
      item.exportData.products.map(product => {
        product.caughtBy.map(caughtBy => {
          statuses.push(caughtBy._status);
        })
      })
    });

    expect(statuses).not.toContain('PENDING_LANDING_DATA');
    expect(mockWriteFileSync).toHaveBeenCalledTimes(0);
    expect(loggerErrorMock).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][REPROCESS-LANDINGS][ERROR][Error: Cannot update document]');
    loggerErrorMock.mockRestore();
    mockUpsertCertificate.mockRestore();
  })
});

describe('resubmitSdToTrade', () => {
  let mongoServer;
  let mockresendSdToTrade;
  let loggerErrorMock;
  let loggerInfoMock;

  const opts = { connectTimeoutMS: 60000, socketTimeoutMS: 600000, serverSelectionTimeoutMS: 60000 }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, opts).catch(err => { console.log(err) });
  });

  beforeEach(async () => {
    appConfig.runResubmitCcToTrade = true;
    mockresendSdToTrade = jest.spyOn(report, 'resendSdToTrade');
    mockresendSdToTrade.mockResolvedValue(undefined);
    loggerErrorMock = jest.spyOn(logger, 'error');
    loggerInfoMock = jest.spyOn(logger, 'info');
  });

  afterEach(async () => {
    jest.resetAllMocks();
    await DocumentModel.deleteMany({});
  })

  afterAll(async () => {
    jest.restoreAllMocks();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('if appConfig.runResubmitCcToTrade is false then return', async () => {
    appConfig.runResubmitCcToTrade = false;
    const result = await SUT.resubmitSdToTrade();
    expect(result).toBeUndefined();
  });

  it('resubmitSdToTrade should execute as expected for storage documents', async () => {
    const storageDoc = new DocumentModel({
      documentNumber: 'GBR-2026-SD-TEST123',
      status: 'COMPLETE',
      createdAt: moment.utc('2026-01-27T12:00:00.000Z').toISOString(),
      createdBy: 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12',
      createdByEmail: 'foo@foo.com',
      requestByAdmin: false,
      contactId: 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ13',
      __t: 'storageDocument',
      audit: [],
      __v: 0,
      exportData: {
        exporterDetails: {
          contactId: '4704bf69-18f9-ec11-bb3d-000d3a2f806d',
          addressOne: 'NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT',
          buildingNumber: null,
          subBuildingName: 'NATURAL ENGLAND',
          buildingName: 'LANCASTER HOUSE',
          streetName: 'HAMPSHIRE COURT',
          county: null,
          country: 'United Kingdom of Great Britain and Northern Ireland',
          postcode: 'NE4 7YH',
          townCity: 'NEWCASTLE UPON TYNE',
          exporterCompanyName: 'Test Company',
          exporterFullName: 'Test User'
        },
        catches: [
          {
            id: 'catch-1',
            product: 'COD',
            commodityCode: '03025110',
            scientificName: 'Gadus morhua',
            certificateNumber: 'UK-2026-CC-123456',
            certificateType: 'uk',
            productWeight: '100',
            weightOnCC: '100'
          }
        ]
      },
      documentUri: '_test-document.pdf'
    });
    await storageDoc.save();

    await SUT.resubmitSdToTrade();
    
    expect(mockresendSdToTrade).toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalledWith('[RUN-RESUBMIT-SD-TRADE-DOCUMENT][COMPLETE]');
  });

  it('should throw error and log it', async () => {
    const error: Error = new Error('error');
    const storageDoc = new DocumentModel({
      documentNumber: 'GBR-2026-SD-TEST456',
      status: 'COMPLETE',
      createdAt: moment.utc('2026-01-27T12:00:00.000Z').toISOString(),
      createdBy: 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12',
      createdByEmail: 'foo@foo.com',
      requestByAdmin: false,
      contactId: 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ13',
      __t: 'storageDocument',
      audit: [],
      __v: 0,
      exportData: {
        exporterDetails: {
          contactId: '4704bf69-18f9-ec11-bb3d-000d3a2f806d',
          postcode: 'NE4 7YH',
          exporterCompanyName: 'Test Company',
          exporterFullName: 'Test User'
        },
        catches: [
          {
            id: 'catch-1',
            product: 'COD',
            commodityCode: '03025110',
            scientificName: 'Gadus morhua',
            certificateNumber: 'UK-2026-CC-123456',
            certificateType: 'uk',
            productWeight: '100',
            weightOnCC: '100'
          }
        ]
      },
      documentUri: '_test-document.pdf'
    });
    await storageDoc.save();

    mockresendSdToTrade.mockRejectedValue(error);
    await SUT.resubmitSdToTrade();

    expect(loggerErrorMock).toHaveBeenCalledWith('[RUN-RESUBMIT-SD-TRADE-DOCUMENT][ERROR][Error: error]');
  });

  it('processResubmitSdToTrade should process storage documents', async () => {
    const storageDoc: sharedRefData.IDocument[] = [{
      documentNumber: 'GBR-2026-SD-TEST789',
      status: 'COMPLETE',
      createdAt: moment.utc('2026-01-27T12:00:00.000Z').toISOString(),
      createdBy: 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12',
      createdByEmail: 'foo@foo.com',
      requestByAdmin: false,
      contactId: 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ13',
      __t: 'storageDocument',
      audit: [],
      exportData: {
        exporterDetails: {
          contactId: '4704bf69-18f9-ec11-bb3d-000d3a2f806d',
          postcode: 'NE4 7YH',
          exporterCompanyName: 'Test Company',
          exporterFullName: 'Test User'
        },
        catches: [
          {
            id: 'catch-1',
            product: 'COD',
            commodityCode: '03025110',
            scientificName: 'Gadus morhua',
            certificateNumber: 'UK-2026-CC-123456',
            certificateType: 'uk',
            productWeight: '100',
            weightOnCC: '100'
          }
        ]
      },
      documentUri: '_test-document.pdf'
    }];

    await SUT.processResubmitSdToTrade(storageDoc);
    
    expect(mockresendSdToTrade).toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalledWith('[RUN-RESUBMIT-SD-TRADE-DOCUMENT][CERT][GBR-2026-SD-TEST789]');
  });
});

describe('uniquifyLandings', () => {
  it('should return empty array when given empty array', () => {
    const result = SUT.uniquifyLandings([]);
    expect(result).toEqual([]);
  });

  it('should return same array when all landings are unique', () => {
    const landings = [
      { pln: 'WA1', species: 'COD', date: '2021-01-01', weight: 100, isLegallyDue: false },
      { pln: 'WA2', species: 'COD', date: '2021-01-01', weight: 200, isLegallyDue: true }
    ];
    const result = SUT.uniquifyLandings(landings as any);
    expect(result).toHaveLength(2);
    expect(result).toEqual(landings);
  });

  it('should remove duplicate landings', () => {
    const duplicateLanding = { pln: 'WA1', species: 'COD', date: '2021-01-01', weight: 100, isLegallyDue: false };
    const uniqueLanding = { pln: 'WA2', species: 'COD', date: '2021-01-01', weight: 200, isLegallyDue: true };
    const landings = [duplicateLanding, uniqueLanding, duplicateLanding];
    
    const result = SUT.uniquifyLandings(landings as any);
    
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(duplicateLanding);
    expect(result).toContainEqual(uniqueLanding);
  });

  it('should keep first occurrence when duplicates exist', () => {
    const landing1 = { pln: 'WA1', species: 'COD', date: '2021-01-01', weight: 100, isLegallyDue: false };
    const landing2 = { pln: 'WA1', species: 'COD', date: '2021-01-01', weight: 100, isLegallyDue: false };
    const landings = [landing1, landing2];
    
    const result = SUT.uniquifyLandings(landings as any);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(landing1);
  });

  it('should return single item array unchanged', () => {
    const singleLanding = { pln: 'WA1', species: 'COD', date: '2021-01-01', weight: 100, isLegallyDue: false };
    const result = SUT.uniquifyLandings([singleLanding] as any);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(singleLanding);
  });
});
