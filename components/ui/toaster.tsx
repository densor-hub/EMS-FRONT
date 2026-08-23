'use client'

import { useToast } from '@/hooks/use-toast'
// import { useViewport } from '@/hooks/use-viewport'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'
import { useEffect } from 'react'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  useEffect(() => {
    if (toasts.length > 0) {
      setTimeout(() => {
        toasts.forEach(element => {
        dismiss(element?.id)
      });
      }, 2500)
    }
  }, [toasts])
  return (
    <ToastProvider duration={2500} >
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      {/* <ToastViewport style={{position:"fixed", top: `Calc(100vh - ${viewportHeight})px`}}/> */}
      <ToastViewport style={{position:"fixed", top: 0}}/>
    </ToastProvider>
  )
}
