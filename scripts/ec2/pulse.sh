#!/bin/bash
exec 200>/var/lock/augeborg_pulse.lock
flock -n 200 || exit 1
[ -f /etc/augeborg.env ] && source /etc/augeborg.env
CPU_LOAD=$(top -bn1 | grep "Cpu(s)" | awk '{print 100 - $8}' | cut -d. -f1)
# Uso de bc para cálculo de ZRAM si está disponible, sino aproximación
ZRAM_USAGE=$(zramctl --output DATA,COMPR --noheadings | tail -n 1 | awk '{print int(($1 / 1024 / 1024) * 100 / 400)}')
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
curl -s -X PATCH https://augeborg-backend.marketceogjr.workers.dev/nodes/pulse \
     -H "Authorization: Bearer $INTERNAL_API_TOKEN" -H "Content-Type: application/json" \
     -d "{\"id\": \"$INSTANCE_ID\", \"load\": ${CPU_LOAD:-0}, \"zram\": ${ZRAM_USAGE:-0}}"
