#!/bin/bash
# CDK Development Toolkit - All-in-one development utility
# Consolidates preflight, deploy, clean, and validation functionality

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CDK_DIR="$SCRIPT_DIR/.."
REPO_ROOT="$CDK_DIR/../.."

# Show usage information
show_usage() {
    echo -e "${BLUE}CDK Development Toolkit${NC}"
    echo ""
    echo "Usage: ./dev-toolkit.sh <command> [options]"
    echo ""
    echo "Commands:"
    echo -e "  ${GREEN}preflight${NC}           Run preflight checks before CDK operations"
    echo -e "  ${GREEN}deploy <stage> [stack]${NC} Deploy CDK infrastructure"
    echo -e "  ${GREEN}clean [--full]${NC}       Clean build artifacts and CDK output"
    echo -e "  ${GREEN}validate <stage>${NC}     Validate environment for specific stage"
    echo ""
    echo "Examples:"
    echo "  ./dev-toolkit.sh preflight"
    echo "  ./dev-toolkit.sh deploy dev"
    echo "  ./dev-toolkit.sh deploy dev MCR-Foundation-dev-cdk"
    echo "  ./dev-toolkit.sh clean --full"
    echo "  ./dev-toolkit.sh validate prod"
    echo ""
    echo "Stages: dev, val, prod"
}

# Preflight checks - ensures all prerequisites are met
run_preflight() {
    echo -e "${YELLOW}🚀 Running CDK deployment preflight checks...${NC}"
    echo ""

    # Check 1: Directory structure
    echo -e "${YELLOW}Checking directory structure...${NC}"
    if [ ! -d "$REPO_ROOT/packages" ]; then
        echo -e "${RED}❌ ERROR: Cannot find packages directory. Are you in the correct repository?${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Directory structure is valid${NC}"

    # Check 2: Critical packages are built
    echo -e "${YELLOW}Checking package builds...${NC}"
    PACKAGES=("hpp" "common" "constants" "dates" "helpers")
    MISSING_BUILDS=()

    for pkg in "${PACKAGES[@]}"; do
        if [ -d "$REPO_ROOT/packages/$pkg" ]; then
            if [ ! -d "$REPO_ROOT/packages/$pkg/build" ] && [ ! -d "$REPO_ROOT/packages/$pkg/dist" ]; then
                MISSING_BUILDS+=("$pkg")
            fi
        fi
    done

    if [ ${#MISSING_BUILDS[@]} -gt 0 ]; then
        echo -e "${RED}❌ ERROR: The following packages are not built: ${MISSING_BUILDS[*]}${NC}"
        echo -e "${YELLOW}💡 Solution: Run 'pnpm build:packages' from the repository root${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ All critical packages are built${NC}"

    # Check 3: Prisma client
    echo -e "${YELLOW}Checking Prisma client...${NC}"
    if [ ! -d "$REPO_ROOT/services/app-api/node_modules/.prisma/client" ] && [ ! -d "$REPO_ROOT/node_modules/.prisma/client" ]; then
        echo -e "${YELLOW}⚠️  WARNING: Prisma client not generated${NC}"
        echo -e "${YELLOW}💡 Run 'pnpm -r generate' from repository root for Prisma functions${NC}"
    else
        echo -e "${GREEN}✅ Prisma client is generated${NC}"
    fi

    # Check 4: CDK dependencies
    echo -e "${YELLOW}Checking CDK dependencies...${NC}"
    if [ ! -d "$CDK_DIR/node_modules" ]; then
        echo -e "${RED}❌ ERROR: CDK dependencies not installed${NC}"
        echo -e "${YELLOW}💡 Solution: Run 'pnpm install' in services/infra-cdk${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ CDK dependencies are installed${NC}"

    # Check 5: Workspace dependencies
    echo -e "${YELLOW}Checking workspace dependencies...${NC}"
    if [ ! -d "$REPO_ROOT/node_modules" ]; then
        echo -e "${RED}❌ ERROR: Workspace dependencies not installed${NC}"
        echo -e "${YELLOW}💡 Solution: Run 'pnpm install' from repository root${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Workspace dependencies are installed${NC}"

    # Check 6: HPP package exports (critical validation)
    echo -e "${YELLOW}Checking HPP package exports...${NC}"
    if [ -f "$REPO_ROOT/packages/hpp/build/proto/healthPlanFormDataProto/zodSchemas.js" ]; then
        if ! grep -q "rateMedicaidPopulationsSchema" "$REPO_ROOT/packages/hpp/build/proto/healthPlanFormDataProto/zodSchemas.js"; then
            echo -e "${RED}❌ ERROR: rateMedicaidPopulationsSchema not found in HPP exports${NC}"
            echo -e "${YELLOW}💡 Solution: Run 'pnpm build:packages' from repository root${NC}"
            exit 1
        fi
        echo -e "${GREEN}✅ HPP package exports are valid${NC}"
    else
        echo -e "${YELLOW}⚠️  WARNING: Cannot verify HPP exports - file not found${NC}"
    fi

    # Check 7: AWS credentials
    echo -e "${YELLOW}Checking AWS credentials...${NC}"
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  WARNING: AWS credentials not configured or expired${NC}"
        echo -e "${YELLOW}💡 Configure AWS credentials before deployment${NC}"
    else
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        echo -e "${GREEN}✅ AWS credentials configured (Account: $ACCOUNT_ID)${NC}"
    fi

    # Check 8: Layer optimization status
    echo -e "${YELLOW}Checking Lambda layer optimization...${NC}"
    if [ -f "$CDK_DIR/scripts/build-layer.sh" ]; then
        if [ -f "$CDK_DIR/lambda-layers-prisma-client-engine/nodejs.tar.gz" ] && [ -f "$CDK_DIR/lambda-layers-prisma-client-migration/nodejs.tar.gz" ]; then
            echo -e "${GREEN}✅ Optimized Lambda layers are available${NC}"
        else
            echo -e "${YELLOW}⚠️  INFO: Optimized layers not built yet${NC}"
            echo -e "${YELLOW}💡 Layers will be built during CI deployment or run './scripts/build-layer.sh all'${NC}"
        fi
    fi

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}🎉 All preflight checks passed!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "✅ Ready for CDK operations"
}

# Deploy infrastructure
run_deploy() {
    local stage="$1"
    local stack="${2:-}"

    # Validate stage
    if [[ ! "$stage" =~ ^(dev|val|prod)$ ]]; then
        echo -e "${RED}❌ ERROR: Invalid stage '$stage'${NC}"
        echo "Stage must be one of: dev, val, prod"
        exit 1
    fi

    echo -e "${BLUE}🚀 Deploying CDK infrastructure for stage: $stage${NC}"
    echo ""

    # Load environment variables if available
    if [ -f "$CDK_DIR/.env.$stage" ]; then
        echo -e "${GREEN}Loading environment variables from .env.$stage${NC}"
        set -a
        source "$CDK_DIR/.env.$stage"
        set +a
    else
        echo -e "${YELLOW}⚠️  No .env.$stage file found - using environment defaults${NC}"
    fi

    # Check AWS credentials
    echo -e "${YELLOW}Checking AWS credentials...${NC}"
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        echo -e "${RED}❌ ERROR: AWS credentials not configured${NC}"
        exit 1
    fi

    # Build TypeScript
    echo -e "${YELLOW}Building TypeScript...${NC}"
    cd "$CDK_DIR"
    pnpm run build

    # Run tests
    echo -e "${YELLOW}Running tests...${NC}"
    pnpm test

    # Synthesize CloudFormation
    echo -e "${YELLOW}Synthesizing CloudFormation templates...${NC}"
    pnpm cdk synth --context stage="$stage"

    # Deploy
    if [ -z "$stack" ]; then
        echo -e "${GREEN}Deploying all stacks for $stage...${NC}"
        pnpm cdk deploy --all --context stage="$stage" --require-approval never
    else
        echo -e "${GREEN}Deploying $stack...${NC}"
        pnpm cdk deploy "$stack" --context stage="$stage" --require-approval never
    fi

    echo ""
    echo -e "${GREEN}🎉 Deployment complete for $stage!${NC}"
}

# Clean build artifacts and CDK output
run_clean() {
    local full_clean="$1"

    echo -e "${YELLOW}🧹 Cleaning up CDK artifacts...${NC}"
    echo ""

    cd "$CDK_DIR"

    # Remove CDK output directory
    if [ -d "cdk.out" ]; then
        echo "Removing cdk.out directory..."
        rm -rf cdk.out
    fi

    # Remove TypeScript build artifacts
    echo "Removing TypeScript build artifacts..."
    find . -name "*.js" -not -path "./node_modules/*" -not -name "jest.config.js" -delete 2>/dev/null || true
    find . -name "*.d.ts" -not -path "./node_modules/*" -delete 2>/dev/null || true
    find . -name "*.js.map" -not -path "./node_modules/*" -delete 2>/dev/null || true

    # Full cleanup if requested
    if [ "$full_clean" == "--full" ]; then
        echo -e "${YELLOW}Full cleanup requested...${NC}"
        
        if [ -d "node_modules" ]; then
            echo "Removing node_modules..."
            rm -rf node_modules
        fi
        
        if [ -d "coverage" ]; then
            echo "Removing coverage directory..."
            rm -rf coverage
        fi
        
        if [ -d ".nyc_output" ]; then
            echo "Removing .nyc_output directory..."
            rm -rf .nyc_output
        fi

        # Remove layer build artifacts
        echo "Removing layer build artifacts..."
        rm -rf lambda-layers-*/nodejs 2>/dev/null || true
        rm -f lambda-layers-*/nodejs.tar.gz 2>/dev/null || true
        rm -rf layer-artifacts 2>/dev/null || true
    fi

    echo ""
    echo -e "${GREEN}🎉 Cleanup complete!${NC}"
    
    if [ "$full_clean" != "--full" ]; then
        echo -e "${YELLOW}💡 Tip: Use './dev-toolkit.sh clean --full' to also remove node_modules and layers${NC}"
    fi
}

# Validate environment for specific stage
run_validate() {
    local stage="$1"

    # Validate stage
    if [[ ! "$stage" =~ ^(dev|val|prod)$ ]]; then
        echo -e "${RED}❌ ERROR: Invalid stage '$stage'${NC}"
        echo "Stage must be one of: dev, val, prod"
        exit 1
    fi

    echo -e "${BLUE}🔍 Validating environment for stage: $stage${NC}"
    echo ""

    # Check environment file
    if [ -f "$CDK_DIR/.env.$stage" ]; then
        echo -e "${GREEN}✅ Environment file .env.$stage found${NC}"
        
        # Load and validate environment variables
        set -a
        source "$CDK_DIR/.env.$stage"
        set +a
        
        echo -e "${YELLOW}Environment variables loaded:${NC}"
        grep -v '^#\|^$' "$CDK_DIR/.env.$stage" | while IFS= read -r line; do
            key=$(echo "$line" | cut -d'=' -f1)
            echo "  ✓ $key"
        done
    else
        echo -e "${YELLOW}⚠️  No .env.$stage file found${NC}"
        echo -e "${YELLOW}💡 Create .env.$stage with stage-specific configuration${NC}"
    fi

    # Stage-specific validations
    case "$stage" in
        "prod")
            echo -e "${YELLOW}Production environment checks:${NC}"
            if [ -z "${PROD_AWS_ACCOUNT_ID:-}" ]; then
                echo -e "${RED}❌ PROD_AWS_ACCOUNT_ID not set${NC}"
            else
                echo -e "${GREEN}✅ PROD_AWS_ACCOUNT_ID configured${NC}"
            fi
            ;;
        "val")
            echo -e "${YELLOW}Validation environment checks:${NC}"
            if [ -z "${VAL_AWS_ACCOUNT_ID:-}" ]; then
                echo -e "${RED}❌ VAL_AWS_ACCOUNT_ID not set${NC}"
            else
                echo -e "${GREEN}✅ VAL_AWS_ACCOUNT_ID configured${NC}"
            fi
            ;;
        "dev")
            echo -e "${YELLOW}Development environment checks:${NC}"
            if [ -z "${DEV_AWS_ACCOUNT_ID:-}" ]; then
                echo -e "${RED}❌ DEV_AWS_ACCOUNT_ID not set${NC}"
            else
                echo -e "${GREEN}✅ DEV_AWS_ACCOUNT_ID configured${NC}"
            fi
            ;;
    esac

    # Check AWS credentials match expected account
    if aws sts get-caller-identity >/dev/null 2>&1; then
        CURRENT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
        echo -e "${GREEN}✅ Current AWS Account: $CURRENT_ACCOUNT${NC}"
        
        # Warn if account mismatch
        case "$stage" in
            "prod")
                if [ -n "${PROD_AWS_ACCOUNT_ID:-}" ] && [ "$CURRENT_ACCOUNT" != "${PROD_AWS_ACCOUNT_ID}" ]; then
                    echo -e "${RED}⚠️  WARNING: Current account ($CURRENT_ACCOUNT) doesn't match PROD_AWS_ACCOUNT_ID (${PROD_AWS_ACCOUNT_ID})${NC}"
                fi
                ;;
            "val")
                if [ -n "${VAL_AWS_ACCOUNT_ID:-}" ] && [ "$CURRENT_ACCOUNT" != "${VAL_AWS_ACCOUNT_ID}" ]; then
                    echo -e "${RED}⚠️  WARNING: Current account ($CURRENT_ACCOUNT) doesn't match VAL_AWS_ACCOUNT_ID (${VAL_AWS_ACCOUNT_ID})${NC}"
                fi
                ;;
            "dev")
                if [ -n "${DEV_AWS_ACCOUNT_ID:-}" ] && [ "$CURRENT_ACCOUNT" != "${DEV_AWS_ACCOUNT_ID}" ]; then
                    echo -e "${RED}⚠️  WARNING: Current account ($CURRENT_ACCOUNT) doesn't match DEV_AWS_ACCOUNT_ID (${DEV_AWS_ACCOUNT_ID})${NC}"
                fi
                ;;
        esac
    fi

    echo ""
    echo -e "${GREEN}🎉 Environment validation complete for $stage${NC}"
}

# Main execution
main() {
    if [ $# -eq 0 ]; then
        show_usage
        exit 1
    fi

    local command="$1"
    shift

    case "$command" in
        "preflight")
            run_preflight
            ;;
        "deploy")
            if [ $# -eq 0 ]; then
                echo -e "${RED}❌ ERROR: Stage not provided for deploy command${NC}"
                echo "Usage: ./dev-toolkit.sh deploy <stage> [stack]"
                exit 1
            fi
            run_deploy "$@"
            ;;
        "clean")
            run_clean "${1:-}"
            ;;
        "validate")
            if [ $# -eq 0 ]; then
                echo -e "${RED}❌ ERROR: Stage not provided for validate command${NC}"
                echo "Usage: ./dev-toolkit.sh validate <stage>"
                exit 1
            fi
            run_validate "$1"
            ;;
        "help"|"--help"|"-h")
            show_usage
            ;;
        *)
            echo -e "${RED}❌ ERROR: Unknown command '$command'${NC}"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"