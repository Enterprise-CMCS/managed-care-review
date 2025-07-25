#!/bin/bash

echo "Testing CDK bundle size after fixing external modules configuration..."

# Clean previous builds
rm -rf cdk.out

# Synthesize CDK (requires AWS credentials)
echo "Synthesizing CDK stacks..."
npm run cdk -- synth --quiet

if [ $? -eq 0 ]; then
    echo "CDK synthesis successful. Checking bundle sizes..."
    
    # Find large bundles (>1MB)
    echo "Large bundles (>1MB):"
    find cdk.out -name "*.js" -size +1M -exec ls -lh {} \;
    
    # Count total bundle files
    echo "Total JS bundle files:"
    find cdk.out -name "*.js" | wc -l
    
    # Show smallest and largest bundles
    echo "Bundle size distribution:"
    find cdk.out -name "*.js" -exec ls -l {} \; | awk '{print $5}' | sort -n | while read size; do
        echo "  $(numfmt --to=iec $size)"
    done | uniq -c
    
else
    echo "CDK synthesis failed. Please ensure AWS credentials are configured."
    echo "Run: aws configure or set AWS_PROFILE environment variable"
fi