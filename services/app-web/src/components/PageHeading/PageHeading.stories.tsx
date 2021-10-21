import React from 'react'

import { PageHeading } from './PageHeading'

export default {
    title: 'Components/PageHeading',
    component: PageHeading,
    parameters: {
        componentSubtitle:
            'PageHeading should be used for page titles and to direct keyboard focus.',
    },
}

export const H1 = (): React.ReactElement => (
    <PageHeading>Test Page Heading</PageHeading>
)
