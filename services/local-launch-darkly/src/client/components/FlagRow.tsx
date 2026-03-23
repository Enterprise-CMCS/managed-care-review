import React from 'react'
import type { FlagValue } from '../useFlags'

type FlagRowProps = {
    flagKey: string
    value: FlagValue
    defaultValue: FlagValue
    onUpdate: (key: string, value: FlagValue) => void
}

function FlagControl({
    flagKey,
    value,
    defaultValue,
    onUpdate,
}: FlagRowProps) {
    const isBoolean =
        typeof value === 'boolean' || typeof defaultValue === 'boolean'
    const isNumber =
        typeof value === 'number' || typeof defaultValue === 'number'

    if (isBoolean) {
        return (
            <label className="toggle">
                <input
                    className="toggle__input"
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => onUpdate(flagKey, e.target.checked)}
                />
                <span className="toggle__slider" />
            </label>
        )
    }

    if (isNumber) {
        return (
            <input
                type="number"
                value={value as number}
                onChange={(e) => onUpdate(flagKey, Number(e.target.value))}
            />
        )
    }

    return (
        <input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onUpdate(flagKey, e.target.value)}
        />
    )
}

export function FlagRow({
    flagKey,
    value,
    defaultValue,
    onUpdate,
}: FlagRowProps) {
    return (
        <div className="flag">
            <div className="flag__info">
                <div className="flag__key">{flagKey}</div>
                <div className="flag__default">
                    default: {JSON.stringify(defaultValue)}
                </div>
            </div>
            <div className="flag__control">
                <FlagControl
                    flagKey={flagKey}
                    value={value}
                    defaultValue={defaultValue}
                    onUpdate={onUpdate}
                />
            </div>
        </div>
    )
}
