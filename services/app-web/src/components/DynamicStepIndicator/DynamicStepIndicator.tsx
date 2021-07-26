import { StepIndicator, StepIndicatorStep } from '@trussworks/react-uswds'

import { getRouteName, PageTitlesRecord, RouteT } from '../../constants/routes'

import { SubmissionType as SubmissionTypeT } from '../../gen/gqlClient'

const FormPages = [
    'SUBMISSIONS_CONTRACT_DETAILS',
    'SUBMISSIONS_RATE_DETAILS',
    'SUBMISSIONS_CONTACTS',
    'SUBMISSIONS_DOCUMENTS',
    'SUBMISSIONS_REVIEW_SUBMIT',
] as RouteT[]

export const DynamicStepIndicator = ({
    submissionType,
    pathname,
}: {
    submissionType?: SubmissionTypeT
    pathname: string
}): React.ReactElement | null => {
    const currentFormPage = getRouteName(pathname)

    let formStepCompleted = true
    let formStepStatus: 'current' | 'complete' | undefined

    const activeFormPages = FormPages.filter((formPage) => {
        return !(
            submissionType === 'CONTRACT_ONLY' &&
            formPage === 'SUBMISSIONS_RATE_DETAILS'
        )
    })

    if (currentFormPage === 'SUBMISSIONS_TYPE') {
        return null
    } else {
        return (
            <>
                <StepIndicator>
                    {activeFormPages.map((formPageName) => {
                        if (formPageName === currentFormPage) {
                            formStepCompleted = false
                            formStepStatus = 'current'
                        } else if (formStepCompleted) {
                            formStepStatus = 'complete'
                        } else {
                            formStepStatus = undefined
                        }

                        return (
                            <StepIndicatorStep
                                label={PageTitlesRecord[formPageName]}
                                status={formStepStatus}
                                key={PageTitlesRecord[formPageName]}
                            />
                        )
                    })}
                </StepIndicator>
            </>
        )
    }
}
