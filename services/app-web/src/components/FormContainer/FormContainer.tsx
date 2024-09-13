import { GridContainer } from '@trussworks/react-uswds'
import classnames from 'classnames'
import styles from './FormContainer.module.scss'

type FormContainerProps = {
    id: string
    children: React.ReactNode & JSX.IntrinsicElements['div']
    className?: string
}

export const FormContainer = (
    props: FormContainerProps
): React.ReactElement => {
    const { id, className, children } = props

    const classes = classnames(styles.formPage, className)
    return (
        <GridContainer data-testid={id} className={classes}>
            {children}
        </GridContainer>
    )
}
