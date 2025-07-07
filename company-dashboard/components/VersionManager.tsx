'use client'

import { useState, useEffect } from 'react'
import { ApiClient } from '@3d-measurement-app/api-client'

interface GenerationAttempt {
  id: string
  attempt_number: number
  status: string
  model_quality_score: number | null
  processing_time_seconds: number | null
  glb_url: string | null
  selected: boolean
  archived: boolean
  archived_at: string | null
  archive_reason: string | null
  days_archived?: number
  canRestore?: boolean
  created_at: string
  error_message?: string
}

interface VersionData {
  versions: GenerationAttempt[]
  limits: {
    current: number
    max: number
    archived: number
  }
  archiveInfo: {
    archived_count: string
    oldest_archived: string | null
    newest_archived: string | null
    retentionDays: number
  }
}

interface VersionManagerProps {
  orderId: string
  onVersionSelected?: (version: GenerationAttempt) => void
}

export default function VersionManager({ orderId, onVersionSelected }: VersionManagerProps) {
  const [versionData, setVersionData] = useState<VersionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [includeArchived, setIncludeArchived] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadVersions = async () => {
    try {
      setLoading(true)
      const apiClient = new ApiClient()
      const response = await apiClient.request(`/api/orders/${orderId}/versions?includeArchived=${includeArchived}`)
      setVersionData(response)
      setError(null)
    } catch (err) {
      console.error('Failed to load versions:', err)
      setError('Failed to load versions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVersions()
  }, [orderId, includeArchived])

  const handleArchiveVersion = async (attemptId: string, reason = 'manual') => {
    try {
      setActionLoading(attemptId)
      const apiClient = new ApiClient()
      await apiClient.request(`/api/versions/${attemptId}/archive`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      })
      await loadVersions()
    } catch (err) {
      console.error('Failed to archive version:', err)
      setError('Failed to archive version')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRestoreVersion = async (attemptId: string) => {
    try {
      setActionLoading(attemptId)
      const apiClient = new ApiClient()
      const response = await apiClient.request(`/api/versions/${attemptId}/restore`, {
        method: 'POST'
      })
      
      if (response.needsArchiving) {
        // Show message about auto-archiving
        alert(`Version restored. ${response.message}`)
      }
      
      await loadVersions()
    } catch (err) {
      console.error('Failed to restore version:', err)
      setError('Failed to restore version')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCleanupQuality = async () => {
    try {
      setActionLoading('cleanup')
      const apiClient = new ApiClient()
      const response = await apiClient.request(`/api/orders/${orderId}/versions/cleanup-quality`, {
        method: 'POST',
        body: JSON.stringify({ minQualityScore: 0.3 })
      })
      
      alert(`${response.message}`)
      await loadVersions()
    } catch (err) {
      console.error('Failed to cleanup versions:', err)
      setError('Failed to cleanup versions')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (version: GenerationAttempt) => {
    if (version.archived) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          📦 Archived
        </span>
      )
    }
    
    if (version.selected) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          ✓ Active
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Available
      </span>
    )
  }

  const getQualityBadge = (score: number | null) => {
    if (score === null) return null
    
    if (score >= 0.8) {
      return <span className="text-green-600 font-medium">Excellent ({(score * 100).toFixed(0)}%)</span>
    } else if (score >= 0.6) {
      return <span className="text-yellow-600 font-medium">Good ({(score * 100).toFixed(0)}%)</span>
    } else {
      return <span className="text-red-600 font-medium">Poor ({(score * 100).toFixed(0)}%)</span>
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!versionData) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          {error || 'No version data available'}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Version Management</h3>
            <p className="text-sm text-gray-600">
              {versionData.limits.current}/{versionData.limits.max} versions 
              {versionData.limits.archived > 0 && ` • ${versionData.limits.archived} archived`}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="mr-2"
              />
              Show archived
            </label>
            
            {versionData.versions.some(v => !v.archived && !v.selected && v.model_quality_score && v.model_quality_score < 0.5) && (
              <button
                onClick={handleCleanupQuality}
                disabled={actionLoading === 'cleanup'}
                className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50"
              >
                {actionLoading === 'cleanup' ? 'Cleaning...' : 'Archive Low Quality'}
              </button>
            )}
          </div>
        </div>
        
        {/* Limits warning */}
        {versionData.limits.current >= versionData.limits.max && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
            ⚠️ Version limit reached. New generations will automatically archive the oldest version.
          </div>
        )}
      </div>

      <div className="p-6">
        {versionData.versions.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No versions available
          </div>
        ) : (
          <div className="space-y-4">
            {versionData.versions.map((version) => (
              <div
                key={version.id}
                className={`border rounded-lg p-4 transition-colors ${
                  version.selected ? 'border-blue-300 bg-blue-50' : 
                  version.archived ? 'border-gray-200 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">
                        Version {version.attempt_number}
                      </h4>
                      {getStatusBadge(version)}
                      {version.model_quality_score && getQualityBadge(version.model_quality_score)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Status:</span> {version.status}
                      </div>
                      {version.processing_time_seconds && (
                        <div>
                          <span className="font-medium">Time:</span> {version.processing_time_seconds}s
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Created:</span>{' '}
                        {new Date(version.created_at).toLocaleDateString()}
                      </div>
                      {version.archived && version.days_archived !== undefined && (
                        <div>
                          <span className="font-medium">Archived:</span> {version.days_archived} days ago
                        </div>
                      )}
                    </div>
                    
                    {version.error_message && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        Error: {version.error_message}
                      </div>
                    )}
                    
                    {version.archived && version.archive_reason && (
                      <div className="mt-2 text-xs text-gray-500">
                        Archived: {version.archive_reason.replace('_', ' ')}
                        {version.days_archived !== undefined && version.days_archived > versionData.archiveInfo.retentionDays - 7 && (
                          <span className="text-yellow-600 ml-2">
                            ⚠️ Will be permanently deleted in {versionData.archiveInfo.retentionDays - version.days_archived} days
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {version.glb_url && (
                      <button
                        onClick={() => onVersionSelected?.(version)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Preview
                      </button>
                    )}
                    
                    {version.archived ? (
                      version.canRestore && (
                        <button
                          onClick={() => handleRestoreVersion(version.id)}
                          disabled={actionLoading === version.id}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                        >
                          {actionLoading === version.id ? 'Restoring...' : 'Restore'}
                        </button>
                      )
                    ) : (
                      !version.selected && (
                        <button
                          onClick={() => handleArchiveVersion(version.id)}
                          disabled={actionLoading === version.id}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          {actionLoading === version.id ? 'Archiving...' : 'Archive'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Archive info */}
        {includeArchived && versionData.limits.archived > 0 && (
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">Archive Information</h5>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Archived versions: {versionData.limits.archived}</div>
              <div>Retention period: {versionData.archiveInfo.retentionDays} days</div>
              {versionData.archiveInfo.oldest_archived && (
                <div>
                  Oldest archive: {new Date(versionData.archiveInfo.oldest_archived).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}