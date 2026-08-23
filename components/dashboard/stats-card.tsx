'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export function StatsCard({ title, value, icon, trend, description, variant = 'default' }: StatsCardProps) {
  const variantStyles = {
    default: 'bg-card',
    primary: 'bg-primary/10 border-primary/20',
    success: 'bg-success/10 border-success/20',
    warning: 'bg-warning/10 border-warning/20',
    danger: 'bg-destructive/10 border-destructive/20',
  };

  const iconStyles = {
    default: 'bg-secondary text-foreground',
    primary: 'bg-primary/20 text-primary',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    danger: 'bg-destructive/20 text-destructive',
  };

  return (
    <Card className={`${variantStyles[variant]} border`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                )}
                <span
                  className={`text-sm font-medium ${
                    trend.isPositive ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-2">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${iconStyles[variant]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
