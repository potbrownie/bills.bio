#!/bin/bash

# Test 1: Simple greeting
echo "=== Test 1: Simple greeting ==="
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "hey"}],
    "context": "public",
    "skill": "answer_about_bill",
    "session_id": "test-greeting-1"
  }' | jq -r '.message'

echo ""
echo ""

# Test 2: Name response
echo "=== Test 2: After name ==="
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "hey"},
      {"role": "assistant", "content": "what'\''s your name?"},
      {"role": "user", "content": "alex"}
    ],
    "context": "public",
    "skill": "answer_about_bill",
    "session_id": "test-greeting-2"
  }' | jq -r '.message'

echo ""
echo ""

# Test 3: AI mention
echo "=== Test 3: When they mention AI ==="
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "hey"},
      {"role": "assistant", "content": "what'\''s your name?"},
      {"role": "user", "content": "jordan"},
      {"role": "assistant", "content": "cool"},
      {"role": "user", "content": "i'\''m working on ai stuff"}
    ],
    "context": "public",
    "skill": "answer_about_bill",
    "session_id": "test-greeting-3"
  }' | jq -r '.message'
