import { StoryFn } from '@storybook/react'

import { ErrorSummary, ErrorSummaryProps } from './ErrorSummary'

export default {
    title: 'Components/Forms/ErrorSummary',
    component: ErrorSummary,
}

const Template: StoryFn<ErrorSummaryProps> = (args) => <ErrorSummary {...args} />

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

const ErrorSummaryFocusIdsTemplate : StoryFn<ErrorSummaryProps> = (args) => <>
  <ErrorSummary {...args} />
  <label>Title: <input name="title"></input></label>
  <ul tabIndex={-1} id="list">
    <li>Item 1</li>
    <li>Item with error</li>
  </ul>
</>

export const ErrorSummaryFocusIds = ErrorSummaryFocusIdsTemplate.bind({})
ErrorSummaryFocusIds.args = {
    errors: {
        title: "You must provide a title",
        "#list" : "You have errors in your list",
    }
}