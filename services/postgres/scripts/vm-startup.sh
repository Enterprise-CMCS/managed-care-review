#!/bin/bash
webhook_url=$SLACK_WEBHOOK
msg_content="The ec2 instance to access postgres has been started in ${stage}."
curl -X POST -H 'Content-type: application/json' --data "{'text':'${msg_content}'}" "${webhook_url}"