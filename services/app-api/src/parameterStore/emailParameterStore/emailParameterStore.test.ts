import {
    getStateAnalystsEmails,
    getSourceEmail,
    getRatesReviewSharedEmails,
    getCmsReviewHelpEmail,
    getCmsRateHelpEmail,
    getCmsDevTeamHelpEmail,
    getCmsReviewSharedEmails,
} from './'
import * as ParameterStore from '../awsParameterStore'

describe('emailParameterStore', () => {
    afterEach(() => {
        jest.resetAllMocks()
    })
    afterAll(() => {
        jest.clearAllMocks()
    })
    describe('getSourceEmail', () => {
        it('returns source email as string', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue({
                value: '"CMS Source Email" <local@example.com>',
                type: 'String',
            })
            const result = await getSourceEmail()
            expect(result).toBe('"CMS Source Email" <local@example.com>')
        })
        it('returns error when fetching store value fails', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue(new Error('No store found'))
            const result = await getSourceEmail()
            expect(result).toBeInstanceOf(Error)
        })
        it('returns error when Type of parameter store value is incompatible', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue({
                value: '"CMS Source Email" <local@example.com>',
                type: 'StringList',
            })
            const result = await getSourceEmail()
            expect(result).toEqual(
                new Error(
                    'Parameter store /configuration/email/sourceAddress value of Type StringList is not supported'
                )
            )
        })
    })
    describe('getCmsReviewSharedEmails', () => {
        it('returns source email as string', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue({
                value: `"CMS Reviewer 1" <CMS.reviewer.1@example.com>,"CMS Reviewer 2" <CMS.reviewer.2@example.com>,"CMS Reviewer 3" <CMS.reviewer.3@example.com>`,
                type: 'StringList',
            })
            const result = await getCmsReviewSharedEmails()
            expect(result).toStrictEqual([
                `"CMS Reviewer 1" <CMS.reviewer.1@example.com>`,
                `"CMS Reviewer 2" <CMS.reviewer.2@example.com>`,
                `"CMS Reviewer 3" <CMS.reviewer.3@example.com>`,
            ])
        })
        it('returns error when fetching store value fails', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue(new Error('No store found'))
            const result = await getCmsReviewSharedEmails()
            expect(result).toBeInstanceOf(Error)
        })
        it('returns error when Type of parameter store value is incompatible', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue({
                value: '"CMS Source Email" <local@example.com>',
                type: 'String',
            })
            const result = await getCmsReviewSharedEmails()
            expect(result).toEqual(
                new Error(
                    'Parameter store /configuration/email/reviewTeamAddresses value of Type String is not supported'
                )
            )
        })
    })
    describe('getStateAnalystEmails', () => {
        it('returns state analysts emails in an array', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue({
                value: '"FL Analyst 1" <testFLStateAnalyst1@email.com>, "FL Analyst 2" <testFLStateAnalyst2@email.com>',
                type: 'StringList',
            })
            const result = await getStateAnalystsEmails('FL')
            expect(result).toStrictEqual([
                '"FL Analyst 1" <testFLStateAnalyst1@email.com>',
                '"FL Analyst 2" <testFLStateAnalyst2@email.com>',
            ])
        })
        it('returns error when fetching store value fails', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue(new Error('No store found'))
            const result = await getStateAnalystsEmails('FL')
            expect(result).toBeInstanceOf(Error)
        })
        it('returns error when Type of parameter store value is incompatible', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue({
                value: '"FL Analyst 1" <testFLStateAnalyst1@email.com>, "FL Analyst 2" <testFLStateAnalyst2@email.com>',
                type: 'String',
            })
            const result = await getStateAnalystsEmails('FL')
            expect(result).toEqual(
                new Error(
                    'Parameter store /configuration/FL/stateanalysts/email value of Type String is not supported'
                )
            )
        })
    })
    describe('getRatesReviewSharedEmails', () => {
        it('returns source email as string', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue({
                value: '"Rate Submission Reviewer 1" <rate.reviewer.1@example.com>,"Rate Submission Reviewer 2" <rate.reviewer.2@example.com>,"Rate Submission Reviewer 3" <rate.reviewer.3@example.com>',
                type: 'StringList',
            })
            const result = await getRatesReviewSharedEmails()
            expect(result).toStrictEqual([
                `"Rate Submission Reviewer 1" <rate.reviewer.1@example.com>`,
                `"Rate Submission Reviewer 2" <rate.reviewer.2@example.com>`,
                `"Rate Submission Reviewer 3" <rate.reviewer.3@example.com>`,
            ])
        })
        it('returns error when fetching store value fails', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue(new Error('No store found'))
            const result = await getRatesReviewSharedEmails()
            expect(result).toBeInstanceOf(Error)
        })
        it('returns error when Type of parameter store value is incompatible', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue({
                value: '"CMS Source Email" <local@example.com>',
                type: 'String',
            })
            const result = await getRatesReviewSharedEmails()
            expect(result).toEqual(
                new Error(
                    'Parameter store /configuration/email/ratesAddresses value of Type String is not supported'
                )
            )
        })
    })
    describe('getCmsReviewHelpEmail', () => {
        it('returns source email as string', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue({
                value: `"Contract Related Help" <contract.help@example.com>`,
                type: 'String',
            })
            const result = await getCmsReviewHelpEmail()
            expect(result).toBe(
                `"Contract Related Help" <contract.help@example.com>`
            )
        })
        it('returns error when fetching store value fails', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue(new Error('No store found'))
            const result = await getCmsReviewHelpEmail()
            expect(result).toBeInstanceOf(Error)
        })
        it('returns error when Type of parameter store value is incompatible', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue({
                value: '"CMS Source Email" <local@example.com>',
                type: 'StringList',
            })
            const result = await getCmsReviewHelpEmail()
            expect(result).toEqual(
                new Error(
                    'Parameter store /configuration/email/reviewHelpAddress value of Type StringList is not supported'
                )
            )
        })
    })
    describe('getCmsRateHelpEmail', () => {
        it('returns source email as string', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue({
                value: `"Rate Related Help" <rate.help@example.com>`,
                type: 'String',
            })
            const result = await getCmsRateHelpEmail()
            expect(result).toBe(`"Rate Related Help" <rate.help@example.com>`)
        })
        it('returns error when fetching store value fails', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue(new Error('No store found'))
            const result = await getCmsRateHelpEmail()
            expect(result).toBeInstanceOf(Error)
        })
        it('returns error when Type of parameter store value is incompatible', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue({
                value: '"CMS Source Email" <local@example.com>',
                type: 'StringList',
            })
            const result = await getCmsRateHelpEmail()
            expect(result).toEqual(
                new Error(
                    'Parameter store /configuration/email/rateHelpAddress value of Type StringList is not supported'
                )
            )
        })
    })
    describe('getCmsDevTeamHelpEmail', () => {
        it('returns source email as string', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue({
                value: `"MC-Review Support" <mc-review@example.com>`,
                type: 'String',
            })
            const result = await getCmsDevTeamHelpEmail()
            expect(result).toBe(`"MC-Review Support" <mc-review@example.com>`)
        })
        it('returns error when fetching store value fails', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue(new Error('No store found'))
            const result = await getCmsDevTeamHelpEmail()
            expect(result).toBeInstanceOf(Error)
        })
        it('returns error when Type of parameter store value is incompatible', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameterStore')
            spy.mockResolvedValue({
                value: '"CMS Source Email" <local@example.com>',
                type: 'StringList',
            })
            const result = await getCmsDevTeamHelpEmail()
            expect(result).toEqual(
                new Error(
                    'Parameter store /configuration/email/devTeamHelpAddress value of Type StringList is not supported'
                )
            )
        })
    })
})
