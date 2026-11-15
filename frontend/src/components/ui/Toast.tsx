import React from 'react';
import { Toaster as HotToaster } from 'react-hot-toast';

export const ToastProvider: React.FC = () => {
  return (
    <HotToaster
      position="top-right"
      gutter={8}
      toastOptions={{
        duration: 3500,
        className: 'text-sm font-medium',
        style: {
          background: '#102a43',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '0 10px 25px -5px rgba(16, 42, 67, 0.25)',
          border: '1px solid #243b53',
          fontSize: '13px'
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#ffffff'
          }
        },
        error: {
          iconTheme: {
            primary: '#f43f5e',
            secondary: '#ffffff'
          }
        }
      }}
    />
  );
};
