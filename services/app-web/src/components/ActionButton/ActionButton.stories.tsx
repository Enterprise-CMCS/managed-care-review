import React from 'react'
import { ActionButton } from './ActionButton'

export default {
    title: 'Components/ActionButton',
    component: ActionButton,
}

export const Default = (): React.ReactElement => (
    <div className="sb-padded">
        <h1>Default</h1>
        <ActionButton type="button" variant="default">
            Click Me
        </ActionButton>
        <ActionButton
            type="button"
            variant="default"
            className="usa-button--hover"
        >
            Hover
        </ActionButton>
        <ActionButton
            type="button"
            variant="default"
            className="usa-button--active"
        >
            Active
        </ActionButton>
        <ActionButton type="button" variant="default" className="usa-focus">
            Focus
        </ActionButton>
        <ActionButton type="button" variant="default" disabled>
            Disabled
        </ActionButton>
        <ActionButton
            type="button"
            variant="default"
            loading
            animationTimeout={0}
        >
            Loading
        </ActionButton>

        <h1>Outline</h1>
        <>
            <ActionButton type="button" variant="outline">
                Click Me
            </ActionButton>
            <ActionButton
                type="button"
                variant="outline"
                className="usa-button--hover"
            >
                Hover
            </ActionButton>
            <ActionButton
                type="button"
                variant="outline"
                className="usa-button--active"
            >
                Active
            </ActionButton>
            <ActionButton type="button" variant="outline" className="usa-focus">
                Focus
            </ActionButton>
            <ActionButton type="button" variant="outline" disabled>
                Disabled
            </ActionButton>
            <ActionButton
                type="button"
                variant="outline"
                loading
                animationTimeout={0}
            >
                Loading
            </ActionButton>
        </>

        <h1>Secondary</h1>
        <>
            <ActionButton type="button" variant="secondary">
                Click Me
            </ActionButton>
            <ActionButton
                type="button"
                variant="secondary"
                className="usa-button--hover"
            >
                Hover
            </ActionButton>
            <ActionButton
                type="button"
                variant="secondary"
                className="usa-button--active"
            >
                Active
            </ActionButton>
            <ActionButton
                type="button"
                variant="secondary"
                className="usa-focus"
            >
                Focus
            </ActionButton>
            <ActionButton type="button" variant="secondary" disabled>
                Disabled
            </ActionButton>
            <ActionButton
                type="button"
                variant="secondary"
                loading
                animationTimeout={0}
            >
                Loading
            </ActionButton>
        </>

        <h1>Success</h1>
        <>
            <ActionButton type="submit" variant="success">
                Click Me
            </ActionButton>
            <ActionButton type="submit" variant="success">
                Hover
            </ActionButton>
            <ActionButton type="submit" variant="success">
                Active
            </ActionButton>
            <ActionButton type="submit" variant="success">
                Focus
            </ActionButton>
            <ActionButton type="submit" disabled variant="success">
                Disabled
            </ActionButton>
            <ActionButton
                type="submit"
                variant="success"
                loading
                animationTimeout={0}
            >
                Loading
            </ActionButton>
        </>

        <h1>LinkStyle</h1>
        <>
            <ActionButton
                type="button"
                variant="linkStyle"
                className="margin-1"
            >
                Click Me
            </ActionButton>
            <ActionButton
                type="button"
                variant="linkStyle"
                className="usa-button--hover margin-1"
            >
                Hover
            </ActionButton>
            <ActionButton
                type="button"
                variant="linkStyle"
                className="usa-button--active margin-1"
            >
                Active
            </ActionButton>
            <ActionButton
                type="button"
                variant="linkStyle"
                className="usa-focus margin-1"
            >
                Focus
            </ActionButton>
            <ActionButton
                type="button"
                variant="linkStyle"
                className="margin-1"
                disabled
            >
                Disabled
            </ActionButton>
            <ActionButton
                type="button"
                variant="linkStyle"
                className="margin-1"
                loading
                animationTimeout={0}
            >
                Loading
            </ActionButton>
        </>
    </div>
)
