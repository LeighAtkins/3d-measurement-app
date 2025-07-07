export class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl
    this.token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
    }
  }

  getToken(): string | null {
    return this.token
  }

  private async makeRequest(url: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers)
    
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`)
    }
    
    headers.set('Content-Type', 'application/json')

    console.log('ApiClient making request:', {
      url: `${this.baseUrl}${url}`,
      method: options.method || 'GET',
      hasToken: !!this.token,
      body: options.body ? 'Present' : 'None'
    })

    const response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      headers,
    })

    console.log('ApiClient response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('ApiClient error details:', errorText)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  async request(url: string, options: RequestInit = {}) {
    try {
      return await this.makeRequest(url, options)
    } catch (error: any) {
      if (error.message?.includes('401')) {
        // Simple redirect to login for MVP
        this.clearToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
      throw error
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    
    if (response.token) {
      this.setToken(response.token)
    }
    
    return response
  }

  async logout() {
    this.clearToken()
  }

  // Orders
  async getOrders() {
    return this.request('/api/orders')
  }

  async getOrder(id: string) {
    return this.request(`/api/orders/${id}`)
  }

  async createOrder(data: any) {
    return this.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateOrder(id: string, data: any) {
    return this.request(`/api/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Measurements
  async getMeasurements(orderId: string) {
    return this.request(`/api/orders/${orderId}/measurements`)
  }

  async createMeasurement(orderId: string, data: any) {
    return this.request(`/api/orders/${orderId}/measurements`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateMeasurement(orderId: string, measurementId: string, data: any) {
    return this.request(`/api/orders/${orderId}/measurements/${measurementId}`, {
      method: 'PUT', 
      body: JSON.stringify(data),
    })
  }

  async deleteMeasurement(orderId: string, measurementId: string) {
    return this.request(`/api/orders/${orderId}/measurements/${measurementId}`, {
      method: 'DELETE',
    })
  }

  // Photos
  async getOrderPhotos(orderId: string) {
    return this.request(`/api/furniture/photos/${orderId}`)
  }

  async addPhotosToOrder(orderId: string, files: File[]) {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('photos', file)
    })

    return fetch(`${this.baseUrl}/api/orders/${orderId}/photos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
  }

  async deletePhoto(photoId: string) {
    return this.request(`/api/photos/${photoId}`, {
      method: 'DELETE',
    })
  }

  async bulkDeletePhotos(orderId: string, photoIds: string[]) {
    return this.request(`/api/orders/${orderId}/photos`, {
      method: 'DELETE',
      body: JSON.stringify({ photoIds }),
    })
  }

  async regenerateWithPhotos(orderId: string, photoIds: string[], photoSetName?: string) {
    return this.request(`/api/orders/${orderId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ photoIds, photoSetName }),
    })
  }

  // Photo Set Management
  async getPhotoSets(orderId: string) {
    return this.request(`/api/orders/${orderId}/photo-sets`)
  }

  async createPhotoSet(orderId: string, name: string, photoIds: string[]) {
    return this.request(`/api/orders/${orderId}/photo-sets`, {
      method: 'POST',
      body: JSON.stringify({ name, photoIds }),
    })
  }

  async updatePhotoSet(photoSetId: string, photoIds: string[]) {
    return this.request(`/api/photo-sets/${photoSetId}/photos`, {
      method: 'PUT',
      body: JSON.stringify({ photoIds }),
    })
  }

  async getGenerationAttemptPhotos(attemptId: string) {
    return this.request(`/api/generation-attempts/${attemptId}/photos`)
  }

  // GPU Quota
  async getGPUQuota() {
    return this.request('/api/gpu/quota')
  }
}

// Utility function to check token expiry
export function checkTokenExpiry(): boolean {
  if (typeof window === 'undefined') return false
  
  const token = localStorage.getItem('token')
  if (!token) return false
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export default ApiClient