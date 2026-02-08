#!/usr/bin/env tsx
/**
 * Seed test data for billing page
 * 
 * This script creates sample conversations and messages with token data
 * to help test the billing page functionality.
 * 
 * Usage:
 *   tsx scripts/seed-billing-data.ts
 */

import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/bills_bio'

// Sample conversations with varying token usage
const SAMPLE_CONVERSATIONS = [
  {
    title: 'Planning a new website',
    messages: [
      { role: 'user', content: 'Hi, I want to build a new website for my business', tokens: 150 },
      { role: 'assistant', content: "I'd be happy to help you plan your website! Let me ask you a few questions to understand your needs better. What type of business do you have, and what are your main goals for the website?", tokens: 380 },
      { role: 'user', content: 'I run a coffee shop and want to showcase our menu and allow online orders', tokens: 200 },
      { role: 'assistant', content: "That sounds great! For a coffee shop website with online ordering, here's what I'd recommend: 1) A clean, modern design with your branding, 2) Menu display with photos and prices, 3) Integration with a payment processor like Stripe for orders, 4) Mobile-responsive design. Would you like me to help you get started?", tokens: 620 },
    ],
  },
  {
    title: 'Discussing React best practices',
    messages: [
      { role: 'user', content: 'What are the best practices for state management in React?', tokens: 120 },
      { role: 'assistant', content: "Great question! Here are some React state management best practices: 1) Use useState for simple component state, 2) useReducer for complex state logic, 3) Context API for sharing state across components, 4) Consider libraries like Zustand or Redux for large apps. The key is to choose based on your app's complexity.", tokens: 550 },
      { role: 'user', content: 'When should I use Context vs Redux?', tokens: 90 },
      { role: 'assistant', content: "Use Context API when: 1) You have simple state that needs to be shared, 2) Your app is small to medium sized, 3) You don't need time-travel debugging. Use Redux when: 1) You have complex state with many interactions, 2) You need middleware for side effects, 3) You want dev tools and time-travel debugging, 4) Your team is familiar with it.", tokens: 680 },
    ],
  },
  {
    title: 'Quick question about Next.js',
    messages: [
      { role: 'user', content: 'How do I deploy a Next.js app?', tokens: 80 },
      { role: 'assistant', content: 'The easiest way to deploy a Next.js app is using Vercel (made by the Next.js team). Just connect your GitHub repo and it auto-deploys. Other options include: Netlify, AWS Amplify, or your own server with Node.js. Which platform are you considering?', tokens: 450 },
    ],
  },
  {
    title: 'AI and machine learning discussion',
    messages: [
      { role: 'user', content: 'Tell me about the latest developments in AI', tokens: 100 },
      { role: 'assistant', content: "Recent AI developments are fascinating! We're seeing: 1) Large Language Models (LLMs) like GPT-4 and Claude becoming more capable, 2) Multimodal AI that can understand text, images, and audio, 3) Better fine-tuning techniques making AI more specialized, 4) Increased focus on AI safety and alignment. The field is moving incredibly fast!", tokens: 720 },
      { role: 'user', content: 'What are the practical applications for businesses?', tokens: 130 },
      { role: 'assistant', content: "Businesses are using AI for: 1) Customer service chatbots, 2) Content generation and marketing, 3) Data analysis and insights, 4) Automated coding and development, 5) Personalized recommendations, 6) Process automation. The key is identifying repetitive tasks that AI can handle, freeing up humans for creative work.", tokens: 590 },
      { role: 'user', content: 'How can I get started implementing AI in my company?', tokens: 110 },
      { role: 'assistant', content: "Start small: 1) Identify a specific problem AI could solve, 2) Use existing APIs (OpenAI, Anthropic) rather than building from scratch, 3) Run a pilot project with measurable goals, 4) Train your team on prompt engineering, 5) Monitor performance and gather feedback. Don't try to automate everything at once - focus on high-impact, low-risk areas first.", tokens: 670 },
    ],
  },
]

async function main() {
  console.log('🌱 Seeding billing test data...')

  const pool = new Pool({
    connectionString: DATABASE_URL,
  })

  try {
    const client = await pool.connect()

    try {
      // Get or create owner profile
      const ownerResult = await client.query(
        `SELECT id FROM profiles WHERE type = 'owner' LIMIT 1`
      )

      let ownerId: string
      if (ownerResult.rows.length === 0) {
        const createOwner = await client.query(
          `INSERT INTO profiles (type, name, email, status) 
           VALUES ('owner', 'Bill', 'bill@bills.bio', 'registered') 
           RETURNING id`
        )
        ownerId = createOwner.rows[0].id
        console.log('✓ Created owner profile')
      } else {
        ownerId = ownerResult.rows[0].id
        console.log('✓ Found existing owner profile')
      }

      // Create conversations and messages
      for (const conv of SAMPLE_CONVERSATIONS) {
        // Create conversation
        const convResult = await client.query(
          `INSERT INTO conversations (profile_id, title, created_at, updated_at)
           VALUES ($1, $2, NOW() - INTERVAL '30 days' * random(), NOW())
           RETURNING id`,
          [ownerId, conv.title]
        )
        const conversationId = convResult.rows[0].id

        // Create messages
        for (const msg of conv.messages) {
          const promptTokens = msg.role === 'user' ? msg.tokens : 0
          const completionTokens = msg.role === 'assistant' ? msg.tokens : 0

          await client.query(
            `INSERT INTO messages (conversation_id, role, content, data, created_at)
             VALUES ($1, $2, $3, $4, NOW() - INTERVAL '30 days' * random())`,
            [
              conversationId,
              msg.role,
              msg.content,
              JSON.stringify({
                tokens: msg.tokens,
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                model: 'gpt-4o-mini',
              }),
            ]
          )
        }

        console.log(`✓ Created conversation: "${conv.title}" (${conv.messages.length} messages)`)
      }

      // Set email usage for billing
      await client.query(
        `UPDATE profiles
         SET data = jsonb_set(
           COALESCE(data, '{}'::jsonb),
           '{emails_sent_this_month}',
           '25'::jsonb
         )
         WHERE id = $1`,
        [ownerId]
      )
      console.log('✓ Set email usage to 25 emails')

      console.log('\n✨ Billing test data seeded successfully!')
      console.log('📊 Visit /billing to see the data')
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Error seeding data:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
