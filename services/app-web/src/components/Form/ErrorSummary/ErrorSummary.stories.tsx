import { Story } from '@storybook/react'

import { ErrorSummary, ErrorSummaryProps } from './ErrorSummary'

export default {
    title: 'Components/Forms/ErrorSummary',
    component: ErrorSummary,
}

const Template: Story<ErrorSummaryProps> = (args) => <ErrorSummary {...args} />

export const ErrorSummaryDefault = Template.bind({})
ErrorSummaryDefault.args = {
    errors: {"title" : "You must provide a title"}
}

export const ErrorSummaryEmpty = Template.bind({})
ErrorSummaryEmpty.args = {
    errors: {}
}

export const ErrorSummaryMultiple = Template.bind({})
ErrorSummaryMultiple.args = {
    errors: {
        title: "You must provide a title",
        subtitle: "You must provide a subtitle",
        summary: "You must provide a summary"
    }
}