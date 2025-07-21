import React from 'react'
import { OauthClient } from '../../../gen/gqlClient'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'
import { ExpandableText } from '../../ExpandableText'

export const NewOauthClientBanner = ({
    className,
    clientId,
    clientSecret,
    description,
    grants,
    user,
}: OauthClient &
    React.HTMLAttributes<HTMLDivElement>): React.ReactElement | null => {
    return (
        <AccessibleAlertBanner
            role="status"
            type="success"
            headingLevel="h4"
            heading="New OAuth client created"
            validation={true}
            data-testid="newOauthUserBanner"
            className={className}
        >
            <div>
                <b>Client email</b>: {user.email}
            </div>
            <div>
                <b>Client Id</b>: {clientId}
            </div>
            <div>
                <b>Client Secret</b>: {clientSecret}
            </div>
            <div>
                <b>Grants</b>: {grants.join(', ')}
            </div>
            <ExpandableText>
                <>
                    <b>Description</b>: {description}
                </>
            </ExpandableText>
        </AccessibleAlertBanner>
    )
}
