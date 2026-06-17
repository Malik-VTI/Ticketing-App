import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import { authAPI, AuthResponse } from '../services/api'
import { setRefreshHandler } from '../services/tokenRefresh'

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
      localStorage.setItem('user', JSON.stringify(response.user))

      setUser(response.user)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed')
    }
  }

  const logout = () => {
    // Fire-and-forget: clear the httpOnly refresh cookie on the server
    authAPI.logout().catch(() => {})
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token') // defensive cleanup of any legacy value
    localStorage.removeItem('user')
    setUser(null)
  }

  /**
   * Attempts to refresh the access token. The refresh token now lives in an
   * httpOnly cookie sent automatically by the browser, so no token is read
   * from localStorage. Returns the new access token on success, or null if
   * refresh fails. On failure it clears auth state (equivalent to logout).
   */
  const refreshAccessToken = async (): Promise<string | null> => {
    try {
      const response = await authAPI.refreshToken()
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('user', JSON.stringify(response.user))
      setUser(response.user)
      return response.access_token
    } catch {
      logout()
      return null
    }
  }

  // Expose refresh function via ref so api.ts interceptor can call it
  useEffect(() => {
    refreshFnRef.current = refreshAccessToken
  }, [])

  // Register the refresh function with the singleton bridge so the axios
  // interceptor (api.ts) can call it without circular imports or window pollution
  useEffect(() => {
    setRefreshHandler(refreshAccessToken)
    return () => {
      setRefreshHandler(null)
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
