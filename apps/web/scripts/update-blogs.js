const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/bills_bio',
});

// Read the blog content files
const blog1 = fs.readFileSync(path.join(__dirname, 'blog-1-content.txt'), 'utf8');
const blog2 = fs.readFileSync(path.join(__dirname, 'blog-2-content.txt'), 'utf8');
const blog3 = fs.readFileSync(path.join(__dirname, 'blog-3-content.txt'), 'utf8');

async function updateBlogs() {
  const client = await pool.connect();
  
  try {
    console.log('Updating blog posts...\n');
    
    // Update blog 1
    await client.query(
      'UPDATE blog_posts SET content = $1, excerpt = $2 WHERE slug = $3',
      [
        blog1,
        'Lessons learned from mistakes and missteps in building companies. What not to do, and why it matters.',
        'how-not-to-build-a-company'
      ]
    );
    console.log('✓ Updated: How not to build a company');
    
    // Update blog 2
    await client.query(
      'UPDATE blog_posts SET content = $1, excerpt = $2 WHERE slug = $3',
      [
        blog2,
        'We\'re witnessing a fundamental shift in how knowledge and intelligence are transferred between humans and machines, and what it means for our collective future.',
        'the-great-intelligence-transfer'
      ]
    );
    console.log('✓ Updated: The great intelligence transfer');
    
    // Update blog 3
    await client.query(
      'UPDATE blog_posts SET content = $1, excerpt = $2 WHERE slug = $3',
      [
        blog3,
        'Within our lifetimes, robots will outnumber humans on Earth. Not the humanoid robots of science fiction, but specialized machines that will fundamentally reshape society.',
        'there-will-be-more-robots-than-people'
      ]
    );
    console.log('✓ Updated: There will be more robots than people');
    
    console.log('\n✅ All blog posts updated successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateBlogs();
