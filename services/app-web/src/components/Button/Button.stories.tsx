import React from 'react'
import { Button } from './Button'

export default {
    title: 'Components/Button',
    component: Button,
}

export const Default = (): React.ReactElement => (
    <div className="sb-padded">
        <h1>Primary</h1>
        <Button type="button" variant="primary">
            Click Me
        </Button>
        <Button type="button" variant="primary" className="usa-button--hover">
            Hover
        </Button>
        <Button type="button" variant="primary" className="usa-button--active">
            Active
        </Button>
        <Button type="button" variant="primary" className="usa-focus">
            Focus
        </Button>
        <Button type="button" variant="primary" disabled>
            Disabled
        </Button>
        <Button type="button" variant="primary" loading animationTimeout={0}>
            Loading
        </Button>

        <h1>Secondary</h1>
        <>
            <Button type="button" variant="secondary">
                Click Me
            </Button>
            <Button
                type="button"
                variant="secondary"
                className="usa-button--hover"
            >
                Hover
            </Button>
            <Button
                type="button"
                variant="secondary"
                className="usa-button--active"
            >
                Active
            </Button>
            <Button type="button" variant="secondary" className="usa-focus">
                Focus
            </Button>
            <Button type="button" variant="secondary" disabled>
                Disabled
            </Button>
            <Button
                type="button"
                variant="secondary"
                loading
                animationTimeout={0}
            >
                Loading
            </Button>
        </>

        <h1>Outline</h1>
        <>
            <Button type="button" variant="outline">
                Click Me
            </Button>
            <Button
                type="button"
                variant="outline"
                className="usa-button--hover"
            >
                Hover
            </Button>
            <Button
                type="button"
                variant="outline"
                className="usa-button--active"
            >
                Active
            </Button>
            <Button type="button" variant="outline" className="usa-focus">
                Focus
            </Button>
            <Button type="button" variant="outline" disabled>
                Disabled
            </Button>
            <Button
                type="button"
                variant="outline"
                loading
                animationTimeout={0}
            >
                Loading
            </Button>
        </>

        <h1>LinkStyle</h1>
        <>
            <Button type="button" variant="linkStyle" className="margin-1">
                Click Me
            </Button>
            <Button
                type="button"
                variant="linkStyle"
                className="usa-button--hover margin-1"
            >
                Hover
            </Button>
            <Button
                type="button"
                variant="linkStyle"
                className="usa-button--active margin-1"
            >
                Active
            </Button>
            <Button
                type="button"
                variant="linkStyle"
                className="usa-focus margin-1"
            >
                Focus
            </Button>
            <Button
                type="button"
                variant="linkStyle"
                className="margin-1"
                disabled
            >
                Disabled
            </Button>
            <Button
                type="button"
                variant="linkStyle"
                className="margin-1"
                loading
                animationTimeout={0}
            >
                Loading
            </Button>
        </>
    </div>
)
