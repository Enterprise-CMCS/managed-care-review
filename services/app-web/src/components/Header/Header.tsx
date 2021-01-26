import { Header as ReactUSWDSHeader, Title } from '@trussworks/react-uswds'

export const Header = (): React.ReactElement => {
    return (
        <ReactUSWDSHeader basic>
            <div className="usa-nav-container">
                <div className="usa-navbar">
                    <Title>
                        State Submission Project
                        <img src="#" />
                    </Title>
                </div>
            </div>
        </ReactUSWDSHeader>
    )
}
