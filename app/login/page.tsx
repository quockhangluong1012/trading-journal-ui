"use client"

import { Suspense, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect } from "react"
import { TrendingUp, Eye, EyeOff, Sun, Moon, ArrowRight, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { loginUser } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { getSafeNextPath } from "@/lib/auth-redirect"

// ========================
// Validation helpers
// ========================

interface FormErrors {
  username?: string
  password?: string
  general?: string
}

function validateUsername(value: string): string | undefined {
  if (!value.trim()) return "Username is required"
  if (value.trim().length < 3) return "Username must be at least 3 characters"
  if (!/^[a-zA-Z0-9_@.+-]+$/.test(value.trim())) return "Username contains invalid characters"
  return undefined
}

function validatePassword(value: string): string | undefined {
  if (!value) return "Password is required"
  if (value.length < 6) return "Password must be at least 6 characters"
  return undefined
}

// ========================
// Field Error Component
// ========================

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1.5 text-xs text-destructive mt-1.5" role="alert">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  )
}

// ========================
// Password Strength Indicator
// ========================

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  let strength = 0
  if (password.length >= 6) strength++
  if (password.length >= 10) strength++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[^a-zA-Z0-9]/.test(password)) strength++

  const level = strength <= 1 ? "Weak" : strength <= 3 ? "Fair" : "Strong"
  const color = strength <= 1 ? "bg-destructive" : strength <= 3 ? "bg-warning" : "bg-primary"

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i <= strength ? color : "bg-muted"
            )}
          />
        ))}
      </div>
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{level}</span>
    </div>
  )
}

// ========================
// Login Form Component
// ========================

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, user, isLoading } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<{ username?: boolean; password?: boolean }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const nextPath = getSafeNextPath(searchParams.get("next"), "/")

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(nextPath)
    }
  }, [isLoading, nextPath, router, user])

  const handleBlur = useCallback((field: "username" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({
      ...prev,
      [field]: field === "username" ? validateUsername(username) : validatePassword(password),
      general: undefined,
    }))
  }, [username, password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const usernameError = validateUsername(username)
    const passwordError = validatePassword(password)

    setTouched({ username: true, password: true })
    setErrors({ username: usernameError, password: passwordError })

    if (usernameError || passwordError) return

    setIsSubmitting(true)
    setErrors({})

    try {
      const response = await loginUser({ email: username, password, rememberMe })
      if (response.data.isSuccess) {
        const authData = response.data.value
        login({
          username: authData.fullName,
          email: authData.email,
          token: authData.token,
          fullName: authData.fullName,
          isAdmin: Boolean(authData.isAdmin)
        })
        setLoginSuccess(true)
        setTimeout(() => {
          router.replace(nextPath)
        }, 600)
      } else {
        setErrors({ general: "Invalid credentials" })
        setIsSubmitting(false)
      }
    } catch (error: any) {
      setErrors({ general: error.response?.data?.error?.message || "Login failed. Please try again." })
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {/* General error banner */}
      {errors.general && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errors.general}
        </div>
      )}

      {/* Username field */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username" className="text-foreground/90">
          Username or Email
        </Label>
        <Input
          id="username"
          type="text"
          placeholder="trader@example.com"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            if (touched.username) {
              setErrors((prev) => ({ ...prev, username: validateUsername(e.target.value), general: undefined }))
            }
          }}
          onBlur={() => handleBlur("username")}
          aria-invalid={!!errors.username && touched.username}
          aria-describedby={errors.username && touched.username ? "username-error" : undefined}
          className="h-11"
          autoComplete="username"
          autoFocus
        />
        {touched.username && <FieldError message={errors.username} />}
      </div>

      {/* Password field */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-foreground/90">
            Password
          </Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (touched.password) {
                setErrors((prev) => ({ ...prev, password: validatePassword(e.target.value), general: undefined }))
              }
            }}
            onBlur={() => handleBlur("password")}
            aria-invalid={!!errors.password && touched.password}
            aria-describedby={errors.password && touched.password ? "password-error" : undefined}
            className="h-11 pr-10"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {touched.password && <FieldError message={errors.password} />}
        <PasswordStrength password={password} />
      </div>

      {/* Remember me */}
      <div className="flex items-center gap-2.5">
        <Checkbox
          id="remember"
          checked={rememberMe}
          onCheckedChange={(checked) => setRememberMe(checked === true)}
        />
        <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground cursor-pointer">
          Remember me for 30 days
        </Label>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting || loginSuccess}
        className={cn(
          "h-11 w-full font-semibold transition-all duration-300",
          loginSuccess && "bg-primary/90"
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : loginSuccess ? (
          <>
            Redirecting...
            <ArrowRight className="h-4 w-4" />
          </>
        ) : (
          <>
            Sign in
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  )
}

function LoginFormFallback() {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-4 text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Preparing secure sign in...
    </div>
  )
}

// ========================
// Page Component
// ========================

export default function LoginPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <div className="flex min-h-svh bg-background transition-colors duration-300">
      {/* Left panel -- branding */}
      <div className="relative hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between overflow-hidden bg-primary p-10">
        {/* Decorative pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur-sm">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-primary-foreground">Trading Journey</span>
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-6">
          <h1 className="text-balance text-3xl font-bold leading-tight text-primary-foreground xl:text-4xl">
            Master your trades.<br />
            Track your edge.
          </h1>
          <p className="max-w-sm text-pretty text-primary-foreground/70 leading-relaxed">
            A comprehensive trading journal to track, analyze, and improve your
            performance with real-time insights and strategy backtesting.
          </p>

          {/* Feature highlights */}
          <div className="flex flex-col gap-3 mt-2">
            {[
              "Real-time portfolio analytics",
              "Strategy backtesting playbook",
              "Psychology and discipline tracking",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5 text-sm text-primary-foreground/80">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/15">
                  <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-primary-foreground/40">
          Trading Journey &copy; {new Date().getFullYear()}
        </div>
      </div>

      {/* Right panel -- login form */}
      <div className="flex flex-1 flex-col">
        {/* Top bar with theme toggle */}
        <div className="flex items-center justify-between px-6 py-4 sm:px-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <TrendingUp className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Trading Journey</span>
          </div>
          <div className="lg:ml-auto" />
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Toggle theme"
          >
            {mounted ? (
              theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
            ) : (
              <span className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Centered form area */}
        <div className="flex flex-1 items-center justify-center px-6 pb-12 sm:px-8">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex flex-col gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Welcome back
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sign in to your account to access your trading dashboard and journal.
              </p>
            </div>

            <Suspense fallback={<LoginFormFallback />}>
              <LoginForm />
            </Suspense>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground tracking-wider">
                  or continue with
                </span>
              </div>
            </div>

            {/* Social login */}
            <div className="flex gap-3">
              <Button variant="outline" className="h-11 flex-1 gap-2 text-sm font-medium">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </Button>
              <Button variant="outline" className="h-11 flex-1 gap-2 text-sm font-medium">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </Button>
            </div>

            {/* Registration link */}
            <p className="mt-8 text-center text-sm text-muted-foreground">
              {"Don't have an account? "}
              <Link
                href="/register"
                className="font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
