import { NavList, Button } from '@trussworks/react-uswds'
import './Header.scss'
import vaIcon from '../../assets/icons/va-icon.svg'
import mnIcon from '../../assets/icons/mn-icon.svg'

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
    ): { stateName: string; stateIcon: string } => {
        switch (postalCode) {
            case 'MN':
                return { stateName: 'Minnesota', stateIcon: mnIcon }
            case 'Virginia':
                return { stateName: 'Virginia', stateIcon: vaIcon }
            default:
                return { stateName: 'STATE UNKNOWN', stateIcon: '#' }
        }
    }

    const { stateName, stateIcon } = getStateInfo(stateCode)

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
                        className="flex-auto"
                    >
                        {mockUser.name}
                    </button>
                ) : (
                    <Button
                        type="button"
                        unstyled
                        onClick={(event) => console.log('Login')}
                        className="flex-auto"
                    >
                        Login
                    </Button>
                )}
            </div>
            <div className="grid-row margin-x-4">
                <div>
                    <img src={stateIcon} alt="" aria-hidden />
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
