import React from 'react'

const extractText = (node: React.ReactNode | string): string => {
    if (typeof node === 'string') return node
    if (Array.isArray(node)) return node.map(extractText).join(' ')
    if (React.isValidElement<{ children?: React.ReactNode }>(node))
        return extractText(node.props.children)
    return ''
}

export { extractText }
