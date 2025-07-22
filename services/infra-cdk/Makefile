# Managed Care Review - CDK Infrastructure Makefile
# Usage: make [target] [stage]
# Examples:
#   make synth dev
#   make deploy prod
#   make diff val

# Default stage if not provided
STAGE ?= dev

# Validate stage parameter
VALID_STAGES := dev val prod
ifeq ($(filter $(STAGE),$(VALID_STAGES)),)
$(error Invalid stage '$(STAGE)'. Valid stages are: $(VALID_STAGES))
endif

# Colors for output
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m # No Color

# Detect package manager
PNPM := $(shell which pnpm 2> /dev/null)
ifdef PNPM
	PKG_MANAGER := pnpm
	INSTALL_CMD := pnpm install
else
	PKG_MANAGER := npm
	INSTALL_CMD := npm install
endif

.PHONY: help install deps build clean test lint synth diff deploy destroy bootstrap
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "$(BLUE)Managed Care Review - CDK Infrastructure$(NC)"
	@echo "$(YELLOW)Usage: make [target] [STAGE=dev|val|prod]$(NC)"
	@echo ""
	@echo "$(GREEN)Available targets:$(NC)"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(GREEN)Examples:$(NC)"
	@echo "  make synth dev     # Synthesize CDK templates for dev stage"
	@echo "  make deploy prod   # Deploy to production"
	@echo "  make diff val      # Show diff for validation stage"

install: ## Install all dependencies (root + CDK)
	@echo "$(BLUE)Installing dependencies...$(NC)"
	@cd ../.. && $(INSTALL_CMD)
	@$(INSTALL_CMD)
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

deps: install ## Alias for install

build: install ## Build TypeScript code
	@echo "$(BLUE)Building TypeScript...$(NC)"
	@$(PKG_MANAGER) run build
	@echo "$(GREEN)✅ Build complete$(NC)"

clean: ## Clean build artifacts and node_modules
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	@$(PKG_MANAGER) run clean 2>/dev/null || rm -rf dist cdk.out .tscache
	@echo "$(GREEN)✅ Clean complete$(NC)"

test: install ## Run tests
	@echo "$(BLUE)Running tests...$(NC)"
	@$(PKG_MANAGER) run test
	@echo "$(GREEN)✅ Tests complete$(NC)"

lint: install ## Run linting
	@echo "$(BLUE)Running linter...$(NC)"
	@$(PKG_MANAGER) run lint
	@echo "$(GREEN)✅ Linting complete$(NC)"

validate: build lint test ## Run full validation (build + lint + test)
	@echo "$(GREEN)✅ Full validation complete$(NC)"

synth: build ## Synthesize CDK templates for specified stage
	@echo "$(BLUE)Synthesizing CDK for stage: $(YELLOW)$(STAGE)$(NC)"
	@$(PKG_MANAGER) run cdk synth --context stage=$(STAGE) --quiet
	@echo "$(GREEN)✅ Synth complete for $(STAGE)$(NC)"

diff: build ## Show deployment diff for specified stage
	@echo "$(BLUE)Showing diff for stage: $(YELLOW)$(STAGE)$(NC)"
	@$(PKG_MANAGER) run cdk diff --context stage=$(STAGE)

deploy: build ## Deploy to specified stage
	@echo "$(BLUE)Deploying to stage: $(YELLOW)$(STAGE)$(NC)"
	@if [ "$(STAGE)" = "prod" ]; then \
		echo "$(RED)⚠️  PRODUCTION DEPLOYMENT$(NC)"; \
		echo "$(YELLOW)Are you sure you want to deploy to production? [y/N]$(NC)"; \
		read -r confirm; \
		if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then \
			echo "$(YELLOW)Deployment cancelled$(NC)"; \
			exit 1; \
		fi; \
	fi
	@$(PKG_MANAGER) run cdk deploy --all --context stage=$(STAGE) --require-approval never
	@echo "$(GREEN)✅ Deployment complete for $(STAGE)$(NC)"

deploy-with-approval: build ## Deploy to specified stage with approval prompts
	@echo "$(BLUE)Deploying to stage: $(YELLOW)$(STAGE)$(NC) (with approval)"
	@$(PKG_MANAGER) run cdk deploy --all --context stage=$(STAGE)
	@echo "$(GREEN)✅ Deployment complete for $(STAGE)$(NC)"

destroy: ## Destroy infrastructure for specified stage
	@echo "$(RED)⚠️  DESTROYING infrastructure for stage: $(YELLOW)$(STAGE)$(NC)"
	@echo "$(YELLOW)This will permanently delete all resources. Are you sure? [y/N]$(NC)"
	@read -r confirm; \
	if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then \
		echo "$(YELLOW)Destroy cancelled$(NC)"; \
		exit 1; \
	fi
	@$(PKG_MANAGER) run cdk destroy --all --context stage=$(STAGE) --force
	@echo "$(GREEN)✅ Destroy complete for $(STAGE)$(NC)"

bootstrap: install ## Bootstrap CDK in AWS account
	@echo "$(BLUE)Bootstrapping CDK...$(NC)"
	@$(PKG_MANAGER) run cdk bootstrap
	@echo "$(GREEN)✅ Bootstrap complete$(NC)"

# Stack-specific targets
synth-foundation: build ## Synthesize foundation stack only
	@echo "$(BLUE)Synthesizing foundation stack for $(YELLOW)$(STAGE)$(NC)"
	@$(PKG_MANAGER) run cdk synth MCR-$(STAGE)-Foundation --context stage=$(STAGE)

synth-network: build ## Synthesize network stack only
	@echo "$(BLUE)Synthesizing network stack for $(YELLOW)$(STAGE)$(NC)"
	@$(PKG_MANAGER) run cdk synth MCR-$(STAGE)-Network --context stage=$(STAGE)

synth-data: build ## Synthesize data stack only
	@echo "$(BLUE)Synthesizing data stack for $(YELLOW)$(STAGE)$(NC)"
	@$(PKG_MANAGER) run cdk synth MCR-$(STAGE)-Data --context stage=$(STAGE)

synth-compute: build ## Synthesize compute stack only
	@echo "$(BLUE)Synthesizing compute stack for $(YELLOW)$(STAGE)$(NC)"
	@$(PKG_MANAGER) run cdk synth MCR-$(STAGE)-Compute --context stage=$(STAGE)

synth-api: build ## Synthesize API stack only
	@echo "$(BLUE)Synthesizing API stack for $(YELLOW)$(STAGE)$(NC)"
	@$(PKG_MANAGER) run cdk synth MCR-$(STAGE)-API --context stage=$(STAGE)

# Deploy individual stacks
deploy-foundation: build ## Deploy foundation stack only
	@echo "$(BLUE)Deploying foundation stack for $(YELLOW)$(STAGE)$(NC)"
	@$(PKG_MANAGER) run cdk deploy MCR-$(STAGE)-Foundation --context stage=$(STAGE) --require-approval never

deploy-network: build ## Deploy network stack only
	@echo "$(BLUE)Deploying network stack for $(YELLOW)$(STAGE)$(NC)"
	@$(PKG_MANAGER) run cdk deploy MCR-$(STAGE)-Network --context stage=$(STAGE) --require-approval never

deploy-data: build ## Deploy data stack only
	@echo "$(BLUE)Deploying data stack for $(YELLOW)$(STAGE)$(NC)"
	@$(PKG_MANAGER) run cdk deploy MCR-$(STAGE)-Data --context stage=$(STAGE) --require-approval never

deploy-compute: build ## Deploy compute stack only
	@echo "$(BLUE)Deploying compute stack for $(YELLOW)$(STAGE)$(NC)"
	@$(PKG_MANAGER) run cdk deploy MCR-$(STAGE)-Compute --context stage=$(STAGE) --require-approval never

deploy-api: build ## Deploy API stack only
	@echo "$(BLUE)Deploying API stack for $(YELLOW)$(STAGE)$(NC)"
	@$(PKG_MANAGER) run cdk deploy MCR-$(STAGE)-API --context stage=$(STAGE) --require-approval never

# Utility targets
list: ## List all stacks
	@echo "$(BLUE)Listing all stacks for $(YELLOW)$(STAGE)$(NC)"
	@$(PKG_MANAGER) run cdk list --context stage=$(STAGE)

context: ## Show CDK context for stage
	@echo "$(BLUE)CDK context for $(YELLOW)$(STAGE)$(NC)"
	@$(PKG_MANAGER) run cdk context --context stage=$(STAGE)

doctor: ## Run CDK doctor to check environment
	@echo "$(BLUE)Running CDK doctor...$(NC)"
	@$(PKG_MANAGER) run cdk doctor

# Development workflow shortcuts
dev: ## Quick dev workflow (synth dev)
	@$(MAKE) synth STAGE=dev

val: ## Quick val workflow (synth val)
	@$(MAKE) synth STAGE=val

prod: ## Quick prod workflow (synth prod)
	@$(MAKE) synth STAGE=prod

# Environment info
env: ## Show environment information
	@echo "$(BLUE)Environment Information:$(NC)"
	@echo "Stage: $(YELLOW)$(STAGE)$(NC)"
	@echo "Package Manager: $(YELLOW)$(PKG_MANAGER)$(NC)"
	@echo "Node Version: $(YELLOW)$$(node --version)$(NC)"
	@echo "CDK Version: $(YELLOW)$$($(PKG_MANAGER) run cdk --version 2>/dev/null || echo 'Not installed')$(NC)"
	@echo "AWS CLI: $(YELLOW)$$(aws --version 2>/dev/null || echo 'Not installed')$(NC)"
	@echo "Current AWS Profile: $(YELLOW)$$(aws configure get profile 2>/dev/null || echo 'default')$(NC)"