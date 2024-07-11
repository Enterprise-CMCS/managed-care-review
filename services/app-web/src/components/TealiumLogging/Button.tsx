import React from 'react'
import { Button } from '@trussworks/react-uswds'
import type { ButtonEventStyle, TealiumButtonEventObject } from '../../tealium'
import { ButtonProps } from '@trussworks/react-uswds/lib/components/Button/Button'
import { extractText } from './tealiamLoggingHelpers'
import { useTealium } from '../../hooks'

type TealiumDataType = Omit<
    TealiumButtonEventObject,
    'event_name' | 'text' | 'link_type'
>

type ButtonWithLoggingType = TealiumDataType &
    ButtonProps &
    React.ButtonHTMLAttributes<HTMLButtonElement>

const ButtonWithLogging = (props: ButtonWithLoggingType) => {
    const { logButtonEvent } = useTealium()
    const {
        button_type,
        button_style,
        parent_component_heading,
        parent_component_type,
        onClick,
        type,
        children,
        link_url,
        ...rest
    } = props

    let buttonStyle: ButtonEventStyle = 'default'

    if (props.secondary) {
        buttonStyle = 'secondary'
    }

    if (props.outline) {
        buttonStyle = 'transparent'
    }

    if (props.unstyled) {
        buttonStyle = 'unstyled'
    }

    return (
        <Button
            onClick={(e) => {
                logButtonEvent({
                    text: extractText(children),
                    button_type: button_type ?? type,
                    button_style: button_style ?? buttonStyle,
                    parent_component_heading,
                    parent_component_type,
                    link_url,
                })

                if (onClick) {
                    onClick(e)
                }
            }}
            type={type}
            {...rest}
        >
            {children}
        </Button>
    )
}

export { ButtonWithLogging }
