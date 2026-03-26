import React from 'react'

export default {
    title: 'Styles/Typography',
    parameters: {
        docs: {
            description: {
                component:
                    'Shared heading and body typography styles from global CSS. Use semantic heading tags by default, and apply utility classes only when the design calls for a different visual treatment.',
            },
        },
    },
}

const sectionStyle = {
    display: 'grid',
    gap: '1rem',
}

const sampleStyle = {
    display: 'grid',
    gap: '0.25rem',
}

const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: 700,
}

export const HeadingScale = (): React.ReactElement => (
    <div style={sectionStyle} className="typography-v2">
        <div style={sampleStyle}>
            <span style={labelStyle}>
                {'<h1 className="mcr-homepage-h1-bold">'}
            </span>
            <h1 className="mcr-homepage-h1-bold">
                Homepage heading bold variant
            </h1>
        </div>
        <div style={sampleStyle}>
            <span style={labelStyle}>{'<h2 className="mcr-homepage-h2">'}</span>
            <h2 className="mcr-homepage-h2">Homepage heading</h2>
        </div>
        <div style={sampleStyle}>
            <span style={labelStyle}>
                {'<h2 className="mcr-homepage-h2-bold">'}
            </span>
            <h2 className="mcr-homepage-h2-bold">
                Homepage heading bold variant
            </h2>
        </div>
        <div style={sampleStyle}>
            <span style={labelStyle}>{'<h1>'}</span>
            <h1>Section 1 heading</h1>
        </div>
        <div style={sampleStyle}>
            <span style={labelStyle}>{'<h2>'}</span>
            <h2>Section heading</h2>
        </div>
        <div style={sampleStyle}>
            <span style={labelStyle}>{'<h3>'}</span>
            <h3>Subsection heading</h3>
        </div>
        <div style={sampleStyle}>
            <span style={labelStyle}>{'<h4>'}</span>
            <h4>Detail heading</h4>
        </div>
        <div style={sampleStyle}>
            <span style={labelStyle}>{'<h4 className="mcr-h4-bold">'}</span>
            <h4 className="mcr-h4-bold">Detail heading bold variant</h4>
        </div>
        <div style={sampleStyle}>
            <span style={labelStyle}>{'<h5>'}</span>
            <h5>Support heading</h5>
        </div>
        <div style={sampleStyle}>
            <span style={labelStyle}>{'<h6>'}</span>
            <h6>Eyebrow heading</h6>
        </div>
        <div style={sampleStyle}>
            <span style={labelStyle}>{'<p className="mcr-body">'}</span>
            <p className="mcr-body">Body text style</p>
        </div>
        <div style={sampleStyle}>
            <span style={labelStyle}>{'<p className="mcr-body-bold">'}</span>
            <p className="mcr-body-bold">Body bold style</p>
        </div>
        <div style={sampleStyle}>
            <span style={labelStyle}>{'<span className="mcr-tag">'}</span>
            <span className="mcr-tag">Tag label</span>
        </div>
        <div style={sampleStyle}>
            <span style={labelStyle}>{'<span className="mcr-tag-bold">'}</span>
            <span className="mcr-tag-bold">Tag label bold</span>
        </div>
    </div>
)
