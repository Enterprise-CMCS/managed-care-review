import { screen} from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers'
import { ModalOpenButton } from './ModalOpenButton'
import { createRef} from 'react'
import { type ModalRef } from '@trussworks/react-uswds'

describe('ModalOpenButton', () => {
    it('renders without errors', () => {
        const testRef =   createRef<ModalRef>()
        renderWithProviders(
            <ModalOpenButton id='123' modalRef={testRef}>submit 123</ModalOpenButton>
        )
        expect(
            screen.getByRole('button', {
                name: 'submit 123',
            })
        ).toBeInTheDocument()
    })
})
