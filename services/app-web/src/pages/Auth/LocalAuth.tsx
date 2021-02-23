import React from 'react'
import {
    Button,
    Card,
    CardHeader,
    CardMedia,
    CardGroup,
    CardBody,
    CardFooter,
    GridContainer,
} from '@trussworks/react-uswds'
import { useHistory } from 'react-router-dom'
import { UserType } from '../../common-code/domain-models/user'

import { loginLocalUser } from './localLogin'

import aangAvatar from '../../assets/images/aang.png'
import tophAvatar from '../../assets/images/toph.png'
import { useAuth } from '../../contexts/AuthContext'

const localUsers: UserType[] = [
    {
        email: 'aang@dhs.state.mn.us',
        name: 'Aang',
        role: 'STATE_USER',
        state: 'MN',
    },
    {
        email: 'toph@dmas.virginia.gov',
        name: 'Toph',
        role: 'STATE_USER',
        state: 'VA',
    },
]

const userAvatars: { [key: string]: string } = {
    'aang@dhs.state.mn.us': aangAvatar,
    'toph@dmas.virginia.gov': tophAvatar,
}

export function LocalAuth(): React.ReactElement {
    const history = useHistory()
    const { checkAuth } = useAuth()

    async function login(user: UserType) {
        console.log('loggin ing', user)

        loginLocalUser(user)

        try {
            await checkAuth()
        } catch (e) {
            console.log('Error just even checking the auth??', e)
        }

        history.push('/dashboard')
    }

    return (
        <GridContainer>
            <h2>Local Login</h2>
            <div>Login as one of our hard coded users:</div>
            <CardGroup>
                {localUsers.map((user) => {
                    return (
                        <Card key={user.email}>
                            <CardMedia>
                                <img
                                    src={userAvatars[user.email]}
                                    alt={user.name}
                                />
                            </CardMedia>
                            <CardHeader>
                                <h2 className="usa-card__heading">
                                    {user.name}
                                </h2>
                            </CardHeader>
                            <CardBody>
                                <p>From {user.state}</p>
                            </CardBody>
                            <CardFooter>
                                <Button
                                    type="submit"
                                    onClick={() => login(user)}
                                >
                                    Login
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </CardGroup>
        </GridContainer>
    )
}
