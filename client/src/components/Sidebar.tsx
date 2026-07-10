import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../api';
import { useViewMode } from '../viewMode';
import { APP_NAME } from '../config';
import { menuItems, bottomMenuItems, type MenuItem } from '../nav';
declare const __APP_VERSION__: string;
import {
    LogOut,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Boxes
} from 'lucide-react';

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { viewUser, actualUser, previewRole, effectiveRole } = useViewMode();
    const [collapsed, setCollapsed] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
    const user = viewUser;

    // Auto-expand menus when their children are active
    useEffect(() => {
        const activeParents: string[] = [];
        menuItems.forEach(item => {
            if (item.children) {
                const hasActiveChild = item.children.some(child => location.pathname === child.path);
                if (hasActiveChild && !expandedMenus.includes(item.id)) {
                    activeParents.push(item.id);
                }
            }
        });
        if (activeParents.length > 0) {
            setExpandedMenus(prev => [...new Set([...prev, ...activeParents])]);
        }
    }, [location.pathname]);

    const toggleMenu = (menuId: string) => {
        setExpandedMenus(prev =>
            prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    const isActive = (path?: string) => {
        if (!path) return false;
        return location.pathname === path;
    };

    // Check if user has required role for a menu item
    const hasAccess = (item: MenuItem | { requiredRoles?: string[] }) => {
        if (!item.requiredRoles || item.requiredRoles.length === 0) return true;
        if (!user) return false;
        return item.requiredRoles.includes(user.role);
    };

    // Filter menu items by role
    const filteredMenuItems = menuItems.filter(hasAccess);

    const getRoleBadge = (role: string) => {
        const colors: Record<string, string> = {
            admin: 'bg-red-500/20 text-red-300',
            internal: 'bg-blue-500/20 text-blue-300',
            external: 'bg-green-500/20 text-green-300'
        };
        const labels: Record<string, string> = {
            admin: 'Admin',
            internal: 'Internal',
            external: 'Client'
        };
        return (
            <span className={`px-2 py-0.5 rounded text-xs ${colors[role] || ''}`}>
                {labels[role] || role}
            </span>
        );
    };

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            admin: 'Admin',
            internal: 'Internal',
            external: 'Client'
        };
        return labels[role] || role;
    };

    const renderMenuItem = (item: MenuItem) => {
        // Filter children by role as well
        const accessibleChildren = item.children?.filter(hasAccess);
        const hasChildren = accessibleChildren && accessibleChildren.length > 0;
        const isExpanded = expandedMenus.includes(item.id);
        const active = isActive(item.path);

        if (collapsed && hasChildren) {
            // In collapsed mode, show just the icon with a flyout
            return (
                <div key={item.id} className="relative group">
                    <button
                        onClick={() => !collapsed && toggleMenu(item.id)}
                        className={`w-full flex items-center justify-center p-3 my-1 rounded-lg sidebar-link ${active ? 'active' : ''
                            }`}
                        title={item.label}
                    >
                        {item.icon}
                    </button>
                    <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-50">
                        <div className="bg-slate-800 rounded-lg py-2 px-1 min-w-[180px] shadow-xl">
                            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {item.label}
                            </div>
                            {accessibleChildren?.map(child => (
                                <button
                                    key={child.id}
                                    onClick={() => navigate(child.path)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg"
                                >
                                    {child.icon}
                                    {child.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        if (hasChildren) {
            return (
                <div key={item.id}>
                    <button
                        onClick={() => toggleMenu(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 my-1 rounded-lg sidebar-link ${active ? 'active' : ''
                            }`}
                    >
                        {item.icon}
                        {!collapsed && (
                            <>
                                <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                                <ChevronDown
                                    size={16}
                                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                                        }`}
                                />
                            </>
                        )}
                    </button>
                    {!collapsed && isExpanded && (
                        <div className="submenu-enter ml-4 pl-4 border-l border-slate-600/50">
                            {accessibleChildren?.map(child => (
                                <button
                                    key={child.id}
                                    onClick={() => navigate(child.path)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 my-0.5 text-sm rounded-lg sidebar-link ${location.pathname === child.path ? 'active' : ''
                                        }`}
                                >
                                    {child.icon}
                                    <span>{child.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        // Simple menu item without children
        return (
            <button
                key={item.id}
                onClick={() => item.path && navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 my-1 rounded-lg sidebar-link ${active ? 'active' : ''
                    } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
            >
                {item.icon}
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
        );
    };

    return (
        <aside
            className={`sidebar fixed left-0 top-0 h-screen flex flex-col z-40 ${collapsed ? 'collapsed' : ''
                }`}
        >
            {/* Logo / Brand */}
            <div className="flex items-center h-16 px-4 border-b border-slate-700/50">
                <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <Boxes size={20} className="text-white" />
                    </div>
                    {!collapsed && (
                        <div>
                            <h1 className="text-lg font-bold text-white">{APP_NAME}</h1>
                            <div className="text-[10px] text-slate-400 font-mono -mt-1">
                                {__APP_VERSION__}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
                <div className="space-y-1">
                    {filteredMenuItems.map(renderMenuItem)}
                </div>
            </nav>

            {/* Bottom Navigation */}
            <div className="border-t border-slate-700/50 py-4 px-3">
                <div className="space-y-1">
                    {bottomMenuItems.filter(hasAccess).map(item => (
                        <button
                            key={item.id}
                            onClick={() => item.path && navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg sidebar-link ${collapsed ? 'justify-center' : ''
                                }`}
                            title={collapsed ? item.label : undefined}
                        >
                            {item.icon}
                            {!collapsed && <span className="text-sm">{item.label}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {/* User Section & Logout */}
            <div className="border-t border-slate-700/50 p-4">
                {!collapsed && actualUser && (
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center">
                            <span className="text-slate-300 font-medium text-sm">
                                {actualUser.username.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{actualUser.username}</p>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                    <span>Signed in:</span>
                                    {getRoleBadge(actualUser.role)}
                                </div>
                                {previewRole && (
                                    <span className="flex items-center gap-1 text-[11px] text-slate-200 bg-slate-700/60 px-2 py-1 rounded-full border border-slate-600/70">
                                        Viewing as {getRoleLabel(effectiveRole || previewRole)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                <button
                    onClick={logout}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors ${collapsed ? 'justify-center' : ''
                        }`}
                    title={collapsed ? 'Sign Out' : undefined}
                >
                    <LogOut size={18} />
                    {!collapsed && <span className="text-sm">Sign Out</span>}
                </button>
            </div>

            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-20 w-6 h-6 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-600 transition-colors shadow-lg"
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </aside>
    );
}
