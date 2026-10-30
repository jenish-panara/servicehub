import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./features/auth/AuthContext.jsx";
import LoginPage from "./features/auth/LoginPage.jsx";
import Layout from "./components/Layout.jsx";
import DispatchBoard from "./features/dispatch/DispatchBoard.jsx";
import CustomersPage from "./features/customers/CustomersPage.jsx";
import TechniciansPage from "./features/technicians/TechniciansPage.jsx";

function RequireAuth({ children }) {
  const hasToken = Boolean(localStorage.getItem("servicehub_access"));
  if (!hasToken) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<DispatchBoard />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="technicians" element={<TechniciansPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
