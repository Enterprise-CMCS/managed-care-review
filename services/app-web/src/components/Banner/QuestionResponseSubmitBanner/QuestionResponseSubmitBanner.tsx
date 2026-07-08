import React from 'react'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'

type SubmitType = 'question' | 'response'
export type QuestionResponseSubmitBannerProps = {
    submitType: string
} & React.HTMLAttributes<HTMLDivElement>
function isSubmitType(type: SubmitType | string): type is SubmitType {
    return type === 'question' || type === 'response'
}

const QuestionResponseSubmitBanner = ({
    submitType,
    className,
}: QuestionResponseSubmitBannerProps) => {
    if (!isSubmitType(submitType)) return null
    const cmsQuestion = submitType === 'question'
    const heading = cmsQuestion ? 'Questions sent' : 'Response sent'
    const message = cmsQuestion
        ? 'Your questions were sent to the state.'
        : 'Your response was submitted to CMS.'
    return (
        <AccessibleAlertBanner
            role="status"
            type="success"
            headingLevel="h4"
            heading={heading}
            className={className}
        >
            {message}
        </AccessibleAlertBanner>
    )
}

export { QuestionResponseSubmitBanner }
