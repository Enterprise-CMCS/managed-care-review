# API JWT Security

In order to allow access to our API from automated 3rd party API clients instead of through the standard IDM/Cognito/React path, we are going to open up a new endpoint that uses a Lambda Authorizer to check the validity of a JWT bearer token to perform Authentication. 

A [JWT](https://jwt.io/introduction) (pronounced "jot") is a small JSON object with standard keys that is signed with a secret controlled by the server. 

The JWT will be sent in a Bearer header. 

The JWT will be validated against a secret stored in Secret Manager. 

The JWT will have 3 claims in it: 
* issuer (iss): a string unique to this environment and application, ensuring that tokens aren't used across environments and identifying the environment it comes from.
* subject (sub): the ID of the user the JWT belongs to and authorizes as
* expiration (exp): the unix time stamp after which this JWT is no longer valid

These are all standard fields and are explicitly accounted for in the JWT library we are using


