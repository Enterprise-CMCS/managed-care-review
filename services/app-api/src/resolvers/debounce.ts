// export function debounce<F extends (...args: Parameters<F>) => ReturnType<F>>(
//     func: F,
//     waitFor: number
// ): (...args: Parameters<F>) => void {
//     let timeout: NodeJS.Timeout
//     return (...args: Parameters<F>): void => {
//         clearTimeout(timeout)
//         timeout = setTimeout(() => func(...args), waitFor)
//     }
// }

export function debounce<F extends (...args: Parameters<F>) => ReturnType<F>>(
    func: F,
    wait: number
): F {
    let timeoutID: number

    if (!Number.isInteger(wait)) {
        console.warn('Called debounce without a valid number')
        wait = 300
    }

    // conversion through any necessary as it wont satisfy criteria otherwise
    return <any>function (this: any, ...args: any[]) {
        clearTimeout(timeoutID)
        // const context = this;

        timeoutID = window.setTimeout(function () {
            func.apply(this, args)
        }, wait)
    }
}
