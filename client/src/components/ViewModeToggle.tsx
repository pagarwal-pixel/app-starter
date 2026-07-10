import { Eye } from 'lucide-react';
import { useViewMode } from '../viewMode';
import type { User } from '../api';

type Role = User['role'];

const ROLE_OPTIONS: { id: Role; label: string; description: string }[] = [
    { id: 'admin', label: 'Admin', description: 'Full access' },
    { id: 'internal', label: 'Internal', description: 'Builder view' },
    { id: 'external', label: 'External', description: 'Client view' }
];

export default function ViewModeToggle() {
    const { actualUser, previewRole, effectiveRole, setPreviewRole, resetPreview } = useViewMode();

    // Only admins can use the view toggle
    if (!actualUser || actualUser.role !== 'admin') return null;

    const activeRole = previewRole || actualUser.role;

    const handleSelect = (role: Role) => {
        if (role === actualUser.role) {
            resetPreview();
            return;
        }
        setPreviewRole(role);
    };

    const getLabel = (role: Role | null) => ROLE_OPTIONS.find(r => r.id === role)?.label || role;

    return (
        <div className="flex justify-end mb-4">
            <div className="flex flex-wrap items-center gap-3 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm rounded-full px-4 py-2 text-slate-700">
                <div className="hidden md:flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Eye size={14} />
                    <span>View as</span>
                </div>
                <div className="flex gap-2">
                    {ROLE_OPTIONS.map((role) => {
                        const isActive = activeRole === role.id;
                        return (
                            <button
                                key={role.id}
                                onClick={() => handleSelect(role.id)}
                                className={`text-sm px-3 py-1.5 rounded-full border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${isActive
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700'
                                    }`}
                                title={role.description}
                            >
                                {role.label}
                            </button>
                        );
                    })}
                </div>
                {previewRole && (
                    <div className="hidden sm:flex text-[11px] text-slate-500 border-l border-slate-200 pl-3">
                        Original: Admin • Viewing as {getLabel(effectiveRole)}
                    </div>
                )}
            </div>
        </div>
    );
}
