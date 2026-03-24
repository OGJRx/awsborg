#!/bin/bash
# Instalar cron para latido (flock incluido)
echo "*/1 * * * * flock -n /var/lock/augeborg_pulse.lock /opt/augeborg/pulse.sh" > /etc/cron.d/augeborg
chmod +x /opt/augeborg/*.sh
/opt/augeborg/herald.sh
