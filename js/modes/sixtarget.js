/* ============================================================
   TrainGun - 六目标模式 (Six Target)
   6 个球体目标同时出现，全部击中后刷新
   ============================================================ */

import { Target } from '../engine.js';

/* ---------- 难度配置 ---------- */
const DIFFICULTY = {
    easy: { radius: 35, duration: 60 },
    medium: { radius: 25, duration: 60 },
    hard: { radius: 16, duration: 60 }
};

/* ---------- 辅助函数 ---------- */
function spawnSixTargets(engine, config) {
    const targets = [];
    const margin = config.radius + 80;
    const minDist = config.radius * 3.5;

    for (let i = 0; i < 6; i++) {
        let x, y, attempts = 0;
        do {
            x = margin + Math.random() * (engine.canvas.width - margin * 2);
            y = margin + Math.random() * (engine.canvas.height - margin * 2);
            attempts++;
        } while (
            attempts < 80 &&
            targets.some(t => {
                const dx = t.x - x;
                const dy = t.y - y;
                return Math.sqrt(dx * dx + dy * dy) < minDist;
            })
        );

        targets.push(new Target(x, y, config.radius));
    }

    engine.targets.push(...targets);
}

/* ---------- 内部状态 ---------- */
let waveCount = 0;

/* ---------- 模式处理器 ---------- */
export const sixtargetMode = {
    _config: null,

    getDuration(difficulty) {
        return DIFFICULTY[difficulty]?.duration || 60;
    },

    init(engine, difficulty) {
        this._config = DIFFICULTY[difficulty] || DIFFICULTY.medium;
        waveCount = 0;
        spawnSixTargets(engine, this._config);
    },

    update(engine, dt) {
        const active = engine.targets.filter(t => t.state === 'active');
        if (active.length === 0) {
            waveCount++;
            // 全清奖励
            engine.score += 300;
            engine.addFloatingText(
                engine.canvas.width / 2,
                engine.canvas.height / 2 - 50,
                `WAVE ${waveCount} CLEAR! +300`,
                '#00fff0'
            );
            spawnSixTargets(engine, this._config);
        }
    },

    onHit(engine, target, reactionTime) {
        let points = 100;

        if (reactionTime < 200) {
            points += 60;
            engine.addFloatingText(target.x, target.y - 30, 'FAST!', '#ffaa00');
        } else if (reactionTime < 350) {
            points += 30;
        }

        // 连击奖励
        if (engine.combo >= 3) points += 20;
        if (engine.combo >= 5) points += 30;

        engine.score += points;
        engine.addFloatingText(target.x, target.y - 10, `+${points}`, '#00fff0');
    },

    onMiss(engine) {
        engine.addFloatingText(engine.crosshair.x, engine.crosshair.y - 20, 'MISS', '#ff3366');
    }
};
