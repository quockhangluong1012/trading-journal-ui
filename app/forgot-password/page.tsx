"use client"

import { useState } from "react"
import Link from "next/link"
import { TrendingUp, ArrowLeft, Mail, AlertCircle, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError("Email is required"); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter a valid email address"); return }
    setError(undefined)
    setIsSubmitting(true)
    await new Promise((r) => setTimeout(r, 1200))
    setSent(true)
    setIsSubmitting(false)
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>

          {sent ? (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Check your email</h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                We sent a password reset link to <span className="font-medium text-foreground">{email}</span>. Check your inbox and follow the instructions.
              </p>
              <Link href="/login">
                <Button variant="outline" className="mt-4 gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back to sign in
                </Button>
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Reset your password</h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Enter your email address and we will send you a link to reset your password.
              </p>
            </>
          )}
        </div>

        {!sent && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="trader@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(undefined) }}
                aria-invalid={!!error}
                className="h-11"
                autoFocus
              />
              {error && (
                <p className="flex items-center gap-1.5 text-xs text-destructive mt-1" role="alert">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" size="lg" disabled={isSubmitting} className="h-11 w-full font-semibold gap-2">
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                <><Mail className="h-4 w-4" /> Send reset link</>
              )}
            </Button>
            <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
