/* ============================================================
   TrainGun - 追踪训练模式 (Tracking)
   目标平滑移动，玩家持续瞄准保持准星在目标上
   ============================================================ */

import { Target } from '../engine.js';

/**
 * 追踪目标 - 使用正弦波 + 噪声组合运动
 */
class TrackingTarget extends Target {
    constructor(x, y, radius, canvasWidth, canvasHeight, speed) {
        super(x, y, radius, '#00ff88');
        this.baseX = x;
        this.baseY = y;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.speed = speed;
        this.time = Math.random() * 100;
        this.isTracked = false;
        this.trackedTime = 0;

        // 运动参数
        this.freqX = 0.5 + Math.random() * 1.5;
        this.freqY = 0.3 + Math.random() * 1.2;
        this.ampX = canvasWidth * 0.15 + Math.random() * canvasWidth * 0.15;
        this.ampY = canvasHeight * 0.15 + Math.random() * canvasHeight * 0.15;
        this.phaseX = Math.random() * Math.PI * 2;
        this.phaseY = Math.random() * Math.PI * 2;

        // 二级噪声
        this.noiseFreqX = 2 + Math.random() * 3;
        this.noiseFreqY = 2.5 + Math.random() * 3;
        this.noiseAmpX = 20 + Math.random() * 30;
        this.noiseAmpY = 20 + Math.random() * 30;
    }

    update(dt) {
        super.update(dt);
        this.time += dt * this.speed;

        // 正弦运动 + 噪声
        const nx = Math.sin(this.time * this.freqX + this.phaseX) * this.ampX
            + Math.sin(this.time * this.noiseFreqX) * this.noiseAmpX;
        const ny = Math.sin(this.time * this.freqY + this.phaseY) * this.ampY
            + Math.cos(this.time * this.noiseFreqY) * this.noiseAmpY;

        this.x = this.baseX + nx;
        this.y = this.baseY + ny;

        // 边界限制
        const margin = this.radius + 20;
        this.x = Math.max(margin, Math.min(this.canvasWidth - margin, this.x));
        this.y = Math.max(margin, Math.min(this.canvasHeight - margin, this.y));
    }

    render(ctx) {
        if (this.state !== 'active') return;

        const r = this.radius * this.scale;
        const targetColor = this.isTracked ? '#00ff88' : '#ff6666';
        const glow = this.isTracked ? 20 : 10;

        ctx.save();

        // 外圈发光
        ctx.shadowBlur = glow;
        ctx.shadowColor = targetColor;

        // 拖尾效果
        if (this.isTracked) {
            ctx.globalAlpha = 0.15;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff88';
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // 外圈
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = targetColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 内圈
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = targetColor + '30';
        ctx.fill();

        // 中心
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 追踪进度环（左下角弧线显示连续追踪时间）
        if (this.isTracked && this.trackedTime > 0) {
            const progress = Math.min(this.trackedTime / 2, 1); // 2秒满
            ctx.beginPath();
            ctx.arc(this.x, this.y, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.strokeStyle = '#00fff0';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.restore();
    }
}

/* ---------- 难度配置 ---------- */
const DIFFICULTY = {
    easy: {
        radius: 45,
        speed: 0.5,
        duration: 30
    },
    medium: {
        radius: 30,
        speed: 0.8,
        duration: 30
    },
    hard: {
        radius: 18,
        speed: 1.3,
        duration: 30
    }
};

/* ---------- 模式处理器 ---------- */
export const trackingMode = {
    getDuration(difficulty) {
        return DIFFICULTY[difficulty]?.duration || 30;
    },

    init(engine, difficulty) {
        const config = DIFFICULTY[difficulty] || DIFFICULTY.medium;
        const cx = engine.canvas.width / 2;
        const cy = engine.canvas.height / 2;

        const target = new TrackingTarget(
            cx, cy,
            config.radius,
            engine.canvas.width,
            engine.canvas.height,
            config.speed
        );

        engine.targets = [target];
    },

    update(engine, dt) {
        const target = engine.targets[0];
        if (!target) return;

        // 每帧检测准星是否在目标上
        engine.trackingFrames++;

        const isOnTarget = target.isHit(engine.crosshair.x, engine.crosshair.y);
        target.isTracked = isOnTarget;

        if (isOnTarget) {
            engine.trackingHitFrames++;
            target.trackedTime += dt;

            // 基础分 +1/帧
            engine.score += 1;

            // 连续追踪奖励（超过1秒后每帧额外+0.5）
            if (target.trackedTime > 1) {
                engine.score += 1;
                engine.combo = Math.floor(target.trackedTime);
            }
        } else {
            target.trackedTime = 0;
            engine.combo = 0;
        }
    },

    onHit() {
        // 追踪模式不使用点击命中
    },

    onMiss() {
        // 追踪模式不使用点击
    }
};
