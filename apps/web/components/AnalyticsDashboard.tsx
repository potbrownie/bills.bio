'use client'

import { useEffect, useState } from 'react'

interface AnalyticsStats {
  total: number
  byCountry: Record<string, number>
  byCity: Record<string, number>
  byBrowser: Record<string, number>
  byDevice: Record<string, number>
  byOS: Record<string, number>
  avgThreatLevel: number
  proxyCount: number
  vpnCount: number
  torCount: number
  datacenterCount: number
  botCount: number
}

interface Session {
  id: string
  ip: string
  country: string
  city: string
  browser: string
  os: string
  deviceType: string
  threatLevel: number
  isProxy: boolean
  isVPN: boolean
  isTor: boolean
  createdAt: number
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    country: '',
    deviceType: '',
    threatLevel: '',
  })

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.country) params.set('country', filter.country)
      if (filter.deviceType) params.set('deviceType', filter.deviceType)
      if (filter.threatLevel) params.set('threatLevel', filter.threatLevel)

      const response = await fetch(`/api/analytics?${params}`)
      const data = await response.json()
      
      setStats(data.stats)
      setSessions(data.sessions)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [filter])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-warm-cream rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-32 bg-warm-cream rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-8">
        <p className="text-taupe font-light">No analytics data available yet.</p>
      </div>
    )
  }

  const topCountries = Object.entries(stats.byCountry)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const topCities = Object.entries(stats.byCity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div>
      {/* Removed header - it's now in the page wrapper */}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12 mt-6">
        <div className="bg-warm-white rounded-lg border border-warm-cream p-6 transition-all hover:border-warm-gold">
          <div className="text-sm text-taupe font-light tracking-wide mb-1">Total Visitors</div>
          <div className="text-3xl font-light text-charcoal">{stats.total.toLocaleString()}</div>
        </div>

        <div className="bg-warm-white rounded-lg border border-warm-cream p-6 transition-all hover:border-warm-gold">
          <div className="text-sm text-taupe font-light tracking-wide mb-1">Avg Threat Level</div>
          <div className="text-3xl font-light">
            <span className={stats.avgThreatLevel > 50 ? 'text-red-600' : 'text-green-600'}>
              {stats.avgThreatLevel.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="bg-warm-white rounded-lg border border-warm-cream p-6 transition-all hover:border-warm-gold">
          <div className="text-sm text-taupe font-light tracking-wide mb-1">Proxy/VPN Users</div>
          <div className="text-3xl font-light text-orange-600">
            {stats.proxyCount + stats.vpnCount}
          </div>
        </div>

        <div className="bg-warm-white rounded-lg border border-warm-cream p-6 transition-all hover:border-warm-gold">
          <div className="text-sm text-taupe font-light tracking-wide mb-1">Bot Traffic</div>
          <div className="text-3xl font-light text-purple-600">{stats.botCount}</div>
        </div>
      </div>

      {/* Security Alerts */}
      {(stats.torCount > 0 || stats.avgThreatLevel > 40) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-12">
          <h3 className="font-medium text-red-800 mb-2 tracking-wide">Security Alerts</h3>
          <ul className="text-sm text-red-700 space-y-1 font-light">
            {stats.torCount > 0 && (
              <li>• {stats.torCount} Tor exit node(s) detected</li>
            )}
            {stats.avgThreatLevel > 40 && (
              <li>• Average threat level is elevated ({stats.avgThreatLevel.toFixed(1)})</li>
            )}
            {stats.datacenterCount > stats.total * 0.3 && (
              <li>• High datacenter traffic ({((stats.datacenterCount / stats.total) * 100).toFixed(1)}%)</li>
            )}
          </ul>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Top Countries */}
        <div className="bg-warm-white rounded-lg border border-warm-cream p-6 transition-all hover:border-warm-gold">
          <h3 className="font-medium text-charcoal mb-4 tracking-wide">Top Countries</h3>
          <div className="space-y-3">
            {topCountries.map(([country, count]) => (
              <div key={country}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-charcoal font-light">{country}</span>
                  <span className="font-medium text-charcoal">{count}</span>
                </div>
                <div className="w-full bg-warm-cream rounded-full h-2">
                  <div
                    className="bg-charcoal h-2 rounded-full"
                    style={{ width: `${(count / stats.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cities */}
        <div className="bg-warm-white rounded-lg border border-warm-cream p-6 transition-all hover:border-warm-gold">
          <h3 className="font-medium text-charcoal mb-4 tracking-wide">Top Cities</h3>
          <div className="space-y-3">
            {topCities.map(([city, count]) => (
              <div key={city}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-charcoal font-light">{city}</span>
                  <span className="font-medium text-charcoal">{count}</span>
                </div>
                <div className="w-full bg-warm-cream rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${(count / stats.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Types */}
        <div className="bg-warm-white rounded-lg border border-warm-cream p-6 transition-all hover:border-warm-gold">
          <h3 className="font-medium text-charcoal mb-4 tracking-wide">Device Types</h3>
          <div className="space-y-3">
            {Object.entries(stats.byDevice).map(([device, count]) => (
              <div key={device}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-charcoal font-light">{device}</span>
                  <span className="font-medium text-charcoal">{count}</span>
                </div>
                <div className="w-full bg-warm-cream rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${(count / stats.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Browsers */}
        <div className="bg-warm-white rounded-lg border border-warm-cream p-6 transition-all hover:border-warm-gold">
          <h3 className="font-medium text-charcoal mb-4 tracking-wide">Browsers</h3>
          <div className="space-y-3">
            {Object.entries(stats.byBrowser)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([browser, count]) => (
                <div key={browser}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-charcoal font-light">{browser}</span>
                    <span className="font-medium text-charcoal">{count}</span>
                  </div>
                  <div className="w-full bg-warm-cream rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full"
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="bg-warm-white rounded-lg border border-warm-cream overflow-hidden">
        <div className="p-6 border-b border-warm-cream">
          <h3 className="font-medium text-charcoal tracking-wide">Recent Sessions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-warm-cream">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-light text-taupe uppercase tracking-wide">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-light text-taupe uppercase tracking-wide">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-light text-taupe uppercase tracking-wide">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-light text-taupe uppercase tracking-wide">
                  Browser
                </th>
                <th className="px-6 py-3 text-left text-xs font-light text-taupe uppercase tracking-wide">
                  Threat
                </th>
                <th className="px-6 py-3 text-left text-xs font-light text-taupe uppercase tracking-wide">
                  Flags
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream">
              {sessions.slice(0, 20).map((session, index) => (
                <tr key={session.id || `session-${index}`} className="hover:bg-warm-cream/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-light text-charcoal">
                    {new Date(session.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-light text-charcoal">
                    {session.city}, {session.country}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm capitalize font-light text-charcoal">
                    {session.deviceType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-light text-charcoal">
                    {session.browser} / {session.os}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-light rounded ${
                        session.threatLevel > 70
                          ? 'bg-red-100 text-red-800'
                          : session.threatLevel > 40
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {session.threatLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs">
                    {session.isTor && (
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded mr-1 font-light">
                        TOR
                      </span>
                    )}
                    {session.isVPN && (
                      <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 rounded mr-1 font-light">
                        VPN
                      </span>
                    )}
                    {session.isProxy && (
                      <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded mr-1 font-light">
                        PROXY
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
