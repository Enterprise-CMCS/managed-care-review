/* eslint-disable @typescript-eslint/no-var-requires */

const csv = require('csv-parser');
const fs = require('fs');
const states = {};

const stateNames = { "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming", "DC": "Washington, DC", "PR": "Puerto Rico" };

function generateID(name) {
    return name.trim().replace(/ /g, "-").toLowerCase();
}

fs.createReadStream('/Users/jimb/Downloads/State programs, population, and nicknames.xlsx - Sheet1.csv')
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

        states[code].programs.push({
            id: generateID(data.Program),
            name: data.Program,
            nickname: data.Nickname,
        })
    })
    .on('end', () => {
        const results = {
            states: Object.values(states)
        }
        console.log(JSON.stringify(results, null, 2));
    });