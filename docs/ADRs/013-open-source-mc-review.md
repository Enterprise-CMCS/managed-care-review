# 013 — Open Source MC Review

MC Review has been closed source from the beginning of the project. We would like to open source it in compliance with the [CMS OSS Policy](https://github.com/CMSgov/cms-open-source-policy/blob/master/Policy.md). This ADR lays out our plan, addressing each requirement in the OSS Policy.

## Open Source Reasoning

There are many benefits to our code being open source. The most immediate and operational one is that open source projects do not need to pay for Github Actions minutes and as an org we have started hitting that limit for closed source projects, completely disabling our CI towards the end of the month. Other than that, there is a huge benefit to our code being open sourced in that it dramatically reduces the friction to general collaboration on the project. Being able to share our work out to folks who are not directly part of the project team without having to grant explicit access to them or to engineers they might share it with is a huge boon.

### CMS OSS Policy

The [CMS OSS Policy](https://github.com/CMSgov/cms-open-source-policy/blob/master/Policy.md) includes a number of guidelines for a project going open source. Here we’ve catalogued our implementations of those guidelines.

> _Any CMS project team that wishes to publish their code as OSS must set a clear expectation of their level of involvement in sustaining that project._

Open sourcing MC Review will have no impact on our level of involvement in sustaining this project. We are the development team and will continue as such, and CMS plans to continue staffing a development team for the life of this project. Open sourcing this project is intended to facilitate collaberation on the project and opens the door to a winder pool of contributors but is not intended to change the primary responsibilty of the project team.

> _The release process begins with a determination of if the intended software can indeed be released as OSS, considering any security and other CMS policy restrictions._

-   Based on reading this [OSS FAQ](http://dodcio.defense.gov/Open-Source-Software-FAQ/), our software meets all requirements for being open sourced.
    -   We have determined that it is in the government’s interest to do so
        -   Increasing collaboration across contracting teams
        -   Allowing for outside contribution
    -   Our project’s code was developed under contract to the government, everyone has rights to the code under the public domain
    -   No regulation restricts the release of this software.
-   We have linters that check for accidentally committing secrets to the repository, and the repository has been audited for secrets. All sensitive configuration is stored outside of our repo.

> _The project team shall utilize an existing public-facing website to convey information about the project and provide a link to the project’s GitHub repository. The project team should implement tools to support the community around an open source project, such as mailing lists, message forums, a version control, wiki, and tracking mechanisms, such as Kanban boards to track issues and bugs on the GitHub repository._

For the purposes of this project, our GitHub repository is the best public facing website available. We have the full complement of Github tooling at our disposal including version control, a wiki, and an issues list, plenty to administer an open source project of this size.

> _For every iteration of the code release, the project team must ensure that the software code is adequately peer reviewed and is free of security vulnerabilities that can be exploited by malicious actors. Until the software code is adequately reviewed, it should be either 1) maintained in an internal code repository that replicates the intended public repository or 2) checked by publicly available services providing the same functions on all code check-ins to the public source code repository. The software should also contain automated unit tests, build scripts and should be checked for software vulnerabilities, code quality and code coverage using available standard CMS tools. The code should be built with CMS’s standard continuous integration (CI) server._

We have configured Github to protect the main branch of MC Review such that the only way code can be merged there is after a PR has been approved by a contractor team member. The main branch is what is deployed, therefore all code that is released is reviewed first. Our build scripts are reviewed in the same way, and our automated unit and integration tests are also required to pass before merging. Our code quality and coverage are monitored by [Code Climate](https://codeclimate.com/). All code is built on GitHub Actions.

> _The project team should include ample documentation with the software code for increased adoption and modification by the community. The documentation should provide the information on project’s mission, philosophy, goal, design, decision-making process, product roadmap and instructions on how to submit issues, feature requests and how to contribute towards a fix or enhancements. The documentation should be accessible to the Open Source community via the repository._

We have a detailed [README.md](../../README.md) that onboards new engineers with instructions for getting their environment set up for local development and guides to many of our major dependencies.

We have a “Contributing” section to our project’s README that addresses the above.

> _CMS project teams should follow or adopt a decentralized governance model to ensure the success of the OSS as the software matures in the Open Source community. The governance model should define the team constituents, their decision-making authority and their roles to support the project in the open source community. For sustaining the project, the team, at a minimum, should define and staff the roles for active user engagement, product roadmap development, and accepting new contributions via pull-requests. These resources shall be staffed in addition to existing project team members. The project team is expected to take on the additional responsibility of encouraging meaningful engagement in the project by identifying and promoting active contributors to committer status based on the quality and quantity of code contributions and involvement in day-to-day discussions, as is the case in a meritocracy based system._

If and when MC Review develops an open source contribution network we can adopt a more formal governance process. For now, the project is governed by the contracting team at their discretion. Additionally, we require all contributors follow a code of conduct adapted from the [Contributor Covenant](https://www.contributor-covenant.org/version/2/0/code_of_conduct/).

> _License_

MC Review is already released under the public domain which is documented in our LICENSE file.
