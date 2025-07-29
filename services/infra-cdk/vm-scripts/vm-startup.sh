#!/bin/bash
# VM Startup notification script

INSTANCE_ID=$(ec2-metadata --instance-id | cut -d " " -f 2)
PUBLIC_IP=$(ec2-metadata --public-ipv4 | cut -d " " -f 2)
INSTANCE_TYPE=$(ec2-metadata --instance-type | cut -d " " -f 2)

# Send notification to Slack
if [ ! -z "SLACK_WEBHOOK" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{
            \"text\": \"PostgreSQL Jumpbox Started\",
            \"attachments\": [{
                \"color\": \"good\",
                \"title\": \"Instance Details - STAGE Environment\",
                \"fields\": [
                    {\"title\": \"Instance ID\", \"value\": \"$INSTANCE_ID\", \"short\": true},
                    {\"title\": \"Public IP\", \"value\": \"$PUBLIC_IP\", \"short\": true},
                    {\"title\": \"Instance Type\", \"value\": \"$INSTANCE_TYPE\", \"short\": true},
                    {\"title\": \"Status\", \"value\": \"Running\", \"short\": true}
                ]
            }]
        }" \
        SLACK_WEBHOOK
fi

# Log startup
logger "PostgreSQL jumpbox started: $INSTANCE_ID at $PUBLIC_IP"
