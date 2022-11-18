import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { PackageSelect } from './PackageSelect'
import {
    fetchCurrentUserMock,
    mockMNState,
} from '../../../testHelpers/apolloHelpers'
import { screen, waitFor } from '@testing-library/react'
import selectEvent from 'react-select-event'
import userEvent from '@testing-library/user-event'

describe('ProgramSelect', () => {
    const packageOptions = [
        { value: 'test-id-124', label: 'MCR-MN-0005-MSC+-PMAP-SNBC' },
        { value: 'test-id-125', label: 'MCR-MN-0006-PMAP-SNBC' },
        { value: 'test-id-126', label: 'MCR-MN-0007-SNBC' },
        { value: 'test-id-127', label: 'MCR-MN-0008-MSC+' },
    ]
    const statePrograms = mockMNState().programs
    let mockOnChange = jest.fn()
    beforeEach(
        () =>
            (mockOnChange = jest.fn((programs) => {
                return programs.map((item: { value: string }) => item.value)
            }))
    )
    afterEach(() => jest.resetAllMocks())

    it('displays program options', async () => {
        renderWithProviders(
            <PackageSelect
                name="packageSelect"
                statePrograms={statePrograms}
                initialValues={[]}
                packageOptions={packageOptions}
                draftSubmissionId={'test-id-123'}
                onChange={mockOnChange}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )
        const combobox = await screen.findByRole('combobox')

        await selectEvent.openMenu(combobox)

        await waitFor(() => {
            expect(
                screen.getByText('MCR-MN-0005-MSC+-PMAP-SNBC')
            ).toBeInTheDocument()
            expect(
                screen.getByText('MCR-MN-0006-PMAP-SNBC')
            ).toBeInTheDocument()
            expect(screen.getByText('MCR-MN-0007-SNBC')).toBeInTheDocument()
            expect(screen.getByText('MCR-MN-0008-MSC+')).toBeInTheDocument()
        })
    })
    it('can select and return programs in an array', async () => {
        renderWithProviders(
            <PackageSelect
                name="packageSelect"
                statePrograms={statePrograms}
                initialValues={[]}
                packageOptions={packageOptions}
                draftSubmissionId={'test-id-123'}
                onChange={mockOnChange}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )
        const combobox = await screen.findByRole('combobox')

        await selectEvent.openMenu(combobox)

        await waitFor(() => {
            expect(
                screen.getByText('MCR-MN-0005-MSC+-PMAP-SNBC')
            ).toBeInTheDocument()
            expect(
                screen.getByText('MCR-MN-0006-PMAP-SNBC')
            ).toBeInTheDocument()
            expect(screen.getByText('MCR-MN-0007-SNBC')).toBeInTheDocument()
            expect(screen.getByText('MCR-MN-0008-MSC+')).toBeInTheDocument()
        })

        await selectEvent.select(combobox, 'MCR-MN-0005-MSC+-PMAP-SNBC')
        await selectEvent.openMenu(combobox)
        await selectEvent.select(combobox, 'MCR-MN-0008-MSC+')

        expect(mockOnChange.mock.calls).toHaveLength(2)
        expect(mockOnChange.mock.results[1].value).toStrictEqual([
            'test-id-124',
            'test-id-127',
        ])
        // in react-select, only items that are selected have a "remove item" label
        expect(
            screen.getByLabelText('Remove MCR-MN-0005-MSC+-PMAP-SNBC')
        ).toBeInTheDocument()
        expect(
            screen.getByLabelText('Remove MCR-MN-0008-MSC+')
        ).toBeInTheDocument()
    })
    it('can remove all selected programs', async () => {
        renderWithProviders(
            <PackageSelect
                name="packageSelect"
                statePrograms={statePrograms}
                initialValues={['test-id-127', 'test-id-126']}
                packageOptions={packageOptions}
                draftSubmissionId={'test-id-123'}
                onChange={mockOnChange}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )
        const combobox = await screen.findByRole('combobox')

        await selectEvent.openMenu(combobox)

        await waitFor(() => {
            expect(
                screen.getByText('MCR-MN-0005-MSC+-PMAP-SNBC')
            ).toBeInTheDocument()
            expect(
                screen.getByText('MCR-MN-0006-PMAP-SNBC')
            ).toBeInTheDocument()
            expect(screen.getByText('MCR-MN-0007-SNBC')).toBeInTheDocument()
            expect(screen.getByText('MCR-MN-0008-MSC+')).toBeInTheDocument()
        })

        const removeFirst = screen.getByLabelText('Remove MCR-MN-0007-SNBC')
        expect(removeFirst).toBeInTheDocument()
        const removeSecond = screen.getByLabelText('Remove MCR-MN-0008-MSC+')
        expect(removeSecond).toBeInTheDocument()

        await userEvent.click(removeFirst)
        await userEvent.click(removeSecond)

        expect(mockOnChange.mock.calls).toHaveLength(2)
        expect(mockOnChange.mock.results[1].value).toStrictEqual([])
        // in react-select, only items that are selected have a "remove item" label
        expect(screen.queryByLabelText('Remove SNBC')).toBeNull()
        expect(screen.queryByLabelText('Remove MSHO')).toBeNull()
    })
})
