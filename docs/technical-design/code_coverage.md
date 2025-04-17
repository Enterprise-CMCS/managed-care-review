# Code coverage reports

## Overview

Code coverage is a measure of the percentage of code that is exercised during testing. Detailed coverage reports can identify which specific lines of code are being tested. In order for coverage to be measured, the code must first be instrumented. Tools that instrument code effectively wrap it in functions that increment a counter when that code is run. Code coverage generators take those counts and turn them into reports about covered and uncovered lines of code.

MC-Review has two testing systems that run each time our code is deployed. The first, managed by the Jest test runner, includes our web and api unit tests. The second is managed by Cypress, which is an end-to-end testing tool. Jest and Cypress can each be configured to output coverage reports[^1], but there's no standard way to combine those reports to determine which lines of code are tested by the entire suite of tests, which is to say, by Jest _or_ Cypress. We needed a way to measure our total test coverage, by combining the reports from the two systems.

This document will describe how those reports are merged. We do this in two ways--locally in package.json, and in CI in deploy.yml.

## package.json

We use a standard tool called [Istanbul](https://istanbul.js.org/) to generate coverage reports. Its command line utility is called [nyc](https://github.com/istanbuljs/nyc). nyc does the heavy lifting of generating and combining reports, and we have a series of npm scripts to run the reports and put them where nyc can access them.

In the root `package.json` there's a series of scripts to run tests and generate reports. One thing to understand is that for any given npm script "myscript", another script prepended with "pre" (premyscript) will run before it, and a script prepended with "post" will run after it (postmyscript). So if I have

```
{
"myscript": "echo main script",
"premyscript": "echo pre script",
"postmyscript" "echo post script"
}
```

then running `pnpm run myscript` will output

```
pre script
main script
post script
```

In the great tangle of our package.json, `test:coverage` is the command that kicks off our combined report generation. The scripts will run in this order.

```
pretest:coverage
test:coverage
posttest:coverage
prereport:combined
precombine:reports
precopy:reports
mkdir:reports
copy:reports
combine:reports
report:combined
```

Some of these commands are self-explanatory; they make directories and copy files. Some of the scripts call `nyc` commands that could use a bit of explanation. As an aside, this is just one way to combine the reports, and we could (and probably should) refactor this into a standalone script that could run locally and in CI.

## instanbul/nyc

### nyc report

`nyc` can output reports in [several formats](https://istanbul.js.org/docs/advanced/alternative-reporters/). In the script `report:combined` we call `nyc report --reporter` with a few options: `lcov`, `text`, and `json-summary`.

-   `lcov` produces both a raw accounting of line coverage and a pretty html report that we can click into for detailed coverage information
-   `text` is a tabular coverage report of the kind we see in the terminal
-   `json-summary` is used to create the base reports that `nyc report` can act on

### nyc merge

Once we have json reports from Jest (`coverage-final` for Cypress and web tests, `from-jest` for the api), we can merge them together into one comprehensive report. This happens in the script `combine:reports` by using `nyc merge`. Those reports can be accessed in the `coverage-all` directory.

## deploy.yml

The `nyc` commands to combine and publish reports in CI are the same as those we use locally, but there are some wrinkles to be aware of.

In CI, we run our Cypress tests in parallel in order to save time. Under the `Cypress` key in deploy.yml, `matrix` has a subkey set to an array. The length of the array determines the number of parallel processes that will be spawned. Each process will generate its own coverage report. Those coverage reports themselves need to be merged into one before they can be merged with the unit test reports.

Under the `Create combined test coverage report` key in deploy.yml, after some mkdir setup, you can see that we copy all the generated Cypress coverage files into one directory, and then run `npx nyc merge` on that directory. (`npx` is used to run commands from npm packages without permanently installing them.)

Next we copy the unit test reports into the same directory, and run `npx nyc merge` again. Then, as in our package.json, we generate the reports.

These reports are then uploaded as [workflow artifacts](https://docs.github.com/en/actions/managing-workflow-runs/downloading-workflow-artifacts) under `Upload combined test coverage`. This zip file can be downloaded from the github action summary for the `deploy` workflow (scroll to bottom of page).

One additional step in CI is to publish the coverage reports to CodeClimate. In deploy.yml, there are three "publish code coverage" steps, which specify the location of the reports for web, api, and cypress, as well as our CodeClimate reporter ID. We can access the CodeClimate report by clicking the "test coverage" button at the top of the README at the root of the repo.

### notes

[^1]: This is trivial to do in Jest by passing a `--coverage` flag, and more involved in Cypress, as implemented in parts of [this pull request](https://github.com/Enterprise-CMCS/managed-care-review/pull/1119/files).
