import React from 'react'
import { getActuaryFirm } from '@mc-review/submissions'
import { DataDetailMissingField } from '../DataDetailMissingField'
import { ActuaryContact, StateContact } from '../../../gen/gqlClient'
import { LinkWithLogging } from '../../TealiumLogging'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'

type Contact = ActuaryContact | StateContact
function isCertainActuaryContact(contact: Contact): contact is ActuaryContact {
    return (contact as ActuaryContact).actuarialFirm !== undefined
}

// Intended for use as children passed to DataDetail
// displays contacts inside HTML <address> with link for email
export const DataDetailContactField = ({
    contact,
}: {
    contact?: Contact
}): React.ReactElement => {
    const ldClient = useLDClient()
    const useStructuredContactName = ldClient?.variation(
        featureFlags.CONTACT_MODEL_UPDATE.flag,
        featureFlags.CONTACT_MODEL_UPDATE.defaultValue
    )

    // Display full name constructed using name fields when feature flag is on.
    const displayName = useStructuredContactName
        ? [contact?.givenName, contact?.familyName, contact?.suffix]
              .map((namePart) => namePart?.trim())
              .filter(Boolean)
              .join(' ')
        : contact?.name

    if (!contact || !displayName || !contact.email)
        return <DataDetailMissingField />
    const { titleRole, email } = contact
    return (
        <address>
            {displayName}
            <br />
            {titleRole}
            <br />
            <LinkWithLogging
                href={`mailto:${email}`}
                target="_blank"
                variant="external"
                rel="noreferrer"
                event_name="contact_click"
                contact_method="email"
            >
                {email}
            </LinkWithLogging>
            {isCertainActuaryContact(contact) && (
                <>
                    <br />
                    <span>{getActuaryFirm(contact)}</span>
                </>
            )}
        </address>
    )
}
