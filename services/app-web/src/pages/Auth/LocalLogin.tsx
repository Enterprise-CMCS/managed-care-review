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

import { loginLocalUser } from './localAuth'

import aangAvatar from '../../assets/images/aang.png'
import tophAvatar from '../../assets/images/toph.png'
import { useAuth } from '../../contexts/AuthContext'
import { CognitoUserType } from '../../common-code/domain-models'

const localUsers: CognitoUserType[] = [
    {
        email: 'aang@dhs.state.mn.us',
        name: 'Aang',
        role: 'STATE_USER',
        state_code: 'MN',
    },
    {
        email: 'toph@dmas.virginia.gov',
        name: 'Toph',
        role: 'STATE_USER',
        state_code: 'VA',
    },
]

const userAvatars: { [key: string]: string } = {
    'aang@dhs.state.mn.us': aangAvatar,
    'toph@dmas.virginia.gov': tophAvatar,
}

export function LocalLogin(): React.ReactElement {
    const history = useHistory()
    const { checkAuth, loginStatus } = useAuth()

    async function login(user: CognitoUserType) {
        loginLocalUser(user)

        try {
            await checkAuth()
            history.push('/dashboard')
        } catch (error) {
            console.log('Log: Server Error')
        }
    }

    return (
        <GridContainer>
            <h2>Auth Page</h2>
            <h3>Local Login</h3>
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
                                <p>From {user.state_code}</p>
                            </CardBody>
                            <CardFooter>
                                <Button
                                    data-testid={`${user.name}Button`}
                                    type="submit"
                                    disabled={loginStatus === 'LOADING'}
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
