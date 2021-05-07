import { SubmissionType } from '../common-code/domain-models/DraftSubmissionType'
import {
    DraftSubmission,
} from '../gen/gqlClient'
/*
    Maps submission field enums to constant strings for UI
    These are usually domain constants that are not captured in a database field and only in types.
    When localization is in place, can return an i18n value instead of an English string
*/
const SubmissionTypeRecord: Record<SubmissionType, string> = {
    CONTRACT_ONLY: 'Contract action only',
    CONTRACT_AND_RATES: 'Contract action and rate certification',
}

const isContractOnly= (sub: DraftSubmission ):boolean  =>  
    sub.submissionType === 'CONTRACT_ONLY'


const isContractAndRates= (sub:  DraftSubmission):boolean  =>  
    sub.submissionType === 'CONTRACT_AND_RATES'

export { SubmissionTypeRecord, isContractOnly, isContractAndRates }
