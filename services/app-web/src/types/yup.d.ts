import 'yup'

declare module 'yup' {
    interface StringSchema {
        validateDateStringFormat(errorMessage?: string): this
    }
}