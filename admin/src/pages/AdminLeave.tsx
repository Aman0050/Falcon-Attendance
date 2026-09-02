import React, { useState, useEffect } from 'react';
import { Container, Table, Form, Row, Col, Card, Spinner, Alert, Button, Pagination, Modal } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

export default function AdminLeave() {
  const { user } = useAuth();
  
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('PENDING');
  
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRecords = async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/leave?page=${pageNum}&limit=20`;
      if (search) url += `&search=${search}`;
      if (status !== 'All') url += `&status=${status}`;

      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      
      if (data.success) {
        setRecords(data.data.items);
        setPage(data.data.pagination.page);
        setTotalPages(data.data.pagination.totalPages || 1);
      } else {
        setError(data.error?.message || 'Failed to fetch leaves');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchRecords(1);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, status]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchRecords(newPage);
    }
  };

  const openApprove = (leave: any) => {
    setSelectedLeave(leave);
    setShowApprove(true);
  };

  const openReject = (leave: any) => {
    setSelectedLeave(leave);
    setRejectComment('');
    setShowReject(true);
  };

  const submitApprove = async () => {
    if (!selectedLeave) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/leave/${selectedLeave.id}/approve`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setShowApprove(false);
        fetchRecords(page);
      } else {
        alert(data.error?.message || 'Failed to approve');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const submitReject = async () => {
    if (!selectedLeave) return;
    if (rejectComment.length < 3) {
      alert('Rejection reason must be at least 3 characters.');
      return;
    }
    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/leave/${selectedLeave.id}/reject`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comment: rejectComment })
      });
      const data = await res.json();
      if (data.success) {
        setShowReject(false);
        fetchRecords(page);
      } else {
        alert(data.error?.message || 'Failed to reject');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Container className="mt-4">
      <h2 className="mb-4">Leave Management</h2>

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Search Employee</Form.Label>
                <Form.Control type="text" placeholder="Name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Status Filter</Form.Label>
                <Form.Select value={status} onChange={e => setStatus(e.target.value)}>
                  <option>All</option>
                  <option>PENDING</option>
                  <option>APPROVED</option>
                  <option>REJECTED</option>
                  <option>CANCELLED</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {loading && records.length === 0 ? (
        <div className="text-center my-5"><Spinner animation="border" /></div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : (
        <>
          <div className="table-responsive">
            <Table striped bordered hover className="align-middle bg-white shadow-sm">
              <thead className="table-dark">
                <tr>
                  <th>Employee</th>
                  <th>Dates</th>
                  <th>Type</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? records.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div>{r.employeeName}</div>
                      <small className="text-muted">{r.employeeId}</small>
                    </td>
                    <td>{r.startDate} to {r.endDate}</td>
                    <td>{r.leaveType}</td>
                    <td>{r.totalDays}</td>
                    <td>{r.reason}</td>
                    <td>
                      <span className={`badge ${r.status === 'APPROVED' ? 'bg-success' : r.status === 'REJECTED' ? 'bg-danger' : r.status === 'PENDING' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === 'PENDING' && (
                        <div className="d-flex gap-2">
                          <Button variant="success" size="sm" onClick={() => openApprove(r)}>Approve</Button>
                          <Button variant="danger" size="sm" onClick={() => openReject(r)}>Reject</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="text-center py-4">No leave requests found.</td></tr>
                )}
              </tbody>
            </Table>
          </div>
          
          {totalPages > 1 && (
            <Pagination className="justify-content-center mt-3">
              <Pagination.Prev disabled={page === 1} onClick={() => handlePageChange(page - 1)} />
              <Pagination.Item active>{page}</Pagination.Item>
              <Pagination.Next disabled={page === totalPages} onClick={() => handlePageChange(page + 1)} />
            </Pagination>
          )}
        </>
      )}

      {/* Approve Modal */}
      <Modal show={showApprove} onHide={() => !actionLoading && setShowApprove(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Approve Leave Request?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLeave && (
            <div>
              <p><strong>Employee:</strong> {selectedLeave.employeeName} ({selectedLeave.employeeId})</p>
              <p><strong>Leave:</strong> {selectedLeave.leaveType}</p>
              <p><strong>Dates:</strong> {selectedLeave.startDate} – {selectedLeave.endDate}</p>
              <p><strong>Days:</strong> {selectedLeave.totalDays}</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApprove(false)} disabled={actionLoading}>CANCEL</Button>
          <Button variant="success" onClick={submitApprove} disabled={actionLoading}>
            {actionLoading ? <Spinner size="sm" animation="border" /> : 'APPROVE'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Modal */}
      <Modal show={showReject} onHide={() => !actionLoading && setShowReject(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reject Leave Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Reason</Form.Label>
            <Form.Control 
              as="textarea" 
              rows={3} 
              value={rejectComment} 
              onChange={e => setRejectComment(e.target.value)} 
              placeholder="Enter rejection reason..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReject(false)} disabled={actionLoading}>CANCEL</Button>
          <Button variant="danger" onClick={submitReject} disabled={actionLoading}>
            {actionLoading ? <Spinner size="sm" animation="border" /> : 'REJECT'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
