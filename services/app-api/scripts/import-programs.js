const csv = require('csv-parser');
const fs = require('fs');
const slugify = require("slugify")

const stateNames = { "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming", "DC": "Washington, DC", "PR": "Puerto Rico" };


// Create a URL-safe slug for a program using its name.
//
// This is fairly specific to the incoming dataset. Additional punctuation appearing in that input
// might 
function generateSlug(name) {
    return slugify(name, {
        lower: true,
        strict: true,
    })
}

const states = {};
const programIDs = [];

fs.createReadStream('State programs, population, and nicknames.xlsx - Sheet1.csv')
    .pipe(csv())
    .on('data', (data) => {
        const code = data.State.trim();
        if (!states[code]) {
            states[code] = {
                name: stateNames[code],
                programs: [],
                code
            };
        }

        const id = generateSlug(data.Program)

        if (programIDs.includes(id)) {
            console.error(`Error processing row:\n\n${JSON.stringify(data)}\n`)
            console.error(`ID '${id}' is already in use! The state containing the already existing ID is:\n`)

            for (const [_, definition] of Object.entries(states)) {
                const collidingProgram = definition.programs.find(program => program.id === id)
                if (collidingProgram) {
                    console.error(JSON.stringify(definition))
                }
            }
            process.exit(1)
        } else {
            states[code].programs.push({
                id: id,
                fullName: data.Program,
                name: data.Nickname,
            })
            programIDs.push(id);
        }
    })
    .on('end', () => {
        const results = {
            states: Object.values(states)
        }
        console.log(JSON.stringify(results, null, 2));
    });