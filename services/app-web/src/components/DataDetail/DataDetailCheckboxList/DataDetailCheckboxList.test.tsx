import { render, screen } from '@testing-library/react'

import { DataDetailCheckboxList } from './DataDetailCheckboxList'

describe('DataDetailCheckboxList', () => {
    it('renders without errors', () => {
        const ValuesLookup: Record<string, string> = {
            THIS: 'this',
            THAT: 'that',
            THE_OTHER: 'the other',
        }
        render(
            <DataDetailCheckboxList
                list={['THIS', 'THAT', 'THE_OTHER']}
                dict={ValuesLookup}
            />
        )
        expect(screen.getByText(/this/)).toBeInTheDocument()
        expect(screen.getByText(/that/)).toBeInTheDocument()
        expect(screen.getByText(/the other/)).toBeInTheDocument()
    })

    it('append other reasons fields if they exist', () => {
        const ValuesLookup: Record<string, string> = {
            THIS: 'this',
            THAT: 'that',
            THE_OTHER: 'the other',
        }
        render(
            <DataDetailCheckboxList
                list={['THIS', 'THAT', 'THE_OTHER']}
                dict={ValuesLookup}
                otherReasons={[
                    'and also you forgot another important thing',
                    'etc',
                ]}
            />
        )
        expect(screen.getByText(/this/)).toBeInTheDocument()
        expect(screen.getByText(/that/)).toBeInTheDocument()
        expect(screen.getByText(/the other/)).toBeInTheDocument()
        expect(screen.getByText(/etc/)).toBeInTheDocument()
        expect(screen.getByText(/another important thing/)).toBeInTheDocument()
    })

    it('renders missing field error when list is empty by default', () => {
        const ValuesLookup: Record<string, string> = {
            THIS: 'this',
            THAT: 'that',
            THE_OTHER: 'the other',
        }
        render(<DataDetailCheckboxList list={[]} dict={ValuesLookup} />)
        expect(
            screen.getByText(/You must provide this information/)
        ).toBeInTheDocument()
    })
    it('renders em dash when displayEmptyList and list is empty', () => {
        const ValuesLookup: Record<string, string> = {
            THIS: 'this',
            THAT: 'that',
            THE_OTHER: 'the other',
        }
        render(
            <div data-testid="container">
                <DataDetailCheckboxList
                    list={[]}
                    dict={ValuesLookup}
                    displayEmptyList
                />
            </div>
        )
        expect(screen.getByText('—')).toBeInTheDocument()
    })
})
