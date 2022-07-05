import { getStateAnalystEmails } from './getStateAnalystEmails'
import * as ParameterStore from './parameterStore'

describe('getStateAnalystEmails', () => {
    it('returns state analysts emails in an array', async () => {
        const spy = jest.spyOn(ParameterStore, 'getParameterStore')
        spy.mockResolvedValue(
            '"FL Anlyst 1" <testFLStateAnalyst1@email.com>, "FL Anlyst 2" <testFLStateAnalyst2@email.com>'
        )
        const result = await getStateAnalystEmails('FL')
        expect(result).toStrictEqual([
            '"FL Anlyst 1" <testFLStateAnalyst1@email.com>',
            '"FL Anlyst 2" <testFLStateAnalyst2@email.com>',
        ])
    })
    it('returns empty array on error fetching store value', async () => {
        const spy = jest.spyOn(ParameterStore, 'getParameterStore')
        spy.mockResolvedValue(new Error('Not store found'))
        const result = await getStateAnalystEmails('FL')
        expect(result).toStrictEqual([])
    })
})
