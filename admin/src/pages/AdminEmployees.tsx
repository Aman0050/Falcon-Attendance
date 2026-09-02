import React, { useState, useEffect } from 'react';
import { Container, Table, Form, Row, Col, Card, Spinner, Alert, Button, Pagination, Modal, Badge } from 'react-bootstrap';

export default function AdminEmployees() {
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
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  // Form State
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', department: '', designation: '', joiningDate: '', role: 'employee' });

  const fetchRecords = async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/employees?page=${pageNum}&limit=20`;
      if (search) url += `&search=${search}`;
      if (status !== 'All') url += `&status=${status}`;
      if (role !== 'All') url += `&role=${role}`;

      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      
      if (data.success) {
        setRecords(data.data.items);
        setPage(data.data.pagination.page);
        setTotalPages(data.data.pagination.totalPages || 1);
      } else {
        setError(data.error?.message || 'Failed to fetch');
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
  }, [search, status, role]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) fetchRecords(newPage);
  };

  const openAdd = () => {
    setSelectedUser(null);
    setFormData({ name: '', email: '', phone: '', department: '', designation: '', joiningDate: '', role: 'employee' });
    setShowForm(true);
  };

  const openEdit = (user: any) => {
    setSelectedUser(user);
    setFormData({
      name: user.name, email: user.email, phone: user.phone || '', 
      department: user.department || '', designation: user.designation || '', 
      joiningDate: user.joiningDate ? new Date(user.joiningDate).toISOString().split('T')[0] : '', 
      role: user.role
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const method = selectedUser ? 'PATCH' : 'POST';
      const url = selectedUser ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/employees/${selectedUser.id}` : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/employees`;
      
      // If editing, don't send email if we don't support email changes natively
      const payload = { ...formData };
      
      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        fetchRecords(page);
        if (!selectedUser) {
          alert(`Created! Temp Password: ${data.data.tempPassword}`);
        }
      } else {
        alert(data.error?.message || 'Failed to save');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`Are you sure you want to mark ${user.name} as ${newStatus}?`)) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/employees/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) fetchRecords(page);
      else alert(data.error?.message || 'Failed to update status');
    } catch (e) {
      alert('Network error');
    }
  };

  const handleResetPassword = async (user: any) => {
    if (!window.confirm(`Reset password for ${user.name}?`)) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/employees/${user.id}/reset-password`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTempPassword(data.data.tempPassword);
        setShowReset(true);
      } else alert(data.error?.message || 'Failed to reset');
    } catch (e) {
      alert('Network error');
    }
  };

  const openDetail = async (user: any) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/employees/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDetailData(data.data);
        setShowDetail(true);
      } else alert(data.error?.message);
    } catch (e) {
      alert('Network error');
    }
  };

  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Employee Management</h2>
        <Button variant="primary" onClick={openAdd}>+ Add Employee</Button>
      </div>

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <Form.Control type="text" placeholder="Name, ID, Email..." value={search} onChange={e => setSearch(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select value={status} onChange={e => setStatus(e.target.value)}>
                  <option>All</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Role</Form.Label>
                <Form.Select value={role} onChange={e => setRole(e.target.value)}>
                  <option>All</option>
                  <option>employee</option>
                  <option>admin</option>
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
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? records.map(r => (
                  <tr key={r.id}>
                    <td>{r.employeeId}</td>
                    <td>
                      <div><strong>{r.name}</strong></div>
                      <small className="text-muted">{r.email}</small>
                    </td>
                    <td>{r.department || '-'}</td>
                    <td><Badge bg={r.role === 'admin' ? 'danger' : 'info'}>{r.role.toUpperCase()}</Badge></td>
                    <td><Badge bg={r.status === 'active' ? 'success' : 'secondary'}>{r.status.toUpperCase()}</Badge></td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button variant="outline-primary" size="sm" onClick={() => openDetail(r)}>View</Button>
                        <Button variant="outline-secondary" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                        <Button variant={r.status === 'active' ? 'outline-warning' : 'outline-success'} size="sm" onClick={() => handleToggleStatus(r)}>
                          {r.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleResetPassword(r)}>Reset Pwd</Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="text-center py-4">No employees found.</td></tr>
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

      {/* Form Modal */}
      <Modal show={showForm} onHide={() => setShowForm(false)} backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>{selectedUser ? 'Edit Employee' : 'Add Employee'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3"><Form.Label>Name</Form.Label><Form.Control value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Email</Form.Label><Form.Control value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} disabled={!!selectedUser} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Phone</Form.Label><Form.Control value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Department</Form.Label><Form.Control value={formData.department} onChange={e=>setFormData({...formData, department: e.target.value})} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Designation</Form.Label><Form.Control value={formData.designation} onChange={e=>setFormData({...formData, designation: e.target.value})} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Joining Date</Form.Label><Form.Control type="date" value={formData.joiningDate} onChange={e=>setFormData({...formData, joiningDate: e.target.value})} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Role</Form.Label><Form.Select value={formData.role} onChange={e=>setFormData({...formData, role: e.target.value})}><option value="employee">Employee</option><option value="admin">Admin</option></Form.Select></Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={actionLoading}>{actionLoading ? <Spinner size="sm" animation="border" /> : 'Save'}</Button>
        </Modal.Footer>
      </Modal>

      {/* Detail Modal */}
      <Modal show={showDetail} onHide={() => setShowDetail(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>Employee Profile</Modal.Title></Modal.Header>
        <Modal.Body>
          {detailData && (
            <Row>
              <Col md={6}>
                <h5>Information</h5>
                <p><strong>Name:</strong> {detailData.profile.name}</p>
                <p><strong>Employee ID:</strong> {detailData.profile.employeeId}</p>
                <p><strong>Email:</strong> {detailData.profile.email}</p>
                <p><strong>Phone:</strong> {detailData.profile.phone || 'N/A'}</p>
                <p><strong>Department:</strong> {detailData.profile.department || 'N/A'}</p>
                <p><strong>Designation:</strong> {detailData.profile.designation || 'N/A'}</p>
                <p><strong>Joining Date:</strong> {detailData.profile.joiningDate}</p>
                <p><strong>Role:</strong> {detailData.profile.role}</p>
                <p><strong>Status:</strong> {detailData.profile.status}</p>
              </Col>
              <Col md={6}>
                <h5>Current Year Summary</h5>
                <Card className="mb-2"><Card.Body>
                  <h6>Attendance</h6>
                  Present: {detailData.attendanceSummary.present} | Absent: {detailData.attendanceSummary.absent} | Late: {detailData.attendanceSummary.late}
                </Card.Body></Card>
                <Card className="mb-2"><Card.Body>
                  <h6>Leaves</h6>
                  Approved: {detailData.leaveSummary.approved} | Pending: {detailData.leaveSummary.pending}
                </Card.Body></Card>
              </Col>
            </Row>
          )}
        </Modal.Body>
      </Modal>

      {/* Reset Password Modal */}
      <Modal show={showReset} onHide={() => setShowReset(false)}>
        <Modal.Header closeButton><Modal.Title>Password Reset</Modal.Title></Modal.Header>
        <Modal.Body>
          <Alert variant="success">Password reset successfully!</Alert>
          <p>Please provide the following temporary password to the employee securely:</p>
          <h3 className="text-center bg-light p-3 border font-monospace">{tempPassword}</h3>
          <p className="text-muted small mt-2">They can change this from their mobile profile screen.</p>
        </Modal.Body>
        <Modal.Footer><Button onClick={() => setShowReset(false)}>Close</Button></Modal.Footer>
      </Modal>
    </Container>
  );
}
