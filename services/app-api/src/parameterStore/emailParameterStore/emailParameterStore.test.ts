import {
    getStateAnalystsEmails,
    getSourceEmail,
    getOACTEmails,
    getCmsReviewHelpEmail,
    getCmsRateHelpEmail,
    getDevReviewTeamEmails,
    getHelpDeskEmail,
} from './'
import { ParameterStore } from '../awsParameterStore'

describe('emailParameterStore', () => {
    afterEach(() => {
        jest.resetAllMocks()
    })
    afterAll(() => {
        jest.clearAllMocks()
    })
    describe('getSourceEmail', () => {
        it('returns source email as string', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
            spy.mockResolvedValue({
                value: '"CMS Source Email" <local@example.com>',
                type: 'String',
            })
            const result = await getSourceEmail()
            expect(result).toBe('"CMS Source Email" <local@example.com>')
        })
        it('returns error when fetching store value fails', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
            spy.mockResolvedValue(new Error('No store found'))
            const result = await getSourceEmail()
            expect(result).toBeInstanceOf(Error)
        })
        it('returns error when Type of parameter store value is incompatible', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
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
    describe('getDevReviewTeamEmails', () => {
        it('returns review shared emails email as array of strings', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
            spy.mockResolvedValue({
                value: `"CMS Reviewer 1" <CMS.reviewer.1@example.com>,"CMS Reviewer 2" <CMS.reviewer.2@example.com>,"CMS Reviewer 3" <CMS.reviewer.3@example.com>`,
                type: 'StringList',
            })
            const result = await getDevReviewTeamEmails()
            expect(result).toStrictEqual([
                `"CMS Reviewer 1" <CMS.reviewer.1@example.com>`,
                `"CMS Reviewer 2" <CMS.reviewer.2@example.com>`,
                `"CMS Reviewer 3" <CMS.reviewer.3@example.com>`,
            ])
        })
        it('returns error when fetching store value fails', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
            spy.mockResolvedValue(new Error('No store found'))
            const result = await getDevReviewTeamEmails()
            expect(result).toBeInstanceOf(Error)
        })
        it('returns error when Type of parameter store value is incompatible', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
            spy.mockResolvedValue({
                value: '"CMS Source Email" <local@example.com>',
                type: 'String',
            })
            const result = await getDevReviewTeamEmails()
            expect(result).toEqual(
                new Error(
                    'Parameter store /configuration/email/reviewTeamAddresses value of Type String is not supported'
                )
            )
        })
    })
    describe('getStateAnalystEmails', () => {
        it('returns state analysts emails as array of strings', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
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
            const spy = jest.spyOn(ParameterStore, 'getParameter')
            spy.mockResolvedValue(new Error('No store found'))
            const result = await getStateAnalystsEmails('FL')
            expect(result).toBeInstanceOf(Error)
        })
        it('returns error when Type of parameter store value is incompatible', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
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

    describe('getCmsReviewHelpEmail', () => {
        it('returns review help email as string', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
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
            const spy = jest.spyOn(ParameterStore, 'getParameter')
            spy.mockResolvedValue(new Error('No store found'))
            const result = await getCmsReviewHelpEmail()
            expect(result).toBeInstanceOf(Error)
        })
        it('returns error when Type of parameter store value is incompatible', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
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
        it('returns rate help email as string', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
            spy.mockResolvedValue({
                value: `"Rate Related Help" <rate.help@example.com>`,
                type: 'String',
            })
            const result = await getCmsRateHelpEmail()
            expect(result).toBe(`"Rate Related Help" <rate.help@example.com>`)
        })
        it('returns error when fetching store value fails', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
            spy.mockResolvedValue(new Error('No store found'))
            const result = await getCmsRateHelpEmail()
            expect(result).toBeInstanceOf(Error)
        })
        it('returns error when Type of parameter store value is incompatible', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
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

    describe('getHelpDeskEmail', () => {
        it('returns help desk email as string', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
            spy.mockResolvedValue({
                value: `"MC-Review Help Desk" <MC_Review_HelpDesk@example.com>`,
                type: 'String',
            })
            const result = await getHelpDeskEmail()
            expect(result).toBe(
                `"MC-Review Help Desk" <MC_Review_HelpDesk@example.com>`
            )
        })
        it('returns error when fetching store value fails', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
            spy.mockResolvedValue(new Error('No store found'))
            const result = await getHelpDeskEmail()
            expect(result).toBeInstanceOf(Error)
        })
        it('returns error when Type of parameter store value is incompatible', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
            spy.mockResolvedValue({
                value: '"CMS Source Email" <local@example.com>',
                type: 'StringList',
            })
            const result = await getHelpDeskEmail()
            expect(result).toEqual(
                new Error(
                    'Parameter store /configuration/email/helpDeskAddress value of Type StringList is not supported'
                )
            )
        })
    })

    describe('getOACTEmails', () => {
        it('returns oact emails as array of string', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
            spy.mockResolvedValue({
                value: '"Rate Submission Reviewer 1" <rate.reviewer.1@example.com>,"Rate Submission Reviewer 2" <rate.reviewer.2@example.com>,"Rate Submission Reviewer 3" <rate.reviewer.3@example.com>',
                type: 'StringList',
            })
            const result = await getOACTEmails()
            expect(result).toStrictEqual([
                `"Rate Submission Reviewer 1" <rate.reviewer.1@example.com>`,
                `"Rate Submission Reviewer 2" <rate.reviewer.2@example.com>`,
                `"Rate Submission Reviewer 3" <rate.reviewer.3@example.com>`,
            ])
        })
        it('returns error when fetching store value fails', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
            spy.mockResolvedValue(new Error('No store found'))
            const result = await getOACTEmails()
            expect(result).toBeInstanceOf(Error)
        })
        it('returns error when Type of parameter store value is incompatible', async () => {
            const spy = jest.spyOn(ParameterStore, 'getParameter')
            spy.mockResolvedValue({
                value: '"CMS Source Email" <local@example.com>',
                type: 'String',
            })
            const result = await getOACTEmails()
            expect(result).toEqual(
                new Error(
                    'Parameter store /configuration/email/oact value of Type String is not supported'
                )
            )
        })
    })
})
