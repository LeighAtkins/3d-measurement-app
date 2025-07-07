'use client'

import { useState, useEffect } from 'react'

interface GenerationAttempt {
  id: string
  attempt_number: number
  seed_value: number
  background_removal_confidence: number
  model_quality_score: number
  processing_time_seconds: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  glb_url?: string
  selected: boolean
  created_at: string
}

interface GenerationProgressProps {
  orderId: string
  attempts: GenerationAttempt[]
  currentStatus: 'idle' | 'generating' | 'completed' | 'failed'
  currentStage?: string
  onSelectAttempt?: (attemptId: string) => void
  onRetryGeneration?: () => void
}

interface ProgressStage {
  name: string
  description: string
  minPercent: number
  maxPercent: number
  duration: number // seconds
}

export default function GenerationProgress({
  orderId,
  attempts,
  currentStatus,
  currentStage,
  onSelectAttempt,
  onRetryGeneration
}: GenerationProgressProps) {
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  const [stageStartTime, setStageStartTime] = useState<number | null>(null)

  // Define TRELLIS processing stages
  const stages: ProgressStage[] = [
    {
      name: 'uploading',
      description: 'Uploading image...',
      minPercent: 0,
      maxPercent: 6,
      duration: 3
    },
    {
      name: 'background_removal',
      description: 'Removing background',
      minPercent: 6,
      maxPercent: 12,
      duration: 3
    },
    {
      name: 'generating_3d',
      description: 'Generating 3D model',
      minPercent: 12,
      maxPercent: 42,
      duration: 15
    },
    {
      name: 'extracting_glb',
      description: 'Extracting GLB file',
      minPercent: 42,
      maxPercent: 100,
      duration: 30
    }
  ]

  // Update progress based on current stage or simulate realistic progress
  useEffect(() => {
    if (currentStatus === 'generating') {
      if (currentStage) {
        // Find stage index by name
        const stageIndex = stages.findIndex(s => s.name === currentStage)
        if (stageIndex !== -1) {
          setCurrentStageIndex(stageIndex)
          setStageStartTime(Date.now())
          setProgress(stages[stageIndex].minPercent)
        }
      } else {
        // Fallback: simulate realistic progress through stages
        let currentTime = 0
        const interval = setInterval(() => {
          currentTime += 1
          
          // Determine current stage based on elapsed time
          let totalTime = 0
          let activeStageIndex = 0
          
          for (let i = 0; i < stages.length; i++) {
            if (currentTime <= totalTime + stages[i].duration) {
              activeStageIndex = i
              break
            }
            totalTime += stages[i].duration
          }
          
          setCurrentStageIndex(activeStageIndex)
          
          if (activeStageIndex < stages.length) {
            const stage = stages[activeStageIndex]
            const stageElapsed = currentTime - totalTime
            const stageProgress = Math.min(1, stageElapsed / stage.duration)
            const stagePercent = stage.minPercent + (stage.maxPercent - stage.minPercent) * stageProgress
            
            setProgress(Math.min(95, stagePercent)) // Cap at 95% until truly complete
          }
          
          // Stop simulation after all stages
          if (currentTime > stages.reduce((sum, s) => sum + s.duration, 0)) {
            clearInterval(interval)
          }
        }, 1000)

        return () => clearInterval(interval)
      }
    } else if (currentStatus === 'completed') {
      setProgress(100)
      setCurrentStageIndex(stages.length)
    } else if (currentStatus === 'failed') {
      setProgress(0)
      setCurrentStageIndex(0)
    }
  }, [currentStatus, currentStage])

  // Update status message based on current stage
  useEffect(() => {
    if (currentStatus === 'generating') {
      if (currentStageIndex < stages.length) {
        setStatusMessage(stages[currentStageIndex].description)
      } else {
        setStatusMessage('Finalizing 3D model...')
      }
    } else {
      const messages = {
        idle: 'Ready to generate 3D model',
        completed: '3D model generation complete!',
        failed: 'Generation failed. Please try again.'
      }
      setStatusMessage(messages[currentStatus as keyof typeof messages] || 'Unknown status')
    }
  }, [currentStatus, currentStageIndex])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'processing': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const getQualityBadge = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800'
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getQualityLabel = (score: number) => {
    if (score >= 0.8) return 'High'
    if (score >= 0.6) return 'Medium'
    return 'Low'
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900">3D Generation Status</h3>
          {currentStatus === 'generating' && (
            <div className="flex items-center text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Processing...
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-3">{statusMessage}</p>

        {/* Stage Indicators */}
        {currentStatus === 'generating' && (
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              {stages.map((stage, index) => (
                <div key={stage.name} className="flex items-center">
                  <div className={`w-3 h-3 rounded-full border-2 ${
                    index < currentStageIndex 
                      ? 'bg-green-500 border-green-500' 
                      : index === currentStageIndex
                      ? 'bg-blue-500 border-blue-500 animate-pulse'
                      : 'bg-gray-200 border-gray-300'
                  }`}></div>
                  <span className={`ml-2 text-xs ${
                    index <= currentStageIndex ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {stage.description}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Overall Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
              </div>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>{Math.round(progress)}% complete</span>
              <span>
                Stage {currentStageIndex + 1} of {stages.length}
                {currentStageIndex < stages.length && (
                  <> • Est. {stages[currentStageIndex].duration}s</>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Simple Progress Bar for Non-Generating States */}
        {(currentStatus === 'completed' || currentStatus === 'failed') && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div 
              className={`h-2 rounded-full ${
                currentStatus === 'completed' ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: '100%' }}
            ></div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {currentStatus === 'failed' && onRetryGeneration && (
            <button
              onClick={onRetryGeneration}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              Retry Generation
            </button>
          )}
          
          {currentStatus === 'completed' && attempts.length > 1 && (
            <div className="text-sm text-gray-600">
              {attempts.filter(a => a.status === 'completed').length} successful attempt(s) generated
            </div>
          )}
        </div>
      </div>

      {/* Generation Attempts */}
      {attempts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Generation Attempts ({attempts.length})
          </h3>

          <div className="space-y-3">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className={`border rounded-lg p-4 transition-all ${
                  attempt.selected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-medium text-gray-900">
                        Attempt #{attempt.attempt_number}
                      </span>
                      
                      <span className={`text-sm font-medium ${getStatusColor(attempt.status)}`}>
                        {attempt.status.charAt(0).toUpperCase() + attempt.status.slice(1)}
                      </span>

                      {attempt.selected && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          Selected
                        </span>
                      )}

                      {attempt.status === 'completed' && (
                        <span className={`text-xs px-2 py-1 rounded-full ${getQualityBadge(attempt.model_quality_score)}`}>
                          {getQualityLabel(attempt.model_quality_score)} Quality
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      {attempt.seed_value && (
                        <div>
                          <span className="font-medium">Seed:</span> {attempt.seed_value}
                        </div>
                      )}
                      
                      {attempt.processing_time_seconds && (
                        <div>
                          <span className="font-medium">Time:</span> {formatTime(attempt.processing_time_seconds)}
                        </div>
                      )}
                      
                      {attempt.background_removal_confidence && (
                        <div>
                          <span className="font-medium">BG Removal:</span> {(attempt.background_removal_confidence * 100).toFixed(1)}%
                        </div>
                      )}
                      
                      {attempt.model_quality_score && (
                        <div>
                          <span className="font-medium">Quality:</span> {(attempt.model_quality_score * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>

                    {attempt.error_message && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        Error: {attempt.error_message}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 ml-4">
                    {attempt.status === 'completed' && !attempt.selected && onSelectAttempt && (
                      <button
                        onClick={() => onSelectAttempt(attempt.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Select This
                      </button>
                    )}

                    {attempt.glb_url && (
                      <a
                        href={attempt.glb_url}
                        download
                        className="bg-gray-600 text-white px-3 py-1 rounded text-sm text-center hover:bg-gray-700 transition-colors"
                      >
                        Download
                      </a>
                    )}
                  </div>
                </div>

                {/* Progress for current attempt */}
                {attempt.status === 'processing' && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div className="bg-blue-600 h-1 rounded-full animate-pulse w-1/2"></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          {attempts.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="text-center">
                  <div className="font-medium text-gray-900">
                    {attempts.filter(a => a.status === 'completed').length}
                  </div>
                  <div>Successful</div>
                </div>
                
                <div className="text-center">
                  <div className="font-medium text-gray-900">
                    {attempts.filter(a => a.status === 'failed').length}
                  </div>
                  <div>Failed</div>
                </div>
                
                <div className="text-center">
                  <div className="font-medium text-gray-900">
                    {attempts.reduce((sum, a) => sum + (a.processing_time_seconds || 0), 0)}s
                  </div>
                  <div>Total Time</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}