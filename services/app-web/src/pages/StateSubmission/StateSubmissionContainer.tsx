import { GridContainer } from '@trussworks/react-uswds'
import styles from './StateSubmissionForm.module.scss'

type StateSubmissionContainerProps = {
    children: React.ReactNode & JSX.IntrinsicElements['div']
}

export const StateSubmissionContainer = (
    props: StateSubmissionContainerProps
): React.ReactElement => {
    return (
        <GridContainer data-testid="state-submission-form-page" className={styles.formPage}>
            {props.children}
        </GridContainer>
    )
}
