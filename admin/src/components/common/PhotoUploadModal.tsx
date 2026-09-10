import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Modal, Spinner, Alert } from 'react-bootstrap';
import { UploadCloud, Image as ImageIcon, Trash2, Check, X, Camera, AlertCircle } from 'lucide-react';
import Avatar from './Avatar';

interface PhotoUploadModalProps {
  show: boolean;
  onHide: () => void;
  currentPhotoUrl?: string | null;
  userName?: string;
  onSaveSuccess: (newPhotoUrl: string | null) => void;
  // If uploadUrl is provided, it calls the endpoint directly with FormData.
  // Example: `/api/admin/employees/5/photo` or `/api/profile/photo` or `/api/admin/upload-photo`
  uploadUrl?: string;
  // Optional deleteUrl, e.g., `/api/admin/employees/5/photo` or `/api/profile/photo`
  deleteUrl?: string;
  token?: string | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function PhotoUploadModal({
  show,
  onHide,
  currentPhotoUrl,
  userName = 'Employee',
  onSaveSuccess,
  uploadUrl,
  deleteUrl,
  token,
}: PhotoUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    setIsDragging(false);
  };

  const handleClose = () => {
    resetState();
    onHide();
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setError('Unsupported file type. Please upload a JPG, JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller photo.`);
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile && !previewUrl) return;

    if (!uploadUrl) {
      // If no endpoint provided, we pass the local preview or file
      onSaveSuccess(previewUrl);
      handleClose();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('photo', selectedFile);
      }

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const targetUrl = uploadUrl.startsWith('http') ? uploadUrl : `${baseUrl}${uploadUrl.startsWith('/') ? '' : '/'}${uploadUrl}`;

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        const newUrl = data.data?.profilePhotoUrl || data.data?.url;
        onSaveSuccess(newUrl);
        handleClose();
      } else {
        setError(data.error?.message || data.error || 'Failed to upload image');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while uploading photo');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove this profile photo?')) return;

    if (deleteUrl) {
      setLoading(true);
      setError(null);
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const targetUrl = deleteUrl.startsWith('http') ? deleteUrl : `${baseUrl}${deleteUrl.startsWith('/') ? '' : '/'}${deleteUrl}`;

        const res = await fetch(targetUrl, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        const data = await res.json();
        if (data.success) {
          onSaveSuccess(null);
          handleClose();
        } else {
          setError(data.error?.message || data.error || 'Failed to remove photo');
        }
      } catch (err: any) {
        setError(err.message || 'Network error while removing photo');
      } finally {
        setLoading(false);
      }
    } else {
      onSaveSuccess(null);
      handleClose();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fs-5 fw-bold text-dark d-flex align-items-center gap-2">
          <Camera size={20} className="text-primary" />
          <span>Update Profile Photo</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-3">
        {error && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 py-2 mb-3">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span style={{ fontSize: '13px' }}>{error}</span>
          </Alert>
        )}

        {/* Current / Preview Avatar Row */}
        <div className="text-center mb-4">
          <div className="d-inline-flex position-relative">
            <Avatar
              src={previewUrl || currentPhotoUrl}
              name={userName}
              size={110}
              shape="circle"
              showBorder
              borderColor="#3B82F6"
              style={{
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.2)',
              }}
            />
            {previewUrl && (
              <button
                className="btn btn-sm btn-danger position-absolute top-0 end-0 rounded-circle p-1 d-flex align-items-center justify-content-center"
                style={{ width: '26px', height: '26px', transform: 'translate(25%, -25%)' }}
                onClick={() => {
                  setSelectedFile(null);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
                title="Discard selected image"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="mt-2 text-muted" style={{ fontSize: '13px' }}>
            {previewUrl ? 'New Photo Preview (Auto-cropped to 1:1 square)' : userName}
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#2563EB' : '#CBD5E1'}`,
            backgroundColor: isDragging ? '#EFF6FF' : '#F8FAFC',
            borderRadius: '16px',
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />
          <div className="d-flex justify-content-center mb-2">
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDragging ? '#DBEAFE' : '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UploadCloud size={24} />
            </div>
          </div>
          <div className="fw-semibold text-dark" style={{ fontSize: '14.5px' }}>
            Click to upload or drag and drop
          </div>
          <p className="text-muted mb-0 mt-1" style={{ fontSize: '12.5px' }}>
            JPG, JPEG, PNG, or WebP (max. 5 MB)
          </p>
        </div>

        <div className="mt-3 p-2.5 rounded-3 bg-light border text-muted" style={{ fontSize: '12px', lineHeight: 1.4 }}>
          Photos are automatically squared, optimized, and compressed to high-efficiency WebP for fastest loading across lists and dashboards.
        </div>
      </Modal.Body>

      <Modal.Footer className="border-0 pt-0 d-flex justify-content-between">
        <div>
          {currentPhotoUrl && (
            <button
              className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1.5"
              onClick={handleRemovePhoto}
              disabled={loading}
            >
              <Trash2 size={14} />
              <span>Remove Photo</span>
            </button>
          )}
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm d-flex align-items-center gap-1.5 px-3"
            onClick={handleUpload}
            disabled={loading || !selectedFile}
          >
            {loading ? (
              <>
                <Spinner size="sm" animation="border" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Check size={15} />
                <span>Save Photo</span>
              </>
            )}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
