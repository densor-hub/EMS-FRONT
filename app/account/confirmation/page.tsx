'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { confirmAccount, setPassword } from '@/lib/customAxios';

type Status = 'verifying' | 'invalid' | 'ready' | 'submitting' | 'success';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [status, setStatus] = useState<Status>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setStatus('invalid');
      setErrorMessage('The link is missing its token or email. Please request a new invitation.');
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        await confirmAccount(token, email);
        if (!cancelled) setStatus('ready');
      } catch (err: any) {
        if (cancelled) return;
        setStatus('invalid');
        setErrorMessage(
          err?.response?.data?.message ||
          'This link is invalid or has expired. Please request a new invitation.'
        );
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setErrorMessage('');
    setStatus('submitting');

    try {
      await setPassword({ email, token, newPassword, confirmPassword });
      setStatus('success');
    } catch (err: any) {
      setStatus('ready');
      setErrorMessage(
        err?.response?.data?.message ||
        'We could not update your password. Please try again.'
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center mb-3">
            <LockKeyhole className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set Your Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a password to activate your account
          </p>
        </div>

        {status === 'verifying' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Verifying your link...</p>
          </div>
        )}

        {status === 'invalid' && (
          <div className="text-center py-4">
            <div className="inline-flex w-14 h-14 rounded-full bg-red-100 items-center justify-center mb-3">
              <XCircle className="w-7 h-7 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Link unavailable</h2>
            <p className="text-sm text-muted-foreground mb-6">{errorMessage}</p>
            <Button variant="outline" className="w-full" onClick={() => router.push('/auth/login')}>
              Back to sign in
            </Button>
          </div>
        )}

        {(status === 'ready' || status === 'submitting') && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {email && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Account</Label>
                <div className="text-sm font-medium text-foreground bg-secondary px-3 py-2 rounded-md">
                  {email}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-foreground">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a strong password"
                  className="pr-10 bg-white border-border"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={status === 'submitting'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="pr-10 bg-white border-border"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={status === 'submitting'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
              <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>At least 8 characters</li>
              <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>One uppercase letter</li>
              <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : ''}>One lowercase letter</li>
              <li className={/\d/.test(newPassword) ? 'text-green-600' : ''}>One number</li>
              <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-green-600' : ''}>One special character</li>
            </ul>

            {errorMessage && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {status === 'submitting' ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</>
              ) : (
                'Set Password'
              )}
            </Button>
          </form>
        )}

        {status === 'success' && (
          <div className="text-center py-4">
            <div className="inline-flex w-14 h-14 rounded-full bg-green-100 items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Password updated</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your password has been set successfully. You can now sign in with your email and new password.
            </p>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => router.push('/login')}
            >
              Continue to sign in
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}