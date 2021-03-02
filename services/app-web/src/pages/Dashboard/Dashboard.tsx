import { GridContainer } from '@trussworks/react-uswds'

import { useAuth } from '../../contexts/AuthContext'

export const Dashboard = (): React.ReactElement => {
    const { isLoading, loggedInUser } = useAuth()

    if (isLoading) {
        return <div>Loading User Info</div>
    }

    return (
        <GridContainer data-testid="dashboardPage">
            {loggedInUser && <h1>{`Hello ${loggedInUser.name}`}</h1>}
        </GridContainer>
    )
}
