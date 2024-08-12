import { getVesselsIdx, getSpeciesAliases } from '../../src/data/cache';
import * as sharedRefData from "mmo-shared-reference-data"
import * as Vessel from '../../src/data/vessel';
import * as CatchCertService from '../../src/persistence/catchCerts';
import * as LandingPersistance from '../../src/persistence/landing';
import * as SUT from '../../src/query/runCcQueryForLandings';
import * as plnToRss from '../../src/query/plnToRss'

describe('runCcQueryForLandings', () => {

  let mockGetPlns;
  let mockGetCatchCerts;
  let mockGetLandings;
  let mockMapPlnToRss;
  let mockGetLandingsMultiple;
  let mockCcQuery;

  beforeEach(() => {
    mockGetPlns = jest.spyOn(Vessel, 'getPlnsForLandings');
    mockGetCatchCerts = jest.spyOn(CatchCertService, 'getCatchCerts');
    mockGetLandings = jest.spyOn(sharedRefData, 'getLandingsFromCatchCertificate');
    mockMapPlnToRss = jest.spyOn(plnToRss, 'mapPlnLandingsToRssLandings');
    mockGetLandingsMultiple = jest.spyOn(LandingPersistance, 'getLandingsMultiple');
    mockCcQuery = jest.spyOn(sharedRefData, 'ccQuery');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will get plns for every landing', async () => {
    mockGetPlns.mockReturnValue([]);

    const landings: sharedRefData.ILanding[] = [
      {
        rssNumber: 'RSS1',
        dateTimeLanded: '2020-01-01',
        source: sharedRefData.LandingSources.CatchRecording,
        items: []
      }
    ];

    await SUT.runCcQueryForLandings(landings);

    expect(mockGetPlns).toHaveBeenCalledWith(landings);
    expect(mockGetCatchCerts).not.toHaveBeenCalled();
    expect(mockGetLandings).not.toHaveBeenCalled();
    expect(mockMapPlnToRss).not.toHaveBeenCalled();
    expect(mockGetLandingsMultiple).not.toHaveBeenCalled();
    expect(mockCcQuery).not.toHaveBeenCalled();
  });

  it('will get catch certs for every matched landing', async () => {
    const getPlnsResponse = [{rssNumber: 'RSS1', dateLanded: '2020-01-01', pln: 'PLN1'}];

    mockGetPlns.mockReturnValue(getPlnsResponse);
    mockGetCatchCerts.mockResolvedValue([]);

    const landings: sharedRefData.ILanding[] = [
      {
        rssNumber: 'RSS1',
        dateTimeLanded: '2020-01-01',
        source: sharedRefData.LandingSources.CatchRecording,
        items: []
      }
    ];

    await SUT.runCcQueryForLandings(landings);

    expect(mockGetPlns).toHaveBeenCalledWith(landings);
    expect(mockGetCatchCerts).toHaveBeenCalledWith({landings: getPlnsResponse});
    expect(mockGetLandings).not.toHaveBeenCalled();
    expect(mockMapPlnToRss).not.toHaveBeenCalled();
    expect(mockGetLandingsMultiple).not.toHaveBeenCalled();
    expect(mockCcQuery).not.toHaveBeenCalled();
  });

  it('will get catch certs for with no landing', async () => {
    const getPlnsResponse = [{rssNumber: 'RSS1', dateLanded: '2020-01-01', pln: 'PLN1'}];

    mockGetPlns.mockReturnValue(getPlnsResponse);
    mockGetCatchCerts.mockResolvedValue([{ landings: getPlnsResponse }]);
    mockGetLandings.mockReturnValue(undefined);

    const landings: sharedRefData.ILanding[] = [
      {
        rssNumber: 'RSS1',
        dateTimeLanded: '2020-01-01',
        source: sharedRefData.LandingSources.CatchRecording,
        items: []
      }
    ];

    await SUT.runCcQueryForLandings(landings);

    expect(mockGetPlns).toHaveBeenCalledWith(landings);
    expect(mockGetCatchCerts).toHaveBeenCalledWith({landings: getPlnsResponse});
    expect(mockGetLandings).toHaveBeenCalled();
    expect(mockMapPlnToRss).not.toHaveBeenCalled();
    expect(mockGetLandingsMultiple).not.toHaveBeenCalled();
    expect(mockCcQuery).not.toHaveBeenCalled();
  });

  it('will get catch certs even within undefined for every matched landing', async () => {
    const getPlnsResponse = [{rssNumber: 'RSS1', dateLanded: '2020-01-01', pln: 'PLN1'}];

    mockGetPlns.mockReturnValue(getPlnsResponse);
    mockGetCatchCerts.mockResolvedValue(undefined);
    mockGetLandingsMultiple.mockReturnValue(undefined);

    const landings: sharedRefData.ILanding[] = [
      {
        rssNumber: 'RSS1',
        dateTimeLanded: '2020-01-01',
        source: sharedRefData.LandingSources.CatchRecording,
        items: []
      }
    ];

    await SUT.runCcQueryForLandings(landings);

    expect(mockGetPlns).toHaveBeenCalledWith(landings);
    expect(mockGetCatchCerts).toHaveBeenCalledWith({landings: getPlnsResponse});
    expect(mockGetLandings).not.toHaveBeenCalled();
    expect(mockMapPlnToRss).not.toHaveBeenCalled();
    expect(mockGetLandingsMultiple).not.toHaveBeenCalled();
    expect(mockCcQuery).not.toHaveBeenCalled();
  });

  it('will get all landings for every matched catch cert', async () => {
    const getPlnsResponse = [{rssNumber: 'RSS1', dateLanded: '2020-01-01', pln: 'PLN1'}];
    const getCatchCertResponse = [{documentNumber: 'X'}];

    mockGetPlns.mockReturnValue(getPlnsResponse);
    mockGetCatchCerts.mockResolvedValue(getCatchCertResponse);
    mockGetLandings.mockReturnValue([]);

    const landings: sharedRefData.ILanding[] = [
      {
        rssNumber: 'RSS1',
        dateTimeLanded: '2020-01-01',
        source: sharedRefData.LandingSources.CatchRecording,
        items: []
      }
    ];

    await SUT.runCcQueryForLandings(landings);

    expect(mockGetPlns).toHaveBeenCalledWith(landings);
    expect(mockGetCatchCerts).toHaveBeenCalledWith({landings: getPlnsResponse});
    expect(mockGetLandings).toHaveBeenCalledWith(getCatchCertResponse[0], true);
    expect(mockMapPlnToRss).not.toHaveBeenCalled();
    expect(mockGetLandingsMultiple).not.toHaveBeenCalled();
    expect(mockCcQuery).not.toHaveBeenCalled();
  });

  it('will flatten all landings for every matched catch cert', async () => {
    const getPlnsResponse = [{rssNumber: 'RSS1', dateLanded: '2020-01-01', pln: 'PLN1'}];
    const getCatchCertResponse = [{documentNumber: 'X'}, {documentNumber: 'Y'}];

    mockGetPlns.mockReturnValue(getPlnsResponse);
    mockGetCatchCerts.mockResolvedValue(getCatchCertResponse);
    mockGetLandings.mockImplementation(cert => ([
      {cert: cert.documentNumber, landing: 'X'},
      {cert: cert.documentNumber, landing: 'Y'},
    ]));
    mockMapPlnToRss.mockReturnValue(null);
    mockGetLandingsMultiple.mockResolvedValue(null);

    const landings: sharedRefData.ILanding[] = [
      {
        rssNumber: 'RSS1',
        dateTimeLanded: '2020-01-01',
        source: sharedRefData.LandingSources.CatchRecording,
        items: []
      }
    ];

    await SUT.runCcQueryForLandings(landings);

    expect(mockGetPlns).toHaveBeenCalledWith(landings);
    expect(mockGetCatchCerts).toHaveBeenCalledWith({landings: getPlnsResponse});
    expect(mockGetLandings).toHaveBeenCalledTimes(2);
    expect(mockGetLandings).toHaveBeenNthCalledWith(1, getCatchCertResponse[0], true);
    expect(mockGetLandings).toHaveBeenNthCalledWith(2, getCatchCertResponse[1], true);
    expect(mockMapPlnToRss).toHaveBeenCalledWith([
      {"cert": "X", "landing": "X"},
      {"cert": "X", "landing": "Y"},
      {"cert": "Y", "landing": "X"},
      {"cert": "Y", "landing": "Y"}
    ]);
    expect(mockGetLandingsMultiple).toHaveBeenCalledWith(null);
    expect(mockCcQuery).not.toHaveBeenCalled();
  });

  it('will get a list of sharedRefData.ILanding for every effected landing', async () => {
    const getPlnsResponse = [{rssNumber: 'RSS1', dateLanded: '2020-01-01', pln: 'PLN1'}];
    const getCatchCertResponse = [{documentNumber: 'X'}, {documentNumber: 'Y'}];
    const getLandingsResponse = [{cert: 'X', landing: 'Y'}];
    const mapPlnResponse = [{cert: 'X', landing: 'Y', rss: 'Z'}];

    mockGetPlns.mockReturnValue(getPlnsResponse);
    mockGetCatchCerts.mockResolvedValue(getCatchCertResponse);
    mockGetLandings.mockReturnValue(getLandingsResponse);
    mockMapPlnToRss.mockReturnValue(mapPlnResponse);
    mockGetLandingsMultiple.mockResolvedValue(null);

    const landings: sharedRefData.ILanding[] = [
      {
        rssNumber: 'RSS1',
        dateTimeLanded: '2020-01-01',
        source: sharedRefData.LandingSources.CatchRecording,
        items: []
      }
    ];

    await SUT.runCcQueryForLandings(landings);

    expect(mockGetPlns).toHaveBeenCalled()
    expect(mockGetCatchCerts).toHaveBeenCalled();
    expect(mockGetLandings).toHaveBeenCalled();
    expect(mockMapPlnToRss).toHaveBeenCalled();
    expect(mockGetLandingsMultiple).toHaveBeenCalledWith(mapPlnResponse);
    expect(mockCcQuery).not.toHaveBeenCalled();
  });

  it('will run ccQuery if we have a list of catches and landings', async () => {
    const getPlnsResponse = [{rssNumber: 'RSS1', dateLanded: '2020-01-01', pln: 'PLN1'}];
    const getCatchCertResponse = [{documentNumber: 'X'}, {documentNumber: 'Y'}];
    const getLandingsResponse = [{cert: 'X', landing: 'Y'}];
    const mapPlnResponse = [{cert: 'X', landing: 'Y', rss: 'Z'}];
    const getLandingsMultipleResponse = [{cert: 'X', landing: 'Y', rss: 'Z'}];
    const ccQueryResponse = null;

    mockGetPlns.mockReturnValue(getPlnsResponse);
    mockGetCatchCerts.mockResolvedValue(getCatchCertResponse);
    mockGetLandings.mockReturnValue(getLandingsResponse);
    mockMapPlnToRss.mockReturnValue(mapPlnResponse);
    mockGetLandingsMultiple.mockResolvedValue(getLandingsMultipleResponse);
    mockCcQuery.mockReturnValue(ccQueryResponse);

    const landings: sharedRefData.ILanding[] = [
      {
        rssNumber: 'RSS1',
        dateTimeLanded: '2020-01-01',
        source: sharedRefData.LandingSources.CatchRecording,
        items: []
      }
    ];

    const output = await SUT.runCcQueryForLandings(landings);

    expect(mockGetPlns).toHaveBeenCalled()
    expect(mockGetCatchCerts).toHaveBeenCalled();
    expect(mockGetLandings).toHaveBeenCalled();
    expect(mockMapPlnToRss).toHaveBeenCalled();
    expect(mockGetLandingsMultiple).toHaveBeenCalled();
    expect(mockCcQuery).toHaveBeenCalled();
    expect(mockCcQuery).toHaveBeenCalledWith(getCatchCertResponse, getLandingsMultipleResponse, getVesselsIdx(), expect.any(Object), getSpeciesAliases);

    expect(output).toEqual(ccQueryResponse);
  });

});