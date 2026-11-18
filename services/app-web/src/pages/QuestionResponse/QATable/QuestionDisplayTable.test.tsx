import { fireEvent, screen, waitFor } from '@testing-library/react'
import { fetchCurrentUserMock, mockValidCMSUser } from '@mc-review/mocks'
import { renderWithProviders } from '../../../testHelpers'
import { testS3Client } from '../../../testHelpers/s3Helpers'
import { QuestionDisplayTable } from './QuestionDisplayTable'

it('renews an expired Q&A download in the question/answer bucket on keyboard activation', async () => {
    const user = mockValidCMSUser()
    const getURL = vi.fn().mockResolvedValue('https://example.com/fresh')
    const replace = vi.fn()
    const open = vi.spyOn(window, 'open').mockReturnValue({
        opener: null,
        location: { replace },
        close: vi.fn(),
    } as unknown as Window)
    renderWithProviders(
        <QuestionDisplayTable
            documents={[
                {
                    name: 'Question document',
                    s3URL: 's3://bucket/question-key/file.pdf',
                    createdAt: new Date(),
                    addedBy: user,
                    downloadURL:
                        'https://example.com/doc?X-Amz-Date=20200101T000000Z&X-Amz-Expires=900&X-Amz-Signature=secret',
                },
            ]}
            user={user}
            onlyDisplayInitial={false}
        />,
        {
            s3Provider: { ...testS3Client(), getURL },
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        }
    )
    expect(getURL).not.toHaveBeenCalled()
    // Keyboard Enter produces a click with detail=0 on a native anchor.
    fireEvent.click(
        screen.getByRole('link', {
            name: 'Question document (opens in new window)',
        }),
        { detail: 0 }
    )
    await waitFor(() =>
        expect(replace).toHaveBeenCalledWith('https://example.com/fresh')
    )
    expect(getURL).toHaveBeenCalledWith('question-key', 'QUESTION_ANSWER_DOCS')
    open.mockRestore()
})
