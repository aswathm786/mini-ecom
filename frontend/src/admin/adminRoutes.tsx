/**
 * Admin Routes
 * 
 * Defines all admin dashboard routes.
 */

import { Routes, Route } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderShowPage } from './pages/OrderShowPage';
import { RefundsPage } from './pages/RefundsPage';
import { ShipmentsPage } from './pages/ShipmentsPage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductEditPage } from './pages/ProductEditPage';
import { UsersPage } from './pages/UsersPage';
import { UserShowPage } from './pages/UserShowPage';
import { RolesPage } from './pages/RolesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ThemeSettingsPage } from './pages/ThemeSettingsPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { ReportsPage } from './pages/ReportsPage';
import { InvoiceGeneratorPage } from './pages/InvoiceGeneratorPage';
import { SupportTicketsPage } from './pages/SupportTicketsPage';
import { SupportTicketDetailsPage } from './pages/SupportTicketDetailsPage';

export function AdminRoutes() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderShowPage />} />
        <Route path="refunds" element={<RefundsPage />} />
        <Route path="shipments" element={<ShipmentsPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="catalog/:id/edit" element={<ProductEditPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserShowPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="theme" element={<ThemeSettingsPage />} />
        <Route path="webhooks" element={<WebhooksPage />} />
        <Route path="audit" element={<AuditLogsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="invoices/:orderId" element={<InvoiceGeneratorPage />} />
        <Route path="support/tickets" element={<SupportTicketsPage />} />
        <Route path="support/tickets/:id" element={<SupportTicketDetailsPage />} />
      </Routes>
    </AdminLayout>
  );
}

