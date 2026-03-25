import {
    mockContractPackageSubmitted,
    mockEqroContractResubmittedWithReviewStatusChange,
    mockEqroContractSubmittedNotSubjectToReview,
    mockEqroContractSubmittedUnderReview,
} from '@mc-review/mocks'
import { ChangeHistory } from './ChangeHistory'

export default {
    title: 'Components/ChangeHistory',
    component: ChangeHistory,
}

const contractData = mockContractPackageSubmitted()

export const DemoListUploadSuccess = (): React.ReactElement => {
    return <ChangeHistory contract={contractData} />
}

export const EqroInitialSubmissionUnderReview = (): React.ReactElement => {
    return <ChangeHistory contract={mockEqroContractSubmittedUnderReview()} />
}

export const EqroInitialSubmissionNotSubjectToReview =
    (): React.ReactElement => {
        return (
            <ChangeHistory
                contract={mockEqroContractSubmittedNotSubjectToReview()}
            />
        )
    }

export const EqroResubmissionHistory = (): React.ReactElement => {
    return (
        <ChangeHistory
            contract={mockEqroContractResubmittedWithReviewStatusChange()}
        />
    )
}
