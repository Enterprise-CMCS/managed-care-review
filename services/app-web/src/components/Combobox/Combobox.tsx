import React, { CSSProperties, useState } from 'react'
import Select, { AriaOnFocus } from 'react-select'

interface ColourOption {
    readonly value: string
    readonly label: string
    readonly color: string
    readonly isFixed?: boolean
    readonly isDisabled?: boolean
}

const colourOptions: readonly ColourOption[] = [
    { value: 'ocean', label: 'Ocean', color: '#00B8D9', isFixed: true },
    { value: 'blue', label: 'Blue', color: '#0052CC', isDisabled: true },
    { value: 'purple', label: 'Purple', color: '#5243AA' },
    { value: 'red', label: 'Red', color: '#FF5630', isFixed: true },
    { value: 'orange', label: 'Orange', color: '#FF8B00' },
    { value: 'yellow', label: 'Yellow', color: '#FFC400' },
    { value: 'green', label: 'Green', color: '#36B37E' },
    { value: 'forest', label: 'Forest', color: '#00875A' },
    { value: 'slate', label: 'Slate', color: '#253858' },
    { value: 'silver', label: 'Silver', color: '#666666' },
]

export const CustomAriaLive = (): React.ReactElement => {
    const [ariaFocusMessage, setAriaFocusMessage] = useState('')
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const style: { [key: string]: CSSProperties } = {
        blockquote: {
            fontStyle: 'italic',
            fontSize: '.75rem',
            margin: '1rem 0',
        },
        label: {
            fontSize: '.75rem',
            fontWeight: 'bold',
            lineHeight: 2,
        },
    }

    const onFocus: AriaOnFocus<ColourOption> = ({ focused, isDisabled }) => {
        const msg = `You are currently focused on option ${focused.label}${
            isDisabled ? ', disabled' : ''
        }`
        setAriaFocusMessage(msg)
        return msg
    }

    const onMenuOpen = () => setIsMenuOpen(true)
    const onMenuClose = () => setIsMenuOpen(false)

    return (
        <form>
            <label
                style={style.label}
                id="aria-label"
                htmlFor="aria-example-input"
            >
                Select a color
            </label>

            {!!ariaFocusMessage && !!isMenuOpen && (
                <blockquote style={style.blockquote}>
                    "{ariaFocusMessage}"
                </blockquote>
            )}

            <Select
                isMulti
                aria-labelledby="aria-label"
                ariaLiveMessages={{
                    onFocus,
                }}
                inputId="aria-example-input"
                name="aria-live-color"
                onMenuOpen={onMenuOpen}
                onMenuClose={onMenuClose}
                options={colourOptions}
            />
        </form>
    )
}
