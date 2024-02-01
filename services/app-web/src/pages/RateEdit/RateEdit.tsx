import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { StateUser, useFetchRateQuery } from '../../gen/gqlClient'
import { GridContainer } from '@trussworks/react-uswds'
import { Loading } from '../../components'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { useAuth } from '../../contexts/AuthContext'

type RouteParams = {
    id: string
}

export const RateEdit = (): React.ReactElement => {
    const navigate = useNavigate()
    const { loggedInUser } = useAuth()
    let user: StateUser
    const { id } = useParams<keyof RouteParams>()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in state submission form.'
        )
    }

    const { data, loading, error } = useFetchRateQuery({
        variables: {
            input: {
                rateID: id,
            },
        },
    })

    const rate = data?.fetchRate.rate

    if (loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (error || !rate) {
        return <GenericErrorPage />
    }

    if (loggedInUser && loggedInUser.__typename === 'StateUser') {
        user = loggedInUser

        //Will render a error component if the state user is attempting to access a rate not belonging to their state
        if (user.state.code !== rate.stateCode) {
            return <GenericErrorPage />
        }
    }

    if (rate.status !== 'UNLOCKED') {
        navigate(`/rates/${id}`)
    }

    return (
        <h1 data-testid="rate-edit">
            You've reached the '/rates/:id/edit' url placeholder for the
            incoming standalone edit rate form
            <br />
            Ticket:{' '}
            <a href="https://qmacbis.atlassian.net/browse/MCR-3771">MCR-3771</a>
        </h1>
    )
}
