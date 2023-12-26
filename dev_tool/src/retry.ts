// retry takes in a function that must return bool or error. true means that the function succeeded, error means an error occured, false means keep trying
async function retry(
    body: () => Promise<boolean | Error>,
    duration: number
): Promise<Error | undefined> {
    const timeout = new Date().getTime() + duration
    while (new Date().getTime() < timeout) {
        const result = await body()
        if (result === true) {
            return undefined
        } else if (result instanceof Error) {
            return result
        }

        // wait a second before checking again
        await new Promise<void>((resolve) => {
            setTimeout(() => {
                resolve()
            }, 1000)
        })
    }

    return new Error('Retry timed out')
}

export { retry }
