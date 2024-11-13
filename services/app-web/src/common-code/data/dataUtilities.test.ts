import {removeNullAndUndefined, replaceNullsWithUndefineds } from './index'

describe('data object utilities', () => {
     describe("removeNullAndUndefined", () => {
        const testData = [
            {testData: {}, expectedResult: {}, testDescription: 'returns empty objects when expected' },
            {testData: {foo: 'foovalue',
                bar: undefined
            }, expectedResult: {foo: 'foovalue'}, testDescription: 'removes undefined' },
            {testData: {foo: 'foovalue',
                bar: null
            }, expectedResult: {foo: 'foovalue'}, testDescription: 'removes null' },
            {testData: {
                foo: 'foovalue',
                bar: {hex: 'hexvalue',
                    zoo: null,
                    car: undefined,
                    bird: 'birdvalue'
                }
            }, expectedResult: {foo: 'foovalue', bar: {
                hex: 'hexvalue',
                 bird: 'birdvalue'
            }}, testDescription: 'works for nested objects' },


        ]
        test.each(testData)(
            '$testDescription',
            ({ testData, expectedResult, testDescription }) => {
                expect(
                    removeNullAndUndefined(
                        testData
                    )
                ).toEqual(expectedResult)
            }
        )
    })

    describe("replaceNullsWithUndefineds", () => {
        const testDate = new Date('01/01/1991') // test Dates because they are objects but not the kind we want to alter
        const testData = [
            {testData: {}, expectedResult: {}, testDescription: 'returns empty objects when expected' },
            {testData: {foo: 'foovalue',
                bar: undefined
            }, expectedResult: {foo: 'foovalue', bar: undefined}, testDescription: 'keeps undefined in place' },
            {testData: {foo: 'foovalue',
                bar: null
            }, expectedResult: {foo: 'foovalue'}, testDescription: 'replaces nulls' },
            {testData: {
                foo: 'foovalue',
                bar: {hex: 'hexvalue',
                    zoo: null,
                    car: undefined,
                    bird: 'birdvalue',
                    date: testDate,
                    number: 0
                }
            }, expectedResult: {foo: 'foovalue', bar: {
                hex: 'hexvalue',
                 bird: 'birdvalue',
                 car: undefined,
                 zoo: undefined,
                 date: testDate,
                 number: 0

            }}, testDescription: 'works for nested objects' },


        ]
        test.each(testData)(
            '$testDescription',
            ({ testData, expectedResult, testDescription }) => {
                expect(
                    replaceNullsWithUndefineds(
                        testData
                    )
                ).toEqual(expectedResult)
            }
        )
    })

})
