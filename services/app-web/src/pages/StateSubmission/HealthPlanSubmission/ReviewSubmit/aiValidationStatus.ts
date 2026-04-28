export interface AIValidationDisplayState {
    title: string
    message: string
    alertType: 'info' | 'success' | 'warning'
    isPolling: boolean
}

export function getAIValidationDisplayState(args: {
    stage?: string | null
    isStale?: boolean
    error?: string | null
    hasTimedOut?: boolean
    isPartialCoverage?: boolean
}): AIValidationDisplayState {
    const { stage, isStale, error, hasTimedOut, isPartialCoverage } = args

    if (hasTimedOut) {
        return {
            title: 'Document review still in progress',
            message:
                'You can continue reviewing and submit without waiting for these results.',
            alertType: 'warning',
            isPolling: false,
        }
    }

    if (isStale) {
        return {
            title: 'Refreshing document review',
            message:
                'Your uploaded documents or submission dates changed, so the document review is refreshing.',
            alertType: 'info',
            isPolling: true,
        }
    }

    switch (stage) {
        case 'failed':
            return {
                title: 'Document review unavailable',
                message:
                    error ??
                    'We could not load document review results right now. You can continue reviewing and submit without these results.',
                alertType: 'warning',
                isPolling: false,
            }
        case 'complete':
            return {
                title: isPartialCoverage
                    ? 'Document review complete with limited coverage'
                    : 'Document review complete',
                message: isPartialCoverage
                    ? 'We finished reviewing the documents we could process.'
                    : 'We finished reviewing the uploaded documents.',
                alertType: 'success',
                isPolling: false,
            }
        case 'parsing':
            return {
                title: 'Document review in progress',
                message:
                    'We are preparing the uploaded documents for review.',
                alertType: 'info',
                isPolling: true,
            }
        case 'retrieving':
            return {
                title: 'Document review in progress',
                message:
                    'We are reviewing the uploaded documents and comparing them with the submission dates.',
                alertType: 'info',
                isPolling: true,
            }
        case 'deterministic-validation':
        case 'llm-validation':
            return {
                title: 'Document review in progress',
                message:
                    'We are checking the submission dates against the reviewed documents.',
                alertType: 'info',
                isPolling: true,
            }
        default:
            return {
                title: 'Document review pending',
                message:
                    'We have not started reviewing the uploaded documents yet. You can continue reviewing and submit at any time.',
                alertType: 'info',
                isPolling: false,
            }
    }
}
