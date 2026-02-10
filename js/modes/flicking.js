/* ============================================================
   TrainGun - 点击训练模式 (Flicking)
   目标出现在随机位置，玩家快速甩枪点击
   ============================================================ */

import { Target } from '../engine.js';

/**
 * 点击目标 - 静态，出现后等待点击
 */
class FlickTarget extends Target {
    constructor(x, y, radius) {
        super(x, y, radius, '#ff3366');
    }
}

/* ---------- 难度配置 ---------- */
const DIFFICULTY = {
    easy: {
        radius: 40,
        duration: 60
    },
    medium: {
        radius: 25,
        duration: 60
    },
    hard: {
        radius: 15,
        duration: 60
    }
};

/* ---------- 辅助函数 ---------- */
function spawnTarget(engine, config) {
    const margin = config.radius + 60;
    const x = margin + Math.random() * (engine.canvas.width - margin * 2);
    const y = margin + Math.random() * (engine.canvas.height - margin * 2);
    const target = new FlickTarget(x, y, config.radius);
    engine.targets.push(target);
}

/* ---------- 模式处理器 ---------- */
export const flickingMode = {
    _config: null,

    getDuration(difficulty) {
        return DIFFICULTY[difficulty]?.duration || 60;
    },

    init(engine, difficulty) {
        this._config = DIFFICULTY[difficulty] || DIFFICULTY.medium;
        // 生成第一个目标
        spawnTarget(engine, this._config);
    },

    update(engine, dt) {
        // 如果没有活跃目标，生成新的
        const activeTargets = engine.targets.filter(t => t.state === 'active');
        if (activeTargets.length === 0) {
            spawnTarget(engine, this._config);
        }
    },

    onHit(engine, target, reactionTime) {
        // 基础分
        let points = 100;

        // 反应时间奖励
        let bonusText = '';
        if (reactionTime < 150) {
            points += 80;
            bonusText = 'INSANE!';
        } else if (reactionTime < 250) {
            points += 50;
            bonusText = 'FAST!';
        } else if (reactionTime < 400) {
            points += 20;
            bonusText = 'NICE';
        }

        // 连击奖励
        if (engine.combo >= 5) {
            points += 30;
        } else if (engine.combo >= 10) {
            points += 60;
        }

        engine.score += points;

        // 浮动文字
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
