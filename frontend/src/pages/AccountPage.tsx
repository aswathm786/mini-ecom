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

export function AccountPage() {
  const { isAuthenticated } = useAuth();

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
    </Routes>
  );
}
