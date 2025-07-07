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

  it('will unwind and map catches for a processing statement', () => {

    const document = createDocument('12345',
      'processingStatement',
      [
        { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', scientificName: "some scientific name 1", totalWeightLanded: 500.11, exportWeightBeforeProcessing: 100.11, exportWeightAfterProcessing: 90.11  },
        { catchCertificateNumber: 'FCC051', catchCertificateType: 'non_uk', species: 'cats', scientificName: "some scientific name 1", totalWeightLanded: 400.11, exportWeightBeforeProcessing: 200.11, exportWeightAfterProcessing: 190.11 },
        { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', scientificName: "some scientific name 1", totalWeightLanded: 300.11, exportWeightBeforeProcessing: 300.11, exportWeightAfterProcessing: 290.11 }
      ]
    )

    const expected = [
      { documentNumber: '12345', status: 'COMPLETE', documentType: 'processingStatement',
        extended: { url: 'http://www.bob.com' },
        certificateNumber: 'FCC051', certificateType: 'uk', da: 'England', species: 'cats', scientificName: "some scientific name 1", commodityCode: 'N/A', weight: 100.11, weightOnCC: 500.11, weightAfterProcessing: 90.11 },
      { documentNumber: '12345', status: 'COMPLETE', documentType: 'processingStatement',
        extended: { url: 'http://www.bob.com' },
        certificateNumber: 'FCC051', certificateType: 'non_uk', da: 'England', species: 'cats', scientificName: "some scientific name 1", commodityCode: 'N/A', weight: 200.11, weightOnCC: 400.11, weightAfterProcessing: 190.11 },
      { documentNumber: '12345', status: 'COMPLETE', documentType: 'processingStatement',
        extended: { url: 'http://www.bob.com' },
        certificateNumber: 'FCC051', certificateType: 'uk', da: 'England', species: 'cats', scientificName: "some scientific name 1", commodityCode: 'N/A', weight: 300.11, weightOnCC: 300.11, weightAfterProcessing: 290.11 },
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
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', scientificName: 'some scientific name', totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
        ],
        moments.utc('2019-01-01T00:00:00Z')
      )]

    const expected = [
      { catchCertificateNumber: "FCC051", catchCertificateType: 'uk', documentNumber: '12345', status: 'COMPLETE', documentType: 'processingStatement', da: 'England', createdAt: '2019-01-01T00:00:00.000Z',
        species: 'cats', scientificName: 'some scientific name', commodityCode: 'N/A',
        weightOnDoc: 100, weightOnAllDocs: 100, weightOnFCC: 500,
        isOverAllocated: false, overAllocatedByWeight: 0,
        overUsedInfo: [],
        isMismatch: false
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

  describe('for processing statement', () => {

    const totalWeightLandedWeight = 100

    beforeEach(()=>{
      documents = [
        createDocument('12345',
           'processingStatement',
           [
             {
               catchCertificateNumber: 'FCC051',
               species: 'cats',
               scientificName: 'some scientific name',
               totalWeightLanded: totalWeightLandedWeight,
               exportWeightBeforeProcessing: 0
             }
           ],
           moments.utc('2019-01-01T00:00:00Z')
        )]
    });

    it('should be set as false if exportWeightBeforeProcessing is less than totalWeightLanded', () => {

      documents[0].exportData.catches[0].exportWeightBeforeProcessing = totalWeightLandedWeight - 1;

      const result = Array.from(Query.sdpsQuery(documents, postCodeToDa));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it('should be set as false if exportWeightBeforeProcessing is equal to totalWeightLanded', () => {

      documents[0].exportData.catches[0].exportWeightBeforeProcessing = totalWeightLandedWeight ;

      const result = Array.from(Query.sdpsQuery(documents, postCodeToDa));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it(`should be set as false if exportWeightBeforeProcessing is less than totalWeightLanded + ${Query.TOLERANCE_IN_KG}` , () => {

      documents[0].exportData.catches[0].exportWeightBeforeProcessing = totalWeightLandedWeight + Query.TOLERANCE_IN_KG -1  ;

      const result = Array.from(Query.sdpsQuery(documents, postCodeToDa));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it(`should be set as false if exportWeightBeforeProcessing is equal is totalWeightLanded + ${Query.TOLERANCE_IN_KG}` , () => {

      documents[0].exportData.catches[0].exportWeightBeforeProcessing = totalWeightLandedWeight + Query.TOLERANCE_IN_KG  ;

      const result = Array.from(Query.sdpsQuery(documents, postCodeToDa));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it(`should be set as true if exportWeightBeforeProcessing is more than totalWeightLanded + ${Query.TOLERANCE_IN_KG}` , () => {

      documents[0].exportData.catches[0].exportWeightBeforeProcessing = totalWeightLandedWeight + Query.TOLERANCE_IN_KG + 1 ;

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
    const documents :any = [
      createDocument('12345', 'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
        ],moments.utc('2019-01-01T00:00:00Z'))]
      documents[0].audit = [{
        eventType: 'PREAPPROVED',
        triggeredBy: 'test',
        data: []
      }]
    const expected =   [
      {
        documentNumber: '12345',
        status: 'COMPLETE',
        documentType: 'processingStatement',
        da: 'England',
        species: 'cats',
        scientificName: undefined,
        catchCertificateNumber: 'FCC051',
        catchCertificateType: 'uk',
        commodityCode: 'N/A',
        weightOnDoc: 100,
        weightOnAllDocs: 100,
        weightOnFCC: 500,
        isOverAllocated: false,
        overAllocatedByWeight: 0,
        overUsedInfo: [],
        isMismatch: false
      }
    ]

      const unwoundCatches = [
        {
          documentNumber: '12345',
          da: 'England',
          documentType: 'processingStatement',
          certificateNumber: 'FCC051',
          certificateType: 'uk',
          createdAt: '2025-06-30T14:33:41.655Z',

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
      delete item.createdAt;
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
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', scientificName: undefined, totalWeightLanded: 500, exportWeightBeforeProcessing: 100, exportWeightAfterProcessing: undefined },
        ],
        moments.utc('2019-01-01T00:00:00Z')
      )]

      documents[0].status = undefined
      documents[0].audit = [{
        eventType: 'VOIDED',
        triggeredBy: 'test',
        data: []
      }]

      const expected =   [
      {
        documentNumber: '12345',
        status: 'COMPLETE',
        documentType: 'processingStatement',
        da: 'England',
        species: 'cats',
        scientificName: undefined,
        catchCertificateNumber: 'FCC051',
        catchCertificateType: 'uk',
        commodityCode: 'N/A',
        weightOnDoc: 100,
        weightOnAllDocs: 100,
        weightOnFCC: 500,
        isOverAllocated: false,
        overAllocatedByWeight: 0,
        overUsedInfo: [],
        isMismatch: false
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
      delete item.createdAt;
      return item
    })
          
    const foreignCatchCerts = Query.unwoundCatchesToForeignCatchCerts(unwoundCatches)
    foreignCatchCerts.next().value

    Query.unwindForeignCatchCerts(Array.from(foreignCatchCerts));
    expect(actual).toEqual(expected)
  });
  it('test 4', () => {

    const documents = [
       createDocument('52345', 'processingStatement', [
        { catchCertificateNumber: 'FCC061', catchCertificateType: 'uk', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 100}
      ])]

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

    expect(loggerErrorMock).toHaveBeenCalledWith(`[FOREIGN-CATCH-CERTS][ERROR]Unable to find [FCC061cats] in fccIdx`);
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
describe('getWeightAfterProcess', () => {


it('will unwind and map catches for a PS', () => {

    const document = createDocument('12345',
      'processingStatement',
      [
        { certificateNumber: 'FCC051', certificateType: 'uk', product: 'cats', scientificName: "some scientific name 1", weightOnCC: 500.51, productWeight: 500.51, dateOfUnloading: "15/06/2020", placeOfUnloading: "Dover", transportUnloadedFrom: "BA078", exportWeightAfterProcessing: 90.11  },
        { certificateNumber: 'FCC051', certificateType: 'non_uk', product: 'dogs', scientificName: "some scientific name 2", weightOnCC: 500.51, productWeight: 200.29, dateOfUnloading: "15/06/2020", placeOfUnloading: "Hull", transportUnloadedFrom: "EF078" }
      ]
    )

    const expected = [
      {
        documentNumber: '12345',
        status: 'COMPLETE',
        da: 'England',
        documentType: 'processingStatement',
        certificateNumber: undefined,
        certificateType: undefined,
        species: undefined,
        scientificName: 'some scientific name 1',
        commodityCode: 'N/A',
        weight: NaN,
        weightOnCC: NaN,
        weightAfterProcessing: 90.11,
        extended: {
          url: 'http://www.bob.com',
          exporterCompanyName: undefined,
          investigation: undefined,
          voidedBy: undefined,
          preApprovedBy: undefined,
          id: undefined
        }
      },
      {
        documentNumber: '12345',
        status: 'COMPLETE',
        da: 'England',
        documentType: 'processingStatement',
        certificateNumber: undefined,
        certificateType: undefined,
        species: undefined,
        scientificName: 'some scientific name 2',
        commodityCode: 'N/A',
        weight: NaN,
        weightOnCC: NaN,
        weightAfterProcessing: undefined,
        extended: {
          url: 'http://www.bob.com',
          exporterCompanyName: undefined,
          investigation: undefined,
          voidedBy: undefined,
          preApprovedBy: undefined,
          id: undefined
        }
      }
    ]

    const res = Query.unwindAndMapCatches(document, identity)
    .map((item: any) => {
      delete item.createdAt;
      return item
    })
    expect(res).toEqual(expected)

  })

});

