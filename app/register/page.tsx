"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { TrendingUp, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { registerUser } from "@/lib/api"

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  general?: string
}

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
          <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i <= strength ? color : "bg-muted")} />
        ))}
      </div>
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{level}</span>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const validate = useCallback((): FormErrors => {
    const e: FormErrors = {}
    if (!name.trim()) e.name = "Name is required"
    if (!email.trim()) e.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email"
    if (!password) e.password = "Password is required"
    else if (password.length < 6) e.password = "Password must be at least 6 characters"
    if (!confirmPassword) e.confirmPassword = "Please confirm your password"
    else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match"
    return e
  }, [name, email, password, confirmPassword])

  const handleBlur = (field: string) => {
    setTouched((p) => ({ ...p, [field]: true }))
    setErrors(validate())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setTouched({ name: true, email: true, password: true, confirmPassword: true })
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setIsSubmitting(true)

    try {
      const response = await registerUser({ email, password, fullName: name })
      if (response.data.isSuccess) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/login")
        }, 600)
      } else {
        setErrors({ general: "Registration failed." })
        setIsSubmitting(false)
      }
    } catch (error: any) {
      setErrors({ general: error.response?.data?.error?.message || "Registration failed. Please try again." })
      setIsSubmitting(false)
    }
  }

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? <p className="flex items-center gap-1.5 text-xs text-destructive mt-1.5" role="alert"><AlertCircle className="h-3 w-3 shrink-0" />{msg}</p> : null

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link href="/login" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">Trading Journal</span>
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground">Start tracking your trades and building your edge.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {errors.general && (
            <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errors.general}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" placeholder="John Doe" value={name} onChange={(e) => { setName(e.target.value); if (touched.name) setErrors(validate()) }} onBlur={() => handleBlur("name")} aria-invalid={!!errors.name && !!touched.name} className="h-11" autoFocus />
            {touched.name && <FieldError msg={errors.name} />}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" placeholder="trader@example.com" value={email} onChange={(e) => { setEmail(e.target.value); if (touched.email) setErrors(validate()) }} onBlur={() => handleBlur("email")} aria-invalid={!!errors.email && !!touched.email} className="h-11" />
            {touched.email && <FieldError msg={errors.email} />}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Create a password" value={password} onChange={(e) => { setPassword(e.target.value); if (touched.password) setErrors(validate()) }} onBlur={() => handleBlur("password")} aria-invalid={!!errors.password && !!touched.password} className="h-11 pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? "Hide password" : "Show password"} tabIndex={-1}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {touched.password && <FieldError msg={errors.password} />}
            <PasswordStrength password={password} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type={showPassword ? "text" : "password"} placeholder="Repeat your password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); if (touched.confirmPassword) setErrors(validate()) }} onBlur={() => handleBlur("confirmPassword")} aria-invalid={!!errors.confirmPassword && !!touched.confirmPassword} className="h-11" />
            {touched.confirmPassword && <FieldError msg={errors.confirmPassword} />}
          </div>

          <Button type="submit" size="lg" disabled={isSubmitting || success} className="h-11 w-full font-semibold gap-2 mt-1">
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</> : success ? <>Redirecting... <ArrowRight className="h-4 w-4" /></> : <>Create account <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
