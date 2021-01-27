import { Header as USWDSHeader, Title } from '@trussworks/react-uswds'

type HeaderProps = {
    stateCode: string
}

/**
 * CMS Header for a logged in state user.
 */
export const Header = (props: HeaderProps): React.ReactElement => {
    const { stateCode } = props

    // TODO: Lookup from state.json or wherever we will store this
    const getStateInfo = (postalCode: string): any => {
        return postalCode === 'TN'
            ? { name: 'Tennessee', icon: '#' }
            : { name: 'DEFAULT STATE', icon: '#' }
    }

    const { name, icon } = getStateInfo(stateCode)

    return (
        <USWDSHeader basic>
            <div className="usa-nav-container">
                <img
                    src="https://www.medicaid.gov/themes/custom/medicaid/images/headerlogo-medicaid.png"
                    alt="Medicaid.gov-Keeping America Healthy"
                />
                <div className="usa-navbar">
                    <Title>
                        <span>{name}</span>
                        &nbsp;State Submission Project &nbsp;
                    </Title>
                </div>
            </div>
        </USWDSHeader>
    )
}
