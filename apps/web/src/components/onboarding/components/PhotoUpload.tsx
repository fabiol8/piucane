'use client';

import { useState, useRef } from 'react';
import { Button } from '@piucane/ui';
import Image from 'next/image';

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export default function PhotoUpload({ photos, onPhotosChange, maxPhotos = 3 }: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    const filesToProcess = files.slice(0, remainingSlots);

    setIsUploading(true);

    try {
      const uploadPromises = filesToProcess.map(async (file) => {
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);

        // In production, upload to Firebase Storage or similar
        // For now, we'll use the preview URL
        return previewUrl;
      });

      const newPhotoUrls = await Promise.all(uploadPromises);
      onPhotosChange([...photos, ...newPhotoUrls]);
    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Foto del tuo cane
        </h3>
        <p className="text-sm text-gray-600">
          Aggiungi fino a {maxPhotos} foto per personalizzare il profilo
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <div key={index} className="relative group">
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={photo}
                alt={`Foto cane ${index + 1}`}
                width={200}
                height={200}
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => removePhoto(index)}
              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={isUploading}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex flex-col items-center justify-center text-gray-500 hover:text-gray-600 transition-colors"
          >
            {isUploading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-2"></div>
                <span className="text-xs">Caricamento...</span>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-2xl mb-1">📸</div>
                <span className="text-xs">Aggiungi foto</span>
              </div>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {photos.length === 0 && (
        <div className="text-center">
          <Button
            type="button"
            variant="secondary"
            onClick={triggerFileInput}
            disabled={isUploading}
            data-cta-id="onboarding.photo_upload.select.click"
          >
            📷 Seleziona foto
          </Button>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        Le foto aiutano i nostri esperti a dare consigli più personalizzati
      </div>
    </div>
  );
}