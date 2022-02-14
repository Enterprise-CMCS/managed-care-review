import React from 'react'
import { screen, render } from '@testing-library/react'
import { DoubleColumnRows, pairedChildren } from './DoubleColumnRows'

const createElement = (ele: string, text: string) => React.createElement(ele, { key: text }, text)

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

describe('DoubleColumnRows', () => {
    it('Forms pairs of elements in an array given an array of elements', () => {
        expect(pairedChildren(testDataOdd)).toStrictEqual([
            [
                <div key={'Row 1 Column 1'}>Row 1 Column 1</div>,
                <div key={'Row 1 Column 2'}>Row 1 Column 2</div>,
            ],
            [
                <div key={'Row 2 Column 1'}>Row 2 Column 1</div>,
                <div key={'Row 2 Column 2'}>Row 2 Column 2</div>,
            ],
            [
                <div key={'Row 3 Column 1'}>Row 3 Column 1</div>,
            ],
        ])

        expect(pairedChildren(testDataEven)).toStrictEqual([
            [
                <div key={'Row 1 Column 1'}>Row 1 Column 1</div>,
                <div key={'Row 1 Column 2'}>Row 1 Column 2</div>,
            ],
            [
                <div key={'Row 2 Column 1'}>Row 2 Column 1</div>,
                <div key={'Row 2 Column 2'}>Row 2 Column 2</div>,
            ],
        ])
    })

    it('Renders odd elements in correct row and column order with no errors', () => {
        render(
            <DoubleColumnRows>
                {testDataOdd.map(child => child)}
            </DoubleColumnRows>
        )

        expect(screen.getByTestId('grid-row-0')).toHaveTextContent('Row 1 Column 1Row 1 Column 2')
        expect(screen.getByTestId('grid-row-1')).toHaveTextContent('Row 2 Column 1Row 2 Column 2')
        expect(screen.getByTestId('grid-row-2')).toHaveTextContent('Row 3 Column 1')
    })

    it('Renders even elements in correct row and column order with no errors', () => {
        render(
            <DoubleColumnRows>
                {testDataEven.map(child => child)}
            </DoubleColumnRows>
        )

        expect(screen.getByTestId('grid-row-0')).toHaveTextContent('Row 1 Column 1Row 1 Column 2')
        expect(screen.getByTestId('grid-row-1')).toHaveTextContent('Row 2 Column 1Row 2 Column 2')
    })
})
