import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import { ClaimRedirect } from './ClaimRedirect';
import { ApprovalsPage } from './pages/Approvals';
import { ClaimPage } from './pages/Claim';
import { DashboardPage } from './pages/Dashboard';
import { FinancePage } from './pages/Finance';
import { InboxPage } from './pages/Inbox';
import { LoginPage } from './pages/Login';
import { NewRequestPage } from './pages/NewRequest';
import { RequestFormPage } from './pages/RequestForm';
import { SignupPage } from './pages/Signup';
import { RequireAuth } from './RequireAuth';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/claim" element={<ClaimRedirect />} />
            <Route path="/claims/new" element={<NewRequestPage />} />
            <Route path="/claims/request/domestic" element={<RequestFormPage />} />
            <Route path="/claims/:id" element={<ClaimPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/finance" element={<FinancePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
