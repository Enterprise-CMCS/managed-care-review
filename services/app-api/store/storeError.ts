export const StoreErrorCodes = ['CONNECTION_ERROR', 'INSERT_ERROR'] as const
type StoreErrorCode = typeof StoreErrorCodes[number] // iterable union type

export type StoreError = {
	code: StoreErrorCode
	message: string
}

// Wow this seems complicated. If there are cleaner ways to do this I'd like to know it.
export function isStoreError(err: unknown): err is StoreError {
	if (err && typeof err == 'object') {
		if ('code' in err && 'message' in err) {
			// This seems ugly but neccessary in a type guard.
			const hasCode = err as { code: unknown }
			if (typeof hasCode.code === 'string') {
				if (
					StoreErrorCodes.some((errCode) => hasCode.code === errCode)
				) {
					return true
				}
			}
		}
	}
	return false
}
