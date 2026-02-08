'use client'

import DashboardNavbar from '@/components/DashboardNavbar'
import ConversationSidebar from '@/components/ConversationSidebar'
import AuthGuard from '@/components/AuthGuard'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'

interface Settings {
  // Features
  agent_enabled: boolean
  analytics_enabled: boolean
  email_notifications: boolean
  
  // Security
  current_password?: string
  new_password?: string
}

export default function SettingsPage() {
  const { handleLogout } = useAuth()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Feature toggles
  const [agentEnabled, setAgentEnabled] = useState(true)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(false)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/settings')
      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }
      const data = await response.json()
      setSettings(data)
      
      // Load settings
      setAgentEnabled(data.agent_enabled !== false)
      setAnalyticsEnabled(data.analytics_enabled !== false)
      setEmailNotifications(data.email_notifications === true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_enabled: agentEnabled,
          analytics_enabled: analyticsEnabled,
          email_notifications: emailNotifications,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update settings')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to change password')
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthGuard showBackLink>
      <div className="min-h-screen bg-warm-white">
        <DashboardNavbar onLogout={handleLogout} />

        <main className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-light text-charcoal mb-2">Settings</h1>
            <p className="text-taupe">Manage essential features and security</p>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800">✓ Settings updated successfully</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-gold"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Features */}
              <div className="bg-white rounded-lg border border-warm-cream p-6 shadow-sm">
                <h2 className="text-xl font-light text-charcoal mb-4">Features</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between py-3 border-b border-warm-cream last:border-0">
                    <div className="flex-1">
                      <div className="font-medium text-charcoal">AI Agent</div>
                      <p className="text-sm text-taupe mt-1">Allow visitors to chat with your AI agent</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAgentEnabled(!agentEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        agentEnabled ? 'bg-warm-gold' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          agentEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>

                  <label className="flex items-center justify-between py-3 border-b border-warm-cream last:border-0">
                    <div className="flex-1">
                      <div className="font-medium text-charcoal">Analytics</div>
                      <p className="text-sm text-taupe mt-1">Track visitor analytics and insights</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        analyticsEnabled ? 'bg-warm-gold' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          analyticsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>

                  <label className="flex items-center justify-between py-3">
                    <div className="flex-1">
                      <div className="font-medium text-charcoal">Email Notifications</div>
                      <p className="text-sm text-taupe mt-1">Receive email notifications for new messages</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailNotifications(!emailNotifications)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        emailNotifications ? 'bg-warm-gold' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          emailNotifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                </div>

                <div className="mt-6 pt-4 border-t border-warm-cream">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-6 py-2 bg-warm-gold text-warm-white rounded-lg hover:bg-warm-gold/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Security */}
              <div className="bg-white rounded-lg border border-warm-cream p-6 shadow-sm">
                <h2 className="text-xl font-light text-charcoal mb-4">Security</h2>
                
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                      placeholder="Enter new password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-warm-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                      placeholder="Confirm new password"
                    />
                  </div>

                  {passwordError && (
                    <p className="text-sm text-red-600">{passwordError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                    className="px-6 py-2 bg-charcoal text-warm-white rounded-lg hover:bg-charcoal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Change Password
                  </button>
                </form>
              </div>

              {/* Danger Zone */}
              <div className="bg-white rounded-lg border border-red-200 p-6 shadow-sm">
                <h2 className="text-xl font-light text-red-600 mb-4">Danger Zone</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-red-100">
                    <div>
                      <div className="font-medium text-charcoal">Clear Analytics Data</div>
                      <p className="text-sm text-taupe mt-1">Remove all visitor tracking data</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Clear all analytics data? This cannot be undone.')) {
                          fetch('/api/settings/clear-analytics', { method: 'POST' })
                            .then(() => setSuccess(true))
                        }
                      }}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                    >
                      Clear Data
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium text-charcoal">Reset All Settings</div>
                      <p className="text-sm text-taupe mt-1">Reset everything to default values</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Reset all settings to defaults? This cannot be undone.')) {
                          fetch('/api/settings/reset', { method: 'POST' })
                            .then(() => {
                              setSuccess(true)
                              fetchSettings()
                            })
                        }
                      }}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <ConversationSidebar />
      </div>
    </AuthGuard>
  )
}
