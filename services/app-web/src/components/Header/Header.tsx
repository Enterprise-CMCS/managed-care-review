import { NavList, Button } from '@trussworks/react-uswds'
import './Header.scss'
import { ReactComponent as VaIcon } from '../../assets/icons/va-icon.svg'
import { ReactComponent as MnIcon } from '../../assets/icons/mn-icon.svg'

type HeaderProps = {
    stateCode?: string
    activePage?: string
    loggedIn?: boolean
}

/**
 * CMS Header
 */
export const Header = ({
    stateCode = 'MN',
    activePage = 'Managed Care Dashboard',
    loggedIn = false,
}: HeaderProps): React.ReactElement => {
    const mockUser = {
        name: 'Mickey Mouse',
    }

    const getStateInfo = (
        postalCode: string
    ): { stateName: string; StateIcon: React.FunctionComponent } => {
        switch (postalCode) {
            case 'MN':
                return { stateName: 'Minnesota', StateIcon: MnIcon }
            case 'Virginia':
                return { stateName: 'Virginia', StateIcon: VaIcon }
            default:
                return {
                    stateName: 'STATE UNKNOWN',
                    StateIcon: () => <span>N/A</span>,
                }
        }
    }

    const { stateName, StateIcon } = getStateInfo(stateCode)

    return (
        <header className="usa-header">
            <div className="logo-row">
                <div className="usa-logo">
                    <img
                        src="https://www.medicaid.gov/themes/custom/medicaid/images/headerlogo-medicaid.png"
                        alt="Medicaid.gov-Keeping America Healthy"
                    />
                </div>
            </div>
            <div className="nav-row">
                <nav className="usa-nav">
                    <NavList
                        type="primary"
                        items={[
                            <a href="#about" key="one">
                                About
                            </a>,
                            <a href="#dashboard" key="two">
                                Dashboard
                            </a>,
                        ]}
                    />
                </nav>
                {loggedIn ? (
                    <button
                        onClick={() => console.log('Menu down')}
                        className="flex-auto"
                    >
                        {mockUser.name}
                    </button>
                ) : (
                    <Button
                        type="button"
                        unstyled
                        onClick={() => console.log('Login')}
                        className="flex-auto"
                    >
                        Login
                    </Button>
                )}
            </div>
            <div className="heading-row">
                <div>
                    <StateIcon />
                </div>
                <h1 className="margin-0 ">
                    {stateName}
                    <span className="font-heading-lg margin-x-2">
                        {activePage}
                    </span>
                </h1>
            </div>
        </header>
    )
}
