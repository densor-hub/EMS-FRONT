'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  contentClassName?: string;
  height? : string
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'sm',
  className,
  contentClassName,
  height
}: ModalProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-[95vw] w-[95vw]', 
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent 
        onPointerDownOutside={(e) => e.preventDefault()} 
        className={`
          ${sizeClasses[size]} 
          ${contentClassName || ''} 
          bg-card border-border
          ${className || ''}
          flex flex-col max-h-[80vh]
        `}
        style={{ 
          width: size === 'full' ? '95vw' : 'auto',
          maxWidth: '1000px',
          minWidth:"380px",
          maxHeight: '80vh',
          minHeight: height
        }}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-foreground text-sm md:text-xl">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-muted-foreground">{description}</DialogDescription>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-2 px-1">
          {children}
        </div>
        
        {footer && <DialogFooter className="flex-shrink-0">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-muted-foreground">{message}</p>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'destructive' ? 'destructive' : 'default'}
          onClick={() => {
            onConfirm();
            onClose();
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}