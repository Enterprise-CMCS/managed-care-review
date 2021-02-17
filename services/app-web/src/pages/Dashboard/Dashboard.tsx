import { useQuery } from '@apollo/client'
import { HELLO_WORLD } from '../../api'

export const Dashboard = (): React.ReactElement => {
	const { loading, error, data } = useQuery(HELLO_WORLD)

	console.log('Dashboard THING', loading, error, data)

	if (loading) {
		return <div>Loading User Info</div>
	}

	if (error) {
		return <div>Donezo</div>
	}

	return (
		<>
			{data && <div>: DATA: {data.hello}</div>}
			<div>Dashboard!</div>
		</>
	)
}
