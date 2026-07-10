import {
    Home,
    Shield,
    HelpCircle
} from 'lucide-react';

/**
 * Config-driven navigation. Add your pages here; they render in Sidebar.tsx.
 * - requiredRoles limits visibility (omit = visible to everyone signed in)
 * - children creates an expandable submenu, e.g.:
 *     {
 *         id: 'reports',
 *         label: 'Reports',
 *         icon: <BarChart3 size={20} />,
 *         children: [
 *             { id: 'monthly', label: 'Monthly', path: '/reports/monthly', icon: <Calendar size={18} /> }
 *         ]
 *     }
 */
export interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    path?: string;
    requiredRoles?: string[]; // Only show to users with these roles
    children?: {
        id: string;
        label: string;
        path: string;
        icon?: React.ReactNode;
        requiredRoles?: string[];
    }[];
}

export const menuItems: MenuItem[] = [
    {
        id: 'home',
        label: 'Home',
        icon: <Home size={20} />,
        path: '/'
    },
    {
        id: 'user-management',
        label: 'User Management',
        icon: <Shield size={20} />,
        path: '/users',
        requiredRoles: ['admin'] // Only admins can manage users
    },
];

export const bottomMenuItems: MenuItem[] = [
    {
        id: 'help',
        label: 'Help & Support',
        icon: <HelpCircle size={20} />,
        path: '/help'
    },
];
