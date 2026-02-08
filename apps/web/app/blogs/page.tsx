'use client'

import { useEffect, useState } from 'react'
import DashboardNavbar from '@/components/DashboardNavbar'
import AuthGuard from '@/components/AuthGuard'
import ConversationSidebar from '@/components/ConversationSidebar'
import RichTextEditor from '@/components/RichTextEditor'
import { useAuth } from '@/hooks/useAuth'

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

export default function BlogsPage() {
  const { handleLogout } = useAuth()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'draft'>('all')

  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [readingTime, setReadingTime] = useState(5)
  const [published, setPublished] = useState(false)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/blog')
      const data = await res.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPost = (post: BlogPost) => {
    setSelectedPost(post)
    setIsCreating(false)
    setTitle(post.title)
    setSlug(post.slug)
    setExcerpt(post.excerpt || '')
    setContent(post.content)
    setCategory(post.category || '')
    setReadingTime(post.reading_time || 5)
    setPublished(post.published)
  }

  const handleNewPost = () => {
    setIsCreating(true)
    setSelectedPost(null)
    setTitle('')
    setSlug('')
    setExcerpt('')
    setContent('')
    setCategory('')
    setReadingTime(5)
    setPublished(false)
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    if (isCreating && !slug) {
      setSlug(generateSlug(newTitle))
    }
  }

  const handleSave = async () => {
    if (!title || !slug || !content) {
      alert('Title, slug, and content are required')
      return
    }

    try {
      setSaving(true)
      const payload = {
        title,
        slug,
        excerpt,
        content,
        category,
        reading_time: readingTime,
        published,
      }

      let res
      if (isCreating) {
        res = await fetch('/api/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else if (selectedPost) {
        res = await fetch(`/api/blog/${selectedPost.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res?.ok) {
        const savedPost = await res.json()
        await fetchPosts()
        setSelectedPost(savedPost)
        setIsCreating(false)
        alert('Post saved successfully!')
      } else {
        const error = await res?.json()
        alert(error?.error || 'Failed to save post')
      }
    } catch (error) {
      console.error('Error saving post:', error)
      alert('Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPost) return
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const res = await fetch(`/api/blog/${selectedPost.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchPosts()
        setSelectedPost(null)
        setIsCreating(false)
        alert('Post deleted successfully!')
      } else {
        alert('Failed to delete post')
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post')
    }
  }

  const filteredPosts = posts
    .filter(post => {
      if (filterPublished === 'published') return post.published
      if (filterPublished === 'draft') return !post.published
      return true
    })
    .filter(post => {
      if (!searchTerm) return true
      const search = searchTerm.toLowerCase()
      return (
        post.title.toLowerCase().includes(search) ||
        post.excerpt?.toLowerCase().includes(search) ||
        post.category?.toLowerCase().includes(search)
      )
    })

  return (
    <AuthGuard showBackLink>
      <div className="min-h-screen bg-warm-white">
        <DashboardNavbar onLogout={handleLogout} />

        <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-light text-charcoal">Blog</h1>
            </div>
            <button
              onClick={handleNewPost}
              className="px-6 py-3 bg-charcoal text-warm-white rounded-lg hover:bg-charcoal/90 transition-colors font-light"
            >
              New Post
            </button>
          </div>

          {/* Filters and Search */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-warm-cream rounded-lg focus:ring-2 focus:ring-warm-gold focus:border-transparent font-light text-charcoal bg-warm-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterPublished('all')}
                className={`px-4 py-3 rounded-lg text-sm font-light transition-colors ${
                  filterPublished === 'all'
                    ? 'bg-charcoal text-warm-white'
                    : 'bg-warm-white border border-warm-cream text-taupe hover:bg-warm-cream'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterPublished('published')}
                className={`px-4 py-3 rounded-lg text-sm font-light transition-colors ${
                  filterPublished === 'published'
                    ? 'bg-charcoal text-warm-white'
                    : 'bg-warm-white border border-warm-cream text-taupe hover:bg-warm-cream'
                }`}
              >
                Published
              </button>
              <button
                onClick={() => setFilterPublished('draft')}
                className={`px-4 py-3 rounded-lg text-sm font-light transition-colors ${
                  filterPublished === 'draft'
                    ? 'bg-charcoal text-warm-white'
                    : 'bg-warm-white border border-warm-cream text-taupe hover:bg-warm-cream'
                }`}
              >
                Drafts
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-gold"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Posts List */}
              <div className="lg:col-span-1 bg-warm-white rounded-lg border border-warm-cream overflow-hidden">
                <div className="bg-warm-cream border-b border-warm-cream px-4 py-3">
                  <h2 className="font-medium text-charcoal tracking-wide">
                    Posts ({filteredPosts.length})
                  </h2>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                  {filteredPosts.map(post => (
                    <button
                      key={post.id}
                      onClick={() => handleSelectPost(post)}
                      className={`w-full text-left px-4 py-4 border-b border-warm-cream hover:bg-warm-cream/50 transition-colors ${
                        selectedPost?.id === post.id ? 'bg-warm-cream' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-charcoal pr-2 line-clamp-2">
                          {post.title}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-light flex-shrink-0 ${
                            post.published
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {post.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      {post.excerpt && (
                        <p className="text-xs text-taupe font-light mb-2 line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-taupe font-light">
                        {post.category && (
                          <span className="px-2 py-0.5 bg-warm-cream rounded">
                            {post.category}
                          </span>
                        )}
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </button>
                  ))}
                  {filteredPosts.length === 0 && (
                    <div className="p-8 text-center text-taupe font-light">
                      No posts found
                    </div>
                  )}
                </div>
              </div>

              {/* Editor */}
              <div className="lg:col-span-2 bg-warm-white rounded-lg border border-warm-cream overflow-hidden">
                {!selectedPost && !isCreating ? (
                  <div className="flex items-center justify-center h-full min-h-[600px] text-taupe">
                    <div className="text-center">
                      <svg
                        className="w-16 h-16 mx-auto mb-4 text-warm-cream"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <p className="font-light">Select a post or create a new one</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto">
                    {/* Header */}
                    <div className="bg-warm-cream border-b border-warm-cream px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                      <h2 className="text-xl font-light text-charcoal">
                        {isCreating ? 'New Post' : 'Edit Post'}
                      </h2>
                      <div className="flex gap-2">
                        {selectedPost && !isCreating && (
                          <button
                            onClick={handleDelete}
                            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-light text-sm"
                          >
                            Delete
                          </button>
                        )}
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-6 py-2 bg-charcoal text-warm-white rounded-lg hover:bg-charcoal/90 transition-colors font-light text-sm disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>

                    {/* Form */}
                    <div className="p-6 space-y-6">
                      {/* Title */}
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-2">
                          Title
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => handleTitleChange(e.target.value)}
                          placeholder="Enter post title..."
                          className="w-full px-4 py-3 border border-warm-cream rounded-lg focus:ring-2 focus:ring-warm-gold focus:border-transparent font-light text-charcoal bg-warm-white text-2xl"
                        />
                      </div>

                      {/* Slug */}
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-2">
                          Slug
                        </label>
                        <input
                          type="text"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value)}
                          placeholder="post-url-slug"
                          className="w-full px-4 py-3 border border-warm-cream rounded-lg focus:ring-2 focus:ring-warm-gold focus:border-transparent font-light text-charcoal bg-warm-white font-mono text-sm"
                        />
                      </div>

                      {/* Excerpt */}
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-2">
                          Excerpt
                        </label>
                        <textarea
                          value={excerpt}
                          onChange={(e) => setExcerpt(e.target.value)}
                          placeholder="Brief summary of the post..."
                          rows={3}
                          className="w-full px-4 py-3 border border-warm-cream rounded-lg focus:ring-2 focus:ring-warm-gold focus:border-transparent font-light text-charcoal bg-warm-white resize-none"
                        />
                      </div>

                      {/* Category & Reading Time */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-2">
                            Category
                          </label>
                          <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="Technology, Business, etc."
                            className="w-full px-4 py-3 border border-warm-cream rounded-lg focus:ring-2 focus:ring-warm-gold focus:border-transparent font-light text-charcoal bg-warm-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-2">
                            Reading Time (min)
                          </label>
                          <input
                            type="number"
                            value={readingTime}
                            onChange={(e) => setReadingTime(parseInt(e.target.value) || 0)}
                            min="1"
                            className="w-full px-4 py-3 border border-warm-cream rounded-lg focus:ring-2 focus:ring-warm-gold focus:border-transparent font-light text-charcoal bg-warm-white"
                          />
                        </div>
                      </div>

                      {/* Content Editor */}
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-2">
                          Content
                        </label>
                        <RichTextEditor
                          content={content}
                          onChange={setContent}
                          placeholder="Write your story..."
                        />
                      </div>

                      {/* Published Toggle */}
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="published"
                          checked={published}
                          onChange={(e) => setPublished(e.target.checked)}
                          className="w-5 h-5 rounded border-warm-cream text-warm-gold focus:ring-warm-gold"
                        />
                        <label htmlFor="published" className="text-sm font-medium text-charcoal">
                          Publish this post
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        <ConversationSidebar />
      </div>
    </AuthGuard>
  )
}
