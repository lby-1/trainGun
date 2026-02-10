/* ============================================================
   TrainGun - 音频管理器 (Web Audio API 合成音效)
   ============================================================ */

export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // 默认音量
        this.masterGain.connect(this.ctx.destination);
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * 播放射击音效
     * @param {string} type - 武器类型: 'rifle', 'limit', 'sniper', 'pistol'
     */
    playShoot(type) {
        this.resume();
        const t = this.ctx.currentTime;

        // 噪音源 (模拟火药爆炸/气体)
        const bufferSize = this.ctx.sampleRate * 0.5; // 0.5s buffer
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';

        const noiseGain = this.ctx.createGain();

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        // 振荡器 (模拟枪管共鸣/激光感)
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        // 根据类型调整参数
        if (type === 'rifle' || type === 'vandal') {
            // 突击步枪：明显的噪音，中频衰减
            noiseFilter.frequency.setValueAtTime(1000, t);
            noiseFilter.frequency.exponentialRampToValueAtTime(100, t + 0.1);

            noiseGain.gain.setValueAtTime(1, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
            oscGain.gain.setValueAtTime(0.3, t);
            oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        } else if (type === 'sniper' || type === 'operator') {
            // 狙击：巨大的低频和噪音
            noiseFilter.frequency.setValueAtTime(800, t);
            noiseFilter.frequency.exponentialRampToValueAtTime(50, t + 0.3);

            noiseGain.gain.setValueAtTime(1.5, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

            osc.type = 'square';
            osc.frequency.setValueAtTime(100, t);
            osc.frequency.exponentialRampToValueAtTime(20, t + 0.3);
            oscGain.gain.setValueAtTime(0.5, t);
            oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        } else if (type === 'pistol' || type === 'sheriff') {
            // 手枪：短促有力
            noiseFilter.frequency.setValueAtTime(1500, t);
            noiseFilter.frequency.exponentialRampToValueAtTime(100, t + 0.1);

            noiseGain.gain.setValueAtTime(0.8, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
            oscGain.gain.setValueAtTime(0.2, t);
            oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        } else {
            // 激光/默认: 高频 biu biu
            noiseGain.disconnect(); // 不需要噪音

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
            oscGain.gain.setValueAtTime(0.5, t);
            oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        }

        noise.start(t);
        osc.start(t);
        noise.stop(t + 0.5);
        osc.stop(t + 0.5);
    }

    playHit(isHeadshot = false) {
        this.resume();
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        if (isHeadshot) {
            // 爆头：清脆的高音 "Ding!"
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(2000, t);
            osc.frequency.exponentialRampToValueAtTime(3000, t + 0.1); // 上升音调

            gain.gain.setValueAtTime(0.8, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        } else {
            // 普通命中：短促的中高音 "Tick"
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, t);

            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        }

        osc.start(t);
        osc.stop(t + 0.3);
    }

    playKill() {
        // 击杀反馈：令人满意的低音 "Thump"
        this.resume();
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        osc.start(t);
        osc.stop(t + 0.2);
    }
}

// 单例模式
export const audioManager = new AudioManager();
