import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = (resendApiKey && resendApiKey !== 'your_resend_api_key') ? new Resend(resendApiKey) : null;

export async function POST(request) {
    try {
        if (!resend) {
            return NextResponse.json(
                { error: 'Resend API Key is missing. Add RESEND_API_KEY to your environment variables.' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { activities } = body;

        if (!activities || activities.length === 0) {
            return NextResponse.json({ error: 'No activities provided' }, { status: 400 });
        }

        // Generate CSV content
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
        // Convert to Base64 for the attachment
        const csvBase64 = Buffer.from(csvContent).toString('base64');

        // Generate summary text
        const dateStr = new Date().toISOString().split('T')[0];
        let bodyText = `Here is the latest sales activity report for ${dateStr}:\n\n`;
        
        activities.forEach((act, index) => {
            bodyText += `--- Activity ${index + 1} ---\n`;
            bodyText += `Date: ${act.date || ''}\n`;
            bodyText += `Salesperson: ${act.salesperson || ''}\n`;
            bodyText += `Client: ${act.client || ''}\n`;
            bodyText += `Type: ${act.type || ''}\n`;
            bodyText += `Outcome: ${act.outcome || ''}\n`;
            if (act.notes) {
                bodyText += `Notes: ${act.notes}\n`;
            }
            bodyText += `\n`;
        });

        // Send Email via Resend
        const data = await resend.emails.send({
            from: 'Sales Tracker <onboarding@resend.dev>',
            to: ['delivered@resend.dev'], // Note: Change this to your manager's email when you verify your domain!
            subject: `Sales Activity Report - ${dateStr}`,
            text: bodyText,
            attachments: [
                {
                    filename: `sales_activities_${dateStr}.csv`,
                    content: csvBase64,
                }
            ]
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error sending email:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
