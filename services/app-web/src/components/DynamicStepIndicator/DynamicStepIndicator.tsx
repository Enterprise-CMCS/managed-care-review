import { StepIndicator, StepIndicatorStep } from '@trussworks/react-uswds'

import { getRouteName, PageTitlesRecord, RouteT } from '../../constants/routes'

export const DynamicStepIndicator = ({
    activeFormPages,
    pathname,
}: {
    activeFormPages: RouteT[]
    pathname: string
}): React.ReactElement | null => {
    const currentFormPage = getRouteName(pathname)

    let formStepCompleted = true
    let formStepStatus: 'current' | 'complete' | undefined

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
