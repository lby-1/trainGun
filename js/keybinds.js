/* ============================================================
   TrainGun - 键位绑定管理
   ============================================================ */

const STORAGE_KEY = 'traingun_keybinds';

export const ACTIONS = {
    FIRE: 'fire',
    ADS: 'ads',
    RELOAD: 'reload',
    RESTART: 'restart',
    PAUSE: 'pause',
    WEAPON_1: 'weapon1',
    WEAPON_2: 'weapon2',
    WEAPON_3: 'weapon3',
    WEAPON_4: 'weapon4'
};

const DEFAULT_KEYBINDS = {
    [ACTIONS.FIRE]: { type: 'mouse', code: 0 },         // Left Click
    [ACTIONS.ADS]: { type: 'mouse', code: 2 },          // Right Click
    [ACTIONS.RELOAD]: { type: 'keyboard', code: 'KeyR' },
    [ACTIONS.RESTART]: { type: 'keyboard', code: 'KeyR' },
    [ACTIONS.PAUSE]: { type: 'keyboard', code: 'Escape' },
    [ACTIONS.WEAPON_1]: { type: 'keyboard', code: 'Digit1' },
    [ACTIONS.WEAPON_2]: { type: 'keyboard', code: 'Digit2' },
    [ACTIONS.WEAPON_3]: { type: 'keyboard', code: 'Digit3' },
    [ACTIONS.WEAPON_4]: { type: 'keyboard', code: 'Digit4' }
};

class KeybindManager {
    constructor() {
        this.bindings = this.load();
    }

    load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? { ...DEFAULT_KEYBINDS, ...JSON.parse(stored) } : { ...DEFAULT_KEYBINDS };
        } catch (e) {
            console.error('Failed to load keybinds', e);
            return { ...DEFAULT_KEYBINDS };
        }
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bindings));
    }

    /**
     * Check if an event matches an action
     * @param {string} action - Action name (from ACTIONS)
     * @param {Event} event - KeyboardEvent or MouseEvent
     */
    isAction(action, event) {
        const binding = this.bindings[action];
        if (!binding) return false;

        if (event instanceof MouseEvent) {
            return binding.type === 'mouse' && event.button === binding.code;
        } else if (event instanceof KeyboardEvent) {
            // Check both code (physical key) and key (character) for flexibility?
            // Usually 'code' is better for games (location based), but 'key' is better for typing.
            // Let's stick to 'code' for now as it's standard for games.
            return binding.type === 'keyboard' && event.code === binding.code;
        }
        return false;
    }

    /**
     * Bind a new key to an action
     * @param {string} action 
     * @param {Event} event 
     */
    rebind(action, event) {
        if (event instanceof MouseEvent) {
            this.bindings[action] = { type: 'mouse', code: event.button };
        } else if (event instanceof KeyboardEvent) {
            this.bindings[action] = { type: 'keyboard', code: event.code };
        }
        this.save();
    }

    resetDefaults() {
        this.bindings = { ...DEFAULT_KEYBINDS };
        this.save();
    }

    getDisplayString(action) {
        const binding = this.bindings[action];
        if (!binding) return 'UNKNOWN';

        if (binding.type === 'mouse') {
            if (binding.code === 0) return 'LMB';
            if (binding.code === 1) return 'MMB';
            if (binding.code === 2) return 'RMB';
            return `Mouse ${binding.code}`;
        }

        return binding.code.replace('Key', '').replace('Digit', '');
    }
}

export const keybindManager = new KeybindManager();
