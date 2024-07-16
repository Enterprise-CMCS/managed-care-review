import React from 'react'
import { ExpandableText, ExpandableTextProps } from './ExpandableText'
import { GridContainer } from '@trussworks/react-uswds'

import type { StoryFn } from '@storybook/react'

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

const Template: StoryFn<
    ExpandableTextProps & React.HTMLAttributes<HTMLParagraphElement>
> = (args) => {
    const { children, clampedLines } = args
    return (
        <GridContainer className="app-container-horizontal-pad">
            <ExpandableText clampedLines={clampedLines}>
                {children}
            </ExpandableText>
        </GridContainer>
    )
}

export const ExpandableTextClampedToTwoLines = Template.bind({})
ExpandableTextClampedToTwoLines.args = {
    children: <>{longText}</>,
}

export const ExpandableTextClampedToFourLines = Template.bind({})
ExpandableTextClampedToFourLines.args = {
    clampedLines: 4,
    children: <>{longText}</>,
}

export const ExpandableTextNoClamp = Template.bind({})
ExpandableTextNoClamp.args = {
    children: <>{shortText}</>,
}

export const ExpandableTextWithPrefix = Template.bind({})
ExpandableTextWithPrefix.args = {
    children: (
        <>
            <span className="text-bold">Some bold header:&nbsp; </span>
            {longText}
        </>
    ),
}
