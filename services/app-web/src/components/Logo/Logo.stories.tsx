import React from 'react'
import macproLogo from '../../assets/images/macprologo.png'
import { Logo } from './Logo'

export default {
    title: 'Components/Logo',
    component: Logo,
}

export const Default = (): React.ReactElement => (
    <Logo src={macproLogo} alt="Macpro-Medicaid and CHIP Program System" />
)
