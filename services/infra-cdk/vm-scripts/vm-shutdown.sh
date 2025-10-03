#!/bin/bash
# VM Shutdown notification script

INSTANCE_ID=$(ec2-metadata --instance-id | cut -d " " -f 2)

# Send notification to Slack
if [ ! -z "$SLACK_WEBHOOK" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{
            \"text\": \"PostgreSQL Jumpbox Stopping\",
            \"attachments\": [{
                \"color\": \"warning\",
                \"title\": \"Instance Shutdown - STAGE Environment\",
                \"fields\": [
                    {\"title\": \"Instance ID\", \"value\": \"$INSTANCE_ID\", \"short\": true},
                    {\"title\": \"Status\", \"value\": \"Stopping\", \"short\": true}
                ]
            }]
        }" \
        SLACK_WEBHOOK
fi

# Log shutdown
logger "PostgreSQL jumpbox stopping: $INSTANCE_ID"
