import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { ProgramSelect } from './ProgramSelect'
import {
    fetchCurrentUserMock,
    mockMNState,
} from '../../../testHelpers/apolloMocks'
import { screen, waitFor } from '@testing-library/react'
import selectEvent from 'react-select-event'
import userEvent from '@testing-library/user-event'
import * as useStatePrograms from '../../../hooks/useStatePrograms'

const mockOnChange = jest.fn()
const mockSetValue = jest.fn()

// mock out formik hook as we are not testing formik
// needs to be before first describe
jest.mock('formik', () => {
    return {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-next-line
        ...jest.requireActual('formik'),
        useField: () => [
            {
                onChange: mockOnChange,
            },
            {
                touched: true,
                error: 'You must provide a description of any major changes or updates',
            },
            { setValue: mockSetValue },
        ],
    }
})

describe('ProgramSelect', () => {
    let mockOnChange = jest.fn()
    beforeEach(() => {
        //Spy on useStatePrograms hook to get up-to-date state programs
        jest.spyOn(useStatePrograms, 'useStatePrograms').mockReturnValue(
            mockMNState().programs
        )

        mockOnChange = jest.fn((programs) => {
            return programs.map((item: { value: string }) => item.value)
        })
    })

    afterEach(() => {
        jest.clearAllMocks()
        jest.spyOn(useStatePrograms, 'useStatePrograms').mockRestore()
    })

    it('displays program with all options', async () => {
        renderWithProviders(
            <ProgramSelect
                name="programSelect"
                programIDs={[]}
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
            expect(screen.getByText('MSHO')).toBeInTheDocument()
            expect(screen.getByText('SNBC')).toBeInTheDocument()
            expect(screen.getByText('SNBC Rate Program')).toBeInTheDocument()
            expect(screen.getByText('PMAP')).toBeInTheDocument()
            expect(screen.getByText('PMAP Rate Program')).toBeInTheDocument()
            expect(screen.getByText('MSC+')).toBeInTheDocument()
        })
    })

    it('displays program with only contract program options', async () => {
        renderWithProviders(
            <ProgramSelect
                name="programSelect"
                programIDs={[]}
                onChange={mockOnChange}
                contractProgramsOnly
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
            expect(screen.getByText('MSHO')).toBeInTheDocument()
            expect(screen.getByText('SNBC')).toBeInTheDocument()
            expect(
                screen.queryByText('SNBC Rate Program')
            ).not.toBeInTheDocument()
            expect(screen.getByText('PMAP')).toBeInTheDocument()
            expect(
                screen.queryByText('PMAP Rate Program')
            ).not.toBeInTheDocument()
            expect(screen.getByText('MSC+')).toBeInTheDocument()
        })
    })

    it('can select and return programs in an array', async () => {
        renderWithProviders(
            <ProgramSelect
                name="programSelect"
                programIDs={[]}
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
            expect(screen.getByText('MSHO')).toBeInTheDocument()
            expect(screen.getByText('SNBC')).toBeInTheDocument()
            expect(screen.getByText('SNBC Rate Program')).toBeInTheDocument()
            expect(screen.getByText('PMAP')).toBeInTheDocument()
            expect(screen.getByText('PMAP Rate Program')).toBeInTheDocument()
            expect(screen.getByText('MSC+')).toBeInTheDocument()
        })

        await selectEvent.select(combobox, 'MSHO')
        await selectEvent.openMenu(combobox)
        await selectEvent.select(combobox, 'MSC+')

        expect(mockOnChange.mock.calls).toHaveLength(2)
        expect(mockOnChange.mock.results[1].value).toStrictEqual([
            '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
            'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
        ])
        // in react-select, only items that are selected have a "remove item" label
        expect(screen.getByLabelText('Remove MSHO')).toBeInTheDocument()
        expect(screen.getByLabelText('Remove MSC+')).toBeInTheDocument()
    })

    it('can remove all selected programs', async () => {
        renderWithProviders(
            <ProgramSelect
                name="programSelect"
                programIDs={[
                    '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                    'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                ]}
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
            expect(screen.getByText('MSHO')).toBeInTheDocument()
            expect(screen.getByText('SNBC')).toBeInTheDocument()
            expect(screen.getByText('SNBC Rate Program')).toBeInTheDocument()
            expect(screen.getByText('PMAP')).toBeInTheDocument()
            expect(screen.getByText('PMAP Rate Program')).toBeInTheDocument()
            expect(screen.getByText('MSC+')).toBeInTheDocument()
        })

        const removeMSHO = screen.getByLabelText('Remove MSHO')
        const removeSNBC = screen.getByLabelText('Remove SNBC')

        await userEvent.click(removeMSHO)
        await userEvent.click(removeSNBC)

        expect(mockOnChange.mock.calls).toHaveLength(2)
        expect(mockOnChange.mock.results[1].value).toStrictEqual([])
        // in react-select, only items that are selected have a "remove item" label
        expect(screen.queryByLabelText('Remove SNBC')).toBeNull()
        expect(screen.queryByLabelText('Remove MSHO')).toBeNull()
    })
})
