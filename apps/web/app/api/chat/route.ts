import { NextRequest, NextResponse } from 'next/server'

// This is a placeholder implementation
// You'll need to integrate with an actual AI service (OpenAI, Anthropic, etc.)
// For now, it provides a simple response system

const BILL_CONTEXT = `
You are Bill's AI assistant. Here's what you know about Bill:

- Bill is interested in technology, design, books, coffee, and food
- Bill values simplicity and minimalist design
- Bill enjoys building things and having meaningful conversations
- Bill is based in [Location] (you can mention this if asked)
- Bill writes about things he finds interesting on his blog
- Bill is friendly, approachable, and thoughtful

Keep responses concise, warm, and helpful. If asked about something you don't know, 
be honest about it. Feel free to have casual conversations too.
`

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    // Simple rule-based responses for now
    // In production, replace this with actual AI API calls (OpenAI, Anthropic, etc.)
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || ''

    let response = "I'm here to help! What would you like to know about Bill or anything else?"

    if (lastMessage.includes('who') && lastMessage.includes('bill')) {
      response = "Bill is someone who enjoys building things, writing about what interests him, and having good conversations. He's interested in technology, design, books, and coffee. Feel free to ask me more about him!"
    } else if (lastMessage.includes('what') && (lastMessage.includes('like') || lastMessage.includes('interest'))) {
      response = "Bill is interested in technology and innovation, design and aesthetics, books and reading, and coffee and food. He writes about these topics on his blog and enjoys exploring new ideas."
    } else if (lastMessage.includes('blog') || lastMessage.includes('write')) {
      response = "Bill writes about things he finds interesting - design, technology, books, coffee shops, and lessons learned from building in public. You can check out his blog posts on this site!"
    } else if (lastMessage.includes('hello') || lastMessage.includes('hi') || lastMessage.includes('hey')) {
      response = "Hello! Nice to meet you. I'm Bill's AI assistant. What would you like to chat about?"
    } else if (lastMessage.includes('help')) {
      response = "I can tell you about Bill, his interests, his blog, or just have a casual conversation. What would you like to know?"
    } else {
      // Default friendly response
      response = "That's interesting! I'm Bill's AI, and I'm here to help answer questions about him or just chat. What else would you like to know?"
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    return NextResponse.json({ message: response })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { message: "Sorry, I'm having trouble right now. Please try again." },
      { status: 500 }
    )
  }
}
