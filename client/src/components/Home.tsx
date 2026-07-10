import { Rocket, Users, LifeBuoy, ShieldCheck } from 'lucide-react';
import { APP_NAME } from '../config';
import { useViewMode } from '../viewMode';

/**
 * PLACEHOLDER home page - replace with your dashboard / main screen.
 */
export default function Home() {
    const { viewUser } = useViewMode();

    const features = [
        { icon: <ShieldCheck size={20} className="text-blue-600" />, title: 'Auth & Roles', text: 'JWT login, admin/internal/external roles, seed admin, password reset via email.' },
        { icon: <Users size={20} className="text-blue-600" />, title: 'User Management', text: 'Admins create users and grant per-resource access to external users at /users.' },
        { icon: <LifeBuoy size={20} className="text-blue-600" />, title: 'Help & Support', text: 'Ticket form with screenshots, delivered via email and optional GitHub issues at /help.' },
    ];

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Welcome{viewUser ? `, ${viewUser.username}` : ''}</h1>
                <p className="text-sm text-gray-500">This is the {APP_NAME} skeleton. Build your app here.</p>
            </div>

            <div className="glass-card rounded-xl p-6 mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/20 shrink-0">
                    <Rocket size={24} className="text-white" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Start building</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Replace this page with your dashboard, add routes in <code className="bg-slate-100 px-1 rounded">App.tsx</code>,
                        register nav items in <code className="bg-slate-100 px-1 rounded">nav.tsx</code>, and swap the placeholder
                        &quot;resources&quot; entity on the server for your real domain tables.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {features.map((f) => (
                    <div key={f.title} className="glass-card rounded-xl p-5">
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">{f.icon}</div>
                        <h3 className="text-sm font-semibold text-slate-700">{f.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{f.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
