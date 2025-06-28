'use client'

import { useState } from 'react'

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
  canDelete?: boolean
}

export default function PhotoGallery({ photos, onDeletePhoto, canDelete = false }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

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
        <h3 className="text-lg font-medium text-gray-900">
          Uploaded Photos ({photos.length})
        </h3>
        <div className="text-sm text-gray-500">
          Total size: {formatFileSize(photos.reduce((sum, photo) => sum + photo.file_size, 0))}
        </div>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group">
            <div 
              className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setSelectedPhoto(photo)}
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
            {canDelete && onDeletePhoto && (
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