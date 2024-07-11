import { screen } from '@testing-library/react'
import { GenericApiErrorBanner } from './GenericApiErrorBanner'
import { renderWithProviders } from '../../../testHelpers'

test('renders default content when no props present', () => {
    renderWithProviders(<GenericApiErrorBanner />)
    expect(
        screen.getByRole('heading', {
            name: 'System error',
        })
    ).toBeInTheDocument()
    expect(
        screen.getByText("We're having trouble loading this page.")
    ).toBeInTheDocument()
})

test('renders custom heading', () => {
    renderWithProviders(<GenericApiErrorBanner heading="Cool error" />)
    const testText = 'Cool error'
    expect(screen.getByRole('heading', { name: testText })).toBeInTheDocument()
    expect(
        screen.getByText("We're having trouble loading this page.")
    ).toBeInTheDocument()
})

test('renders custom message', async () => {
    const testText = 'Something else went wrong'
    renderWithProviders(<GenericApiErrorBanner message={testText} />)
    await expect(screen.getByText(testText)).toBeInTheDocument()
    expect(
        screen.queryByText("We're having trouble loading this page.")
    ).toBeNull()
})
