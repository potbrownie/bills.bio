#!/bin/bash

echo "=== Test 1: Instagram ==="
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "what'\''s your instagram?"}],
    "context": "public",
    "session_id": "comprehensive-1"
  }' | jq -r '.message'

echo ""
echo ""

echo "=== Test 2: Snowboarding location ==="
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "where do you snowboard?"}],
    "context": "public",
    "session_id": "comprehensive-2"
  }' | jq -r '.message'

echo ""
echo ""

echo "=== Test 3: Camera ==="
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "what camera do you use?"}],
    "context": "public",
    "session_id": "comprehensive-3"
  }' | jq -r '.message'

echo ""
echo ""

echo "=== Test 4: Robot project ==="
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "what exactly is your robot designed for?"}],
    "context": "public",
    "session_id": "comprehensive-4"
  }' | jq -r '.message'

echo ""
echo ""

echo "=== Test 5: Previous companies ==="
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "what companies did you start before instinct?"}],
    "context": "public",
    "session_id": "comprehensive-5"
  }' | jq -r '.message'

echo ""
echo ""

echo "=== Test 6: Blog posts ==="
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "have you written anything?"}],
    "context": "public",
    "session_id": "comprehensive-6"
  }' | jq -r '.message'
