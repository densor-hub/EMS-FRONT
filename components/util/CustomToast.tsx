// components/util/CustomToast.tsx
'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { CheckCircle, AlertTriangle, XCircle, X, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
  title?: string
  duration?: number
}

interface ToastOptions {
  title?: string
  description: string
  duration?: number
}

interface ToasterReturn {
  success: (options: ToastOptions) => void
  error: (options: ToastOptions) => void
  warning: (options: ToastOptions) => void
  info: (options: ToastOptions) => void
  ToastComponent: React.ReactElement
}

export function useToaster(): ToasterReturn {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const toastsRef = useRef<ToastItem[]>([])
  
  // Keep toastsRef in sync with state
  useEffect(() => {
    toastsRef.current = toasts
  }, [toasts])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
    
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const addToast = useCallback((type: ToastType, options: ToastOptions) => {
    const { title, description, duration = 3000 } = options
    
    // Check for duplicate toast
    const isDuplicate = toastsRef.current.some(toast => 
      toast.message === description && 
      toast.title === title && 
      toast.type === type
    )

    // If duplicate exists, don't add new toast
    if (isDuplicate) {
      return
    }

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    setToasts(prev => [...prev, { id, type, message: description, title, duration }])

    // Auto dismiss
    const timer = setTimeout(() => {
      dismiss(id)
    }, duration)

    timersRef.current.set(id, timer)
  }, [dismiss])

  const success = useCallback((options: ToastOptions) => {
    addToast('success', options)
  }, [addToast])

  const error = useCallback((options: ToastOptions) => {
    addToast('error', options)
  }, [addToast])

  const warning = useCallback((options: ToastOptions) => {
    addToast('warning', options)
  }, [addToast])

  const info = useCallback((options: ToastOptions) => {
    addToast('info', options)
  }, [addToast])

  const handleMouseEnter = useCallback((id: string) => {
    // Pause the timer
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    
    // Pause the progress animation
    const toastElement = document.querySelector(`[data-toast-id="${id}"]`)
    if (toastElement) {
      const progressBar = toastElement.querySelector('.progress-bar')
      if (progressBar) {
        progressBar.setAttribute('data-paused', 'true')
      }
    }
  }, [])

  const handleMouseLeave = useCallback((id: string, duration: number) => {
    // Resume the timer
    const toastItem = toastsRef.current.find(t => t.id === id)
    if (!toastItem) return
    
    // Resume the progress animation
    const toastElement = document.querySelector(`[data-toast-id="${id}"]`)
    if (toastElement) {
      const progressBar = toastElement.querySelector('.progress-bar')
      if (progressBar) {
        progressBar.removeAttribute('data-paused')
      }
    }
    
    // Resume the auto-dismiss timer
    const timer = setTimeout(() => {
      dismiss(id)
    }, duration)
    
    timersRef.current.set(id, timer)
  }, [dismiss])

  const ToastComponent = (
    <div className="fixed top-2 right-4 z-[100] space-y-2 min-w-[300px] max-w-[400px] pointer-events-none">
      {toasts.map(toast => {
        const config = {
          success: {
            container: 'bg-green-50 border-green-300',
            icon: <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />,
            title: 'text-green-800',
            message: 'text-green-700',
            progress: 'bg-green-500'
          },
          error: {
            container: 'bg-red-50 border-red-300',
            icon: <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
            title: 'text-red-800',
            message: 'text-red-700',
            progress: 'bg-red-500'
          },
          warning: {
            container: 'bg-amber-50 border-amber-300',
            icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
            title: 'text-amber-800',
            message: 'text-amber-700',
            progress: 'bg-amber-500'
          },
          info: {
            container: 'bg-blue-50 border-blue-300',
            icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
            title: 'text-blue-800',
            message: 'text-blue-700',
            progress: 'bg-blue-500'
          }
        }[toast.type]

        return (
          <div 
            key={toast.id}
            data-toast-id={toast.id}
            className={`${config.container} border rounded-lg shadow-lg p-5 pointer-events-auto relative overflow-hidden transform transition-all duration-300 animate-slide-in-right`}
            role="alert"
            onMouseEnter={() => handleMouseEnter(toast.id)}
            onMouseLeave={() => handleMouseLeave(toast.id, toast.duration || 3000)}
          >
            <div className="flex items-start gap-3">
              {config.icon}
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h3 className={`text-sm font-semibold ${config.title}`}>
                    {toast.title}
                  </h3>
                )}
                <p className={`text-sm ${config.message}`}>
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors pointer-events-auto"
                aria-label="Close toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Progress bar loader - animates from left to right */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 overflow-hidden">
              <div 
                className={`progress-bar h-full ${config.progress}`}
                style={{
                  width: '0%',
                  animation: `progress-${toast.id} ${(toast.duration || 3000)}ms linear forwards`
                }}
                data-paused="false"
              />
            </div>
            {/* Add keyframe for each toast to handle pause/resume */}
            <style>{`
              @keyframes progress-${toast.id} {
                from {
                  width: 0%;
                }
                to {
                  width: 100%;
                }
              }
              [data-toast-id="${toast.id}"] .progress-bar[data-paused="true"] {
                animation-play-state: paused !important;
              }
            `}</style>
          </div>
        )
      })}
    </div>
  )

  return { success, error, warning, info, ToastComponent }
}
