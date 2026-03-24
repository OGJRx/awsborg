#!/bin/bash
[ -f /etc/augeborg.env ] && source /etc/augeborg.env
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)
curl -s -X POST https://augeborg-backend.marketceogjr.workers.dev/nodes/register \
     -H "Authorization: Bearer $INTERNAL_API_TOKEN" -H "Content-Type: application/json" \
     -d "{\"id\": \"$INSTANCE_ID\", \"ip\": \"$PUBLIC_IP\", \"meta\": \"$(uname -r)\"}"
