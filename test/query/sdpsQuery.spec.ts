const moments = require('moment');
import { AuditEventTypes, postCodeToDa } from 'mmo-shared-reference-data';
import * as Query from '../../src/query/sdpsQuery';
import { sdpsQuery } from '../../src/query/sdpsQuery';
// import { IFlattenedCatch } from '../../src/types/query';
import logger from '../../src/logger';
import { ISdPsQueryResult } from '../../src/types/query';

const createDocument = (documentNumber, documentType, catches, createdAt?) =>
  ({
     __t: documentType,
     documentUri: 'http://www.bob.com',
     exportData: { catches },
     createdByEmail: 'bob@bob.com',
     createdBy: 'bob',
     createdAt: createdAt ? createdAt : new Date(),
     documentNumber,
     status: 'COMPLETE',
	});


const identity = (_) => _

describe('low level transformations', () => {

  it('will unwind and map catches for a storage document', () => {

    const document = createDocument('12345',
      'storageDocument',
      [
        { certificateNumber: 'FCC051', certificateType: 'uk', product: 'cats', scientificName: "some scientific name 1", weightOnCC: 500.51, productWeight: 500.51, dateOfUnloading: "15/06/2020", placeOfUnloading: "Dover", transportUnloadedFrom: "BA078", exportWeightAfterProcessing: 90.11  },
        { certificateNumber: 'FCC051', certificateType: 'non_uk', product: 'dogs', scientificName: "some scientific name 2", weightOnCC: 500.51, productWeight: 200.29, dateOfUnloading: "15/06/2020", placeOfUnloading: "Hull", transportUnloadedFrom: "EF078" }
      ]
    )

    const expected = [
      { documentNumber: '12345', status: 'COMPLETE', documentType: 'storageDocument',
        extended: { url: 'http://www.bob.com' },
        certificateNumber: 'FCC051', certificateType: 'uk', da: 'England', species: 'cats', scientificName: "some scientific name 1", weight: 500.51, weightOnCC: 500.51,
        dateOfUnloading: "15/06/2020", placeOfUnloading: "Dover", transportUnloadedFrom: "BA078" },
      { documentNumber: '12345', status: 'COMPLETE', documentType: 'storageDocument',
        extended: { url: 'http://www.bob.com' },
        certificateNumber: 'FCC051', certificateType: 'non_uk', da: 'England', species: 'dogs', scientificName: "some scientific name 2", weight: 200.29, weightOnCC: 500.51,
        dateOfUnloading: "15/06/2020", placeOfUnloading: "Hull", transportUnloadedFrom: "EF078" }
    ]

    const res = Query.unwindAndMapCatches(document, identity)

    const actual = Array.from(res)
    .map((item: any) => {
      delete item.createdAt;
      return item
    })
    expect(actual).toEqual(expected)

  })

})

describe('tests at the query level', () => {

  it('test 1', () => {

    const documents = [
      createDocument('12345',
        'storageDocument',
        [
          { certificateNumber: 'FCC051', certificateType: 'uk', product: 'cats', scientificName: "some scientific name 1", weightOnCC: 500.51, productWeight: 500.51, dateOfUnloading: "15/06/2020", placeOfUnloading: "Dover", transportUnloadedFrom: "BA078" },
          // { certificateNumber: 'FCC051', certificateType: 'non_uk', product: 'dogs', scientificName: "some scientific name 2", weightOnCC: 500.51, productWeight: 200.29, dateOfUnloading: "15/06/2020", placeOfUnloading: "Hull", transportUnloadedFrom: "EF078" }
        ],
        moments.utc('2019-01-01T00:00:00Z')
      )]

    const expected = [
      {
           "catchCertificateNumber": "FCC051",
           "catchCertificateType": "uk",
           "commodityCode": undefined,
           "createdAt": "2019-01-01T00:00:00.000Z",
           "da": "England",
           "dateOfUnloading": "15/06/2020",
           "documentNumber": "12345",
           "documentType": "storageDocument",
           "isMismatch": false,
           "isOverAllocated": false,
           "overAllocatedByWeight": 0,
           "overUsedInfo":  [],
           "placeOfUnloading": "Dover",
           "scientificName": "some scientific name 1",
           "species": "cats",
           "status": "COMPLETE",
           "transportUnloadedFrom": "BA078",
           "weightOnAllDocs": 500.51,
           "weightOnDoc": 500.51,
           "weightOnFCC": 500.51,
         }
    ]

    const res = Query.sdpsQuery(documents, postCodeToDa)

    const actual = Array.from(res)
    .map((item: any) => {
      delete item.extended;
      return item
    })
    expect(actual).toEqual(expected)

  })
})

describe('When setting isOverAllocated', () => {

  let documents;

  describe('in storage documents', () => {

    const weightOnCC = 100

    beforeEach(()=> {
      documents = [
         createDocument('12345',
         'storageDocument',
         [
           {
             certificateNumber: 'FCC051',
             product: 'cats',
             scientificName: 'some scientific name',
             weightOnCC: weightOnCC,
             productWeight: 0,
             dateOfUnloading: "15/06/2020",
             placeOfUnloading: "Dover",
             transportUnloadedFrom: "BA078"
           }
         ]
        )
      ]
    });

    it('should be set as false if weightOnCC less than productWeight',  () => {

      documents[0].exportData.catches[0].productWeight = weightOnCC - 1 ;

      const result = Array.from(Query.sdpsQuery(documents, postCodeToDa));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it('should be set as false if weightOnCC equal to productWeight',  () => {

      documents[0].exportData.catches[0].productWeight = weightOnCC ;

      const result = Array.from(Query.sdpsQuery(documents, postCodeToDa));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it(`should be set as false if weightOnCC less than productWeight + ${Query.TOLERANCE_IN_KG}`,  () => {

      documents[0].exportData.catches[0].productWeight = weightOnCC + Query.TOLERANCE_IN_KG -1;

      const result = Array.from(Query.sdpsQuery(documents, postCodeToDa));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it(`should be set as false if weightOnCC equal to productWeight + ${Query.TOLERANCE_IN_KG}`,  () => {

      documents[0].exportData.catches[0].productWeight = weightOnCC + Query.TOLERANCE_IN_KG ;

      const result = Array.from(Query.sdpsQuery(documents, postCodeToDa));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it(`should be set as true if weightOnCC more than productWeight + ${Query.TOLERANCE_IN_KG}`,  () => {

      documents[0].exportData.catches[0].productWeight = weightOnCC + Query.TOLERANCE_IN_KG + 1;

      const result = Array.from(Query.sdpsQuery(documents, postCodeToDa));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeTruthy();

    });

  })

});

describe('species not found on fcc', () => {
  afterEach(()=>{
    jest.restoreAllMocks();
  })

  it('test 1', () => {
    const documents:any = [
      createDocument('12345',
        'storageDocument',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', scientificName: 'some scientific name', totalWeightLanded: 500, exportWeightBeforeProcessing: 100, exportWeightAfterProcessing: 5.22 },
        ],
        moments.utc('2019-01-01T00:00:00Z')
      )]

      documents[0].status = undefined
      documents[0].audit = [{
        eventType: 'PREAPPROVED',
        triggeredBy: 'test',
        data: []
      }]

      const expected = [
        {
          catchCertificateNumber: undefined,
          catchCertificateType: undefined,
          commodityCode: undefined,
          createdAt: '2019-01-01T00:00:00.000Z',
          da: 'England',
          documentNumber: '12345',
          documentType: 'storageDocument',
          isMismatch: false,
          isOverAllocated: false,
          overAllocatedByWeight: 0,
          overUsedInfo: [],
          scientificName: 'some scientific name',
          species: undefined,
          status: 'COMPLETE',
          weightOnAllDocs: NaN,
          weightOnDoc: NaN,
          weightOnFCC: 0,
        }
      ]

      const unwoundCatches = [
        {
          documentNumber: '12345',
          createdAt: '2019-01-01T00:00:00.000Z',
          da: 'England',
          documentType: 'processingStatement',
          certificateNumber: 'FCC051',
          certificateType: 'uk',
          species: "abc",
          scientificName: 'some scientific name',
          commodityCode: 'N/A',
          weight: 100,          
          weightOnCC: 10,
          status: 'COMPLETE',
          weightAfterProcessing: 5.22,
          extended: {
            url: 'http://www.bob.com',
            exporterCompanyName: "abc",
            investigation: "abc",
            voidedBy: "abc",
            preApprovedBy: "abc",
            id: "abc"
          }
        }
      ]
  
    const res = sdpsQuery(documents, postCodeToDa)

    const actual = Array.from(res)
    .map((item: any) => {
      delete item.extended;
      return item
    })
          
    const foreignCatchCerts = Query.unwoundCatchesToForeignCatchCerts(unwoundCatches)
    foreignCatchCerts.next().value

    Query.unwindForeignCatchCerts(Array.from(foreignCatchCerts));
    expect(actual).toEqual(expected)
  });
  it('test 2', () => {
    const documents:any = [
      createDocument('12345',
        'storageDocument',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', scientificName: 'some scientific name', totalWeightLanded: 500, exportWeightBeforeProcessing: 100, exportWeightAfterProcessing: 5.22 },
        ],
        moments.utc('2019-01-01T00:00:00Z')
      )]

      documents[0].status = undefined
      documents[0].audit = [{
        eventType: 'VOIDED',
        triggeredBy: 'test',
        data: []
      }]

      const expected = [
        {
          catchCertificateNumber: undefined,
          catchCertificateType: undefined,
          commodityCode: undefined,
          createdAt: '2019-01-01T00:00:00.000Z',
          da: 'England',
          documentNumber: '12345',
          documentType: 'storageDocument',
          isMismatch: false,
          isOverAllocated: false,
          overAllocatedByWeight: 0,
          overUsedInfo: [],
          scientificName: 'some scientific name',
          species: undefined,
          status: 'COMPLETE',
          weightOnAllDocs: NaN,
          weightOnDoc: NaN,
          weightOnFCC: 0,
        }
      ]

      const unwoundCatches = [
        {
          documentNumber: '12345',
          createdAt: '2019-01-01T00:00:00.000Z',
          da: 'England',
          documentType: 'processingStatement',
          certificateNumber: 'FCC051',
          certificateType: 'uk',
          species: "abc",
          scientificName: 'some scientific name',
          commodityCode: 'N/A',
          weight: 100,          
          weightOnCC: 10,
          status: 'COMPLETE',
          weightAfterProcessing: 5.22,
          extended: {
            url: 'http://www.bob.com',
            exporterCompanyName: "abc",
            investigation: "abc",
            voidedBy: "abc",
            preApprovedBy: "abc",
            id: "abc"
          }
        }
      ]
  
    const res = sdpsQuery(documents, postCodeToDa)

    const actual = Array.from(res)
    .map((item: any) => {
      delete item.extended;
      return item
    })
          
    const foreignCatchCerts = Query.unwoundCatchesToForeignCatchCerts(unwoundCatches)
    foreignCatchCerts.next().value

    Query.unwindForeignCatchCerts(Array.from(foreignCatchCerts));
    expect(actual).toEqual(expected)
  });
  it('test 4', () => {

    const documents = [
      createDocument('12345',
        'storageDocument',
        [
          { certificateNumber: 'FCC051', certificateType: 'uk', product: 'cats', scientificName: "some scientific name 1", weightOnCC: 500.51, productWeight: 500.51, dateOfUnloading: "15/06/2020", placeOfUnloading: "Dover", transportUnloadedFrom: "BA078" },
        ],
        moments.utc('2019-01-01T00:00:00Z')
      )]

    const fccIdx = {
      FCC051ats: {
        certificateNumber: 'FCC051',
        certificateType: undefined,
        species: "cats",
        createdByDocument: '12345',
        declaredWeight: 500,
        allocatedWeight: 100,
        allocationsFrom: [[]]
      }
    }

    const loggerErrorMock = jest.spyOn(logger, 'error');
    const unwoundForeignCatchCertsMock = jest.spyOn(Query, 'getUnwoundForeignCatchCerts');

    unwoundForeignCatchCertsMock.mockReturnValue(fccIdx)

    const res = sdpsQuery(documents, postCodeToDa)

    Array.from(res)
      .map((item: any) => {
        delete item.extended;
        return item
      })

    expect(loggerErrorMock).toHaveBeenCalledWith(`[FOREIGN-CATCH-CERTS][ERROR]Unable to find [FCC051cats] in fccIdx`);
  })
});

describe('getLastAuditEvent', () => {

  const audits = [
    {
      "eventType": "INVESTIGATED",
      "triggeredBy": "Bob",
      "timestamp": new Date(),
      "data": { "investigationStatus": "DATA_ERROR_NFA" }
    },
    {
      "eventType": "VOIDED",
      "triggeredBy": "Bob",
      "timestamp": new Date(),
      "data": null
    },
    {
      "eventType": "INVESTIGATED",
      "triggeredBy": "Bob",
      "timestamp": new Date(),
      "data": { "investigationStatus": "MINOR_VERBAL" }
    },
    {
      "eventType": "VOIDED",
      "triggeredBy": "Fred",
      "timestamp": new Date(),
      "data": null
    }
  ];

  it('should get the last investigated audit', () => {

    const actual = Query.getLastAuditEvent(audits, AuditEventTypes.Investigated);

    expect(actual).toStrictEqual(audits[2]);

  });

  it('should get the last voided audit', () => {

    const actual = Query.getLastAuditEvent(audits, AuditEventTypes.Voided);

    expect(actual).toStrictEqual(audits[3]);

  });

  it('should return undefined if there are no events of the given type', () => {

    const actual = Query.getLastAuditEvent(audits, 'X');

    expect(actual).toBeUndefined();

  });

  it('should return undefined if there is no audit array', () => {

    const actual = Query.getLastAuditEvent([], AuditEventTypes.Voided);

    expect(actual).toBeUndefined();

  });

});
