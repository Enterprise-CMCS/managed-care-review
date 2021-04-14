import React from 'react'
import { Footer } from './Footer'

export default {
    title: 'Components/Footer',
    component: Footer,
    parameters: {
        componentSubtitle:
            'Footer displays contact information and ownership for the application at the bottom of the page.',
    },
}

export const CMSFooter = (): React.ReactElement => <Footer />
