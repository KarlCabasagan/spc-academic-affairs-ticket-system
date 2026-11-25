import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Layouts
import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";

// Public Pages
import LandingPage from "./pages/public/LandingPage";
import TrackTicket from "./pages/public/TrackTicket";
import NotFound from "./pages/public/NotFound";

// Auth Pages
import Login from "./pages/auth/Login";
import ResetPassword from "./pages/auth/ResetPassword";

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
            <Route path="/track" element={<Navigate to="/" replace />} />
            <Route path="/track/:ticketCode" element={<TrackTicket />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
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
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#ffffff",
            color: "#171614",
            border: "1px solid #e6e2da",
            boxShadow:
              "0 10px 24px -6px rgb(23 22 20 / 0.12), 0 4px 8px -4px rgb(23 22 20 / 0.06)",
            borderRadius: "8px",
            padding: "12px 14px",
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            fontSize: "0.875rem",
          },
          success: {
            iconTheme: {
              primary: "#166534",
              secondary: "#ffffff",
            },
          },
          error: {
            iconTheme: {
              primary: "#b91c1c",
              secondary: "#ffffff",
            },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
