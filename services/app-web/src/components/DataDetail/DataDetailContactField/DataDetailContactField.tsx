import { Link } from '@trussworks/react-uswds'
import {
    ActuaryContact,
    StateContact,
} from '../../../common-code/healthPlanFormDataType'
import { getActuaryFirm } from '../../SubmissionSummarySection'
import { DataDetailMissingField } from '../DataDetailMissingField'

type Contact = StateContact | ActuaryContact

function isCertainActuaryContact(contact: Contact): boolean {
    // this field is not required on actuary contacts, but if its present we know for sure we have an actuary
    return (contact as ActuaryContact).actuarialFirm !== undefined
}

// Used to contacts inside HTML <address> with link for email
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
            <Link
                href={`mailto:${email}`}
                target="_blank"
                variant="external"
                rel="noreferrer"
            >
                {email}
            </Link>
            {isCertainActuaryContact(contact) && (
                <>
                    <br />{' '}
                    <span>{getActuaryFirm(contact as ActuaryContact)}</span>
                </>
            )}
        </address>
    )
}
