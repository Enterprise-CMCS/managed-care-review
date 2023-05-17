// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<F extends (...args: any[]) => any>(
    func: F,
    waitFor: number
): (...args: Parameters<F>) => Promise<ReturnType<F> | undefined> {
    let existingTimeoutId: NodeJS.Timeout

    return (...args: Parameters<F>): Promise<ReturnType<F> | undefined> => {
        return new Promise<ReturnType<F> | undefined>((resolve) => {
            clearTimeout(existingTimeoutId)
            existingTimeoutId = setTimeout(
                () => resolve(func(...args)),
                waitFor
            )
        })
    }
}
