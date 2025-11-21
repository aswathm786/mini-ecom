/**
 * Route Definitions
 * 
 * Defines all application routes using React Router v6.
 */

import { Routes, Route } from 'react-router-dom';
import { lazy } from 'react';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccountPage } from './pages/AccountPage';
import { CartPage } from './pages/CartPage';
import { ProductPage } from './pages/ProductPage';
import { ProductListPage } from './pages/ProductListPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { TwoFAChallengePage } from './pages/TwoFAChallengePage';
import { OTPLoginPage } from './pages/OTPLoginPage';
import { ProtectedAdminRoute } from './components/routing/ProtectedAdminRoute';

const AdminApp = lazy(() => import('./admin/AdminApp'));

export const routes = (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/categories" element={<CategoriesPage />} />
    <Route path="/products" element={<ProductListPage />} />
    <Route path="/product/:slug" element={<ProductPage />} />
    <Route path="/search" element={<SearchResultsPage />} />
    <Route path="/cart" element={<CartPage />} />
    <Route path="/checkout" element={<CheckoutPage />} />
    <Route path="/order/:id/confirmation" element={<OrderConfirmationPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/login/otp" element={<OTPLoginPage />} />
    <Route path="/admin/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/2fa-challenge" element={<TwoFAChallengePage />} />
    <Route path="/password/forgot" element={<ForgotPasswordPage />} />
    <Route path="/password/reset" element={<ResetPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/account/*" element={<AccountPage />} />
    <Route
      path="/admin/*"
      element={
        <ProtectedAdminRoute>
          <AdminApp />
        </ProtectedAdminRoute>
      }
    />
  </Routes>
);
