import React from 'react'
import {
    Alert,
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

import { loginLocalUser } from '.'

import aangAvatar from '../assets/images/aang.png'
import tophAvatar from '../assets/images/toph.png'
import zukoAvatar from '../assets/images/zuko.png'

import { useAuth } from '../contexts/AuthContext'
import { CognitoUserType } from '../common-code/domain-models'

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
    {
        email: 'zuko@cms.hhs.gov',
        name: 'Zuko',
        role: 'CMS_USER',
    },
]

const userAvatars: { [key: string]: string } = {
    'aang@dhs.state.mn.us': aangAvatar,
    'toph@dmas.virginia.gov': tophAvatar,
    'zuko@cms.hhs.gov': zukoAvatar,
}

export function LocalLogin(): React.ReactElement {
    const [showFormAlert, setShowFormAlert] = React.useState(false)
    const history = useHistory()
    const { checkAuth, loginStatus } = useAuth()

    async function login(user: CognitoUserType) {
        loginLocalUser(user)

        try {
            await checkAuth()
            history.push('/')
        } catch (error) {
            setShowFormAlert(true)
            console.log('Log: Server Error')
        }
    }

    return (
        <GridContainer>
            <h2>Auth Page</h2>
            <h3>Local Login</h3>
            <div>Login as one of our hard coded users:</div>
            {showFormAlert && <Alert type="error">Something went wrong</Alert>}
            <CardGroup>
                {localUsers.map((user) => {
                    const fromString =
                        user.role === 'STATE_USER' ? user.state_code : 'CMS'

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
                                <p>From {fromString}</p>
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
