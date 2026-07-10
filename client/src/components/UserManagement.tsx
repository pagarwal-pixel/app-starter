import { useState, useEffect } from 'react';
import {
    getUsers, createUser, updateUser, deleteUser,
    getUserAccess, grantResourceAccess, revokeResourceAccess
} from '../api';
import type { User } from '../api';
import { useViewMode } from '../viewMode';

interface UserWithMeta extends User {
    created_by_username?: string;
}

interface ResourceAccess {
    id: number;
    resource_id: number;
    resource_name: string;
    granted_by_username: string;
    granted_at: string;
}

interface ResourceOption {
    id: number;
    name: string;
}

export default function UserManagement() {
    const [users, setUsers] = useState<UserWithMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserWithMeta | null>(null);
    const [accessData, setAccessData] = useState<{ access: ResourceAccess[], allResources: ResourceOption[] } | null>(null);

    const { actualUser } = useViewMode();
    const currentUser = actualUser;

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        role: 'external' as string
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await getUsers();
            setUsers(data.users);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createUser(formData);
            setShowCreateModal(false);
            setFormData({ email: '', username: '', password: '', role: 'external' });
            loadUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create user');
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        try {
            const updateData: any = {};
            if (formData.email && formData.email !== selectedUser.email) updateData.email = formData.email;
            if (formData.username && formData.username !== selectedUser.username) updateData.username = formData.username;
            if (formData.password) updateData.password = formData.password;
            if (formData.role !== selectedUser.role) updateData.role = formData.role;

            await updateUser(selectedUser.id, updateData);
            setShowEditModal(false);
            setSelectedUser(null);
            loadUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update user');
        }
    };

    const handleDelete = async (user: UserWithMeta) => {
        if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) return;

        try {
            await deleteUser(user.id);
            loadUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete user');
        }
    };

    const handleToggleActive = async (user: UserWithMeta) => {
        try {
            await updateUser(user.id, { is_active: !user.is_active });
            loadUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update user status');
        }
    };

    const openEditModal = (user: UserWithMeta) => {
        setSelectedUser(user);
        setFormData({
            email: user.email,
            username: user.username,
            password: '',
            role: user.role
        });
        setShowEditModal(true);
    };

    const openAccessModal = async (user: UserWithMeta) => {
        setSelectedUser(user);
        try {
            const data = await getUserAccess(user.id);
            setAccessData(data);
            setShowAccessModal(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load access data');
        }
    };

    const handleGrantAccess = async (resourceId: number) => {
        if (!selectedUser) return;
        try {
            await grantResourceAccess(selectedUser.id, resourceId);
            const data = await getUserAccess(selectedUser.id);
            setAccessData(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to grant access');
        }
    };

    const handleRevokeAccess = async (resourceId: number) => {
        if (!selectedUser) return;
        try {
            await revokeResourceAccess(selectedUser.id, resourceId);
            const data = await getUserAccess(selectedUser.id);
            setAccessData(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to revoke access');
        }
    };

    const getRoleBadge = (role: string) => {
        const colors: Record<string, string> = {
            admin: 'bg-red-100 text-red-800',
            internal: 'bg-blue-100 text-blue-800',
            external: 'bg-green-100 text-green-800'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role] || 'bg-gray-100'}`}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
                    <p className="text-sm text-gray-500">Manage users and their access permissions</p>
                </div>
                <button
                    onClick={() => { setFormData({ email: '', username: '', password: '', role: 'external' }); setShowCreateModal(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add User
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                    <button onClick={() => setError('')} className="float-right text-red-700 hover:text-red-900">&times;</button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.id} className={!user.is_active ? 'opacity-50' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <span className="text-blue-600 font-medium">
                                                {user.username.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getRoleBadge(user.role)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded-full text-xs ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <button
                                        onClick={() => openEditModal(user)}
                                        className="text-blue-600 hover:text-blue-900"
                                    >
                                        Edit
                                    </button>
                                    {user.role === 'external' && (
                                        <button
                                            onClick={() => openAccessModal(user)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            Access
                                        </button>
                                    )}
                                    {user.id !== currentUser?.id && (
                                        <>
                                            <button
                                                onClick={() => handleToggleActive(user)}
                                                className={user.is_active ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}
                                            >
                                                {user.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Create New User</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                    minLength={6}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                >
                                    <option value="external">External (Client - View Only)</option>
                                    <option value="internal">Internal (Full Access)</option>
                                    <option value="admin">Admin (Full Access + User Management)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Edit User: {selectedUser.username}</h2>
                        <form onSubmit={handleEdit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">New Password (leave blank to keep current)</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                >
                                    <option value="external">External (Client - View Only)</option>
                                    <option value="internal">Internal (Full Access)</option>
                                    <option value="admin">Admin (Full Access + User Management)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setShowEditModal(false); setSelectedUser(null); }}
                                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Resource Access Modal */}
            {showAccessModal && selectedUser && accessData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4">Resource Access: {selectedUser.username}</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Grant or revoke access to resources for this external user.
                        </p>

                        {accessData.access.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Current Access</h3>
                                <div className="space-y-2">
                                    {accessData.access.map(access => (
                                        <div key={access.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                            <span className="text-sm">{access.resource_name}</span>
                                            <button
                                                onClick={() => handleRevokeAccess(access.resource_id)}
                                                className="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                Revoke
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Grant New Access</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {accessData.allResources
                                    .filter(r => !accessData.access.some(a => a.resource_id === r.id))
                                    .map(resource => (
                                        <div key={resource.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                            <span className="text-sm">{resource.name}</span>
                                            <button
                                                onClick={() => handleGrantAccess(resource.id)}
                                                className="text-blue-600 hover:text-blue-800 text-sm"
                                            >
                                                Grant
                                            </button>
                                        </div>
                                    ))}
                                {accessData.allResources.filter(r => !accessData.access.some(a => a.resource_id === r.id)).length === 0 && (
                                    <p className="text-sm text-gray-500 italic">No additional resources available</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => { setShowAccessModal(false); setSelectedUser(null); setAccessData(null); }}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
