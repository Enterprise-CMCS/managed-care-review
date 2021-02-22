import { useQuery } from '@apollo/client'
import { HELLO_WORLD } from '../../api'
import { GridContainer } from '@trussworks/react-uswds'
export const Dashboard = (): React.ReactElement => {
    const { loading, error, data } = useQuery(HELLO_WORLD)

    console.log('Dashboard THING', loading, error, data)

    if (loading) {
        return <div>Loading User Info</div>
    }

    if (error) {
        return <div>Donezo</div>
    }

    return <GridContainer>{data && <h1>{data.hello}</h1>}</GridContainer>
}
