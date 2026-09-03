import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Spinner, Modal, Badge, Pagination } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function AdminReports() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [reportData, setReportData] = useState<any>(null);
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  // Filters
  const [filterMode, setFilterMode] = useState<'month' | 'range'>('month');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');
  
  // Pagination & Sort
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [activeEmpReport, setActiveEmpReport] = useState<any>(null);

  useEffect(() => {
    fetchEmployees();
  }, [token]);

  useEffect(() => {
    fetchReport();
  }, [page, sortField, sortOrder, token]); // Re-fetch on pagination or sort

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setEmployeesList(res.data.data.items || res.data.data.employees || (Array.isArray(res.data.data) ? res.data.data : []));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_URL}/api/admin/reports/attendance?page=${page}&limit=20&sort=${sortField}&order=${sortOrder}`;
      
      if (filterMode === 'month') {
        url += `&month=${month}&year=${year}`;
      } else {
        if (!fromDate || !toDate) {
          setError('Please select valid From and To dates');
          setLoading(false);
          return;
        }
        url += `&from=${fromDate}&to=${toDate}`;
      }

      if (selectedEmployee) url += `&employeeId=${selectedEmployee}`;
      if (selectedStatus && selectedStatus !== 'All') url += `&status=${selectedStatus}`;
      if (search) url += `&search=${search}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setReportData(res.data.data);
      } else {
        setError(res.data.error?.message || 'Error loading report');
      }
    } catch (err: any) {
      setError('Unable to load attendance report.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setPage(1);
    fetchReport();
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to desc for numbers
    }
    setPage(1);
  };

  const handleExport = (type: 'excel' | 'pdf') => {
    try {
      let url = `${API_URL}/api/admin/reports/attendance?export=${type}&sort=${sortField}&order=${sortOrder}&token=${token}`;
      if (filterMode === 'month') {
        url += `&month=${month}&year=${year}`;
      } else {
        url += `&from=${fromDate}&to=${toDate}`;
      }
      if (selectedEmployee) url += `&employeeId=${selectedEmployee}`;
      if (selectedStatus && selectedStatus !== 'All') url += `&status=${selectedStatus}`;
      if (search) url += `&search=${search}`;

      window.open(url, '_blank');
    } catch (err) {
      alert(`Unable to export ${type.toUpperCase()}`);
    }
  };

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h}h ${m}m`;
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PRESENT': return <Badge bg="success">PRESENT</Badge>;
      case 'ABSENT': return <Badge bg="danger">ABSENT</Badge>;
      case 'HALF_DAY': return <Badge bg="warning" text="dark">HALF DAY</Badge>;
      case 'ON_LEAVE': return <Badge bg="info">ON LEAVE</Badge>;
      case 'HOLIDAY': return <Badge bg="primary">HOLIDAY</Badge>;
      case 'SUNDAY': return <Badge bg="secondary">SUNDAY</Badge>;
      default: return <Badge bg="light" text="dark">{status}</Badge>;
    }
  };

  return (
    <Container className="mt-4 mb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Admin Attendance Reports</h2>
        <div>
          <Button variant="outline-success" className="me-2" onClick={() => handleExport('excel')}>Export Excel</Button>
          <Button variant="outline-danger" onClick={() => handleExport('pdf')}>Export PDF</Button>
        </div>
      </div>

      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Label>Filter Mode</Form.Label>
              <Form.Select value={filterMode} onChange={(e: any) => setFilterMode(e.target.value)}>
                <option value="month">Month</option>
                <option value="range">Date Range</option>
              </Form.Select>
            </Col>

            {filterMode === 'month' ? (
              <>
                <Col md={2}>
                  <Form.Label>Month</Form.Label>
                  <Form.Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Label>Year</Form.Label>
                  <Form.Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </Form.Select>
                </Col>
              </>
            ) : (
              <>
                <Col md={2}>
                  <Form.Label>From Date</Form.Label>
                  <Form.Control type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                </Col>
                <Col md={2}>
                  <Form.Label>To Date</Form.Label>
                  <Form.Control type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                </Col>
              </>
            )}

            <Col md={2}>
              <Form.Label>Employee</Form.Label>
              <Form.Select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                <option value="">All Employees</option>
                {employeesList.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label>Status</Form.Label>
              <Form.Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="All">All</option>
                <option value="PRESENT">PRESENT</option>
                <option value="ABSENT">ABSENT</option>
                <option value="HALF_DAY">HALF DAY</option>
                <option value="ON_LEAVE">ON LEAVE</option>
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label>Search Name/ID</Form.Label>
              <Form.Control type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </Col>

            <Col md={2} className="d-flex align-items-end">
              <Button variant="primary" className="w-100" onClick={handleApplyFilters}>Apply Filters</Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status"><span className="visually-hidden">Loading report...</span></Spinner>
          <div className="mt-2 text-muted">Loading report...</div>
        </div>
      ) : error ? (
        <div className="text-center my-5 text-danger">
          <p>{error}</p>
          <Button variant="outline-primary" onClick={handleApplyFilters}>Retry</Button>
        </div>
      ) : reportData && (
        <>
          <Row className="mb-4 text-center g-3">
            {[
              { label: 'Total Employees', val: reportData.summary.employees },
              { label: 'Working Days', val: reportData.summary.workingDays },
              { label: 'Present', val: reportData.summary.present },
              { label: 'Absent', val: reportData.summary.absent },
              { label: 'Half Day', val: reportData.summary.halfDay },
              { label: 'On Leave', val: reportData.summary.onLeave },
              { label: 'Late', val: reportData.summary.late },
              { label: 'Total Hours', val: formatHours(reportData.summary.totalWorkingMinutes) },
              { label: 'Attendance %', val: `${reportData.summary.attendancePercentage}%`, textClass: 'text-primary fw-bold' }
            ].map((stat, idx) => (
              <Col key={idx} xs={6} md={3} lg={true}>
                <Card className="h-100 shadow-sm border-0 bg-light">
                  <Card.Body className="p-2 d-flex flex-column justify-content-center">
                    <div className="text-muted small">{stat.label}</div>
                    <div className={`fs-4 ${stat.textClass || ''}`}>{stat.val}</div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <Card className="shadow-sm">
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{cursor: 'pointer'}} onClick={() => handleSort('name')}>Employee {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                    <th style={{cursor: 'pointer'}} onClick={() => handleSort('present')}>Present {sortField === 'present' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                    <th>Absent</th>
                    <th>Half Day</th>
                    <th>Leave</th>
                    <th>Late</th>
                    <th>Total Hours</th>
                    <th style={{cursor: 'pointer'}} onClick={() => handleSort('attendancePercentage')}>Att % {sortField === 'attendancePercentage' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.employees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-4 text-muted">No attendance records found for the selected filters.</td>
                    </tr>
                  ) : (
                    reportData.employees.map((emp: any) => (
                      <tr key={emp.id} className="align-middle">
                        <td>
                          <div className="fw-bold">{emp.name}</div>
                          <div className="text-muted small">{emp.email}</div>
                        </td>
                        <td>{emp.summary.present}</td>
                        <td>{emp.summary.absent}</td>
                        <td>{emp.summary.halfDay}</td>
                        <td>{emp.summary.onLeave}</td>
                        <td>{emp.summary.late}</td>
                        <td>{formatHours(emp.summary.totalWorkingMinutes)}</td>
                        <td className="fw-bold text-primary">{emp.summary.attendancePercentage}%</td>
                        <td>
                          <Button variant="outline-primary" size="sm" onClick={() => {
                            setActiveEmpReport(emp);
                            setShowModal(true);
                          }}>Details</Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Pagination */}
          {reportData.pagination.totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination>
                <Pagination.Prev disabled={page === 1} onClick={() => setPage(p => p - 1)} />
                {[...Array(reportData.pagination.totalPages)].map((_, idx) => (
                  <Pagination.Item key={idx + 1} active={page === idx + 1} onClick={() => setPage(idx + 1)}>
                    {idx + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next disabled={page === reportData.pagination.totalPages} onClick={() => setPage(p => p + 1)} />
              </Pagination>
            </div>
          )}
        </>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{activeEmpReport?.name} - Daily Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Status</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Working Hours</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {activeEmpReport?.daily?.map((d: any, idx: number) => (
                <tr key={idx}>
                  <td>{d.date}</td>
                  <td>{d.day}</td>
                  <td>{getStatusBadge(d.status)} {d.isLate && <Badge bg="warning" text="dark" className="ms-1">LATE</Badge>}</td>
                  <td>{formatTime(d.checkIn)}</td>
                  <td>{formatTime(d.checkOut)}</td>
                  <td>{formatHours(d.workingMinutes)}</td>
                  <td className="text-muted small">{d.leaveType || d.holidayName || ''}</td>
                </tr>
              ))}
              {activeEmpReport?.daily?.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-3 text-muted">No records matched the filter criteria for this employee.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
