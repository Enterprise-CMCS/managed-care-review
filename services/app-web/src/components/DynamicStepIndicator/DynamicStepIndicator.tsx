import { StepIndicator, StepIndicatorStep } from '@trussworks/react-uswds'

import { PageTitlesRecord, RouteT } from '../../constants/routes'

export const DynamicStepIndicator = ({
    formPages,
    currentFormPage,
}: {
    formPages: RouteT[]
    currentFormPage: RouteT | 'UNKNOWN_ROUTE'
}): React.ReactElement | null => {
    let formStepCompleted = true
    let formStepStatus: 'current' | 'complete' | undefined

    if (
        currentFormPage === 'UNKNOWN_ROUTE' ||
        !formPages.includes(currentFormPage)
    ) {
        return null
    } else {
        return (
            <>
                <StepIndicator>
                    {formPages.map((formPageName) => {
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
