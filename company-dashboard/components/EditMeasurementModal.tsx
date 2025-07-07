'use client'

import { useState, useEffect } from 'react'
import { CustomMeasurement } from '@3d-measurement-app/3d-tools'

interface EditMeasurementModalProps {
  isOpen: boolean
  onClose: () => void
  measurement: CustomMeasurement | null
  onSave: (id: string, updates: Partial<CustomMeasurement>) => Promise<void>
}

export default function EditMeasurementModal({
  isOpen,
  onClose,
  measurement,
  onSave
}: EditMeasurementModalProps) {
  const [label, setLabel] = useState('')
  const [unit, setUnit] = useState<'cm' | 'inches'>('cm')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (measurement) {
      setLabel(measurement.label)
      setUnit(measurement.unit as 'cm' | 'inches')
      setNotes(measurement.notes || '')
      setErrors({})
    }
  }, [measurement])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!label.trim()) {
      newErrors.label = 'Label is required'
    } else if (label.length > 100) {
      newErrors.label = 'Label must be less than 100 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !measurement) return
    
    setIsLoading(true)
    try {
      await onSave(measurement.id, {
        label: label.trim(),
        unit,
        notes: notes.trim()
      })
      onClose()
    } catch (error) {
      setErrors({ submit: 'Failed to update measurement' })
    } finally {
      setIsLoading(false)
    }
  }

  const convertDistance = (value: number, fromUnit: string, toUnit: string) => {
    if (fromUnit === toUnit) return value
    return fromUnit === 'cm' ? value / 2.54 : value * 2.54
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Edit Measurement</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">
              Label
            </label>
            <input
              id="label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter measurement label"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.label ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.label && (
              <p className="text-sm text-red-500 mt-1">{errors.label}</p>
            )}
          </div>

          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <select
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as 'cm' | 'inches')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="cm">Centimeters (cm)</option>
              <option value="inches">Inches</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Distance
            </label>
            <div className="text-sm text-gray-600">
              {measurement && (
                <>
                  {measurement.distance.toFixed(2)} {measurement.unit}
                  {unit !== measurement.unit && (
                    <span className="ml-2 text-gray-500">
                      ({convertDistance(measurement.distance, measurement.unit, unit).toFixed(2)} {unit})
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          {errors.submit && (
            <p className="text-sm text-red-500">{errors.submit}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:bg-blue-400"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}