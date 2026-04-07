import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import { authAPI, AuthResponse } from '../services/api'

interface User {
  id: string
  email: string
  full_name: string
  phone?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string, phone?: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  refreshAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // Ref to allow api.ts interceptor to call refresh without circular dependency
  const refreshFnRef = useRef<(() => Promise<string | null>) | null>(null)

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('access_token')

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Error parsing stored user:', error)
        localStorage.removeItem('user')
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response: AuthResponse = await authAPI.login({ email, password })

      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      localStorage.setItem('user', JSON.stringify(response.user))

      setUser(response.user)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed')
    }
  }

  const register = async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      const response: AuthResponse = await authAPI.register({
        email,
        password,
        full_name: fullName,
        phone,
      })

      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      localStorage.setItem('user', JSON.stringify(response.user))

      setUser(response.user)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed')
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  /**
   * Attempts to refresh the access token using the stored refresh token.
   * Returns the new access token on success, or null if refresh fails.
   * On failure it clears auth state (equivalent to logout).
   */
  const refreshAccessToken = async (): Promise<string | null> => {
    const storedRefreshToken = localStorage.getItem('refresh_token')
    if (!storedRefreshToken) {
      logout()
      return null
    }

    try {
      const response: AuthResponse = await authAPI.refreshToken(storedRefreshToken)
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      localStorage.setItem('user', JSON.stringify(response.user))
      setUser(response.user)
      return response.access_token
    } catch {
      // Refresh token is also invalid/expired — force logout
      logout()
      return null
    }
  }

  // Expose refresh function via ref so api.ts interceptor can call it
  useEffect(() => {
    refreshFnRef.current = refreshAccessToken
  }, [])

  // Attach ref to window for the axios interceptor to access without circular imports
  useEffect(() => {
    (window as any).__refreshAccessToken = refreshAccessToken
    return () => {
      delete (window as any).__refreshAccessToken
    }
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    refreshAccessToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
