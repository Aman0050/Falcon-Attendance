import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AdminAttendance from './pages/AdminAttendance';
import AdminLeave from './pages/AdminLeave';
import AdminEmployees from './pages/AdminEmployees';
import AdminSettings from './pages/AdminSettings';
import AdminReports from './pages/AdminReports';

function Navigation() {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">Falcon Office Admin</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/" active={location.pathname === '/'}>Dashboard</Nav.Link>
            <Nav.Link as={Link} to="/employees" active={location.pathname === '/employees'}>Employees</Nav.Link>
            <Nav.Link as={Link} to="/attendance" active={location.pathname === '/attendance'}>Attendance</Nav.Link>
            <Nav.Link as={Link} to="/leave" active={location.pathname === '/leave'}>Leave</Nav.Link>
            <Nav.Link as={Link} to="/reports" active={location.pathname === '/reports'}>Reports</Nav.Link>
            <Nav.Link as={Link} to="/settings" active={location.pathname === '/settings'}>Settings</Nav.Link>
          </Nav>
          <Navbar.Text className="me-3 text-light">
            Signed in as: {user?.name}
          </Navbar.Text>
          <Button variant="outline-light" size="sm" onClick={logout}>Logout</Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

function Dashboard() {
  return (
    <Container className="mt-4">
      <h1>Welcome to Falcon Office</h1>
      <p>Admin dashboard is ready and secured.</p>
    </Container>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<><Navigation /><Dashboard /></>} />
            <Route path="/employees" element={<><Navigation /><AdminEmployees /></>} />
            <Route path="/attendance" element={<><Navigation /><AdminAttendance /></>} />
            <Route path="/leave" element={<><Navigation /><AdminLeave /></>} />
            <Route path="/reports" element={<><Navigation /><AdminReports /></>} />
            <Route path="/settings" element={<><Navigation /><AdminSettings /></>} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
