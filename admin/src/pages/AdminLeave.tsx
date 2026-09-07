import { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Button, Form, Modal, Pagination, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AdminLeave() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    checkInit();
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [page, statusFilter]);

  const checkInit = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/leave/is-initialized`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.data.data.initialized) {
        navigate('/leave-init');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/leave?page=${page}&status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaves(res.data.data.items);
      setTotalPages(res.data.data.pagination.totalPages);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (!window.confirm('Are you sure you want to approve this leave?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/admin/leave/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLeaves();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!rejectReason || rejectReason.length < 3) {
      setError('Please provide a valid rejection reason.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/admin/leave/${selectedLeave}/reject`, { comment: rejectReason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowRejectModal(false);
      setRejectReason('');
      fetchLeaves();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to reject');
    }
  };

  return (
    <Container className="mt-4 mb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Leave Management</h2>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <div className="mb-3 d-flex align-items-center" style={{ maxWidth: '300px' }}>
            <Form.Label className="me-2 mb-0 fw-bold">Status:</Form.Label>
            <Form.Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="All">All Requests</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </Form.Select>
          </div>

          <Table responsive hover className="align-middle">
            <thead className="table-light">
              <tr>
                <th>Emp ID</th>
                <th>Name</th>
                <th>Leave Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-4">Loading...</td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-4 text-muted">No leave requests found.</td></tr>
              ) : (
                leaves.map(lr => (
                  <tr key={lr.id}>
                    <td>{lr.employeeId}</td>
                    <td>{lr.employeeName}</td>
                    <td><Badge bg="info">{lr.leaveType}</Badge></td>
                    <td>{lr.startDate} to {lr.endDate}</td>
                    <td>{lr.totalDays}</td>
                    <td style={{ maxWidth: '200px' }} className="text-truncate" title={lr.reason}>{lr.reason}</td>
                    <td>
                      <Badge bg={lr.status === 'APPROVED' ? 'success' : lr.status === 'REJECTED' ? 'danger' : lr.status === 'CANCELLED' ? 'secondary' : 'warning'}>
                        {lr.status}
                      </Badge>
                    </td>
                    <td>
                      {lr.status === 'PENDING' && (
                        <div className="d-flex gap-2">
                          <Button size="sm" variant="success" onClick={() => handleApprove(lr.id)}>Approve</Button>
                          <Button size="sm" variant="danger" onClick={() => { setSelectedLeave(lr.id); setShowRejectModal(true); }}>Reject</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>

          {totalPages > 1 && (
            <div className="d-flex justify-content-end mt-3">
              <Pagination>
                <Pagination.Prev disabled={page === 1} onClick={() => setPage(p => p - 1)} />
                <Pagination.Item active>{page}</Pagination.Item>
                <Pagination.Next disabled={page === totalPages} onClick={() => setPage(p => p + 1)} />
              </Pagination>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showRejectModal} onHide={() => { setShowRejectModal(false); setError(''); }}>
        <Modal.Header closeButton>
          <Modal.Title>Reject Leave Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form.Group>
            <Form.Label>Reason for Rejection</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter reason..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleReject}>Reject Leave</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
