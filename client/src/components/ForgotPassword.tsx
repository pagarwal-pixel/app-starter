import { useState } from 'react';
import { forgotPassword } from '../api';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            const result = await forgotPassword(email);
            setMessage(result.message);
            setSubmitted(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to process request');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-transparent">
            <div className="glass-card p-8 rounded-xl w-96" style={{ backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.9)' }}>
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Reset Password</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {submitted
                            ? 'Check your email for reset instructions'
                            : 'Enter your email to receive a reset link'}
                    </p>
                </div>

                {!submitted ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                placeholder="your.email@example.com"
                                required
                            />
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-200">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                ) : (
                    <div className="text-center">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <svg className="w-12 h-12 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <p className="text-green-800">{message}</p>
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
