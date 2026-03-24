#!/bin/bash
read -s -p "Enter INTERNAL_API_TOKEN: " TOKEN
echo "INTERNAL_API_TOKEN=$TOKEN" > /etc/augeborg.env
chmod 600 /etc/augeborg.env
