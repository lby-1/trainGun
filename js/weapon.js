/* ============================================================
   TrainGun - 武器系统
   包含武器基类、预设配置及后坐力/开镜逻辑
   ============================================================ */

export class Weapon {
    constructor(config) {
        this.name = config.name;
        this.type = config.type || 'rifle';

        // 基础属性
        this.damage = config.damage || 100;         // 单发伤害
        this.fireRate = config.fireRate || 100;     // 射击间隔 (ms)
        this.auto = config.auto !== false;          // 是否全自动

        // 弹药系统
        this.magazineSize = config.magazineSize || 30;
        this.currentAmmo = this.magazineSize;
        this.reloadTime = config.reloadTime || 2000; // 换弹时间 (ms)
        this.isReloading = false;

        // 后坐力系统 (简化版：仅垂直上跳 + 水平抖动)
        this.recoil = {
            vertical: config.recoil?.vertical || 0,     // 垂直上跳力度
            horizontal: config.recoil?.horizontal || 0, // 水平抖动范围
            recovery: config.recoil?.recovery || 0.1,   // 恢复速度 (每帧)
            max: config.recoil?.max || 0                // 最大偏移
        };
        this.currentRecoil = { x: 0, y: 0 };

        // 开镜系统
        this.canScope = config.canScope || false;
        this.zoom = config.zoom || 1.0;             // 开镜放大倍率
        this.scopeSpeed = config.scopeSpeed || 0.2; // 开镜过度速度
        this.isScoped = false;
        this.scopeProgress = 0;                     // 0 = 未开镜, 1 = 完全开镜

        // 状态
        this.lastFireTime = 0;
        this.reloadTimer = null;
    }

    /**
     * 尝试开火
     * @param {number} time 当前时间戳
     * @returns {Object} { fired: boolean, recoil: {x, y} }
     */
    fire(time) {
        if (this.isReloading) return { fired: false };
        if (this.currentAmmo <= 0) {
            this.reload();
            return { fired: false };
        }
        if (time - this.lastFireTime < this.fireRate) return { fired: false };

        // 开火成功
        this.currentAmmo--;
        this.lastFireTime = time;

        // 计算后坐力
        const recoilX = (Math.random() - 0.5) * this.recoil.horizontal;
        const recoilY = -this.recoil.vertical; // 向上跳 = Y轴负方向

        // 应用后坐力 (累加)
        this.currentRecoil.x += recoilX;
        this.currentRecoil.y += recoilY;

        // 限制最大后坐力
        const len = Math.sqrt(this.currentRecoil.x ** 2 + this.currentRecoil.y ** 2);
        if (len > this.recoil.max && this.recoil.max > 0) {
            const scale = this.recoil.max / len;
            this.currentRecoil.x *= scale;
            this.currentRecoil.y *= scale;
        }

        return { fired: true, recoil: { x: recoilX, y: recoilY } };
    }

    /**
     * 开始换弹
     */
    reload() {
        if (this.isReloading || this.currentAmmo === this.magazineSize) return;

        this.isReloading = true;

        // 模拟换弹过程
        setTimeout(() => {
            this.currentAmmo = this.magazineSize;
            this.isReloading = false;
        }, this.reloadTime);
    }

    /**
     * 切换开镜状态
     */
    toggleScope() {
        if (this.canScope) {
            this.isScoped = !this.isScoped;
        }
    }

    /**
     * 更新状态 (主要是后坐力恢复)
     * @param {number} dt Delta time (seconds)
     */
    update(dt) {
        // 后坐力自然恢复
        this.currentRecoil.x *= (1 - this.recoil.recovery * dt * 60); // 假设60fps标准化
        this.currentRecoil.y *= (1 - this.recoil.recovery * dt * 60);

        if (Math.abs(this.currentRecoil.x) < 0.1) this.currentRecoil.x = 0;
        if (Math.abs(this.currentRecoil.y) < 0.1) this.currentRecoil.y = 0;

        // 开镜动画过渡
        const targetScope = this.isScoped ? 1 : 0;
        this.scopeProgress += (targetScope - this.scopeProgress) * this.scopeSpeed * dt * 60;
    }

    /**
     * 获取当前的准星偏移 (用于渲染)
     */
    getOffset() {
        return {
            x: this.currentRecoil.x,
            y: this.currentRecoil.y
        };
    }

    /**
     * 渲染武器模型
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} w Canvas Width
     * @param {number} h Canvas Height
     * @param {Object} state { time, gunOffset: {x,y}, sway: {x,y} }
     */
    render(ctx, w, h, state) {
        if (this.isScoped && this.scopeProgress > 0.8) return; // 开镜时不渲染枪模

        ctx.save();

        // 基础位置 (右下角)
        const baseX = w * 0.75; // 75% 宽度处
        const baseY = h * 0.95; // 底部

        // 应用偏移 (后坐力 + 呼吸摆动 + 换弹)
        let dx = state.gunOffset.x + state.sway.x * 20;
        let dy = state.gunOffset.y + state.sway.y * 10;
        let rot = state.gunOffset.y * 0.005 + state.sway.x * 0.05; // 简单的旋转

        // 换弹动画 (下潜)
        if (this.isReloading) {
            dy += 200;
            rot += 0.5;
        }

        ctx.translate(baseX + dx, baseY + dy);
        ctx.rotate(rot);

        // 绘制通用枪械几何体
        this._drawGunModel(ctx);

        // 枪口火焰
        if (state.lastFireTime && state.time - state.lastFireTime < 50) {
            this._drawMuzzleFlash(ctx);
        }

        ctx.restore();
    }

    _drawGunModel(ctx) {
        ctx.fillStyle = '#1a1a2e'; // 枪身深色
        ctx.strokeStyle = '#00fff0'; // 霓虹边框
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0, 255, 240, 0.2)';

        ctx.beginPath();
        if (this.type === 'pistol') {
            // 手枪短小
            ctx.moveTo(0, 0);
            ctx.lineTo(200, -50);
            ctx.lineTo(200, -120);
            ctx.lineTo(-50, -120);
            ctx.lineTo(-100, 0);
        } else if (this.type === 'sniper') {
            // 狙击枪细长
            ctx.moveTo(0, 0);
            ctx.lineTo(500, -80); // 枪管长
            ctx.lineTo(500, -130);
            ctx.lineTo(100, -150); // 瞄准镜位置高
            ctx.lineTo(-50, -100);
            ctx.lineTo(-150, 0);
        } else {
            // 步枪标准
            ctx.moveTo(0, 0);
            ctx.lineTo(400, -60);
            ctx.lineTo(400, -110);
            ctx.lineTo(-50, -110);
            ctx.lineTo(-150, 0);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 细节纹理
        ctx.fillStyle = '#2a2a4e';
        ctx.fillRect(50, -80, 100, 10); // 导轨

        // 能量槽 (显示弹药状态)
        const ammoRatio = this.currentAmmo / this.magazineSize;
        ctx.fillStyle = ammoRatio > 0.3 ? '#00fff0' : '#ff3366';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 15;
        ctx.fillRect(-20, -50, 10 * Math.max(0, ammoRatio * 10), 5);
        ctx.shadowBlur = 0;
    }

    _drawMuzzleFlash(ctx) {
        // 枪口位置估计
        let tipX = 400, tipY = -85;
        if (this.type === 'pistol') { tipX = 200; tipY = -85; }
        if (this.type === 'sniper') { tipX = 500; tipY = -105; }

        ctx.translate(tipX, tipY);

        ctx.fillStyle = '#ffffaa';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 40;

        ctx.beginPath();
        const size = Math.random() * 50 + 50;
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
        }
        ctx.fill();
    }
}

/* ==================== 武器预设 ==================== */
export const WEAPON_PRESETS = {
    standard: new Weapon({
        name: 'Standard',
        type: 'laser',
        damage: 100,
        fireRate: 0, // 无限制
        magazineSize: 9999,
        reloadTime: 0,
        recoil: { vertical: 0, horizontal: 0, recovery: 1, max: 0 },
        canScope: false
    }),

    vandal: new Weapon({
        name: 'Vandal', // 类似 AK
        type: 'rifle',
        damage: 40,
        fireRate: 100, // 10发/秒
        magazineSize: 25,
        reloadTime: 2500,
        recoil: { vertical: 2, horizontal: 1, recovery: 0.15, max: 50 },
        canScope: true,
        zoom: 1.25
    }),

    operator: new Weapon({
        name: 'Operator', // 狙击
        type: 'sniper',
        damage: 150,
        fireRate: 1200, // 慢速
        magazineSize: 5,
        reloadTime: 3700,
        recoil: { vertical: 15, horizontal: 2, recovery: 0.05, max: 80 },
        canScope: true,
        zoom: 2.5
    }),

    sheriff: new Weapon({
        name: 'Sheriff', // 沙鹰
        type: 'pistol',
        damage: 55,
        fireRate: 250,
        magazineSize: 6,
        reloadTime: 2000,
        recoil: { vertical: 8, horizontal: 0.5, recovery: 0.2, max: 40 },
        canScope: false
    })
};
