import React, { useCallback } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { UploadCloud, FileText, CheckCircle2, X } from 'lucide-react';
import { clsx } from 'clsx';

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile?: File | null;
  onClear?: () => void;
  accept?: DropzoneOptions['accept'];
  maxSizeMB?: number;
  label?: string;
  helperText?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  selectedFile,
  onClear,
  accept = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'image/*': ['.png', '.jpg', '.jpeg', '.svg']
  },
  maxSizeMB = 25,
  label,
  helperText,
  description,
  disabled = false,
  className
}) => {
  const displayHelper = description || helperText;
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: false,
    disabled
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={clsx(
            'border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center',
            isDragActive && !isDragReject && 'border-brand-500 bg-brand-500/10 scale-[1.01]',
            isDragReject && 'border-rose-500 bg-rose-500/10',
            !isDragActive && 'border-surface-border hover:border-surface-borderLight bg-surface-2/40 hover:bg-surface-2/80',
            disabled && 'opacity-50 cursor-not-allowed bg-surface-3'
          )}
        >
          <input {...getInputProps()} />
          <div className="w-12 h-12 rounded-xl bg-surface-2 shadow-sm border border-surface-border flex items-center justify-center text-slate-400 mb-3">
            <UploadCloud className="w-6 h-6 text-brand-400" />
          </div>
          <p className="text-sm font-semibold text-slate-200">
            {isDragActive ? 'Drop file here to upload' : 'Click to upload or drag & drop'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {displayHelper || `PDF, DOCX, TXT, or PNG (up to ${maxSizeMB}MB)`}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-surface-border bg-surface-2 p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-brand-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{selectedFile.name}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                <span>{formatFileSize(selectedFile.size)}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for upload
                </span>
              </div>
            </div>
          </div>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
