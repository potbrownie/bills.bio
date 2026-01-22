'use client'

interface Venture {
  id: number
  name: string
  description: string
  details: string[]
  year: string
  status: string
  link?: string
}

const ventures: Venture[] = [
  {
    id: 1,
    name: 'Company Name',
    description: 'Building the future of [industry]. Solving complex problems with simple, elegant solutions.',
    details: [
      'Raised $X million in seed funding',
      'Team of 15+ employees',
      'Serving 10,000+ customers',
    ],
    year: '2020',
    status: 'Active',
    link: '#',
  },
  {
    id: 2,
    name: 'Previous Venture',
    description: 'Created [impact]. Acquired by [company] in 2023.',
    details: [
      'Built from 0 to $X in revenue',
      'Team of 25+ employees',
      'Acquired by [Company Name]',
    ],
    year: '2018',
    status: 'Acquired',
    link: '#',
  },
  {
    id: 3,
    name: 'Early Project',
    description: 'An early exploration into [space]. Laid the foundation for future work.',
    details: [
      'MVP launched in 3 months',
      '1,000+ early users',
      'Validated core concept',
    ],
    year: '2016',
    status: 'Completed',
    link: '#',
  },
]

export default function ProjectGrid() {
  return (
    <section id="ventures" className="py-20 px-6 sm:px-8 lg:px-12 bg-warm-white">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl mb-2 text-charcoal">
            Ventures
          </h2>
          <div className="w-16 h-px bg-warm-gold mt-4" />
        </div>

        <div className="space-y-16">
          {ventures.map((venture) => (
            <div
              key={venture.id}
              className="group pb-16 border-b border-warm-cream last:border-0 last:pb-0"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div className="flex-1">
                  <div className="flex items-baseline gap-3 mb-2">
                    <h3 className="text-xl sm:text-2xl text-charcoal">
                      {venture.name}
                    </h3>
                    <span className="text-xs text-taupe font-light">
                      {venture.year}
                    </span>
                    <span className="text-xs px-2 py-1 bg-warm-cream text-taupe rounded-sm uppercase tracking-wide">
                      {venture.status}
                    </span>
                  </div>
                  <p className="text-taupe text-base font-light leading-relaxed mb-4 max-w-2xl">
                    {venture.description}
                  </p>
                  <ul className="space-y-1 mb-4">
                    {venture.details.map((detail, index) => (
                      <li key={index} className="text-sm text-taupe font-light flex items-start gap-2">
                        <span className="text-warm-gold mt-1.5">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                  {venture.link && (
                    <a
                      href={venture.link}
                      className="inline-flex items-center gap-2 text-sm text-charcoal hover:text-warm-gold transition-colors hover-underline"
                    >
                      Learn more
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
