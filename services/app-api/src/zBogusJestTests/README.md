Jest only [automatically summarizes][1] failures at the end of a run if you have a certain number of test files in your repo. Since our tests are mostly just api level tests we don't meet that threshold. This directory has a bunch of test files that pass as quickly as possible so that we can get error summaries at the end of a run. 

[1]: https://github.com/facebook/jest/issues/3322#issuecomment-352262415
