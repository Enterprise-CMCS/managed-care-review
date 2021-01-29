import { NavList } from '@trussworks/react-uswds'
import './Header.scss'

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
    ): { name: string; icon: string } => {
        switch (postalCode) {
            case 'MN':
                return { name: 'Minnesota', icon: '#' }
            case 'Virginia':
                return { name: 'Virginia', icon: '#' }
            default:
                return { name: 'STATE UNKNOWN', icon: '#' }
        }
    }

    const { name } = getStateInfo(stateCode)

    return (
        <header className="usa-header">
            <div className="grid-row margin-x-4">
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
                        onClick={(event) => console.log('Menu down')}
                        className="nav-user-button"
                    >
                        {mockUser.name}
                    </button>
                ) : (
                    <button
                        onClick={(event) => console.log('Login')}
                        className="nav-user-button"
                    >
                        Login
                    </button>
                )}
            </div>
            <div className="grid-row margin-x-4">
                <h1 className="margin-x-0">
                    {name}
                    <span className="font-heading-lg margin-x-2">
                        {activePage}
                    </span>
                </h1>
            </div>
        </header>
    )
}
