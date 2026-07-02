"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function Home() {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [form, setForm] = useState({
        date: '',
        salesperson: '',
        client: '',
        type: '',
        notes: '',
        outcome: ''
    });

    useEffect(() => {
        // Set default date
        setForm(f => ({ ...f, date: new Date().toISOString().split('T')[0] }));
        fetchActivities();
    }, []);

    async function fetchActivities() {
        if (!supabase) {
            // Mock mode if no supabase keys
            const local = JSON.parse(localStorage.getItem('mockActivities') || '[]');
            setActivities(local);
            setLoading(false);
            return;
        }
        
        try {
            const { data, error } = await supabase.from('activities').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setActivities(data || []);
        } catch (error) {
            console.error('Error fetching activities:', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const newActivity = { ...form };

        if (!supabase) {
            // Mock mode
            newActivity.id = Date.now().toString();
            const updated = [newActivity, ...activities];
            setActivities(updated);
            localStorage.setItem('mockActivities', JSON.stringify(updated));
            resetForm();
            return;
        }

        try {
            const { data, error } = await supabase.from('activities').insert([newActivity]).select();
            if (error) throw error;
            if (data) {
                setActivities([data[0], ...activities]);
            }
            resetForm();
        } catch (error) {
            alert('Error adding activity: ' + error.message);
        }
    }

    function resetForm() {
        setForm(f => ({
            ...f,
            client: '',
            type: '',
            notes: '',
            outcome: ''
        }));
    }

    async function deleteActivity(id) {
        if (!confirm('Are you sure you want to delete this activity?')) return;

        if (!supabase) {
            const updated = activities.filter(a => a.id !== id);
            setActivities(updated);
            localStorage.setItem('mockActivities', JSON.stringify(updated));
            return;
        }

        try {
            const { error } = await supabase.from('activities').delete().eq('id', id);
            if (error) throw error;
            setActivities(activities.filter(a => a.id !== id));
        } catch (error) {
            alert('Error deleting activity: ' + error.message);
        }
    }

    function exportToCSV() {
        if (activities.length === 0) {
            alert('No data to export.');
            return;
        }

        const headers = ['Date', 'Salesperson', 'Client', 'Type', 'Outcome', 'Notes'];
        const csvRows = [headers.join(',')];

        activities.forEach(activity => {
            const row = [
                activity.date || '',
                `"${(activity.salesperson || '').replace(/"/g, '""')}"`,
                `"${(activity.client || '').replace(/"/g, '""')}"`,
                activity.type || '',
                activity.outcome || '',
                `"${(activity.notes || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sales_activities_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function sendEmail() {
        if (activities.length === 0) {
            alert('No data to send.');
            return;
        }

        setSending(true);

        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activities })
            });
            const data = await response.json();
            
            if (response.ok) {
                alert('Email sent successfully via Cloud API!');
            } else {
                alert('Server returned an error: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Could not connect to the cloud email API. ' + err.message);
        } finally {
            setSending(false);
        }
    }

    const handleChange = (e) => {
        setForm({ ...form, [e.target.id]: e.target.value });
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="header-content">
                    <h1>Cloud Sales Tracker</h1>
                    <p>Track, Analyze, and Export your team's activities globally.</p>
                </div>
                <div className="header-actions">
                    <button type="button" onClick={exportToCSV} className="btn btn-secondary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Export Excel
                    </button>
                    <button type="button" onClick={sendEmail} disabled={sending} className="btn btn-primary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        {sending ? 'Sending...' : 'Email Manager'}
                    </button>
                </div>
            </header>

            <main>
                {!supabase && (
                    <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#fda4af', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                        <strong>MOCK MODE ACTIVE:</strong> You have not configured Supabase or Resend environment variables. The app is currently running using local storage mock data and emails will fail. Add your keys to `.env.local` to enable cloud features!
                    </div>
                )}
                <div className="grid-layout">
                    <section className="form-section card glass">
                        <h2>New Activity</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="date">Date</label>
                                    <input type="date" id="date" value={form.date} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="salesperson">Salesperson</label>
                                    <input type="text" id="salesperson" value={form.salesperson} onChange={handleChange} placeholder="e.g. Jane Doe" required />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="client">Client Name</label>
                                    <input type="text" id="client" value={form.client} onChange={handleChange} placeholder="e.g. Acme Corp" required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="type">Activity Type</label>
                                    <select id="type" value={form.type} onChange={handleChange} required>
                                        <option value="" disabled>Select type...</option>
                                        <option value="Call">Phone Call</option>
                                        <option value="Email">Email Outreach</option>
                                        <option value="Meeting">In-Person Meeting</option>
                                        <option value="Video Call">Video Call</option>
                                        <option value="Demo">Product Demo</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="notes">Notes</label>
                                <textarea id="notes" rows="3" value={form.notes} onChange={handleChange} placeholder="Discussed targets..."></textarea>
                            </div>
                            <div className="form-group">
                                <label htmlFor="outcome">Outcome</label>
                                <select id="outcome" value={form.outcome} onChange={handleChange} required>
                                    <option value="" disabled>Select outcome...</option>
                                    <option value="Pending">Pending / Follow-up required</option>
                                    <option value="Positive">Positive / Progress made</option>
                                    <option value="Negative">Negative / No interest</option>
                                    <option value="Closed Won">Closed Won</option>
                                    <option value="Closed Lost">Closed Lost</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-submit">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Log Activity
                            </button>
                        </form>
                    </section>

                    <section className="data-section card glass">
                        <div className="section-header">
                            <h2>Team Activities</h2>
                            <span className="badge">{activities.length} logs</span>
                        </div>
                        <div className="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Salesperson</th>
                                        <th>Client</th>
                                        <th>Type</th>
                                        <th>Outcome</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="6" className="empty-state">Loading activities...</td></tr>
                                    ) : activities.length === 0 ? (
                                        <tr><td colSpan="6" className="empty-state">No activities logged yet. Start by adding one!</td></tr>
                                    ) : (
                                        activities.map(activity => (
                                            <tr key={activity.id}>
                                                <td>{new Date(activity.date).toLocaleDateString()}</td>
                                                <td>{activity.salesperson}</td>
                                                <td><strong>{activity.client}</strong></td>
                                                <td>{activity.type}</td>
                                                <td>
                                                    <span className={`outcome-badge outcome-${(activity.outcome || 'Pending').replace(/\s+/g, '')}`}>
                                                        {activity.outcome}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button type="button" onClick={() => deleteActivity(activity.id)} className="btn btn-danger" title="Delete">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
