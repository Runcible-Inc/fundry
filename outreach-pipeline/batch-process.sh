#!/bin/bash
# Batch process all investors through Fundry
# Usage: ./batch-process.sh [category]
# If no category specified, processes all

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/results"
INVESTORS_FILE="$SCRIPT_DIR/investors.json"

mkdir -p "$OUTPUT_DIR"

process_investor() {
    local name="$1"
    local angle="$2"
    local category="$3"
    
    local safe_name=$(echo "$name" | tr ' ' '_' | tr -cd '[:alnum:]_')
    local research_file="$OUTPUT_DIR/${safe_name}_research.json"
    local outreach_file="$OUTPUT_DIR/${safe_name}_outreach.json"
    
    echo "Processing: $name ($category)"
    
    # Research
    if [ ! -f "$research_file" ]; then
        echo "  -> Researching..."
        fundry --robot-research "{\"investor\": \"$name\"}" > "$research_file" 2>&1 || true
        sleep 2  # Rate limiting
    else
        echo "  -> Research exists, skipping"
    fi
    
    # Outreach draft
    if [ ! -f "$outreach_file" ]; then
        echo "  -> Drafting outreach..."
        fundry --robot-outreach "{\"investor\": \"$name\", \"angle\": \"$angle\"}" > "$outreach_file" 2>&1 || true
        sleep 2  # Rate limiting
    else
        echo "  -> Outreach exists, skipping"
    fi
    
    echo "  -> Done: $name"
}

# Process a category from the JSON file
process_category() {
    local category="$1"
    echo ""
    echo "=========================================="
    echo "Processing category: $category"
    echo "=========================================="
    
    # Extract investors from category using jq
    local investors=$(jq -r ".${category}[] | \"\(.name)|\(.angle)\"" "$INVESTORS_FILE" 2>/dev/null)
    
    if [ -z "$investors" ]; then
        echo "No investors found in category: $category"
        return
    fi
    
    while IFS='|' read -r name angle; do
        process_investor "$name" "$angle" "$category"
    done <<< "$investors"
}

# Main
if [ -n "$1" ]; then
    # Process specific category
    process_category "$1"
else
    # Process all categories
    categories=$(jq -r 'keys[]' "$INVESTORS_FILE")
    for category in $categories; do
        process_category "$category"
    done
fi

echo ""
echo "=========================================="
echo "Batch processing complete!"
echo "Results in: $OUTPUT_DIR"
echo "=========================================="
