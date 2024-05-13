import { State } from '../../gen/gqlClient'

function mockMNState(): State {
    return {
        name: 'Minnesota',
        programs: [
            {
                id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                fullName: 'Special Needs Basic Care',
                name: 'SNBC',
                isRateProgram: false
            },
            {
                id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                fullName: 'Prepaid Medical Assistance Program',
                name: 'PMAP',
                isRateProgram: false
            },
            {
                id: 'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                fullName: 'Minnesota Senior Care Plus ',
                name: 'MSC+',
                isRateProgram: false
            },
            {
                id: '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                fullName: 'Minnesota Senior Health Options',
                name: 'MSHO',
                isRateProgram: false
            },
            {
                id: 'bab766a5-650e-4851-8fdf-6a420ffc41c1',
                fullName: 'Minnesota Special Needs Basic Care',
                name: 'SNBC',
                isRateProgram: true
            },
            {
                id: '31ddd823-7c6e-46d9-bc31-e0b7d6389a43',
                fullName: 'Prepaid Medical Assistance Program for Seniors',
                name: 'PMAP',
                isRateProgram: true
            },
        ],
        code: 'MN',
    }
}

export { mockMNState }
