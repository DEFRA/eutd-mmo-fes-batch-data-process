import { ICcQueryResult, IDocument, ILandingQuery, LandingStatus, generateIndex } from 'mmo-shared-reference-data';
import { missingLandingRefreshQuery, exceedingLimitLandingQuery, retrospectiveValidationRequired } from '../../src/query/ccQuery';
import * as cache from '../../src/data/cache';

const moment = require('moment');
const vessels = [
  {
    registrationNumber: "WA1",
    fishingLicenceValidTo: "2020-12-20T00:00:00",
    fishingLicenceValidFrom: "2010-12-29T00:00:00",
    rssNumber: "rssWA1",
    adminPort: 'GUERNSEY',
  },
  {
    registrationNumber: "WA2",
    fishingLicenceValidTo: "2018-12-20T00:00:00",
    fishingLicenceValidFrom: "2010-12-29T00:00:00",
    rssNumber: "rssWA2",
    adminPort: 'GUERNSEY',
  }
];

describe('the query for refreshing missing landings', () => {

  let mockVesselIdx: jest.SpyInstance;
  
  beforeEach(() => {
    mockVesselIdx = jest.spyOn(cache, 'getVesselsIdx');
    mockVesselIdx.mockReturnValue(generateIndex(vessels))
  });

  afterEach(() => {
    mockVesselIdx.mockRestore();
  });

  const exporterDetails = {
    contactId: "some-contact-id",
    accountId: "some-account-id",
    exporterFullName: "Private",
    exporterCompanyName: "Private",
    addressOne: "Building and street",
    addressTwo: "Building 2 and street name",
    townCity: "London",
    postcode: "AB1 2XX"
  }

  const documentCC1: IDocument = {
    __t: "catchCert",
    documentNumber: "CC1",
    createdAt: moment.utc("2019-07-31T08:26:06.939Z").toISOString(),
    status: 'COMPLETE',
    createdBy: 'foo',
    createdByEmail: 'foo@foo.com',
    exportData: {
      exporterDetails: {
        ...exporterDetails
      },
      products: [
        {
          speciesCode: "LBE",
          caughtBy: [
            { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 200, _status: LandingStatus.Complete }
          ]
        }]
    }
  }

  const documentCC2: IDocument = {
    __t: "catchCert",
    documentNumber: "CC2",
    createdAt: moment.utc("2019-08-01T08:26:06.939Z").toISOString(),
    status: 'COMPLETE',
    createdBy: 'foo',
    createdByEmail: 'foo@foo.com',
    exportData: {
      exporterDetails: {
        ...exporterDetails
      },
      products: [
        {
          speciesCode: "LBE",
          caughtBy: [
            { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 200, _status: LandingStatus.Complete }
          ]
        }]
    }
  }

  it('will not return any landings', () => {

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: moment.utc("2019-07-31T08:26:06.939Z").toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          exporterDetails: {
            ...exporterDetails
          },
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 200, _status: LandingStatus.Complete, landingDataEndDate: '2019-08-02' }
              ]
            }]
        }
      },
      {
        __t: "catchCert",
        documentNumber: "CC2",
        createdAt: moment.utc("2019-08-01T08:26:06.939Z").toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          exporterDetails: {
            ...exporterDetails
          },
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 200, _status: LandingStatus.Complete, landingDataEndDate: '2019-08-02' }
              ]
            }]
        }
      },
      {
        __t: "catchCert",
        documentNumber: "CC3",
        createdAt: moment.utc("2019-08-01T08:26:06.939Z").toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          exporterDetails: {
            ...exporterDetails
          },
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 200, _status: LandingStatus.Exceeded14Days, landingDataEndDate: '2019-08-02' },
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-12", weight: 200, _status: LandingStatus.DataNeverExpected, landingDataEndDate: '2019-08-02' },
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-12", weight: 200, _status: LandingStatus.Complete, landingDataEndDate: '2019-08-02' }
              ]
            }]
        }
      },
      {
        __t: "catchCert",
        documentNumber: "CC4",
        createdAt: moment.utc("2019-08-01T08:26:06.939Z").toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          exporterDetails: {
            ...exporterDetails
          },
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "N/A", date: "2019-07-11", weight: 200, landingDataEndDate: '2019-08-02', vesselOverriddenByAdmin: true }
              ]
            }]
        }
      }
    ];

    const queryTime = moment.utc('2019-08-01T12:00:00');

    const expected = [];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toEqual(expected);
  });

  it('will return landing(s) marked as pending landing data from missing landings', () => {

    const queryTime = moment.utc('2019-08-01T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00').subtract(14, 'days');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 351, _status: LandingStatus.Pending }
              ]
            }]
        }
      }
    ];

    const expected = [
      { rssNumber: 'rssWA1', dateLanded: '2019-07-10' }
    ];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toEqual(expected);

  });

  it('will return landing(s) marked as pending landing data from missing landings validated by Elog within the 50 KG deminimus', () => {

    const queryTime = moment.utc('2019-08-01T23:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                {
                  vessel: "DAYBREAK", pln: "WA1", date: "2019-07-31", weight: 50, _status: LandingStatus.Pending,
                  dataEverExpected: true, landingDataExpectedDate: '2019-07-31T12:00:00', landingDataEndDate: '2019-08-10T12:00:00'
                }
              ]
            }]
        }
      }
    ];

    const expected = [
      { rssNumber: 'rssWA1', dateLanded: '2019-07-31' }
    ];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toEqual(expected);

  });

  it('will return landing(s) with admin overridden vessels that have license information', () => {

    const queryTime = moment.utc('2019-08-01T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00').subtract(14, 'days');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 351, _status: LandingStatus.Pending, vesselOverriddenByAdmin: true }
              ]
            }]
        }
      }
    ];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(1);
  });

  it('will return landing(s) when landingDataRuleDate is undefined', () => {

    const queryTime = moment.utc('2019-08-01T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 351, _status: LandingStatus.Pending }
              ]
            }]
        }
      }
    ];

    const expected = [{ rssNumber: 'rssWA1', dateLanded: '2019-07-10' }];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toEqual(expected);

  });

  it('will not return completed landings', () => {

    const documents: IDocument[] = [{
      __t: "catchCert",
      documentNumber: "CC1",
      createdAt: moment.utc("2019-07-31T08:26:06.939Z").toISOString(),
      status: 'COMPLETE',
      createdBy: 'foo',
      createdByEmail: 'foo@foo.com',
      exportData: {
        exporterDetails: {
          ...exporterDetails
        },
        products: [
          {
            speciesCode: "LBE",
            caughtBy: [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 75, _status: LandingStatus.Complete, landingDataEndDate: '2019-08-10T12:00:00' },
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 75, _status: LandingStatus.Pending,  landingDataEndDate: '2019-08-10T12:00:00' }
            ]
          }]
      }
    }, {
      __t: "catchCert",
      documentNumber: "CC2",
      createdAt: moment.utc("2019-07-31T08:26:06.939Z").toISOString(),
      status: 'COMPLETE',
      createdBy: 'foo',
      createdByEmail: 'foo@foo.com',
      exportData: {
        exporterDetails: {
          ...exporterDetails
        },
        products: [
          {
            speciesCode: "LBE",
            caughtBy: [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 85, _status: LandingStatus.Complete, landingDataEndDate: '2019-08-10T12:00:00' }
            ]
          }]
      }
    }];

    const queryTime = moment.utc('2019-08-01T12:00:00');

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ rssNumber: 'rssWA1', dateLanded: '2019-07-11' });
  });

  it('will include landing(s) that have a later query date than the landing end date as an exceeding landing', () => {

    const queryTime = moment.utc('2019-08-13T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 351, dataEverExpected: true, landingDataExpectedDate: '2019-08-02', landingDataEndDate: '2019-08-12', _status: LandingStatus.Pending }
              ]
            }]
        }
      }
    ];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(1);

  });

  it('will not include legally due landing(s) that have a later landing data expected date than the query date', () => {

    const queryTime = moment.utc('2019-07-01T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { 
                  vessel: "DAYBREAK",
                  pln: "WA1",
                  date: "2019-07-10",
                  weight: 351,
                  dataEverExpected: true,
                  landingDataExpectedDate: '2019-08-02',
                  landingDataEndDate: '2019-08-12',
                  _status: LandingStatus.Pending,
                  isLegallyDue: true
                }
              ]
            }]
        }
      }
    ];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(0);

  });

  it('will exclude data ever expected landing(s) that have a later query date than the landing end date as an exceeding landing', () => {

    const queryTime = moment.utc('2019-08-13T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 351,  dataEverExpected: false, _status: LandingStatus.DataNeverExpected }
              ]
            }]
        }
      }
    ];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(0);

  });

  it('will exclude high risk overuse as a missing landing - overuse across certs - passed thier retrospective period', () => {

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: moment.utc("2019-07-31T08:26:06.939Z").toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          exporterDetails: {
            ...exporterDetails
          },
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 200, _status: LandingStatus.Complete, dataEverExpected: true, landingDataExpectedDate: '2019-07-10', landingDataEndDate: '2019-07-31' }
              ]
            }]
        }
      },
      {
        __t: "catchCert",
        documentNumber: "CC2",
        createdAt: moment.utc("2019-07-31T08:26:06.939Z").toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          exporterDetails: {
            ...exporterDetails
          },
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 200, _status: LandingStatus.Complete, dataEverExpected: true, landingDataExpectedDate: '2019-07-10', landingDataEndDate: '2019-07-31' }
              ]
            }]
        }
      }
    ];

    const queryTime = moment.utc('2019-08-02T12:00:00');

    const expected = [];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toEqual(expected);
  });

  it('will exclude weight failure as a missing landing on a single cert', () => {

    const documents = [{
      ...documentCC1
    }];

    const queryTime = moment.utc('2019-08-01T12:00:00');

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(0);

  });

  it('will exclude species mismatch as a missing landing', () => {

    const documents = [
      { ...documentCC1 }
    ];

    const queryTime = moment.utc('2019-08-01T12:00:00');

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(0);

  });

  it('will exclude landing marked as pending landing data after 14 days from missing landings', () => {

    const queryTime = moment.utc('2019-08-01T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00').subtract(15, 'days');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 351, _status: LandingStatus.Pending }
              ]
            }]
        }
      }
    ];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(0);

  });

  it('will exclude real time validation successful landing marked as complete after 14 days from missing landings', () => {

    const queryTime = moment.utc('2019-08-01T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00').subtract(15, 'days');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 250, _status: LandingStatus.Complete }
              ]
            }]
        }
      }
    ];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(0);

  });

  it('will exclude landing(s) marked as exceeding 14 day limit from missing landings', () => {

    const queryTime = moment.utc('2019-08-01T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00').subtract(15, 'days');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 351, _status: LandingStatus.Exceeded14Days }
              ]
            }]
        }
      }
    ];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(0);

  });

  it('will exclude low risk overuse as a missing landing - overuse across certs', () => {

    const documents = [
      { ...documentCC1 },
      { ...documentCC2 }
    ];

    const queryTime = moment.utc('2019-08-01T12:00:00');

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(0);
  });

  it('will exclude landing(s) marked as pending landing data from missing landings validated by Elog within the 50 KG deminimus before the expected date', () => {

    const queryTime = moment.utc('2019-08-01T23:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 50, _status: LandingStatus.Pending, dataEverExpected: true, landingDataExpectedDate: '2019-08-02T12:00:00', landingDataEndDate: '2019-08-10T12:00:00' }
              ]
            }]
        }
      }
    ];

    const expected = [];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toEqual(expected);

  });

  it('will exclude landing(s) marked as pending landing data from missing landings validated by Elog with a non Validation - Failure Species fail', () => {

    const queryTime = moment.utc('2019-08-01T23:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "COD",
              caughtBy: [
                {
                  vessel: "DAYBREAK", pln: "WA1", date: "2019-07-31", weight: 5000, _status: LandingStatus.Complete,
                  dataEverExpected: true, landingDataExpectedDate: '2019-07-31T12:00:00', landingDataEndDate: '2019-08-10T12:00:00'
                }
              ]
            }]
        }
      }
    ];

    const expected = [];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toEqual(expected);

  });

  it('will exclude overuse within the 50 KG tolerance as a missing landing - overuse across certs for Elogs', () => {

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: moment.utc("2019-07-31T08:26:06.939Z").toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          exporterDetails: {
            ...exporterDetails
          },
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 50, _status: LandingStatus.Complete }
              ]
            }]
        }
      },
      {
        __t: "catchCert",
        documentNumber: "CC2",
        createdAt: moment.utc("2019-08-01T08:26:06.939Z").toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          exporterDetails: {
            ...exporterDetails
          },
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 50, _status: LandingStatus.Complete }
              ]
            }]
        }
      }
    ];

    const queryTime = moment.utc('2019-08-01T12:00:00');

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(0);
  });

  it('will exclude overuse within the 50 KG tolerance as a missing landing - overuse across certs', () => {

    const documents = [
      { ...documentCC1 },
      { ...documentCC2 }
    ];

    const queryTime = moment.utc('2019-08-01T12:00:00');

    const results: any[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(0);
  });

  it('will exclude overridden landings without license information', () => {

    const queryTime = moment.utc('2019-08-01T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00').subtract(14, 'days');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "FAKE VESSEL", pln: "FAKE PLN", date: "2019-07-10", weight: 351, _status: LandingStatus.Pending, vesselOverriddenByAdmin: true }
              ]
            }]
        }
      }
    ];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(0);

  });

  it('will exclude landing(s) that have a later landing date expected date', () => {

    const queryTime = moment.utc('2019-08-01T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 351, _status: LandingStatus.Pending, landingDataExpectedDate: '2019-08-02' }
              ]
            }]
        }
      }
    ];

    const expected = [];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toEqual(expected);

  });

  it('will exclude pre-existing landing(s) that have a later query date than the landing end date as an exceeding landing', () => {

    const queryTime = moment.utc('2019-09-13T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 351, dataEverExpecte: true, landingDataExpectedDate: '2019-08-02', landingDataEndDate: '2019-08-12', _status: LandingStatus.Exceeded14Days }
              ]
            }]
        }
      }
    ];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(0);

  });

  it('will exclude landing(s) that have a status of data never expected', () => {

    const queryTime = moment.utc('2019-08-02T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-08-01", weight: 351, dataEverExpected: false, _status: LandingStatus.DataNeverExpected }
              ]
            }]
        }
      }
    ];

    const results: ILandingQuery[] = Array.from(missingLandingRefreshQuery(documents, queryTime));

    expect(results).toHaveLength(0);

  });
});

describe('the query for refreshing landings exceeding 14 day', () => {

  let mockVesselIdx: jest.SpyInstance;

  beforeEach(() => {
    mockVesselIdx = jest.spyOn(cache, 'getVesselsIdx');
    mockVesselIdx.mockReturnValue(generateIndex(vessels))
  });

  afterEach(() => {
    mockVesselIdx.mockRestore();
  });

  it('will return landing(s) marked as EXCEEDING 14 Day limit 15 days after submission date', () => {
    const queryTime = moment.utc('2019-08-16T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: 'catchCert',
        documentNumber: 'CC1',
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: 'LBE',
              caughtBy: [
                {
                  vessel: 'DAYBREAK',
                  pln: 'WA1',
                  date: '2019-07-10',
                  weight: 351,
                  _status: LandingStatus.Pending
                },
              ],
            },
          ],
        },
      },
    ];

    const results: ICcQueryResult[] = Array.from(
      exceedingLimitLandingQuery(
        documents,
        queryTime
      )
    );

    expect(results.length).toEqual(1);
  });

  it('will return landing(s) marked as EXCEEDING 14 Day limit 2 days after landing end date', () => {
    const queryTime = moment.utc('2019-08-03T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: 'catchCert',
        documentNumber: 'CC1',
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: 'LBE',
              caughtBy: [
                {
                  vessel: 'DAYBREAK',
                  pln: 'WA1',
                  date: '2019-07-10',
                  weight: 351,
                  dataEverExpected: true,
                  landingDataExpectedDate: '2019-08-01',
                  landingDataEndDate: '2019-08-01',
                  _status: LandingStatus.Pending
                },
              ],
            },
          ],
        },
      },
    ];

    const results: ICcQueryResult[] = Array.from(
      exceedingLimitLandingQuery(
        documents,
        queryTime
      )
    );

    expect(results.length).toEqual(1);
  });

  it('will return landing(s) marked as EXCEEDING 14 Day limit 1 day after landing end date', () => {
    const queryTime = moment.utc('2019-08-03T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: 'catchCert',
        documentNumber: 'CC1',
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: 'LBE',
              caughtBy: [
                {
                  vessel: 'DAYBREAK',
                  pln: 'WA1',
                  date: '2019-07-10',
                  weight: 351,
                  dataEverExpected: true,
                  landingDataExpectedDate: '2019-08-02',
                  landingDataEndDate: '2019-08-02',
                  _status: LandingStatus.Pending
                },
                {
                  vessel: 'DAYBREAK',
                  pln: 'WA1',
                  date: '2019-07-10',
                  weight: 351,
                  dataEverExpected: true,
                  landingDataExpectedDate: '2019-08-02',
                  landingDataEndDate: '2019-08-03',
                  _status: LandingStatus.Pending
                }
              ],
            },
          ],
        },
      },
    ];

    const results: ICcQueryResult[] = Array.from(
      exceedingLimitLandingQuery(
        documents,
        queryTime
      )
    );

    expect(results.length).toEqual(1);
  });

  it('will not return landing(s) marked as COMPLETE 14 Day limit 15 days after submission date', () => {
    const queryTime = moment.utc('2019-08-16T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: 'catchCert',
        documentNumber: 'CC1',
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: 'LBE',
              caughtBy: [
                {
                  vessel: 'DAYBREAK',
                  pln: 'WA1',
                  date: '2019-07-10',
                  weight: 351,
                  _status: LandingStatus.Complete
                },
              ],
            },
          ],
        },
      },
    ];

    const results: ICcQueryResult[] = Array.from(
      exceedingLimitLandingQuery(
        documents,
        queryTime
      )
    );

    expect(results.length).toEqual(0);
  });

  it('will not return landing(s) marked as EXCEEDING 14 Day limit before the landing expected date', () => {
    const queryTime = moment.utc('2019-08-03T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: 'catchCert',
        documentNumber: 'CC1',
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: 'LBE',
              caughtBy: [
                {
                  vessel: 'DAYBREAK',
                  pln: 'WA1',
                  date: '2019-07-10',
                  weight: 351,
                  dataEverExpected: true,
                  landingDataExpectedDate: '2019-08-04',
                  landingDataEndDate: '2019-08-04',
                  _status: LandingStatus.Pending
                },
              ],
            },
          ],
        },
      },
    ];

    const results: ICcQueryResult[] = Array.from(
      exceedingLimitLandingQuery(
        documents,
        queryTime
      )
    );

    expect(results.length).toEqual(0);
  });

  it('will not return landing(s) within marked as LANDING_DATA_NEVER_EXPECTED', () => {
    const queryTime = moment.utc('2019-08-01T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00');

    const documents: IDocument[] = [
      {
        __t: 'catchCert',
        documentNumber: 'CC1',
        createdAt: certificateDate.toISOString(),
        status: 'COMPLETE',
        createdBy: 'foo',
        createdByEmail: 'foo@foo.com',
        exportData: {
          products: [
            {
              speciesCode: 'LBE',
              caughtBy: [
                {
                  vessel: 'DAYBREAK',
                  pln: 'WA1',
                  date: '2019-07-10',
                  weight: 351,
                  dataEverExpected: false,
                  _status: LandingStatus.DataNeverExpected
                },
              ],
            },
          ],
        },
      },
    ];

    const results: ICcQueryResult[] = Array.from(
      exceedingLimitLandingQuery(
        documents,
        queryTime
      )
    );

    expect(results.length).toEqual(0);
  });

});

describe('the query for check whether retrospective validation is required', () => {

  it('should not validate for validation outside of validation period', () => {
    const ccQuery: ICcQueryResult = {
      "documentNumber": "GBR-2024-CC-D9B78B127",
      "documentType": "catchCertificate",
      "createdAt": "2024-08-13T08:57:59.064Z",
      "status": "COMPLETE",
      "extended": {
        "exporterContactId": "f72591a1-6d8b-e911-a96f-000d3a29b5de",
        "exporterName": "single org business exporter",
        "exporterCompanyName": "test CG",
        "exporterPostCode": "B1 1TT",
        "vessel": "HARMONI",
        "landingId": "GBR-2024-CC-D9B78B127-3768580547",
        "pln": "M147",
        "fao": "FAO27",
        "flag": "GBR",
        "cfr": "GBR000C18074",
        "presentation": "WHL",
        "presentationName": "Whole",
        "species": "Haddock (HAD)",
        "scientificName": "Melanogrammus aeglefinus",
        "state": "FRE",
        "stateName": "Fresh",
        "commodityCode": "03025200",
        "commodityCodeDescription": "Fresh or chilled haddock \"Melanogrammus aeglefinus\"",
        "transportationVehicle": "truck",
        "numberOfSubmissions": 1,
        "speciesOverriddenByAdmin": false,
        "licenceHolder": "G&M ROBERTS FISHING (NEFYN) LTD",
        "dataEverExpected": true,
        "landingDataExpectedDate": "2024-08-12",
        "landingDataEndDate": "2024-08-12",
        "isLegallyDue": false,
        "homePort": "PWLLHELI",
        "imoNumber": 8567535,
        "licenceNumber": "50151",
        "licenceValidTo": "2030-12-31"
      },
      "rssNumber": "C18074",
      "da": "Wales",
      "dateLanded": "2024-08-11",
      "species": "HAD",
      "weightFactor": 1,
      "weightOnCert": 1,
      "rawWeightOnCert": 1,
      "weightOnAllCerts": 102,
      "weightOnAllCertsBefore": 101,
      "weightOnAllCertsAfter": 102,
      "isLandingExists": true,
      "isExceeding14DayLimit": false,
      "speciesAlias": "N",
      "durationSinceCertCreation": "PT0.117S",
      "source": "ELOG",
      "weightOnLandingAllSpecies": 100,
      "numberOfLandingsOnDay": 1,
      "durationBetweenCertCreationAndFirstLandingRetrieved": "-PT21H27M40.432S",
      "durationBetweenCertCreationAndLastLandingRetrieved": "-PT21H27M40.432S",
      "firstDateTimeLandingDataRetrieved": "2024-08-12T11:30:18.632Z",
      "isSpeciesExists": true,
      "weightOnLanding": 100,
      "landingTotalBreakdown": [
        {
          "presentation": "WHL",
          "state": "FRE",
          "source": "ELOG",
          "isEstimate": true,
          "factor": 1,
          "weight": 100,
          "liveWeight": 100
        }
      ],
      "isOverusedThisCert": false,
      "isOverusedAllCerts": false,
      "overUsedInfo": []
    };

    const queryTime = moment.utc('2024-08-16T13:15:06.143Z');
    const result = retrospectiveValidationRequired(queryTime, ccQuery);
    expect(result).toBe(false);
  });
});