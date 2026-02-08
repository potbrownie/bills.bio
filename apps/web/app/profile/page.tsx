'use client'

import DashboardNavbar from '@/components/DashboardNavbar'
import ConversationSidebar from '@/components/ConversationSidebar'
import AuthGuard from '@/components/AuthGuard'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'

interface ProfileData {
  id: string
  name: string
  email: string
  bio?: string
  location?: string
  website?: string
  twitter?: string
  linkedin?: string
  github?: string
  company?: string
  job_title?: string
  phone?: string
  interests?: string[]
  expertise?: string[]
  values?: string[]
  projects?: Array<{ name: string; description: string; url?: string }>
  // Agent response settings
  response_style?: {
    tone?: string // warm, professional, casual, technical
    length?: string // concise, balanced, detailed
    formality?: string // casual, neutral, formal
    humor?: boolean
    emoji?: boolean
  }
  communication_preferences?: {
    first_person?: boolean // Always speak as "I" vs "Bill"
    personal_details?: boolean // Share personal anecdotes
    technical_depth?: string // high, medium, low
  }
  knowledge_base?: {
    topics?: Array<{ name: string; description: string; expertise_level: string }>
    custom_facts?: string[]
  }
}

export default function ProfilePage() {
  const { handleLogout } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'agent' | 'knowledge' | 'projects'>('basic')

  // Basic fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [twitter, setTwitter] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [github, setGithub] = useState('')
  const [company, setCompany] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [phone, setPhone] = useState('')

  // Interests & Expertise
  const [interests, setInterests] = useState<string[]>([])
  const [expertise, setExpertise] = useState<string[]>([])
  const [values, setValues] = useState<string[]>([])
  const [newInterest, setNewInterest] = useState('')
  const [newExpertise, setNewExpertise] = useState('')
  const [newValue, setNewValue] = useState('')

  // Agent settings
  const [responseTone, setResponseTone] = useState('warm')
  const [responseLength, setResponseLength] = useState('balanced')
  const [formality, setFormality] = useState('casual')
  const [useHumor, setUseHumor] = useState(true)
  const [useEmoji, setUseEmoji] = useState(false)
  const [technicalDepth, setTechnicalDepth] = useState('medium')

  // Knowledge base
  const [topics, setTopics] = useState<Array<{ name: string; description: string; expertise_level: string }>>([])
  const [customFacts, setCustomFacts] = useState<string[]>([])
  const [newTopic, setNewTopic] = useState({ name: '', description: '', expertise_level: 'intermediate' })
  const [newFact, setNewFact] = useState('')

  // Projects
  const [projects, setProjects] = useState<Array<{ name: string; description: string; url?: string }>>([])
  const [newProject, setNewProject] = useState({ name: '', description: '', url: '' })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/profile')
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      const data = await response.json()
      setProfile(data)
      
      // Basic fields
      setName(data.name || '')
      setEmail(data.email || '')
      setBio(data.bio || '')
      setLocation(data.location || '')
      setWebsite(data.website || '')
      setTwitter(data.twitter || '')
      setLinkedin(data.linkedin || '')
      setGithub(data.github || '')
      setCompany(data.company || '')
      setJobTitle(data.job_title || '')
      setPhone(data.phone || '')

      // Arrays
      setInterests(data.interests || [])
      setExpertise(data.expertise || [])
      setValues(data.values || [])
      setProjects(data.projects || [])

      // Agent settings
      const rs = data.response_style || {}
      setResponseTone(rs.tone || 'warm')
      setResponseLength(rs.length || 'balanced')
      setFormality(rs.formality || 'casual')
      setUseHumor(rs.humor !== false)
      setUseEmoji(rs.emoji === true)

      const cp = data.communication_preferences || {}
      setTechnicalDepth(cp.technical_depth || 'medium')

      // Knowledge base
      const kb = data.knowledge_base || {}
      setTopics(kb.topics || [])
      setCustomFacts(kb.custom_facts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          bio,
          location,
          website,
          twitter,
          linkedin,
          github,
          company,
          job_title: jobTitle,
          phone,
          interests,
          expertise,
          values,
          projects,
          response_style: {
            tone: responseTone,
            length: responseLength,
            formality,
            humor: useHumor,
            emoji: useEmoji,
          },
          communication_preferences: {
            first_person: true,
            personal_details: true,
            technical_depth: technicalDepth,
          },
          knowledge_base: {
            topics,
            custom_facts: customFacts,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const updated = await response.json()
      setProfile(updated)
      setSuccess(true)

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const addItem = (type: 'interest' | 'expertise' | 'value' | 'topic' | 'fact' | 'project') => {
    switch (type) {
      case 'interest':
        if (newInterest.trim()) {
          setInterests([...interests, newInterest.trim()])
          setNewInterest('')
        }
        break
      case 'expertise':
        if (newExpertise.trim()) {
          setExpertise([...expertise, newExpertise.trim()])
          setNewExpertise('')
        }
        break
      case 'value':
        if (newValue.trim()) {
          setValues([...values, newValue.trim()])
          setNewValue('')
        }
        break
      case 'topic':
        if (newTopic.name.trim()) {
          setTopics([...topics, { ...newTopic, name: newTopic.name.trim() }])
          setNewTopic({ name: '', description: '', expertise_level: 'intermediate' })
        }
        break
      case 'fact':
        if (newFact.trim()) {
          setCustomFacts([...customFacts, newFact.trim()])
          setNewFact('')
        }
        break
      case 'project':
        if (newProject.name.trim()) {
          setProjects([...projects, { ...newProject, name: newProject.name.trim() }])
          setNewProject({ name: '', description: '', url: '' })
        }
        break
    }
  }

  const removeItem = (type: string, index: number) => {
    switch (type) {
      case 'interest':
        setInterests(interests.filter((_, i) => i !== index))
        break
      case 'expertise':
        setExpertise(expertise.filter((_, i) => i !== index))
        break
      case 'value':
        setValues(values.filter((_, i) => i !== index))
        break
      case 'topic':
        setTopics(topics.filter((_, i) => i !== index))
        break
      case 'fact':
        setCustomFacts(customFacts.filter((_, i) => i !== index))
        break
      case 'project':
        setProjects(projects.filter((_, i) => i !== index))
        break
    }
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '👤' },
    { id: 'agent', label: 'AI Response Style', icon: '🤖' },
    { id: 'knowledge', label: 'Knowledge & Expertise', icon: '🧠' },
    { id: 'projects', label: 'Projects & Work', icon: '🚀' },
  ] as const

  return (
    <AuthGuard showBackLink>
      <div className="min-h-screen bg-warm-white">
        <DashboardNavbar onLogout={handleLogout} />

        <main className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-light text-charcoal mb-2">Complete Profile</h1>
            <p className="text-taupe">Manage your information and AI agent behavior</p>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800">✓ Profile updated successfully!</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-gold"></div>
            </div>
          ) : (
            <form onSubmit={handleSave}>
              {/* Tabs */}
              <div className="bg-white rounded-lg border border-warm-cream mb-6 overflow-hidden">
                <div className="flex border-b border-warm-cream overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 min-w-[140px] px-4 py-4 text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-warm-cream text-charcoal border-b-2 border-warm-gold'
                          : 'text-taupe hover:text-charcoal hover:bg-warm-cream/30'
                      }`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {/* BASIC INFO TAB */}
                  {activeTab === 'basic' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-2">Name *</label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-2">Email *</label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-2">Bio</label>
                        <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={4}
                          className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50 resize-none"
                          placeholder="Tell us about yourself..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-2">Location</label>
                          <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                            placeholder="City, Country"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-2">Phone</label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-2">Company</label>
                          <input
                            type="text"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-2">Job Title</label>
                          <input
                            type="text"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                          />
                        </div>
                      </div>

                      <div className="border-t border-warm-cream pt-6">
                        <h3 className="text-lg font-medium text-charcoal mb-4">Social Links</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-charcoal mb-2">Website</label>
                            <input
                              type="url"
                              value={website}
                              onChange={(e) => setWebsite(e.target.value)}
                              className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                              placeholder="https://yourwebsite.com"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-charcoal mb-2">Twitter / X</label>
                              <div className="flex">
                                <span className="px-3 py-2 bg-warm-cream/30 border border-r-0 border-warm-cream rounded-l-lg text-taupe">@</span>
                                <input
                                  type="text"
                                  value={twitter}
                                  onChange={(e) => setTwitter(e.target.value)}
                                  className="flex-1 px-4 py-2 border border-warm-cream rounded-r-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-charcoal mb-2">LinkedIn</label>
                              <input
                                type="text"
                                value={linkedin}
                                onChange={(e) => setLinkedin(e.target.value)}
                                className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                                placeholder="username"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-charcoal mb-2">GitHub</label>
                              <div className="flex">
                                <span className="px-3 py-2 bg-warm-cream/30 border border-r-0 border-warm-cream rounded-l-lg text-taupe">@</span>
                                <input
                                  type="text"
                                  value={github}
                                  onChange={(e) => setGithub(e.target.value)}
                                  className="flex-1 px-4 py-2 border border-warm-cream rounded-r-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-warm-cream pt-6">
                        <h3 className="text-lg font-medium text-charcoal mb-4">Interests & Values</h3>
                        
                        {/* Interests */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-charcoal mb-2">Interests</label>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={newInterest}
                              onChange={(e) => setNewInterest(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('interest'))}
                              className="flex-1 px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                              placeholder="Add an interest..."
                            />
                            <button
                              type="button"
                              onClick={() => addItem('interest')}
                              className="px-4 py-2 bg-warm-gold text-warm-white rounded-lg hover:bg-warm-gold/90"
                            >
                              Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {interests.map((interest, i) => (
                              <span key={i} className="inline-flex items-center gap-2 px-3 py-1 bg-warm-cream/50 text-charcoal rounded-full text-sm">
                                {interest}
                                <button type="button" onClick={() => removeItem('interest', i)} className="text-taupe hover:text-charcoal">×</button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Expertise */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-charcoal mb-2">Areas of Expertise</label>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={newExpertise}
                              onChange={(e) => setNewExpertise(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('expertise'))}
                              className="flex-1 px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                              placeholder="Add expertise area..."
                            />
                            <button
                              type="button"
                              onClick={() => addItem('expertise')}
                              className="px-4 py-2 bg-warm-gold text-warm-white rounded-lg hover:bg-warm-gold/90"
                            >
                              Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {expertise.map((item, i) => (
                              <span key={i} className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                {item}
                                <button type="button" onClick={() => removeItem('expertise', i)} className="hover:text-blue-900">×</button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Values */}
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-2">Values</label>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={newValue}
                              onChange={(e) => setNewValue(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('value'))}
                              className="flex-1 px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                              placeholder="Add a value..."
                            />
                            <button
                              type="button"
                              onClick={() => addItem('value')}
                              className="px-4 py-2 bg-warm-gold text-warm-white rounded-lg hover:bg-warm-gold/90"
                            >
                              Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {values.map((value, i) => (
                              <span key={i} className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                {value}
                                <button type="button" onClick={() => removeItem('value', i)} className="hover:text-green-900">×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI RESPONSE STYLE TAB */}
                  {activeTab === 'agent' && (
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-blue-800">
                          🤖 These settings control how your AI agent responds when people interact with it on your site.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-2">Response Tone</label>
                        <select
                          value={responseTone}
                          onChange={(e) => setResponseTone(e.target.value)}
                          className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                        >
                          <option value="warm">Warm & Friendly</option>
                          <option value="professional">Professional</option>
                          <option value="casual">Casual</option>
                          <option value="technical">Technical</option>
                        </select>
                        <p className="text-xs text-taupe mt-1">How your AI should come across in conversations</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-2">Response Length</label>
                        <select
                          value={responseLength}
                          onChange={(e) => setResponseLength(e.target.value)}
                          className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                        >
                          <option value="concise">Concise (brief answers)</option>
                          <option value="balanced">Balanced (moderate detail)</option>
                          <option value="detailed">Detailed (thorough explanations)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-2">Formality Level</label>
                        <select
                          value={formality}
                          onChange={(e) => setFormality(e.target.value)}
                          className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                        >
                          <option value="casual">Casual (relaxed, conversational)</option>
                          <option value="neutral">Neutral (balanced)</option>
                          <option value="formal">Formal (professional, structured)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-2">Technical Depth</label>
                        <select
                          value={technicalDepth}
                          onChange={(e) => setTechnicalDepth(e.target.value)}
                          className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                        >
                          <option value="low">Low (simple explanations)</option>
                          <option value="medium">Medium (balanced)</option>
                          <option value="high">High (technical details)</option>
                        </select>
                        <p className="text-xs text-taupe mt-1">How technical your responses should be</p>
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={useHumor}
                            onChange={(e) => setUseHumor(e.target.checked)}
                            className="w-5 h-5 text-warm-gold border-warm-cream rounded focus:ring-warm-gold"
                          />
                          <span className="text-sm text-charcoal">Use humor when appropriate</span>
                        </label>

                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={useEmoji}
                            onChange={(e) => setUseEmoji(e.target.checked)}
                            className="w-5 h-5 text-warm-gold border-warm-cream rounded focus:ring-warm-gold"
                          />
                          <span className="text-sm text-charcoal">Use emojis in responses</span>
                        </label>
                      </div>

                      <div className="border-t border-warm-cream pt-6">
                        <h3 className="text-lg font-medium text-charcoal mb-4">Communication Style Preview</h3>
                        <div className="bg-warm-cream/30 rounded-lg p-4">
                          <p className="text-sm text-taupe mb-2">Your AI will respond like:</p>
                          <div className="bg-white rounded-lg p-4 border border-warm-cream">
                            <p className="text-charcoal">
                              {responseTone === 'warm' && "Hi! I'm happy to help you with that. "}
                              {responseTone === 'professional' && "I'd be pleased to assist you with that. "}
                              {responseTone === 'casual' && "Hey! Sure, I can help with that. "}
                              {responseTone === 'technical' && "I can provide technical assistance with that. "}
                              {responseLength === 'concise' && "Here's the answer you need."}
                              {responseLength === 'balanced' && "Let me explain this clearly. The key points are..."}
                              {responseLength === 'detailed' && "Let me walk you through this in detail, covering all the important aspects..."}
                              {useEmoji && " ✨"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KNOWLEDGE & EXPERTISE TAB */}
                  {activeTab === 'knowledge' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-charcoal mb-4">Knowledge Topics</h3>
                        <p className="text-sm text-taupe mb-4">Add topics you're knowledgeable about. Your AI will reference these when relevant.</p>
                        
                        <div className="space-y-3 mb-4">
                          <input
                            type="text"
                            value={newTopic.name}
                            onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
                            className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                            placeholder="Topic name (e.g., 'Robotics', 'AI', 'Product Design')"
                          />
                          <textarea
                            value={newTopic.description}
                            onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50 resize-none"
                            placeholder="Brief description of your knowledge/experience..."
                          />
                          <div className="flex gap-2">
                            <select
                              value={newTopic.expertise_level}
                              onChange={(e) => setNewTopic({ ...newTopic, expertise_level: e.target.value })}
                              className="flex-1 px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                            >
                              <option value="beginner">Beginner</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="expert">Expert</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => addItem('topic')}
                              className="px-6 py-2 bg-warm-gold text-warm-white rounded-lg hover:bg-warm-gold/90"
                            >
                              Add Topic
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {topics.map((topic, i) => (
                            <div key={i} className="bg-warm-cream/30 rounded-lg p-4 border border-warm-cream">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-charcoal">{topic.name}</h4>
                                  <p className="text-sm text-taupe mt-1">{topic.description}</p>
                                  <span className="inline-block mt-2 px-2 py-1 bg-warm-gold/20 text-warm-gold text-xs rounded">
                                    {topic.expertise_level}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeItem('topic', i)}
                                  className="text-taupe hover:text-charcoal ml-4"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-warm-cream pt-6">
                        <h3 className="text-lg font-medium text-charcoal mb-4">Custom Facts</h3>
                        <p className="text-sm text-taupe mb-4">Add specific facts your AI should know about you.</p>
                        
                        <div className="flex gap-2 mb-4">
                          <input
                            type="text"
                            value={newFact}
                            onChange={(e) => setNewFact(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('fact'))}
                            className="flex-1 px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                            placeholder="E.g., 'I founded Instinct in 2023' or 'I speak 3 languages'"
                          />
                          <button
                            type="button"
                            onClick={() => addItem('fact')}
                            className="px-4 py-2 bg-warm-gold text-warm-white rounded-lg hover:bg-warm-gold/90"
                          >
                            Add
                          </button>
                        </div>

                        <div className="space-y-2">
                          {customFacts.map((fact, i) => (
                            <div key={i} className="flex items-start gap-3 bg-warm-cream/30 rounded-lg p-3 border border-warm-cream">
                              <span className="text-warm-gold mt-1">•</span>
                              <p className="flex-1 text-sm text-charcoal">{fact}</p>
                              <button
                                type="button"
                                onClick={() => removeItem('fact', i)}
                                className="text-taupe hover:text-charcoal"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PROJECTS TAB */}
                  {activeTab === 'projects' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-charcoal mb-4">Your Projects</h3>
                        <p className="text-sm text-taupe mb-4">Add projects you've worked on or are currently building.</p>
                        
                        <div className="space-y-3 mb-4">
                          <input
                            type="text"
                            value={newProject.name}
                            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                            className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                            placeholder="Project name"
                          />
                          <textarea
                            value={newProject.description}
                            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50 resize-none"
                            placeholder="Project description..."
                          />
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={newProject.url}
                              onChange={(e) => setNewProject({ ...newProject, url: e.target.value })}
                              className="flex-1 px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                              placeholder="Project URL (optional)"
                            />
                            <button
                              type="button"
                              onClick={() => addItem('project')}
                              className="px-6 py-2 bg-warm-gold text-warm-white rounded-lg hover:bg-warm-gold/90"
                            >
                              Add Project
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {projects.map((project, i) => (
                            <div key={i} className="bg-warm-cream/30 rounded-lg p-4 border border-warm-cream">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-charcoal">{project.name}</h4>
                                  <p className="text-sm text-taupe mt-1">{project.description}</p>
                                  {project.url && (
                                    <a
                                      href={project.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-warm-gold hover:underline mt-2"
                                    >
                                      {project.url}
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeItem('project', i)}
                                  className="text-taupe hover:text-charcoal ml-4"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={fetchProfile}
                  className="px-6 py-2 text-taupe hover:text-charcoal transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 bg-warm-gold text-warm-white rounded-lg hover:bg-warm-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {saving ? 'Saving...' : 'Save All Changes'}
                </button>
              </div>
            </form>
          )}
        </main>

        <ConversationSidebar />
      </div>
    </AuthGuard>
  )
}
