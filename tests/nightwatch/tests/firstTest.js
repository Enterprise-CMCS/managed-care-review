module.exports = {
  'My first test case' (browser){
      console.log(process.env.APPLICATION_ENDPOINT);
      browser
        .url (`${process.env.APPLICATION_ENDPOINT}`)
        .waitForElementVisible('.testcase')
        .assert.containsText(".testcase" , "Hello.")
        .saveScreenshot('tests_output/My_first_test_case_screenshot.png')
  }
}
