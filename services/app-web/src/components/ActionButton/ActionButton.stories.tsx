import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { ActionButton } from './ActionButton'

export default {
    title: 'Components/ActionButton',
    component: ActionButton,
    argTypes: {
        type: {
            options: ['button', 'submit', 'reset'],
            control: 'select',
            table: { type: { summary: "'button' | 'submit' | 'reset'" } },
        },
        secondary: {
            control: false,
            description: 'Set through variant; overridden by ActionButton.',
            table: { type: { summary: 'boolean' } },
        },
        base: { control: 'boolean', table: { type: { summary: 'boolean' } } },
        accentStyle: {
            options: ['cool', 'warm'],
            control: 'select',
            table: { type: { summary: "'cool' | 'warm'" } },
        },
        outline: {
            control: false,
            description: 'Set through variant; overridden by ActionButton.',
            table: { type: { summary: 'boolean' } },
        },
        inverse: {
            control: 'boolean',
            table: { type: { summary: 'boolean' } },
        },
        size: {
            options: ['big'],
            control: 'select',
            table: { type: { summary: "'big'" } },
        },
        unstyled: {
            control: false,
            description: 'Set through variant; overridden by ActionButton.',
            table: { type: { summary: 'boolean' } },
        },
        button_style: {
            options: [
                'default',
                'primary',
                'success',
                'secondary',
                'outline',
                'unstyled',
            ],
            control: 'select',
            description: 'Button style recorded in the Tealium event.',
            table: {
                category: 'Tealium',
                type: { summary: 'ButtonEventStyle' },
            },
        },
        button_type: {
            control: 'text',
            description: 'Button type recorded in the Tealium event.',
            table: { category: 'Tealium', type: { summary: 'string' } },
        },
        parent_component_heading: {
            control: 'text',
            description:
                'Heading of the parent component recorded in the Tealium event.',
            table: { category: 'Tealium', type: { summary: 'string' } },
        },
        parent_component_type: {
            control: 'text',
            description: 'Parent component type recorded in the Tealium event.',
            table: { category: 'Tealium', type: { summary: 'string' } },
        },
        link_url: {
            control: 'text',
            description: 'Link URL recorded in the Tealium event.',
            table: { category: 'Tealium', type: { summary: 'string' } },
        },
        event_extension: {
            control: 'text',
            description: 'Additional metadata recorded in the Tealium event.',
            table: { category: 'Tealium', type: { summary: 'string' } },
        },
    },
} satisfies Meta<typeof ActionButton>

export const Playground: StoryObj<typeof ActionButton> = {
    args: { type: 'button', children: 'Click Me', variant: 'default' },
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
