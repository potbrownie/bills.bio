'use client'

import { useEffect, useState } from 'react'

interface LinkCard {
  id: number
  title: string
  description?: string
  href: string
  icon?: string
}

const linkCards: LinkCard[] = []

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  reading_time: number
  published_at: string
}

export default function Hero() {
  const [mounted, setMounted] = useState(false)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])

  useEffect(() => {
    setMounted(true)
    fetchBlogPosts()
  }, [])

  const fetchBlogPosts = async () => {
    try {
      const res = await fetch('/api/blog?published=true&limit=3')
      const data = await res.json()
      setBlogPosts(data.posts || [])
    } catch (error) {
      console.error('Failed to fetch blog posts:', error)
    }
  }

  return (
    <section className="relative min-h-screen px-6 sm:px-8 lg:px-12 pt-32 pb-20">
      <div className="max-w-2xl mx-auto w-full text-center">
        <div
          className={`transition-all duration-1000 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="mb-8 flex justify-center">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-2 border-warm-cream bg-warm-cream">
              <img
                src="https://i.namu.wiki/i/djtuzk91thpExQ-G-ZGu20SJzIxyyvVUsF04bdNImmwW5pYvpDJ6vJMJni1ZiixHsbmGm2iY5wj9XPJISbYzPg.webp"
                alt="Bill"
                className="object-cover w-full h-full"
                onError={(e) => {
                  // Fallback to placeholder if image doesn't exist
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-4xl text-taupe font-light">B</div>'
                  }
                }}
              />
            </div>
          </div>
          <h1 className="text-display mb-6 text-charcoal">
            Hi, I'm Bill
          </h1>
          <div className="text-xl sm:text-2xl text-taupe mb-20 font-light max-w-xl mx-auto leading-relaxed space-y-4">
            <p>
              I'm currently working on Instinct, building service robots powering the future of hospitality.
            </p>
            <p>
              Previously, I worked on Anystay, the first AI powered accommodation search engine and VOLT, an electric bike company I founded at 16.
            </p>
            <p>
              I live in Brisbane, Australia and spend some time each year in Guangzhou with my family.
            </p>
          </div>

          {/* Interests Section */}
          <div className="mb-20">
            <h2 className="text-sm text-taupe font-light mb-6 tracking-wide">Interests</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="group cursor-pointer">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-warm-cream mb-2">
                  <img
                    src="https://i.redd.it/9r8txdd8wz341.jpg"
                    alt="Design"
                    className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110 group-hover:brightness-75"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/40 transition-all duration-300 flex items-start justify-start p-4">
                    <p className="text-xs text-warm-white font-light text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Apple's logo blueprint. Simple, timeless, says everything with almost nothing.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-taupe font-light text-center group-hover:text-warm-gold transition-colors">Design</p>
              </div>
              <div className="group cursor-pointer">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-warm-cream mb-2">
                  <img
                    src="https://fullfatthings-keyaero.b-cdn.net/sites/keyaero/files/styles/article_body/public/woodwing/2023-04/179959.jpeg?itok=PUzvltKe"
                    alt="Aviation"
                    className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110 group-hover:brightness-75"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/40 transition-all duration-300 flex items-start justify-start p-4">
                    <p className="text-xs text-warm-white font-light text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      The F14. Most advanced of its time, brutal and beautiful at the same time.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-taupe font-light text-center group-hover:text-warm-gold transition-colors">Aviation</p>
              </div>
              <div className="group cursor-pointer">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-warm-cream mb-2">
                  <img
                    src="https://www.expats.cz/images/publishing/articles/2021/07/1280_650/reinforced-door-in-the-javor-51-bunker-photo-atom-musuem-zrbis.webp"
                    alt="Soviet nuclear bunkers"
                    className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110 group-hover:brightness-75"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/40 transition-all duration-300 flex items-start justify-start p-4">
                    <p className="text-xs text-warm-white font-light text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Javor-51. Best preserved Soviet bunker—you can feel the Cold War tension in those walls.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-taupe font-light text-center group-hover:text-warm-gold transition-colors">Soviet Nuclear Bunkers</p>
              </div>
              <div className="group cursor-pointer">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-warm-cream mb-2">
                  <img
                    src="https://static.evo.com/content/cms/evotrip/japan/private-trips/updates_230820/trip-furano.jpg"
                    alt="Snowboarding"
                    className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110 group-hover:brightness-75"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/40 transition-all duration-300 flex items-start justify-start p-4">
                    <p className="text-xs text-warm-white font-light text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Japow. That powder is like nothing else—light, deep, keeps coming. Best snow on the planet.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-taupe font-light text-center group-hover:text-warm-gold transition-colors">Snowboarding</p>
              </div>
              <div className="group cursor-pointer">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-warm-cream mb-2">
                  <img
                    src="https://i0.wp.com/mrleica.com/wp-content/uploads/2024/11/leica-product-photography.jpg?ssl=1"
                    alt="Photography"
                    className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110 group-hover:brightness-75"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/40 transition-all duration-300 flex items-start justify-start p-4">
                    <p className="text-xs text-warm-white font-light text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Leica. The optics and build quality—nothing else comes close.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-taupe font-light text-center group-hover:text-warm-gold transition-colors">Photography</p>
              </div>
              <div className="group cursor-pointer">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-warm-cream mb-2">
                  <img
                    src="https://www.miniatur-wunderland.com/assets/content/layout/italien/italien-riomaggiore-haeuser.jpg"
                    alt="Model railways"
                    className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110 group-hover:brightness-75"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/40 transition-all duration-300 flex items-start justify-start p-4">
                    <p className="text-xs text-warm-white font-light text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Miniatur Wunderland. HO scale. World's largest model railway—the detail is unmatched.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-taupe font-light text-center group-hover:text-warm-gold transition-colors">Model Railways</p>
              </div>
            </div>
          </div>

          {/* Goals Section */}
          <div className="mb-20">
            <h2 className="text-sm text-taupe font-light mb-6 tracking-wide">Goals</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium text-charcoal mb-1">
                  2x the operational efficiency per employee
                </h3>
                <p className="text-sm text-taupe font-light">
                  Double human productivity with intelligent bi-manual robots
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-charcoal mb-1">
                  Build a commercially viable service robot for under $25k
                </h3>
                <p className="text-sm text-taupe font-light">
                  Making advanced robotics accessible to the hospitality industry
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-charcoal mb-1">
                  Build 1000 robots in the first year
                </h3>
                <p className="text-sm text-taupe font-light">
                  Scaling production to meet market demand
                </p>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="mb-20">
            <h2 className="text-sm text-taupe font-light mb-6 tracking-wide">Timeline</h2>
            <div className="relative md:ml-16">
              {/* Vertical line */}
              <div className="absolute left-3 md:left-0 top-0 bottom-0 w-px bg-warm-cream"></div>
              
              <div className="space-y-8 pl-8 md:pl-8">
                <div className="relative flex flex-col md:block">
                  <p className="text-xs text-taupe font-light text-left mb-2 md:absolute md:right-full md:top-1/2 md:-translate-y-1/2 md:pr-12 md:mb-0 md:whitespace-nowrap">
                    2017
                  </p>
                  <div className="border border-warm-cream rounded-lg p-4 text-left flex gap-4">
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-warm-cream">
                      <img
                        src="https://s3-media0.fl.yelpcdn.com/bphoto/6xWRtSipXbFNsFqpNn6zJQ/348s.jpg"
                        alt="Timeline image"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-charcoal mb-1">
                        Founding VOLT electric bikes
                      </h3>
                      <p className="text-sm text-taupe font-light">
                        Started in high school. Made 6 figures in the first year.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="relative flex flex-col md:block">
                  <p className="text-xs text-taupe font-light text-left mb-2 md:absolute md:right-full md:top-1/2 md:-translate-y-1/2 md:pr-12 md:mb-0 md:whitespace-nowrap">
                    2019
                  </p>
                  <div className="border border-warm-cream rounded-lg p-4 text-left flex gap-4">
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-warm-cream">
                      <img
                        src="https://emovebikes.com.au/cdn/shop/collections/smarcycle_0caf8346-980d-4efb-8681-c0e8455886da.png?v=1734587089"
                        alt="Timeline image"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-charcoal mb-1">
                        Smarcycle
                      </h3>
                      <p className="text-sm text-taupe font-light">
                        Grew this into Queensland's leading ebike rental service.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="relative flex flex-col md:block">
                  <p className="text-xs text-taupe font-light text-left mb-2 md:absolute md:right-full md:top-1/2 md:-translate-y-1/2 md:pr-12 md:mb-0 md:whitespace-nowrap">
                    2020
                  </p>
                  <div className="border border-warm-cream rounded-lg p-4 text-left flex gap-4">
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-warm-cream">
                      <img
                        src="https://yt3.googleusercontent.com/ytc/AIdro_m-pjPscEUO656li1Dyn9VS9XcZAUQLslH_klSBb2Ndg1E=s900-c-k-c0x00ffffff-no-rj"
                        alt="Timeline image"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-charcoal mb-1">
                        Dropped out
                      </h3>
                      <p className="text-sm text-taupe font-light">
                        Description
                      </p>
                    </div>
                  </div>
                </div>
                <div className="relative flex flex-col md:block">
                  <p className="text-xs text-taupe font-light text-left mb-2 md:absolute md:right-full md:top-1/2 md:-translate-y-1/2 md:pr-12 md:mb-0 md:whitespace-nowrap">
                    2022
                  </p>
                  <div className="border border-warm-cream rounded-lg p-4 text-left flex gap-4">
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-warm-cream">
                      <img
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmAKXny0o0IVieTXx60qKqAW-aqp1vCJ69UA&s"
                        alt="Timeline image"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-charcoal mb-1">
                        Founded Anystay
                      </h3>
                      <p className="text-sm text-taupe font-light">
                        Description
                      </p>
                    </div>
                  </div>
                </div>
                <div className="relative flex flex-col md:block">
                  <p className="text-xs text-taupe font-light text-left mb-2 md:absolute md:right-full md:top-1/2 md:-translate-y-1/2 md:pr-12 md:mb-0 md:whitespace-nowrap">
                    2026
                  </p>
                  <div className="border border-warm-cream rounded-lg p-4 text-left flex gap-4">
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-warm-cream">
                      <img
                        src="https://media.licdn.com/dms/image/v2/D5622AQEbMZwSP3TuNg/feedshare-shrink_800/B56Zf21N1GGoAk-/0/1752192835819?e=2147483647&v=beta&t=tOMjJ4LcZwYDIb_mIzMYqP_kzNTP6pHthTgumFWF91I"
                        alt="Timeline image"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-charcoal mb-1">
                        Mind, my new robotics company
                      </h3>
                      <p className="text-sm text-taupe font-light">
                        Description
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ideas Section */}
          <div className="mb-20">
            <h2 className="text-sm text-taupe font-light mb-6 tracking-wide">Ideas</h2>
            <div className="flex flex-wrap gap-3 items-center justify-center">
              <span className="text-2xl text-charcoal font-semibold">Internet of agents</span>
              <span className="text-base text-charcoal font-semibold">Agentic commerce</span>
              <span className="text-xl text-charcoal font-semibold">Embedded intelligence</span>
              <span className="text-sm text-charcoal font-semibold">Hospitality</span>
              <span className="text-lg text-charcoal font-semibold">Robotics</span>
              <span className="text-base text-charcoal font-semibold">Personal AI</span>
            </div>
          </div>

          {/* Thoughts Section */}
          <div className="mb-12">
            <h2 className="text-sm text-taupe font-light mb-6 tracking-wide text-center">Thoughts</h2>
            <div className="space-y-6 text-left">
              {blogPosts.length > 0 ? (
                blogPosts.map((post) => (
                  <a 
                    key={post.id} 
                    href={`/blog/${post.slug}`}
                    className="block group"
                  >
                    <article>
                      <div className="flex items-center gap-3 mb-2">
                        {post.category && (
                          <span className="text-xs px-2 py-1 bg-warm-cream text-taupe rounded-md uppercase tracking-wide">
                            {post.category}
                          </span>
                        )}
                        {post.reading_time && (
                          <span className="text-xs text-taupe font-light">
                            {post.reading_time} min
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-medium text-charcoal mb-2 group-hover:text-warm-gold transition-colors">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="text-sm text-taupe font-light leading-relaxed mb-2">
                          {post.excerpt}
                        </p>
                      )}
                      {post.published_at && (
                        <time className="text-xs text-taupe font-light">
                          {new Date(post.published_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </time>
                      )}
                    </article>
                  </a>
                ))
              ) : (
                <div className="text-center text-taupe font-light py-8">
                  No blog posts yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
