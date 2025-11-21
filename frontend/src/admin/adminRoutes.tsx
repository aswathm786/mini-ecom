/**
 * Admin Routes
 * 
 * Defines all admin dashboard routes.
 */

import { Routes, Route } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { ProtectedAdminPage } from '../components/routing/ProtectedAdminPage';
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
import { StoreSettingsPage } from './pages/StoreSettingsPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { ReportsPage } from './pages/ReportsPage';
import { InvoiceGeneratorPage } from './pages/InvoiceGeneratorPage';
import { SupportTicketsPage } from './pages/SupportTicketsPage';
import { SupportTicketDetailsPage } from './pages/SupportTicketDetailsPage';
import { AIToolsPage } from './pages/AIToolsPage';
import { AISettingsPage } from './pages/AISettingsPage';
import { SecurityPage } from './pages/SecurityPage';
import { MarketingPage } from './pages/MarketingPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ProductCreatePage } from './pages/ProductCreatePage';
import { EmailTemplatesPage } from './pages/EmailTemplatesPage';
import { CountriesPage } from './pages/CountriesPage';
import { SchemaPage } from './pages/SchemaPage';
import { TaxShippingSettingsPage } from './pages/TaxShippingSettingsPage';
import { CouponsPage } from './pages/CouponsPage';

export function AdminRoutes() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<ProtectedAdminPage><DashboardPage /></ProtectedAdminPage>} />
        <Route path="orders" element={<ProtectedAdminPage requiredPermissions={['orders.view']}><OrdersPage /></ProtectedAdminPage>} />
        <Route path="orders/:id" element={<ProtectedAdminPage requiredPermissions={['orders.view']}><OrderShowPage /></ProtectedAdminPage>} />
        <Route path="refunds" element={<ProtectedAdminPage requiredPermissions={['refunds.manage']}><RefundsPage /></ProtectedAdminPage>} />
        <Route path="shipments" element={<ProtectedAdminPage requiredPermissions={['orders.manage']}><ShipmentsPage /></ProtectedAdminPage>} />
        <Route path="catalog" element={<ProtectedAdminPage requiredPermissions={['catalog.view', 'catalog.manage']} anyPermission><CatalogPage /></ProtectedAdminPage>} />
        <Route path="catalog/new" element={<ProtectedAdminPage requiredPermissions={['catalog.manage']}><ProductCreatePage /></ProtectedAdminPage>} />
        <Route path="catalog/:id/edit" element={<ProtectedAdminPage requiredPermissions={['catalog.manage']}><ProductEditPage /></ProtectedAdminPage>} />
        <Route path="categories" element={<ProtectedAdminPage requiredPermissions={['catalog.manage']}><CategoriesPage /></ProtectedAdminPage>} />
        <Route path="users" element={<ProtectedAdminPage requiredPermissions={['users.view']}><UsersPage /></ProtectedAdminPage>} />
        <Route path="users/:id" element={<ProtectedAdminPage requiredPermissions={['users.view']}><UserShowPage /></ProtectedAdminPage>} />
        <Route path="roles" element={<ProtectedAdminPage requiredRoles={['admin', 'root', 'administrator']}><RolesPage /></ProtectedAdminPage>} />
        <Route path="settings" element={<ProtectedAdminPage requiredPermissions={['settings.manage']} requiredRoles={['admin', 'root', 'administrator']} anyPermission><SettingsPage /></ProtectedAdminPage>} />
        <Route path="store-settings" element={<ProtectedAdminPage requiredPermissions={['settings.manage']} requiredRoles={['admin', 'root', 'administrator']} anyPermission><StoreSettingsPage /></ProtectedAdminPage>} />
        <Route path="tax-shipping" element={<ProtectedAdminPage requiredPermissions={['settings.manage']} requiredRoles={['admin', 'root', 'administrator']} anyPermission><TaxShippingSettingsPage /></ProtectedAdminPage>} />
        <Route path="theme" element={<ProtectedAdminPage requiredPermissions={['settings.manage']}><ThemeSettingsPage /></ProtectedAdminPage>} />
        <Route path="webhooks" element={<ProtectedAdminPage requiredPermissions={['webhooks.manage']}><WebhooksPage /></ProtectedAdminPage>} />
        <Route path="audit" element={<ProtectedAdminPage requiredRoles={['admin', 'root', 'administrator']}><AuditLogsPage /></ProtectedAdminPage>} />
        <Route path="reports" element={<ProtectedAdminPage><ReportsPage /></ProtectedAdminPage>} />
        <Route path="ai" element={<ProtectedAdminPage><AIToolsPage /></ProtectedAdminPage>} />
        <Route path="ai/settings" element={<ProtectedAdminPage requiredRoles={['admin', 'root', 'administrator']}><AISettingsPage /></ProtectedAdminPage>} />
        <Route path="security" element={<ProtectedAdminPage requiredRoles={['admin', 'root', 'administrator']}><SecurityPage /></ProtectedAdminPage>} />
        <Route path="marketing" element={<ProtectedAdminPage requiredPermissions={['marketing.manage']}><MarketingPage /></ProtectedAdminPage>} />
        <Route path="coupons" element={<ProtectedAdminPage requiredPermissions={['marketing.manage']}><CouponsPage /></ProtectedAdminPage>} />
        <Route path="email-templates" element={<ProtectedAdminPage><EmailTemplatesPage /></ProtectedAdminPage>} />
        <Route path="countries" element={<ProtectedAdminPage><CountriesPage /></ProtectedAdminPage>} />
        <Route path="schema" element={<ProtectedAdminPage requiredRoles={['admin', 'root', 'administrator']}><SchemaPage /></ProtectedAdminPage>} />
        <Route path="invoices/:orderId" element={<ProtectedAdminPage requiredPermissions={['orders.view']}><InvoiceGeneratorPage /></ProtectedAdminPage>} />
        <Route path="support/tickets" element={<ProtectedAdminPage><SupportTicketsPage /></ProtectedAdminPage>} />
        <Route path="support/tickets/:id" element={<ProtectedAdminPage><SupportTicketDetailsPage /></ProtectedAdminPage>} />
      </Routes>
    </AdminLayout>
  );
}

