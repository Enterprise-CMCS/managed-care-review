import { getStateAnalystsEmails } from './getStateAnalystsEmails'
import * as ParameterStore from './parameterStore'

describe('getStateAnalystEmails', () => {
    it('returns state analysts emails in an array', async () => {
        const spy = jest.spyOn(ParameterStore, 'getParameterStore')
        spy.mockResolvedValue(
            '"FL Anlyst 1" <testFLStateAnalyst1@email.com>, "FL Anlyst 2" <testFLStateAnalyst2@email.com>'
        )
        const result = await getStateAnalystsEmails('FL')
        expect(result).toStrictEqual([
            '"FL Anlyst 1" <testFLStateAnalyst1@email.com>',
            '"FL Anlyst 2" <testFLStateAnalyst2@email.com>',
        ])
    })
    it('returns empty array on error fetching store value', async () => {
        const spy = jest.spyOn(ParameterStore, 'getParameterStore')
        spy.mockResolvedValue(new Error('No store found'))
        const result = await getStateAnalystsEmails('FL')
        expect(result).toBeInstanceOf(Error)
    })
})
