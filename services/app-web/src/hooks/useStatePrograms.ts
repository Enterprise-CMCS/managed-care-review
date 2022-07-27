import { useAuth } from '../contexts/AuthContext'
import { Program } from '../gen/gqlClient'

// Determine current route name type (e.g. SUBMISSION_TYPE) using the getRouteName utility
const useStatePrograms = (): Program[] | [] => {
    const { loggedInUser } = useAuth()
    let statePrograms: Program[] = []

    if (loggedInUser && loggedInUser.__typename === 'StateUser') {
        statePrograms = loggedInUser.state.programs
    }
    return statePrograms
}

export { useStatePrograms }
