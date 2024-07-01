import React from 'react'
import { StoryFn } from '@storybook/react'
import { Modal, ModalProps } from './Modal';

export default {
    title: 'Components/Modal/Modal',
    component: Modal,
}

const Template: StoryFn<ModalProps> = (args) => <Modal {...args} />

export const ModalShow = Template.bind({})
ModalShow.args = {
    modalHeading: 'Test Modal Title',
    id: 'test-modal',
    children: [
        <div style={{ flexDirection: 'column', display: 'flex', padding: 10}}>
            <label htmlFor={'textarea1'}>Text Box 1</label>
            <textarea id={'textarea1'}/>
        </div>
    ]
}
