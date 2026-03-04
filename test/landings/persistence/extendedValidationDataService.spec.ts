const mongoose = require('mongoose');

import { MongoMemoryServer } from 'mongodb-memory-server';
import {RawLandingsModel, SalesNotesModel } from '../../../src/types/extendedValidationData'
import { IExtendedValidationData} from 'mmo-shared-reference-data';
import * as Service from '../../../src/persistence/extendedValidationDataService';


let mongoServer;
const opts = { connectTimeoutMS:60000, socketTimeoutMS:600000, serverSelectionTimeoutMS:60000 }

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, opts).catch(err => {console.log(err)});
  });

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await RawLandingsModel.deleteMany({});
    await SalesNotesModel.deleteMany({})
});


describe('Persisting raw landings', () => {

    it('validating the raw landings mongoose model is wired up', async () => {

        const model = new RawLandingsModel({
          rssNumber: 'rssNumber',
          dateLanded: '2019-01-01',
          data: [ { species: 'COD', weight: 2 } ]
        })
        await model.save()

        const result: any = await RawLandingsModel.findOne()

        expect(result.rssNumber).toBe('rssNumber')

    })

    it('can insert raw landings', async () => {

        const rawLandings: IExtendedValidationData = {
            rssNumber: '100',
            dateLanded: '2019-07-01',
            data: [ { species: 'COD', weight: 2 },
                    { species: 'ALB', weight: 20 } ]
        }

        await Service.updateExtendedValidationData(rawLandings, 'rawLandings')

        const results: any = await RawLandingsModel.find()

        expect(results[0].rssNumber).toBe('100')
    })

    it('can overwrite the currently persisted raw landings', async () => {

        const rawLanding: IExtendedValidationData = {
            rssNumber: '900',
            dateLanded: '2019-07-01',
            data: [ { species: 'COD', weight: 2 },
                    { species: 'ALB', weight: 20 } ]
        }

        await Service.updateExtendedValidationData(rawLanding, 'rawLandings')

        const results: any = await RawLandingsModel.find()

        expect(results[0].data[0].species).toBe('COD')

        const rawLandingsUpdate: IExtendedValidationData = {
            rssNumber: '900',
            dateLanded: '2019-07-01',
            data: [ { species: 'FISH', weight: 2 },
                    { species: 'BAR', weight: 20 } ]
        }

        await Service.updateExtendedValidationData(rawLandingsUpdate, 'rawLandings')

        const updatedResults: any = await RawLandingsModel.find()

        expect(updatedResults[0].data[0].species).toBe('FISH')

    });

    it('can insert mixed data types', async () => {

        const rawLanding: IExtendedValidationData = {
            rssNumber: '450',
            dateLanded: '2019-07-01',
            data: { cefas: ['fred the fish', 'sally the seagull'] }
        }

        await Service.updateExtendedValidationData(rawLanding, 'rawLandings')

        const results: any = await RawLandingsModel.find()

        expect(results[0].data.cefas).toEqual(['fred the fish', 'sally the seagull'])
    })

    it('can insert Cefas shaped data', async () => {

        const dateLanded = '2019-07-01'
        const rssNumber = '100'

        const cefasLandingResponse = [{
            cfr: "GBR000C18064",
            rssNumber: "C18064",
            vesselRegistrationNumber: "BM1",
            vesselName: "Emulate",
            fishingAuthority: "GBE",
            landings: [
              {
                logbookNumber: "A1165920190477",
                landingDateTime: "2018-02-02T06:50:45",
                landingPort: "GBBRX",
                landingAreas: [
                  {
                    faoArea: 27,
                    faoSubArea: "7",
                    landingAreaCatches : [
                      { species: "SCE", presentation: "WHL", state: "FRE", weight: 10 }
                    ]
                  }
                ]
              }
            ],
            dateTimeStamp: "2019-08-22T09:41:02.577"
          }];

        await Service.updateExtendedValidationData({rssNumber, dateLanded, data: cefasLandingResponse}, 'rawLandings')
        const results: any = await RawLandingsModel.find()
        expect(results[0].rssNumber).toBe('100')

    })

})

describe('Persisting sales notes', () => {

    it('validating the mongoose sales note model is wired up', async () => {

		const model = new SalesNotesModel({
            rssNumber: 'rssNumber',
            dateLanded: '2019-01-01',
            data: [ { species: 'COD', weight: 2 } ]
        })
        await model.save()

        const result: any = await SalesNotesModel.findOne()

        expect(result.rssNumber).toBe('rssNumber')

    })

    it('can insert sales notes', async () => {

        const salesNote: IExtendedValidationData = {
            rssNumber: '100',
            dateLanded: '2019-07-01',
            data: [ { species: 'COD', weight: 2 },
                    { species: 'ALB', weight: 20 } ]
        }

        await Service.updateExtendedValidationData(salesNote, 'salesNotes')

        const results: any = await SalesNotesModel.find()

        expect(results[0].rssNumber).toBe('100')
    })

    it('can overwrite the currently persisted sales notes', async () => {

        const salesNote: IExtendedValidationData = {
            rssNumber: '900',
            dateLanded: '2019-07-01',
            data: [ { species: 'COD', weight: 2 },
                    { species: 'ALB', weight: 20 } ]
        }

        await Service.updateExtendedValidationData(salesNote, 'salesNotes')

        const results: any = await SalesNotesModel.find()

        expect(results[0].data[0].species).toBe('COD')

        const salesNotesUpdate: IExtendedValidationData = {
            rssNumber: '900',
            dateLanded: '2019-07-01',
            data: [ { species: 'FISH', weight: 2 },
                    { species: 'BAR', weight: 20 } ]
        }

        await Service.updateExtendedValidationData(salesNotesUpdate, 'salesNotes')

        const updatedResults: any = await SalesNotesModel.find()

        expect(updatedResults[0].data[0].species).toBe('FISH')

    });

    it('can insert mixed data types', async () => {

        const salesNote: IExtendedValidationData = {
            rssNumber: '100',
            dateLanded: '2019-07-01',
            data: { something: 'random', object: { fish: 'fish' }, array: [1,2,3,4] }
        }

        await Service.updateExtendedValidationData(salesNote, 'salesNotes')

        const results: any = await SalesNotesModel.find()

        expect(results[0].data.object).toEqual({ fish: 'fish' })
    })

})

describe('Retrieving extended data', () => {
    it('will retrieve based on date', async () => {

        const rawLanding1: IExtendedValidationData = {
            rssNumber: 'Test',
            dateLanded: '2019-07-01',
            data: [ { species: 'COD', weight: 2 },
                    { species: 'ALB', weight: 20 } ]
        }

        const rawLanding2: IExtendedValidationData = {
            rssNumber: 'Test',
            dateLanded: '2018-08-01',
            data: [ { species: 'COD', weight: 2 } ]
        }

        await Service.updateExtendedValidationData(rawLanding1, 'rawLandings')
        await Service.updateExtendedValidationData(rawLanding2, 'rawLandings')

        const result = await Service.getExtendedValidationData('2019-07-01', 'Test', 'rawLandings')

        expect(result?.dateLanded).toBe('2019-07-01')
    })

    it('will retrieve based on rssNumber', async () => {

        const rawLanding1: IExtendedValidationData = {
            rssNumber: 'Test',
            dateLanded: '2019-07-01',
            data: [ { species: 'COD', weight: 2 },
                    { species: 'ALB', weight: 20 } ]
        }

        const rawLanding2: IExtendedValidationData = {
            rssNumber: '100',
            dateLanded: '2019-07-01',
            data: [ { species: 'COD', weight: 2 } ]
        }

        await Service.updateExtendedValidationData(rawLanding1, 'rawLandings')
        await Service.updateExtendedValidationData(rawLanding2, 'rawLandings')

        const result = await Service.getExtendedValidationData('2019-07-01', 'Test', 'rawLandings')

        expect(result?.rssNumber).toBe('Test')
    })

    it('will retrieve raw landings', async () => {

        const rawLanding: IExtendedValidationData = {
            rssNumber: 'Test',
            dateLanded: '2019-07-01',
            data: [ { species: 'Landing', weight: 2 } ]
        }

        const salesNote: IExtendedValidationData = {
            rssNumber: 'Test',
            dateLanded: '2019-07-01',
            data: [ { species: 'SalesNote', weight: 2 }]
        }

        await Service.updateExtendedValidationData(rawLanding, 'rawLandings')
        await Service.updateExtendedValidationData(salesNote, 'salesNotes')

        const result = await Service.getExtendedValidationData('2019-07-01', 'Test', 'rawLandings')

        expect(result?.data[0].species).toBe('Landing')
    })

    it('will retrieve sales notes', async () => {

        const rawLanding: IExtendedValidationData = {
            rssNumber: 'Test',
            dateLanded: '2019-07-01',
            data: [ { species: 'Landing', weight: 2 } ]
        }

        const salesNote: IExtendedValidationData = {
            rssNumber: 'Test',
            dateLanded: '2019-07-01',
            data: [ { species: 'SalesNote', weight: 2 }]
        }

        await Service.updateExtendedValidationData(rawLanding, 'rawLandings')
        await Service.updateExtendedValidationData(salesNote, 'salesNotes')

        const result = await Service.getExtendedValidationData('2019-07-01', 'Test', 'salesNotes')

        expect(result?.data[0].species).toBe('SalesNote')
    })
})
