import { validateAndReturnValueArray } from './helpers'

describe('parameter store helpers', () => {
    const parameterStoreValueTestCases = [
        {
            testValue: { value: 'DMCOtest@example.com', type: 'StringList' },
            testName: 'dmcoEmailAddresses',
            expectedResult: ['DMCOtest@example.com'],
        },
        {
            testValue: { value: 'DMCOtest@example.com', type: 'String' },
            testName: 'notStringList',
            expectedResult: new Error(''),
        },
        {
            testValue: { value: 'DMCOtest@example.com, ', type: 'StringList' },
            testName: 'dmcoEmailAddressesExtraSpace',
            expectedResult: ['DMCOtest@example.com'],
        },
        {
            testValue: { value: ' ', type: 'StringList' },
            testName: 'emptySpace',
            expectedResult: [],
        },
        {
            testValue: { value: '', type: 'StringList' },
            testName: 'empty',
            expectedResult: [],
        },
    ]

    test.each(parameterStoreValueTestCases)(
        'Return array for parameter store: $testName',
        ({ testValue, testName, expectedResult }) => {
            expect(validateAndReturnValueArray(testValue, testName)).toEqual(
                expect.objectContaining(expectedResult)
            )
        }
    )
})
