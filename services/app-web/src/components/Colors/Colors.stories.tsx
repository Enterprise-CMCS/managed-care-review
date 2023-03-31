import React from 'react'
import colors from './Colors.module.scss'

export default {
    title: 'Global/Colors',
}

const filterGroup = (filter: string, omit?: string) =>
    Object.keys(colors).filter(
        (color) =>
            color.indexOf(filter) === 0 &&
            (omit ? color.indexOf(omit) === -1 : color)
    )

const Color = ({ color }: { color: string }) => (
    <li
        style={{
            borderRadius: '5px',
            border: '1px solid lightgray',
            padding: '8px',
            marginBottom: '12px',
        }}
    >
        <span
            style={{
                backgroundColor: colors[`${color}`],
                display: 'block',
                height: '4em',
                marginBottom: '0.3em',
                borderRadius: '5px',
            }}
        />
        <span style={{ fontFamily: 'monospace, monospace' }}>
            ${color}
            <br />
            {colors[`${color}`]}
        </span>
    </li>
)

const ColorGroup = ({ group }: { group: string[] }) => (
    <ul
        style={{
            listStyleType: 'none',
            padding: '0',
            fontSize: '14px',
        }}
    >
        {group.map((color) => (
            <Color color={color} key={`swatch_${color}`} />
        ))}
    </ul>
)

export const Colors = () => {
    return (
        <div>
            <h1>MCR Colors</h1>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '12px',
                }}
            >
                <div>
                    <h2>Primary</h2>
                    <ColorGroup group={filterGroup('mcr-primary')} />
                </div>
                <div>
                    <h2>CMS Blue</h2>
                    <ColorGroup group={filterGroup('mcr-cmsblue')} />
                </div>
                <div>
                    <h2>Cyan</h2>
                    <ColorGroup group={filterGroup('mcr-cyan')} />
                </div>
                <div>
                    <h2>Gold</h2>
                    <ColorGroup group={filterGroup('mcr-gold')} />
                </div>

                <div>
                    <h2>Gray</h2>
                    <ColorGroup group={filterGroup('mcr-gray')} />
                </div>
                <div>
                    <h2>Foundation</h2>
                    <ColorGroup group={filterGroup('mcr-foundation')} />
                </div>
            </div>

            <h1>State Colors</h1>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '12px',
                }}
            >
                <div>
                    <h2>Success</h2>
                    <ColorGroup group={filterGroup('mcr-success')} />
                </div>

                <div>
                    <h2>Error</h2>
                    <ColorGroup group={filterGroup('mcr-error')} />
                </div>
            </div>
        </div>
    )
}
