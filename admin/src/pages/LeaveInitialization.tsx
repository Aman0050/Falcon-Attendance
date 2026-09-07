import { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Form, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function LeaveInitialization() {
  const [employees, setEmployees] = useState<{ id: number; name: string; employee_id: string; usedPaidLeave: number }[]>([]);
  const [quarter, setQuarter] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkInit();
  }, []);

  const checkInit = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/leave/is-initialized`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.data.initialized) {
        navigate('/leave');
      } else {
        fetchEmployees();
        // Determine current quarter
        const month = new Date().getMonth() + 1;
        setQuarter(Math.ceil(month / 3));
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error checking initialization');
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/employees?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(res.data.data.items.map((e: any) => ({
        id: e.id,
        name: e.name,
        employee_id: e.employee_id,
        usedPaidLeave: 0
      })));
      setLoading(false);
    } catch (err: any) {
      setError('Error fetching employees');
      setLoading(false);
    }
  };

  const handleLeaveChange = (id: number, val: string) => {
    const num = parseFloat(val);
    setEmployees(emps => emps.map(e => e.id === id ? { ...e, usedPaidLeave: isNaN(num) ? 0 : num } : e));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/admin/leave/initialize`, {
        quarter,
        employees: employees.map(e => ({ employeeId: e.id, usedPaidLeave: e.usedPaidLeave }))
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Leave initialized successfully. Redirecting...');
      setTimeout(() => navigate('/leave'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to initialize leaves');
      setSubmitting(false);
    }
  };

  if (loading) return <Container className="mt-5 text-center"><Spinner animation="border" /></Container>;

  return (
    <Container className="mt-4 mb-5">
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white">
          <h4 className="mb-0">Leave Initialization Wizard</h4>
        </Card.Header>
        <Card.Body>
          <Alert variant="info">
            <strong>One-time Setup:</strong> Please initialize the leave balances for existing employees. 
            Select the current quarter and enter the number of <strong>Paid Leaves</strong> already used by each employee this year.
          </Alert>

          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-4" style={{ maxWidth: '300px' }}>
              <Form.Label fw-bold="true">Current Quarter</Form.Label>
              <Form.Select value={quarter} onChange={e => setQuarter(parseInt(e.target.value))}>
                <option value={1}>Q1 (Jan-Mar) - 4.5 days accrued</option>
                <option value={2}>Q2 (Apr-Jun) - 9.0 days accrued</option>
                <option value={3}>Q3 (Jul-Sep) - 13.5 days accrued</option>
                <option value={4}>Q4 (Oct-Dec) - 18.0 days accrued</option>
              </Form.Select>
            </Form.Group>

            <Table striped bordered hover responsive>
              <thead className="table-light">
                <tr>
                  <th>Emp ID</th>
                  <th>Name</th>
                  <th style={{ width: '200px' }}>Used Paid Leave (Days)</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>{emp.employee_id}</td>
                    <td>{emp.name}</td>
                    <td>
                      <Form.Control 
                        type="number" 
                        step="0.5" 
                        min="0"
                        value={emp.usedPaidLeave} 
                        onChange={e => handleLeaveChange(emp.id, e.target.value)} 
                        required
                      />
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">No active employees found.</td>
                  </tr>
                )}
              </tbody>
            </Table>
            
            <div className="text-end mt-4">
              <Button variant="primary" type="submit" disabled={submitting || employees.length === 0}>
                {submitting ? 'Initializing...' : 'Initialize Leaves'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
