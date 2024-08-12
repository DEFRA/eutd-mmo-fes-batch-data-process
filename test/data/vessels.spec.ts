import * as DataCache from '../../src/data/cache';
import * as SUT from '../../src/data/vessel'
import { ILanding, LandingSources } from 'mmo-shared-reference-data';
import * as shared from 'mmo-shared-reference-data';
import logger from '../../src/logger';

const sinon = require('sinon');

const dataMock = sinon.stub(DataCache, 'getVesselsData')
const idxMock = sinon.stub(DataCache, 'getVesselsIdx')
const loggerMock = sinon.stub(logger, 'error');

describe('vesselService', () => {

  describe('getPlnsForLandings', () => {

    const vesselData = [
      {
        "rssNumber": "RSS1",
        "registrationNumber": "PLN1",
        "fishingLicenceValidFrom": "2020-01-01T00:00:00",
        "fishingLicenceValidTo": "2020-02-01T00:00:00"
      },
      {
        "rssNumber": "RSS2",
        "registrationNumber": "PLN2",
        "fishingLicenceValidFrom": "2020-01-01T00:00:00",
        "fishingLicenceValidTo": "2020-02-01T00:00:00"
      }
    ];

    let mockGetVesselData;

    beforeEach(() => {
      mockGetVesselData = jest.spyOn(DataCache, 'getVesselsData');
      mockGetVesselData.mockReturnValue(vesselData);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('will match vessel data by rssNumber', () => {
      const input: ILanding[] = [
        {
          rssNumber: 'RSS1',
          dateTimeLanded: '2020-01-01',
          source: LandingSources.CatchRecording,
          items: []
        },
        {
          rssNumber: 'RSS2',
          dateTimeLanded: '2020-01-02',
          source: LandingSources.CatchRecording,
          items: []
        }
      ];

      const output = SUT.getPlnsForLandings(input);

      expect(output).toEqual([
        {rssNumber: input[0].rssNumber, dateLanded: input[0].dateTimeLanded, pln: 'PLN1'},
        {rssNumber: input[1].rssNumber, dateLanded: input[1].dateTimeLanded, pln: 'PLN2'}
      ]);
    });

    it('will match vessel data by rssNumber and dateTimeLanded', () => {
      const input: ILanding[] = [
        {
          rssNumber: 'RSS1',
          dateTimeLanded: '2020-01-01',
          source: LandingSources.CatchRecording,
          items: []
        },
        {
          rssNumber: 'RSS2',
          dateTimeLanded: '2000-01-01',
          source: LandingSources.CatchRecording,
          items: []
        }
      ];

      const output = SUT.getPlnsForLandings(input);

      expect(output).toEqual([
        {rssNumber: input[0].rssNumber, dateLanded: input[0].dateTimeLanded, pln: 'PLN1'}
      ]);
    });

    it('will return an empty array when no matches are found', () => {
      const input: ILanding[] = [
        {
          rssNumber: 'RSS3',
          dateTimeLanded: '2020-01-01',
          source: LandingSources.CatchRecording,
          items: []
        }
      ];

      const output = SUT.getPlnsForLandings(input);

      expect(output).toEqual([]);
    });

  });

  describe('getVesselLength', () => {

    let mockGetRss;
    let mockGetVessel;

    beforeEach(() => {
      mockGetRss = jest.spyOn(SUT, 'getRssNumber');
      mockGetVessel = jest.spyOn(SUT, 'getVesselDetails');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    })

    it('will return undefined if the rss number is not found', () => {
      mockGetRss.mockReturnValue(undefined);

      expect(SUT.getVesselLength('pln', 'date')).toBeUndefined();
    });

    it('will return undefined if the vessel could not be found', () => {
      mockGetRss.mockReturnValue('rss');
      mockGetVessel.mockReturnValue(undefined);

      expect(SUT.getVesselLength('pln', 'date')).toBeUndefined();
    });

    it('will return undefined if the vessel length is not known', () => {
      mockGetRss.mockReturnValue('rss');
      mockGetVessel.mockReturnValue({test: 'test'});

      expect(SUT.getVesselLength('pln', 'date')).toBeUndefined();
    });

    it('will return the vessel length if it is known', () => {
      mockGetRss.mockReturnValue('rss');
      mockGetVessel.mockReturnValue({vesselLength: 22});

      expect(SUT.getVesselLength('pln', 'date')).toBe(22);
    });

  });

  describe("When retrieving vessel details for landings refresh", () => {

    it('search by rssNumber', () => {
      dataMock.returns(
        [{
          vesselLength: 10.73,
          rssNumber: "rssNumber",
          cfr: "GBRrssNumber"
        }]);
  
      const expectedOutput = { vesselLength: 10.73, cfr: "GBRrssNumber" }
      const output = SUT.getVesselDetails("rssNumber");
  
      expect(output).toEqual(expectedOutput);
    });
  
    it('should only return the first occurrence', () => {
      dataMock.returns(
        [{
          vesselLength: 30.01,
          rssNumber: "rssNumber",
          cfr: "GBRrssNumber"
        },
        {
          vesselLength: null,
          rssNumber: "rssNumber",
          cfr: "GBRrssNumber"
        }]);
  
      const expectedOutput = { vesselLength: 30.01, cfr: "GBRrssNumber" }
      const output = SUT.getVesselDetails("rssNumber");
  
      expect(output).toEqual(expectedOutput);
    });
  
    it('should return undefined if vessel does not exist', () => {
      dataMock.returns(
        [{
          rssNumber: "rssNumber",
          cfr: "GBRrssNumber"
        }]);
  
      const output = SUT.getVesselDetails("test");
  
      expect(output).toEqual(undefined);
    });
  
    it('should do an exact search on rssNumber and not pick up another rssNumber that happens to start with the rssNumber we are searching for', () => {
      dataMock.returns([
        {
          vesselLength: 7.03,
          rssNumber: "BM132",
          cfr: "GBRBM132"
        },
        {
          vesselLength: 10.01,
          rssNumber: "BM1",
          cfr: "GBRBM1"
        }
      ]);
  
      const expectedOutput = { vesselLength: 10.01, cfr: "GBRBM1" }
      const output = SUT.getVesselDetails("BM1");
  
      expect(output).toEqual(expectedOutput)
    });
  });
  

describe("When retrieving rssNumber", () => {

  const vessels = [
    {
      registrationNumber: "OB956",
      fishingLicenceValidTo: "2017-12-20T00:00:00",
      fishingLicenceValidFrom: "2012-05-02T00:00:00",
      rssNumber: "rssNumber"
    },
    {
      registrationNumber: "OB956",
      fishingLicenceValidTo: "2017-12-20T00:00:00",
      fishingLicenceValidFrom: "2012-05-02T00:00:00",
      rssNumber: "rssNumber2"
    }];

  const vesselsIdx = shared.generateIndex(vessels)

  beforeEach(() => {
    dataMock.returns(vessels)
    idxMock.returns(vesselsIdx)
  });

  afterEach(() => {
    dataMock.reset();
    idxMock.reset();
    loggerMock.reset();
  });

  it('will return undefined if date is wrong', () => {

    const output = SUT.getRssNumber("OB956", "tarara");

    expect(output).toEqual(undefined);
  })

  it('search by registrationNumber and date', () => {

    const output = SUT.getRssNumber("OB956", "2012-12-29");

    expect(output).toEqual("rssNumber");
  });

  it('should respect lower date boundaries', () => {

    const output = SUT.getRssNumber("OB956", "2012-05-02");

    expect(output).toEqual("rssNumber");
  });

  it('should respect upper date boundaries', () => {

    const output = SUT.getRssNumber("OB956", "2017-12-");

    expect(output).toEqual("rssNumber");
  });

  it('should only return the first occurrence', () => {

    const output = SUT.getRssNumber("OB956", "2012-08-02");

    expect(output).toEqual("rssNumber");
  });

  it('should return undefined if vessel does not exist', () => {
    const output = SUT.getRssNumber("OB956", "2020-12-02");

    expect(output).toEqual(undefined);
    expect(loggerMock.getCall(0).args[0]).toBe('[VESSEL-SERVICE][RSS-NUMBER][NOT-FOUND]OB956:2020-12-02')
  });

  it('should do an exact search on pln and not pick up another pln that happens to start with the pln we are searching for', () => {

    const vessels = [
      {
        registrationNumber: "BM132",
        fishingLicenceValidTo: "2017-12-20T00:00:00",
        fishingLicenceValidFrom: "2012-05-02T00:00:00",
        rssNumber: "BAD"
      },
      {
        registrationNumber: "BM1",
        fishingLicenceValidTo: "2017-12-20T00:00:00",
        fishingLicenceValidFrom: "2012-05-02T00:00:00",
        rssNumber: "GOOD"
      }];

    const vesselsIdx = shared.generateIndex(vessels)

    dataMock.returns(vessels)
    idxMock.returns(vesselsIdx)

    const output = SUT.getRssNumber("BM1", "2015-12-02");

    expect(output).toBe('GOOD')

  })

});
});