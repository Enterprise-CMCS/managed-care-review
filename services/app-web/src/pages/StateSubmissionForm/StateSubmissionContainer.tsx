import { GridContainer } from '@trussworks/react-uswds'

type StateSubmissionContainerProps = {
    children: React.ReactNode & JSX.IntrinsicElements['div']
}

export const StateSubmissionContainer = (
    props: StateSubmissionContainerProps
): React.ReactElement => {
    return (
        <GridContainer data-testid="state-submission-form-page">
            {props.children}
        </GridContainer>
    )
}
