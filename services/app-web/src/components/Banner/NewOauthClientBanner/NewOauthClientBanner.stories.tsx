import React from 'react'
import { StoryFn } from '@storybook/react'
import { NewOauthClientBanner } from './NewOauthClientBanner'
import { CmsUsersUnion } from '../../../gen/gqlClient'

export default {
    title: 'Components/Banner/NewOauthClientBanner',
    component: NewOauthClientBanner,
}

const Template: StoryFn<React.ComponentProps<typeof NewOauthClientBanner>> = (
    args
) => <NewOauthClientBanner {...args} />

export const Default = Template.bind({})
Default.args = {
    clientId: 'abc-123-def-456',
    clientSecret: 'secret-789-xyz', // pragma: allowlist secret
    description:
        'OAuth client for automated API access to MC-Review submissions.',
    grants: ['client_credentials', 'authorization_code'],
    user: {
        __typename: 'CMSApproverUser',
        email: 'oauth-client@example.com',
    } as CmsUsersUnion,
}
