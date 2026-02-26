import 'yup'

declare module 'yup' {
    interface StringSchema {
        validateDateStringFormat(errorMessage?: string): this
    }
    
    interface DateSchema {
        validateDateFormat(formats: string, parseStrict: boolean): this
    }
}