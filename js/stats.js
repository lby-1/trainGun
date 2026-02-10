/* ============================================================
   TrainGun - 成绩统计与折线图
   ============================================================ */

import { getTrainingResults, getDailyBest, getBestScores } from './storage.js';
import { MODE_NAMES } from './ui.js';

/**
 * 渲染统计面板
 * @param {string} containerId - 容器元素 ID
 */
export function renderStatsPanel(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const modes = ['tracking', 'flicking', 'switching', 'reflex', 'sixtarget', 'humanoid'];
    const bestScores = getBestScores();

    container.innerHTML = `
        <div class="stats-tabs" id="stats-tabs">
            ${modes.map((m, i) => `
                <button class="stats-tab ${i === 0 ? 'active' : ''}" data-mode="${m}">
                    ${MODE_NAMES[m]}
                </button>
            `).join('')}
        </div>
        <div id="stats-body"></div>
    `;

    // Tab 切换事件
    const tabs = container.querySelectorAll('.stats-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderModeStats(tab.dataset.mode);
        });
    });

    // 默认显示第一个模式
    renderModeStats(modes[0]);
}

/**
 * 渲染指定模式的统计数据
 */
function renderModeStats(mode) {
    const body = document.getElementById('stats-body');
    if (!body) return;

    const results = getTrainingResults(mode, 100);
    const bestScores = getBestScores();
    const best = bestScores[mode];
    const dailyData = getDailyBest(mode, 30);

    // 计算平均值
    let avgScore = 0;
    let avgAccuracy = 0;
    if (results.length > 0) {
        avgScore = Math.round(results.reduce((a, r) => a + r.score, 0) / results.length);
        avgAccuracy = Math.round(results.reduce((a, r) => a + (r.accuracy || 0), 0) / results.length * 10) / 10;
    }

    body.innerHTML = `
        <div class="stats-best">
            <div class="stat-card">
                <div class="stat-card-label">最高分</div>
                <div class="stat-card-value">${best ? best.score : '--'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">平均分</div>
                <div class="stat-card-value">${results.length > 0 ? avgScore : '--'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">平均命中率</div>
                <div class="stat-card-value">${results.length > 0 ? avgAccuracy + '%' : '--'}</div>
            </div>
        </div>

        <h3 style="font-family: Orbitron; font-size: 0.8rem; color: var(--text-dim); letter-spacing: 0.2em; margin-bottom: 0.5rem;">
            成绩趋势 (最近30天)
        </h3>
        <div class="chart-container">
            <canvas id="stats-chart" width="700" height="200"></canvas>
        </div>

        <h3 style="font-family: Orbitron; font-size: 0.8rem; color: var(--text-dim); letter-spacing: 0.2em; margin: 1.5rem 0 0.5rem;">
            最近记录
        </h3>
        <div style="max-height: 200px; overflow-y: auto;">
            ${results.length > 0
            ? results.slice(-10).reverse().map(r => `
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        padding: 0.5rem 0.8rem;
                        border-bottom: 1px solid rgba(0,255,240,0.05);
                        font-size: 0.85rem;
                    ">
                        <span style="color: var(--text-dim);">${new Date(r.timestamp).toLocaleString('zh-CN')}</span>
                        <span style="color: var(--primary); font-family: Orbitron; font-weight: 700;">${r.score}</span>
                        <span style="color: var(--text-dim);">${r.accuracy}%</span>
                        <span style="color: var(--text-dim);">${r.difficulty}</span>
                    </div>
                `).join('')
            : '<p style="text-align: center; color: var(--text-dim); padding: 2rem;">暂无记录，开始训练以查看趋势</p>'
        }
        </div>
    `;

    // 绘制折线图
    if (dailyData.length > 0) {
        setTimeout(() => drawChart(dailyData), 50);
    } else {
        const chartCanvas = document.getElementById('stats-chart');
        if (chartCanvas) {
            const ctx = chartCanvas.getContext('2d');
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, chartCanvas.width, chartCanvas.height);
            ctx.font = '14px Rajdhani';
            ctx.fillStyle = '#7a7a9a';
            ctx.textAlign = 'center';
            ctx.fillText('开始训练以查看趋势', chartCanvas.width / 2, chartCanvas.height / 2);
        }
    }
}

/**
 * 在 Canvas 上绘制折线图
 * @param {Array<{date: string, score: number}>} data
 */
function drawChart(data) {
    const canvas = document.getElementById('stats-chart');
    if (!canvas) return;

    // 调整 canvas 尺寸到实际容器
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };

    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // 清空
    ctx.fillStyle = 'rgba(10, 10, 26, 0.8)';
    ctx.fillRect(0, 0, w, h);

    if (data.length < 2) {
        ctx.font = '14px Rajdhani';
        ctx.fillStyle = '#7a7a9a';
        ctx.textAlign = 'center';
        ctx.fillText('需要至少 2 天的数据才能显示趋势', w / 2, h / 2);
        return;
    }

    const scores = data.map(d => d.score);
    const minScore = Math.min(...scores) * 0.9;
    const maxScore = Math.max(...scores) * 1.1 || 100;
    const scoreRange = maxScore - minScore || 1;

    // 绘制网格线
    ctx.strokeStyle = 'rgba(0, 255, 240, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();

        // Y 轴标签
        const val = Math.round(maxScore - (scoreRange / 4) * i);
        ctx.font = '11px Orbitron';
        ctx.fillStyle = '#7a7a9a';
        ctx.textAlign = 'right';
        ctx.fillText(val.toString(), padding.left - 8, y + 4);
    }

    // 计算数据点坐标
    const points = data.map((d, i) => ({
        x: padding.left + (chartW / (data.length - 1)) * i,
        y: padding.top + chartH - ((d.score - minScore) / scoreRange) * chartH,
        data: d
    }));

    // 绘制渐变填充
    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    gradient.addColorStop(0, 'rgba(0, 255, 240, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 255, 240, 0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, h - padding.bottom);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, h - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // 绘制折线
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = '#00fff0';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00fff0';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 绘制数据点
    points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#00fff0';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00fff0';
        ctx.fill();
        ctx.shadowBlur = 0;

        // 白色内圈
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    });

    // X 轴标签（日期）
    ctx.font = '10px Rajdhani';
    ctx.fillStyle = '#7a7a9a';
    ctx.textAlign = 'center';
    const labelStep = Math.max(1, Math.floor(data.length / 7));
    points.forEach((p, i) => {
        if (i % labelStep === 0 || i === points.length - 1) {
            ctx.fillText(p.data.date, p.x, h - 8);
        }
    });
}
