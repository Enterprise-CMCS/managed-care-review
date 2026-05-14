import React, { useEffect, useState } from 'react'
import type { LocalEmail } from '../useInbox'

type EmailInboxProps = {
    emails: LocalEmail[]
    onClear: () => void
}

function formatAddressList(addresses: string[]) {
    return addresses.length ? addresses.join(', ') : 'None'
}

const EMAIL_FRAME_STYLES = `
    html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #1b1b1b;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        line-height: 1.5;
    }
    body {
        padding: 16px 20px;
    }
    a {
        color: #005ea2;
    }
    ol, ul {
        padding-left: 20px;
    }
`

function wrapEmailHtml(bodyHTML: string) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="color-scheme" content="light" />
<base target="_blank" />
<style>${EMAIL_FRAME_STYLES}</style>
</head>
<body>${bodyHTML}</body>
</html>`
}

export function EmailInbox({ emails, onClear }: EmailInboxProps) {
    const [selectedId, setSelectedId] = useState<string | undefined>()

    useEffect(() => {
        if (!selectedId) {
            return
        }

        const selectedStillExists = emails.some((email) => email.id === selectedId)
        if (!selectedStillExists) {
            setSelectedId(undefined)
        }
    }, [emails, selectedId])

    const selectedEmail =
        (selectedId && emails.find((email) => email.id === selectedId)) ||
        emails[0]

    return (
        <div className="inbox-shell">
            <div className="inbox-toolbar">
                <div className="inbox-count">
                    {emails.length} email{emails.length === 1 ? '' : 's'}
                </div>
                <button
                    className="button--danger"
                    onClick={onClear}
                    disabled={!emails.length}
                >
                    Clear Inbox
                </button>
            </div>
            {!emails.length ? (
                <div className="empty-state">
                    Local emails will appear here when the API sends them.
                </div>
            ) : (
                <div className="inbox-layout">
                    <div className="email-list">
                        {emails.map((email) => (
                            <button
                                key={email.id}
                                className={`email-list__item${
                                    selectedEmail?.id === email.id
                                        ? ' email-list__item--active'
                                        : ''
                                }`}
                                onClick={() => setSelectedId(email.id)}
                            >
                                <div className="email-list__subject">
                                    {email.subject}
                                </div>
                                <div className="email-list__meta">
                                    To: {formatAddressList(email.toAddresses)}
                                </div>
                                <div className="email-list__meta">
                                    {new Date(email.createdAt).toLocaleString()}
                                </div>
                            </button>
                        ))}
                    </div>
                    {selectedEmail && (
                        <div className="email-preview">
                            <div className="email-preview__meta">
                                <div>
                                    <strong>From:</strong>{' '}
                                    {selectedEmail.sourceEmail}
                                </div>
                                <div>
                                    <strong>To:</strong>{' '}
                                    {formatAddressList(
                                        selectedEmail.toAddresses
                                    )}
                                </div>
                                <div>
                                    <strong>Cc:</strong>{' '}
                                    {formatAddressList(
                                        selectedEmail.ccAddresses
                                    )}
                                </div>
                                <div>
                                    <strong>Bcc:</strong>{' '}
                                    {formatAddressList(
                                        selectedEmail.bccAddresses
                                    )}
                                </div>
                                <div>
                                    <strong>Reply-To:</strong>{' '}
                                    {formatAddressList(
                                        selectedEmail.replyToAddresses
                                    )}
                                </div>
                                <div>
                                    <strong>Received:</strong>{' '}
                                    {new Date(
                                        selectedEmail.createdAt
                                    ).toLocaleString()}
                                </div>
                            </div>
                            <div className="email-preview__subject">
                                {selectedEmail.subject}
                            </div>
                            {selectedEmail.bodyHTML ? (
                                <iframe
                                    className="email-preview__frame"
                                    srcDoc={wrapEmailHtml(selectedEmail.bodyHTML)}
                                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                                    title={selectedEmail.subject}
                                />
                            ) : (
                                <pre className="email-preview__text">
                                    {selectedEmail.bodyText}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
