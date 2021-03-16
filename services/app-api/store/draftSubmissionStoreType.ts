import {
    attribute,
    hashKey,
    table,
} from '@aws/dynamodb-data-mapper-annotations'

import { SubmissionRatesType } from '../../app-web/src/common-code/domain-models'

// Data mapper annotations are meant to go on your domain models, and we might use them that way at some point
// but for now, especially since we probably want to rip out all the dynamodb stuf eventually anyway, we're going to keep
// the dynamodb specific stuff inside the store package
@table('local-draft-submissions')
export class DraftSubmissionStoreType {
    @hashKey()
    id: string

    @attribute()
    description: string

    @attribute()
    ratesType: SubmissionRatesType

    @attribute()
    createdAt: Date

    @attribute({
        indexKeyConfigurations: {
            StateStateNumberIndex: 'HASH',
        },
    })
    stateCode: String

    @attribute({
        indexKeyConfigurations: {
            StateStateNumberIndex: 'RANGE',
        },
    })
    stateNumber: number

    constructor() {
        this.id = ''
        this.description = ''
        this.ratesType = 'CONTRACTS_ONLY'
        this.createdAt = new Date()
        this.stateCode = ''
        this.stateNumber = -1
    }
}
