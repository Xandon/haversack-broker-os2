'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

// -------------------------------------------------------------------
// Validation schema
// -------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = useCallback(
    async (data: LoginFormData): Promise<void> => {
      setServerError(null);

      // Validate with Zod manually for strict checking
      const result = loginSchema.safeParse(data);
      if (!result.success) {
        setServerError(result.error.errors[0]?.message ?? 'Invalid input');
        return;
      }

      try {
        await login(result.data.email, result.data.password);
        router.push('/dashboard');
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setServerError('Invalid email or password. Please try again.');
          } else {
            setServerError(err.message || 'An unexpected error occurred.');
          }
        } else {
          setServerError('Unable to connect. Please try again later.');
        }
      }
    },
    [login, router],
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Haversack
        </h1>
        <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Server error */}
          {serverError ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {serverError}
            </div>
          ) : null}

          {/* Email field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Please enter a valid email',
                },
              })}
              className={`mt-1 block h-11 w-full rounded-lg border px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300'
              }`}
              placeholder="you@haversack.com"
            />
            {errors.email ? (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          {/* Password field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password', {
                required: 'Password is required',
              })}
              className={`mt-1 block h-11 w-full rounded-lg border px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300'
              }`}
              placeholder="Enter your password"
            />
            {errors.password ? (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-pulse rounded-full bg-white/60" />
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
