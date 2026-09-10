import React, { useEffect, useState } from 'react';
import { Form, Modal, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import {
  CalendarRange,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MyLeave() {
  const { token } = useAuth();
  const [balances, setBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    total_days: 1,
    reason: ''
  });
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  const fetchData = async () => {
    try {
      const [balRes, reqRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/employee/leave-balances`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/employee/leave-requests`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setBalances(balRes.data);
      setRequests(reqRes.data);
    } catch (err) {
      console.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/employee/leave-requests`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowApply(false);
      setAlert({ show: true, message: 'Leave request submitted successfully.', variant: 'success' });
      setFormData({ leave_type_id: '', start_date: '', end_date: '', total_days: 1, reason: '' });
      fetchData();
    } catch (err: any) {
      setAlert({
        show: true,
        message: err.response?.data?.error?.message || err.response?.data?.error || 'Failed to submit leave request.',
        variant: 'danger'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="page-title">My Leaves</h1>
          <p className="text-muted mb-0">Track your available leave balance and submit time-off applications</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => setShowApply(true)}>
            <Plus size={16} />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {alert.show && (
        <Alert
          variant={alert.variant}
          dismissible
          onClose={() => setAlert({ ...alert, show: false })}
          className="mb-4 d-flex align-items-center gap-2"
        >
          {alert.variant === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{alert.message}</span>
        </Alert>
      )}

      {/* Leave Balances Grid */}
      <div className="row g-4 mb-4">
        {loading ? (
          <div className="col-12 text-center py-4">
            <Spinner animation="border" variant="primary" size="sm" />
            <span className="text-muted ms-2" style={{ fontSize: '14px' }}>Loading balances...</span>
          </div>
        ) : balances.length === 0 ? (
          <div className="col-12">
            <div className="card p-4 text-center text-muted">
              No leave balances configured.
            </div>
          </div>
        ) : (
          balances.map((b) => {
            const remaining = b.allocated_days - b.used_days;
            return (
              <div key={b.leave_type_id} className="col-sm-6 col-lg-4">
                <div className="card card-interactive h-100 p-4">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="fw-semibold text-dark" style={{ fontSize: '15px' }}>{b.name}</span>
                    <span className="badge bg-info">{remaining} Days Left</span>
                  </div>
                  <div className="d-flex align-items-baseline gap-2 mb-2">
                    <span style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A' }}>
                      {remaining}
                    </span>
                    <span className="text-muted" style={{ fontSize: '13px' }}>
                      / {b.allocated_days} total
                    </span>
                  </div>
                  <div className="d-flex justify-content-between text-muted pt-2 border-top" style={{ fontSize: '12.5px' }}>
                    <span>Used: {b.used_days} days</span>
                    <span>Allocated: {b.allocated_days} days</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Leave Requests Table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-bottom">
          <h2 className="card-title mb-0">Leave History</h2>
        </div>

        <div className="table-responsive" style={{ border: 'none', borderRadius: 0 }}>
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Leave Type</th>
                <th>Dates</th>
                <th>Total Days</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">
                    No leave requests on record.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="badge bg-info">{r.leave_type_name || 'Leave'}</span>
                    </td>
                    <td style={{ color: '#334155', fontSize: '13.5px' }}>
                      {new Date(r.start_date).toLocaleDateString()} &mdash; {new Date(r.end_date).toLocaleDateString()}
                    </td>
                    <td>
                      <span className="fw-semibold text-dark">{r.total_days}</span> day(s)
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      <div className="text-truncate text-muted" title={r.reason}>
                        {r.reason}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          r.status === 'APPROVED'
                            ? 'bg-success'
                            : r.status === 'REJECTED'
                            ? 'bg-danger'
                            : 'bg-warning'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      <Modal show={showApply} onHide={() => setShowApply(false)} centered>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Apply for Leave</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="d-flex flex-column gap-3">
              <Form.Group>
                <Form.Label>Leave Type *</Form.Label>
                <Form.Select
                  required
                  value={formData.leave_type_id}
                  onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                >
                  <option value="">Select leave category...</option>
                  {balances.map((b) => (
                    <option key={b.leave_type_id} value={b.leave_type_id}>
                      {b.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <div className="row g-2">
                <div className="col-sm-6">
                  <Form.Group>
                    <Form.Label>Start Date *</Form.Label>
                    <Form.Control
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </Form.Group>
                </div>
                <div className="col-sm-6">
                  <Form.Group>
                    <Form.Label>End Date *</Form.Label>
                    <Form.Control
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </Form.Group>
                </div>
              </div>

              <Form.Group>
                <Form.Label>Total Days *</Form.Label>
                <Form.Control
                  type="number"
                  required
                  min="0.5"
                  step="0.5"
                  value={formData.total_days}
                  onChange={(e) => setFormData({ ...formData, total_days: Number(e.target.value) })}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>Reason for Absence *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  required
                  placeholder="Provide details regarding your leave request..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button className="btn btn-secondary" type="button" onClick={() => setShowApply(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner size="sm" animation="border" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Request</span>
              )}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
