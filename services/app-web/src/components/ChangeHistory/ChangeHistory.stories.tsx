import { ChangeHistory } from './ChangeHistory'
import { Submission2 } from '../../gen/gqlClient'

export default {
    title: 'Components/ChangeHistory',
    component: ChangeHistory,
}

const submissionData: Submission2 = {
    id: '440d6a53-bb0a-49ae-9a9c-da7c5352789f',
    stateCode: 'MN',
    status: 'RESUBMITTED',
    intiallySubmittedAt: '2022-03-23',
    revisions: [
        {
            revision: {
                id: '26596de8-852d-4e42-bb0a-c9c9bf78c3de',
                unlockInfo: {
                    updatedAt: '2022-03-24T01:18:44.663Z',
                    updatedBy: 'zuko@example.com',
                    updatedReason: 'testing stuff',
                    __typename: 'UpdateInformation',
                },
                submitInfo: {
                    updatedAt: '2022-03-24T01:19:46.154Z',
                    updatedBy: 'aang@example.com',
                    updatedReason: 'Placeholder resubmission reason',
                    __typename: 'UpdateInformation',
                },
                createdAt: '2022-03-24T01:18:44.665Z',
                submissionData: 'alkdfjlasdjf',
                __typename: 'Revision',
            },
            __typename: 'RevisionEdge',
        },
        {
            revision: {
                id: 'e048cdcf-5b19-4acb-8ead-d7dc2fd6cd30',
                unlockInfo: null,
                submitInfo: {
                    updatedAt: '2022-03-23T02:08:52.259Z',
                    updatedBy: 'aang@example.com',
                    updatedReason: 'Initial submission',
                    __typename: 'UpdateInformation',
                },
                createdAt: '2022-03-23T02:08:14.241Z',
                submissionData: 'weoirna;dfkl',
                __typename: 'Revision',
            },
            __typename: 'RevisionEdge',
        },
    ],
    __typename: 'Submission2',
}

export const DemoListUploadSuccess = (): React.ReactElement => {
    return <ChangeHistory submission={submissionData} />
}
