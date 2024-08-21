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
})

test('renders with custom styles', async () => {
    const testText = 'custom styles'
    renderWithProviders(
        <ErrorAlert message={testText} className={'test-class'} />
    )
    await expect(screen.getByText(testText)).toBeInTheDocument()
    expect(screen.queryByTestId('error-alert')).toHaveClass('test-class')
})
test('displays let us know link mailto link by default', () =>{
    const stringConstants = useStringConstants()
    renderWithProviders(
        <ErrorAlert  />
    )
    const feedbackLink = screen.getByRole('link', {
        name: `let us know`,
    })
    expect(feedbackLink).toHaveAttribute(
        'href',
        stringConstants.MAIL_TO_SUPPORT_HREF
    )
})