import React from 'react'
import { Button } from './Button'

export default {
    title: 'Components/Button',
    component: Button,
}

export const primary = (): React.ReactElement => (
    <Button type="button" variant="primary">
        Click Me
    </Button>
)

export const secondary = (): React.ReactElement => (
    <Button type="button" variant="secondary">
        Click Me
    </Button>
)

export const outline = (): React.ReactElement => (
    <Button type="button" variant="outline">
        Click Me
    </Button>
)

export const linkStyle = (): React.ReactElement => (
    <Button type="button" variant="linkStyle">
        Click Me
    </Button>
)

export const disabledPrimaryButton = (): React.ReactElement => (
    <Button type="button" variant="primary" disabled>
        Click Me
    </Button>
)

export const disabledLinkStyleButton = (): React.ReactElement => (
    <Button type="button" variant="linkStyle" disabled>
        Click Me
    </Button>
)
