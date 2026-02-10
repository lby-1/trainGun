/* ============================================================
   TrainGun - 六目标模式 (Six Target)
   6 个球体目标同时出现，消灭一个生成一个，永动机模式
   ============================================================ */

import { Target } from '../engine.js';
import { loadCustomization, getDefaultCustomization } from '../storage.js';

/* ---------- 难度配置 ---------- */
const DIFFICULTY = {
    easy: { radius: 35, duration: 60 },
    medium: { radius: 25, duration: 60 },
    hard: { radius: 18, duration: 60 }
};

/* ---------- 辅助函数 ---------- */
function spawnOneTarget(engine, baseRadius) {
    const custom = loadCustomization() || getDefaultCustomization();
    const scale = custom.targetScale || 1.0;
    const finalRadius = baseRadius * scale;

    // 边距和最小间距
    const margin = finalRadius + 50;
    const minDist = finalRadius * 3.0; // 降低一点间距要求，避免太难生成

    let x, y, attempts = 0;
    const activeTargets = engine.targets.filter(t => t.state === 'active');

    do {
        x = margin + Math.random() * (engine.canvas.width - margin * 2);
        y = margin + Math.random() * (engine.canvas.height - margin * 2);
        attempts++;

        // 检查与现有活跃目标的重叠
        const overlap = activeTargets.some(t => {
            const dx = t.x - x;
            const dy = t.y - y;
            return Math.sqrt(dx * dx + dy * dy) < minDist;
        });

        if (!overlap) break;

    } while (attempts < 100);

    engine.targets.push(new Target(x, y, finalRadius));
}

/* ---------- 模式处理器 ---------- */
export const sixtargetMode = {
    _baseConfig: null,

    getDuration(difficulty) {
        return DIFFICULTY[difficulty]?.duration || 60;
    },

    init(engine, difficulty) {
        this._baseConfig = DIFFICULTY[difficulty] || DIFFICULTY.medium;
        // 初始生成 6 个目标
        for (let i = 0; i < 6; i++) {
            spawnOneTarget(engine, this._baseConfig.radius);
        }
    },

    update(engine, dt) {
        // 兜底逻辑：如果因为某种原因目标少于 6 个，补齐
        // 注意：engine.targets 包含 'hit' 状态正在播放动画的目标，我们需要统计 'active' 的
        const activeCount = engine.targets.filter(t => t.state === 'active').length;
        if (activeCount < 6) {
            spawnOneTarget(engine, this._baseConfig.radius);
        }
    },

    onHit(engine, target, reactionTime) {
        // 命中逻辑
        let points = 100;

        if (reactionTime < 250) {
            points += 50;
            engine.addFloatingText(target.x, target.y - 30, 'FAST!', '#ffaa00');
        }

        // 连击奖励
        if (engine.combo >= 10) points += 50; // 更高的连击奖励
        else if (engine.combo >= 5) points += 20;

        engine.score += points;
        engine.addFloatingText(target.x, target.y - 10, `+${points}`, '#00fff0');

        // logic moved to update() or handled here?
        // 如果在 onHit 这里生成，可以确保节奏紧凑。
        // update() 会在下一帧补齐，所以这里不写也行，但写了反应更快。
        // 为了避免 update() 重复生成（如果 update 先运行？），我们只依赖 update() 即可。
        // 但是 update() 是每帧运行，如果在这里 spawn，activeCount 马上变 6。
        // 考虑到 engine 循环顺序：update -> mode.update。
        // onHit 发生在 input handler 中，在 update 之前或之后。
        // 最好是 onHit 触发生成，update 做兜底。

        spawnOneTarget(engine, this._baseConfig.radius);
    },

    onMiss(engine) {
        engine.addFloatingText(engine.crosshair.x, engine.crosshair.y - 20, 'MISS', '#ff3366');
    }
};
