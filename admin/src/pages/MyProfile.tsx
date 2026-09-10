import React, { useState } from 'react';
import { Camera, ShieldCheck, Mail, Phone, Briefcase, Eye, CheckCircle2, User as UserIcon, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/common/Avatar';
import PhotoUploadModal from '../components/common/PhotoUploadModal';
import ImagePreviewModal from '../components/common/ImagePreviewModal';

export default function MyProfile() {
  const { user, token, updateUser } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const photoUrl = user?.profilePhotoUrl || user?.profile_photo_url || null;

  const handlePhotoSuccess = (newUrl: string | null) => {
    updateUser({
      profilePhotoUrl: newUrl || undefined,
      profile_photo_url: newUrl || undefined,
    });
    setSuccessMessage(newUrl ? 'Profile photo updated successfully!' : 'Profile photo removed.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="page-title">My Profile</h1>
        <p className="text-muted mb-0">Manage your personal details, profile picture, and account settings</p>
      </div>

      {successMessage && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2.5 px-3 mb-4 rounded-3 shadow-sm" style={{ fontSize: '13.5px' }}>
          <CheckCircle2 size={16} className="text-success flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="row g-4">
        {/* Left Column: Avatar & Quick Info Card */}
        <div className="col-lg-4">
          <div className="card text-center p-4 border-0 shadow-sm" style={{ borderRadius: '20px' }}>
            {/* Avatar with Camera Overlay */}
            <div className="d-flex justify-content-center mb-3">
              <div className="position-relative d-inline-block">
                <Avatar
                  src={photoUrl}
                  name={user?.name}
                  size={110}
                  shape="circle"
                  showBorder
                  borderColor="#3B82F6"
                  onClick={() => photoUrl && setShowPreviewModal(true)}
                  style={{
                    boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.25)',
                    cursor: photoUrl ? 'pointer' : 'default',
                  }}
                />
                <button
                  className="btn btn-primary rounded-circle position-absolute bottom-0 end-0 p-0 d-flex align-items-center justify-content-center shadow"
                  style={{
                    width: '36px',
                    height: '36px',
                    border: '3px solid #FFFFFF',
                    transform: 'translate(4px, 4px)',
                  }}
                  onClick={() => setShowUploadModal(true)}
                  title="Upload / Change Photo"
                >
                  <Camera size={16} />
                </button>
              </div>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px 0', color: '#0F172A' }}>
              {user?.name || 'User'}
            </h2>
            <p className="text-muted mb-3" style={{ fontSize: '13.5px' }}>
              {user?.email}
            </p>

            <div className="d-flex justify-content-center gap-2 mb-3">
              <span className="badge" style={{ backgroundColor: '#EFF6FF', color: '#2563EB', fontSize: '11px', fontWeight: 600, padding: '5px 10px' }}>
                {user?.role?.toUpperCase() || 'EMPLOYEE'}
              </span>
              <span className="badge" style={{ backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '11px', fontWeight: 600, padding: '5px 10px' }}>
                ACTIVE
              </span>
            </div>

            <div className="d-flex flex-column gap-2 pt-2 border-top">
              <button
                className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-center gap-2 rounded-pill py-2"
                onClick={() => setShowUploadModal(true)}
              >
                <Camera size={15} />
                <span>{photoUrl ? 'Change Profile Picture' : 'Upload Profile Picture'}</span>
              </button>

              {photoUrl && (
                <button
                  className="btn btn-light btn-sm d-flex align-items-center justify-content-center gap-2 rounded-pill py-2 text-muted"
                  onClick={() => setShowPreviewModal(true)}
                >
                  <Eye size={15} />
                  <span>Preview Full Photo</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Account Details */}
        <div className="col-lg-8">
          <div className="card p-4 border-0 shadow-sm h-100" style={{ borderRadius: '20px' }}>
            <div className="d-flex align-items-center gap-2 pb-3 mb-3 border-bottom">
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserIcon size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Employment & Identity
                </h3>
                <span className="text-muted" style={{ fontSize: '12.5px' }}>Official enterprise records</span>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-sm-6">
                <label className="form-label text-muted mb-1" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Full Legal Name
                </label>
                <div className="p-2.5 px-3 rounded-3 bg-light border fw-semibold text-dark" style={{ fontSize: '14px' }}>
                  {user?.name || '-'}
                </div>
              </div>

              <div className="col-sm-6">
                <label className="form-label text-muted mb-1" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Employee ID
                </label>
                <div className="p-2.5 px-3 rounded-3 bg-light border font-monospace fw-bold text-primary" style={{ fontSize: '14px' }}>
                  {user?.employee_id || '-'}
                </div>
              </div>

              <div className="col-sm-6">
                <label className="form-label text-muted mb-1" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Work Email
                </label>
                <div className="p-2.5 px-3 rounded-3 bg-light border text-dark" style={{ fontSize: '14px' }}>
                  {user?.email || '-'}
                </div>
              </div>

              <div className="col-sm-6">
                <label className="form-label text-muted mb-1" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Contact Phone
                </label>
                <div className="p-2.5 px-3 rounded-3 bg-light border text-dark" style={{ fontSize: '14px' }}>
                  {user?.phone || 'Not configured'}
                </div>
              </div>

              <div className="col-sm-6">
                <label className="form-label text-muted mb-1" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Department
                </label>
                <div className="p-2.5 px-3 rounded-3 bg-light border text-dark" style={{ fontSize: '14px' }}>
                  {user?.department || 'General Administration'}
                </div>
              </div>

              <div className="col-sm-6">
                <label className="form-label text-muted mb-1" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Designation / Role
                </label>
                <div className="p-2.5 px-3 rounded-3 bg-light border text-capitalize text-dark" style={{ fontSize: '14px' }}>
                  {user?.designation || user?.role || 'Staff Member'}
                </div>
              </div>
            </div>

            <hr className="my-4" style={{ borderColor: '#F1F5F9' }} />

            <div className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="d-flex align-items-center gap-3">
                <ShieldCheck size={24} className="text-primary flex-shrink-0" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#0F172A' }}>Account Security & Credentials</div>
                  <div className="text-muted" style={{ fontSize: '12px' }}>
                    Password changes and biometric authentication are verified on your official Falcon Office client.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        show={showUploadModal}
        onHide={() => setShowUploadModal(false)}
        currentPhotoUrl={photoUrl}
        userName={user?.name}
        uploadUrl="/api/profile/photo"
        deleteUrl="/api/profile/photo"
        token={token}
        onSaveSuccess={handlePhotoSuccess}
      />

      {/* Full Size Preview Modal */}
      <ImagePreviewModal
        show={showPreviewModal}
        onHide={() => setShowPreviewModal(false)}
        src={photoUrl}
        name={user?.name}
        employeeId={user?.employee_id}
        role={user?.role}
        department={user?.department}
      />
    </div>
  );
}
