import { FormikRateForm } from "./RateDetailsV2"
import { convertGQLRateToRateForm, generateUpdatedRates } from "./rateDetailsHelpers"

describe('generateUpdatedRates', () => {
    const emptyRateForm = () => convertGQLRateToRateForm(jest.fn())
    const testCases = [

        {
            testValue:  [{
                ...emptyRateForm(),
                status: 'DRAFT',
                ratePreviouslySubmitted: 'NO',
            }] as FormikRateForm[],
            testName: 'create brand new rate',
            expectedResult: {type:'CREATE', formData: emptyRateForm(), rateID: undefined}},
        {
            testValue:  [{
                ...emptyRateForm(),
                id: 'new-child-rate-being-edited',
                status: 'DRAFT',
                ratePreviouslySubmitted: 'NO',
            }]  as FormikRateForm[],
            testName: 'edit unsubmitted child rate',
            expectedResult: {type:'UPDATE', formData: emptyRateForm(), rateID: 'new-child-rate-being-edited',} ,
        } ,
        {
            testValue:  [{
                ...emptyRateForm(),
                id: 'existing-child-rate',
                status: 'UNLOCKED',
                ratePreviouslySubmitted: 'NO',
            }]  as FormikRateForm[],
            testName: 'edit unlocked child rate',
            expectedResult: {type:'UPDATE', formData: emptyRateForm(), rateID: 'existing-child-rate' } ,
        },
        {
            testValue: [{
                ...emptyRateForm(),
                id: 'existing-linked-rate1',
                status: 'SUBMITTED',
                ratePreviouslySubmitted: 'YES',
            }]  as FormikRateForm[],
            testName: 'link submitted rate',
            expectedResult: {type:'LINK', rateID:'existing-linked-rate1', formData: undefined } ,
        },
        {
            testValue: [{
                ...emptyRateForm(),
                id: 'existing-linked-rate2',
                status: 'RESUBMITTED',
                ratePreviouslySubmitted: 'YES',
            }]  as FormikRateForm[],
            testName: 'link resubmitted rate',
            expectedResult: {type:'LINK', rateID: 'existing-linked-rate2', formData: undefined} ,
        },
    ]

    test.each(testCases)(
        'Returns correct updatedRates: $testName',
        ({ testValue, expectedResult }) => {
            expect(generateUpdatedRates(testValue)[0]).toEqual(
              {
                rateID: expectedResult.rateID,
                type: expectedResult.type,
                // eslint-disable-next-line jest/no-conditional-expect
                formData: expectedResult.formData? expect.objectContaining({rateDocuments: expectedResult.formData.rateDocuments}): undefined
        })
        }
    )

})
