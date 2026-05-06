"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { API_BASE_URL } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [stayLoggedIn, setStayLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const body = new URLSearchParams()
      body.append("username", email)
      body.append("password", password)
      body.append("remember_me", String(stayLoggedIn))

      const response = await fetch(`${API_BASE_URL}/api/v1/user/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          detail?: string
        } | null
        throw new Error(errorData?.detail ?? "Unable to log in.")
      }
      router.push("/vote")
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to log in."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </Field>
              <Field>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id="stay-logged-in"
                    checked={stayLoggedIn}
                    onChange={(e) => setStayLoggedIn(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  Stay logged in for 30 days
                </label>
              </Field>
              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? "Logging In..." : "Login"}
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <Link href="/signup">Sign up</Link>
                </FieldDescription>
                {error ? (
                  <p className="text-center text-sm text-destructive">{error}</p>
                ) : null}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
