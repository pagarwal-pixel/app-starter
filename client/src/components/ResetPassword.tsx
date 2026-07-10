import { useState, useEffect } from 'react';
import { resetPassword } from '../api';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setError('Invalid or missing reset token');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        try {
            const result = await resetPassword(token!, password);
            setMessage(result.message);
            setSuccess(true);
            // Redirect to login after 3 seconds
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-transparent">
            <div className="glass-card p-8 rounded-xl w-96" style={{ backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.9)' }}>
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Set New Password</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {success ? 'Your password has been reset!' : 'Create a new password for your account'}
                    </p>
                </div>

                {!success ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                placeholder="Enter new password"
                                minLength={6}
                                required
                                disabled={!token}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                placeholder="Confirm new password"
                                minLength={6}
                                required
                                disabled={!token}
                            />
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-200">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !token}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                ) : (
                    <div className="text-center">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <svg className="w-12 h-12 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-green-800">{message}</p>
                            <p className="text-green-600 text-sm mt-2">Redirecting to login...</p>
                        </div>
                    </div>
                )}

                <div className="mt-4 text-center">
                    <Link
                        to="/login"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        ← Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
