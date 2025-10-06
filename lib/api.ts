// Servicio de API para comunicación con el backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  private removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = this.getToken();
      if (!token && !endpoint.includes('/auth/login')) {
        throw new Error('Token de acceso requerido');
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en la petición');
      }

      return { data };
    } catch (error) {
      console.error('API Error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  // Métodos de autenticación
  async login(username: string, password: string): Promise<ApiResponse<{
    user: any;
    token: string;
    refreshToken: string;
  }>> {
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (response.data?.token) {
        this.setToken(response.data.token);
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
      }

      return response;
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Error en el login' 
      };
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      const response = await this.request('/auth/logout', { method: 'POST' });
      this.removeToken();
      return response;
    } catch (error) {
      this.removeToken();
      return { error: 'Error en logout' };
    }
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      return this.request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } catch (error) {
      return { error: 'Error refreshing token' };
    }
  }

  // Métodos para entidades
  async getDelincuentes(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return this.request(`/delincuentes?${queryParams.toString()}`);
  }

  async getDelincuenteById(id: string): Promise<ApiResponse> {
    return this.request(`/delincuentes/${id}`);
  }

  async createDelincuente(data: any): Promise<ApiResponse> {
    return this.request('/delincuentes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDelincuente(id: string, data: any): Promise<ApiResponse> {
    return this.request(`/delincuentes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDelincuente(id: string): Promise<ApiResponse> {
    return this.request(`/delincuentes/${id}`, {
      method: 'DELETE',
    });
  }

  // Personas
  async getPersonas(page = 1, limit = 1000, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });
    return this.request(`/personas?${params.toString()}`);
  }

  async getPersona(id: number) {
    return this.request(`/personas/${id}`);
  }

  async searchPersonas(filters: any) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'todos' && value !== '') {
        queryParams.append(key, value as string);
      }
    });
    return this.request(`/personas/search?${queryParams.toString()}`);
  }

  async createPersona(data: any) {
    return this.request('/personas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePersona(id: number, data: any) {
    return this.request(`/personas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePersona(id: number) {
    return this.request(`/personas/${id}`, {
      method: 'DELETE',
    });
  }

  async getCrimenes(params?: any): Promise<ApiResponse> {
    const queryParams = new URLSearchParams(params);
    return this.request(`/crimenes?${queryParams.toString()}`);
  }

  async getStats(): Promise<ApiResponse> {
    return this.request('/api/stats');
  }

  async getCarceles(): Promise<ApiResponse> {
    return this.request('/carceles');
  }

  async getEstatus(params?: any): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== 'todos' && value !== '') {
          queryParams.append(key, value as string);
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/estatus${queryString ? `?${queryString}` : ''}`);
  }

  async createEstatus(data: any): Promise<ApiResponse> {
    return this.request('/estatus', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEstatus(delincuenteId: string, data: any): Promise<ApiResponse> {
    return this.request(`/estatus/${delincuenteId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEstatus(id: string): Promise<ApiResponse> {
    return this.request(`/estatus/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();