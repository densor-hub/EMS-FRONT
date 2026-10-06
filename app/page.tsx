'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Store,
  Users,
  Package,
  ShoppingCart,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  Check,
} from 'lucide-react';
import { AuthGuard } from '@/routes/auth-guard';
import { PublicRoute } from '@/routes/public-route';
import { getAuthState } from '@/lib/customAxios';
import { useRouter } from 'next/navigation';

const features = [
  {
    icon: <Store className="w-6 h-6" />,
    title: 'Multi-Shop Management',
    description: 'Create and manage multiple shops from a single dashboard with role-based access.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Employee & Role Management',
    description: 'Define custom roles, permissions, and manage your entire workforce efficiently.',
  },
  {
    icon: <Package className="w-6 h-6" />,
    title: 'Inventory Control',
    description: 'Track stock levels, set reorder points, and manage items across all locations.',
  },
  {
    icon: <ShoppingCart className="w-6 h-6" />,
    title: 'Sales & Transactions',
    description: 'Process sales, credit transactions, purchases, and customer deposits seamlessly.',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Real-time Reports',
    description: 'Get insights into your business with comprehensive dashboards and analytics.',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Customer & Supplier Management',
    description: 'Manage relationships, track balances, and handle credit accounts with ease.',
  },
];

const benefits = [
  'Unlimited shops and locations',
  'Real-time inventory tracking',
  'Credit management system',
  'Customer deposits & reservations',
  'Supplier account management',
  'Role-based access control',
  'Comprehensive reporting',
  'Multi-user support',
];


export default function LandingPage() {
 const authState = getAuthState();
 const router = useRouter()
    if (authState?.user?.id && authState?.isAuthenticated) return router.push('/dashboard')
  return (
   <>
       <div className="h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Enterprise</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <Zap className="w-4 h-4" />
            Streamline your business operations
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance">
            Complete Enterprise Management Solution
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
            Manage your shops, inventory, employees, customers, suppliers, and transactions 
            all in one powerful platform. Built for businesses that want to grow.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8">
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="px-8 bg-transparent">
                View Demo Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-card border-y border-border">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Everything you need to run your business
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A comprehensive suite of tools designed to help you manage every aspect of your enterprise operations.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-background border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Built for modern businesses
              </h2>
              <p className="text-muted-foreground mb-8">
                Whether you run a single shop or manage multiple locations, our platform 
                scales with your business. Get started in minutes and see results immediately.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2 text-foreground">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-border flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Dashboard Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary/5 border-t border-border">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to transform your business?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of businesses already using Enterprise Management System 
            to streamline their operations.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              Get Started for Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Enterprise</span>
          </div>
          <p className="text-sm text-muted-foreground">
            2024 Enterprise Management System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
   </>
  );
}
