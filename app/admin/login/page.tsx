"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Shield, AlertCircle, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginStaff } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { getSafeAdminNextPath } from "@/lib/auth-redirect"

function AdminLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const nextPath = getSafeAdminNextPath(searchParams.get("next"), "/admin")
  
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Basic mount check
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim() || !password) {
      setError("Please enter both email and password")
      return
    }

    setIsSubmitting(true)
    setError(undefined)

    try {
      const response = await loginStaff({ email: username, password })
      if (response.data.isSuccess) {
        const authData = response.data.value
        
        // Critical check: only allow admins
        if (!authData.isAdmin) {
          setError("Unauthorized. This portal is restricted to administrators.")
          setIsSubmitting(false)
          return
        }

        login({
          username: authData.fullName,
          email: authData.email,
          token: authData.token,
          fullName: authData.fullName,
          isAdmin: authData.isAdmin
        })
        
        router.replace(nextPath)
      } else {
        setError("Invalid credentials")
        setIsSubmitting(false)
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Login failed. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        
        {/* Admin Header Banner */}
        <div className="flex flex-col items-center justify-center bg-primary p-8 text-primary-foreground">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-sm">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Admin Portal</h1>
          <p className="mt-2 text-center text-sm text-primary-foreground/80">
            Sign in with an administrator account to manage platform assets.
          </p>
        </div>

        {/* Login Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            
            {error && (
              <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Email Address</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin@example.com"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError(undefined)
                }}
                className="h-11"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(undefined)
                }}
                className="h-11"
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="mt-2 h-11 w-full font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Enter Portal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

          </form>
          
          <div className="mt-8 text-center text-xs text-muted-foreground">
            &larr; <a href="/" className="hover:text-foreground hover:underline">Return to main app</a>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminLoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground shadow-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparing admin sign in...
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginFallback />}>
      <AdminLoginContent />
    </Suspense>
  )
}
