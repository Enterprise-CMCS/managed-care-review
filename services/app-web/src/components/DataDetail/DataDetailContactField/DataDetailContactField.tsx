import {
    ActuaryContact,
    StateContact,
} from '../../../common-code/healthPlanFormDataType'
import { getActuaryFirm } from '../../../gqlHelpers/contractsAndRates'
import { DataDetailMissingField } from '../DataDetailMissingField'
import {
    ActuaryContact as GQLActuaryContact,
    StateContact as GQLStateContact,
} from '../../../gen/gqlClient'
import { LinkWithLogging } from '../../TealiumLogging/Link'

type Contact =
    | ActuaryContact
    | GQLActuaryContact
    | StateContact
    | GQLStateContact
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
    if (!contact || !contact.name || !contact.email)
        return <DataDetailMissingField />
    const { name, titleRole, email } = contact
    return (
        <address>
            {name}
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
