#!/bin/bash

echo "=== Test 1: Ask about timeline/experience ==="
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "what did you do before instinct?"}
    ],
    "context": "public",
    "skill": "answer_about_bill",
    "session_id": "test-profile-1"
  }' | jq -r '.message'

echo ""
echo ""

echo "=== Test 2: Ask about the robot project ==="
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "tell me about the robot youre building"}
    ],
    "context": "public",
    "skill": "answer_about_bill",
    "session_id": "test-profile-2"
  }' | jq -r '.message'

echo ""
echo ""

echo "=== Test 3: Ask about writing/ideas ==="
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "have you written anything about ai or robotics?"}
    ],
    "context": "public",
    "skill": "answer_about_bill",
    "session_id": "test-profile-3"
  }' | jq -r '.message'
