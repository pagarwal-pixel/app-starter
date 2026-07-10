// Re-export from api.ts for backward compatibility
export { logout, getCurrentUser } from './api';

export function useAuth() {
    const user = localStorage.getItem('user');
    return Boolean(user);
}
