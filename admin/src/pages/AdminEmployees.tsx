import React, { useState, useEffect } from 'react';
import { Table, Form, Row, Col, Spinner, Alert, Button, Pagination, Modal, Badge } from 'react-bootstrap';
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit2,
  UserCheck,
  UserX,
  Key,
  ChevronLeft,
  ChevronRight,
  Filter,
  Shield,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  Lock,
  Camera,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/common/Avatar';
import PhotoUploadModal from '../components/common/PhotoUploadModal';
import ImagePreviewModal from '../components/common/ImagePreviewModal';

export default function AdminEmployees() {
  const { token, user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [role, setRole] = useState('All');

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUser, setPreviewUser] = useState<any>(null);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    joiningDate: '',
    role: 'employee',
    customEmployeeId: '',
    password: '',
    profilePhotoUrl: null as string | null
  });

  const fetchRecords = async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/employees?page=${pageNum}&limit=20`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (status !== 'All') url += `&status=${status}`;
      if (role !== 'All') url += `&role=${role}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();

      if (data.success) {
        setRecords(data.data.items);
        setPage(data.data.pagination.page);
        setTotalPages(data.data.pagination.totalPages || 1);
      } else {
        setError(data.error?.message || data.error || 'Failed to fetch employee list');
      }
    } catch (e: any) {
      setError(e.message || 'Network error fetching employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchRecords(1);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [search, status, role, token]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) fetchRecords(newPage);
  };

  const openAdd = () => {
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      joiningDate: '',
      role: 'employee',
      customEmployeeId: '',
      password: '',
      profilePhotoUrl: null
    });
    setShowForm(true);
  };

  const openEdit = (user: any) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      department: user.department || '',
      designation: user.designation || '',
      joiningDate: user.joiningDate
        ? (typeof user.joiningDate === 'string' && user.joiningDate.includes('T')
            ? user.joiningDate.split('T')[0]
            : String(user.joiningDate).slice(0, 10))
        : '',
      role: user.role,
      customEmployeeId: user.employeeId || user.employee_id || '',
      password: '',
      profilePhotoUrl: user.profilePhotoUrl || null
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setActionLoading(true);
    try {
      const method = selectedUser ? 'PATCH' : 'POST';
      const url = selectedUser
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/employees/${selectedUser.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/employees`;

      const payload: any = { ...formData };
      if (!payload.password) delete payload.password;
      if (!payload.customEmployeeId) delete payload.customEmployeeId;
      if (!payload.joiningDate) payload.joiningDate = null;

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        fetchRecords(page);
        if (!selectedUser && data.data?.tempPassword) {
          setTempPassword(data.data.tempPassword);
          setShowReset(true);
        }
      } else {
        alert(data.error?.message || data.error || 'Failed to save employee');
      }
    } catch (e) {
      alert('Network error while saving employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`Are you sure you want to mark ${user.name} as ${newStatus}?`)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/employees/${user.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) fetchRecords(page);
      else alert(data.error?.message || 'Failed to update status');
    } catch (e) {
      alert('Network error while updating status');
    }
  };

  const handleResetPassword = async (user: any) => {
    if (!window.confirm(`Reset password for ${user.name}?`)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/employees/${user.id}/reset-password`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTempPassword(data.data.tempPassword);
        setShowReset(true);
      } else alert(data.error?.message || 'Failed to reset password');
    } catch (e) {
      alert('Network error while resetting password');
    }
  };

  const handleDeleteEmployee = async (user: any) => {
    if (user.id === currentUser?.id) {
      alert('You cannot delete your own account.');
      return;
    }
    const confirmed = window.confirm(
      `⚠️ WARNING: Are you sure you want to completely delete "${user.name}" (${user.employeeId || user.employee_id || ''})?\n\nThis will PERMANENTLY remove all data belonging to this employee, including:\n• Attendance logs and check-in history\n• Leave applications and balances\n• Notifications and profile photo\n\nThis action CANNOT be undone. Do you wish to proceed?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/employees/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchRecords(page);
      } else {
        alert(data.error?.message || data.error || 'Failed to delete employee');
      }
    } catch (e) {
      alert('Network error while deleting employee');
    }
  };

  const openDetail = async (user: any) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/employees/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDetailData(data.data);
        setShowDetail(true);
      } else alert(data.error?.message || 'Failed to load employee details');
    } catch (e) {
      alert('Network error while fetching details');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="page-title">Employees Directory</h1>
          <p className="text-muted mb-0">Manage staff profiles, permissions, and status</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} />
            <span>Add New Employee</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card p-4 mb-4">
        <Row className="g-3 align-items-end">
          <Col md={5}>
            <Form.Group>
              <Form.Label className="d-flex align-items-center gap-2">
                <Search size={14} className="text-muted" />
                <span>Search Employee</span>
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Search by name, ID, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Form.Group>
          </Col>

          <Col md={3}>
            <Form.Group>
              <Form.Label className="d-flex align-items-center gap-2">
                <Filter size={14} className="text-muted" />
                <span>Status</span>
              </Form.Label>
              <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group>
              <Form.Label className="d-flex align-items-center gap-2">
                <Shield size={14} className="text-muted" />
                <span>Role</span>
              </Form.Label>
              <Form.Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="All">All Roles</option>
                <option value="employee">Employee</option>
                <option value="admin">Administrator</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          <span>{error}</span>
        </Alert>
      )}

      {/* Employees Table */}
      <div className="card p-0 overflow-hidden">
        {loading && records.length === 0 ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="text-muted mt-2" style={{ fontSize: '14px' }}>Loading employees...</div>
          </div>
        ) : (
          <>
            <div className="table-responsive" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee ID</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length > 0 ? (
                    records.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <Avatar
                              src={r.profilePhotoUrl}
                              name={r.name}
                              size={38}
                              shape="rounded"
                              showBorder
                              borderColor="rgba(226, 232, 240, 0.8)"
                              onClick={() => {
                                setPreviewUser(r);
                                setShowPreviewModal(true);
                              }}
                            />
                            <div>
                              <div className="fw-semibold text-dark" style={{ fontSize: '14.5px' }}>
                                {r.name}
                              </div>
                              <div className="text-muted" style={{ fontSize: '13px' }}>
                                {r.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-secondary font-monospace" style={{ fontSize: '12px' }}>
                            {r.employeeId || r.employee_id}
                          </span>
                        </td>
                        <td style={{ color: '#475569', fontSize: '13.5px' }}>
                          {r.department || 'General'}
                        </td>
                        <td>
                          <span className={`badge ${r.role === 'admin' ? 'bg-danger' : 'bg-info'}`}>
                            {r.role?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${r.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                            {r.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-2">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openDetail(r)}
                              title="View details"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEdit(r)}
                              title="Edit employee"
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              className={`btn btn-sm ${r.status === 'active' ? 'btn-outline-danger' : 'btn-success'}`}
                              onClick={() => handleToggleStatus(r)}
                              title={r.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              {r.status === 'active' ? <UserX size={13} /> : <UserCheck size={13} />}
                              <span>{r.status === 'active' ? 'Deactivate' : 'Activate'}</span>
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleResetPassword(r)}
                              title="Reset password"
                            >
                              <Key size={13} />
                              <span>Reset</span>
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleDeleteEmployee(r)}
                              disabled={r.id === currentUser?.id}
                              title={r.id === currentUser?.id ? 'Cannot delete yourself' : 'Delete employee completely'}
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted">
                        No employees found matching the filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="d-flex align-items-center justify-content-between p-3 border-top bg-white">
                <span className="text-muted" style={{ fontSize: '13px' }}>
                  Showing page {page} of {totalPages}
                </span>
                <Pagination className="mb-0">
                  <Pagination.Prev disabled={page === 1} onClick={() => handlePageChange(page - 1)}>
                    <ChevronLeft size={14} />
                  </Pagination.Prev>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && <Pagination.Ellipsis disabled />}
                        <Pagination.Item active={page === p} onClick={() => handlePageChange(p)}>
                          {p}
                        </Pagination.Item>
                      </React.Fragment>
                    ))}
                  <Pagination.Next disabled={page === totalPages} onClick={() => handlePageChange(page + 1)}>
                    <ChevronRight size={14} />
                  </Pagination.Next>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      <Modal show={showForm} onHide={() => setShowForm(false)} backdrop="static" centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{selectedUser ? 'Edit Employee Details' : 'Add New Employee'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Profile Photo Section */}
            <div className="p-3 mb-4 rounded-3 bg-light border d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-3">
                <Avatar
                  src={formData.profilePhotoUrl}
                  name={formData.name || 'Employee'}
                  size={60}
                  shape="circle"
                  showBorder
                  borderColor="#3B82F6"
                />
                <div>
                  <div className="fw-semibold text-dark" style={{ fontSize: '14px' }}>
                    Profile Photo
                  </div>
                  <div className="text-muted" style={{ fontSize: '12.5px' }}>
                    {formData.profilePhotoUrl ? 'Custom profile photo selected' : 'Initial avatar will be used if no photo uploaded'}
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1.5 px-3 rounded-pill"
                  onClick={() => setShowPhotoModal(true)}
                >
                  <Camera size={14} />
                  <span>{formData.profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
                {formData.profilePhotoUrl && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1.5 px-3 rounded-pill"
                    onClick={() => setFormData({ ...formData, profilePhotoUrl: null })}
                  >
                    <Trash2 size={14} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>

            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Jane Doe"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Employee ID / Username *</Form.Label>
                  <Form.Control
                    value={formData.customEmployeeId}
                    onChange={(e) => setFormData({ ...formData, customEmployeeId: e.target.value })}
                    disabled={!!selectedUser}
                    placeholder="e.g. EMP-101"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Email Address *</Form.Label>
                  <Form.Control
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!selectedUser}
                    placeholder="name@falconinfo.com"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Phone Number</Form.Label>
                  <Form.Control
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </Form.Group>
              </Col>
              {!selectedUser && (
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Initial Password (Optional)</Form.Label>
                    <Form.Control
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Leave blank to auto-generate a secure temporary password"
                    />
                  </Form.Group>
                </Col>
              )}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Department</Form.Label>
                  <Form.Control
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Engineering"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Designation</Form.Label>
                  <Form.Control
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Senior Software Engineer"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Joining Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>System Role</Form.Label>
                  <Form.Select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Administrator</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={actionLoading}>
            {actionLoading ? <Spinner size="sm" animation="border" /> : (selectedUser ? 'Save Changes' : 'Create Employee')}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Detail Modal */}
      <Modal show={showDetail} onHide={() => setShowDetail(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Employee Profile Overview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailData && (
            <Row className="g-4">
              <Col md={6}>
                <div className="p-3 rounded-3 bg-light border h-100">
                  <div className="d-flex align-items-center gap-3 pb-3 mb-3 border-bottom">
                    <Avatar
                      src={detailData.profile.profilePhotoUrl}
                      name={detailData.profile.name}
                      size={64}
                      shape="circle"
                      showBorder
                      borderColor="#3B82F6"
                      onClick={() => {
                        setPreviewUser(detailData.profile);
                        setShowPreviewModal(true);
                      }}
                      style={{ cursor: detailData.profile.profilePhotoUrl ? 'pointer' : 'default' }}
                    />
                    <div>
                      <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: '15.5px' }}>{detailData.profile.name}</h6>
                      <div className="text-muted font-monospace" style={{ fontSize: '12px' }}>{detailData.profile.employeeId}</div>
                      {detailData.profile.profilePhotoUrl && (
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-primary text-decoration-none mt-1"
                          style={{ fontSize: '12px' }}
                          onClick={() => {
                            setPreviewUser(detailData.profile);
                            setShowPreviewModal(true);
                          }}
                        >
                          <Eye size={12} className="me-1" />
                          <span>View Full Photo</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <h6 className="fw-bold mb-3 text-dark">Personal Information</h6>
                  <div className="d-flex flex-column gap-2" style={{ fontSize: '13.5px' }}>
                    <div><strong>Name:</strong> {detailData.profile.name}</div>
                    <div><strong>Employee ID:</strong> <span className="font-monospace">{detailData.profile.employeeId}</span></div>
                    <div><strong>Email:</strong> {detailData.profile.email}</div>
                    <div><strong>Phone:</strong> {detailData.profile.phone || '-'}</div>
                    <div><strong>Department:</strong> {detailData.profile.department || '-'}</div>
                    <div><strong>Designation:</strong> {detailData.profile.designation || '-'}</div>
                    <div><strong>Role:</strong> <span className="badge bg-info">{detailData.profile.role?.toUpperCase()}</span></div>
                    <div><strong>Status:</strong> <span className="badge bg-success">{detailData.profile.status?.toUpperCase()}</span></div>
                  </div>
                </div>
              </Col>

              <Col md={6}>
                <div className="d-flex flex-column gap-3">
                  <div className="p-3 rounded-3 bg-light border">
                    <h6 className="fw-bold mb-2 text-dark">Attendance Summary</h6>
                    <div className="d-flex justify-content-between" style={{ fontSize: '13px' }}>
                      <span className="text-success">Present: {detailData.attendanceSummary.present}</span>
                      <span className="text-danger">Absent: {detailData.attendanceSummary.absent}</span>
                      <span className="text-warning">Late: {detailData.attendanceSummary.late}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-3 bg-light border">
                    <h6 className="fw-bold mb-2 text-dark">Leave Overview</h6>
                    <div className="d-flex justify-content-between mb-2" style={{ fontSize: '13px' }}>
                      <span>Approved: <strong>{detailData.leaveSummary.approved}</strong></span>
                      <span>Pending: <strong>{detailData.leaveSummary.pending}</strong></span>
                    </div>
                    {detailData.leaveBalances ? (
                      <div className="pt-2 border-top" style={{ fontSize: '12.5px' }}>
                        <div>Current Balance: <strong>{detailData.leaveBalances.currentBalance} days</strong></div>
                        <div>Used Paid: {detailData.leaveBalances.usedPaidLeave} | LWP: {detailData.leaveBalances.leaveWithoutPay}</div>
                      </div>
                    ) : (
                      <div className="text-muted small">No leave record initialized.</div>
                    )}
                  </div>
                </div>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <button
            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1.5"
            onClick={() => {
              setShowDetail(false);
              handleDeleteEmployee(detailData.profile);
            }}
            disabled={detailData?.profile?.id === currentUser?.id}
            title={detailData?.profile?.id === currentUser?.id ? 'Cannot delete yourself' : 'Delete employee completely'}
          >
            <Trash2 size={14} />
            <span>Delete Employee</span>
          </button>
          <button className="btn btn-secondary" onClick={() => setShowDetail(false)}>
            Close
          </button>
        </Modal.Footer>
      </Modal>

      {/* Reset Password Modal */}
      <Modal show={showReset} onHide={() => setShowReset(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Temporary Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="success">Password generated successfully!</Alert>
          <p className="text-muted" style={{ fontSize: '14px' }}>
            Please share this temporary password with the employee securely:
          </p>
          <div className="p-3 rounded-3 bg-light border text-center font-monospace fs-4 fw-bold text-primary">
            {tempPassword}
          </div>
          <p className="text-muted small mt-3 mb-0">
            The employee can change their password anytime via the Falcon Office mobile app.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-primary" onClick={() => setShowReset(false)}>
            Done
          </button>
        </Modal.Footer>
      </Modal>

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        show={showPhotoModal}
        onHide={() => setShowPhotoModal(false)}
        currentPhotoUrl={formData.profilePhotoUrl}
        userName={formData.name || 'Employee'}
        uploadUrl={selectedUser ? `/api/admin/employees/${selectedUser.id}/photo` : `/api/admin/upload-photo`}
        deleteUrl={selectedUser ? `/api/admin/employees/${selectedUser.id}/photo` : undefined}
        token={token}
        onSaveSuccess={(newUrl) => {
          setFormData((prev) => ({ ...prev, profilePhotoUrl: newUrl }));
          if (selectedUser) {
            fetchRecords(page);
          }
        }}
      />

      {/* Full Size Image Preview Modal */}
      <ImagePreviewModal
        show={showPreviewModal}
        onHide={() => setShowPreviewModal(false)}
        src={previewUser?.profilePhotoUrl}
        name={previewUser?.name}
        employeeId={previewUser?.employeeId || previewUser?.employee_id}
        role={previewUser?.role}
        department={previewUser?.department}
      />
    </div>
  );
}
