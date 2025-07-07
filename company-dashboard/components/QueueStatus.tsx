'use client'

import { useState, useEffect } from 'react'
import { ApiClient } from '../../packages/api-client/src/index'

interface QuotaInfo {
  dailyLimit: number
  used: number
  remaining: number
  resetTime: string
  queuePosition?: number
  estimatedProcessingTime?: string
  percentUsed: number
}

interface QueueStatusData {
  quota: QuotaInfo
  canGenerateNow: boolean
  nextAvailableSlot: string
}

interface QueuePosition {
  inQueue: boolean
  queuePosition?: number
  scheduledDate?: string
  estimatedTime?: string
  createdAt?: string
  message?: string
}

interface QueueStatusProps {
  orderId?: string
  onStatusChange?: (canGenerate: boolean) => void
}

export default function QueueStatus({ orderId, onStatusChange }: QueueStatusProps) {
  const [queueData, setQueueData] = useState<QueueStatusData | null>(null)
  const [orderQueue, setOrderQueue] = useState<QueuePosition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadQueueStatus = async () => {
    try {
      setLoading(true)
      const apiClient = new ApiClient()
      const response = await apiClient.request('/api/generation-queue/status')
      setQueueData(response)
      
      // Notify parent of status change
      onStatusChange?.(response.canGenerateNow)
      
      setError(null)
    } catch (err) {
      console.error('Failed to load queue status:', err)
      setError('Failed to load queue status')
    }
  }

  const loadOrderQueuePosition = async () => {
    if (!orderId) return
    
    try {
      const apiClient = new ApiClient()
      const response = await apiClient.request(`/api/orders/${orderId}/queue-position`)
      setOrderQueue(response)
    } catch (err) {
      console.error('Failed to load order queue position:', err)
      // Don't set error for order queue as it's optional
    }
  }

  useEffect(() => {
    loadQueueStatus()
    loadOrderQueuePosition()

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadQueueStatus()
      loadOrderQueuePosition()
    }, 30000)

    return () => clearInterval(interval)
  }, [orderId])

  useEffect(() => {
    setLoading(false)
  }, [queueData])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    
    if (diffMs <= 0) return 'Now'
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`
    }
    return `${diffMinutes}m`
  }

  const getUsageColor = (percentUsed: number) => {
    if (percentUsed >= 100) return 'bg-red-500'
    if (percentUsed >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getUsageText = (percentUsed: number) => {
    if (percentUsed >= 100) return 'Daily limit reached'
    if (percentUsed >= 80) return 'Approaching limit'
    return 'Available'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-2 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  if (error || !queueData) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-4">
        <div className="text-red-600 text-sm">
          {error || 'Unable to load queue status'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* GPU Quota Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Daily GPU Quota</h3>
          <span className={`text-xs px-2 py-1 rounded-full text-white ${
            queueData.canGenerateNow ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {queueData.canGenerateNow ? 'Available' : 'Limit Reached'}
          </span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {queueData.quota.used} / {queueData.quota.dailyLimit} generations used
            </span>
            <span className="font-medium">
              {queueData.quota.percentUsed}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(queueData.quota.percentUsed)}`}
              style={{ width: `${Math.min(100, queueData.quota.percentUsed)}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{getUsageText(queueData.quota.percentUsed)}</span>
            <span>
              Resets {formatTime(queueData.quota.resetTime)}
            </span>
          </div>
        </div>
        
        {queueData.quota.queuePosition && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <div className="text-yellow-800">
              <strong>Position #{queueData.quota.queuePosition}</strong> in tomorrow's queue
            </div>
            {queueData.quota.estimatedProcessingTime && (
              <div className="text-yellow-600 text-xs mt-1">
                Estimated processing: {formatTime(queueData.quota.estimatedProcessingTime)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order-Specific Queue Status */}
      {orderQueue?.inQueue && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
            <h4 className="text-sm font-medium text-blue-900">This Order is Queued</h4>
          </div>
          
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex justify-between">
              <span>Queue Position:</span>
              <strong>#{orderQueue.queuePosition}</strong>
            </div>
            
            {orderQueue.scheduledDate && (
              <div className="flex justify-between">
                <span>Scheduled Date:</span>
                <strong>{new Date(orderQueue.scheduledDate).toLocaleDateString()}</strong>
              </div>
            )}
            
            {orderQueue.estimatedTime && (
              <div className="flex justify-between">
                <span>Estimated Time:</span>
                <strong>{formatTime(orderQueue.estimatedTime)}</strong>
              </div>
            )}
            
            {orderQueue.createdAt && (
              <div className="flex justify-between">
                <span>Queued:</span>
                <span>{new Date(orderQueue.createdAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      {!queueData.canGenerateNow && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">What happens next?</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>• Your generation request will be queued for tomorrow</div>
            <div>• You'll be notified when processing begins</div>
            <div>• Queue position is determined by request time</div>
            <div>• Daily quota resets at midnight UTC</div>
          </div>
        </div>
      )}
      
      {queueData.canGenerateNow && queueData.quota.remaining <= 3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-800">
            <strong>⚠️ Limited slots remaining:</strong> Only {queueData.quota.remaining} generation
            {queueData.quota.remaining !== 1 ? 's' : ''} left today.
          </div>
        </div>
      )}
    </div>
  )
}