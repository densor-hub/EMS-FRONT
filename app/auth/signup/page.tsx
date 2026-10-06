'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PublicRoute } from '@/routes/public-route';
import { useToaster } from '@/components/util/CustomToast';
import { getAuthState } from '@/lib/customAxios';

import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  User,
  Phone,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Check,
} from 'lucide-react';
import Loading from '@/app/dashboard/loading';
import { toastErrors } from '@/helpers/formatStrings';
import axiosInstance from '@/lib/customAxios';

type Step = 'company' | 'user';

export default function SignupPage() {
  const toast = useToaster()
  const router = useRouter();
  const authState = getAuthState()
  const [step, setStep] = useState<Step>('company');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');

  // User fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleCompanyNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('user');
  };

  const resetForm = () => {
    setCompanyName("")
    setCompanyEmail("")
    setCompanyPhone("")
    setCompanyAddress("")
    setFirstName("")
    setLastName("")
    setUserEmail("")
    setPassword("")
    setConfirmPassword("")
    setStep("company")
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {

        const company = {
          name: companyName,
          email: companyEmail,
          phone: companyPhone,
          address: companyAddress,
        }

        const adminInfo  = {
          firstName,
          lastName,
          email: userEmail,
          password,
          phone : "",
          confirmPassword
        }
      const response = await axiosInstance.post('/auth/register', { company, adminInfo : {...adminInfo, fullname : `${adminInfo.firstName} ${adminInfo.lastName}`} });
      
        if (response?.status == 200) {
          
          resetForm()
          router.push("/auth/login")
        }
    } catch (err) {
      console.log(err)
      toastErrors( toast, 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

   if (authState?.user?.id && authState?.isAuthenticated) return router.push('/dashboard')

  return (
    <>
      {isLoading && <Loading/>}
    <div className="bg-background flex  justify-center p-4 h-auto overflow-y-hidden">
      <div className="w-full max-w-lg" >
        {/* Logo */}
        <div className="flex justify-center mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Enterprise</h1>
              <p className="text-xs text-muted-foreground">Management System</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-3 gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'company'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/20 text-primary'
              }`}
            >
              {step === 'user' ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <span className={`text-sm ${step === 'company' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Company Info
            </span>
          </div>
          <div className="w-12 h-0.5 bg-border"></div>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}
            >
              2
            </div>
            <span className={`text-sm ${step === 'user' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Admin Account
            </span>
          </div>
        </div>

        <Card className="border-border bg-card p-0 pt-3 gap-0">
          <CardHeader className="text-center">
            {/* <CardTitle className="text-2xl font-semibold text-foreground">
              {step === 'company' ? 'Register your company' : 'Create admin account'}
            </CardTitle> */}
            <CardDescription className="text-muted-foreground">
              {step === 'company'
                ? 'Enter your company information to get started'
                : 'Set up your administrator account'}
            </CardDescription>
          </CardHeader>
          <CardContent >
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 'company' ? (
              <form onSubmit={handleCompanyNext} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-foreground">Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="companyName"
                      placeholder="Acme Corporation"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="pl-10 bg-white border-border"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyEmail" className="text-foreground">Company Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="companyEmail"
                      type="email"
                      placeholder="info@company.com"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className="pl-10 bg-white border-border"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyPhone" className="text-foreground">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="companyPhone"
                      type="tel"
                      placeholder="+1 234 567 8900"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      className="pl-10 bg-white border-border"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyAddress" className="text-foreground">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="companyAddress"
                      placeholder="123 Business Ave, City, State"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className="pl-10 bg-white border-border"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-foreground">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10 bg-white border-border"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-foreground">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="bg-white border-border"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userEmail" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="userEmail"
                      type="email"
                      placeholder="john@company.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="pl-10 bg-white border-border"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-white border-border"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 bg-white border-border"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('company')}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    { 'Create Account'}
                  </Button>
                </div>
              </form>
            )}

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground pb-3">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-2">
          By signing up, you agree to our{' '}
          <Link href="#" className="text-primary hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
    {toast.ToastComponent}
    </>
  );
}
