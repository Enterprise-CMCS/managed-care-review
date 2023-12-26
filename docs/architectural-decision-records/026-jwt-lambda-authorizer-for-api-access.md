---
title: Use a JWT Lambda Authorizer to enable 3rd party access to our API
---
## ADR 0026 — Use a JWT Lambda Authorizer to enable 3rd party access to our API

- Status: Decided
- Date: 2023-12-12

## Decision Drivers

We are granting another team access to our API which up until now has only been used by our very own app-web. This access pattern is very different from one of our end users. End users log in using IDM to acquire a 30 minute web session. This tool is going to be hitting our API on a regular basis indefinitely from within a CMS datacenter. We need to be able to furnish them with long lived credentials that grant them access to our API .

## Considered Options

### Lambda Authorizer for API Gateway

Create a new API gateway endpoint that uses a Lambda Authorizer to protect access to our API. API clients would send a JWT along with all requests that the authorizer would validate. 

**Pro**
* Very simple for clients to implement, just add a token that we control to the header
* expiration is built in to JWT to enforce rotation
* No need to get CMS Cloud involved to manage users/keys

**Con**
* opens up a new way to access our API not protected by AWS IAM roles
* requires changing how app-api works since there wont be cognito user information embedded in requests

### Add API IAM user with long lived creds

Ask CMS Cloud to create a user in our accounts that can have long lived AWS credentials. It's unclear if that's something they would allow, but we could ask. Then with those creds they could assume the CognitoUser role and sign requests to API gateway the same way that IDM users do.

**Pro**
* no changes to our API internals
* no changes to our API security surface

**Con**
* Clients have to figure out how to use AWS API Gateway tooling to correctly sign requests
* Unknown wether we can get what we need from CMS Cloud

### Use STS to grant Role to external IAM User Accounts

Have clients set up their own AWS IAM User in their own AWS account that they can get long lived credentials for. We can craft a trust policy that allows a user from an external AWS account to assume our CognitoUser role temporarily. Then they could sign requests the same way that IDM users do.

**Pro**
* no changes to our API internals
* no changes to our API security surface
* no need for creating our own AWS accounts with long lived credentials

**Con**
* Clients would need to set up/have their own AWS accounts & infra
* Clients have to figure out how to use AWS API Gateway tooling to correctly sign requests

## Chosen Solution

We're going to setup a Lambda Authorizer to grant access to our API. This plan provides thorough security and is simplest for our users to adopt. Plus, it gives us control over API access credentials without involving the complexity of IAM users and roles which are heavily managed. 
