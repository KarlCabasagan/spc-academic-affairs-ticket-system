import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Layouts
import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";

// Public Pages
import LandingPage from "./pages/public/LandingPage";
import TrackTicket from "./pages/public/TrackTicket";

// Auth Pages
import Login from "./pages/auth/Login";

// Admin Pages
import Dashboard from "./pages/admin/Dashboard";
import Tickets from "./pages/admin/Tickets";
import CreateTicket from "./pages/admin/CreateTicket";
import TicketDetail from "./pages/admin/TicketDetail";
import Departments from "./pages/admin/Departments";
import Subjects from "./pages/admin/Subjects";
import Personnel from "./pages/admin/Personnel";
import Team from "./pages/admin/Team";
import Profile from "./pages/admin/Profile";
import Reports from "./pages/admin/Reports";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/track/:ticketCode" element={<TrackTicket />} />
          </Route>

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="tickets/create" element={<CreateTicket />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="reports" element={<Reports />} />
            <Route path="profile" element={<Profile />} />

            {/* Super Admin Only Routes */}
            <Route
              path="departments"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <Departments />
                </ProtectedRoute>
              }
            />
            <Route
              path="subjects"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <Subjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="personnel"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <Personnel />
                </ProtectedRoute>
              }
            />
            <Route
              path="team"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <Team />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#fff",
            color: "#1f2937",
            boxShadow:
              "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            borderRadius: "12px",
            padding: "12px 16px",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
