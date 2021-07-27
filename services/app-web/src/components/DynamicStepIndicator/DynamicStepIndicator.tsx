import { StepIndicator, StepIndicatorStep } from '@trussworks/react-uswds'

import { getRouteName, PageTitlesRecord, RouteT } from '../../constants/routes'

import { SubmissionType as SubmissionTypeT } from '../../gen/gqlClient'

export const DynamicStepIndicator = ({
    formPages,
    submissionType,
    pathname,
}: {
    formPages: RouteT[]
    submissionType?: SubmissionTypeT
    pathname: string
}): React.ReactElement | null => {
    const currentFormPage = getRouteName(pathname)

    let formStepCompleted = true
    let formStepStatus: 'current' | 'complete' | undefined

    const activeFormPages = formPages.filter((formPage) => {
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
