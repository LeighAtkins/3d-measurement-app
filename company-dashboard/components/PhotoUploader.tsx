'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface PhotoUploaderProps {
  onPhotosSelected: (files: File[]) => void
  furnitureType?: string
  maxFiles?: number
  disabled?: boolean
  existingPhotos?: string[]
}

interface PhotoPreview {
  file: File
  preview: string
}

export default function PhotoUploader({ 
  onPhotosSelected, 
  furnitureType, 
  maxFiles = 5, 
  disabled = false,
  existingPhotos = []
}: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const validateFile = (file: File): string[] => {
    const errors: string[] = []
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      errors.push(`${file.name}: Must be an image file`)
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      errors.push(`${file.name}: File too large (max 10MB)`)
    }
    
    // Check supported formats
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!supportedTypes.includes(file.type)) {
      errors.push(`${file.name}: Unsupported format (use JPEG, PNG, or WebP)`)
    }
    
    return errors
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const allErrors: string[] = []
    const validFiles: File[] = []
    
    // Validate each file
    acceptedFiles.forEach(file => {
      const fileErrors = validateFile(file)
      if (fileErrors.length > 0) {
        allErrors.push(...fileErrors)
      } else {
        validFiles.push(file)
      }
    })
    
    // Check total file count
    const totalFiles = photos.length + validFiles.length + existingPhotos.length
    if (totalFiles > maxFiles) {
      allErrors.push(`Too many files. Maximum ${maxFiles} photos allowed.`)
      return
    }
    
    setErrors(allErrors)
    
    if (validFiles.length > 0) {
      // Create previews
      const newPreviews = validFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }))
      
      const updatedPhotos = [...photos, ...newPreviews]
      setPhotos(updatedPhotos)
      
      // Notify parent component
      onPhotosSelected(updatedPhotos.map(p => p.file))
    }
  }, [photos, maxFiles, existingPhotos.length, onPhotosSelected])

  const removePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index)
    setPhotos(updatedPhotos)
    onPhotosSelected(updatedPhotos.map(p => p.file))
    
    // Clear errors when removing files
    if (updatedPhotos.length < maxFiles) {
      setErrors([])
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles,
    disabled
  })

  const getFurnitureGuidelines = () => {
    const guidelines = {
      sofa: [
        "Take photos from front, side, and 45-degree angles",
        "Include the entire sofa in each shot",
        "Show cushions and arm details clearly",
        "Ensure good lighting without harsh shadows"
      ],
      armchair: [
        "Capture front view and both side angles",
        "Include armrests and back in each shot",
        "Show seat cushion and upholstery details",
        "Keep 2-3 meters distance from the chair"
      ],
      cushion: [
        "Photograph from multiple angles",
        "Show thickness and edge details",
        "Include any patterns or texture",
        "Use even lighting to show true colors"
      ],
      ottoman: [
        "Take photos from all four sides",
        "Show top surface and legs clearly",
        "Include any storage or lifting mechanisms",
        "Capture proportions accurately"
      ],
      "coffee-table": [
        "Photograph from above and all four sides",
        "Show table surface and leg structure",
        "Include any drawers or shelving",
        "Ensure stable lighting throughout"
      ]
    }
    
    return guidelines[furnitureType as keyof typeof guidelines] || [
      "Take photos from multiple angles",
      "Ensure good lighting and clear details",
      "Include the entire piece of furniture",
      "Keep consistent distance from the item"
    ]
  }

  return (
    <div className="space-y-4">
      {/* Guidelines */}
      {furnitureType && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            Photo Guidelines for {furnitureType.charAt(0).toUpperCase() + furnitureType.slice(1)}
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            {getFurnitureGuidelines().map((guideline, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                {guideline}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"
            />
          </svg>
          
          <div className="text-sm text-gray-600">
            {isDragActive ? (
              <p>Drop the photos here...</p>
            ) : (
              <div>
                <p className="font-medium">Click to upload or drag and drop</p>
                <p>JPEG, PNG, WebP (max 10MB each)</p>
                <p className="text-xs text-gray-500 mt-1">
                  {photos.length + existingPhotos.length}/{maxFiles} photos
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-red-800 mb-1">Upload Errors:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Photo Previews */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Selected Photos ({photos.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={photo.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  type="button"
                >
                  ×
                </button>
                
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg">
                  {photo.file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Info */}
      <div className="text-xs text-gray-500">
        <p>Recommended: 3-5 photos from different angles for best 3D generation results</p>
        <p>Supported formats: JPEG, PNG, WebP • Max size: 10MB per photo</p>
      </div>
    </div>
  )
}