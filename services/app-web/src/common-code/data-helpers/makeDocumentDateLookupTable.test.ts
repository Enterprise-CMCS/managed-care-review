import { makeDateTable } from './makeDocumentDateLookupTable'
import { mockSubmittedSubmission2WithRevision } from '../../testHelpers/apolloHelpers'

describe('makeDateTable', () => {
    it('should make a proper lookup table', () => {
        const submissions = mockSubmittedSubmission2WithRevision()
        const lookupTable = makeDateTable(submissions)

        expect(lookupTable).toEqual({
            '529-10-0020-00003_Superior_Health Plan, Inc.pdf': new Date(
                '2022-03-25T21:13:20.420Z'
            ),
            'Amerigroup Texas Inc copy.pdf': new Date(
                '2022-03-25T21:13:20.420Z'
            ),
            'Amerigroup Texas, Inc.pdf': new Date('2022-03-25T21:13:20.420Z'),
            'covid-ifc-2-flu-rsv-codes 5-5-2021.pdf': new Date(
                '2022-03-25T21:14:43.057Z'
            ),
            'lifeofgalileo.pdf': new Date('2022-03-28T17:56:32.953Z'),
        })
    })
})
