'use client'

const interests = [
  'Technology & Innovation',
  'Design & Aesthetics',
  'Books & Reading',
  'Coffee & Food',
]

export default function About() {
  return (
    <section id="about" className="py-20 px-6 sm:px-8 lg:px-12 bg-warm-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl mb-2 text-charcoal">
            About
          </h2>
          <div className="w-16 h-px bg-warm-gold mt-4" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4 text-base text-taupe leading-relaxed font-light">
            <p>
              I'm Bill, and this is my personal space on the web. I write about things that interest me, 
              share stuff I find cool, and experiment with new ideas.
            </p>
            
            <p>
              When I'm not building things, you'll find me reading, exploring new places, 
              or having conversations about technology, design, and life.
            </p>

            <p>
              Feel free to browse around, read my thoughts, or chat with my AI if you want to learn more 
              about me or just have a conversation.
            </p>
          </div>

          <div>
            <h3 className="text-lg text-charcoal mb-4 font-light">
              Things I Like
            </h3>
            <ul className="space-y-2">
              {interests.map((interest, index) => (
                <li key={index} className="text-sm text-taupe font-light flex items-center gap-2">
                  <span className="text-warm-gold">—</span>
                  <span>{interest}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
