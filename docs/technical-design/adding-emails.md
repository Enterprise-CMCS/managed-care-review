# Adding state analyst emails to parameter store

When states make submissions through MC-Review, we use email to notify the analysts at CMS who cover those states. Those analysts' email addresses are currently kept in AWS Parameter Store, organized by state. When new states onboard to MC-Review, we have to add the relevant analysts' emails to the store.

What follow are step-by-step instructions on how to add those addresses. This procedure needs to be followed for _all three environments_: `dev`, `val` (called `impl` in our AWS dashboard), and `prod`. Prod has a small wrinkle that will be mentioned below.

1. **Connect to the CMS VPN**. We have multiple ways to connect to the CMS VPN, and teammates can point you to those instructions if you need them. You must to be connected to the CMS VPN to do anything with the MC-Review AWS settings.
1. **Go to https://cloudtamer.cms.gov** in your browser. Log in with your EUA credentials.
1. **Select the environment you'll be working in**, dev, impl, or prod. You want the admin role and web access, not read-only or access keys.
1. In AWS, search for **Systems Manager**.
1. Within Systems Manager, look for **Parameter Store** (probably in the left sidebar). You'll see many configuration parameters. The ones you want to emulate will have the form `/configuration/STATE_CODE/stateanalysts/email`.
1. [in lower environments] Click into an existing parameter and **copy the contents of the Value field**.  Then, navigate back to the parameter list.
1.  **Click `Create parameter`**.
1. **Fill in the Name field** using the same format as `/configuration/AZ/stateanalysts/email`, **replacing the state code with the relevant state**. Note that there's no trailing slash.
1. **Leave the Description blank and Tier as Standard**.
1. **Change the Type to `StringList`** because often there's more than one email that we want to send to.
1. **Leave the `Data type` as `text`**.
1. [in lower environments] **Paste the value you previously copied from an existing state's configuration** Be sure to **change the state details** to allow better testing.
2. [in production] **Enter the specific state analyst emails as a comma-separated list with no spaces**, like `jim.smith@cms.hhs.gov,wendy.williams@cms.hhs.gov`.  REMEMBER, IN PROD, YOU WILL BE ENTERING ACTUAL EMAIL ADDRESSES
1. Once you've entered the information, **click Create parameter**.
2. Make sure you [document](../Configuration.md) any new email configuration you create (if it is not a state email) so others know what is intended by that variable.

Once you've done that for all three environments, you're done.
