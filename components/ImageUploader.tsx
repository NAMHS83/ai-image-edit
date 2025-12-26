
import React, { useState, useCallback } from 'react';

interface ImageUploaderProps {
  onUpload: (base64: string) => void;
  label?: string;
  className?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload, label, className }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onUpload(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div 
      className={`relative group ${className}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <input 
        type="file" 
        id="file-upload" 
        className="hidden" 
        accept="image/*"
        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
      />
      <label 
        htmlFor="file-upload"
        className={`flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed rounded-3xl cursor-pointer transition-all ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-900/20' 
            : 'border-zinc-700 bg-zinc-900/50 hover:border-indigo-500 hover:bg-zinc-800'
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg className="w-12 h-12 mb-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mb-2 text-sm text-zinc-200 font-semibold">{label || '클릭하거나 드래그하여 이미지 업로드'}</p>
          <p className="text-xs text-zinc-500">PNG, JPG (최대 10MB)</p>
        </div>
      </label>
    </div>
  );
};

export default ImageUploader;