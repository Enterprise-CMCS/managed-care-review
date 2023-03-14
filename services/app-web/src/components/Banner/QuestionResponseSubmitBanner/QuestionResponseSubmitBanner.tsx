import { Alert } from '@trussworks/react-uswds'
import styles from '../Banner.module.scss'

type SubmitType = 'question' | 'response'
export type QuestionResponseSubmitBannerProps = {
    submitType: string
}
function isSubmitType(type: SubmitType | string): type is SubmitType {
    return type === 'question' || type === 'response'
}

const QuestionResponseSubmitBanner = ({
    submitType,
}: QuestionResponseSubmitBannerProps) => {
    if (!isSubmitType(submitType)) return null
    const cmsQuestion = submitType === 'question'
    const heading = cmsQuestion ? 'Questions sent' : 'Response sent'
    const message = cmsQuestion
        ? 'Your questions were sent to the state.'
        : 'Your response was submitted to CMS.'
    return (
        <div className={styles.bannerBodyText}>
            <Alert type="success" headingLevel="h4" heading={heading}>
                {message}
            </Alert>
        </div>
    )
}

export { QuestionResponseSubmitBanner }
