

import React, { useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { extractVectorsFromText } from '../services/geminiService';

interface AttackMapUploaderProps {
  onFileUpload: (fileName: string, content: string, vectors: string[]) => void;
  onFileClear: () => void;
  uploadedFileName: string | null;
  isLoading: boolean;
  variant?: 'default' | 'inline';
}

export const AttackMapUploader: React.FC<AttackMapUploaderProps> = ({ onFileUpload, onFileClear, uploadedFileName, isLoading, variant = 'default' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        const extractedVectors = await extractVectorsFromText(content);
        onFileUpload(file.name, content, extractedVectors);
      };
      reader.readAsText(file);
       // Reset the input value to allow re-uploading the same file
       if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  if (variant === 'inline') {
    return (
      <div className="flex items-center w-full h-9">
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".txt,.md,text/plain"
            disabled={isLoading}
        />
        {uploadedFileName ? (
            <div className="flex items-center justify-between w-full bg-surface p-2 rounded-md border border-border h-full text-xs animate-fade-in">
                <p className="font-semibold text-text-primary truncate" title={uploadedFileName}>{uploadedFileName}</p>
                <button
                    onClick={onFileClear}
                    disabled={isLoading}
                    className="p-1 text-text-secondary hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-2"
                    title="Clear uploaded file"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
        ) : (
             <button
                onClick={triggerFileSelect}
                disabled={isLoading}
                className="w-full h-full flex items-center justify-center gap-1.5 text-xs font-semibold rounded-md border-2 border-dashed border-border hover:border-accent-primary hover:text-accent-primary text-text-secondary disabled:border-border disabled:text-text-secondary disabled:cursor-not-allowed transition-colors"
             >
                <UploadIcon className="w-4 h-4" />
                <span>Upload Map</span>
            </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card p-4 rounded-lg border border-border">
      <h2 className="text-xl font-semibold text-text-primary mb-2">Upload Supporting Documents (Optional)</h2>
      <p className="text-sm text-text-secondary mb-4">
        Upload a text file (.txt, .md) with internal reports or threat intel to enrich the analysis and improve accuracy.
      </p>

      {uploadedFileName ? (
        <div className="bg-surface p-3 rounded-md border border-border flex justify-between items-center animate-fade-in">
          <p className="text-sm font-semibold text-text-primary truncate" title={uploadedFileName}>
            {uploadedFileName}
          </p>
          <button
            onClick={onFileClear}
            disabled={isLoading}
            className="p-1.5 text-text-secondary hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Clear uploaded file"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".txt,.md,text/plain"
            disabled={isLoading}
          />
          <button
            onClick={triggerFileSelect}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-2.5 text-base font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card focus:ring-accent-primary border-2 border-dashed border-border hover:border-accent-primary hover:text-accent-primary text-text-secondary disabled:border-border disabled:text-text-secondary disabled:cursor-not-allowed"
          >
            <UploadIcon className="w-5 h-5" />
            Upload Document
          </button>
        </>
      )}
    </div>
  );
};