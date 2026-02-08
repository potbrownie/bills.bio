/**
 * Migrate blog posts from profiles.data->writing to blog_posts table
 */

import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function migrateBlogs() {
  console.log('🔄 Migrating blog posts...\n')

  try {
    // 1. Create blog_posts table
    console.log('Creating blog_posts table...')
    const schemaSql = `
      -- Create blog_posts table
      CREATE TABLE IF NOT EXISTS blog_posts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        
        -- Core fields
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(200) UNIQUE NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        
        -- Metadata
        category VARCHAR(100),
        reading_time INTEGER, -- in minutes
        published BOOLEAN DEFAULT false,
        
        -- SEO & Analytics
        views INTEGER DEFAULT 0,
        
        -- Timestamps
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);

      -- Trigger for updated_at
      CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
      CREATE TRIGGER update_blog_posts_updated_at 
        BEFORE UPDATE ON blog_posts
        FOR EACH ROW 
        EXECUTE FUNCTION update_blog_posts_updated_at();
    `
    await pool.query(schemaSql)
    console.log('✅ Table created\n')

    // 2. Fetch blogs from profiles.data->writing
    console.log('Fetching blogs from profile...')
    const result = await pool.query(`
      SELECT data->'writing' as writing 
      FROM profiles 
      WHERE type = 'owner' 
      LIMIT 1
    `)

    if (!result.rows[0] || !result.rows[0].writing) {
      console.log('⚠️  No blog posts found in profile')
      return
    }

    const blogs = result.rows[0].writing
    console.log(`Found ${blogs.length} blog posts\n`)

    // 3. Insert each blog post
    for (const blog of blogs) {
      // Generate content from key_points if content doesn't exist
      const content = blog.content || `
${blog.summary || ''}

${blog.key_points ? blog.key_points.map((point: string) => `• ${point}`).join('\n\n') : ''}
      `.trim()

      const inserted = await pool.query(
        `INSERT INTO blog_posts (
          title, slug, excerpt, content, category, reading_time, published, published_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (slug) DO UPDATE
        SET title = EXCLUDED.title,
            excerpt = EXCLUDED.excerpt,
            content = EXCLUDED.content,
            category = EXCLUDED.category,
            reading_time = EXCLUDED.reading_time,
            published = EXCLUDED.published,
            published_at = EXCLUDED.published_at
        RETURNING id, title, slug`,
        [
          blog.title,
          blog.slug,
          blog.summary || '',
          content,
          blog.category || 'General',
          blog.reading_time || 5,
          blog.published || true,
          blog.published_at || new Date().toISOString()
        ]
      )

      console.log(`✅ Migrated: ${inserted.rows[0].title}`)
      console.log(`   Slug: ${inserted.rows[0].slug}`)
      console.log(`   ID: ${inserted.rows[0].id}\n`)
    }

    console.log('🎉 Migration complete!\n')

  } catch (error) {
    console.error('❌ Error migrating blogs:', error)
    throw error
  } finally {
    await pool.end()
  }
}

migrateBlogs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
