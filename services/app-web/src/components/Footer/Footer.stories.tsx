import React from 'react'
import { Footer, ResourcesNavFooterContent } from './Footer'
import ProvidersDecorator from '../../../.storybook/providersDecorator'

export default {
    title: 'Components/Footer',
    component: Footer,
    parameters: {
        componentSubtitle:
            'Footer displays contact information and ownership for the application at the bottom of the page.',
    },
    decorators: [ProvidersDecorator],
}

export const CMSFooter = (): React.ReactElement => <Footer />

export const ResourcesNavFooter = (): React.ReactElement => (
    <footer>
        <ResourcesNavFooterContent route="CONTACT_US" />
    </footer>
)
