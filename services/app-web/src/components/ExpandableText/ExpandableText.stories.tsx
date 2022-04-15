import React from 'react'
import { Story } from '@storybook/react'
import { ExpandableText, ExpandableTextProps } from './ExpandableText'
import { GridContainer } from '@trussworks/react-uswds'
import styles from './ExpandableText.module.scss'

export default {
    title: 'Components/ExpandableText',
    component: ExpandableText,
}

const longText =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet.' +
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet.' +
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet.' +
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet.' +
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet.' +
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet.' +
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum.'

const shortText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'

const Template: Story<ExpandableTextProps> = (args) => (
    <GridContainer className={styles.container}>
        <ExpandableText {...args} />
    </GridContainer>
)

export const ExpandableTextClampedToTwoLines = Template.bind({})
ExpandableTextClampedToTwoLines.args = {
    clamp: longText,
}

export const ExpandableTextClampedToFourLines = Template.bind({})
ExpandableTextClampedToFourLines.args = {
    clamp: longText,
    clampedLines: 4,
}

//On Firefox this storybook will always render the "Show More"/"Show Less" button. Because the offsetHeight is 1 less
// than scrollHeight. No clue why. This does not happen on the banner storybook components.
export const ExpandableTextNoClamp = Template.bind({})
ExpandableTextNoClamp.args = {
    clamp: shortText,
}

export const ExpandableTextWithPrefix = Template.bind({})
ExpandableTextWithPrefix.args = {
    clamp: (
        <>
            <span className="text-bold">Some bold header:&nbsp; </span>
            {longText}
        </>
    ),
}
