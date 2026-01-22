'use client'

import { useState } from 'react'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setFormData({ name: '', email: '', message: '' })
    }, 3000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <section id="contact" className="py-20 px-6 sm:px-8 lg:px-12 bg-warm-white">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl mb-2 text-charcoal">
            Contact
          </h2>
          <div className="w-16 h-px bg-warm-gold mt-4 mb-6" />
          <p className="text-base text-taupe font-light leading-relaxed">
            For inquiries, partnerships, or just to say hello.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-sm text-charcoal mb-3 font-medium uppercase tracking-wide">
              Email
            </h3>
            <a
              href="mailto:hello@bill.com"
              className="text-charcoal hover:text-warm-gold transition-colors duration-300 hover-underline text-base font-light"
            >
              hello@bill.com
            </a>
          </div>

          <div>
            <h3 className="text-sm text-charcoal mb-3 font-medium uppercase tracking-wide">
              Availability
            </h3>
            <p className="text-taupe text-base font-light">
              Currently accepting new opportunities
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-12 space-y-6">
          <div>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Name"
              className="w-full px-0 py-3 bg-transparent border-0 border-b border-warm-cream text-charcoal placeholder-taupe focus:outline-none focus:border-warm-gold transition-colors font-light"
            />
          </div>
          <div>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Email"
              className="w-full px-0 py-3 bg-transparent border-0 border-b border-warm-cream text-charcoal placeholder-taupe focus:outline-none focus:border-warm-gold transition-colors font-light"
            />
          </div>
          <div>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Message"
              className="w-full px-0 py-3 bg-transparent border-0 border-b border-warm-cream text-charcoal placeholder-taupe focus:outline-none focus:border-warm-gold transition-colors resize-none font-light"
            />
          </div>
          <button
            type="submit"
            className="mt-6 px-6 py-3 bg-charcoal text-warm-white hover:bg-warm-gold transition-colors duration-300 text-sm font-light uppercase tracking-wide"
          >
            {submitted ? 'Sent' : 'Send Message'}
          </button>
        </form>
      </div>
    </section>
  )
}
