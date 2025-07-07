'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { validatePhoto, PhotoValidation, getRecommendedSelection } from '../utils/photoValidation'

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
  validation?: PhotoValidation
  selected: boolean
  validating: boolean
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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
      // Create previews with validation placeholders
      const newPreviews: PhotoPreview[] = validFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        selected: true, // Pre-select all initially
        validating: true
      }))
      
      const updatedPhotos = [...photos, ...newPreviews]
      setPhotos(updatedPhotos)
      
      // Start validation for new photos
      validateNewPhotos(validFiles, photos.length)
    }
  }, [photos, maxFiles, existingPhotos.length])

  const validateNewPhotos = async (files: File[], startIndex: number) => {
    for (let i = 0; i < files.length; i++) {
      const fileIndex = startIndex + i
      
      try {
        const validation = await validatePhoto(files[i])
        
        setPhotos(prev => prev.map((photo, idx) => 
          idx === fileIndex 
            ? { ...photo, validation, validating: false }
            : photo
        ))
      } catch (error) {
        console.error('Validation failed for photo:', error)
        setPhotos(prev => prev.map((photo, idx) => 
          idx === fileIndex 
            ? { ...photo, validating: false }
            : photo
        ))
      }
    }
    
    // Auto-select based on validation results after all validations complete
    setTimeout(() => {
      setPhotos(prev => {
        const validations = prev.map(p => p.validation).filter(Boolean) as PhotoValidation[]
        const recommendedIndices = getRecommendedSelection(validations)
        
        return prev.map((photo, idx) => ({
          ...photo,
          selected: Boolean(photo.validation?.status === 'good' || 
                   (recommendedIndices.length === 0 && photo.validation?.canProceed))
        }))
      })
    }, 100)
  }

  // Update parent when selection changes
  useEffect(() => {
    const selectedFiles = photos.filter(p => p.selected).map(p => p.file)
    onPhotosSelected(selectedFiles)
  }, [photos, onPhotosSelected])

  const removePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index)
    setPhotos(updatedPhotos)
    
    // Clear errors when removing files
    if (updatedPhotos.length < maxFiles) {
      setErrors([])
    }
  }

  const removeSelectedPhotos = () => {
    const updatedPhotos = photos.filter(p => !p.selected)
    setPhotos(updatedPhotos)
    
    // Clear errors when removing files
    if (updatedPhotos.length < maxFiles) {
      setErrors([])
    }
  }

  const selectAllPhotos = () => {
    setPhotos(prev => prev.map(photo => ({ ...photo, selected: true })))
  }

  const deselectAllPhotos = () => {
    setPhotos(prev => prev.map(photo => ({ ...photo, selected: false })))
  }

  const togglePhotoSelection = (index: number) => {
    setPhotos(prev => prev.map((photo, idx) => 
      idx === index ? { ...photo, selected: !photo.selected } : photo
    ))
  }

  const getQualityIcon = (status: 'good' | 'warning' | 'poor' | undefined, validating: boolean) => {
    if (validating) {
      return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    }
    
    switch (status) {
      case 'good':
        return <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
      case 'warning':
        return <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs">!</div>
      case 'poor':
        return <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">×</div>
      default:
        return null
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
                <p className="text-xs text-red-600 font-medium mt-1">
                  Minimum size: 512x512 pixels required
                </p>
                <p className="text-xs text-gray-500">
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
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Photos ({photos.filter(p => p.selected).length}/{photos.length} selected)
            </h4>
            
            <div className="flex items-center space-x-3">
              {/* Bulk Actions */}
              {photos.length > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={selectAllPhotos}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllPhotos}
                    className="text-xs text-gray-600 hover:text-gray-800 underline"
                  >
                    Deselect All
                  </button>
                  {photos.some(p => p.selected) && (
                    <button
                      onClick={removeSelectedPhotos}
                      className="text-xs text-red-600 hover:text-red-800 underline font-medium"
                    >
                      Delete Selected ({photos.filter(p => p.selected).length})
                    </button>
                  )}
                </div>
              )}
              
              {/* Quality Legend */}
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Good</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Warning</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Poor</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <div 
                  className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-colors ${
                    photo.selected 
                      ? 'border-blue-500' 
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img
                    src={photo.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Quality indicator overlay */}
                  <div className="absolute top-2 left-2">
                    {getQualityIcon(photo.validation?.status, photo.validating)}
                  </div>
                  
                  {/* Selection checkbox */}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => togglePhotoSelection(index)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        photo.selected
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                      type="button"
                    >
                      {photo.selected && <span className="text-xs">✓</span>}
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors z-10"
                  type="button"
                >
                  ×
                </button>
                
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-gray-700 truncate" title={photo.file.name}>
                    {photo.file.name}
                  </div>
                  
                  {photo.validation && !photo.validating && (
                    <div className="text-xs">
                      <div className={`font-medium ${
                        photo.validation.status === 'good' ? 'text-green-600' :
                        photo.validation.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {photo.validation.status === 'good' && '🟢 Good quality'}
                        {photo.validation.status === 'warning' && '🟡 Has issues'}
                        {photo.validation.status === 'poor' && '🔴 Poor quality'}
                      </div>
                      
                      {photo.validation.issues.length > 0 && (
                        <div className="text-gray-500 mt-1">
                          {photo.validation.issues.slice(0, 2).map((issue, i) => (
                            <div key={i}>• {issue}</div>
                          ))}
                          {photo.validation.issues.length > 2 && (
                            <div>• +{photo.validation.issues.length - 2} more...</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {photo.validating && (
                    <div className="text-xs text-gray-500">
                      Analyzing quality...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Quality summary */}
          {photos.some(p => p.validation && !p.validating) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Quality Summary</h5>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="text-center">
                  <div className="text-green-600 font-medium">
                    {photos.filter(p => p.validation?.status === 'good').length}
                  </div>
                  <div className="text-gray-600">Good</div>
                </div>
                <div className="text-center">
                  <div className="text-yellow-600 font-medium">
                    {photos.filter(p => p.validation?.status === 'warning').length}
                  </div>
                  <div className="text-gray-600">Warning</div>
                </div>
                <div className="text-center">
                  <div className="text-red-600 font-medium">
                    {photos.filter(p => p.validation?.status === 'poor').length}
                  </div>
                  <div className="text-gray-600">Poor</div>
                </div>
              </div>
              
              {photos.filter(p => p.selected && p.validation?.status === 'poor').length > 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  ⚠️ You have selected photos with poor quality. This may result in failed generation or low-quality 3D models.
                </div>
              )}
            </div>
          )}
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