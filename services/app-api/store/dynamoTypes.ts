import {
    attribute,
    hashKey,
    table,
} from '@aws/dynamodb-data-mapper-annotations'

import { embed } from '@aws/dynamodb-data-mapper'
import { SubmissionType } from '../../app-web/src/common-code/domain-models'

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
@table('draft-submissions')
export class DraftSubmissionStoreType {
    @hashKey()
    id: string

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
        this.submissionDescription = ''
        this.submissionType = 'CONTRACT_ONLY'
        this.createdAt = new Date()
        this.updatedAt = new Date()
        this.stateCode = ''
        this.programID = ''
        this.stateNumber = -1
        this.documents = []
    }
}

@table('state-submissions')
export class StateSubmissionStoreType {
    @hashKey()
    id: string

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
        this.submissionDescription = ''
        this.submissionType = 'CONTRACT_ONLY'
        this.createdAt = new Date()
        this.updatedAt = new Date()
        this.stateCode = ''
        this.programID = ''
        this.stateNumber = -1
        this.documents = []
        this.submittedAt = new Date()
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
