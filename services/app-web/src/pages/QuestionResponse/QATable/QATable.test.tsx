import { renderWithProviders } from '../../../testHelpers'
import { Route, Routes } from 'react-router-dom'
import {
    iterableCmsUsersMockData,
    mockValidCMSUser,
    mockValidUser,
} from '@mc-review/mocks'
import { screen, waitFor } from '@testing-library/react'
import React from 'react'
import { QATable, QuestionData } from './QATable'
import { CmsUser, StateUser } from '../../../gen/gqlClient'

const stateUser = mockValidUser() as StateUser
const cmsUser = mockValidCMSUser() as CmsUser

const testQuestionData = (): QuestionData => ({
    id: 'question-1-id',
    contractID: '15',
    createdAt: new Date('2022-12-23T00:00:00.000Z'),
    addedBy: cmsUser,
    documents: [
        {
            s3URL: 's3://bucketname/key/question-1-document-1',
            name: 'question-1-document-1',
        },
    ],
    responses: [
        {
            id: 'response-1-id',
            questionID: 'question-1-id',
            addedBy: stateUser,
            createdAt: new Date('2022-12-24T00:00:00.000Z'),
            documents: [
                {
                    s3URL: 's3://bucketname/key/response-1-document-1',
                    name: 'response-1-document-1',
                },
            ],
        },
    ],
})

describe('QATable', () => {
    describe.each(iterableCmsUsersMockData)(
        '$userRole QATable tests',
        ({ userRole, mockUser }) => {
            it('renders question correctly as a CMS user that created the question', async () => {
                renderWithProviders(
                    <Routes>
                        <Route
                            path={'/'}
                            element={
                                <QATable
                                    question={testQuestionData()}
                                    user={mockUser()}
                                    division={'DMCO'}
                                    round={1}
                                />
                            }
                        />
                    </Routes>
                )

                await waitFor(() => {
                    const rows = screen.getAllByRole('row')
                    expect(rows).toHaveLength(3)

                    //Expect Response to be first on table
                    expect(rows[1]).toHaveTextContent('response-1-document-1')
                    expect(rows[1]).toHaveTextContent('12/24/22')
                    expect(rows[1]).toHaveTextContent('bob (MN)')

                    //Expect Question to be last on table
                    expect(rows[2]).toHaveTextContent('question-1-document-1')
                    expect(rows[2]).toHaveTextContent('12/23/22')
                    expect(rows[2]).toHaveTextContent('You')
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
                                    question={testQuestionData()}
                                    user={otherStateUser}
                                    division={'DMCO'}
                                    round={1}
                                />
                            }
                        />
                    </Routes>
                )

                await waitFor(() => {
                    const rows = screen.getAllByRole('row')
                    expect(rows).toHaveLength(3)
                    expect(rows[2]).toHaveTextContent('question-1-document-1')
                    expect(rows[2]).toHaveTextContent('12/23/22')
                    expect(rows[2]).toHaveTextContent(
                        `${cmsUser.givenName} (CMS)`
                    )
                })
            })

            it('renders multiple documents', async () => {
                const testQuestionDocLinks: QuestionData = {
                    id: 'question-1-id',
                    contractID: '15',
                    createdAt: new Date('2022-12-23T00:00:00.000Z'),
                    addedBy: cmsUser,
                    documents: [
                        {
                            s3URL: 's3://bucketname/key/question-1-document-1',
                            name: 'question-1-document-2',
                        },
                        {
                            s3URL: '',
                            name: 'question-1-document-1',
                        },
                    ],
                    responses: [
                        {
                            id: 'response-1-id',
                            questionID: 'question-1-id',
                            addedBy: stateUser,
                            createdAt: new Date('2022-12-24T00:00:00.000Z'),
                            documents: [
                                {
                                    s3URL: 's3://bucketname/key/response-1-document-1',
                                    name: 'response-1-document-1',
                                },
                            ],
                        },
                    ],
                }
                renderWithProviders(
                    <Routes>
                        <Route
                            path={'/'}
                            element={
                                <QATable
                                    question={testQuestionDocLinks}
                                    user={mockUser()}
                                    division={'DMCO'}
                                    round={1}
                                />
                            }
                        />
                    </Routes>
                )

                await waitFor(() => {
                    const rows = screen.getAllByRole('row')
                    expect(rows).toHaveLength(4)

                    // expect response document top be on top
                    expect(rows[1]).toHaveTextContent('response-1-document-1')

                    // expect second question document to be in the middle
                    expect(rows[2]).toHaveTextContent('question-1-document-2')

                    // expect first question document to be in the middle
                    expect(rows[3]).toHaveTextContent('question-1-document-1')
                })
            })
        }
    )

    describe('STATE_USER QATable tests', () => {
        it('renders question correctly as a state user', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={'/'}
                        element={
                            <QATable
                                question={testQuestionData()}
                                user={stateUser}
                                division={'DMCO'}
                                round={1}
                            />
                        }
                    />
                </Routes>
            )

            await waitFor(() => {
                const rows = screen.getAllByRole('row')
                expect(rows).toHaveLength(3)
                expect(rows[2]).toHaveTextContent('question-1-document-1')
                expect(rows[2]).toHaveTextContent('12/23/22')
                expect(rows[2]).toHaveTextContent(`${cmsUser.givenName} (CMS)`)
            })
        })
    })
})
