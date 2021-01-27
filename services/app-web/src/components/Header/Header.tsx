import { Header as USWDSHeader, Title } from '@trussworks/react-uswds'

type HeaderType = {
    statePostalCode: string
}

export const Header = (): React.ReactElement => {
    return (
        <USWDSHeader basic>
            <div className="usa-nav-container">
                <div className="usa-navbar">
                    <Title>State Submission Project</Title>
                </div>
            </div>
        </USWDSHeader>
    )
}
