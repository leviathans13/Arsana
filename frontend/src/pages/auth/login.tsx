"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap, Shield, Sparkles } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import Image from "next/image"

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, loading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard")
    }
  }, [isAuthenticated, router])

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data)
      router.push("/dashboard")
    } catch (error) {
      // Error is handled in the auth context
    }
  }

  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <div className="relative mb-8">
          <div className="w-20 h-20 relative animate-pulse">
            <Image src="/ARSANA.svg" alt="Arsana Logo" fill className="object-contain" />
          </div>
          <div className="absolute -inset-8 bg-cyan-400 rounded-full opacity-20 animate-ping"></div>
        </div>
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-cyan-400"></div>
          <Zap className="absolute inset-0 m-auto h-6 w-6 text-cyan-400 animate-pulse" />
        </div>
        <p className="mt-6 text-sm text-gray-400 animate-pulse font-medium">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-slate-900"></div>

        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500 opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-500 opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-pink-500 opacity-3 rounded-full blur-3xl"></div>

        <div
          className="absolute w-64 h-64 bg-cyan-400 opacity-10 rounded-full blur-2xl animate-pulse"
          style={{
            left: mousePosition.x * 0.02 + "px",
            top: mousePosition.y * 0.02 + "px",
            transform: "translate(-50%, -50%)",
          }}
        ></div>
        <div
          className="absolute w-48 h-48 bg-purple-500 opacity-8 rounded-full blur-2xl animate-pulse delay-1000"
          style={{
            right: (typeof window !== "undefined" ? window.innerWidth - mousePosition.x : 0) * 0.015 + "px",
            bottom: (typeof window !== "undefined" ? window.innerHeight - mousePosition.y : 0) * 0.015 + "px",
            transform: "translate(50%, 50%)",
          }}
        ></div>

        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        </div>

        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-ping"
            style={{
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              animationDelay: Math.random() * 3 + "s",
              animationDuration: 2 + Math.random() * 3 + "s",
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-8 group">
              <div className="absolute -inset-4 bg-cyan-400 rounded-full opacity-20 blur-lg group-hover:opacity-30 transition-opacity duration-500 animate-pulse"></div>
              <div className="relative w-32 h-32 bg-slate-800 rounded-full border-2 border-cyan-400 flex items-center justify-center group-hover:border-cyan-300 transition-all duration-300 shadow-2xl">
                <Image
                  src="/ARSANA.svg"
                  alt="Arsana Logo"
                  width={60}
                  height={60}
                  className="object-contain filter brightness-0 invert"
                  priority
                />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-6xl font-black text-cyan-400 tracking-tight animate-pulse">ARSANA</h1>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-8 h-0.5 bg-cyan-400"></div>
                <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                <div className="w-8 h-0.5 bg-purple-400"></div>
              </div>
            </div>

            <h2 className="mt-8 text-2xl font-bold text-white">Welcome Back</h2>
            <p className="mt-2 text-gray-400">
              Don't have an account?{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-cyan-400 hover:text-purple-400 transition-colors duration-300 relative group"
              >
                <span className="relative z-10">Sign up now</span>
                <span className="absolute inset-0 bg-cyan-400 opacity-0 group-hover:opacity-10 rounded blur-sm transition-opacity duration-300"></span>
              </Link>
            </p>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-cyan-400 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-500 animate-pulse"></div>

            <div className="relative bg-slate-800 backdrop-blur-xl shadow-2xl rounded-2xl p-8 border border-slate-700">
              <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-6">
                  <div className="group">
                    <label htmlFor="email" className="block text-sm font-bold text-cyan-400 mb-3 flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        {...register("email", {
                          required: "Email is required",
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "Invalid email format",
                          },
                        })}
                        type="email"
                        className="block w-full px-6 py-4 bg-slate-900 border-2 border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder:text-gray-500 text-lg"
                        placeholder="your@email.com"
                      />
                      <div className="absolute inset-0 rounded-xl bg-cyan-400 opacity-0 group-focus-within:opacity-5 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                    {errors.email && (
                      <p className="mt-3 text-sm text-red-400 flex items-center animate-in slide-in-from-left-2 duration-300">
                        <Shield className="w-4 h-4 mr-2" />
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="group">
                    <div className="flex justify-between items-center mb-3">
                      <label htmlFor="password" className="block text-sm font-bold text-purple-400 flex items-center">
                        <Lock className="w-4 h-4 mr-2" />
                        Password
                      </label>
                      <Link
                        href="/auth/forgot-password"
                        className="text-xs text-gray-400 hover:text-cyan-400 transition-colors duration-300 font-medium"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        {...register("password", {
                          required: "Password is required",
                          minLength: {
                            value: 6,
                            message: "Password must be at least 6 characters",
                          },
                        })}
                        type={showPassword ? "text" : "password"}
                        className="block w-full px-6 py-4 bg-slate-900 border-2 border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all duration-300 text-white placeholder:text-gray-500 text-lg pr-14"
                        placeholder="••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-purple-400 focus:outline-none transition-colors duration-300"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                      <div className="absolute inset-0 rounded-xl bg-purple-400 opacity-0 group-focus-within:opacity-5 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                    {errors.password && (
                      <p className="mt-3 text-sm text-red-400 flex items-center animate-in slide-in-from-left-2 duration-300">
                        <Shield className="w-4 h-4 mr-2" />
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative w-full flex justify-center items-center py-5 px-8 bg-cyan-700 hover:bg-cyan-600 text-white text-lg font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-2xl hover:shadow-cyan-500/50 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-cyan-600 opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/30 border-t-white mr-3"></div>
                        <span className="relative z-10">PROCESSING...</span>
                      </>
                    ) : (
                      <>
                        <span className="relative z-10 mr-3">ENTER ARSANA</span>
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300 relative z-10" />
                        <Sparkles className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/70 group-hover:animate-spin transition-all duration-300" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center">
              <span className="w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse"></span>© 2025 Arsana. All rights
              reserved.
              <span className="w-2 h-2 bg-purple-400 rounded-full ml-2 animate-pulse"></span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
