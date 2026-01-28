import * as SUT from '../../../src/landings/query/sdpsQuery';

jest.mock('../../../src/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

const mockPostCodeToDa = {
  'NE1 1AA': 'England',
  'CF1 1AA': 'Wales'
};

describe('sdpsQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLastAuditEvent', () => {
    it('should return the last audit event of the specified type when multiple matches exist', () => {
      const events = [
        { eventType: 'Voided', triggeredBy: 'user1', createdAt: '2021-01-01' },
        { eventType: 'PreApproved', triggeredBy: 'user2', createdAt: '2021-01-02' },
        { eventType: 'Voided', triggeredBy: 'user3', createdAt: '2021-01-03' }
      ];
      
      const result = SUT.getLastAuditEvent(events as any, 'Voided');
      
      expect(result).toEqual({ eventType: 'Voided', triggeredBy: 'user3', createdAt: '2021-01-03' });
    });

    it('should return undefined when no matches exist', () => {
      const events = [
        { eventType: 'PreApproved', triggeredBy: 'user1', createdAt: '2021-01-01' }
      ];
      
      const result = SUT.getLastAuditEvent(events as any, 'Voided');
      
      expect(result).toBeUndefined();
    });

    it('should return the single match when only one exists', () => {
      const events = [
        { eventType: 'Voided', triggeredBy: 'user1', createdAt: '2021-01-01' }
      ];
      
      const result = SUT.getLastAuditEvent(events as any, 'Voided');
      
      expect(result).toEqual({ eventType: 'Voided', triggeredBy: 'user1', createdAt: '2021-01-01' });
    });

    it('should return undefined when events array is empty', () => {
      const result = SUT.getLastAuditEvent([], 'Voided');
      
      expect(result).toBeUndefined();
    });
  });

  describe('sdpsQuery', () => {
    it('should process storage document catches correctly', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              {
                id: 'catch-1',
                certificateNumber: 'CC-001',
                certificateType: 'uk',
                product: 'COD',
                commodityCode: '03025110',
                productWeight: '100',
                weightOnCC: '100',
                scientificName: 'Gadus morhua',
                netWeightProductArrival: '90',
                netWeightFisheryProductArrival: '85',
                netWeightProductDeparture: '80',
                netWeightFisheryProductDeparture: '75',
                productDescription: 'Fresh cod fillets',
                supportingDocuments: ['DOC1', 'DOC2']
              }
            ]
          }
        },
        {
          documentNumber: 'SD-002',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-02T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              {
                id: 'catch-2',
                certificateNumber: 'CC-001',
                certificateType: 'uk',
                product: 'COD',
                commodityCode: '03025110',
                productWeight: '50',
                weightOnCC: '100'
              }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(2);
      expect(results[0].documentNumber).toBe('SD-001');
      expect(results[0].species).toBe('COD');
      expect(results[0].weightOnDoc).toBe(100);
      expect(results[0].productDescription).toBe('Fresh cod fillets');
      expect(results[0].supportingDocuments).toBe('DOC1,DOC2');
    });

    it('should process processing statement catches correctly', () => {
      const documents = [
        {
          documentNumber: 'PS-001',
          __t: 'processingStatement',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              {
                id: 'catch-1',
                catchCertificateNumber: 'CC-001',
                catchCertificateType: 'uk',
                species: 'Atlantic cod (COD)',
                scientificName: 'Gadus morhua',
                productCommodityCode: '03025110',
                exportWeightBeforeProcessing: '100',
                totalWeightLanded: '100',
                exportWeightAfterProcessing: '80',
                productDescription: 'Processed cod'
              }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].documentNumber).toBe('PS-001');
      expect(results[0].documentType).toBe('processingStatement');
      expect(results[0].species).toBe('Atlantic cod (COD)');
      expect(results[0].weightAfterProcessing).toBe(80);
    });
  });

  describe('getForeignCatchCertificatesFromDocuments', () => {
    it('should return unique certificate numbers from documents', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { id: '1', certificateNumber: 'CC-001', product: 'COD', productWeight: '100', weightOnCC: '100' },
              { id: '2', certificateNumber: 'cc-001', product: 'HAD', productWeight: '50', weightOnCC: '50' }
            ]
          }
        },
        {
          documentNumber: 'SD-002',
          __t: 'storageDocument',
          createdAt: '2021-01-02T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { id: '3', certificateNumber: 'CC-002', product: 'COD', productWeight: '75', weightOnCC: '75' }
            ]
          }
        }
      ];

      const result = SUT.getForeignCatchCertificatesFromDocuments(documents);

      expect(result).toHaveLength(2);
      expect(result).toContain('CC-001');
      expect(result).toContain('CC-002');
    });

    it('should return empty array when no documents provided', () => {
      const result = SUT.getForeignCatchCertificatesFromDocuments([]);

      expect(result).toEqual([]);
    });
  });

  describe('unwindDocumentsToCatches', () => {
    it('should unwind multiple documents to catches', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { id: '1', certificateNumber: 'CC-001', product: 'COD', productWeight: '100', weightOnCC: '100' }
            ]
          }
        }
      ];
      
      const daLookup = () => 'England';
      const results = Array.from(SUT.unwindDocumentsToCatches(documents, daLookup));

      expect(results).toHaveLength(1);
      expect(results[0].documentNumber).toBe('SD-001');
    });
  });

  describe('unwindForeignCatchCerts', () => {
    it('should unwind foreign catch certificates', () => {
      const fccs = [
        {
          certificateNumber: 'CC-001',
          items: [
            {
              certificateType: 'uk',
              species: 'COD',
              createdByDocument: 'SD-001',
              declaredWeight: 100,
              allocatedWeight: 100,
              allocationsFrom: [{ documentNumber: 'SD-001', weight: 100 }]
            }
          ]
        }
      ];

      const results = Array.from(SUT.unwindForeignCatchCerts(fccs));

      expect(results).toHaveLength(1);
      expect(results[0].certificateNumber).toBe('CC-001');
      expect(results[0].species).toBe('COD');
    });
  });

  describe('overAllocatedByWeight calculation', () => {
    it('should calculate overAllocatedByWeight when isOverAllocated is true', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { id: 'catch-1', certificateNumber: 'CC-001', certificateType: 'uk', product: 'COD', productWeight: '200', weightOnCC: '100' }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].isOverAllocated).toBe(true);
      expect(results[0].overAllocatedByWeight).toBe(100); // 200 - 100
    });

    it('should set overAllocatedByWeight to 0 when not over allocated', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { id: 'catch-1', certificateNumber: 'CC-001', certificateType: 'uk', product: 'COD', productWeight: '100', weightOnCC: '100' }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].isOverAllocated).toBe(false);
      expect(results[0].overAllocatedByWeight).toBe(0);
    });
  });

  describe('overUsedInfo array with linkedSdPs', () => {
    it('should populate overUsedInfo with prior document numbers when over allocated', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { id: 'catch-1', certificateNumber: 'CC-001', certificateType: 'uk', product: 'COD', productWeight: '100', weightOnCC: '100' }
            ]
          }
        },
        {
          documentNumber: 'SD-002',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-02T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { id: 'catch-2', certificateNumber: 'CC-001', certificateType: 'uk', product: 'COD', productWeight: '100', weightOnCC: '100' }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(2);
      expect(results[0].overUsedInfo).toEqual([]);
      expect(results[1].isOverAllocated).toBe(true);
      expect(results[1].overUsedInfo).toContain('SD-001');
    });

    it('should have empty overUsedInfo when not over allocated', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { id: 'catch-1', certificateNumber: 'CC-001', certificateType: 'uk', product: 'COD', productWeight: '50', weightOnCC: '100' }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].isOverAllocated).toBe(false);
      expect(results[0].overUsedInfo).toEqual([]);
    });
  });

  describe('audit event processing', () => {
    it('should extract voidedBy from VOIDED audit event', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          audit: [
            { eventType: 'VOIDED', triggeredBy: 'admin-user', timestamp: new Date() }
          ],
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { id: 'catch-1', certificateNumber: 'CC-001', certificateType: 'uk', product: 'COD', productWeight: '100', weightOnCC: '100' }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].extended.voidedBy).toBe('admin-user');
    });

    it('should extract preApprovedBy from PREAPPROVED audit event', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          audit: [
            { eventType: 'PREAPPROVED', triggeredBy: 'approver-user', timestamp: new Date() }
          ],
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { id: 'catch-1', certificateNumber: 'CC-001', certificateType: 'uk', product: 'COD', productWeight: '100', weightOnCC: '100' }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].extended.preApprovedBy).toBe('approver-user');
    });

    it('should return undefined for voidedBy when no VOIDED event exists', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          audit: [],
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { id: 'catch-1', certificateNumber: 'CC-001', certificateType: 'uk', product: 'COD', productWeight: '100', weightOnCC: '100' }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].extended.voidedBy).toBeUndefined();
    });
  });

  describe('supportingDocuments join', () => {
    it('should join supporting documents with comma when array has items', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { 
                id: 'catch-1', 
                certificateNumber: 'CC-001', 
                certificateType: 'uk', 
                product: 'COD', 
                productWeight: '100', 
                weightOnCC: '100',
                supportingDocuments: ['DOC1', 'DOC2', 'DOC3']
              }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].supportingDocuments).toBe('DOC1,DOC2,DOC3');
    });

    it('should return undefined when supportingDocuments is empty array', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { 
                id: 'catch-1', 
                certificateNumber: 'CC-001', 
                certificateType: 'uk', 
                product: 'COD', 
                productWeight: '100', 
                weightOnCC: '100',
                supportingDocuments: []
              }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].supportingDocuments).toBeUndefined();
    });

    it('should return undefined when supportingDocuments is not an array', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { 
                id: 'catch-1', 
                certificateNumber: 'CC-001', 
                certificateType: 'uk', 
                product: 'COD', 
                productWeight: '100', 
                weightOnCC: '100',
                supportingDocuments: undefined
              }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].supportingDocuments).toBeUndefined();
    });
  });

  describe('helper function edge cases', () => {
    it('should default status to COMPLETE when status is undefined', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: undefined,
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { id: 'catch-1', certificateNumber: 'CC-001', certificateType: 'uk', product: 'COD', productWeight: '100', weightOnCC: '100' }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('COMPLETE');
    });

    it('should default DA to England when exporterDetails is missing', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            catches: [
              { id: 'catch-1', certificateNumber: 'CC-001', certificateType: 'uk', product: 'COD', productWeight: '100', weightOnCC: '100' }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].da).toBe('England');
    });

    it('should handle weightOnCC as 0 when undefined', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { id: 'catch-1', certificateNumber: 'CC-001', certificateType: 'uk', product: 'COD', productWeight: '100', weightOnCC: undefined }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].weightOnFCC).toBe(0);
    });

    it('should handle exportWeightAfterProcessing when undefined for processing statement', () => {
      const documents = [
        {
          documentNumber: 'PS-001',
          __t: 'processingStatement',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { 
                id: 'catch-1', 
                catchCertificateNumber: 'CC-001', 
                catchCertificateType: 'uk', 
                species: 'COD', 
                exportWeightBeforeProcessing: '100',
                totalWeightLanded: '100',
                exportWeightAfterProcessing: undefined
              }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].weightAfterProcessing).toBeUndefined();
    });

    it('should handle missing exporterCompanyName', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { id: 'catch-1', certificateNumber: 'CC-001', certificateType: 'uk', product: 'COD', productWeight: '100', weightOnCC: '100' }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].extended.exporterCompanyName).toBeUndefined();
    });

    it('should map exporterCompanyName when present', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA', exporterCompanyName: 'Test Company Ltd' },
            catches: [
              { id: 'catch-1', certificateNumber: 'CC-001', certificateType: 'uk', product: 'COD', productWeight: '100', weightOnCC: '100' }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].extended.exporterCompanyName).toBe('Test Company Ltd');
    });

    it('should handle getValidData returning undefined for falsy triggeredBy', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          audit: [
            { eventType: 'VOIDED', triggeredBy: '', timestamp: new Date() }
          ],
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { id: 'catch-1', certificateNumber: 'CC-001', certificateType: 'uk', product: 'COD', productWeight: '100', weightOnCC: '100' }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].extended.voidedBy).toBeUndefined();
    });
  });

  describe('processing statement with exportWeightAfterProcessing', () => {
    it('should parse exportWeightAfterProcessing correctly when provided', () => {
      const documents = [
        {
          documentNumber: 'PS-001',
          __t: 'processingStatement',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { 
                id: 'catch-1', 
                catchCertificateNumber: 'CC-001', 
                catchCertificateType: 'uk', 
                species: 'COD', 
                exportWeightBeforeProcessing: '100',
                totalWeightLanded: '100',
                exportWeightAfterProcessing: '80'
              }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].weightAfterProcessing).toBe(80);
    });
  });

  describe('edge cases', () => {
    it('should handle empty documents array', () => {
      const documents: any[] = [];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(0);
    });

    it('should handle documents with empty catches array', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: []
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(0);
    });

    it('should process multiple documents with different catches', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { 
                id: 'catch-1', 
                certificateNumber: 'CC-001', 
                certificateType: 'uk', 
                product: 'COD', 
                productWeight: '50', 
                weightOnCC: '100'
              }
            ]
          }
        },
        {
          documentNumber: 'SD-002',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-02T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { 
                id: 'catch-2', 
                certificateNumber: 'CC-001', 
                certificateType: 'uk', 
                product: 'COD', 
                productWeight: '30', 
                weightOnCC: '100'
              }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(2);
      expect(results[0].documentNumber).toBe('SD-001');
      expect(results[1].documentNumber).toBe('SD-002');
    });
  });

  describe('supportingDocuments optional chaining', () => {
    it('should handle supportingDocuments that is a non-empty array and join them', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { 
                id: 'catch-1', 
                certificateNumber: 'CC-001', 
                certificateType: 'uk', 
                product: 'COD', 
                productWeight: '100', 
                weightOnCC: '100',
                supportingDocuments: ['SD-REF-001', 'SD-REF-002']
              }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].supportingDocuments).toBe('SD-REF-001,SD-REF-002');
    });

    it('should handle supportingDocuments with single item', () => {
      const documents = [
        {
          documentNumber: 'SD-001',
          __t: 'storageDocument',
          status: 'COMPLETE',
          createdAt: '2021-01-01T00:00:00Z',
          exportData: {
            exporterDetails: { postcode: 'NE1 1AA' },
            catches: [
              { 
                id: 'catch-1', 
                certificateNumber: 'CC-001', 
                certificateType: 'uk', 
                product: 'COD', 
                productWeight: '100', 
                weightOnCC: '100',
                supportingDocuments: ['SINGLE-DOC']
              }
            ]
          }
        }
      ];

      const results = Array.from(SUT.sdpsQuery(documents, mockPostCodeToDa));

      expect(results).toHaveLength(1);
      expect(results[0].supportingDocuments).toBe('SINGLE-DOC');
    });
  });
});

