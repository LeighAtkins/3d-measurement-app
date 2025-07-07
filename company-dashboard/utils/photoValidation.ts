/**
 * Client-side photo validation utility
 * Implements blur detection, quality scoring, and validation rules
 */

export interface PhotoValidationScore {
  resolution: 'good' | 'adequate' | 'poor'
  blur: number // 0-10, higher is sharper
  lighting: 'good' | 'adequate' | 'poor'
  furnitureVisibility: number // 0-1
  overallScore: number // 0-1
}

export interface PhotoValidation {
  status: 'good' | 'warning' | 'poor'
  scores: PhotoValidationScore
  recommendation: string
  canProceed: boolean
  issues: string[]
}

/**
 * Detects blur in an image using edge detection
 * @param imageData - Canvas image data
 * @returns Blur score (0-10, higher = sharper)
 */
function detectBlur(imageData: ImageData): number {
  const { data, width, height } = imageData
  
  // Convert to grayscale and apply Sobel edge detection
  let edgeStrength = 0
  let pixelCount = 0
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      
      // Get grayscale value
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      
      // Sobel X kernel
      const sobelX = 
        -1 * getGrayValue(data, x - 1, y - 1, width) +
         1 * getGrayValue(data, x + 1, y - 1, width) +
        -2 * getGrayValue(data, x - 1, y, width) +
         2 * getGrayValue(data, x + 1, y, width) +
        -1 * getGrayValue(data, x - 1, y + 1, width) +
         1 * getGrayValue(data, x + 1, y + 1, width)
      
      // Sobel Y kernel
      const sobelY = 
        -1 * getGrayValue(data, x - 1, y - 1, width) +
        -2 * getGrayValue(data, x, y - 1, width) +
        -1 * getGrayValue(data, x + 1, y - 1, width) +
         1 * getGrayValue(data, x - 1, y + 1, width) +
         2 * getGrayValue(data, x, y + 1, width) +
         1 * getGrayValue(data, x + 1, y + 1, width)
      
      // Calculate edge magnitude
      const magnitude = Math.sqrt(sobelX * sobelX + sobelY * sobelY)
      edgeStrength += magnitude
      pixelCount++
    }
  }
  
  const averageEdgeStrength = edgeStrength / pixelCount
  
  // Normalize to 0-10 scale (empirically determined thresholds)
  const blurScore = Math.min(10, Math.max(0, (averageEdgeStrength / 15) * 10))
  return blurScore
}

function getGrayValue(data: Uint8ClampedArray, x: number, y: number, width: number): number {
  const idx = (y * width + x) * 4
  return (data[idx] + data[idx + 1] + data[idx + 2]) / 3
}

/**
 * Analyzes image lighting conditions
 * @param imageData - Canvas image data
 * @returns Lighting quality assessment
 */
function analyzeLighting(imageData: ImageData): 'good' | 'adequate' | 'poor' {
  const { data } = imageData
  let totalBrightness = 0
  let darkPixels = 0
  let brightPixels = 0
  const pixelCount = data.length / 4
  
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
    totalBrightness += brightness
    
    if (brightness < 50) darkPixels++
    if (brightness > 200) brightPixels++
  }
  
  const averageBrightness = totalBrightness / pixelCount
  const darkRatio = darkPixels / pixelCount
  const brightRatio = brightPixels / pixelCount
  
  // Good lighting: balanced exposure
  if (averageBrightness >= 80 && averageBrightness <= 180 && 
      darkRatio < 0.3 && brightRatio < 0.2) {
    return 'good'
  }
  
  // Poor lighting: too dark, too bright, or high contrast
  if (averageBrightness < 50 || averageBrightness > 200 || 
      darkRatio > 0.5 || brightRatio > 0.4) {
    return 'poor'
  }
  
  return 'adequate'
}

/**
 * Estimates furniture visibility in the image
 * @param imageData - Canvas image data
 * @returns Visibility score (0-1)
 */
function estimateFurnitureVisibility(imageData: ImageData): number {
  const { data, width, height } = imageData
  
  // Simple edge density analysis as proxy for object presence
  let edgePixels = 0
  const totalPixels = width * height
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      
      // Simple edge detection
      const neighbor1 = getGrayValue(data, x + 1, y, width)
      const neighbor2 = getGrayValue(data, x, y + 1, width)
      
      if (Math.abs(gray - neighbor1) > 30 || Math.abs(gray - neighbor2) > 30) {
        edgePixels++
      }
    }
  }
  
  const edgeDensity = edgePixels / totalPixels
  
  // Convert edge density to visibility score (empirically tuned)
  return Math.min(1, Math.max(0, edgeDensity * 10))
}

/**
 * Loads an image file and returns canvas context for analysis
 * @param file - Image file to analyze
 * @returns Promise resolving to canvas context and dimensions
 */
async function loadImageForAnalysis(file: File): Promise<{
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number
}> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }
    
    img.onload = () => {
      // Resize large images for faster processing (max 800px)
      const maxDimension = 800
      let { width, height } = img
      
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height)
        width *= scale
        height *= scale
      }
      
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      
      resolve({ canvas, ctx, width, height })
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Validates a photo file and returns quality assessment
 * @param file - Photo file to validate
 * @returns Promise resolving to validation result
 */
export async function validatePhoto(file: File): Promise<PhotoValidation> {
  const issues: string[] = []
  
  // Basic file validation
  if (!file.type.startsWith('image/')) {
    return {
      status: 'poor',
      scores: {
        resolution: 'poor',
        blur: 0,
        lighting: 'poor',
        furnitureVisibility: 0,
        overallScore: 0
      },
      recommendation: 'File must be an image',
      canProceed: false,
      issues: ['Not an image file']
    }
  }
  
  // File size check
  if (file.size > 10 * 1024 * 1024) {
    issues.push('File size too large (max 10MB)')
  }
  
  try {
    const { ctx, width, height } = await loadImageForAnalysis(file)
    const imageData = ctx.getImageData(0, 0, width, height)
    
    // Resolution analysis
    const minDimension = Math.min(width, height)
    let resolution: 'good' | 'adequate' | 'poor'
    
    if (minDimension < 512) {
      resolution = 'poor'
      issues.push('Resolution too low (minimum 512px)')
    } else if (minDimension < 1024) {
      resolution = 'adequate'
      issues.push('Low resolution may affect quality')
    } else {
      resolution = 'good'
    }
    
    // Blur detection
    const blurScore = detectBlur(imageData)
    if (blurScore < 3) {
      issues.push('Image appears blurry')
    } else if (blurScore < 5) {
      issues.push('Image sharpness could be better')
    }
    
    // Lighting analysis
    const lighting = analyzeLighting(imageData)
    if (lighting === 'poor') {
      issues.push('Poor lighting conditions detected')
    } else if (lighting === 'adequate') {
      issues.push('Lighting could be improved')
    }
    
    // Furniture visibility
    const furnitureVisibility = estimateFurnitureVisibility(imageData)
    if (furnitureVisibility < 0.3) {
      issues.push('Furniture may not be clearly visible')
    }
    
    // Calculate overall score
    const scores: PhotoValidationScore = {
      resolution,
      blur: blurScore,
      lighting,
      furnitureVisibility,
      overallScore: calculateOverallScore(resolution, blurScore, lighting, furnitureVisibility)
    }
    
    // Determine status and recommendation
    const { status, recommendation, canProceed } = determineValidationStatus(scores, issues)
    
    return {
      status,
      scores,
      recommendation,
      canProceed,
      issues
    }
    
  } catch (error) {
    return {
      status: 'poor',
      scores: {
        resolution: 'poor',
        blur: 0,
        lighting: 'poor',
        furnitureVisibility: 0,
        overallScore: 0
      },
      recommendation: 'Failed to analyze image',
      canProceed: false,
      issues: ['Image analysis failed']
    }
  }
}

function calculateOverallScore(
  resolution: 'good' | 'adequate' | 'poor',
  blur: number,
  lighting: 'good' | 'adequate' | 'poor',
  furnitureVisibility: number
): number {
  const resolutionScore = resolution === 'good' ? 1 : resolution === 'adequate' ? 0.7 : 0.3
  const blurScore = blur / 10
  const lightingScore = lighting === 'good' ? 1 : lighting === 'adequate' ? 0.7 : 0.3
  
  // Weighted average
  return (resolutionScore * 0.3 + blurScore * 0.4 + lightingScore * 0.2 + furnitureVisibility * 0.1)
}

function determineValidationStatus(
  scores: PhotoValidationScore,
  issues: string[]
): { status: 'good' | 'warning' | 'poor', recommendation: string, canProceed: boolean } {
  const { overallScore, resolution, blur } = scores
  
  // Block if resolution is too low or image is corrupted
  if (resolution === 'poor' && blur < 2) {
    return {
      status: 'poor',
      recommendation: 'Resolution too low and image quality poor. This will likely fail generation.',
      canProceed: false
    }
  }
  
  // Good quality
  if (overallScore >= 0.8 && issues.length === 0) {
    return {
      status: 'good',
      recommendation: 'Excellent photo quality! This should generate a high-quality 3D model.',
      canProceed: true
    }
  }
  
  // Warning for moderate issues
  if (overallScore >= 0.5) {
    return {
      status: 'warning',
      recommendation: 'Photo has some quality issues but should still work for generation.',
      canProceed: true
    }
  }
  
  // Poor quality but allow user to proceed
  return {
    status: 'poor',
    recommendation: 'Poor photo quality. Generation may fail or produce low-quality results.',
    canProceed: true
  }
}

/**
 * Batch validate multiple photos and return recommendations
 * @param files - Array of photo files to validate
 * @returns Promise resolving to array of validation results
 */
export async function validatePhotos(files: File[]): Promise<PhotoValidation[]> {
  const validations = await Promise.all(files.map(validatePhoto))
  return validations
}

/**
 * Get recommended photo selection based on validation results
 * @param validations - Array of validation results
 * @returns Array of indices for recommended photos
 */
export function getRecommendedSelection(validations: PhotoValidation[]): number[] {
  return validations
    .map((validation, index) => ({ validation, index }))
    .filter(({ validation }) => validation.status === 'good')
    .map(({ index }) => index)
}

/**
 * Format validation issues for display
 * @param issues - Array of issue strings
 * @returns Formatted string for UI display
 */
export function formatValidationIssues(issues: string[]): string {
  if (issues.length === 0) return 'No issues detected'
  if (issues.length === 1) return issues[0]
  return `${issues.length} issues: ${issues.join(', ')}`
}