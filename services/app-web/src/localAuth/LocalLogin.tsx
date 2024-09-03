import React from 'react'
import {
    Alert,
    Card,
    CardHeader,
    CardMedia,
    CardGroup,
    CardBody,
    CardFooter,
    GridContainer,
} from '@trussworks/react-uswds'
import { useNavigate } from 'react-router-dom'
import { RoutesRecord } from '../constants/routes'
import { loginLocalUser } from '.'
import styles from './LocalLogin.module.scss'

import aangAvatar from '../assets/images/aang.png'
import appaAvatar from '../assets/images/appa.png'
import tophAvatar from '../assets/images/toph.png'
import zukoAvatar from '../assets/images/zuko.png'
import irohAvatar from '../assets/images/iroh.png'
import rokuAvatar from '../assets/images/roku.png'
import izumiAvatar from '../assets/images/izumi.jpg'
import shiAvatar from '../assets/images/shi-tong.png'
import azulaAvatar from '../assets/images/azula.png'

import { useAuth } from '../contexts/AuthContext'
import { LocalUserType } from './LocalUserType'
import { ButtonWithLogging, ErrorAlertSignIn } from '../components'
import { recordJSException } from '../otelHelpers'

const localUsers: LocalUserType[] = [
    {
        id: 'user1',
        email: 'aang@example.com',
        givenName: 'Aang',
        familyName: 'Avatar',
        role: 'STATE_USER',
        stateCode: 'MN',
    },
    {
        id: 'user2',
        email: 'toph@example.com',
        givenName: 'Toph',
        familyName: 'Beifong',
        role: 'STATE_USER',
        stateCode: 'FL',
    },
    {
        id: 'user3',
        email: 'zuko@example.com',
        givenName: 'Zuko',
        familyName: 'Hotman',
        role: 'CMS_USER',
        stateAssignments: [],
    },
    {
        id: 'user5',
        email: 'roku@example.com',
        givenName: 'Roku',
        familyName: 'Hotman',
        role: 'CMS_USER',
        stateAssignments: [],
    },
    {
        id: 'user6',
        email: 'izumi@example.com',
        givenName: 'Izumi',
        familyName: 'Hotman',
        role: 'CMS_USER',
        stateAssignments: [],
    },
    {
        id: 'user4',
        email: 'iroh@example.com',
        givenName: 'Iroh',
        familyName: 'Uncle',
        role: 'ADMIN_USER',
    },
    {
        id: 'user7',
        email: 'appa@example.com',
        givenName: 'Appa',
        familyName: 'Sky Bison',
        role: 'HELPDESK_USER',
    },
    {
        id: 'user8',
        email: 'shi-tong@example.com',
        givenName: 'Shi Tong',
        familyName: 'Wan',
        role: 'BUSINESSOWNER_USER',
    },
    {
        id: 'user9',
        email: 'azula@example.com',
        givenName: 'Azula',
        familyName: 'Hotman',
        role: 'CMS_APPROVER_USER',
        stateAssignments: [],
    },
]

const userAvatars: { [key: string]: string } = {
    'aang@example.com': aangAvatar,
    'toph@example.com': tophAvatar,
    'zuko@example.com': zukoAvatar,
    'iroh@example.com': irohAvatar,
    'roku@example.com': rokuAvatar,
    'izumi@example.com': izumiAvatar,
    'appa@example.com': appaAvatar,
    'shi-tong@example.com': shiAvatar,
    'azula@example.com': azulaAvatar,
}

export function LocalLogin(): React.ReactElement {
    const hasSigninError = new URLSearchParams(location.search).get(
        'signin-error'
    )
    const [showFormAlert, setShowFormAlert] = React.useState(hasSigninError? true : false)
    const navigate = useNavigate()
    const { checkAuth, loginStatus } = useAuth()

    async function login(user: LocalUserType) {
        loginLocalUser(user)
            const result = await checkAuth('/auth?signin-error')

            if(result instanceof Error){
                setShowFormAlert(true)
                recordJSException(result)
            } else {
                navigate(RoutesRecord.ROOT)
            }


    }

    return (
        <GridContainer>
            <h2>Auth Page</h2>
            <h3>Local Login</h3>
            <div>Login as one of our hard coded users:</div>
            {showFormAlert && (
                <ErrorAlertSignIn />
            )}
            <CardGroup>
                {localUsers.map((user) => {
                    const fromString = {
                        CMS_APPROVER_USER: 'CMS (Approver)',
                        ADMIN_USER: 'CMS (Admin)',
                        BUSINESSOWNER_USER: 'CMS (Business Owner)',
                        HELPDESK_USER: 'CMS (Helpdesk)',
                        CMS_USER: 'CMS',
                        STATE_USER:
                            user.role === 'STATE_USER'
                                ? user.stateCode
                                : 'Unknown',
                    }

                    return (
                        <Card key={user.email} className={styles.userCard}>
                            <CardMedia>
                                <img
                                    src={userAvatars[user.email]}
                                    alt={user.givenName}
                                />
                            </CardMedia>
                            <CardHeader>
                                <h2 className="usa-card__heading">
                                    {user.givenName}
                                </h2>
                            </CardHeader>
                            <CardBody>
                                <p>From {fromString[user.role]}</p>
                            </CardBody>
                            <CardFooter>
                                <ButtonWithLogging
                                    data-testid={`${user.givenName}Button`}
                                    type="submit"
                                    disabled={loginStatus === 'LOADING'}
                                    parent_component_type="card"
                                    onClick={() => login(user)}
                                >
                                    Login
                                </ButtonWithLogging>
                            </CardFooter>
                        </Card>
                    )
                })}
            </CardGroup>
        </GridContainer>
    )
}
