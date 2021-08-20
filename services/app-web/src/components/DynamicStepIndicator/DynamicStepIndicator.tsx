import { StepIndicator, StepIndicatorStep } from '@trussworks/react-uswds'

import { PageTitlesRecord, RouteT } from '../../constants/routes'

export type DynamicStepIndicatorProps = {
    formPages: RouteT[]
    currentFormPage: RouteT | 'UNKNOWN_ROUTE'
}

type formStepStatusT = 'current' | 'complete' | undefined

export const DynamicStepIndicator = ({
    formPages,
    currentFormPage,
}: DynamicStepIndicatorProps): React.ReactElement | null => {
    if (
        currentFormPage === 'UNKNOWN_ROUTE' ||
        !formPages.includes(currentFormPage)
    ) {
        return null
    }

    let formStepCompleted = true
    const formPagesWithStatus: { name: RouteT; status: formStepStatusT }[] =
        formPages.map((formPageName) => {
            let status: formStepStatusT = undefined

            if (formPageName === currentFormPage) {
                formStepCompleted = false
                status = 'current'
            } else if (formStepCompleted) {
                status = 'complete'
            }

            return { name: formPageName, status: status }
        })

    return (
        <StepIndicator>
            {formPagesWithStatus.map((formPage) => {
                return (
                    <StepIndicatorStep
                        label={PageTitlesRecord[formPage.name]}
                        status={formPage.status}
                        key={PageTitlesRecord[formPage.name]}
                    />
                )
            })}
        </StepIndicator>
    )
}
