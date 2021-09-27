#!/usr/bin/env node

import { spawnSync } from 'child_process';

// This is a node script that tests stage_name_for_branch

function testStageNames() {
    // The Rules We Follow:
    // 1. Only lowercase alphanumeric characters and hyphens
    // 2. Minimum of 3 characters and maximum of 30
    // 3. First character must be a letter, cannot end with a hyphen or contain two consecutive hyphens

    const tests = [
        ['main', 'main'],
        ['wml-foo-bar', 'wmlfoobar'],
        ['mIxEdCaSe', 'mixedcase'],
        ['ch@ra☃️ters', 'chraters'],
        [
            'a-very-very-long-so-long-too-long-branch-name',
            'averyverylongsolongtoolo0bb6d',
        ],
        [
            'dependabot/github_actions/actions/setup-node-2.3.0',
            'dependabotgithubactionsa291dc',
        ],
        ['this/that', 'thisthat'],
        ['under_score', 'underscore'],
        ['under-hyphen-_score', 'underhyphenscore'],
        ['under__under____score', 'underunderscore'],
        ['twentythreecharactersok', 'twentythreecharactersok'],
        ['twentyfourcharactersnope', 'twentyfourcharactersnope9497e'],
        ['jf-items-amended-definitions-help', 'jfitemsamendeddefinition19712'],
        ['two3four5', 'two3four5'],
        [
            'dependabot/npm_and_yarn/testing-library/cypress-8.0.0',
            'dependabotnpmandyarntest37b10',
        ],
        [
            'dependabot/npm_and_yarn/aws-sdk-2.991.0',
            'dependabotnpmandyarnsdk289abe',
        ],
        [
            'dependabot/npm_and_yarn/yargs-17.2.1',
            'dependabotnpmandyarnyarga596a',
        ],
    ];

    const testErrors = [];
    for (const testCase of tests) {
        const testInput = testCase[0];
        const expectedResult = testCase[1];

        const testProc = spawnSync('stage_name_for_branch.sh', [testInput]);
        // console.log(testProc)

        if (testProc.status !== 0) {
            testErrors.push(
                `Error: Got exit status ${testProc.status} for input ${testInput}`
            );
        }

        // check error code
        const result = testProc.stdout.toString().trim();
        if (result !== expectedResult) {
            testErrors.push(
                `Error: Got result ${result} for input ${testInput}. Expected: ${expectedResult}`
            );
        }
    }

    // these inputs should all error
    const errorCases = ['3fourfive', ''];

    for (const errCase of errorCases) {
        const testProc = spawnSync('stage_name_for_branch.sh', [errCase]);

        if (testProc.status === 0) {
            testErrors.push(
                `Error: Expected input "${errCase}" to result in an error`
            );
        }
    }

    if (testErrors.length !== 0) {
        for (const err of testErrors) {
            console.log(err);
        }
        process.exit(1);
    }
}

testStageNames();
