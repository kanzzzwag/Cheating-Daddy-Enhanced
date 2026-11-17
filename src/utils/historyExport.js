// Turns saved sessions into files for the History "Download" buttons

const PROFILE_NAMES = {
    interview: 'Job Interview',
    sales: 'Sales Call',
    meeting: 'Business Meeting',
    presentation: 'Presentation',
    negotiation: 'Negotiation',
    exam: 'Exam Assistant',
};

function pad(value) {
    return String(value).padStart(2, '0');
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// AI answers have their own Markdown headings; push them below the file's "###" entry level so the
// structure stays readable. Lines inside code blocks are left alone ("# comment" in Python or bash).
function demoteHeadings(text) {
    let inCodeBlock = false;
    return text
        .split('\n')
        .map(line => {
            if (/^\s*(```|~~~)/.test(line)) inCodeBlock = !inCodeBlock;
            if (inCodeBlock) return line;
            return line.replace(/^(#{1,6})(\s)/, (_, hashes, space) => '#'.repeat(Math.min(hashes.length + 3, 6)) + space);
        })
        .join('\n');
}

// Sessions without any question or screenshot (e.g. opened and closed right away) are skipped
function getExportableSessions(sessions) {
    return sessions.filter(session => session && (session.conversationHistory?.length > 0 || session.screenAnalysisHistory?.length > 0));
}

function sessionToMarkdown(session) {
    const profile = PROFILE_NAMES[session.profile] || session.profile || 'Session';
    const lines = [`## ${profile} · ${formatDate(session.createdAt)} ${formatTime(session.createdAt)}`, ''];

    if (session.customPrompt) {
        lines.push(`**Custom prompt:** ${session.customPrompt}`, '');
    }

    // Questions and screenshots are stored separately, so merge them back into the order they happened
    const entries = [
        ...(session.conversationHistory || []).map(turn => ({ timestamp: turn.timestamp, turn })),
        ...(session.screenAnalysisHistory || []).map(screen => ({ timestamp: screen.timestamp, screen })),
    ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    for (const { timestamp, turn, screen } of entries) {
        if (turn) {
            lines.push(`### ${formatTime(timestamp)} · Question`, '');
            if (turn.transcription) lines.push(`**You:** ${turn.transcription}`, '');
            if (turn.ai_response) lines.push(demoteHeadings(turn.ai_response.trim()), '');
        } else {
            lines.push(`### ${formatTime(timestamp)} · Screenshot${screen.model ? ` · ${screen.model}` : ''}`, '');
            lines.push(demoteHeadings((screen.response || '').trim()), '');
        }
    }

    lines.push('---', '');
    return lines.join('\n');
}

function buildHistoryMarkdown(sessions) {
    const exportable = getExportableSessions(sessions);
    const header = `# Cheating Daddy history\n\nExported ${formatDate(Date.now())} ${formatTime(Date.now())} · ${exportable.length} session(s)\n\n`;
    return header + exportable.map(sessionToMarkdown).join('\n');
}

function buildHistoryJson(sessions) {
    return JSON.stringify(getExportableSessions(sessions), null, 2);
}

function getDefaultExportFileName(sessions, isSingleSession) {
    if (isSingleSession && sessions[0]) {
        return `cheating-daddy-session-${formatDate(sessions[0].createdAt)}-${formatTime(sessions[0].createdAt).replace(':', '')}.md`;
    }
    return `cheating-daddy-history-${formatDate(Date.now())}.md`;
}

module.exports = {
    getExportableSessions,
    buildHistoryMarkdown,
    buildHistoryJson,
    getDefaultExportFileName,
};
