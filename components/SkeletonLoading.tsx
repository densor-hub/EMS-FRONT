'use client'

// components/SkeletonLoading.tsx
import React from 'react';
import { cn } from '@/lib/utils'; // Assuming you have a classNames utility
import { useTheme } from 'next-themes';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'text' | 'circle' | 'rectangle' | 'rounded';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  animate = true,
  ...props
}) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  const animateClasses = animate ? 'animate-pulse' : '';
  
  const variantClasses = {
    text: 'rounded h-4',
    circle: 'rounded-full',
    rectangle: 'rounded-lg',
    rounded: 'rounded-md'
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        baseClasses,
        animateClasses,
        variantClasses[variant],
        className
      )}
      style={style}
      {...props}
    />
  );
};

// Card Skeleton
interface CardSkeletonProps {
  withImage?: boolean;
  lines?: number;
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  withImage = true,
  lines = 3,
  className,
}) => {
  return (
    <div className={cn('border border-gray-100 dark:border-gray-800 rounded-lg p-4', className)}>
      {withImage && (
        <Skeleton
          variant="rectangle"
          height={200}
          className="mb-4 w-full"
        />
      )}
      <Skeleton className="w-3/4 h-5 mb-3" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-full"
            style={{ width: `${100 - i * 15}%` }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-4">
        <Skeleton className="w-20 h-6" />
        <Skeleton className="w-24 h-8 rounded-full" />
      </div>
    </div>
  );
};

// Profile Skeleton
export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="flex items-center space-x-4 p-4">
      <Skeleton variant="circle" width={64} height={64} />
      <div className="space-y-2 flex-1">
        <Skeleton className="w-1/2 h-5" />
        <Skeleton className="w-2/3 h-4" />
        <Skeleton className="w-1/3 h-3" />
      </div>
    </div>
  );
};

// Table Skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  withHeader?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  withHeader = true,
}) => {
  return (
    <div className="w-full overflow-hidden">
      {withHeader && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-6" />
          ))}
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-4 gap-4 p-3 border-b border-gray-100 dark:border-gray-800"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`${rowIndex}-${colIndex}`}
                className="h-4"
                style={{ width: `${70 + Math.random() * 20}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// Dashboard Skeleton
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="w-48 h-8" />
        <Skeleton className="w-32 h-10 rounded-full" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="w-20 h-4 mb-2" />
                <Skeleton className="w-16 h-6" />
              </div>
              <Skeleton variant="circle" width={48} height={48} />
            </div>
            <Skeleton className="w-full h-2 mt-3" />
          </div>
        ))}
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="w-32 h-6" />
            <Skeleton className="w-24 h-8 rounded-full" />
          </div>
          <Skeleton variant="rectangle" height={300} className="w-full" />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border">
          <Skeleton className="w-40 h-6 mb-6" />
          <TableSkeleton rows={4} columns={3} withHeader={false} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border">
        <Skeleton className="w-48 h-6 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center">
              <Skeleton variant="circle" width={40} height={40} className="mr-4" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-3/4 h-4" />
                <Skeleton className="w-1/2 h-3" />
              </div>
              <Skeleton className="w-20 h-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// App Initialization Skeleton with animated shine bars
export  const AppInitializationSkeletonLight : React.FC<CardSkeletonProps> =  () => {
   return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* App Header Skeleton */}
        <div className="mb-12">
          <div className="h-8 w-64 bg-gray-400 rounded-md mb-4 relative overflow-hidden">
            <div className="shiny-loader"></div>
          </div>
          <div className="h-4 w-48 bg-gray-300 rounded-md relative overflow-hidden">
            <div className="shiny-loader"></div>
          </div>
        </div>

        {/* Main Loading Bar */}
        <div className="mb-10">
          <div className="text-gray-400 text-sm mb-2">Initializing ...</div>
          <div className="h-4 w-full bg-gray-400 rounded-full overflow-hidden relative">
            <div className="shiny-loader-wide"></div>
          </div>
          <div className="flex justify-end text-gray-500 text-xs mt-2">
            {/* <span>Loading modules</span> */}
            {/* <span>65%</span> */}
            <span>Almost there...</span>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="space-y-6 mb-12">
          {[
            { label: '', width: 'w-5/6' },
            { label: '', width: 'w-4/6' },
            { label: '', width: 'w-3/4' },
            { label: '', width: 'w-2/3' },
            { label: '', width: 'w-1/2' }
          ].map((step, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300 text-sm">{step.label}</span>
                <span className="text-gray-500 text-xs">Loading...</span>
              </div>
              <div className="h-2 bg-gray-300 rounded-full overflow-hidden relative">
                <div className={`h-full ${step.width} bg-gray-400 relative`}>
                  <div className="shiny-loader-short"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
    
      {/* Bottom Status Bar */}
        <div className="pt-6 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <div className="h-3 w-24 bg-gray-400 rounded relative overflow-hidden">
                <div className="shiny-loader"></div>
              </div>
              <div className="h-3 w-32 bg-gray-400 rounded relative overflow-hidden">
                <div className="shiny-loader"></div>
              </div>
            </div>
            <div className="h-6 w-40 bg-gray-400 rounded-md relative overflow-hidden">
              <div className="shiny-loader"></div>
            </div>
          </div>
        </div>
        
      </div>

      {/* Custom CSS for shiny effects */}
      <style jsx>{`
        .shiny-loader {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          animation: shine 1.5s infinite;
        }

        .shiny-loader-wide {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(9, 240, 78, 0.4),
            rgba(34, 211, 238, 0.4),
            transparent
          );
          animation: shine 1.2s infinite;
        }

        .shiny-loader-short {
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          animation: shine-short 1.8s infinite;
        }

        @keyframes shine {
          0% {
            left: -100%;
          }
          100% {
            left: 200%;
          }
        }

        @keyframes shine-short {
          0% {
            left: -50%;
          }
          100% {
            left: 150%;
          }
        }
      `}</style>
    </div>
  );
};

export  const AppInitializationSkeletonDark : React.FC<CardSkeletonProps> =  () => {
    return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* App Header Skeleton */}
        <div className="mb-12">
          <div className="h-8 w-64 bg-gray-800 rounded-md mb-4 relative overflow-hidden">
            <div className="shiny-loader"></div>
          </div>
          <div className="h-4 w-48 bg-gray-800 rounded-md relative overflow-hidden">
            <div className="shiny-loader"></div>
          </div>
        </div>

        {/* Main Loading Bar */}
        <div className="mb-10">
          <div className="text-gray-400 text-sm mb-2">Initializing ...</div>
          <div className="h-4 w-full bg-gray-800 rounded-full overflow-hidden relative">
            <div className="shiny-loader-wide"></div>
          </div>
          <div className="flex justify-end text-gray-500 text-xs mt-2">
            {/* <span>Loading modules</span> */}
            {/* <span>65%</span> */}
            <span>Almost there</span>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="space-y-6 mb-12">
          {[
            { label: '', width: 'w-5/6' },
            { label: '', width: 'w-4/6' },
            { label: '', width: 'w-3/4' },
            { label: '', width: 'w-2/3' },
            { label: '', width: 'w-1/2' }
          ].map((step, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300 text-sm">{step.label}</span>
                <span className="text-gray-500 text-xs">Loading...</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden relative">
                <div className={`h-full ${step.width} bg-gray-800 relative`}>
                  <div className="shiny-loader-short"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Status Bar */}
        <div className="border-t border-gray-800 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <div className="h-3 w-24 bg-gray-800 rounded relative overflow-hidden">
                <div className="shiny-loader"></div>
              </div>
              <div className="h-3 w-32 bg-gray-800 rounded relative overflow-hidden">
                <div className="shiny-loader"></div>
              </div>
            </div>
            <div className="h-6 w-40 bg-gray-800 rounded-md relative overflow-hidden">
              <div className="shiny-loader"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for shiny effects */}
      <style jsx>{`
        .shiny-loader {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          animation: shine 1.5s infinite;
        }

        .shiny-loader-wide {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(42, 222, 29, 0.4),
            rgba(34, 211, 238, 0.4),
            transparent
          );
          animation: shine 1.2s infinite;
        }

        .shiny-loader-short {
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          animation: shine-short 1.8s infinite;
        }

        @keyframes shine {
          0% {
            left: -100%;
          }
          100% {
            left: 200%;
          }
        }

        @keyframes shine-short {
          0% {
            left: -50%;
          }
          100% {
            left: 150%;
          }
        }
      `}</style>
    </div>
  );
};

// Loading Overlay with Message
interface LoadingOverlayProps {
  message?: string;
  subMessage?: string;
  showProgress?: boolean;
  progress?: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Loading...',
  subMessage,
  showProgress = false,
  progress = 0,
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/20 dark:bg-black/40 backdrop-blur-sm">
      {/* Animated Logo/Icon */}
      <div className="relative mb-8">
        <div className="w-20 h-20 border-4 border-gray-200 dark:border-gray-700 border-t-green-500 border-r-white-400 rounded-full animate-spin" />
      </div>

      {/* Loading Text */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-white dark:text-white-200 mb-2">
          {message}
        </h3>
        {subMessage && (
          <p className="text-white-600 dark:white text-sm">{subMessage}</p>
        )}
      </div>

      {showProgress && (
        <div className="w-64 max-w-md mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Initializing</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};


export const AppInitializationSkeleton = () => {
    const {theme, resolvedTheme} = useTheme()
  return <>
          {theme === "light" || resolvedTheme ==="light" ? 
              <AppInitializationSkeletonLight/> : (theme === "dark" || resolvedTheme ==="dark")  ? 
              <AppInitializationSkeletonDark/> : <></>
            }
        </>
}

// Export all components
export default {
  Skeleton,
  CardSkeleton,
  ProfileSkeleton,
  TableSkeleton,
  DashboardSkeleton,
  AppInitializationSkeleton,
  LoadingOverlay,
};