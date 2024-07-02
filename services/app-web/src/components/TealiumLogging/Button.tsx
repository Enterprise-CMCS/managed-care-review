import React from 'react'
import { Button } from '@trussworks/react-uswds'
import { TealiumButtonEventObject } from '../../constants/tealium'
import { ButtonProps } from '@trussworks/react-uswds/lib/components/Button/Button'
import { extractText } from './tealiamLoggingHelpers'
import { useTealium } from '../../hooks'

type TealiumDataType = Omit<TealiumButtonEventObject, 'event_name' | 'text'>

type ButtonWithLogginType = TealiumDataType &
    ButtonProps &
    React.ButtonHTMLAttributes<HTMLButtonElement>

const ButtonWithLogging = (props: ButtonWithLogginType) => {
    const { logButtonEvent } = useTealium()
    const {
        button_type,
        button_style,
        parent_component_heading,
        parent_component_type,
        onClick,
        type,
        children,
        ...rest
    } = props

    let buttonStyle = 'primary'

    if (props.secondary) {
        buttonStyle = 'secondary'
    }

    if (props.outline) {
        buttonStyle = 'outline'
    }

    if (props.unstyled) {
        buttonStyle = 'linkStyle'
    }

    return (
        <Button
            onClick={(e) => {
                logButtonEvent({
                    text: extractText(children),
                    button_type: button_type || type,
                    button_style: button_style || buttonStyle,
                    parent_component_heading,
                    parent_component_type,
                })

                if (onClick) onClick(e)
            }}
            type={type}
            {...rest}
        >
            {children}
        </Button>
    )
}

export { ButtonWithLogging }
