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
}): AIValidationDisplayState {
    const { stage, isStale, error } = args

    if (isStale) {
        return {
            title: 'Reviewing updated documents',
            message:
                'Your uploaded documents changed, so the validation status is refreshing.',
            alertType: 'info',
            isPolling: true,
        }
    }

    switch (stage) {
        case 'failed':
            return {
                title: 'Validation unavailable',
                message:
                    error ??
                    'We could not complete document validation right now, but you can still continue reviewing your submission.',
                alertType: 'warning',
                isPolling: false,
            }
        case 'complete':
            return {
                title: 'Validation complete',
                message:
                    'Your uploaded documents have been reviewed for validation progress.',
                alertType: 'success',
                isPolling: false,
            }
        case 'parsing':
        case 'embedding':
        case 'indexing':
        case 'validating':
            return {
                title: 'Reviewing your documents',
                message:
                    'We are checking your uploaded documents against the information in this submission.',
                alertType: 'info',
                isPolling: true,
            }
        default:
            return {
                title: 'Validation pending',
                message:
                    'Document validation has not started yet. It will appear here once available.',
                alertType: 'info',
                isPolling: false,
            }
    }
}
