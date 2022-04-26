function logSuccess(operation: string) {
    console.info({
        message: `${operation} succeeded`,
        operation: operation,
        status: 'SUCCESS',
    })
}

function logError(operation: string, error: Error | string) {
    console.error({
        message: `${operation} failed`,
        operation: operation,
        status: 'ERROR',
        error: error,
    })
}

export { logSuccess, logError }
