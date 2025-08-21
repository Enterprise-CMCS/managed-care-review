import React from 'react'
import { Footer } from './Footer'
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
