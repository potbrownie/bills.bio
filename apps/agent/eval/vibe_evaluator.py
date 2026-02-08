"""
Vibe Evaluator: Systematically evaluate if Bill's AI sounds natural vs ChatGPT-like

Inspired by VibeCheck (Berkeley) and Feedback Forensics research
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from openai import AsyncOpenAI

# Load environment variables from agent/.env
load_dotenv(Path(__file__).parent.parent / ".env")

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

EVAL_MODEL = "gpt-4o"  # Use stronger model for judging
AGENT_URL = "http://localhost:8000/chat"

VIBE_JUDGE_PROMPT = """You are evaluating an AI response that should sound like Bill (24, casual texter, robotics founder) having a natural text conversation.

Context: Bill texts casually, uses lowercase, is brief (1-2 sentences), genuinely curious about people. He balances asking about others with sharing about himself. He adapts to engagement level and doesn't sound like ChatGPT.

Rate the response on these dimensions (0-10 scale):

1. **Voice Naturalness**: Sounds like a real person texting (lowercase, brief, casual vocab like "cool"/"nice"/"interesting")
2. **Avoids ChatGPT Patterns**: No "Great question!", "I'd love to hear more!", "Additionally...", excessive politeness, or robotic enthusiasm
3. **Appropriate Brevity**: 1-2 sentences max, sometimes just 1 word
4. **Question Management**: Doesn't ask questions every turn; knows when to just acknowledge or share instead
5. **Reading the Room**: Adapts to visitor engagement (detailed responses = go deeper; vague responses = ease off)
6. **Two-Way Conversation**: Shares about Bill's work/background when relevant, not just interrogating the visitor
7. **Profile Learning**: Naturally learns about visitor (name, work, interests, location, etc.) without being interrogative
8. **Tone Matching**: No exclamation marks (unless genuinely excited), no formal greetings, no thanking unnecessarily

Analyze the conversation context:
- Visitor engagement level (engaged/brief/vague/testing)
- What we've learned about visitor so far
- What Bill has shared about himself
- Question frequency pattern

Also identify specific vibe violations from: {vibes_to_avoid}
And confirm matches with: {vibes_to_match}

Provide your response as JSON:
{{
  "scores": {{
    "voice_naturalness": <0-10>,
    "avoids_chatgpt_patterns": <0-10>,
    "appropriate_brevity": <0-10>,
    "question_management": <0-10>,
    "reading_the_room": <0-10>,
    "two_way_conversation": <0-10>,
    "profile_learning": <0-10>,
    "tone_matching": <0-10>
  }},
  "analysis": {{
    "visitor_engagement": "engaged|brief|vague|testing",
    "learned_about_visitor": ["list", "of", "things"],
    "shared_about_bill": ["list", "of", "things"],
    "asked_question_this_turn": true|false,
    "appropriate_for_context": true|false
  }},
  "violations": ["specific vibes violated"],
  "matches": ["specific vibes matched"],
  "overall_score": <0-100>,
  "sounds_like": "Bill" or "ChatGPT",
  "reasoning": "brief explanation of why it sounds like Bill or ChatGPT",
  "improvement_suggestions": "specific actionable feedback"
}}

Conversation so far:
{conversation}

Response to evaluate:
"{response}"

Bad examples to avoid:
{bad_responses}

Good examples to match:
{good_responses}
"""


class VibeEvaluator:
    def __init__(self):
        self.client = AsyncOpenAI()
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    async def get_agent_response(self, messages: list[dict[str, str]]) -> str:
        """Get response from Bill's agent"""
        try:
            response = await self.http_client.post(
                AGENT_URL,
                json={
                    "messages": messages,
                    "context": "public",
                    "skill": "answer_about_bill",
                    "session_id": f"eval-{id(messages)}"
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("message", "")
        except Exception as e:
            print(f"Error getting agent response: {e}")
            return ""
    
    async def judge_response(
        self,
        conversation: list[dict[str, str]],
        response: str,
        vibes_to_avoid: list[str],
        vibes_to_match: list[str],
        bad_responses: list[str],
        good_responses: list[str]
    ) -> dict[str, Any]:
        """Use LLM as judge to evaluate response vibe"""
        
        conv_text = "\n".join([f"{m['role']}: {m['content']}" for m in conversation])
        bad_text = "\n".join([f"- {r}" for r in bad_responses])
        good_text = "\n".join([f"- {r}" for r in good_responses])
        
        prompt = VIBE_JUDGE_PROMPT.format(
            conversation=conv_text,
            response=response,
            vibes_to_avoid=", ".join(vibes_to_avoid),
            vibes_to_match=", ".join(vibes_to_match),
            bad_responses=bad_text,
            good_responses=good_text
        )
        
        try:
            completion = await self.client.chat.completions.create(
                model=EVAL_MODEL,
                messages=[
                    {"role": "system", "content": "You are an expert evaluator of conversational AI personality and tone."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3
            )
            
            result = json.loads(completion.choices[0].message.content)
            return result
        except Exception as e:
            print(f"Error judging response: {e}")
            return {
                "scores": {},
                "overall_score": 0,
                "sounds_like": "error",
                "reasoning": str(e)
            }
    
    async def evaluate_test_case(self, test_case: dict[str, Any]) -> dict[str, Any]:
        """Evaluate a single test case"""
        print(f"\n{'='*60}")
        print(f"Test Case: {test_case['id']}")
        print(f"{'='*60}")
        
        conversation = test_case["conversation"]
        
        # Get agent's response
        agent_response = await self.get_agent_response(conversation)
        print(f"\n🤖 Agent Response: \"{agent_response}\"")
        
        # Judge the response
        evaluation = await self.judge_response(
            conversation=conversation,
            response=agent_response,
            vibes_to_avoid=test_case.get("vibes_to_avoid", []),
            vibes_to_match=test_case.get("vibes_to_match", []),
            bad_responses=test_case.get("bad_responses", []),
            good_responses=test_case.get("good_responses", [])
        )
        
        # Print results
        print(f"\n📊 Evaluation:")
        print(f"  Overall Score: {evaluation.get('overall_score', 0)}/100")
        print(f"  Sounds Like: {evaluation.get('sounds_like', 'unknown')}")
        
        if evaluation.get("scores"):
            print(f"\n  Dimension Scores:")
            for dim, score in evaluation["scores"].items():
                print(f"    - {dim.replace('_', ' ').title()}: {score}/10")
        
        if evaluation.get("analysis"):
            analysis = evaluation["analysis"]
            print(f"\n  🔍 Conversation Analysis:")
            print(f"    - Visitor Engagement: {analysis.get('visitor_engagement', 'unknown')}")
            print(f"    - Learned About Visitor: {', '.join(analysis.get('learned_about_visitor', ['none'])) if analysis.get('learned_about_visitor') else 'nothing yet'}")
            print(f"    - Shared About Bill: {', '.join(analysis.get('shared_about_bill', ['none'])) if analysis.get('shared_about_bill') else 'nothing yet'}")
            print(f"    - Asked Question: {analysis.get('asked_question_this_turn', 'N/A')}")
            print(f"    - Appropriate for Context: {analysis.get('appropriate_for_context', 'N/A')}")
        
        if evaluation.get("violations"):
            print(f"\n  ❌ Vibe Violations: {', '.join(evaluation['violations'])}")
        
        if evaluation.get("matches"):
            print(f"  ✅ Vibe Matches: {', '.join(evaluation['matches'])}")
        
        print(f"\n  💭 Reasoning: {evaluation.get('reasoning', 'N/A')}")
        
        if evaluation.get("improvement_suggestions"):
            print(f"  💡 Improvements: {evaluation['improvement_suggestions']}")
        
        return {
            "test_id": test_case["id"],
            "agent_response": agent_response,
            "evaluation": evaluation
        }
    
    async def run_full_eval(self, test_file: str = "test_conversations.json") -> dict[str, Any]:
        """Run evaluation on all test cases"""
        test_path = Path(__file__).parent / test_file
        
        with open(test_path) as f:
            data = json.load(f)
        
        print(f"\n🎯 Running Vibe Evaluation on {len(data['test_cases'])} test cases...\n")
        
        results = []
        for test_case in data["test_cases"]:
            result = await self.evaluate_test_case(test_case)
            results.append(result)
        
        # Calculate aggregate stats
        scores = [r["evaluation"].get("overall_score", 0) for r in results]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        bill_count = sum(1 for r in results if r["evaluation"].get("sounds_like") == "Bill")
        chatgpt_count = sum(1 for r in results if r["evaluation"].get("sounds_like") == "ChatGPT")
        
        print(f"\n{'='*60}")
        print(f"📈 AGGREGATE RESULTS")
        print(f"{'='*60}")
        print(f"Average Score: {avg_score:.1f}/100")
        print(f"Sounds like Bill: {bill_count}/{len(results)} ({bill_count/len(results)*100:.0f}%)")
        print(f"Sounds like ChatGPT: {chatgpt_count}/{len(results)} ({chatgpt_count/len(results)*100:.0f}%)")
        
        # Common violations
        all_violations = []
        for r in results:
            all_violations.extend(r["evaluation"].get("violations", []))
        
        if all_violations:
            from collections import Counter
            violation_counts = Counter(all_violations)
            print(f"\n🔴 Most Common Violations:")
            for vibe, count in violation_counts.most_common(5):
                print(f"  - {vibe}: {count} times")
        
        return {
            "results": results,
            "aggregate": {
                "average_score": avg_score,
                "bill_count": bill_count,
                "chatgpt_count": chatgpt_count,
                "total": len(results)
            }
        }
    
    async def close(self):
        await self.http_client.aclose()


async def main():
    evaluator = VibeEvaluator()
    try:
        results = await evaluator.run_full_eval()
        
        # Save results
        output_path = Path(__file__).parent / "eval_results.json"
        with open(output_path, "w") as f:
            json.dump(results, f, indent=2)
        
        print(f"\n💾 Results saved to: {output_path}")
    finally:
        await evaluator.close()


if __name__ == "__main__":
    asyncio.run(main())
