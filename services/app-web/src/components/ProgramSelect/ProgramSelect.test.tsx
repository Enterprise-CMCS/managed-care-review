import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { ProgramSelect } from './ProgramSelect'
import { mockMNState } from '../../testHelpers/apolloHelpers'
import { screen, waitFor } from '@testing-library/react'
import selectEvent from 'react-select-event'
import userEvent from '@testing-library/user-event'

describe('ProgramSelect', () => {
    it('displays program options', async () => {
        const mockStatePrograms = mockMNState().programs
        const mockOnChange = jest.fn((programs) => {
            console.log(programs)
            return programs.map((item: { value: string }) => item.value)
        })
        renderWithProviders(
            <ProgramSelect
                statePrograms={mockStatePrograms}
                programIDs={[]}
                onChange={mockOnChange}
            />
        )
        const combobox = await screen.findByRole('combobox')

        await selectEvent.openMenu(combobox)

        await waitFor(() => {
            expect(screen.getByText('MSHO')).toBeInTheDocument()
            expect(screen.getByText('SNBC')).toBeInTheDocument()
            expect(screen.getByText('PMAP')).toBeInTheDocument()
            expect(screen.getByText('MSC+')).toBeInTheDocument()
        })
    })
    it('can select and return programs in an array', async () => {
        const mockStatePrograms = mockMNState().programs
        const mockOnChange = jest.fn((programs) => {
            console.log(programs)
            return programs.map((item: { value: string }) => item.value)
        })
        renderWithProviders(
            <ProgramSelect
                statePrograms={mockStatePrograms}
                programIDs={[]}
                onChange={mockOnChange}
            />
        )
        const combobox = await screen.findByRole('combobox')

        await selectEvent.openMenu(combobox)

        await waitFor(() => {
            expect(screen.getByText('MSHO')).toBeInTheDocument()
            expect(screen.getByText('SNBC')).toBeInTheDocument()
            expect(screen.getByText('PMAP')).toBeInTheDocument()
            expect(screen.getByText('MSC+')).toBeInTheDocument()
        })

        await selectEvent.select(combobox, 'MSHO')
        await selectEvent.openMenu(combobox)
        await selectEvent.select(combobox, 'SNBC')

        expect(mockOnChange.mock.calls).toHaveLength(2)
        expect(mockOnChange.mock.results[1].value).toStrictEqual([
            '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
        ])
        // in react-select, only items that are selected have a "remove item" label
        expect(screen.getByLabelText('Remove SNBC')).toBeInTheDocument()
        expect(screen.getByLabelText('Remove MSHO')).toBeInTheDocument()
    })
    it('can remove all selected programs', async () => {
        const mockStatePrograms = mockMNState().programs
        const mockOnChange = jest.fn((programs) => {
            return programs.map((item: { value: string }) => item.value)
        })
        renderWithProviders(
            <ProgramSelect
                statePrograms={mockStatePrograms}
                programIDs={[
                    '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                    'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                ]}
                onChange={mockOnChange}
            />
        )
        const combobox = await screen.findByRole('combobox')

        await selectEvent.openMenu(combobox)

        await waitFor(() => {
            expect(screen.getByText('MSHO')).toBeInTheDocument()
            expect(screen.getByText('SNBC')).toBeInTheDocument()
            expect(screen.getByText('PMAP')).toBeInTheDocument()
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
