import classnames from 'classnames'
import styles from './FormContainer.module.scss'
import { GridContainer } from '@trussworks/react-uswds'

type NotificationContainerProps = {
    testID?: string
    children: React.ReactNode & JSX.IntrinsicElements['div']
    className?: string
}
export const FormNotificationContainer = (
    props: NotificationContainerProps
): React.ReactElement => {
    const { testID, className, children } = props

    const classes = classnames(styles.notificationContainer, className)
    return (
        <GridContainer data-testid={testID} className={classes}>
            {children}
        </GridContainer>
    )
}
