import { renderWithProviders } from '../../../testHelpers'
import { Route, Routes } from 'react-router-dom'
import {
    mockValidCMSUser,
    mockValidUser,
} from '../../../testHelpers/apolloMocks'
import { screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { QATable } from './QATable'
import { CmsUser } from '../../../gen/gqlClient'

const stateUser = mockValidUser()
const cmsUser = mockValidCMSUser() as CmsUser

const testQuestionData = {
    id: 'question-1-id',
    pkgID: '15',
    createdAt: new Date('2022-12-23T00:00:00.000Z'),
    addedBy: cmsUser,
    documents: [
        {
            s3URL: 's3://bucketname/key/question-1-document-1',
            name: 'question-1-document-1',
            url: 'https://fakes3.com/key?sekret=deadbeef',
        },
    ],
}

it('renders question correctly as a CMS user that created the question', async () => {
    renderWithProviders(
        <Routes>
            <Route
                path={'/'}
                element={<QATable question={testQuestionData} user={cmsUser} />}
            />
        </Routes>
    )

    await waitFor(() => {
        const rows = screen.getAllByRole('row')
        expect(rows).toHaveLength(2)
        expect(rows[1]).toHaveTextContent('question-1-document-1')
        expect(rows[1]).toHaveTextContent('12/23/22')
        expect(rows[1]).toHaveTextContent('You')
    })
})
it('renders question correctly as a CMS user that did not create the question', async () => {
    const otherStateUser = {
        __typename: 'CMSUser' as const,
        id: 'bar2-id',
        role: 'CMS_USER',
        givenName: 'mike',
        familyName: 'ddmas2',
        email: 'mike@dmas.mn.gov',
        stateAssignments: [],
    }
    renderWithProviders(
        <Routes>
            <Route
                path={'/'}
                element={
                    <QATable
                        question={testQuestionData}
                        user={otherStateUser}
                    />
                }
            />
        </Routes>
    )

    await waitFor(() => {
        const rows = screen.getAllByRole('row')
        expect(rows).toHaveLength(2)
        expect(rows[1]).toHaveTextContent('question-1-document-1')
        expect(rows[1]).toHaveTextContent('12/23/22')
        expect(rows[1]).toHaveTextContent(`${cmsUser.givenName} (CMS)`)
    })
})
it('renders question correctly as a state user', async () => {
    renderWithProviders(
        <Routes>
            <Route
                path={'/'}
                element={
                    <QATable question={testQuestionData} user={stateUser} />
                }
            />
        </Routes>
    )

    await waitFor(() => {
        const rows = screen.getAllByRole('row')
        expect(rows).toHaveLength(2)
        expect(rows[1]).toHaveTextContent('question-1-document-1')
        expect(rows[1]).toHaveTextContent('12/23/22')
        expect(rows[1]).toHaveTextContent(`${cmsUser.givenName} (CMS)`)
    })
})
it('renders multiple documents and links correctly', async () => {
    const testQuestionDocLinks = {
        id: 'question-1-id',
        pkgID: '15',
        createdAt: new Date('2022-12-23T00:00:00.000Z'),
        addedBy: cmsUser,
        documents: [
            {
                s3URL: 's3://bucketname/key/question-1-document-1',
                name: 'question-1-document-1',
                url: 'https://fakes3.com/key?sekret=deadbeef',
            },
            {
                s3URL: '',
                name: 'question-1-document-2',
                url: undefined,
            },
        ],
    }
    renderWithProviders(
        <Routes>
            <Route
                path={'/'}
                element={
                    <QATable question={testQuestionDocLinks} user={cmsUser} />
                }
            />
        </Routes>
    )

    await waitFor(() => {
        const rows = screen.getAllByRole('row')
        expect(rows).toHaveLength(3)

        // expect first document to have a link
        expect(rows[1]).toHaveTextContent('question-1-document-1')
        expect(within(rows[1]).getByRole('link')).toHaveAttribute(
            'href',
            'https://fakes3.com/key?sekret=deadbeef'
        )

        // expect second document to not have a link
        expect(rows[2]).toHaveTextContent('question-1-document-2')
        expect(within(rows[2]).queryByRole('link')).toBeNull()
    })
})
