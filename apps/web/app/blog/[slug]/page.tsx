import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ConversationSidebar from '@/components/ConversationSidebar'
import BlogPostTracker from '@/components/BlogPostTracker'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  reading_time: number
  published: boolean
  created_at: string
  updated_at: string
  published_at: string | null
}

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const result = await db.query(
      'SELECT * FROM blog_posts WHERE slug = $1 AND published = true',
      [slug]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    return result.rows[0]
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPost(slug)
  
  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }
  
  return {
    title: `${post.title} | Bill Huang`,
    description: post.excerpt || `Read ${post.title} by Bill Huang`,
    keywords: `${post.category}, Bill Huang, Blog, ${post.title}`,
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPost(slug)
  
  if (!post) {
    notFound()
  }
  
  return (
    <main className="min-h-screen bg-warm-white">
      <Navbar />
      <BlogPostTracker postId={post.id} postSlug={post.slug} />
      
      <article className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 pt-32 pb-20">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            {post.category && (
              <span className="text-xs px-3 py-1 bg-warm-cream text-taupe rounded-md uppercase tracking-wide">
                {post.category}
              </span>
            )}
            <span className="text-xs text-taupe font-light">
              {post.reading_time} min read
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-light text-charcoal mb-6 leading-tight">
            {post.title}
          </h1>
          
          {post.excerpt && (
            <p className="text-xl text-taupe font-light leading-relaxed mb-6">
              {post.excerpt}
            </p>
          )}
          
          {post.published_at && (
            <time className="text-sm text-taupe font-light">
              {new Date(post.published_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          )}
        </header>
        
        {/* Content */}
        <div 
          className="prose prose-lg max-w-none blog-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        
        {/* Back Link */}
        <div className="mt-16 pt-8 border-t border-warm-cream">
          <a 
            href="/"
            className="inline-flex items-center text-sm text-taupe hover:text-warm-gold transition-colors font-light"
          >
            <svg 
              className="w-4 h-4 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
            Back to home
          </a>
        </div>
      </article>
      
      <Footer />
      <ConversationSidebar />
    </main>
  )
}
