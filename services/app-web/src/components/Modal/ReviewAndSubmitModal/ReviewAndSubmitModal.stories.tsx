import React from 'react'
import { Story } from '@storybook/react'
import { ReviewAndSubmitModal, ModalProps } from './ReviewAndSubmitModal';

export default {
    title: 'Components/Modal/ReviewAndSubmitModal',
    component: ReviewAndSubmitModal,
}

const Template: Story<ModalProps> = (args) => <ReviewAndSubmitModal {...args} />

export const ReviewAndSubmitModalShow = Template.bind({})
ReviewAndSubmitModalShow.args = {
    showModal: true,
    modalTitle: 'Test Modal Title',
    children: [
        <div style={{ flexDirection: 'column', display: 'flex', padding: 10}}>
            <label htmlFor={'textarea1'}>Text Box 1</label>
            <textarea id={'textarea1'}/>
        </div>
    ]
}
