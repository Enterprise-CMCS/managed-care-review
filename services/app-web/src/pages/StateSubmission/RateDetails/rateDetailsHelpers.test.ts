import { FormikRateForm } from "./"
import { convertGQLRateToRateForm, generateUpdatedRates, isRatePartiallyFilled } from "./rateDetailsHelpers"
import {RateFormData} from '../../../gen/gqlClient';

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

describe('isRatePartiallyFilled', () => {
    const testCases = [
        {
            testValue: {
                rateDocuments: [],
                supportingDocuments: [],
                rateProgramIDs: [],
                certifyingActuaryContacts: [],
                addtlActuaryContacts: []
            },
            testName: 'empty rate',
            expectedResult: false,
        },
        {
            testValue: {
                rateDocuments: [],
                supportingDocuments: [],
                rateProgramIDs: [],
                certifyingActuaryContacts: [
                    {
                        name: '',
                        titleRole: '',
                        email: '',
                        actuarialFirm: undefined,
                        actuarialFirmOther: '',
                    }
                ],
                addtlActuaryContacts: []
            } ,
            testName: 'there is a certifying actuary with empty values',
            expectedResult: false,
        },
        {
            testValue: {
                rateDocuments: [],
                supportingDocuments: [],
                rateProgramIDs: [],
                certifyingActuaryContacts: [
                    {
                        name: 'Bob'
                    }
                ],
                addtlActuaryContacts: []
            },
            testName: 'there is a certifying actuary',
            expectedResult: true,
        },
        {
            testValue: {
                rateDocuments: [],
                supportingDocuments: [],
                rateProgramIDs: [],
                certifyingActuaryContacts: [],
                addtlActuaryContacts: [
                    {
                        actuarialFirm: 'OTHER'
                    }
                ]
            },
            testName: 'there is an additional actuary',
            expectedResult: true,
        },
        {
            testValue: {
                rateDocuments: [],
                supportingDocuments: [],
                rateProgramIDs: [],
                certifyingActuaryContacts: [],
                addtlActuaryContacts: [],
                rateType: 'NEW'
            },
            testName: 'rate type is filled in',
            expectedResult: true,
        },
        {
            testValue: {
                rateDocuments: [],
                supportingDocuments: [],
                rateProgramIDs: ['test-program'],
                certifyingActuaryContacts: [],
                addtlActuaryContacts: [],
            },
            testName: 'rate programs is filled in',
            expectedResult: true,
        },
    ]

    test.each(testCases)(
        'Returns correct boolean: $testName',
        ({ testValue, expectedResult }) => {
            expect(isRatePartiallyFilled(testValue as unknown as RateFormData)).toEqual(expectedResult)
        }
    )
})
