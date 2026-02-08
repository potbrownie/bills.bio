import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function setupBlog() {
  const client = await pool.connect()

  try {
    console.log('Creating blog_posts table...')
    
    // Read and execute the SQL schema
    const sqlPath = join(__dirname, 'add-blog-table.sql')
    const sql = readFileSync(sqlPath, 'utf-8')
    
    await client.query(sql)
    
    console.log('✅ Blog table created successfully!')
    
    // Now seed the blog posts
    console.log('\nSeeding blog posts...')
    
    const samplePosts = [
      {
        title: 'How not to build a company',
        slug: 'how-not-to-build-a-company',
        excerpt: 'Lessons learned from mistakes and missteps in building companies. What not to do, and why it matters.',
        content: `<h2>Introduction</h2><p>Building a company is hard. Building a successful company is even harder. Over the years, I've made countless mistakes, and I've learned valuable lessons from each one.</p><h2>The Mistakes</h2><ul><li>Not validating the market early enough</li><li>Hiring for the wrong reasons</li><li>Ignoring customer feedback</li><li>Scaling too quickly</li></ul><h2>What I Learned</h2><p>Each mistake taught me something valuable. The key is to learn quickly and adapt even faster.</p>`,
        category: 'Business',
        reading_time: 5,
        published: true,
      },
      {
        title: 'The great intelligence transfer',
        slug: 'the-great-intelligence-transfer',
        excerpt: 'Exploring how knowledge and intelligence are being transferred in the age of AI and automation.',
        content: `<h2>The Shift</h2><p>We're witnessing a fundamental shift in how intelligence is created, stored, and transferred. AI is not just a tool—it's becoming a new medium for human knowledge.</p><h2>What This Means</h2><p>As we encode more of our collective intelligence into machines, we need to think carefully about what we're losing and what we're gaining.</p><blockquote>The question isn't whether AI will replace human intelligence, but how we can augment and preserve what makes us uniquely human.</blockquote>`,
        category: 'Technology',
        reading_time: 7,
        published: true,
      },
      {
        title: 'There will be more robots than people',
        slug: 'there-will-be-more-robots-than-people',
        excerpt: 'Examining the trajectory of robotics and automation, and why robots may outnumber humans in the future.',
        content: `<h2>The Numbers</h2><p>When you look at the trajectory of robotics development and deployment, the math is clear: within a few decades, there will likely be more robots than people on Earth.</p><h2>What Kind of Robots?</h2><p>Not the humanoid robots of science fiction, but specialized machines designed for specific tasks—from delivery to manufacturing to healthcare.</p><h2>The Opportunity</h2><p>This isn't a dystopian future. It's an opportunity to free humans from repetitive, dangerous, and mundane work, allowing us to focus on what we do best: create, innovate, and connect.</p>`,
        category: 'Technology',
        reading_time: 6,
        published: true,
      },
    ]

    for (const post of samplePosts) {
      const result = await client.query(
        `INSERT INTO blog_posts (title, slug, excerpt, content, category, reading_time, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE
         SET title = EXCLUDED.title,
             excerpt = EXCLUDED.excerpt,
             content = EXCLUDED.content,
             category = EXCLUDED.category,
             reading_time = EXCLUDED.reading_time,
             published = EXCLUDED.published
         RETURNING id, title`,
        [
          post.title,
          post.slug,
          post.excerpt,
          post.content,
          post.category,
          post.reading_time,
          post.published,
        ]
      )

      console.log(`✓ Created/Updated: ${result.rows[0].title}`)
    }

    console.log('\n✅ Blog posts seeded successfully!')
  } catch (error) {
    console.error('❌ Error setting up blog:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

setupBlog()
