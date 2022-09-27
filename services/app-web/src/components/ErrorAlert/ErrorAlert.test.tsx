import { render, screen } from '@testing-library/react'
import { ErrorAlert } from './ErrorAlert'

test('renders default content when no props present', () => {
    render(<ErrorAlert />)
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
    render(<ErrorAlert heading="Cool error" />)
    const testText = 'Cool error'
    expect(screen.getByRole('heading', { name: testText })).toBeInTheDocument()
    expect(
        screen.getByText(/We're having trouble loading this page/)
    ).toBeInTheDocument()
})

test('renders custom message', async () => {
    const testText = 'Something else went wrong'
    render(<ErrorAlert message={testText} />)
    await expect(screen.getByText(testText)).toBeInTheDocument()
    expect(screen.getByText(/Something else went wrong/)).toBeInTheDocument()
    expect(
        screen.queryByText("We're having trouble loading this page.")
    ).toBeNull()
})

test('renders with custom styles', async () => {
    const testText = 'custom styles'
    render(<ErrorAlert message={testText} className={'test-class'} />)
    await expect(screen.getByText(testText)).toBeInTheDocument()
    expect(screen.queryByTestId('error-alert')).toHaveClass('test-class')
})
