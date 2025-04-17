# Naming Conventions
We need more these. Here is where we are at so far:


## `app-api`
We use same naming conventions as rails/active record for our resolvers and store methods.

GraphQL Resolvers:

-   fetchFoo (this is the only real deviation. showFoo comes from server side rendering which feels off here)
-   createFoo
-   updateFoo
-   deleteFoo
-   indexFoos

Store Methods:

-   findFoo
-   findFooByBar
-   findAllFoo
-   insertFoo
-   updateFoo
-   destroyFoo

VariableNames:

-   always capitalize ID, so programID not programId
