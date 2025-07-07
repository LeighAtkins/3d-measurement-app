'use client'

import { useState } from 'react'
import { validatePhotos, PhotoValidation, formatValidationIssues } from '../utils/photoValidation'

interface Photo {
  id: string
  filename: string
  file_path: string
  file_size: number
  mime_type: string
  created_at: string
}

interface PhotoGalleryProps {
  photos: Photo[]
  onDeletePhoto?: (photoId: string) => void
  onUploadMore?: (files: File[]) => void
  onDeleteSelected?: (photoIds: string[]) => void
  onRegenerateWithSelected?: (photoIds: string[]) => void
  canDelete?: boolean
  canUploadMore?: boolean
  canBulkDelete?: boolean
  canRegenerate?: boolean
  maxPhotos?: number
}

export default function PhotoGallery({ 
  photos, 
  onDeletePhoto, 
  onUploadMore,
  onDeleteSelected,
  onRegenerateWithSelected,
  canDelete = false,
  canUploadMore = false,
  canBulkDelete = false,
  canRegenerate = false,
  maxPhotos = 20
}: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [validationResults, setValidationResults] = useState<PhotoValidation[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || !onUploadMore) return
    
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(file => {
      // Basic validation
      const isImage = file.type.startsWith('image/')
      const isUnderLimit = photos.length + fileArray.length <= maxPhotos
      return isImage && isUnderLimit
    })
    
    if (validFiles.length === 0) {
      alert('No valid image files selected or photo limit reached.')
      return
    }

    // Validate photo quality
    setIsValidating(true)
    try {
      const validations = await validatePhotos(validFiles)
      setValidationResults(validations)
      
      // Check if any photos have severe issues
      const poorPhotos = validations.filter(v => v.status === 'poor' && !v.canProceed)
      if (poorPhotos.length > 0) {
        const fileNames = poorPhotos.map((_, i) => validFiles[i].name).join(', ')
        alert(`Cannot upload files with severe quality issues: ${fileNames}`)
        return
      }
      
      // Show warning for photos with issues
      const warningPhotos = validations.filter(v => v.status === 'warning' || (v.status === 'poor' && v.canProceed))
      if (warningPhotos.length > 0) {
        const issues = warningPhotos.map((v, i) => `${validFiles[i].name}: ${formatValidationIssues(v.issues)}`).join('\n')
        const proceed = confirm(`Some photos have quality issues:\n\n${issues}\n\nProceed with upload?`)
        if (!proceed) return
      }
      
      onUploadMore(validFiles)
    } catch (error) {
      console.error('Photo validation failed:', error)
      // Still allow upload if validation fails
      onUploadMore(validFiles)
    } finally {
      setIsValidating(false)
    }
  }

  const handleSelectPhoto = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(photoId)) {
        newSet.delete(photoId)
      } else {
        newSet.add(photoId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set())
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.id)))
    }
  }

  const handleBulkDelete = () => {
    if (selectedPhotos.size === 0) return
    
    const selectedCount = selectedPhotos.size
    if (!confirm(`Are you sure you want to delete ${selectedCount} selected photo${selectedCount > 1 ? 's' : ''}?`)) {
      return
    }
    
    if (onDeleteSelected) {
      onDeleteSelected(Array.from(selectedPhotos))
      setSelectedPhotos(new Set())
      setIsSelectionMode(false)
    }
  }

  const handleRegenerateSelected = () => {
    if (selectedPhotos.size === 0) return
    
    if (onRegenerateWithSelected) {
      onRegenerateWithSelected(Array.from(selectedPhotos))
      setSelectedPhotos(new Set())
      setIsSelectionMode(false)
    }
  }

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    setSelectedPhotos(new Set())
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getImageSrc = (photo: Photo): string => {
    // If file_path is a data URL (base64), return it directly
    if (photo.file_path.startsWith('data:')) {
      return photo.file_path
    }
    // Otherwise, assume it's a file path
    return photo.file_path
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-8">
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">No photos uploaded</h3>
        <p className="mt-1 text-sm text-gray-500">
          Upload furniture photos to generate a 3D model
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Uploaded Photos ({photos.length})
          </h3>
          <div className="text-sm text-gray-500">
            Total size: {formatFileSize(photos.reduce((sum, photo) => sum + photo.file_size, 0))}
            {isSelectionMode && selectedPhotos.size > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                • {selectedPhotos.size} selected
              </span>
            )}
          </div>
        </div>
        
        {(canBulkDelete || canRegenerate) && photos.length > 0 && (
          <div className="flex items-center space-x-2">
            {!isSelectionMode ? (
              <button
                onClick={toggleSelectionMode}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Select Photos
              </button>
            ) : (
              <>
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  {selectedPhotos.size === photos.length ? 'Deselect All' : 'Select All'}
                </button>
                
                {selectedPhotos.size > 0 && (
                  <>
                    {canBulkDelete && (
                      <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete ({selectedPhotos.size})
                      </button>
                    )}
                    
                    {canRegenerate && (
                      <button
                        onClick={handleRegenerateSelected}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Regenerate ({selectedPhotos.size})
                      </button>
                    )}
                  </>
                )}
                
                <button
                  onClick={toggleSelectionMode}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {/* Upload More Photos Card */}
        {canUploadMore && photos.length < maxPhotos && (
          <div 
            className={`aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.multiple = true
              input.accept = 'image/*'
              input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files)
              input.click()
            }}
          >
            <svg
              className="w-8 h-8 text-gray-400 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <p className="text-sm text-gray-600 text-center px-2">
              {isValidating ? 'Validating...' : 'Add More Photos'}
            </p>
            <p className="text-xs text-gray-500 text-center px-2 mt-1">
              {photos.length}/{maxPhotos} used
            </p>
          </div>
        )}

        {photos.map((photo) => (
          <div 
            key={photo.id} 
            className={`relative group ${
              isSelectionMode && selectedPhotos.has(photo.id) 
                ? 'ring-2 ring-blue-500 ring-offset-2' 
                : ''
            }`}
          >
            {/* Selection Checkbox */}
            {isSelectionMode && (
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedPhotos.has(photo.id)}
                  onChange={() => handleSelectPhoto(photo.id)}
                  className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            
            <div 
              className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                if (isSelectionMode) {
                  handleSelectPhoto(photo.id)
                } else {
                  setSelectedPhoto(photo)
                }
              }}
            >
              <img
                src={getImageSrc(photo)}
                alt={photo.filename}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback for broken images
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik02IDZIMTRWMTRINlY2WiIgc3Ryb2tlPSIjOUI5QkEwIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KPC9zdmc+'
                }}
              />
            </div>

            {/* Photo Info */}
            <div className="mt-2">
              <p className="text-xs text-gray-600 truncate" title={photo.filename}>
                {photo.filename}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(photo.file_size)}
              </p>
            </div>

            {/* Delete Button */}
            {canDelete && onDeletePhoto && !isSelectionMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeletePhoto(photo.id)
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                type="button"
                title="Delete photo"
              >
                ×
              </button>
            )}

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={getImageSrc(selectedPhoto)}
              alt={selectedPhoto.filename}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            
            {/* Close button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-4 -right-4 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              ×
            </button>

            {/* Photo info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
              <h4 className="font-medium">{selectedPhoto.filename}</h4>
              <div className="text-sm text-gray-300 mt-1 space-y-1">
                <p>Size: {formatFileSize(selectedPhoto.file_size)}</p>
                <p>Type: {selectedPhoto.mime_type}</p>
                <p>Uploaded: {new Date(selectedPhoto.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}