import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { FieldSelect } from './FieldSelect'
import { mockMNState } from '@mc-review/hpp'
import { fetchCurrentUserMock } from '@mc-review/mocks'
import { screen, waitFor } from '@testing-library/react'
import selectEvent from 'react-select-event'
import userEvent from '@testing-library/user-event'

const mockOnChange = vi.fn()
const mockSetValue = vi.fn()

// mock out formik hook as we are not testing formik
// needs to be before first describe
vi.mock('formik', () => {
    return {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-next-line
        ...vi.importActual('formik'),
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

describe('FieldSelect', () => {
    const dropdownOptions = [
        { value: 'test-id-124', label: 'MCR-MN-0005-MSC+-PMAP-SNBC' },
        { value: 'test-id-125', label: 'MCR-MN-0006-PMAP-SNBC' },
        { value: 'test-id-126', label: 'MCR-MN-0007-SNBC' },
        { value: 'test-id-127', label: 'MCR-MN-0008-MSC+' },
    ]
    const statePrograms = mockMNState().programs
    let mockOnChange = vi.fn()
    beforeEach(
        () =>
            (mockOnChange = vi.fn((programs) => {
                return programs.map((item: { value: string }) => item.value)
            }))
    )
    afterEach(() => vi.resetAllMocks())

    it('displays program options', async () => {
        renderWithProviders(
            <FieldSelect
                name="fieldSelect"
                initialValues={[]}
                dropdownOptions={dropdownOptions}
                onChange={mockOnChange}
            />
        )
        const combobox = await screen.findByRole('combobox')

        selectEvent.openMenu(combobox)

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
            <FieldSelect
                name="fieldSelect"
                initialValues={[]}
                dropdownOptions={dropdownOptions}
                onChange={mockOnChange}
            />
        )
        const combobox = await screen.findByRole('combobox')

        selectEvent.openMenu(combobox)

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
        await selectEvent.select(combobox, 'MCR-MN-0008-MSC+')

        /* I gave up trying to wait for click effects to render and tested the call itself
        the click effects are now tested in rateDetails.spec cypress tests */
        expect(mockOnChange).toHaveBeenNthCalledWith(
            1,
            expect.arrayContaining([
                expect.objectContaining({
                    value: 'test-id-124',
                }),
            ]),
            expect.anything() // This matches any received value for the second argument
        )

        expect(mockOnChange).toHaveBeenNthCalledWith(
            2,
            expect.arrayContaining([
                expect.objectContaining({
                    value: 'test-id-127',
                }),
            ]),
            expect.anything() // This matches any received value for the second argument
        )
    })

    it('can remove all selected programs', async () => {
        renderWithProviders(
            <FieldSelect
                name="fieldSelect"
                initialValues={['test-id-127', 'test-id-126']}
                dropdownOptions={dropdownOptions}
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

        selectEvent.openMenu(combobox)

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
        const removeSecond = screen.getByLabelText('Remove MCR-MN-0008-MSC+')
        await userEvent.click(removeFirst)
        await userEvent.click(removeSecond)

        /* I gave up trying to wait for click effects to render and tested the call itself
        the click effects are now tested in rateDetails.spec cypress tests */
        expect(mockOnChange).toHaveBeenNthCalledWith(
            1,
            expect.arrayContaining([
                expect.objectContaining({
                    value: 'test-id-127',
                }),
            ]),
            expect.anything() // This matches any received value for the second argument
        )

        expect(mockOnChange).toHaveBeenNthCalledWith(
            2,
            expect.arrayContaining([
                expect.objectContaining({
                    value: 'test-id-126',
                }),
            ]),
            expect.anything() // This matches any received value for the second argument
        )
    })
})
