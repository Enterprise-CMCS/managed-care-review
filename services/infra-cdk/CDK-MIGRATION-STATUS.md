# CDK Migration Status & Next Steps

## 🎯 Current Status: Ready for GraphQL Function Implementation

### ✅ **Completed Infrastructure**

#### **Core CDK Stacks (Deployed & Working)**

- ✅ **Network Stack** - VPC, security groups, subnets
- ✅ **Uploads Stack** - S3 buckets with CloudFormation exports
- ✅ **Postgres Stack** - Aurora database with logical DB manager
- ✅ **Frontend Stack** - CloudFront distribution
- ✅ **Storybook Stack** - Documentation site
- ✅ **Cognito Stack** - Authentication infrastructure
- ✅ **Lambda Layers Stack** - Prisma migration/engine layers with CloudFormation exports

#### **Lambda Functions (7/8 Complete)**

- ✅ **healthFunction** - Health check endpoint (`GET /health_check`)
- ✅ **emailSubmitFunction** - Email submission handler
- ✅ **otelFunction** - OpenTelemetry proxy (`POST /otel`)
- ✅ **thirdPartyApiAuthorizerFunction** - Custom API authorizer
- ✅ **oauthTokenFunction** - OAuth token handler (`POST /oauth/token`)
- ✅ **cleanupFunction** - RDS snapshot cleanup (scheduled 1 AM UTC, Mon-Fri)
- ✅ **migrateFunction** - Database migrations with VPC + Prisma layers
- ❌ **graphqlFunction** - **MISSING: Main GraphQL API**

#### **CI/CD Pipeline (Fully Working)**

- ✅ **GitHub Workflows**: `deploy-cdk.yml` with proper dependency order
- ✅ **Lambda Layer Build**: Downloads CI artifacts, creates CDK layers
- ✅ **Package Dependencies**: `pnpm build:packages` for workspace imports
- ✅ **Deployment Order**: Foundation → Layers → App API
- ✅ **Authentication**: GitHub OIDC with proper permissions

---

## 🚨 **Critical Missing Piece: GraphQL Function**

### **Why It's Critical**

- **Main API Backend**: Handles ALL frontend requests via GraphQL
- **Without it**: Application cannot serve API requests to frontend
- **Core functionality**: This is the heart of the entire application

### **Implementation Requirements**

#### **Function Configuration**

```typescript
this.graphqlFunction = this.createGraphqlFunction(lambdaRole, environment)
```

#### **Handler Details**

- **Handler**: `apollo_gql.gqlHandler`
- **Timeout**: 30 seconds (extended for GraphQL operations)
- **Memory**: 1024MB+
- **VPC**: Required (database access)
- **Layers**: Prisma Engine layer (for database queries)

#### **API Gateway Routes Needed**

```typescript
// Main GraphQL endpoints (IAM auth)
POST / graphql
GET / graphql

// External GraphQL endpoints (custom authorizer)
POST / v1 / graphql / external
GET / v1 / graphql / external
```

#### **Dependencies**

- ✅ **VPC Access**: Network stack exports
- ✅ **Database**: Postgres stack exports
- ✅ **Prisma Engine Layer**: Lambda layers stack exports
- ✅ **Custom Authorizer**: thirdPartyApiAuthorizerFunction (already exists)

---

## 📋 **Tomorrow's Implementation Plan**

### **Step 1: Create GraphQL Function Method**

Add `createGraphqlFunction()` method in `app-api.ts`:

- Import VPC and security groups (like migrate function)
- Import Prisma Engine layer from CloudFormation exports
- Configure extended timeout and memory
- Set up environment variables for database access

### **Step 2: Add API Gateway Routes**

Update `setupApiGatewayRoutes()` method:

- Add `/graphql` routes with IAM authentication
- Add `/v1/graphql/external` routes with custom authorizer
- Configure proper HTTP methods (GET/POST)

### **Step 3: Add Function Declaration**

- Uncomment `public readonly graphqlFunction: NodejsFunction`
- Add function instantiation in constructor
- Add CloudFormation output export

### **Step 4: Test Deployment**

- Deploy and verify function creation
- Test GraphQL endpoints respond
- Verify database connectivity through Prisma

---

## 📁 **Key Files to Edit Tomorrow**

### **Primary File**

- `services/infra-cdk/lib/stacks/app-api.ts`
    - Add `createGraphqlFunction()` method
    - Update `setupApiGatewayRoutes()`
    - Uncomment graphql function declaration

### **Reference Files**

- `services/app-api/serverless.yml` (lines 86-109) - Original GraphQL config
- `services/app-api/src/handlers/apollo_gql.ts` - Handler implementation
- Existing `createMigrateFunction()` method - VPC/layer pattern to follow

---

## 🛠 **Implementation Pattern to Follow**

The GraphQL function should follow the **same pattern** as the migrate function:

1. **Import VPC/Security Groups** from environment variables
2. **Import Prisma Engine Layer** via CloudFormation exports
3. **Configure VPC subnets** (PRIVATE_WITH_EGRESS)
4. **Extended configuration** for GraphQL workloads
5. **Environment variables** for database and application config

---

## 🚀 **After GraphQL Function**

Once GraphQL is implemented:

- ✅ **Complete CDK migration** - all critical functions deployed
- ✅ **Full application functionality** - frontend can communicate with backend
- ✅ **Production ready** - CDK infrastructure matches serverless functionality
- 🎉 **Migration complete!**

---

## 📈 **Current Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Foundation    │    │   Lambda Layers  │    │    App API      │
│                 │    │                  │    │                 │
│ • Network       │───▶│ • Prisma Migr.   │───▶│ • 7/8 Functions │
│ • Uploads       │    │ • Prisma Engine  │    │ • API Gateway   │
│ • Postgres      │    │ • OTEL (AWS)     │    │ • WAF           │
│ • Frontend      │    │                  │    │ • ❌ GraphQL    │
│ • Cognito       │    └──────────────────┘    └─────────────────┘
└─────────────────┘
```

**Status**: 🟡 **95% Complete** - Only GraphQL function missing for full functionality
