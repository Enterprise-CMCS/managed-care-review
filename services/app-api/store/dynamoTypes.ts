import {
    attribute,
    hashKey,
    table,
} from '@aws/dynamodb-data-mapper-annotations'

import { embed } from '@aws/dynamodb-data-mapper'
import {
    SubmissionType,
    FederalAuthority,
    ContractType,
} from '../../app-web/src/common-code/domain-models'

// Data mapper annotations are meant to go on your domain models, and we might use them that way at some point
// but for now, especially since we probably want to rip out all the dynamodb stuff eventually anyway, we're going to keep
// the dynamodb specific stuff inside the store package
export class DocumentStoreT {
    @attribute()
    name: string

    @attribute()
    s3URL: string

    constructor() {
        ;(this.name = ''), (this.s3URL = '')
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

@table('draft-submissions')
export class DraftSubmissionStoreType {
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
    programID: string

    @attribute()
    contractType?: ContractType

    @attribute()
    contractDateStart?: Date

    @attribute()
    contractDateEnd?: Date

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

    @attribute({ memberType: embed(DocumentStoreT) })
    documents: Array<DocumentStoreT>

    @attribute()
    contractAmendmentInfo?: ContractAmendmentInfoT

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
        this.documents = []
        this.contractType = undefined
        this.contractDateStart = undefined
        this.contractDateEnd = undefined
        this.managedCareEntities = []
        this.federalAuthorities = []
    }
}

@table('draft-submissions')
export class StateSubmissionStoreType {
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
    submittedAt: Date

    @attribute()
    programID: string

    @attribute()
    contractType: ContractType

    @attribute()
    contractDateStart: Date

    @attribute()
    contractDateEnd: Date

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

    @attribute({ memberType: embed(DocumentStoreT) })
    documents: Array<DocumentStoreT>

    constructor() {
        this.id = ''
        this.status = 'SUBMITTED'
        this.submissionDescription = ''
        this.submissionType = 'CONTRACT_ONLY'
        this.createdAt = new Date(0)
        this.updatedAt = new Date(0)
        this.stateCode = ''
        this.programID = ''
        this.stateNumber = -1
        this.documents = []
        this.submittedAt = new Date(0)
        this.contractType = 'BASE'
        this.contractDateStart = new Date(0)
        this.contractDateEnd = new Date(0)
        this.managedCareEntities = []
        this.federalAuthorities = []
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
