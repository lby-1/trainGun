/* ============================================================
   TrainGun - 小人模式 (Humanoid)
   点击小人头部一击毙命，身体需要多颗子弹
   ============================================================ */

import { HumanoidTarget } from '../engine.js';

/* ---------- 难度配置 ---------- */
const DIFFICULTY = {
    easy: {
        scale: 1.3,
        bodyHp: 2,
        maxOnScreen: 1,
        duration: 60
    },
    medium: {
        scale: 1.0,
        bodyHp: 3,
        maxOnScreen: 2,
        duration: 60
    },
    hard: {
        scale: 0.7,
        bodyHp: 4,
        maxOnScreen: 3,
        duration: 60
    }
};

/* ---------- 辅助函数 ---------- */
function spawnHumanoid(engine, config) {
    const scale = config.scale;
    const totalHeight = (14 * 2 + 40 + 30) * scale; // 头直径 + 身体 + 腿
    const margin = 80;

    const x = margin + Math.random() * (engine.canvas.width - margin * 2);
    const y = engine.canvas.height - margin - Math.random() * (engine.canvas.height * 0.3);

    const target = new HumanoidTarget(x, y, scale);
    target.maxHp = config.bodyHp;
    target.hp = config.bodyHp;
    engine.targets.push(target);
}

/* ---------- 内部状态 ---------- */
let killCount = 0;
let spawnTimer = 0;

/* ---------- 模式处理器 ---------- */
export const humanoidMode = {
    _config: null,

    getDuration(difficulty) {
        return DIFFICULTY[difficulty]?.duration || 60;
    },

    init(engine, difficulty) {
        this._config = DIFFICULTY[difficulty] || DIFFICULTY.medium;
        killCount = 0;
        spawnTimer = 0;

        // 生成初始小人
        for (let i = 0; i < this._config.maxOnScreen; i++) {
            spawnHumanoid(engine, this._config);
        }
    },

    update(engine, dt) {
        spawnTimer += dt;

        // 保持屏幕上始终有足够数量的小人
        const active = engine.targets.filter(t => t.state === 'active');
        if (active.length < this._config.maxOnScreen && spawnTimer >= 0.5) {
            spawnTimer = 0;
            spawnHumanoid(engine, this._config);
        }
    },

    /**
     * @param {Object} engine
     * @param {HumanoidTarget} target
     * @param {number} reactionTime
     * @param {string} zone - 'head' 或 'body'
     * @param {Object} result - { killed, headshot, damage }
     */
    onHit(engine, target, reactionTime, zone, result) {
        if (result.headshot) {
            // 爆头：高分！
            let points = 300;

            if (reactionTime < 200) {
                points += 100;
                engine.addFloatingText(target.x + 30, target.headCenterY - 20, 'INSANE!', '#ffaa00');
            } else if (reactionTime < 400) {
                points += 50;
            }

            engine.score += points;
            engine.addFloatingText(target.x, target.headCenterY - 50, `+${points}`, '#ff3333');
            killCount++;

        } else if (result.killed) {
            // 身体击杀（打完所有血量）
            let points = 150;
            engine.score += points;
            engine.addFloatingText(target.x, target.y - target.totalHeight / 2, `+${points}`, '#00fff0');
            killCount++;

        } else {
            // 身体命中但未击杀
            let points = 20;
            engine.score += points;
            engine.addFloatingText(
                target.x + 20,
                target.y - target.totalHeight / 2,
                `+${points} (HP: ${target.hp}/${target.maxHp})`,
                '#ffaa00'
            );
        }
    },

    onMiss(engine) {
        engine.addFloatingText(engine.crosshair.x, engine.crosshair.y - 20, 'MISS', '#ff3366');
    }
};
