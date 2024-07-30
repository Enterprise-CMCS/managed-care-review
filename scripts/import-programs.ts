/*  
This script is used to generate a list of MC-Review state programs. To read more about this script and why it's used see "How to update state programs" technical design docs.

To run:
 pnpm run tsc && node ./import-programs.js path/to/data.csv > ../services/app-web/src/common-code/data/statePrograms.json

The input file is expected to be a valid CSV with at least the following columns:
   1 State (two-character state code, uppercase)
   2 Program (full program name)
   3 Nickname (acronym or abbreviation e.g. "CME")

Documentation for this script can be found here:
https://github.com/Enterprise-CMCS/managed-care-review/blob/main/docs/technical-design/howto-update-state-programs.md

 Additional columns aren't used and should be ignored.
 */




import csv from 'csv-parser'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const stateNames = {
    AL: 'Alabama',
    AK: 'Alaska',
    AZ: 'Arizona',
    AR: 'Arkansas',
    AS: 'American Samoa',
    CA: 'California',
    CO: 'Colorado',
    CT: 'Connecticut',
    DE: 'Delaware',
    FL: 'Florida',
    GA: 'Georgia',
    HI: 'Hawaii',
    ID: 'Idaho',
    IL: 'Illinois',
    IN: 'Indiana',
    IA: 'Iowa',
    KS: 'Kansas',
    KY: 'Kentucky',
    LA: 'Louisiana',
    ME: 'Maine',
    MD: 'Maryland',
    MA: 'Massachusetts',
    MI: 'Michigan',
    MN: 'Minnesota',
    MS: 'Mississippi',
    MO: 'Missouri',
    MT: 'Montana',
    NE: 'Nebraska',
    NV: 'Nevada',
    NH: 'New Hampshire',
    NJ: 'New Jersey',
    NM: 'New Mexico',
    NY: 'New York',
    NC: 'North Carolina',
    ND: 'North Dakota',
    OH: 'Ohio',
    OK: 'Oklahoma',
    OR: 'Oregon',
    PA: 'Pennsylvania',
    RI: 'Rhode Island',
    SC: 'South Carolina',
    SD: 'South Dakota',
    TN: 'Tennessee',
    TX: 'Texas',
    UT: 'Utah',
    VT: 'Vermont',
    VA: 'Virginia',
    WA: 'Washington',
    WV: 'West Virginia',
    WI: 'Wisconsin',
    WY: 'Wyoming',
    DC: 'Washington, DC',
    PR: 'Puerto Rico',
}

const file = process.argv[2]

if (!file || file.trim().length === 0) {
    console.error('You must provide the path to a JSON file as an argument')
    process.exit(1)
}
if (!fs.existsSync(file)) {
    console.error(`file '${file}' could not be loaded`)
    process.exit(1)
}

type ProgramDefinition = {
    id: string
    fullName: string
    name: string
    isRateProgram: boolean
}

type StateDefinition = {
    name: string
    programs: ProgramDefinition[]
    code: string
}

const states: { [Property in keyof typeof stateNames]?: StateDefinition } = {}

fs.createReadStream(file)
    .pipe(csv())
    .on(
        'data',
        (data: {
            id: string
            State: string
            Program: string
            Nickname: string
            IsRateProgram: string
        }) => {
            const code = data.State.trim() as keyof typeof stateNames

            if (!stateNames[code]) {
                console.error(`No state name defined for state code '${code}'`)
                process.exit(1)
            }

            if (!data.id) {
                console.error('No ID set for program, make sure to set an ID in the spreadsheet', data)
                process.exit(1)
            }

            if (!states[code]) {
                states[code] = {
                    name: stateNames[code],
                    programs: [],
                    code,
                }
            }

            states[code]!.programs.push({
                id: !data.id ? uuidv4() : data.id,
                fullName: data.Program,
                name: data.Nickname,
                isRateProgram: data.IsRateProgram === 'TRUE'
            })
        }
    )
    .on('end', () => {
        const results = {
            states: Object.values(states),
        }
        console.info(JSON.stringify(results, null, 4))
    })
