import { render, screen } from '@testing-library/react'

import { DocumentTag } from './DocumentTag'

describe('DocumentTag', () => {
    it('renders without errors', async () => {
        render(<DocumentTag isShared />)

        expect(screen.getByTestId('info-tag')).toBeInTheDocument()
    })
    it('renders shared tag without errors', async () => {
        render(<DocumentTag isShared />)
        expect(screen.queryByText('NEW')).toBeNull()
        expect(screen.getByText('SHARED')).toBeInTheDocument()
    })

    it('renders new tag without errors', async () => {
        render(<DocumentTag isShared={true} />)

        expect(screen.getByText('SHARED')).toBeInTheDocument()
        expect(screen.queryByText('NEW')).toBeNull()
    })
    it('renders multiple tags when relevant', async () => {
        render(<DocumentTag isShared isNew />)

        expect(screen.getByText('SHARED')).toBeInTheDocument()
        expect(screen.getByText('NEW')).toBeInTheDocument()
    })
    it('renders nothing if no props passed', async () => {
        render(<DocumentTag data-testId="this" />)

        expect(screen.queryByTestId('info-tag')).toBeNull()
    })
})
