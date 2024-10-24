#!/bin/bash
pgrep -l -f "node src/index.js" | cut -d ' ' -f 1 | xargs sudo kill || echo "Node instance not found"
