import { Button } from '@trussworks/react-uswds'

import './Header.scss'
import medicaidLogo from '../../assets/images/headerlogo-medicaid.png'
import { ReactComponent as VaIcon } from '../../assets/icons/va-icon.svg'
import { ReactComponent as MnIcon } from '../../assets/icons/mn-icon.svg'

const getStateInfo = (
    stateAbbrev: SupportedStateCodes
): { stateName: string; StateIcon: React.FunctionComponent } => {
    switch (stateAbbrev) {
        case 'MN':
            return { stateName: 'Minnesota', StateIcon: MnIcon }
        case 'VA':
            return { stateName: 'Virginia', StateIcon: VaIcon }
        default:
            return {
                stateName: 'STATE UNKNOWN',
                StateIcon: () => <span></span>,
            }
    }
}

enum SupportedStateCodes {
    MN = 'MN',
    VA = 'VA',
}
export type HeaderProps = {
    stateCode?: SupportedStateCodes
    activePage?: string
    loggedIn?: boolean
}

/**
 * CMS Header
 */
export const Header = ({
    stateCode = SupportedStateCodes.MN,
    activePage = 'Managed Care Dashboard',
    loggedIn = false,
}: HeaderProps): React.ReactElement => {
    const mockUser = {
        name: 'Mickey Mouse',
    }

    const { stateName, StateIcon } = getStateInfo(stateCode)

    return (
        <header className="usa-header">
            <div className="logo-row">
                <div className="usa-logo">
                    <img
                        src={medicaidLogo}
                        alt="Medicaid.gov-Keeping America Healthy"
                    />
                </div>
            </div>
            <div className="nav-row">
                <nav role="navigation">
                    <ul className="text-light">
                        <li>
                            <a href="#about">About</a>
                        </li>
                        <li>
                            <a href="#dashboard">Dashboard</a>
                        </li>
                    </ul>
                </nav>
                {loggedIn ? (
                    <Button
                        type="button"
                        unstyled
                        onClick={() => console.log('Menu down')}
                        className="flex-auto text-light"
                    >
                        {mockUser.name}
                    </Button>
                ) : (
                    <Button
                        type="button"
                        unstyled
                        onClick={() => console.log('Login')}
                        className="flex-auto text-light"
                    >
                        Login
                    </Button>
                )}
            </div>
            <div className="heading-row">
                <div>
                    <StateIcon />
                </div>
                <h1 className="margin-0">
                    <span>{stateName}</span>
                    <span className="font-heading-lg text-light">
                        {activePage}
                    </span>
                </h1>
            </div>
        </header>
    )
}
