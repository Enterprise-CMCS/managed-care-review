module.exports = {
  'Header is present' (browser){
      console.log(process.env.APPLICATION_ENDPOINT);
      browser
        .url (`${process.env.APPLICATION_ENDPOINT}`)
        .waitForElementVisible('.App')
        .assert.elementPresent('header h1')
        .saveScreenshot('tests_output/header_is_present_screenshot.png')
  }
}
