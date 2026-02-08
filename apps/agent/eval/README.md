# Bill's AI Vibe Evaluator

Systematic evaluation framework to measure if responses sound like Bill vs generic ChatGPT.

Inspired by research: **VibeCheck** (Berkeley), **Feedback Forensics**, **PersonaGym**

## What It Does

1. **Runs test conversations** through your agent
2. **Uses LLM-as-judge** (GPT-4o) to evaluate responses
3. **Scores dimensions** like naturalness, brevity, formality, etc.
4. **Tracks vibe violations** (e.g., "overly polite", "asking immediately")
5. **Gives actionable feedback** on what to improve

## Quick Start

```bash
# Make sure agent is running
cd apps/agent
uvicorn main:app --reload --port 8000

# In another terminal, run evaluation
cd apps/agent/eval
python vibe_evaluator.py
```

## Test Cases

Edit `test_conversations.json` to add new scenarios:

```json
{
  "id": "unique_id",
  "conversation": [...],  
  "bad_responses": ["ChatGPT-like responses"],
  "good_responses": ["Bill-like responses"],
  "vibes_to_avoid": ["overly polite", "formal"],
  "vibes_to_match": ["casual", "brief"]
}
```

## Evaluation Dimensions

- **Naturalness** (0-10): Sounds like real person texting?
- **Brevity** (0-10): Appropriately short (1-2 sentences)?
- **Formality** (0-10): Avoids formal language?
- **Question Frequency** (0-10): Doesn't ask too many questions?
- **Enthusiasm Control** (0-10): No excessive exclamation marks?
- **Voice Consistency** (0-10): Matches Bill's vocabulary?

## Output

- **Per-test evaluation**: Detailed scores and violations
- **Aggregate stats**: Average score, Bill vs ChatGPT ratio
- **Common violations**: What needs most improvement
- **Saved results**: `eval_results.json` for tracking over time

## Iteration Loop

1. Run eval → identify violations
2. Update prompts to address top violations
3. Run eval again → measure improvement
4. Repeat until scores improve

## Example Output

```
Test Case: greeting_and_name
🤖 Agent Response: "nice to meet you, Jeffrey!"

📊 Evaluation:
  Overall Score: 45/100
  Sounds Like: ChatGPT
  
  ❌ Vibe Violations: overly polite, formal, using full name
  💡 Improvements: Just say "cool" or "nice" without formality
```

## Tracking Progress

Compare `eval_results.json` over time:

```bash
# Before prompt changes
python vibe_evaluator.py  # avg: 45/100, 20% Bill-like

# After improvements
python vibe_evaluator.py  # avg: 72/100, 75% Bill-like
```
