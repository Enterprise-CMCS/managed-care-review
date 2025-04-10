import React from 'react'
import { screen, render } from '@testing-library/react'
import { MultiColumnGrid, groupedChildren } from './MultiColumnGrid'

const createElement = (ele: string, text: string) =>
    React.createElement(ele, { key: text }, text)

const testDataOdd = [
    createElement('div', 'Row 1 Column 1'),
    createElement('div', 'Row 1 Column 2'),
    createElement('div', 'Row 2 Column 1'),
    createElement('div', 'Row 2 Column 2'),
    createElement('div', 'Row 3 Column 1'),
]

const testDataEven = [
    createElement('div', 'Row 1 Column 1'),
    createElement('div', 'Row 1 Column 2'),
    createElement('div', 'Row 2 Column 1'),
    createElement('div', 'Row 2 Column 2'),
]

const testDataMultiColumnOdd = [
    createElement('div', 'Row 1 Column 1'),
    createElement('div', 'Row 1 Column 2'),
    createElement('div', 'Row 1 Column 3'),
    createElement('div', 'Row 2 Column 1'),
    createElement('div', 'Row 2 Column 2'),
]

const testDataMultiColumnEven = [
    createElement('div', 'Row 1 Column 1'),
    createElement('div', 'Row 1 Column 2'),
    createElement('div', 'Row 1 Column 3'),
    createElement('div', 'Row 2 Column 1'),
    createElement('div', 'Row 2 Column 2'),
    createElement('div', 'Row 2 Column 3'),
]

describe('MultiColumnGrid', () => {
    it('Forms pairs of elements in an array given an array of elements', () => {
        expect(groupedChildren(2, testDataOdd)).toStrictEqual([
            [
                createElement('div', 'Row 1 Column 1'),
                createElement('div', 'Row 1 Column 2'),
            ],
            [
                createElement('div', 'Row 2 Column 1'),
                createElement('div', 'Row 2 Column 2'),
            ],
            [createElement('div', 'Row 3 Column 1')],
        ])

        expect(groupedChildren(2, testDataEven)).toStrictEqual([
            [
                createElement('div', 'Row 1 Column 1'),
                createElement('div', 'Row 1 Column 2'),
            ],
            [
                createElement('div', 'Row 2 Column 1'),
                createElement('div', 'Row 2 Column 2'),
            ],
        ])

        expect(groupedChildren(3, testDataMultiColumnOdd)).toStrictEqual([
            [
                createElement('div', 'Row 1 Column 1'),
                createElement('div', 'Row 1 Column 2'),
                createElement('div', 'Row 1 Column 3'),
            ],
            [
                createElement('div', 'Row 2 Column 1'),
                createElement('div', 'Row 2 Column 2'),
            ],
        ])

        expect(groupedChildren(3, testDataMultiColumnEven)).toStrictEqual([
            [
                createElement('div', 'Row 1 Column 1'),
                createElement('div', 'Row 1 Column 2'),
                createElement('div', 'Row 1 Column 3'),
            ],
            [
                createElement('div', 'Row 2 Column 1'),
                createElement('div', 'Row 2 Column 2'),
                createElement('div', 'Row 2 Column 3'),
            ],
        ])
    })

    it('Renders odd elements in correct row and column order with no errors', () => {
        render(<MultiColumnGrid columns={2}>{testDataOdd}</MultiColumnGrid>)

        expect(screen.getByTestId('grid-row-0')).toHaveTextContent(
            'Row 1 Column 1Row 1 Column 2'
        )
        expect(screen.getByTestId('grid-row-1')).toHaveTextContent(
            'Row 2 Column 1Row 2 Column 2'
        )
        expect(screen.getByTestId('grid-row-2')).toHaveTextContent(
            'Row 3 Column 1'
        )
    })

    it('Renders even elements in correct row and column order with no errors', () => {
        render(<MultiColumnGrid columns={2}>{testDataEven}</MultiColumnGrid>)

        expect(screen.getByTestId('grid-row-0')).toHaveTextContent(
            'Row 1 Column 1Row 1 Column 2'
        )
        expect(screen.getByTestId('grid-row-1')).toHaveTextContent(
            'Row 2 Column 1Row 2 Column 2'
        )
    })
})
