/* ============================================================
   TrainGun - 应用入口 & 视图路由
   集成引擎、六大训练模式、灵敏度设置、自定义设置、统计面板
   ============================================================ */

import {
    showNotification,
    showDifficultyModal,
    showTrainingOverlay,
    hideTrainingOverlay,
    showCountdown,
    MODE_NAMES
} from './ui.js';
import { GameEngine } from './engine.js';
import { trackingMode } from './modes/tracking.js';
import { flickingMode } from './modes/flicking.js';
import { switchingMode } from './modes/switching.js';
import { reflexMode } from './modes/reflex.js';
import { sixtargetMode } from './modes/sixtarget.js';
import { humanoidMode } from './modes/humanoid.js';
import {
    GAMES, DPI_PRESETS,
    calculateFromGame, getDefaultConfig
} from './sensitivity.js';
import {
    saveSensitivity, loadSensitivity,
    saveCustomization, loadCustomization, getDefaultCustomization
} from './storage.js';
import { renderStatsPanel } from './stats.js';
import { keybindManager, ACTIONS } from './keybinds.js';
import { routineManager } from './routine.js';

/* ---------- 模式映射 ---------- */
const MODE_HANDLERS = {
    tracking: trackingMode,
    flicking: flickingMode,
    switching: switchingMode,
    reflex: reflexMode,
    sixtarget: sixtargetMode,
    humanoid: humanoidMode
};

/* ---------- 视图路由 ---------- */
class Router {
    constructor() {
        this.currentView = 'menu';
        this.views = ['menu', 'sensitivity', 'customize', 'training', 'stats'];
    }

    showView(viewName) {
        if (!this.views.includes(viewName)) {
            console.warn(`[Router] Unknown view: ${viewName}`);
            return;
        }

        this.views.forEach(name => {
            const el = document.getElementById(`view-${name}`);
            if (el) el.classList.remove('active');
        });

        const target = document.getElementById(`view-${viewName}`);
        if (target) {
            requestAnimationFrame(() => { target.classList.add('active'); });
        }

        if (viewName === 'sensitivity') renderSensitivityUI();
        else if (viewName === 'stats') renderStatsPanel('stats-content');
        else if (viewName === 'customize') renderCustomizeUI();

        this.currentView = viewName;
        console.log(`[Router] View: ${viewName}`);
    }

    getCurrentView() { return this.currentView; }
}

/* ---------- 应用状态 ---------- */
const state = {
    selectedMode: null,
    selectedDifficulty: null,
    engine: null
};

const router = new Router();

window.app = {
    router, state,
    showView: (viewName) => router.showView(viewName)
};

document.addEventListener('DOMContentLoaded', () => {
    initEngine();
    initEventListeners();
    console.log('[TrainGun] 🎯 App initialized (6 modes)');
});

function initEngine() {
    const canvas = document.getElementById('game-canvas');
    if (canvas) state.engine = new GameEngine(canvas);
}

function initEventListeners() {
    // ---- 模式卡片 ----
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            if (!mode) return;
            state.selectedMode = mode;
            const modeName = MODE_NAMES[mode] || mode;

            showDifficultyModal(modeName, (difficulty) => {
                state.selectedDifficulty = difficulty;
                startTraining(mode, difficulty);
            });
        });
    });

    // ---- 底部按钮 ----
    document.getElementById('btn-settings')?.addEventListener('click', () => router.showView('sensitivity'));
    document.getElementById('btn-customize')?.addEventListener('click', () => router.showView('customize'));
    document.getElementById('btn-stats')?.addEventListener('click', () => router.showView('stats'));

    // ---- 返回按钮 ----
    document.querySelectorAll('.btn-back[data-target]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            if (router.getCurrentView() === 'training' && state.engine) state.engine.destroy();
            router.showView(target);
        });
    });

    // ---- 键盘快捷键 ----
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (router.getCurrentView() === 'training') {
                if (state.engine && state.engine.state === 'running') {
                    state.engine.pause();
                } else if (state.engine && (state.engine.state === 'paused' || state.engine.state === 'idle')) {
                    state.engine.destroy();
                    router.showView('menu');
                }
            } else if (router.getCurrentView() !== 'menu') {
                router.showView('menu');
            }
        }
        if (e.key === 'r' || e.key === 'R') {
            if (router.getCurrentView() === 'training' && state.engine &&
                (state.engine.state === 'finished' || state.engine.state === 'paused')) {
                startTraining(state.selectedMode, state.selectedDifficulty);
            }
        }
    });
}

async function startTraining(mode, difficulty) {
    const modeHandler = MODE_HANDLERS[mode];
    if (!modeHandler) {
        showNotification(`未知模式: ${mode}`, 'error');
        return;
    }
    router.showView('training');
    showNotification(`${MODE_NAMES[mode]} - 准备开始`, 'info');
    await new Promise(r => requestAnimationFrame(r));
    if (state.engine) state.engine.init(mode, difficulty, modeHandler);
}

/* ============================================================
   灵敏度设置 UI
   ============================================================ */

function renderSensitivityUI() {
    const container = document.getElementById('sensitivity-content');
    if (!container) return;

    const config = loadSensitivity() || getDefaultConfig();

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            <div>
                <div class="form-group">
                    <label class="form-label">选择游戏</label>
                    <select class="select-field" id="sens-game">
                        ${GAMES.map(g => `
                            <option value="${g.id}" ${g.id === config.game ? 'selected' : ''}>
                                ${g.icon} ${g.name}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">鼠标 DPI</label>
                    <input type="number" class="input-field" id="sens-dpi"
                        value="${config.dpi || 800}" min="100" max="16000" step="50">
                    <div class="dpi-presets" id="dpi-presets">
                        ${DPI_PRESETS.map(d => `
                            <button class="dpi-btn ${d === config.dpi ? 'active' : ''}" data-dpi="${d}">${d}</button>
                        `).join('')}
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">游戏内灵敏度</label>
                    <input type="number" class="input-field" id="sens-value"
                        value="${config.sensitivity || 2}" min="0.01" max="100" step="0.01">
                </div>

                <button class="btn" id="btn-save-sens" style="margin-top: 1rem; width: 100%;">
                    💾 保存设置
                </button>
            </div>

            <div>
                <div style="background: rgba(0,255,240,0.03); border: 1px solid rgba(0,255,240,0.1); border-radius: 4px; padding: 1.5rem; text-align: center;">
                    <div style="font-family: Orbitron; font-size: 0.7rem; color: var(--text-dim); letter-spacing: 0.2em; margin-bottom: 0.5rem;">CM/360</div>
                    <div id="sens-cm360" style="font-family: Orbitron; font-size: 2.5rem; font-weight: 900; color: var(--primary); text-shadow: 0 0 15px rgba(0,255,240,0.4);">${config.cm360 || '--'}</div>
                    <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.5rem;">厘米/360°旋转</div>
                </div>

                <div style="background: rgba(255,0,255,0.03); border: 1px solid rgba(255,0,255,0.1); border-radius: 4px; padding: 1.5rem; margin-top: 1rem; text-align: center;">
                    <div style="font-family: Orbitron; font-size: 0.7rem; color: var(--text-dim); letter-spacing: 0.2em; margin-bottom: 0.5rem;">网页灵敏度系数</div>
                    <div id="sens-web" style="font-family: Orbitron; font-size: 2rem; font-weight: 700; color: var(--secondary); text-shadow: 0 0 15px rgba(255,0,255,0.4);">${config.webSensitivity || '--'}</div>
                </div>

                <div style="margin-top: 1rem; padding: 1rem; border: 1px dashed rgba(0,255,240,0.1); border-radius: 4px;">
                    <p style="font-size: 0.8rem; color: var(--text-dim); line-height: 1.6;">
                        💡 <strong style="color: var(--text);">提示：</strong>选择你正在玩的游戏，
                        输入游戏内的灵敏度设置和鼠标 DPI，确保练枪手感与游戏内一致。
                    </p>
                </div>
            </div>
        </div>
    `;

    const gameSelect = document.getElementById('sens-game');
    const dpiInput = document.getElementById('sens-dpi');
    const sensInput = document.getElementById('sens-value');

    const updateCalc = () => {
        const gameId = gameSelect.value;
        const dpi = parseInt(dpiInput.value) || 800;
        const sens = parseFloat(sensInput.value) || 1;
        const result = calculateFromGame(gameId, sens, dpi);
        document.getElementById('sens-cm360').textContent = result.cm360;
        document.getElementById('sens-web').textContent = result.webSensitivity;
        const game = GAMES.find(g => g.id === gameId);
        if (game) {
            sensInput.placeholder = `默认: ${game.defaultSens}`;
            sensInput.min = game.sensRange.min;
            sensInput.max = game.sensRange.max;
            sensInput.step = game.sensRange.step;
        }
    };

    gameSelect.addEventListener('change', () => {
        const game = GAMES.find(g => g.id === gameSelect.value);
        if (game) sensInput.value = game.defaultSens;
        updateCalc();
    });
    dpiInput.addEventListener('input', updateCalc);
    sensInput.addEventListener('input', updateCalc);

    document.querySelectorAll('.dpi-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            dpiInput.value = btn.dataset.dpi;
            document.querySelectorAll('.dpi-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateCalc();
        });
    });

    document.getElementById('btn-save-sens').addEventListener('click', () => {
        const gameId = gameSelect.value;
        const dpi = parseInt(dpiInput.value) || 800;
        const sens = parseFloat(sensInput.value) || 1;
        const result = calculateFromGame(gameId, sens, dpi);
        saveSensitivity({ game: gameId, sensitivity: sens, dpi, cm360: result.cm360, webSensitivity: result.webSensitivity });
        if (state.engine) state.engine.webSensitivity = result.webSensitivity;
        const gameName = GAMES.find(g => g.id === gameId)?.name || gameId;
        showNotification(`✅ 灵敏度已保存 (${gameName} ${sens} @ ${dpi}DPI)`, 'success');
    });

    updateCalc();
}

/* ============================================================
   自定义设置 UI（目标颜色/透明度 + 准星设置）
   ============================================================ */

function renderCustomizeUI() {
    const container = document.getElementById('customize-content');
    if (!container) return;

    const custom = loadCustomization() || getDefaultCustomization();
    const ch = custom.crosshair || getDefaultCustomization().crosshair;

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            <!-- 左列：目标设置 -->
            <div>
                <h3 style="font-family: Orbitron; font-size: 0.85rem; color: var(--primary); letter-spacing: 0.15em; margin-bottom: 1rem;">
                    🎯 目标球体设置
                </h3>

                <div class="form-group">
                    <label class="form-label">球体颜色</label>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <input type="color" id="target-color" value="${custom.targetColor || '#ff3366'}"
                            style="width: 60px; height: 40px; border: 1px solid rgba(0,255,240,0.2); background: transparent; cursor: pointer; border-radius: 4px;">
                        <span id="target-color-hex" style="font-family: Orbitron; font-size: 0.8rem; color: var(--text-dim);">${custom.targetColor || '#ff3366'}</span>
                    </div>
                    <div class="color-presets" style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
                        ${['#ff3366', '#ff6633', '#ffaa00', '#00ff88', '#00aaff', '#aa44ff', '#ff44aa', '#ffffff'].map(c => `
                            <button class="color-preset-btn" data-color="${c}" style="
                                width: 32px; height: 32px; border-radius: 50%;
                                background: ${c}; border: 2px solid ${c === (custom.targetColor || '#ff3366') ? '#00fff0' : 'rgba(255,255,255,0.1)'};
                                cursor: pointer; transition: all 0.2s;
                            "></button>
                        `).join('')}
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">球体透明度: <span id="opacity-value">${Math.round((custom.targetOpacity || 0.9) * 100)}%</span></label>
                    <input type="range" id="target-opacity" min="0.1" max="1" step="0.05" value="${custom.targetOpacity || 0.9}"
                        style="width: 100%; accent-color: var(--primary);">
                </div>

                <div class="form-group">
                    <label class="form-label">目标大小缩放: <span id="scale-value">${(custom.targetScale || 1.0).toFixed(1)}x</span></label>
                    <input type="range" id="target-scale" min="0.5" max="2.0" step="0.1" value="${custom.targetScale || 1.0}"
                        style="width: 100%; accent-color: var(--primary);">
                </div>

                <!-- 目标预览 -->
                <div style="margin-top: 1rem; text-align: center;">
                    <div style="font-family: Orbitron; font-size: 0.7rem; color: var(--text-dim); letter-spacing: 0.15em; margin-bottom: 0.5rem;">预览</div>
                    <canvas id="target-preview" width="200" height="200" style="
                        background: #0a0a1a; border: 1px solid rgba(0,255,240,0.1); border-radius: 8px;
                    "></canvas>
                </div>
            </div>

            <!-- 右列：准星设置 -->
            <div>
                <h3 style="font-family: Orbitron; font-size: 0.85rem; color: var(--secondary); letter-spacing: 0.15em; margin-bottom: 1rem;">
                    ⊕ 准星设置
                </h3>

                <div class="form-group">
                    <label class="form-label">准星样式</label>
                    <select class="select-field" id="ch-style">
                        <option value="cross" ${ch.style === 'cross' ? 'selected' : ''}>十字 (Cross)</option>
                        <option value="crossdot" ${ch.style === 'crossdot' ? 'selected' : ''}>十字+圆点 (CrossDot)</option>
                        <option value="dot" ${ch.style === 'dot' ? 'selected' : ''}>圆点 (Dot)</option>
                        <option value="circle" ${ch.style === 'circle' ? 'selected' : ''}>圆圈 (Circle)</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">准星颜色</label>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <input type="color" id="ch-color" value="${ch.color || '#00fff0'}"
                            style="width: 60px; height: 40px; border: 1px solid rgba(0,255,240,0.2); background: transparent; cursor: pointer; border-radius: 4px;">
                        <span id="ch-color-hex" style="font-family: Orbitron; font-size: 0.8rem; color: var(--text-dim);">${ch.color || '#00fff0'}</span>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">线条长度: <span id="ch-size-val">${ch.size || 12}</span>px</label>
                    <input type="range" id="ch-size" min="4" max="30" step="1" value="${ch.size || 12}"
                        style="width: 100%; accent-color: var(--secondary);">
                </div>

                <div class="form-group">
                    <label class="form-label">中心间距: <span id="ch-gap-val">${ch.gap || 4}</span>px</label>
                    <input type="range" id="ch-gap" min="0" max="20" step="1" value="${ch.gap || 4}"
                        style="width: 100%; accent-color: var(--secondary);">
                </div>

                <div class="form-group">
                    <label class="form-label">线条粗细: <span id="ch-thick-val">${ch.thickness || 2}</span>px</label>
                    <input type="range" id="ch-thick" min="1" max="6" step="0.5" value="${ch.thickness || 2}"
                        style="width: 100%; accent-color: var(--secondary);">
                </div>

                <div class="form-group">
                    <label class="form-label">准星透明度: <span id="ch-opacity-val">${Math.round((ch.opacity !== undefined ? ch.opacity : 1) * 100)}%</span></label>
                    <input type="range" id="ch-opacity" min="0.2" max="1" step="0.05" value="${ch.opacity !== undefined ? ch.opacity : 1}"
                        style="width: 100%; accent-color: var(--secondary);">
                </div>

                <!-- 准星预览 -->
                <div style="margin-top: 1rem; text-align: center;">
                    <div style="font-family: Orbitron; font-size: 0.7rem; color: var(--text-dim); letter-spacing: 0.15em; margin-bottom: 0.5rem;">准星预览</div>
                    <canvas id="crosshair-preview" width="200" height="200" style="
                        background: #0a0a1a; border: 1px solid rgba(255,0,255,0.1); border-radius: 8px;
                    "></canvas>
                </div>
            </div>
    // ---- 结束 grid ----
        </div>

        <!-- Controls Section -->
        <h3 style="font-family: Orbitron; font-size: 0.85rem; color: var(--text); letter-spacing: 0.15em; margin: 2rem 0 1rem;">
            ⌨️ 键位设置 (CONTROLS)
        </h3>
        <div class="controls-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
            ${Object.values(ACTIONS).map(action => `
                <div class="control-item" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-dim); font-size: 0.8rem;">${action.toUpperCase()}</span>
                    <button class="btn-bind" data-action="${action}" style="
                        background: rgba(0,0,0,0.3); border: 1px solid rgba(0,255,240,0.3); color: var(--primary);
                        padding: 0.2rem 0.8rem; font-family: Orbitron; font-size: 0.8rem; cursor: pointer; min-width: 80px;
                    ">
                        ${keybindManager.getDisplayString(action)}
                    </button>
                </div>
            `).join('')}
            <div class="control-item" style="display: flex; align-items: center;">
                 <button class="btn" id="btn-reset-binds" style="width: 100%; border-color: rgba(255, 50, 80, 0.5); color: #ff3250;">
                    ⟲ 重置键位
                 </button>
            </div>
        </div>

        <button class="btn" id="btn-save-custom" style="margin-top: 2rem; width: 100%;">
            💾 保存所有设置
        </button>
    `;

    // ---- 事件绑定 (原有) ----
    const targetColor = document.getElementById('target-color');
    const targetScale = document.getElementById('target-scale');
    const targetOpacity = document.getElementById('target-opacity');
    const chStyle = document.getElementById('ch-style');
    const chColor = document.getElementById('ch-color');
    const chSize = document.getElementById('ch-size');
    const chGap = document.getElementById('ch-gap');
    const chThick = document.getElementById('ch-thick');
    const chOpacity = document.getElementById('ch-opacity');

    // 实时预览更新
    const updatePreview = () => {
        document.getElementById('target-color-hex').textContent = targetColor.value;
        document.getElementById('opacity-value').textContent = Math.round(targetOpacity.value * 100) + '%';
        document.getElementById('scale-value').textContent = parseFloat(targetScale.value).toFixed(1) + 'x';
        document.getElementById('ch-color-hex').textContent = chColor.value;
        document.getElementById('ch-size-val').textContent = chSize.value;
        document.getElementById('ch-gap-val').textContent = chGap.value;
        document.getElementById('ch-thick-val').textContent = chThick.value;
        document.getElementById('ch-opacity-val').textContent = Math.round(chOpacity.value * 100) + '%';

        drawTargetPreview(targetColor.value, parseFloat(targetOpacity.value), parseFloat(targetScale.value));
        drawCrosshairPreview({
            style: chStyle.value,
            color: chColor.value,
            size: parseInt(chSize.value),
            gap: parseInt(chGap.value),
            thickness: parseFloat(chThick.value),
            opacity: parseFloat(chOpacity.value)
        });
    };

    // 颜色预设按钮
    document.querySelectorAll('.color-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            targetColor.value = btn.dataset.color;
            document.querySelectorAll('.color-preset-btn').forEach(b => b.style.borderColor = 'rgba(255,255,255,0.1)');
            btn.style.borderColor = '#00fff0';
            updatePreview();
        });
    });

    // 所有控件绑定
    [targetColor, targetScale, targetOpacity, chStyle, chColor, chSize, chGap, chThick, chOpacity].forEach(el => {
        el.addEventListener('input', updatePreview);
        el.addEventListener('change', updatePreview);
    });

    // 键位绑定逻辑
    let activeBindBtn = null;

    // 全局监听器 (用于捕获按键)
    const handleBindInput = (e) => {
        if (!activeBindBtn) return;

        e.preventDefault();
        e.stopPropagation();

        const action = activeBindBtn.dataset.action;

        // 忽略 ESC (取消绑定)
        if (e.type === 'keydown' && e.code === 'Escape') {
            activeBindBtn.textContent = keybindManager.getDisplayString(action);
            activeBindBtn.classList.remove('binding');
            activeBindBtn = null;
            document.removeEventListener('keydown', handleBindInput);
            document.removeEventListener('mousedown', handleBindInput);
            return;
        }

        keybindManager.rebind(action, e);

        activeBindBtn.textContent = keybindManager.getDisplayString(action);
        activeBindBtn.classList.remove('binding');
        activeBindBtn = null;

        showNotification(`✅ 已绑定 ${action.toUpperCase()}`, 'success');

        document.removeEventListener('keydown', handleBindInput);
        document.removeEventListener('mousedown', handleBindInput);
    };

    document.querySelectorAll('.btn-bind').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (activeBindBtn) return;

            e.stopPropagation(); // 防止立即触发 mousedown
            activeBindBtn = btn;
            btn.textContent = '按任意键...';
            btn.classList.add('binding');

            // 添加一次性监听器
            document.addEventListener('keydown', handleBindInput);
            document.addEventListener('mousedown', handleBindInput);
        });
    });

    document.getElementById('btn-reset-binds').addEventListener('click', () => {
        if (confirm('确定要重置所有键位吗？')) {
            keybindManager.resetDefaults();
            renderCustomizeUI(); // 重新渲染
            showNotification('键位已重置', 'info');
        }
    });

    // 保存按钮 (视觉设置)
    document.getElementById('btn-save-custom').addEventListener('click', () => {
        const newCustom = {
            targetColor: targetColor.value,
            targetScale: parseFloat(targetScale.value),
            targetOpacity: parseFloat(targetOpacity.value),
            crosshair: {
                style: chStyle.value,
                color: chColor.value,
                size: parseInt(chSize.value),
                gap: parseInt(chGap.value),
                thickness: parseFloat(chThick.value),
                dotSize: 2,
                opacity: parseFloat(chOpacity.value)
            }
        };
        saveCustomization(newCustom);
        showNotification('✅ 自定义设置已保存', 'success');
    });

    // 初始绘制
    setTimeout(updatePreview, 50);
}

/**
 * 绘制目标球体预览
 */
function drawTargetPreview(color, opacity, scale = 1.0) {
    const canvas = document.getElementById('target-preview');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    const r = 40 * scale;
    const cx = w / 2, cy = h / 2;

    // 解析颜色
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    const rgb = result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 51, b: 102 };

    ctx.save();
    ctx.globalAlpha = opacity;

    // 外发光
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;

    // 底色球体渐变
    const baseGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx, cy, r);
    baseGrad.addColorStop(0, `rgba(${Math.min(255, rgb.r + 80)}, ${Math.min(255, rgb.g + 80)}, ${Math.min(255, rgb.b + 80)}, 1)`);
    baseGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`);
    baseGrad.addColorStop(1, `rgba(${Math.max(0, rgb.r - 60)}, ${Math.max(0, rgb.g - 60)}, ${Math.max(0, rgb.b - 60)}, 0.8)`);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = baseGrad;
    ctx.fill();

    // 高光
    ctx.shadowBlur = 0;
    const hlGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.02, cx - r * 0.15, cy - r * 0.2, r * 0.5);
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
    hlGrad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = hlGrad;
    ctx.fill();

    // 边缘
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
}

/**
 * 绘制准星预览
 */
function drawCrosshairPreview(config) {
    const canvas = document.getElementById('crosshair-preview');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = config.opacity;
    ctx.strokeStyle = config.color;
    ctx.fillStyle = config.color;
    ctx.lineWidth = config.thickness;
    ctx.shadowBlur = 6;
    ctx.shadowColor = config.color;

    const drawCrossLines = () => {
        ctx.beginPath(); ctx.moveTo(cx, cy - config.gap); ctx.lineTo(cx, cy - config.gap - config.size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy + config.gap); ctx.lineTo(cx, cy + config.gap + config.size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - config.gap, cy); ctx.lineTo(cx - config.gap - config.size, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + config.gap, cy); ctx.lineTo(cx + config.gap + config.size, cy); ctx.stroke();
    };

    switch (config.style) {
        case 'dot':
            ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
            break;
        case 'circle':
            ctx.beginPath(); ctx.arc(cx, cy, config.size, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
            break;
        case 'crossdot':
            drawCrossLines();
            ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
            break;
        case 'cross':
        default:
            drawCrossLines();
            ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
            break;
    }
    ctx.restore();
}

/* ============================================================
   Routine Logic
   ============================================================ */

function renderRoutinesUI() {
    const listContainer = document.getElementById('routine-list');
    const detailContainer = document.getElementById('routine-detail');
    if (!listContainer || !detailContainer) return;

    const routines = routineManager.routines;

    // Render List
    listContainer.innerHTML = routines.map(r => `
        <div class="routine-item" data-id="${r.id}" style="
            background: rgba(255,255,255,0.05); padding: 1rem; margin-bottom: 0.5rem; 
            border-left: 3px solid transparent; cursor: pointer; transition: all 0.2s;
        ">
            <div style="font-family: Orbitron; color: var(--text);">${r.name}</div>
            <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.3rem;">
                ${r.steps.length} Steps · ${Math.round(r.steps.reduce((a, b) => a + b.duration, 0) / 60)} min
            </div>
        </div>
    `).join('');

    // Bind Click
    listContainer.querySelectorAll('.routine-item').forEach(item => {
        item.addEventListener('click', () => {
            listContainer.querySelectorAll('.routine-item').forEach(i => i.style.borderLeftColor = 'transparent');
            item.style.borderLeftColor = '#00fff0';
            renderRoutineDetail(item.dataset.id);
        });
    });
}

function renderRoutineDetail(id) {
    const container = document.getElementById('routine-detail');
    const routine = routineManager.routines.find(r => r.id === id);
    if (!routine) return;

    container.innerHTML = `
        <h3 style="font-family: Orbitron; color: var(--primary); margin-bottom: 1rem;">${routine.name}</h3>
        <div class="routine-steps" style="margin-bottom: 2rem;">
            ${routine.steps.map((s, i) => `
                <div style="
                    display: flex; align-items: center; gap: 1rem; padding: 0.8rem;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                ">
                    <span style="color: var(--text-dim); font-family: Orbitron;">${i + 1}</span>
                    <span style="flex: 1; color: var(--text); font-weight: 500;">${MODE_NAMES[s.mode] || s.mode}</span>
                    <span style="color: var(--text-dim); font-size: 0.85rem;">${s.difficulty.toUpperCase()}</span>
                    <span style="color: var(--secondary); font-family: Orbitron;">${s.duration}s</span>
                </div>
            `).join('')}
        </div>
        <button class="btn" onclick="window.app.startRoutine('${routine.id}')" style="width: 100%;">
            ▶ START ROUTINE
        </button>
        <div style="margin-top: 1rem; text-align: center; color: var(--text-dim); font-size: 0.8rem;">
            * 编辑功能开发中...
        </div>
    `;
}

// Expose to window for onclick
window.app.startRoutine = (id) => {
    if (routineManager.startRoutine(id)) {
        runRoutineStep();
    }
};

async function runRoutineStep() {
    const step = routineManager.getCurrentStep();

    if (!step) {
        showNotification('🎉 Routine Finished!', 'success');
        router.showView('menu');
        return;
    }

    const modeHandler = MODE_HANDLERS[step.mode];
    if (!modeHandler) {
        showNotification(`Error: Unknown mode ${step.mode}`, 'error');
        return;
    }

    router.showView('training');

    // Custom loading screen
    const overlay = document.getElementById('training-overlay');
    const titleEl = document.getElementById('overlay-title');
    const textEl = document.getElementById('overlay-text');

    overlay.classList.remove('hidden');
    document.getElementById('btn-exit-training').style.display = 'none'; // Hide exit during transition

    // Smooth transition
    titleEl.innerHTML = `<span style="color: var(--primary)">STEP ${step.stepIndex} / ${step.totalSteps}</span>`;
    textEl.innerHTML = `${MODE_NAMES[step.mode]}<br><span style="font-size: 1.5rem; color: var(--secondary);">${step.duration}s</span>`;

    await new Promise(r => setTimeout(r, 2000));

    // Start Engine
    if (state.engine) {
        state.engine.init(step.mode, step.difficulty, modeHandler, {
            duration: step.duration,
            onComplete: (result) => {
                // Show brief result or just next?
                // For now, auto-next
                showNotification(`Step Complete! Score: ${result.score}`, 'success');
                routineManager.nextStep();
                runRoutineStep();
            }
        });
    }
}

// Update Router to handle routines
const originalShowView = router.showView.bind(router);
router.showView = (viewName) => {
    originalShowView(viewName);
    if (viewName === 'routines') renderRoutinesUI();
};

// Add event listener for routine button
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-routines')?.addEventListener('click', () => router.showView('routines'));
});

/* ---------- 导出 ---------- */
export { router, state };
