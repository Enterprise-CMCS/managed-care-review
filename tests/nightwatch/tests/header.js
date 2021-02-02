module.exports = {
  'Header is present' (browser){
      console.log(process.env.APPLICATION_ENDPOINT);
      browser
        .url (`${process.env.APPLICATION_ENDPOINT}`)
        .waitForElementVisible('.App')
        .assert.elementPresent('.usa-header h1')
        .assert.elementPresent('nav')
        .saveScreenshot('tests_output/header_is_present_screenshot.png')
  }
}
