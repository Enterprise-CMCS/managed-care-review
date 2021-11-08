import { mockStateSubmission } from '../../testHelpers/apolloHelpers'
import { StateSubmissionType } from '.'
import {
    hasValidContract,
    // hasValidDocuments,
    // hasValidRates,
    // isContractOnly,
    // isContractAndRates,
    // isStateSubmission,
    // isDraftSubmission,
} from './'

describe('submission type assertions', () => {
    test.each([
        [mockStateSubmission(), true],
        [{ ...mockStateSubmission(), contractType: undefined }, false],
        [{ ...mockStateSubmission(), contractDateStart: undefined }, false],
        [{ ...mockStateSubmission(), contractDateEnd: undefined }, false],
        [{ ...mockStateSubmission(), managedCareEntities: [] }, false],
        [{ ...mockStateSubmission(), federalAuthorities: [] }, false],
    ])(
        'hasValidContract %o evaluates as expected',
        (submission, expectedResponse) => {
            // type coercion to allow us to test
            expect(
                hasValidContract(submission as unknown as StateSubmissionType)
            ).toEqual(expectedResponse)
        }
    )
})

// it('hasValidContract evaluates as expected', () => {})
// it('hasValidDocuments evaluates as expected', () => {})
// it('hasValidRates evaluates as expected', () => {})
// it('isContractOnly evaluates as expected', () => {})
// it('isContractAndRates evaluates as expected', () => {})
// it('isDraftSubmission evaluates as expected', () => {})
// it('isStateSubmission evaluates as expected', () => {})
