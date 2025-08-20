import React, { useRef } from 'react'
import { StoryFn } from '@storybook/react'
import { Modal, ModalProps } from './Modal'
import ProvidersDecorator from '../../../.storybook/providersDecorator'
import { ModalRef, ModalToggleButton } from '@trussworks/react-uswds'

export default {
    title: 'Components/Modal',
    component: Modal,
    decorators: [ProvidersDecorator],
}

const Template: StoryFn<ModalProps> = (args) => {
    const modalRef = useRef<ModalRef>(null)
    return (
        <>
            <ModalToggleButton modalRef={modalRef} opener>
                Open default modal
            </ModalToggleButton>
            <Modal {...args} modalRef={modalRef}>
                {args.children}
            </Modal>
        </>
    )
}

export const Default = Template.bind({})
Default.args = {
    modalHeading: 'Test Modal Title',
    id: 'test-modal',
    children: [
        <div style={{ flexDirection: 'column', display: 'flex', padding: 10 }}>
            <label htmlFor={'textarea1'}>Text Box 1</label>
            <textarea id={'textarea1'} />
        </div>,
    ],
}
