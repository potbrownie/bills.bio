'use client'

interface BlogPost {
  id: number
  title: string
  excerpt: string
  date: string
  category: string
  readTime: string
}

const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: 'Why I Love Minimalist Design',
    excerpt: 'There\'s something beautiful about simplicity. When you strip away the unnecessary, what remains is often more powerful than what was there before.',
    date: '2024-01-15',
    category: 'Design',
    readTime: '3 min',
  },
  {
    id: 2,
    title: 'My Favorite Coffee Shops',
    excerpt: 'A curated list of the best places to work and enjoy a great cup of coffee. Each one has its own character and charm.',
    date: '2024-01-10',
    category: 'Lifestyle',
    readTime: '5 min',
  },
  {
    id: 3,
    title: 'Building in Public: Lessons Learned',
    excerpt: 'What I\'ve learned from sharing my journey openly. The good, the bad, and the unexpected benefits of transparency.',
    date: '2024-01-05',
    category: 'Technology',
    readTime: '7 min',
  },
  {
    id: 4,
    title: 'Books That Changed My Perspective',
    excerpt: 'A few books that have significantly influenced how I think about work, life, and everything in between.',
    date: '2023-12-28',
    category: 'Reading',
    readTime: '4 min',
  },
]

export default function Blog() {
  return (
    <section id="blog" className="py-20 px-6 sm:px-8 lg:px-12 bg-warm-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl mb-2 text-charcoal">
            Blog
          </h2>
          <div className="w-16 h-px bg-warm-gold mt-4 mb-6" />
          <p className="text-base text-taupe font-light leading-relaxed">
            Thoughts, ideas, and things I find interesting.
          </p>
        </div>

        <div className="space-y-12">
          {blogPosts.map((post) => (
            <article
              key={post.id}
              className="group pb-12 border-b border-warm-cream last:border-0 last:pb-0"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs px-2 py-1 bg-warm-cream text-taupe rounded-sm uppercase tracking-wide">
                      {post.category}
                    </span>
                    <span className="text-xs text-taupe font-light">
                      {post.readTime}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl text-charcoal mb-3 group-hover:text-warm-gold transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-base text-taupe font-light leading-relaxed mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-4">
                    <time className="text-xs text-taupe font-light">
                      {new Date(post.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </time>
                    <a
                      href="#"
                      className="text-sm text-charcoal hover:text-warm-gold transition-colors hover-underline"
                    >
                      Read more →
                    </a>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
