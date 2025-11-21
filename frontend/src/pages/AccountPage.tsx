/**
 * Account Page
 * 
 * Account layout wrapper - redirects to AccountHome or shows account navigation.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AccountHome } from './account/AccountHome';
import { ProfilePage } from './account/ProfilePage';
import { AddressesPage } from './account/AddressesPage';
import { OrdersPage } from './account/OrdersPage';
import { OrderDetailsPage } from './account/OrderDetailsPage';
import { InvoicesPage } from './account/InvoicesPage';
import { TrackingPage } from './account/TrackingPage';
import { TicketsPage } from './account/TicketsPage';
import { TicketDetailsPage } from './account/TicketDetailsPage';
import { SessionsPage } from './account/SessionsPage';
import { TwoFactorSetupPage } from './account/TwoFactorSetupPage';

export function AccountPage() {
  const { isAuthenticated, isLoading } = useAuth();

  // Wait for auth state to load before checking authentication
  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login?return=/account" replace />;
  }

  return (
    <Routes>
      <Route index element={<AccountHome />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="addresses" element={<AddressesPage />} />
      <Route path="orders" element={<OrdersPage />} />
      <Route path="orders/:id" element={<OrderDetailsPage />} />
      <Route path="invoices" element={<InvoicesPage />} />
      <Route path="tracking/:awb" element={<TrackingPage />} />
      <Route path="tickets" element={<TicketsPage />} />
      <Route path="tickets/:id" element={<TicketDetailsPage />} />
      <Route path="sessions" element={<SessionsPage />} />
      <Route path="security/2fa" element={<TwoFactorSetupPage />} />
    </Routes>
  );
}
