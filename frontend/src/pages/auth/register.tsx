import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Mail, Lock, User, Eye, EyeOff, UserPlus, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'ADMIN' | 'STAFF';
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isAuthenticated, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    defaultValues: {
      role: 'STAFF'
    }
  });

  const password = watch('password');

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      });
      router.push('/dashboard');
    } catch (error) {
      // Error is handled in the auth context
    }
  };

  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="w-16 h-16 relative mb-6">
                  <Image 
                    src="/ARSANA.svg" 
                    alt="Arsana Logo"
                    layout="fill"
                    objectFit="contain"
                  />
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-sm text-gray-600 animate-pulse">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        <div className="flex flex-col items-center">
          <div className="w-40 h-40 relative mb-2">
            <Image 
              src="/ARSANA.svg"
              alt="Arsana Logo"
              layout="fill"
              objectFit="contain"
              priority
            />
          </div>
          <h1 className="text-center text-3xl font-extrabold text-primary-600 tracking-tight">
            Arsana
          </h1>
          <h2 className="mt-4 text-center text-2xl font-bold text-gray-900">
            Buat akun baru
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Atau{' '}
            <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200 underline">
              masuk ke akun yang sudah ada
            </Link>
          </p>
        </div>
        
        <div className="bg-white shadow-xl rounded-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    {...register('name', {
                      required: 'Nama wajib diisi',
                      minLength: {
                        value: 2,
                        message: 'Nama minimal 2 karakter'
                      }
                    })}
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition duration-150 text-sm"
                    placeholder="Masukkan nama lengkap Anda"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <span className="inline-block w-1.5 h-1.5 bg-red-600 rounded-full mr-1.5"></span>
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    {...register('email', {
                      required: 'Email wajib diisi',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Format email tidak valid'
                      }
                    })}
                    type="email"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition duration-150 text-sm"
                    placeholder="nama@perusahaan.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <span className="inline-block w-1.5 h-1.5 bg-red-600 rounded-full mr-1.5"></span>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Peran
                </label>
                <div className="relative mt-1">
                  <select
                    {...register('role')}
                    className="block w-full pl-3 pr-10 py-3 text-base border border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-lg appearance-none transition duration-150"
                  >
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    {...register('password', {
                      required: 'Password wajib diisi',
                      minLength: {
                        value: 6,
                        message: 'Password minimal 6 karakter'
                      }
                    })}
                    type={showPassword ? 'text' : 'password'}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition duration-150 text-sm"
                    placeholder="Minimal 6 karakter"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none transition duration-150"
                    >
                      {showPassword ? 
                        <EyeOff className="h-5 w-5" aria-hidden="true" /> : 
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      }
                    </button>
                  </div>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <span className="inline-block w-1.5 h-1.5 bg-red-600 rounded-full mr-1.5"></span>
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Konfirmasi Password
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    {...register('confirmPassword', {
                      required: 'Konfirmasi password wajib diisi',
                      validate: value =>
                        value === password || 'Password tidak cocok'
                    })}
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition duration-150 text-sm"
                    placeholder="Konfirmasi password Anda"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none transition duration-150"
                    >
                      {showConfirmPassword ? 
                        <EyeOff className="h-5 w-5" aria-hidden="true" /> : 
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      }
                    </button>
                  </div>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <span className="inline-block w-1.5 h-1.5 bg-red-600 rounded-full mr-1.5"></span>
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="text-xs text-gray-500 border-t border-gray-200 pt-4 mt-2">
                <p>Dengan mendaftar, Anda menyetujui <Link href="/terms" className="text-primary-600 hover:text-primary-500">Ketentuan Layanan</Link> dan <Link href="/privacy" className="text-primary-600 hover:text-primary-500">Kebijakan Privasi</Link> kami.</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center items-center py-3 px-4 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 transition-colors duration-200"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    Mendaftarkan...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5 mr-2" />
                    Daftar Sekarang
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        <div className="text-center text-xs text-gray-500 mt-4">
          © 2025 Arsana. Semua hak dilindungi.
        </div>
      </div>
    </div>
  );
}