import 'dayjs'

declare module 'dayjs' {
    interface Dayjs {
        duration: (
            input?: dayjs.DurationInputType,
            unit?: dayjs.DurationUnitType
        ) => dayjs.Duration

        // UTC plugin methods
        utc(keepLocalTime?: boolean): Dayjs
        utc(): Dayjs
        local(): Dayjs
        isUTC(): boolean

        // Timezone plugin methods
        tz(timezone?: string, keepLocalTime?: boolean): Dayjs

        // IsLeapYear plugin method
        isLeapYear(): boolean

        // IsSameOrAfter plugin method
        isSameOrAfter(date: dayjs.ConfigType, unit?: dayjs.OpUnitType): boolean

        // AdvancedFormat plugin doesn't add new methods, it extends existing ones
    }

    // Existing duration function declaration
    export function duration(
        input?: dayjs.DurationInputType,
        unit?: dayjs.DurationUnitType
    ): dayjs.Duration

    // UTC plugin static method
    export function utc(
        date?: dayjs.ConfigType,
        format?: string,
        strict?: boolean
    ): Dayjs

    // Timezone plugin static method
    export function tz(date: dayjs.ConfigType, timezone?: string): Dayjs
}
