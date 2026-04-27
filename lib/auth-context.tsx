"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { attachToken, clearAuthState, syncAuthCookies } from "./api"

// ========================
// Types
// ========================

export interface AuthUser {
  username: string
  email: string
  token?: string
  fullName?: string
  isAdmin?: boolean
}

interface AuthContextType {
  user: AuthUser | null
  login: (userData: AuthUser) => void
  logout: () => void
  isLoading: boolean
  isAuthLoading: boolean
}

// ========================
// Context
// ========================

const AUTH_STORAGE_KEY = "trading-journey-auth-user"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setUser(parsed)
        syncAuthCookies(parsed?.token, Boolean(parsed?.isAdmin))
        attachToken()
      }
    } catch {
      // Ignore parse errors
      clearAuthState()
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback((userData: AuthUser) => {
    setUser(userData)
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData))
      syncAuthCookies(userData.token, Boolean(userData.isAdmin))
      attachToken() // Ensure token is attached for future API calls
    } catch {
      // Ignore storage errors
    }
  }, [])

  const logout = useCallback(() => {
    const loginRoute = user?.isAdmin ? "/admin/login" : "/login"

    setUser(null)
    try {
      clearAuthState()
    } catch {
      // Ignore storage errors
    }
    router.push(loginRoute)
  }, [router, user?.isAdmin])

  const value = useMemo(() => ({ user, login, logout, isLoading, isAuthLoading: isLoading }), [user, login, logout, isLoading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
