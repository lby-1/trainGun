/* ============================================================
   TrainGun - 切换训练模式 (Target Switching)
   多个目标同时出现，快速切换点击
   ============================================================ */

import { Target } from '../engine.js';

/**
 * 切换目标 - 可选静止或缓慢移动
 */
class SwitchTarget extends Target {
    constructor(x, y, radius, moving = false) {
        super(x, y, radius, '#ff6b35');
        this.moving = moving;
        this.vx = moving ? (Math.random() - 0.5) * 60 : 0;
        this.vy = moving ? (Math.random() - 0.5) * 60 : 0;
        this.canvasWidth = 0;
        this.canvasHeight = 0;
    }

    setBounds(w, h) {
        this.canvasWidth = w;
        this.canvasHeight = h;
    }

    update(dt) {
        super.update(dt);
        if (this.moving) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            const margin = this.radius + 20;
            if (this.x < margin || this.x > this.canvasWidth - margin) this.vx *= -1;
            if (this.y < margin || this.y > this.canvasHeight - margin) this.vy *= -1;

            this.x = Math.max(margin, Math.min(this.canvasWidth - margin, this.x));
            this.y = Math.max(margin, Math.min(this.canvasHeight - margin, this.y));
        }
    }
}

/* ---------- 难度配置 ---------- */
const DIFFICULTY = {
    easy: {
        radius: 35,
        count: 2,
        moving: false,
        duration: 60
    },
    medium: {
        radius: 25,
        count: 3,
        moving: false,
        duration: 60
    },
    hard: {
        radius: 18,
        count: 5,
        moving: true,
        duration: 60
    }
};

/* ---------- 辅助函数 ---------- */
function spawnBatch(engine, config) {
    const targets = [];
    const margin = config.radius + 80;
    const minDist = config.radius * 4; // 最小间距

    for (let i = 0; i < config.count; i++) {
        let x, y, attempts = 0;
        do {
            x = margin + Math.random() * (engine.canvas.width - margin * 2);
            y = margin + Math.random() * (engine.canvas.height - margin * 2);
            attempts++;
        } while (
            attempts < 50 &&
            targets.some(t => {
                const dx = t.x - x;
                const dy = t.y - y;
                return Math.sqrt(dx * dx + dy * dy) < minDist;
            })
        );

        const target = new SwitchTarget(x, y, config.radius, config.moving);
        target.setBounds(engine.canvas.width, engine.canvas.height);
        targets.push(target);
    }

    engine.targets.push(...targets);
}

/* ---------- 内部状态 ---------- */
let batchCleared = 0;
let lastHitTime = 0;

/* ---------- 模式处理器 ---------- */
export const switchingMode = {
    _config: null,

    getDuration(difficulty) {
        return DIFFICULTY[difficulty]?.duration || 60;
    },

    init(engine, difficulty) {
        this._config = DIFFICULTY[difficulty] || DIFFICULTY.medium;
        batchCleared = 0;
        lastHitTime = performance.now();
        spawnBatch(engine, this._config);
    },

    update(engine, dt) {
        // 如果所有目标被清除，刷新新一批
        const activeTargets = engine.targets.filter(t => t.state === 'active');
        if (activeTargets.length === 0) {
            batchCleared++;
            // 全清奖励
            engine.score += 200;
            engine.addFloatingText(
                engine.canvas.width / 2,
                engine.canvas.height / 2 - 50,
                `CLEAR! +200`,
                '#00fff0'
            );
            spawnBatch(engine, this._config);
        }
    },

    onHit(engine, target, reactionTime) {
        let points = 100;

        // 切换速度奖励（两次命中间隔）
        const now = performance.now();
        const switchTime = now - lastHitTime;
        lastHitTime = now;

        if (switchTime < 200) {
            points += 80;
            engine.addFloatingText(target.x, target.y - 45, 'LIGHTNING!', '#ffaa00');
        } else if (switchTime < 300) {
            points += 50;
            engine.addFloatingText(target.x, target.y - 45, 'SWIFT!', '#ffaa00');
        } else if (switchTime < 500) {
            points += 20;
        }

        engine.score += points;
        engine.addFloatingText(target.x, target.y - 20, `+${points}`, '#00fff0');
    },

    onMiss(engine) {
        engine.addFloatingText(
            engine.crosshair.x,
            engine.crosshair.y - 20,
            'MISS',
            '#ff3366'
        );
    }
};
