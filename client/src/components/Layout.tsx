import Sidebar from './Sidebar';
import ViewModeToggle from './ViewModeToggle';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[hsl(var(--color-surface))]">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Content Area - Fixed margin for sidebar */}
            <div
                className="transition-all duration-300 ml-[260px]"
            >
                {/* Page Content */}
                <main className="p-8 min-h-screen">
                    <ViewModeToggle />
                    {children}
                </main>
            </div>
        </div>
    );
}
