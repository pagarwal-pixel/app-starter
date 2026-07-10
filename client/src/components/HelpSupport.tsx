import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
    AlertCircle,
    ArrowLeft,
    Bug,
    CheckCircle,
    ExternalLink,
    FileQuestion,
    Github,
    HelpCircle,
    Lightbulb,
    Loader2,
    Mail,
    MessageSquare,
    Paperclip,
    Send,
    X
} from 'lucide-react';

interface SupportStatus {
    github: {
        configured: boolean;
        repo: string | null;
    };
    email: {
        configured: boolean;
        supportEmail: string;
    };
}

interface SubmitResult {
    success: boolean;
    message: string;
    githubIssue?: {
        success: boolean;
        issueNumber: number;
        issueUrl: string;
    };
    email?: {
        success: boolean;
        sentTo?: string;
        fallback?: boolean;
        mailto?: string;
    };
    errors?: Array<{ service: string; error: string }>;
}

const categories = [
    { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500', bgColor: 'bg-red-50' },
    { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-amber-500', bgColor: 'bg-amber-50' },
    { id: 'question', label: 'Question', icon: FileQuestion, color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
    { id: 'general', label: 'General Feedback', icon: MessageSquare, color: 'text-blue-500', bgColor: 'bg-blue-50' },
];

const priorities = [
    { id: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    { id: 'normal', label: 'Normal', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { id: 'high', label: 'High', color: 'bg-amber-50 text-amber-600 border-amber-200' },
    { id: 'critical', label: 'Critical', color: 'bg-red-50 text-red-600 border-red-200' },
];

export default function HelpSupport() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [supportStatus, setSupportStatus] = useState<SupportStatus | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('general');
    const [priority, setPriority] = useState('normal');
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [screenshots, setScreenshots] = useState<File[]>([]);

    useEffect(() => {
        void fetchSupportStatus();
    }, []);

    const fetchSupportStatus = async () => {
        try {
            const res = await api.get('/support/status');
            setSupportStatus(res.data);
        } catch (err) {
            console.error('Failed to fetch support status:', err);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const imageFiles = files.filter((file) => file.type.startsWith('image/'));
        setScreenshots((prev) => [...prev, ...imageFiles].slice(0, 5));
    };

    const removeScreenshot = (index: number) => {
        setScreenshots((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitResult(null);

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('category', category);
            formData.append('priority', priority);
            formData.append('userName', userName);
            formData.append('userEmail', userEmail);

            screenshots.forEach((file) => {
                formData.append('screenshots', file);
            });

            const res = await api.post('/support/ticket', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const result = res.data;
            setSubmitResult(result);

            if (result.success) {
                setTitle('');
                setDescription('');
                setCategory('general');
                setPriority('normal');
                setScreenshots([]);
            }
        } catch (err) {
            setSubmitResult({
                success: false,
                message: 'Failed to submit ticket. Please try again.',
                errors: [{ service: 'Network', error: String(err) }]
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen px-6 py-3">
            <div className="mx-auto mb-4 max-w-4xl">
                <button
                    onClick={() => navigate('/')}
                    className="mb-4 flex items-center gap-2 text-slate-500 transition-colors hover:text-slate-700"
                >
                    <ArrowLeft size={18} />
                    <span className="text-sm font-medium">Back to Home</span>
                </button>

                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/20">
                        <HelpCircle size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Help & Support</h1>
                        <p className="text-slate-500">Submit a support ticket and we&apos;ll get back to you soon</p>
                    </div>
                </div>
            </div>

            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6">
                        {submitResult && (
                            <div className={`mb-6 rounded-xl p-4 ${submitResult.success ? 'border border-emerald-200 bg-emerald-50' : 'border border-red-200 bg-red-50'}`}>
                                <div className="flex items-start gap-3">
                                    {submitResult.success ? (
                                        <CheckCircle className="mt-0.5 flex-shrink-0 text-emerald-500" size={20} />
                                    ) : (
                                        <AlertCircle className="mt-0.5 flex-shrink-0 text-red-500" size={20} />
                                    )}
                                    <div className="flex-1">
                                        <p className={`font-medium ${submitResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                                            {submitResult.message}
                                        </p>

                                        {submitResult.githubIssue?.success && (
                                            <a
                                                href={submitResult.githubIssue.issueUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700"
                                            >
                                                <Github size={16} />
                                                View Issue #{submitResult.githubIssue.issueNumber}
                                                <ExternalLink size={12} />
                                            </a>
                                        )}

                                        {submitResult.email?.fallback && submitResult.email.mailto && (
                                            <a
                                                href={submitResult.email.mailto}
                                                className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                                            >
                                                <Mail size={16} />
                                                Send via Email Client
                                                <ExternalLink size={12} />
                                            </a>
                                        )}

                                        {submitResult.errors && submitResult.errors.length > 0 && !submitResult.success && (
                                            <ul className="mt-2 text-sm text-red-600">
                                                {submitResult.errors.map((err, index) => (
                                                    <li key={index}>- {err.service}: {err.error}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mb-6">
                            <label className="mb-3 block text-sm font-medium text-slate-700">Category</label>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {categories.map((cat) => {
                                    const Icon = cat.icon;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.id)}
                                            className={`rounded-xl border-2 p-4 transition-all ${category === cat.id ? `${cat.bgColor} border-current ${cat.color}` : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                        >
                                            <Icon size={24} className={category === cat.id ? cat.color : 'text-slate-400'} />
                                            <span className={`mt-2 block text-sm font-medium ${category === cat.id ? cat.color : 'text-slate-600'}`}>
                                                {cat.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Brief summary of your issue"
                                required
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        <div className="mb-5">
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Please describe your issue in detail. Include steps to reproduce if applicable."
                                    required
                                    rows={6}
                                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 pr-12 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    title={`Attach screenshots (${screenshots.length}/5)`}
                                    className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-500"
                                >
                                    <Paperclip size={18} />
                                    {screenshots.length > 0 && (
                                        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold leading-none text-white">
                                            {screenshots.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {screenshots.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="mr-1 text-xs text-slate-400">Attached:</span>
                                {screenshots.map((file, index) => (
                                    <div key={index} className="group relative">
                                        <div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={`Screenshot ${index + 1}`}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeScreenshot(index)}
                                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                                        >
                                            <X size={11} />
                                        </button>
                                    </div>
                                ))}
                                {screenshots.length < 5 && (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition-all hover:border-blue-400 hover:text-blue-500"
                                    >
                                        <Paperclip size={16} />
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="mb-5">
                            <label className="mb-2 block text-sm font-medium text-slate-700">Priority</label>
                            <div className="flex flex-wrap gap-2">
                                {priorities.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setPriority(item.id)}
                                        className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${priority === item.id ? `${item.color} border-current` : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">Your Name</label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">Your Email</label>
                                <input
                                    type="email"
                                    value={userEmail}
                                    onChange={(e) => setUserEmail(e.target.value)}
                                    placeholder="john@example.com"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        </div>

                        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            Please do not include passwords, secrets, or sensitive personal data in tickets or screenshots.
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !title || !description}
                            className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send size={20} />
                                    Submit Support Ticket
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="space-y-6">
                    <div className="glass-card rounded-xl p-5">
                        <h3 className="mb-4 text-sm font-semibold text-slate-700">Ticket Delivery</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${supportStatus?.github?.configured ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                    <Github size={16} className={supportStatus?.github?.configured ? 'text-emerald-600' : 'text-slate-400'} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-700">GitHub Issues</p>
                                    <p className={`text-xs ${supportStatus?.github?.configured ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {supportStatus?.github?.configured ? 'Connected to GitHub' : 'Not configured'}
                                    </p>
                                </div>
                                {supportStatus?.github?.configured && <CheckCircle size={16} className="text-emerald-500" />}
                            </div>

                            <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${supportStatus?.email?.configured ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                    <Mail size={16} className={supportStatus?.email?.configured ? 'text-emerald-600' : 'text-slate-400'} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-700">Email</p>
                                    <p className={`text-xs ${supportStatus?.email?.configured ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {supportStatus?.email?.supportEmail || 'Not configured'}
                                    </p>
                                </div>
                                {supportStatus?.email?.configured && <CheckCircle size={16} className="text-emerald-500" />}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-xl p-5">
                        <h3 className="mb-4 text-sm font-semibold text-slate-700">Tips for Faster Resolution</h3>
                        <ul className="space-y-3 text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-blue-500">1.</span>
                                <span>Use a clear, descriptive title</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-blue-500">2.</span>
                                <span>Include steps to reproduce for bugs</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-blue-500">3.</span>
                                <span>Attach screenshots when possible</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-blue-500">4.</span>
                                <span>Provide your email for follow-up</span>
                            </li>
                        </ul>
                    </div>

                    {supportStatus?.email?.supportEmail && (
                        <div className="glass-card rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-5">
                            <h3 className="mb-3 text-sm font-semibold text-slate-700">Need Immediate Help?</h3>
                            <p className="mb-4 text-sm text-slate-500">For urgent issues, you can reach out directly:</p>
                            <a
                                href={`mailto:${supportStatus.email.supportEmail}`}
                                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                                <Mail size={16} />
                                {supportStatus.email.supportEmail}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
