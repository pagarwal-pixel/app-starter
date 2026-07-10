const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const { sanitizeText } = require('../lib/util');
const { getResendClient, getFromEmail, getSupportEmail } = require('../lib/mail');
const { APP_NAME, uploadsDir } = require('../config');

const router = express.Router();

const IMAGE_UPLOAD_LIMIT = 10 * 1024 * 1024; // 10MB per image

const uploadImages = multer({
    dest: uploadsDir,
    limits: { fileSize: IMAGE_UPLOAD_LIMIT },
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            return cb(null, true);
        }
        const err = new Error('Invalid attachment type. Images only.');
        err.statusCode = 400;
        return cb(err);
    }
});

// Support Ticket Endpoint - Creates GitHub Issue and sends email
router.post('/support/ticket', authenticate, uploadImages.array('screenshots', 5), async (req, res) => {
    try {
        const { title, description, priority, category, userEmail, userName } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        const safeTitle = sanitizeText(title);
        const safeDescription = sanitizeText(description);
        const safePriority = sanitizeText(priority || 'Normal');
        const safeCategory = sanitizeText(category || 'General');
        const safeUserEmail = userEmail ? sanitizeText(userEmail) : 'No email provided';
        const safeUserName = userName ? sanitizeText(userName) : 'Unknown';

        const results = {
            githubIssue: null,
            email: null,
            errors: []
        };

        const issueBody = `
## Support Ticket

**Submitted by:** ${safeUserName} (${safeUserEmail})
**Priority:** ${safePriority}
**Category:** ${safeCategory}
**Date:** ${new Date().toLocaleString()}

---

### Description

${safeDescription}

---

### System Information
- **Source:** Submitted via ${APP_NAME}
- **Timestamp:** ${new Date().toISOString()}

${req.files && req.files.length > 0 ? `\n### Attachments\n${req.files.length} screenshot(s) attached to email notification.` : ''}
        `.trim();

        // 1. Create GitHub Issue (optional integration)
        if (process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
            try {
                const response = await axios.post(
                    `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/issues`,
                    {
                        title: `[Support] ${safeTitle}`,
                        body: issueBody
                    },
                    {
                        headers: {
                            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json'
                        }
                    }
                );

                results.githubIssue = {
                    success: true,
                    issueNumber: response.data.number,
                    issueUrl: response.data.html_url
                };
            } catch (githubError) {
                console.error('GitHub API Error:', githubError.response?.data || githubError.message);
                results.errors.push({
                    service: 'GitHub',
                    error: githubError.response?.data?.message || githubError.message
                });
            }
        } else {
            results.errors.push({
                service: 'GitHub',
                error: 'GitHub integration not configured'
            });
        }

        // 2. Send Email via Resend
        const resend = getResendClient();
        const supportEmail = getSupportEmail();

        if (resend) {
            try {
                // Prepare attachments for Resend (base64 encoded)
                const attachments = [];
                if (req.files && req.files.length > 0) {
                    for (const file of req.files) {
                        const fileContent = fs.readFileSync(file.path);
                        attachments.push({
                            filename: `screenshot_${attachments.length + 1}${path.extname(file.originalname) || '.png'}`,
                            content: fileContent.toString('base64')
                        });
                    }
                }

                const emailHtml = `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">New Support Ticket</h1>
                        </div>
                        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px 0; color: #6b7280; width: 120px;">Title:</td>
                                    <td style="padding: 10px 0; font-weight: 600;">${safeTitle}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; color: #6b7280;">Submitted By:</td>
                                    <td style="padding: 10px 0;">${safeUserName} (${safeUserEmail})</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; color: #6b7280;">Priority:</td>
                                    <td style="padding: 10px 0;">
                                        <span style="padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; ${priority === 'critical' ? 'background: #fee2e2; color: #dc2626;' :
                        priority === 'high' ? 'background: #fef3c7; color: #d97706;' :
                            priority === 'low' ? 'background: #dbeafe; color: #2563eb;' :
                                'background: #f3f4f6; color: #4b5563;'
                    }">${safePriority}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; color: #6b7280;">Category:</td>
                                    <td style="padding: 10px 0;">${safeCategory}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; color: #6b7280;">Date:</td>
                                    <td style="padding: 10px 0;">${new Date().toLocaleString()}</td>
                                </tr>
                            </table>

                            <div style="margin-top: 25px;">
                                <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">Description</h3>
                                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; color: #4b5563; white-space: pre-wrap; line-height: 1.6;">
${safeDescription}
                                </div>
                            </div>

                            ${attachments.length > 0 ? `
                            <p style="margin-top: 25px; color: #6b7280;">${attachments.length} screenshot(s) attached to this email.</p>
                            ` : ''}

                            ${results.githubIssue?.success ? `
                            <div style="margin-top: 25px; background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 8px;">
                                <p style="margin: 0; color: #047857;">
                                    <strong>GitHub Issue Created:</strong>
                                    <a href="${results.githubIssue.issueUrl}" style="color: #047857;">#${results.githubIssue.issueNumber}</a>
                                </p>
                            </div>
                            ` : ''}
                        </div>
                        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                This is an automated message from ${APP_NAME}
                            </p>
                        </div>
                    </div>
                `;

                const emailData = {
                    from: getFromEmail(),
                    to: supportEmail,
                    reply_to: userEmail || undefined,
                    subject: `[Support Ticket] ${safeTitle}`,
                    html: emailHtml
                };

                if (attachments.length > 0) {
                    emailData.attachments = attachments;
                }

                const { data, error } = await resend.emails.send(emailData);

                if (error) {
                    throw new Error(error.message);
                }

                results.email = { success: true, sentTo: supportEmail, emailId: data.id };

                // Clean up uploaded files after sending
                if (req.files) {
                    req.files.forEach(file => {
                        try {
                            fs.unlinkSync(file.path);
                        } catch (e) {
                            console.log('Could not delete temp file:', file.path);
                        }
                    });
                }
            } catch (emailError) {
                console.error('Resend Email Error:', emailError.message);
                results.errors.push({
                    service: 'Email',
                    error: emailError.message
                });
            }
        } else {
            // No Resend API key configured - offer mailto fallback info
            results.email = {
                success: false,
                fallback: true,
                message: 'Email not configured. Please add RESEND_API_KEY to .env',
                mailto: `mailto:${supportEmail}?subject=${encodeURIComponent(`[Support] ${title}`)}&body=${encodeURIComponent(description)}`
            };
            results.errors.push({
                service: 'Email',
                error: 'Resend API key not configured - using mailto fallback'
            });
        }

        const hasSuccess = results.githubIssue?.success || results.email?.success;

        if (hasSuccess) {
            res.json({
                success: true,
                message: 'Support ticket submitted successfully',
                ...results
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to submit support ticket through any channel',
                ...results
            });
        }

    } catch (err) {
        console.error('Support ticket error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Check support configuration status
router.get('/support/status', authenticate, (req, res) => {
    res.json({
        github: {
            configured: Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO),
            repo: process.env.GITHUB_REPO || null
        },
        email: {
            configured: Boolean(process.env.RESEND_API_KEY),
            supportEmail: getSupportEmail()
        }
    });
});

module.exports = router;
