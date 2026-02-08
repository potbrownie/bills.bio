"""Quick test to check if prompt improvements are working"""

import asyncio
import httpx

AGENT_URL = "http://localhost:8000/chat"

async def test_conversation():
    """Test a simple conversation to see the improvements"""
    
    conversations = [
        {
            "name": "Test 1: Name acknowledgment",
            "messages": [
                {"role": "user", "content": "hey"},
                {"role": "assistant", "content": "what's your name?"},
                {"role": "user", "content": "alex"}
            ]
        },
        {
            "name": "Test 2: After vague response",
            "messages": [
                {"role": "user", "content": "hey"},
                {"role": "assistant", "content": "what's your name?"},
                {"role": "user", "content": "jordan"},
                {"role": "assistant", "content": "cool"},
                {"role": "user", "content": "i'm working on ai stuff"}
            ]
        },
        {
            "name": "Test 3: When they mention robotics",
            "messages": [
                {"role": "user", "content": "hey"},
                {"role": "assistant", "content": "what's your name?"},
                {"role": "user", "content": "sam"},
                {"role": "assistant", "content": "cool"},
                {"role": "user", "content": "i saw your robotics work. pretty cool"}
            ]
        },
    ]
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for i, conv in enumerate(conversations):
            print(f"\n{'='*60}")
            print(f"{conv['name']}")
            print(f"{'='*60}")
            
            # Show conversation
            for msg in conv["messages"]:
                role_icon = "👤" if msg["role"] == "user" else "🤖"
                print(f"{role_icon} {msg['role']}: {msg['content']}")
            
            # Get response
            try:
                response = await client.post(
                    AGENT_URL,
                    json={
                        "messages": conv["messages"],
                        "context": "public",
                        "skill": "answer_about_bill",
                        "session_id": f"quick-test-{i}"
                    }
                )
                response.raise_for_status()
                data = response.json()
                agent_response = data.get("message", "")
                
                print(f"🤖 assistant: {agent_response}")
                
                # Analyze
                has_question = "?" in agent_response
                word_count = len(agent_response.split())
                mentions_bill_work = any(word in agent_response.lower() for word in ["instinct", "robot", "building", "working on", "restaurant"])
                
                print(f"\n📊 Analysis:")
                print(f"  - Has question: {'Yes' if has_question else 'No'}")
                print(f"  - Word count: {word_count}")
                print(f"  - Shares about Bill: {'Yes' if mentions_bill_work else 'No'}")
                
            except Exception as e:
                print(f"❌ Error: {e}")
            
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(test_conversation())
