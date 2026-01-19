import api from './api';
import { ApiResponse, AuthResponse } from '../types';

export const authService = {
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
      username,
      password,
    });

    if (response.success && response.data) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    }

    throw new Error(response.error || 'Login failed');
  },

  async register(data: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);

    if (response.success && response.data) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    }

    throw new Error(response.error || 'Registration failed');
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  async initiateOktaSSO(): Promise<string> {
    const response = await api.get<ApiResponse<{ authUrl: string; state: string }>>('/auth/okta/login');

    if (response.success && response.data) {
      return response.data.authUrl;
    }

    throw new Error(response.error || 'Failed to initiate SSO');
  },

  handleSSOCallback(token: string): void {
    localStorage.setItem('token', token);
    // Fetch user info using the token
    this.fetchUserInfo();
  },

  async fetchUserInfo(): Promise<void> {
    try {
      const response = await api.get<ApiResponse<any>>('/auth/verify');
      if (response.success && response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  },
};
