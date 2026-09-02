import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Table } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

export default function AdminSettings() {
  const { token } = useAuth();
  
  const [settings, setSettings] = useState<any>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // New holiday form
  const [newHolDate, setNewHolDate] = useState('');
  const [newHolName, setNewHolName] = useState('');

  const loadData = async () => {
    try {
      const [setRes, holRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/settings`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/holidays`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const setJson = await setRes.json();
      const holJson = await holRes.json();

      if (setJson.success) setSettings({
        officeStart: setJson.data.office_start,
        officeEnd: setJson.data.office_end,
        lateThreshold: setJson.data.late_threshold,
        absenceCutoff: setJson.data.absence_cutoff,
        halfDayMinutes: setJson.data.half_day_minutes,
        fullDayMinutes: setJson.data.full_day_minutes,
        checkoutReminderTime: setJson.data.checkout_reminder_time
      });
      if (holJson.success) setHolidays(holJson.data);
    } catch (e: any) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setError(''); setMsg('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setMsg('Settings updated successfully');
      } else {
        setError(data.error?.message || 'Update failed');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ holidayDate: newHolDate, name: newHolName })
      });
      const data = await res.json();
      if (data.success) {
        setNewHolDate('');
        setNewHolName('');
        setMsg('Holiday added');
        loadData();
      } else {
        setError(data.error?.message || 'Failed to add holiday');
      }
    } catch (e) {
      setError('Network error');
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!window.confirm('Delete this holiday?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/holidays/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMsg('Holiday deleted');
        loadData();
      }
    } catch (e) {
      setError('Network error');
    }
  };

  if (loading) return <Container className="mt-4"><p>Loading...</p></Container>;

  return (
    <Container className="mt-4">
      <h2>System Settings & Rules</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {msg && <Alert variant="success">{msg}</Alert>}

      <Row className="mt-4">
        <Col md={6}>
          <Card>
            <Card.Header>Attendance Rules</Card.Header>
            <Card.Body>
              <Form onSubmit={handleSaveSettings}>
                <Row>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Office Start (HH:MM:SS)</Form.Label>
                      <Form.Control type="text" value={settings.officeStart} onChange={e => setSettings({...settings, officeStart: e.target.value})} required />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Office End (HH:MM:SS)</Form.Label>
                      <Form.Control type="text" value={settings.officeEnd} onChange={e => setSettings({...settings, officeEnd: e.target.value})} required />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Late Threshold (HH:MM:SS)</Form.Label>
                      <Form.Control type="text" value={settings.lateThreshold} onChange={e => setSettings({...settings, lateThreshold: e.target.value})} required />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Absence Cutoff (HH:MM:SS)</Form.Label>
                      <Form.Control type="text" value={settings.absenceCutoff} onChange={e => setSettings({...settings, absenceCutoff: e.target.value})} required />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Half Day (Minutes)</Form.Label>
                      <Form.Control type="number" value={settings.halfDayMinutes} onChange={e => setSettings({...settings, halfDayMinutes: Number(e.target.value)})} required />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Full Day (Minutes)</Form.Label>
                      <Form.Control type="number" value={settings.fullDayMinutes} onChange={e => setSettings({...settings, fullDayMinutes: Number(e.target.value)})} required />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Checkout Reminder (HH:MM:SS)</Form.Label>
                  <Form.Control type="text" value={settings.checkoutReminderTime} onChange={e => setSettings({...settings, checkoutReminderTime: e.target.value})} required />
                </Form.Group>
                
                <Button variant="primary" type="submit" disabled={saveLoading}>
                  {saveLoading ? 'Saving...' : 'Save Rules'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>Official Holidays</Card.Header>
            <Card.Body>
              <Form onSubmit={handleAddHoliday} className="mb-4">
                <Row>
                  <Col>
                    <Form.Control type="date" value={newHolDate} onChange={e => setNewHolDate(e.target.value)} required />
                  </Col>
                  <Col>
                    <Form.Control type="text" placeholder="Holiday Name" value={newHolName} onChange={e => setNewHolName(e.target.value)} required />
                  </Col>
                  <Col xs="auto">
                    <Button type="submit" variant="success">Add</Button>
                  </Col>
                </Row>
              </Form>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <Table size="sm" striped hover>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Holiday</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.map(h => (
                      <tr key={h.id}>
                        <td>{h.holidayDate}</td>
                        <td>{h.name}</td>
                        <td>
                          <Button variant="danger" size="sm" onClick={() => handleDeleteHoliday(h.id)}>Del</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
