/* ============================================================
   TrainGun - localStorage 封装
   ============================================================ */

const STORAGE_KEYS = {
    SENSITIVITY: 'traingun_sensitivity',
    RESULTS: 'traingun_results',
    SETTINGS: 'traingun_settings',
    CUSTOMIZATION: 'traingun_customization'
};

/* ==================== 灵敏度 ==================== */

export function saveSensitivity(config) {
    try { localStorage.setItem(STORAGE_KEYS.SENSITIVITY, JSON.stringify(config)); }
    catch (e) { console.error('[Storage] Failed to save sensitivity:', e); }
}

export function loadSensitivity() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.SENSITIVITY);
        return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
}

/* ==================== 自定义设置（目标颜色/透明度/准星） ==================== */

export function getDefaultCustomization() {
    return {
        targetColor: '#ff3366',
        targetOpacity: 0.9,
        crosshair: {
            color: '#00fff0',
            size: 12,
            gap: 4,
            thickness: 2,
            dotSize: 2,
            style: 'cross',
            opacity: 1
        }
    };
}

export function saveCustomization(config) {
    try { localStorage.setItem(STORAGE_KEYS.CUSTOMIZATION, JSON.stringify(config)); }
    catch (e) { console.error('[Storage] Failed to save customization:', e); }
}

export function loadCustomization() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.CUSTOMIZATION);
        return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
}

/* ==================== 训练结果 ==================== */

export function saveTrainingResult(result) {
    try {
        const results = getAllResults();
        result.id = generateId();
        result.timestamp = Date.now();
        results.push(result);
        if (results.length > 500) results.splice(0, results.length - 500);
        localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
    } catch (e) { console.error('[Storage] Failed to save result:', e); }
}

function getAllResults() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.RESULTS);
        return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
}

export function getTrainingResults(mode, limit = 50) {
    const all = getAllResults();
    const filtered = mode ? all.filter(r => r.mode === mode) : all;
    return filtered.slice(-limit);
}

export function getBestScores() {
    const all = getAllResults();
    const modes = ['tracking', 'flicking', 'switching', 'reflex', 'sixtarget', 'humanoid'];
    const best = {};
    modes.forEach(mode => {
        const modeResults = all.filter(r => r.mode === mode);
        if (modeResults.length > 0) {
            best[mode] = modeResults.reduce((max, r) => r.score > max.score ? r : max);
        } else {
            best[mode] = null;
        }
    });
    return best;
}

export function getDailyBest(mode, days = 30) {
    const all = getAllResults();
    const filtered = mode ? all.filter(r => r.mode === mode) : all;
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    const recent = filtered.filter(r => r.timestamp >= cutoff);

    const byDay = {};
    recent.forEach(r => {
        const date = new Date(r.timestamp).toLocaleDateString('zh-CN');
        if (!byDay[date] || r.score > byDay[date].score) {
            byDay[date] = { date, score: r.score, accuracy: r.accuracy };
        }
    });
    return Object.values(byDay).sort((a, b) => new Date(a.date) - new Date(b.date));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function clearAllData() {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}
