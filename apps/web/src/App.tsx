import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireOnboardingComplete } from '@/components/auth/RequireOnboardingComplete';
import { AppShell } from '@/components/layout/AppShell';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { FaqPage } from '@/pages/FaqPage';
import { HomePage } from '@/pages/HomePage';
import { LegalPrivacyPage } from '@/pages/LegalPrivacyPage';
import { LegalTermsPage } from '@/pages/LegalTermsPage';
import { PricingPage } from '@/pages/PricingPage';
import { LoginPage } from '@/pages/LoginPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SavingsPage } from '@/pages/SavingsPage';
import { SettingsAccountPage } from '@/pages/SettingsAccountPage';
import { SettingsBillingPage } from '@/pages/SettingsBillingPage';
import { StacksPage } from '@/pages/StacksPage';
import { ProjectDashboardPage } from '@/pages/ProjectDashboardPage';
import { ToolsPage } from '@/pages/ToolsPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/legal/privacy" element={<LegalPrivacyPage />} />
      <Route path="/legal/terms" element={<LegalTermsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset" element={<ResetPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        element={
          <RequireAuth>
            <Outlet />
          </RequireAuth>
        }
      >
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route
          element={
            <RequireOnboardingComplete>
              <Outlet />
            </RequireOnboardingComplete>
          }
        >
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects/:id" element={<ProjectDashboardPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/stacks" element={<StacksPage />} />
            <Route path="/savings" element={<SavingsPage />} />
            <Route path="/settings/account" element={<SettingsAccountPage />} />
            <Route path="/settings/billing" element={<SettingsBillingPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
