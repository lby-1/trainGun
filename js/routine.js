/* ============================================================
   TrainGun - 自定义播放列表 (Routine System)
   ============================================================ */

const STORAGE_KEY = 'traingun_routines';

// 默认提供的例程
const DEFAULT_ROUTINES = [
    {
        id: 'r_daily_warmup',
        name: '每日热身 (Daily Warmup)',
        steps: [
            { mode: 'tracking', difficulty: 'medium', duration: 120 },
            { mode: 'flicking', difficulty: 'hard', duration: 120 },
            { mode: 'switching', difficulty: 'medium', duration: 60 }
        ]
    },
    {
        id: 'r_click_master',
        name: '点击大师 (Click Master)',
        steps: [
            { mode: 'flicking', difficulty: 'easy', duration: 60 },
            { mode: 'flicking', difficulty: 'medium', duration: 120 },
            { mode: 'sixtarget', difficulty: 'hard', duration: 120 },
            { mode: 'reflex', difficulty: 'hard', duration: 60 }
        ]
    }
];

class RoutineManager {
    constructor() {
        this.routines = this.load();
        this.activeRoutine = null;
        this.currentStepIndex = -1;
    }

    load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [...DEFAULT_ROUTINES];
        } catch (e) {
            console.error('Failed to load routines', e);
            return [...DEFAULT_ROUTINES];
        }
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.routines));
    }

    createRoutine(name) {
        const newRoutine = {
            id: 'r_' + Date.now(),
            name: name,
            steps: []
        };
        this.routines.push(newRoutine);
        this.save();
        return newRoutine;
    }

    deleteRoutine(id) {
        this.routines = this.routines.filter(r => r.id !== id);
        this.save();
    }

    updateRoutine(id, newSteps) {
        const routine = this.routines.find(r => r.id === id);
        if (routine) {
            routine.steps = newSteps;
            this.save();
        }
    }

    startRoutine(id) {
        const routine = this.routines.find(r => r.id === id);
        if (!routine) return false;

        this.activeRoutine = routine;
        this.currentStepIndex = 0;
        return true;
    }

    getCurrentStep() {
        if (!this.activeRoutine || this.currentStepIndex < 0 || this.currentStepIndex >= this.activeRoutine.steps.length) {
            return null;
        }
        return {
            ...this.activeRoutine.steps[this.currentStepIndex],
            stepIndex: this.currentStepIndex + 1,
            totalSteps: this.activeRoutine.steps.length,
            routineName: this.activeRoutine.name
        };
    }

    nextStep() {
        if (!this.activeRoutine) return null;
        this.currentStepIndex++;
        if (this.currentStepIndex >= this.activeRoutine.steps.length) {
            this.activeRoutine = null; // Finished
            return null;
        }
        return this.getCurrentStep();
    }

    stopRoutine() {
        this.activeRoutine = null;
        this.currentStepIndex = -1;
    }
}

export const routineManager = new RoutineManager();
