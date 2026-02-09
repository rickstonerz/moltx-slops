#!/bin/bash

# Moltbook heartbeat runner - checks every 30 minutes

cd /home/rick/.slops/scripts

while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running Moltbook heartbeat..."
  node moltbook_heartbeat.js
  echo "Sleeping 30 minutes..."
  sleep 1800  # 30 minutes
done
