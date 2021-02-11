# Design Patterns
    * Testing 
        * Unit 
            * fe/be 
        * end to end 
    * Dependency Injection / Wiring 
        * Jest lets you mock imports -- figure out how that works with typescript 
    * Error handling 
        * Neverthrow? 
        * How does apollo/RQ return / discriminate errors 
        * KnownError? 
        * GOALS
            1. make it hard to ignore errors
            2. 'throw' errors if you dont' care?
                fn bar() -> Result<(), Error> {
                    let value = try!(foo);
                    // Use value ...
                }
            



    * Typescript 
        * Union types versus enums 
    * Local Dev 
        * Monorepo? 
            * https://code.visualstudio.com/docs/typescript/typescript-compiling#_using-the-workspace-version-of-typescript 
            * In Sublime Text use LSP + typescript-language-server 
        * Environment variables  
        * Editor support 
            * Types 
            * linting 
    * Logging 
        * FE Strategy for event 
        * BE strategy for requests 
    * DB 
        * End-to-end type safety 
        * Pattern that lets us swap out for pg one day 
    * APIs  
        * Api Errors 
        * Naming conventions 
    * React Components 
        * Naming conventions 
        * Composition conventions 
        * Scss scoped to component using uswds design tokens  
