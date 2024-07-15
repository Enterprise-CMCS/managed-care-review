import React from 'react'
import { Logo } from './Logo'

const onemacLogo = new URL(
    '../../assets/images/onemac-logo.svg',
    import.meta.url
).href
export default {
    title: 'Components/Logo',
    component: Logo,
    parameters: {
        componentSubtitle: 'Logo displays image pngs wrapped in uswds styles',
        backgrounds: {
            default: 'page-heading-blue',
            values: [{ name: 'page-heading-blue', value: '#205493' }],
        },
    },
}

export const Default = (): React.ReactElement => (
    <Logo src={onemacLogo} alt="One Mac" />
)
