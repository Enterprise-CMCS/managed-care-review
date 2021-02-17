import { GovBanner } from '@trussworks/react-uswds'

import { AppRoutes } from './AppRoutes'
import { CheckAuth } from '../Auth/CheckAuth'
import { Footer } from '../../components/Footer/Footer'
import { Header } from '../../components/Header/Header'
import { useAuth } from './AuthContext'

// This is where it's safe to use useAuth and useQuery
export function AppBody({
	localLogin,
}: {
	localLogin: boolean
}): React.ReactElement {
	const { loggedInUser } = useAuth()
	console.log('PPOP', loggedInUser)
	return (
		<div className="App">
			<a className="usa-skipnav" href="#main-content">
				Skip to main content
			</a>
			<GovBanner aria-label="Official government website" />
			<Header
				loggedIn={loggedInUser !== undefined}
				user={loggedInUser}
				stateCode={loggedInUser ? loggedInUser.state : undefined}
			/>
			<main id="main-content">
				<AppRoutes localLogin={localLogin} />
				<CheckAuth />
			</main>
			<Footer />
		</div>
	)
}
