import { User } from '../components/AuthContext';

export type Role = 'admin' | 'sales_manager' | 'warehouse' | 'accountant' | 'courier';

export interface RolePermissions {
  // Навигация
  canViewOrders: boolean;
  canViewCalendar: boolean;
  canViewProducts: boolean;
  canViewCustomers: boolean;
  canViewReports: boolean;
  canViewSettings: boolean;
  canViewGroups: boolean;
  canViewDashboard: boolean;
  
  // Заказы
  canCreateOrder: boolean;
  canEditOrder: boolean;
  canDeleteOrder: boolean;
  canAssignCourier: boolean;
  canUpdateDeliveryStatus: boolean;
  
  // Товары
  canCreateProduct: boolean;
  canEditProduct: boolean;
  canDeleteProduct: boolean;
  canManageStock: boolean;
  canViewPurchasePrice: boolean;
  
  // Клиенты
  canCreateCustomer: boolean;
  canEditCustomer: boolean;
  canDeleteCustomer: boolean;
  
  // Отчёты
  canViewSalesReports: boolean;
  canViewMarginReports: boolean;
  canViewCourierReports: boolean;
  
  // Специальные возможности
  canViewAudit: boolean;
  canManageUsers: boolean;
  
  // Режим отображения
  isCourierMode: boolean;
}

export function getRolePermissions(role: Role | string): RolePermissions {
  // Default to courier if invalid role
  const validRoles: Role[] = ['admin', 'sales_manager', 'warehouse', 'accountant', 'courier'];
  const safeRole: Role = validRoles.includes(role as Role) ? (role as Role) : 'courier';
  
  const permissions: Record<Role, RolePermissions> = {
    admin: {
      canViewOrders: true,
      canViewCalendar: true,
      canViewProducts: true,
      canViewCustomers: true,
      canViewReports: true,
      canViewSettings: true,
      canViewGroups: true,
      canViewDashboard: true,
      canCreateOrder: true,
      canEditOrder: true,
      canDeleteOrder: true,
      canAssignCourier: true,
      canUpdateDeliveryStatus: false,
      canCreateProduct: true,
      canEditProduct: true,
      canDeleteProduct: true,
      canManageStock: true,
      canViewPurchasePrice: true,
      canCreateCustomer: true,
      canEditCustomer: true,
      canDeleteCustomer: true,
      canViewSalesReports: true,
      canViewMarginReports: true,
      canViewCourierReports: true,
      canViewAudit: true,
      canManageUsers: true,
      isCourierMode: false,
    },
    
    sales_manager: {
      canViewOrders: true,
      canViewCalendar: true,
      canViewProducts: true,
      canViewCustomers: true,
      canViewReports: true,
      canViewSettings: true,
      canViewGroups: false,
      canViewDashboard: true,
      canCreateOrder: true,
      canEditOrder: true,
      canDeleteOrder: false,
      canAssignCourier: true,
      canUpdateDeliveryStatus: false,
      canCreateProduct: false,
      canEditProduct: false,
      canDeleteProduct: false,
      canManageStock: false,
      canViewPurchasePrice: false,
      canCreateCustomer: true,
      canEditCustomer: true,
      canDeleteCustomer: false,
      canViewSalesReports: true,
      canViewMarginReports: false,
      canViewCourierReports: true,
      canViewAudit: true,
      canManageUsers: false,
      isCourierMode: false,
    },
    
    warehouse: {
      canViewOrders: true,
      canViewCalendar: false,
      canViewProducts: true,
      canViewCustomers: false,
      canViewReports: false,
      canViewSettings: true,
      canViewGroups: true,
      canViewDashboard: false,
      canCreateOrder: false,
      canEditOrder: false,
      canDeleteOrder: false,
      canAssignCourier: false,
      canUpdateDeliveryStatus: false,
      canCreateProduct: true,
      canEditProduct: true,
      canDeleteProduct: false,
      canManageStock: true,
      canViewPurchasePrice: true,
      canCreateCustomer: false,
      canEditCustomer: false,
      canDeleteCustomer: false,
      canViewSalesReports: false,
      canViewMarginReports: false,
      canViewCourierReports: false,
      canViewAudit: true,
      canManageUsers: false,
      isCourierMode: false,
    },
    
    accountant: {
      canViewOrders: true,
      canViewCalendar: false,
      canViewProducts: true,
      canViewCustomers: true,
      canViewReports: true,
      canViewSettings: true,
      canViewGroups: false,
      canViewDashboard: true,
      canCreateOrder: false,
      canEditOrder: false,
      canDeleteOrder: false,
      canAssignCourier: false,
      canUpdateDeliveryStatus: false,
      canCreateProduct: false,
      canEditProduct: true,
      canDeleteProduct: false,
      canManageStock: false,
      canViewPurchasePrice: true,
      canCreateCustomer: false,
      canEditCustomer: false,
      canDeleteCustomer: false,
      canViewSalesReports: true,
      canViewMarginReports: true,
      canViewCourierReports: true,
      canViewAudit: true,
      canManageUsers: false,
      isCourierMode: false,
    },
    
    courier: {
      canViewOrders: true,
      canViewCalendar: true,
      canViewProducts: false,
      canViewCustomers: false,
      canViewReports: false,
      canViewSettings: true,
      canViewGroups: false,
      canViewDashboard: false,
      canCreateOrder: false,
      canEditOrder: false,
      canDeleteOrder: false,
      canAssignCourier: false,
      canUpdateDeliveryStatus: true,
      canCreateProduct: false,
      canEditProduct: false,
      canDeleteProduct: false,
      canManageStock: false,
      canViewPurchasePrice: false,
      canCreateCustomer: false,
      canEditCustomer: false,
      canDeleteCustomer: false,
      canViewSalesReports: false,
      canViewMarginReports: false,
      canViewCourierReports: false,
      canViewAudit: false,
      canManageUsers: false,
      isCourierMode: true,
    },
  };
  
  return permissions[safeRole];
}

export function useRolePermissions(user: User | null): RolePermissions {
  if (!user) {
    return getRolePermissions('courier'); // Минимальные права
  }
  
  return getRolePermissions(user.role as Role);
}

export function canAccessPage(user: User | null, page: string): boolean {
  if (!user) return false;
  
  const permissions = getRolePermissions(user.role as Role);
  
  const pagePermissions: Record<string, keyof RolePermissions> = {
    orders: 'canViewOrders',
    calendar: 'canViewCalendar',
    products: 'canViewProducts',
    customers: 'canViewCustomers',
    reports: 'canViewReports',
    settings: 'canViewSettings',
    groups: 'canViewGroups',
    dashboard: 'canViewDashboard',
    audit: 'canViewAudit',
  };
  
  const permission = pagePermissions[page];
  return permission ? permissions[permission] : false;
}
