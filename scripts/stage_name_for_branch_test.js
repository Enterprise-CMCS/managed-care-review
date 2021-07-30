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
        ['wml-foo-bar', 'wml-foo-bar'],
        ['mIxEdCaSe', 'mixedcase'],
        ['ch@ra☃️ters', 'chraters'],
        [
            'a-very-very-long-so-long-too-long-branch-name',
            'a-very-very-long-so-long-3de28',
        ],
        [
            'dependabot/github_actions/actions/setup-node-2.3.0',
            'dependabot-github-action-8e1c0',
        ],
        ['this/that', 'this-that'],
        ['under_score', 'under-score'],
        ['under-hyphen-_score', 'under-hyphen-score'],
        ['under__under____score', 'under-under-score'],
        ['thirty-characters-is-just-fine', 'thirty-characters-is-just-fine'],
        ['thirty-one-is-one-char-too-many', 'thirty-one-is-one-char-t-faa2e'],
        ['jf-items-amended-definitions-help', 'jf-items-amended-definit-8ba2a'],
        ['jf-contract-rate-details-reorder', 'jf-contract-rate-details-a349e'],
        ['two3four5', 'two3four5'],
        [
            'dependabot/npm_and_yarn/testing-library/cypress-8.0.0',
            'dependabot-npm-and-yarn-bf9f1',
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
    const errorCases = ['3fourfive', '-start-with', ''];

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
