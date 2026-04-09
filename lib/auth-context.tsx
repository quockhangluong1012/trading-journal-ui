"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { attachToken } from "./api"

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
        setUser(JSON.parse(stored))
        attachToken()
      }
    } catch {
      // Ignore parse errors
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback((userData: AuthUser) => {
    setUser(userData)
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData))
      attachToken() // Ensure token is attached for future API calls
    } catch {
      // Ignore storage errors
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch {
      // Ignore storage errors
    }
    router.push("/login")
  }, [router])

  const value = useMemo(() => ({ user, login, logout, isLoading }), [user, login, logout, isLoading])

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
