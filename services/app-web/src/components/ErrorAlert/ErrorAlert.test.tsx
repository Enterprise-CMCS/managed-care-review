import { screen } from '@testing-library/react'
import { ErrorAlert } from './ErrorAlert'
import { renderWithProviders } from '../../testHelpers'
import { useStringConstants } from '../../hooks/useStringConstants'

test('renders default content when no props present', () => {
    renderWithProviders(<ErrorAlert />)
    expect(
        screen.getByRole('heading', {
            name: 'System error',
        })
    ).toBeInTheDocument()
    expect(
        screen.getByText(/We're having trouble loading this page/)
    ).toBeInTheDocument()
})

test('renders custom heading', () => {
    renderWithProviders(<ErrorAlert heading="Cool error" />)
    const testText = 'Cool error'
    expect(screen.getByRole('heading', { name: testText })).toBeInTheDocument()
    expect(
        screen.getByText(/We're having trouble loading this page/)
    ).toBeInTheDocument()
})

test('renders custom message', async () => {
    const testText = 'Something else went wrong'
    renderWithProviders(<ErrorAlert message={testText} />)
    await expect(screen.getByText(testText)).toBeInTheDocument()
    expect(screen.getByText(/Something else went wrong/)).toBeInTheDocument()
    expect(
        screen.queryByText("We're having trouble loading this page.")
    ).toBeNull()
    expect(screen.getByText(/Something else went wrong/)).not.toHaveStyle(
        'font-weight: bold'
    )
})

test('renders with custom styles', async () => {
    const testText = 'custom styles'
    renderWithProviders(
        <ErrorAlert message={testText} className={'test-class'} />
    )
    await expect(screen.getByText(testText)).toBeInTheDocument()
    expect(screen.queryByTestId('error-alert')).toHaveClass('test-class')
})
test('displays email support link mailto link with default remediation', () => {
    const stringConstants = useStringConstants()
    renderWithProviders(<ErrorAlert remediation="DEFAULT" />)
    const feedbackLink = screen.getByRole('link', {
        name: `email the help desk`,
    })
    expect(feedbackLink).toHaveAttribute(
        'href',
        stringConstants.MAIL_TO_SUPPORT_HREF
    )
})

test('displays message with bold text when withEmphasis is used', () => {
    renderWithProviders(<ErrorAlert remediation="DEFAULT" withEmphasis />)
    expect(
        screen.queryByText("We're having trouble loading this page.")
    ).toHaveStyle('font-weight: bold')
    expect(screen.queryByText('email the help desk')).not.toHaveStyle(
        'font-weight: bold'
    )
})
