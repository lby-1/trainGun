/* ============================================================
   TrainGun - 闪现训练模式 (Reflex)
   目标短暂出现后消失，考验反应速度
   ============================================================ */

import { Target } from '../engine.js';

/**
 * 闪现目标 - 出现后一段时间自动消失
 */
class ReflexTarget extends Target {
    constructor(x, y, radius, lifespan) {
        super(x, y, radius, '#ffaa00');
        this.lifespan = lifespan;
        this.maxLifespan = lifespan;
        this.expired = false;
    }

    update(dt) {
        super.update(dt);
        this.lifespan -= dt;

        // 快消失时颜色变红，闪烁
        if (this.lifespan < 0.3) {
            this.color = '#ff3366';
        } else if (this.lifespan < 0.6) {
            this.color = '#ff6633';
        }

        if (this.lifespan <= 0) {
            this.state = 'expired';
            this.expired = true;
        }
    }

    render(ctx) {
        if (this.state !== 'active') return;

        const r = this.radius * this.scale;
        const progress = this.lifespan / this.maxLifespan;

        ctx.save();

        // 外圈 - 缩小的计时圈
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.stroke();

        // 目标本身
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 内填充
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = this.color + '30';
        ctx.fill();

        // 中心
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
    }
}

/* ---------- 难度配置 ---------- */
const DIFFICULTY = {
    easy: {
        radius: 40,
        lifespan: 1.5,       // 目标存活时间
        interval: 1.2,       // 目标间隔
        duration: 45
    },
    medium: {
        radius: 28,
        lifespan: 0.8,
        interval: 0.8,
        duration: 45
    },
    hard: {
        radius: 16,
        lifespan: 0.4,
        interval: 0.5,
        duration: 45
    }
};

/* ---------- 内部状态 ---------- */
let spawnTimer = 0;
let expiredCount = 0;

/* ---------- 模式处理器 ---------- */
export const reflexMode = {
    _config: null,

    getDuration(difficulty) {
        return DIFFICULTY[difficulty]?.duration || 45;
    },

    init(engine, difficulty) {
        this._config = DIFFICULTY[difficulty] || DIFFICULTY.medium;
        spawnTimer = 0;
        expiredCount = 0;
    },

    update(engine, dt) {
        spawnTimer += dt;

        // 检查过期目标
        engine.targets.forEach(t => {
            if (t.expired && t.state === 'expired') {
                expiredCount++;
                engine.misses++;
                engine.combo = 0;
                engine.score = Math.max(0, engine.score - 10);

                // MISS 文字
                engine.addFloatingText(t.x, t.y - 20, 'MISS', '#ff3366');

                // 标记为不再处理
                t.state = 'hit'; // 防止重复计数
            }
        });

        // 生成新目标
        const activeTargets = engine.targets.filter(t => t.state === 'active');
        if (spawnTimer >= this._config.interval && activeTargets.length === 0) {
            spawnTimer = 0;
            const margin = this._config.radius + 60;
            const x = margin + Math.random() * (engine.canvas.width - margin * 2);
            const y = margin + Math.random() * (engine.canvas.height - margin * 2);
            const target = new ReflexTarget(x, y, this._config.radius, this._config.lifespan);
            engine.targets.push(target);
        }
    },

    onHit(engine, target, reactionTime) {
        let points = 100;
        let bonusText = '';

        // 反应时间奖励
        if (reactionTime < 150) {
            points += 80;
            bonusText = 'INSANE!';
        } else if (reactionTime < 200) {
            points += 50;
            bonusText = 'FAST!';
        }

        // 极限命中（在目标消失前 50ms 内）
        if (target.lifespan <= 0.05) {
            points += 30;
            bonusText = 'CLUTCH!';
        }

        engine.score += points;

        engine.addFloatingText(target.x, target.y - 20, `+${points}`, '#00fff0');
        if (bonusText) {
            engine.addFloatingText(target.x, target.y - 45, bonusText, '#ffaa00');
        }
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
