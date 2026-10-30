import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./features/auth/AuthContext.jsx";
import LoginPage from "./features/auth/LoginPage.jsx";
import DispatchBoard from "./features/dispatch/DispatchBoard.jsx";

function RequireAuth({ children }) {
  const { hasToken } = useAuthCompat();
  if (!hasToken) return <Navigate to="/login" replace />;
  return children;
}

// Minimal stand-in until AuthContext exposes session state properly.
function useAuthCompat() {
  const ctx = useAuth();
  const hasToken = Boolean(localStorage.getItem("servicehub_access"));
  return { ...ctx, hasToken };
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DispatchBoard />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
