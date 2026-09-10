import React from 'react';
import { Modal } from 'react-bootstrap';
import { X, Download, User as UserIcon } from 'lucide-react';
import Avatar from './Avatar';

interface ImagePreviewModalProps {
  show: boolean;
  onHide: () => void;
  src?: string | null;
  name?: string;
  employeeId?: string;
  role?: string;
  department?: string;
}

export default function ImagePreviewModal({
  show,
  onHide,
  src,
  name,
  employeeId,
  role,
  department,
}: ImagePreviewModalProps) {
  const getFullUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const fullUrl = getFullUrl(src);

  const handleDownload = () => {
    if (!fullUrl) return;
    const a = document.createElement('a');
    a.href = fullUrl;
    a.download = `${name ? name.replace(/\s+/g, '_') : 'profile'}_photo.webp`;
    target: '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      dialogClassName="modal-dialog-centered"
      contentClassName="border-0 shadow-2xl rounded-4 overflow-hidden"
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.65)' }}
    >
      <div style={{ backgroundColor: '#0B0F19', color: '#FFFFFF' }} className="p-4">
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-2">
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60A5FA',
              }}
            >
              <UserIcon size={16} />
            </div>
            <div>
              <h6 className="mb-0 text-white fw-bold" style={{ fontSize: '15px' }}>{name || 'Profile Picture'}</h6>
              <span className="text-muted" style={{ fontSize: '12px' }}>
                {employeeId ? `ID: ${employeeId}` : ''} {department ? `• ${department}` : ''}
              </span>
            </div>
          </div>
          <button
            onClick={onHide}
            className="btn btn-sm btn-link text-white-50 p-1 hover:text-white"
            style={{ textDecoration: 'none' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Image Container */}
        <div
          className="d-flex align-items-center justify-content-center p-3 rounded-4 mb-3"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            minHeight: '280px',
          }}
        >
          {fullUrl ? (
            <img
              src={fullUrl}
              alt={name || 'Profile Photo'}
              className="rounded-4 shadow-lg"
              style={{
                maxWidth: '100%',
                maxHeight: '340px',
                objectFit: 'contain',
                border: '2px solid rgba(255, 255, 255, 0.12)',
              }}
            />
          ) : (
            <div className="text-center py-4">
              <Avatar name={name} size={110} />
              <div className="text-muted mt-3" style={{ fontSize: '13.5px' }}>
                No custom photo uploaded yet
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="d-flex align-items-center justify-content-between pt-1">
          <div>
            {role && (
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93C5FD', fontSize: '11px' }}>
                {role.toUpperCase()}
              </span>
            )}
          </div>
          <div className="d-flex gap-2">
            {fullUrl && (
              <button
                className="btn btn-sm btn-outline-light d-flex align-items-center gap-1.5 px-3 rounded-pill"
                onClick={handleDownload}
              >
                <Download size={14} />
                <span>Download</span>
              </button>
            )}
            <button
              className="btn btn-sm btn-primary px-3 rounded-pill"
              onClick={onHide}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
