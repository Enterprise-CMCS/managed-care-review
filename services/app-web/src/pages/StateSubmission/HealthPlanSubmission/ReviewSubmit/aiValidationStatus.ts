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
                'Document review is still in progress. You can continue reviewing your submission and submit without waiting for these results.',
            alertType: 'warning',
            isPolling: false,
        }
    }

    if (isStale) {
        return {
            title: 'Refreshing document review',
            message:
                'Your uploaded documents or submission dates changed, so these review results are refreshing.',
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
                    'We could not load document review results right now, but you can still continue reviewing your submission.',
                alertType: 'warning',
                isPolling: false,
            }
        case 'complete':
            return {
                title: isPartialCoverage
                    ? 'Document review complete with limited coverage'
                    : 'Document review complete',
                message: isPartialCoverage
                    ? 'We finished comparing the submission dates with the uploaded documents we could review. Some uploaded documents could not be fully reviewed.'
                    : 'We finished comparing the submission dates with the uploaded documents.',
                alertType: 'success',
                isPolling: false,
            }
        case 'parsing':
        case 'retrieving':
        case 'deterministic-validation':
        case 'llm-validation':
            return {
                title: 'Reviewing submission dates',
                message:
                    'We are comparing the contract dates in this submission with the uploaded documents.',
                alertType: 'info',
                isPolling: true,
            }
        default:
            return {
                title: 'Document review pending',
                message:
                    'We have not started reviewing the uploaded documents yet. Results will appear here when they are ready.',
                alertType: 'info',
                isPolling: false,
            }
    }
}
