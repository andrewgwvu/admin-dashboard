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
    const token = this.getToken();
    if (!token) return false;

    // Check if token is expired
    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }

    return true;
  },

  isTokenExpired(token: string): boolean {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const payload = JSON.parse(jsonPayload);
      const exp = payload.exp;

      if (!exp) return false;

      // Check if token expired (exp is in seconds, Date.now() is in milliseconds)
      return Date.now() >= exp * 1000;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return true; // If we can't decode it, consider it expired
    }
  },

  startTokenExpirationCheck(): void {
    // Check every minute if token is expired
    setInterval(() => {
      if (this.getToken() && this.isTokenExpired(this.getToken()!)) {
        console.log('Token expired, logging out...');
        this.logout();
      }
    }, 60000); // Check every 60 seconds
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

    // Decode JWT to extract user info
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const payload = JSON.parse(jsonPayload);
      const user = {
        id: payload.id,
        username: payload.username,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.role,
      };

      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      // Fallback to fetching user info
      this.fetchUserInfo();
    }
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
