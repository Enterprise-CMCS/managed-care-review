import { useAuth } from '../contexts/AuthContext'
import { Program } from '../gen/gqlClient'

// Get state programs from logged in state user data
const useStatePrograms = (): Program[] | [] => {
    const { loggedInUser } = useAuth()
    let statePrograms: Program[] = []

    if (loggedInUser && loggedInUser.__typename === 'StateUser') {
        statePrograms = loggedInUser.state.programs
    }
    return statePrograms
}

export { useStatePrograms }
