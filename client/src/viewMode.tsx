import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { USER_CHANGE_EVENT, USER_STORAGE_KEY, getCurrentUser } from './api';
import type { User } from './api';

type Role = User['role'];

interface StoredPreview {
    userId: number;
    role: Role;
}

interface ViewModeContextValue {
    actualUser: User | null;
    viewUser: User | null; // User object with role replaced by effective role
    effectiveRole: Role | null;
    previewRole: Role | null;
    setPreviewRole: (role: Role) => void;
    resetPreview: () => void;
}

const VIEW_MODE_STORAGE_KEY = 'viewModeOverride';
const VALID_ROLES: Role[] = ['admin', 'internal', 'external'];

function readStoredPreview(user: User | null): Role | null {
    if (!user || user.role !== 'admin') return null;

    const raw = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as StoredPreview;
        if (parsed.userId === user.id && VALID_ROLES.includes(parsed.role)) {
            return parsed.role;
        }
    } catch {
        localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
        return null;
    }

    localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
    return null;
}

const ViewModeContext = createContext<ViewModeContextValue | undefined>(undefined);

export function ViewModeProvider({ children }: { children: ReactNode }) {
    const [actualUser, setActualUser] = useState<User | null>(() => getCurrentUser());
    const [previewRole, setPreviewRoleState] = useState<Role | null>(() =>
        readStoredPreview(getCurrentUser())
    );
    const currentUser = actualUser;

    useEffect(() => {
        const syncUserState = () => {
            const user = getCurrentUser();
            setActualUser(user);
            setPreviewRoleState(readStoredPreview(user));
        };

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === USER_STORAGE_KEY || e.key === null) {
                syncUserState();
            }
        };

        syncUserState();
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener(USER_CHANGE_EVENT, syncUserState);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener(USER_CHANGE_EVENT, syncUserState);
        };
    }, []);

    const effectiveRole: Role | null = useMemo(() => {
        if (!currentUser) return null;
        if (currentUser.role !== 'admin') return currentUser.role;
        return previewRole || currentUser.role;
    }, [currentUser, previewRole]);

    const viewUser: User | null = useMemo(() => {
        if (!currentUser) return null;
        if (!effectiveRole) return currentUser;
        return { ...currentUser, role: effectiveRole };
    }, [currentUser, effectiveRole]);

    const setPreviewRole = (role: Role) => {
        if (!currentUser || currentUser.role !== 'admin') return;

        // Reset when selecting the original role
        if (role === currentUser.role) {
            setPreviewRoleState(null);
            localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
            return;
        }

        setPreviewRoleState(role);
        const payload: StoredPreview = { userId: currentUser.id, role };
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, JSON.stringify(payload));
    };

    const resetPreview = () => {
        setPreviewRoleState(null);
        localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
    };

    const value: ViewModeContextValue = {
        actualUser: currentUser,
        viewUser,
        effectiveRole,
        previewRole,
        setPreviewRole,
        resetPreview
    };

    return (
        <ViewModeContext.Provider value={value}>
            {children}
        </ViewModeContext.Provider>
    );
}

export function useViewMode() {
    const ctx = useContext(ViewModeContext);
    if (!ctx) {
        throw new Error('useViewMode must be used within a ViewModeProvider');
    }
    return ctx;
}
