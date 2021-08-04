import {
    attribute,
    hashKey,
    table,
} from '@aws/dynamodb-data-mapper-annotations'

import { embed } from '@aws/dynamodb-data-mapper'
import {
    ContractType,
    SubmissionType,
    FederalAuthority,
    StateContact,
    ActuaryContact,
    ActuaryCommuncationType,
    DraftSubmissionType,
    StateSubmissionType,
    SubmissionUnionType,
    isStateSubmission,
    RateType,
} from '../../app-web/src/common-code/domain-models'

export function convertToDomainSubmission(
    submission: SubmissionStoreType
): SubmissionUnionType | Error {
    // check the .status on the store submission type to determine how to expand it
    if (submission.status === 'DRAFT') {
        delete submission.submittedAt // Why does typescript allow this?, this changes the type
        const draft: DraftSubmissionType = {
            ...submission,
            status: 'DRAFT',
        }

        return draft
    } else if (submission.status === 'SUBMITTED') {
        // It feels like a generic typescript function could help with this
        // kind of checking.
        const submittedAt = submission.submittedAt
        const contractType = submission.contractType
        const contractDateStart = submission.contractDateStart
        const contractDateEnd = submission.contractDateEnd
        if (
            submittedAt === undefined ||
            contractType === undefined ||
            contractDateStart === undefined ||
            contractDateEnd === undefined
        ) {
            return new Error(
                'a stateSubmission must have all optional values set'
            )
        }
        const stateSubmission: StateSubmissionType = {
            ...submission,
            status: 'SUBMITTED',
            submittedAt,
            contractType,
            contractDateStart,
            contractDateEnd,
        }

        // do the rest of the validations by calling the type guard
        if (!isStateSubmission(stateSubmission)) {
            return new Error('state submission is not valid')
        }

        return stateSubmission
    }

    return new Error('Unknown store submission type')
}

// Data mapper annotations are meant to go on your domain models, and we might use them that way at some point
// but for now, especially since we probably want to rip out all the dynamodb stuff eventually anyway, we're going to keep
// the dynamodb specific stuff inside the store package
export class DocumentStoreT {
    @attribute()
    name: string

    @attribute()
    s3URL: string

    constructor() {
        this.name = ''
        this.s3URL = ''
    }
}

export class CapitationRatesAmendedInfo {
    @attribute()
    reason?: 'ANNUAL' | 'MIDYEAR' | 'OTHER'

    @attribute()
    otherReason?: string

    constructor() {
        this.reason = 'OTHER'
    }
}

export class ContractAmendmentInfoT {
    @attribute()
    itemsBeingAmended: string[]

    @attribute()
    otherItemBeingAmended?: string

    @attribute()
    relatedToCovid19?: boolean

    @attribute()
    relatedToVaccination?: boolean

    @attribute()
    capitationRatesAmendedInfo?: CapitationRatesAmendedInfo

    constructor() {
        this.itemsBeingAmended = []
    }
}

export class RateAmendmentInfoT {
    @attribute()
    effectiveDateStart?: Date

    @attribute()
    effectiveDateEnd?: Date
}

// Even though we have two different submission types returned by our API, the
// db treats them the same. This is a consequence of storing all our form data in
// a document database. These mappers take the document data and turn them
// into a typescript representation.
// DraftSubmissions and StateSubmissions have almost the same set of fields, though
// many that are required by StateSubmission are optional in the Draft state. Dynamo
// db stores both side by side in the same table, so it's a fairly accurate state of affairs
// to pull both out into the same DB Type before converting that into the correct
// domain model.
// —MacRae June 2021
@table('draft-submissions')
export class SubmissionStoreType {
    @hashKey()
    id: string

    // This is used to differentiate between DraftSubmission and StateSubmission
    @attribute()
    status: string

    @attribute()
    submissionDescription: string

    @attribute()
    submissionType: SubmissionType

    @attribute()
    createdAt: Date

    @attribute()
    updatedAt: Date

    @attribute()
    submittedAt?: Date

    @attribute()
    programID: string

    @attribute()
    contractType?: ContractType

    @attribute()
    contractDateStart?: Date

    @attribute()
    contractDateEnd?: Date

    @attribute()
    rateType?: RateType

    @attribute()
    rateDateStart?: Date

    @attribute()
    rateDateEnd?: Date

    @attribute()
    rateDateCertified?: Date

    @attribute()
    managedCareEntities: Array<string>

    @attribute()
    federalAuthorities: Array<FederalAuthority>

    @attribute({
        indexKeyConfigurations: {
            StateStateNumberAllIndex: 'HASH',
        },
    })
    stateCode: string

    @attribute({
        indexKeyConfigurations: {
            StateStateNumberAllIndex: 'RANGE',
        },
    })
    stateNumber: number

    @attribute()
    stateContacts: Array<StateContact>

    @attribute()
    actuaryContacts: Array<ActuaryContact>

    @attribute()
    actuaryCommunicationPreference?: ActuaryCommuncationType

    @attribute({ memberType: embed(DocumentStoreT) })
    documents: Array<DocumentStoreT>

    @attribute()
    contractAmendmentInfo?: ContractAmendmentInfoT

    @attribute()
    rateAmendmentInfo?: RateAmendmentInfoT

    constructor() {
        this.id = ''
        this.status = 'DRAFT'
        this.submissionDescription = ''
        this.submissionType = 'CONTRACT_ONLY'
        this.createdAt = new Date(0)
        this.updatedAt = new Date(0)
        this.stateCode = ''
        this.programID = ''
        this.stateNumber = -1
        this.stateContacts = []
        this.actuaryContacts = []
        this.actuaryCommunicationPreference = undefined
        this.documents = []
        this.contractType = undefined
        this.contractDateStart = undefined
        this.contractDateEnd = undefined
        this.managedCareEntities = []
        this.federalAuthorities = []
        this.rateType = undefined
        this.rateDateStart = undefined
        this.rateDateEnd = undefined
        this.rateDateCertified = undefined
    }
}

export type DynamoError = {
    code: string
}

export function isDynamoError(err: unknown): err is DynamoError {
    if (err && typeof err == 'object' && 'code' in err) {
        return true
    }
    return false
}

export type MapperError = {
    name: string
}

export function isMapperError(err: unknown): err is MapperError {
    if (err && typeof err == 'object' && 'name' in err) {
        return true
    }
    return false
}

export function isNodeError(err: unknown): err is Error {
    if (err && typeof err == 'object' && 'name' in err && 'message' in err) {
        return true
    }
    return false
}
