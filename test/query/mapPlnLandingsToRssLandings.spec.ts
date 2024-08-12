import * as SUT from '../../src/query/plnToRss';
import * as cache from '../../src/data/cache';
import {
  generateIndex
} from 'mmo-shared-reference-data'

const getVesselIdxStub = jest.spyOn(cache, 'getVesselsIdx')
const vesselData = [
  {
    registrationNumber:"WA1",
    fishingLicenceValidTo:"2100-12-20T00:00:00",
    fishingLicenceValidFrom:"2000-12-29T00:00:00",
    rssNumber: "rssWA1",
    licenceHolderName: "Mr Doe"
  },
  {
    registrationNumber:"WA2",
    fishingLicenceValidTo:"2100-12-20T00:00:00",
    fishingLicenceValidFrom:"2000-12-29T00:00:00",
    rssNumber: "rssWA2",
    licenceHolderName: "Mr Smith"
  },
  {
    registrationNumber:"WA3",
    fishingLicenceValidTo:"2100-12-20T00:00:00",
    fishingLicenceValidFrom:"2000-12-29T00:00:00",
    rssNumber: "rssWA3",
    licenceHolderName: "Mr Bob"
  },
  {
    registrationNumber:"WA4",
    fishingLicenceValidTo:"2100-12-20T00:00:00",
    fishingLicenceValidFrom:"2000-12-29T00:00:00",
    rssNumber: "rssWA4",
    licenceHolderName: "Mr Doe"
  },
  {
    registrationNumber:"WA5",
    fishingLicenceValidTo:"2100-12-20T00:00:00",
    fishingLicenceValidFrom:"2000-12-29T00:00:00",
    rssNumber: "rssWA5"
  }
];

const vesselIdx = generateIndex(vesselData);

describe('mapPlnLandingsToRssLandings', () => {

    it('will collate all landings in a single list', () => {

      const catchCertificates = [
        { pln : "WA1", dateLanded : "2015-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { pln : "WA1", dateLanded : "2014-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { pln : "WA2", dateLanded : "2019-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { pln : "WA3", dateLanded : "2018-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { pln : "WA4", dateLanded : "2017-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true }
      ];

      const expectedResult = [
        { rssNumber : "rssWA1", dateLanded : "2015-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { rssNumber : "rssWA1", dateLanded : "2014-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { rssNumber : "rssWA2", dateLanded : "2019-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { rssNumber : "rssWA3", dateLanded : "2018-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { rssNumber : "rssWA4", dateLanded : "2017-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true }
      ];

      getVesselIdxStub.mockReturnValue(vesselIdx);

      const result = SUT.mapPlnLandingsToRssLandings(catchCertificates);

      expect(result).toEqual(expectedResult);

    });

    it('will remove all landings for which landing data is not expected', () => {

      const catchCertificates = [
        { pln : "WA1", dateLanded : "2015-10-06", createdAt: "2020-09-26T08:26:06.939Z", dataEverExpected: false },
        { pln : "WA1", dateLanded : "2014-10-06", createdAt: "2020-09-26T08:26:06.939Z", dataEverExpected: false, isLegallyDue: true },
        { pln : "WA2", dateLanded : "2019-10-06", createdAt: "2020-09-26T08:26:06.939Z", dataEverExpected: true, landingDataExpectedDate: "3020-09-27", landingDataEndDate: "3020-09-28", isLegallyDue: true },
        { pln : "WA3", dateLanded : "2018-10-06", createdAt: "2020-09-26T08:26:06.939Z", dataEverExpected: true, landingDataExpectedDate: "2020-09-27", landingDataEndDate: "2020-09-28" },
        { pln : "WA4", dateLanded : "2017-10-06", createdAt: "2020-09-26T08:26:06.939Z" }
      ];

      const expectedResult = [
        { rssNumber : "rssWA2", dateLanded : "2019-10-06", createdAt: "2020-09-26T08:26:06.939Z", dataEverExpected: true, isLegallyDue: true, landingDataExpectedDate: "3020-09-27", landingDataEndDate: "3020-09-28" },
        { rssNumber : "rssWA3", dateLanded : "2018-10-06", createdAt: "2020-09-26T08:26:06.939Z", dataEverExpected: true, landingDataExpectedDate: "2020-09-27", landingDataEndDate: "2020-09-28" },
        { rssNumber : "rssWA4", dateLanded : "2017-10-06", createdAt: "2020-09-26T08:26:06.939Z" }
      ];

      getVesselIdxStub.mockReturnValue(vesselIdx);

      const result = SUT.mapPlnLandingsToRssLandings(catchCertificates);

      expect(result).toEqual(expectedResult);

    });
  });