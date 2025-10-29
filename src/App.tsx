import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Groups } from './components/Groups';
import { Products } from './components/Products';
import { ProductCard } from './components/ProductCard';
import { Orders } from './components/Orders';
import { OrderCard } from './components/OrderCard';
import { Customers } from './components/Customers';
import { CalendarView } from './components/CalendarView';
import { Reports } from './components/Reports';
import { Audit } from './components/Audit';
import { Settings } from './components/Settings';
import { canAccessPage, useRolePermissions } from './utils/roles';
import { MobileNav } from './components/MobileNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Toaster } from './components/ui/sonner';
import { registerServiceWorker } from './utils/pwa';

function AppContent() {
  const { user, loading } = useAuth();
  const permissions = useRolePermissions(user);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Register service worker for PWA
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Set initial page based on user role and permissions
  useEffect(() => {
    if (user) {
      // Find first accessible page for the user
      const preferredPages = ['dashboard', 'orders', 'calendar', 'products', 'customers', 'reports'];
      const firstAccessible = preferredPages.find(page => canAccessPage(user, page));
      if (firstAccessible && !canAccessPage(user, currentPage)) {
        setCurrentPage(firstAccessible);
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedProductId(null);
    setSelectedOrderId(null);
    setIsCreatingOrder(false);
  };

  const handleViewProduct = (productId: number) => {
    setSelectedProductId(productId);
  };

  const handleBackToProducts = () => {
    setSelectedProductId(null);
  };

  const handleViewOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
  };

  const handleCreateOrder = () => {
    setIsCreatingOrder(true);
    setSelectedOrderId(null);
  };

  const handleBackToOrders = () => {
    setSelectedOrderId(null);
    setIsCreatingOrder(false);
  };

  const renderContent = () => {
    // Product detail view
    if (selectedProductId !== null) {
      return <ProductCard productId={selectedProductId} onBack={handleBackToProducts} />;
    }

    // Order detail/create view
    if (selectedOrderId !== null || isCreatingOrder) {
      return <OrderCard orderId={selectedOrderId} onBack={handleBackToOrders} />;
    }

    // Check page access
    if (!canAccessPage(user, currentPage)) {
      // Redirect to first available page
      const availablePages = ['orders', 'calendar', 'products', 'customers', 'reports', 'dashboard'];
      const firstAvailable = availablePages.find(page => canAccessPage(user, page));
      if (firstAvailable && firstAvailable !== currentPage) {
        setCurrentPage(firstAvailable);
      }
      return null;
    }

    // Main pages
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <Products onViewProduct={handleViewProduct} />;
      case 'groups':
        return <Groups />;
      case 'orders':
        return <Orders onViewOrder={handleViewOrder} onCreateOrder={handleCreateOrder} />;
      case 'customers':
        return <Customers />;
      case 'calendar':
        // For couriers, show Orders with calendar view; for others, show CalendarView
        return permissions.isCourierMode 
          ? <Orders onViewOrder={handleViewOrder} onCreateOrder={handleCreateOrder} initialViewMode="calendar" />
          : <CalendarView />;
      case 'reports':
        return <Reports />;
      case 'audit':
        return <Audit />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  // All users get the same layout structure
  return (
    <>
      <div className="hidden md:block">
        <Layout currentPage={currentPage} onNavigate={handleNavigate}>
          {renderContent()}
        </Layout>
      </div>
      <div className="md:hidden">
        <div className="min-h-screen bg-gray-50">
          {renderContent()}
        </div>
      </div>
      <MobileNav currentPage={currentPage} onNavigate={handleNavigate} />
      <OfflineIndicator />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
      
      {/* PWA Meta Tags */}
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#2563EB" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CRM" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
    </AuthProvider>
  );
}
