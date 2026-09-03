import React, { useState, useEffect } from 'react';
import { Container, Table, Form, Row, Col, Card, Spinner, Alert, Button, Pagination } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

export default function AdminAttendance() {
  const { user } = useAuth();
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/attendance/summary?date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecords = async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/attendance?page=${pageNum}&limit=20`;
      if (date) url += `&date=${date}`;
      if (search) url += `&search=${search}`;
      if (status !== 'All') url += `&status=${status}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setRecords(data.data.items);
        setPage(data.data.pagination.page);
        setTotalPages(data.data.pagination.totalPages || 1);
      } else {
        setError(data.error?.message || 'Failed to fetch attendance');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [date]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchRecords(1);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [date, search, status]);

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchRecords(newPage);
    }
  };

  return (
    <Container className="mt-4">
      <h2 className="mb-4">Attendance Management</h2>
      
      {summary && (
        <Card className="mb-4 shadow-sm">
          <Card.Body>
            <Card.Title>Attendance — {new Date(date).toLocaleDateString()}</Card.Title>
            <Row className="text-center mt-3">
              <Col><h5>Total Employees</h5><p className="fs-4">{summary.totalEmployees}</p></Col>
              <Col><h5>Present</h5><p className="fs-4 text-success">{summary.present}</p></Col>
              <Col><h5>Absent</h5><p className="fs-4 text-danger">{summary.absent}</p></Col>
              <Col><h5>Checked In</h5><p className="fs-4 text-info">{summary.checkedIn}</p></Col>
              <Col><h5>Checked Out</h5><p className="fs-4 text-secondary">{summary.checkedOut}</p></Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Date</Form.Label>
                <Form.Control type="date" value={date} onChange={e => setDate(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Search Employee</Form.Label>
                <Form.Control type="text" placeholder="Name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select value={status} onChange={e => setStatus(e.target.value)}>
                  <option>All</option>
                  <option>Present</option>
                  <option>Absent</option>
                  <option>Late</option>
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
                  <th>ID</th>
                  <th>Date</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Working Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? records.map(r => (
                  <tr key={r.attendanceId}>
                    <td>{r.employeeName}</td>
                    <td>{r.employeeId}</td>
                    <td>{new Date(r.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</td>
                    <td>{formatTime(r.checkIn)}</td>
                    <td>{formatTime(r.checkOut)}</td>
                    <td>{formatHours(r.workingMinutes)}</td>
                    <td>
                      <span className={`badge ${r.status === 'PRESENT' ? 'bg-success' : r.status === 'ABSENT' ? 'bg-danger' : 'bg-secondary'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="text-center py-4">No records found.</td></tr>
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
    </Container>
  );
}
