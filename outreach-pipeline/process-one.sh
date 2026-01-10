#!/bin/bash
# Process a single investor
NAME="$1"
ANGLE="$2"

SAFE_NAME=$(echo "$NAME" | tr ' ' '_' | tr -cd '[:alnum:]_')
RESULTS_DIR="$(dirname "$0")/results"
RESEARCH_FILE="$RESULTS_DIR/${SAFE_NAME}_research.json"
OUTREACH_FILE="$RESULTS_DIR/${SAFE_NAME}_outreach.json"

echo "[$(date +%H:%M:%S)] START: $NAME"

# Research
if [ ! -f "$RESEARCH_FILE" ] || ! grep -q '"success": true' "$RESEARCH_FILE" 2>/dev/null; then
    echo "[$(date +%H:%M:%S)]   Researching $NAME..."
    fundry --robot-research "{\"investor\": \"$NAME\"}" > "$RESEARCH_FILE" 2>&1
fi

# Outreach  
if [ ! -f "$OUTREACH_FILE" ] || ! grep -q '"success": true' "$OUTREACH_FILE" 2>/dev/null; then
    echo "[$(date +%H:%M:%S)]   Drafting outreach for $NAME..."
    fundry --robot-outreach "{\"investor\": \"$NAME\", \"angle\": \"$ANGLE\"}" > "$OUTREACH_FILE" 2>&1
fi

echo "[$(date +%H:%M:%S)] DONE: $NAME"
