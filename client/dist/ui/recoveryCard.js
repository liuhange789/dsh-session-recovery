const MAX_VISIBLE_CANDIDATES = 3;
function button(label, primary) {
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = label;
    Object.assign(el.style, {
        border: primary ? '1px solid #c58b00' : '1px solid #d8d8d8',
        background: primary ? '#f5b400' : '#ffffff',
        color: primary ? '#1f1f1f' : '#555555',
        borderRadius: '6px',
        padding: '4px 12px',
        fontSize: '12px',
        cursor: 'pointer',
    });
    return el;
}
/**
 * 会话列表顶部的恢复卡片。只展示最近 3 个候选，继续后打开宿主创建的新会话。
 */
export class RecoveryCard {
    el = null;
    handlers;
    constructor(handlers) {
        this.handlers = handlers;
    }
    mount(container) {
        const el = document.createElement('div');
        el.setAttribute('data-dsh-plugin', 'session-recovery');
        Object.assign(el.style, {
            display: 'none',
            margin: '8px',
            padding: '10px 12px',
            border: '1px solid #f0c36d',
            borderRadius: '8px',
            background: '#fffbea',
            color: '#333333',
            fontSize: '12px',
            lineHeight: '1.5',
        });
        container.appendChild(el);
        this.el = el;
    }
    render(candidates) {
        if (!this.el)
            return;
        this.el.textContent = '';
        if (candidates.length === 0) {
            this.hide();
            return;
        }
        this.el.style.display = 'block';
        for (const candidate of candidates.slice(0, MAX_VISIBLE_CANDIDATES)) {
            this.el.appendChild(this.renderCandidate(candidate));
        }
        if (candidates.length > MAX_VISIBLE_CANDIDATES) {
            const more = document.createElement('div');
            more.textContent = `还有 ${candidates.length - MAX_VISIBLE_CANDIDATES} 个未完成会话`;
            Object.assign(more.style, { marginTop: '6px', color: '#8a6d3b' });
            this.el.appendChild(more);
        }
    }
    hide() {
        if (this.el)
            this.el.style.display = 'none';
    }
    unmount() {
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
        this.el = null;
    }
    renderCandidate(candidate) {
        const row = document.createElement('div');
        Object.assign(row.style, {
            padding: '6px 0',
            borderBottom: '1px dashed #eadfb8',
        });
        const title = document.createElement('div');
        title.textContent = `上次会话在 ${candidate.steps} 步中断，是否继续？`;
        title.style.fontWeight = '600';
        const detail = document.createElement('div');
        const recent = candidate.lastSummaries.slice(-3).join(' → ');
        detail.textContent = recent.length > 0 ? `最近进度：${recent}` : `最近工具：${candidate.lastToolName}`;
        Object.assign(detail.style, {
            margin: '2px 0 6px',
            color: '#6b5b2a',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: '2',
            WebkitBoxOrient: 'vertical',
        });
        const status = document.createElement('span');
        Object.assign(status.style, { marginLeft: '8px', color: '#b23b3b' });
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.alignItems = 'center';
        const resume = button('继续', true);
        resume.addEventListener('click', () => {
            resume.disabled = true;
            dismiss.disabled = true;
            this.handlers
                .onResume(candidate.sessionId)
                .then(() => row.remove())
                .catch(() => {
                resume.disabled = false;
                dismiss.disabled = false;
                status.textContent = '继续失败，请稍后重试';
            });
        });
        const dismiss = button('忽略', false);
        dismiss.style.marginLeft = '8px';
        dismiss.addEventListener('click', () => {
            resume.disabled = true;
            dismiss.disabled = true;
            this.handlers
                .onDismiss(candidate.sessionId)
                .then(() => row.remove())
                .catch(() => {
                resume.disabled = false;
                dismiss.disabled = false;
                status.textContent = '忽略失败，请稍后重试';
            });
        });
        actions.appendChild(resume);
        actions.appendChild(dismiss);
        actions.appendChild(status);
        row.appendChild(title);
        row.appendChild(detail);
        row.appendChild(actions);
        return row;
    }
}
//# sourceMappingURL=recoveryCard.js.map