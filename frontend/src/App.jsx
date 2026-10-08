import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ToastContainer } from './components/common/Toast';
import { Sparkles, User, Store, ShieldCheck } from 'lucide-react';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';
import { PublicShopsPage } from './pages/public/PublicShopsPage';
import { PublicProductsPage } from './pages/public/PublicProductsPage';
import { ProductDetailPage } from './pages/public/ProductDetailPage';
import { ShopProfilePage } from './pages/public/ShopProfilePage';

// Customer Pages
import { DiscoverFeed } from './pages/customer/DiscoverFeed';
import { MyRequestsPage } from './pages/customer/MyRequestsPage';
import { ReservationsPage } from './pages/customer/ReservationsPage';
import { CustomerChatPage } from './pages/customer/CustomerChatPage';
import { CustomerProfilePage } from './pages/customer/CustomerProfilePage';
import { GoalPlannerPage } from './pages/customer/GoalPlannerPage';
import { DiagnosticSearchPage } from './pages/customer/DiagnosticSearchPage';

// Shopkeeper Pages
import { ShopDashboardPage } from './pages/shopkeeper/ShopDashboardPage';
import { ProductInventoryPage } from './pages/shopkeeper/ProductInventoryPage';
import { ShopRequestsInboxPage } from './pages/shopkeeper/ShopRequestsInboxPage';
import { ShopReservationsPage } from './pages/shopkeeper/ShopReservationsPage';
import { ShopMessagesPage } from './pages/shopkeeper/ShopMessagesPage';
import { ShopProfileEditPage } from './pages/shopkeeper/ShopProfileEditPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { ShopVerificationPage } from './pages/admin/ShopVerificationPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { CategoryAdminPage } from './pages/admin/CategoryAdminPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminGeoSalesMapPage } from './pages/admin/AdminGeoSalesMapPage';

// Enhanced Seamless Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles, targetPersona = 'customer' }) => {
  const { isAuthenticated, role, loading, demoLogin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-semibold text-slate-500">
        Loading QuickKart...
      </div>
    );
  }

  // If user is not logged in or doesn't have the right role, allow instant 1-click persona activation banner
  const hasAccess = isAuthenticated && (!allowedRoles || allowedRoles.includes(role));

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-500 text-slate-900 px-4 py-3 text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-sm border-b border-amber-600">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-slate-900" />
            <span>
              You are viewing a <strong>{allowedRoles?.join(' / ').toUpperCase()}</strong> protected view. Click below to activate this persona:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => demoLogin(targetPersona)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all"
            >
              ⚡ Switch to {targetPersona.toUpperCase()} Mode
            </button>
            <Link to="/login" className="text-slate-900 underline font-semibold">
              Or Sign In
            </Link>
          </div>
        </div>

        {/* Still render children in demo-preview mode */}
        {children}
      </div>
    );
  }

  return children;
};

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <main className="flex-1">
        <Routes>
          {/* Public Routes (Chapter 10.4) */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin']} targetPersona="customer">
                <LandingPage />
              </ProtectedRoute>
            }
          />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/shops" element={<PublicShopsPage />} />
          <Route path="/shops/:id" element={<ShopProfilePage />} />
          <Route path="/products" element={<PublicProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />

          {/* Customer Routes (Chapter 10.4) */}
          <Route path="/customer/dashboard" element={<DiscoverFeed />} />
          <Route path="/customer/search" element={<DiscoverFeed />} />
          <Route path="/customer/goal-planner" element={<GoalPlannerPage />} />
          <Route path="/customer/diagnostics" element={<DiagnosticSearchPage />} />
          <Route
            path="/customer/requests"
            element={
              <ProtectedRoute allowedRoles={['customer']} targetPersona="customer">
                <MyRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/reservations"
            element={
              <ProtectedRoute allowedRoles={['customer']} targetPersona="customer">
                <ReservationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/messages"
            element={
              <ProtectedRoute allowedRoles={['customer']} targetPersona="customer">
                <CustomerChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/profile"
            element={
              <ProtectedRoute allowedRoles={['customer']} targetPersona="customer">
                <CustomerProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Shopkeeper Routes (Chapter 10.4) */}
          <Route
            path="/shop/dashboard"
            element={
              <ProtectedRoute allowedRoles={['shopkeeper']} targetPersona="sharma">
                <ShopDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shop/products"
            element={
              <ProtectedRoute allowedRoles={['shopkeeper']} targetPersona="sharma">
                <ProductInventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shop/products/add"
            element={
              <ProtectedRoute allowedRoles={['shopkeeper']} targetPersona="sharma">
                <ProductInventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shop/requests"
            element={
              <ProtectedRoute allowedRoles={['shopkeeper']} targetPersona="sharma">
                <ShopRequestsInboxPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shop/reservations"
            element={
              <ProtectedRoute allowedRoles={['shopkeeper']} targetPersona="sharma">
                <ShopReservationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shop/messages"
            element={
              <ProtectedRoute allowedRoles={['shopkeeper']} targetPersona="sharma">
                <ShopMessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shop/profile"
            element={
              <ProtectedRoute allowedRoles={['shopkeeper']} targetPersona="sharma">
                <ShopProfileEditPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes (Chapter 10.4) */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']} targetPersona="admin">
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/map"
            element={
              <ProtectedRoute allowedRoles={['admin']} targetPersona="admin">
                <AdminGeoSalesMapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/shops"
            element={
              <ProtectedRoute allowedRoles={['admin']} targetPersona="admin">
                <ShopVerificationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']} targetPersona="admin">
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute allowedRoles={['admin']} targetPersona="admin">
                <AdminProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute allowedRoles={['admin']} targetPersona="admin">
                <CategoryAdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['admin']} targetPersona="admin">
                <AdminReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}
