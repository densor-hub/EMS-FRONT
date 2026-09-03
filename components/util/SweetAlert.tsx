'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/dashboard/modal';
// import { motion, AnimatePresence } from 'framer-motion';
// import {
//   CheckCircleIcon,
//   XCircleIcon,
//   ExclamationTriangleIcon,
//   InformationCircleIcon,
//   QuestionMarkCircleIcon,
//   XMarkIcon,
// } from '@heroicons/react/24/solid';
import { CheckCircle, XCircle, InfoIcon, MailQuestionIcon, FileQuestionIcon, X, TriangleAlertIcon, AlertCircleIcon } from 'lucide-react';
// import { SweetAlertProps, AlertType } from './SweetAlert.types';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'question';

export interface SweetAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title?: string;
  message?: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  showCancelButton?: boolean;
  confirmButtonColor?: string;
  cancelButtonColor?: string;
  icon?: React.ReactNode;
  customContent?: React.ReactNode;
  showCloseButton?: boolean;
  allowOutsideClick?: boolean;
  timer?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function SweetAlert({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  message = '',
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancelButton = true,
  confirmButtonColor,
  cancelButtonColor,
  icon: customIcon,
  customContent,
  showCloseButton = true,
  allowOutsideClick = true,
  timer,
  size = 'md',
}: SweetAlertProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (timer && isOpen) {
      const timeout = setTimeout(() => {
        handleClose();
      }, timer);

      return () => clearTimeout(timeout);
    }
  }, [timer, isOpen]);

  const getIcon = () => {
    if (customIcon) return customIcon;

    const iconProps = {
      className: 'w-16 h-16',
    };

    switch (type) {
      case 'success':
        return <CheckCircle {...iconProps} className={`${iconProps.className} text-green-500`} />;
      case 'error':
        return <XCircle {...iconProps} className={`${iconProps.className} text-red-500`} />;
      case 'warning':
        return <TriangleAlertIcon {...iconProps} className={`${iconProps.className} text-amber-500`} />;
      case 'question':
        return <AlertCircleIcon {...iconProps} className={`${iconProps.className} text-blue-500`} />;
      default:
        return <InfoIcon {...iconProps} className={`${iconProps.className} text-blue-500`} />;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'max-w-sm';
      case 'lg':
        return 'max-w-lg';
      case 'xl':
        return 'max-w-xl';
      default:
        return 'max-w-md';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'success':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'error':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'border-amber-500 bg-amber-50 dark:bg-amber-900/20';
      case 'info':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'question':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getConfirmButtonColor = () => {
    if (confirmButtonColor) return confirmButtonColor;

    switch (type) {
      case 'success':
        return 'bg-green-500 hover:bg-green-600 focus:ring-green-400';
      case 'error':
        return 'bg-red-500 hover:bg-red-600 focus:ring-red-400';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400';
      default:
        return 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-400';
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    handleClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    handleClose();
  };

  const handleOutsideClick = () => {
    if (allowOutsideClick) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        description={""}
        size="xl"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleOutsideClick}
      />

      {/* Modal - Pure CSS Animation */}
      <div
        className={`relative w-full ${getSizeClasses()} transform rounded-2xl border-2 ${getTypeColor()} bg-white p-6 shadow-2xl transition-all duration-300 dark:bg-gray-800 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {showCloseButton && (
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        )}

        {/* Icon */}
        <div className="flex justify-center">{getIcon()}</div>

        {/* Custom Content or Default */}
        {customContent ? (
          <div className="mt-4">{customContent}</div>
        ) : (
          <>
            {/* Title */}
            {title && (
              <h2 className="mt-4 text-center text-2xl font-bold text-gray-900 dark:text-white">
                {title}
              </h2>
            )}

            {/* Message */}
            {message && (
              <p className="mt-2 text-center text-gray-600 dark:text-gray-300">
                {message}
              </p>
            )}
          </>
        )}

        {/* Buttons */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          {showCancelButton && (
            <button
              onClick={handleCancel}
              className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                cancelButtonColor ||
                'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {cancelText}
            </button>
          )}

          <button
            onClick={handleConfirm}
            className={`rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${getConfirmButtonColor()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
    // <AnimatePresence>
    //   {isVisible && (
    //     <>
    //       {/* Backdrop */}
    //       <motion.div
    //         initial={{ opacity: 0 }}
    //         animate={{ opacity: 1 }}
    //         exit={{ opacity: 0 }}
    //         transition={{ duration: 0.2 }}
    //         className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
    //         onClick={handleOutsideClick}
    //       />

    //       {/* Modal */}
    //       <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    //         <motion.div
    //           initial={{ scale: 0.8, opacity: 0, y: 20 }}
    //           animate={{ scale: 1, opacity: 1, y: 0 }}
    //           exit={{ scale: 0.8, opacity: 0, y: 20 }}
    //           transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    //           className={`relative w-full ${getSizeClasses()} rounded-2xl border-2 ${getTypeColor()} bg-white p-6 shadow-2xl dark:bg-gray-800`}
    //           onClick={(e: any) => e.stopPropagation()}
    //         >
    //           {/* Close Button */}
    //           {showCloseButton && (
    //             <button
    //               onClick={handleClose}
    //               className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
    //             >
    //               <XCircle className="h-6 w-6" />
    //             </button>
    //           )}

    //           {/* Icon */}
    //           <div className="flex justify-center">{getIcon()}</div>

    //           {/* Custom Content or Default */}
    //           {customContent ? (
    //             <div className="mt-4">{customContent}</div>
    //           ) : (
    //             <>
    //               {/* Title */}
    //               {title && (
    //                 <h2 className="mt-4 text-center text-2xl font-bold text-gray-900 dark:text-white">
    //                   {title}
    //                 </h2>
    //               )}

    //               {/* Message */}
    //               {message && (
    //                 <p className="mt-2 text-center text-gray-600 dark:text-gray-300">
    //                   {message}
    //                 </p>
    //               )}
    //             </>
    //           )}

    //           {/* Buttons */}
    //           <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
    //             {showCancelButton && (
    //               <button
    //                 onClick={handleCancel}
    //                 className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
    //                   cancelButtonColor || 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
    //                 }`}
    //               >
    //                 {cancelText}
    //               </button>
    //             )}

    //             <button
    //               onClick={handleConfirm}
    //               className={`rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${getConfirmButtonColor()}`}
    //             >
    //               {confirmText}
    //             </button>
    //           </div>
    //         </motion.div>
    //       </div>
    //     </>
    //   )}
    // </AnimatePresence>
  );
}