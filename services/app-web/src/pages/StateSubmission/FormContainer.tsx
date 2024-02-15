import { GridContainer } from '@trussworks/react-uswds'
import styles from './StateSubmissionForm.module.scss'

type FormContainerProps = {
    id: string
    children: React.ReactNode & JSX.IntrinsicElements['div']
}

export const FormContainer = (
    props: FormContainerProps
): React.ReactElement => {
    const { id, children } = props
    return (
        <GridContainer data-testid={id} className={styles.formPage}>
            {children}
        </GridContainer>
    )
}
