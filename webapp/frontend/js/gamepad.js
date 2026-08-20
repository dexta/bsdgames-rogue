// --- 1. NUMERISCHE W3C/SDL BUTTON INDIZES ---
const BTN_A = 0, BTN_B = 1, BTN_X = 2, BTN_Y = 3;
const BTN_L1 = 4, BTN_R1 = 5;
const BTN_L2 = 6, BTN_R2 = 7; // Triggers für RUN / CTRL-RUN
const D_UP = 12, D_DOWN = 13, D_LEFT = 14, D_RIGHT = 15;

// Map: Numeric Button-ID -> HTML-Element im HUD
const HUD_ELEMENTS = {
    [BTN_A]: document.getElementById('btn-vis-A'),
    [BTN_B]: document.getElementById('btn-vis-B'),
    [BTN_X]: document.getElementById('btn-vis-X'),
    [BTN_Y]: document.getElementById('btn-vis-Y'),
    [BTN_L1]: document.getElementById('btn-vis-L1'),
    [BTN_R1]: document.getElementById('btn-vis-R1'),
    [BTN_L2]: document.getElementById('btn-vis-L2'),
    [BTN_R2]: document.getElementById('btn-vis-R2'),
    [D_UP]: document.getElementById('btn-vis-UP'),
    [D_DOWN]: document.getElementById('btn-vis-DOWN'),
    [D_LEFT]: document.getElementById('btn-vis-LEFT'),
    [D_RIGHT]: document.getElementById('btn-vis-RIGHT'),
};

// Standard-Ebenen
const DEFAULT_LAYERS = {
    DEFAULT: {
        [D_UP]: { key: 'k', label: 'Up' }, [D_DOWN]: { key: 'j', label: 'Down' },
        [D_LEFT]: { key: 'h', label: 'Left' }, [D_RIGHT]: { key: 'l', label: 'Right' },
        [BTN_A]: { key: ' ', label: 'Confirm' }, [BTN_B]: { key: 's', label: 'Search' },
        [BTN_X]: { key: '.', label: 'Rest' }, [BTN_Y]: { key: ',', label: 'Pick up' }
    },
    L1: { // Combat / Diag
        [D_UP]: { key: 'y', label: 'Diag UL' }, [D_DOWN]: { key: 'n', label: 'Diag DR' },
        [D_LEFT]: { key: 'b', label: 'Diag DL' }, [D_RIGHT]: { key: 'u', label: 'Diag UR' },
        [BTN_A]: { key: 't', label: 'Throw' }, [BTN_B]: { key: 'z', label: 'Zap' },
        [BTN_X]: { key: '<', label: 'Stairs Up' }, [BTN_Y]: { key: '>', label: 'Stairs Down' }
    },
    R1: { // Inventory / Actions
        [D_UP]: { key: 'w', label: 'Wield' }, [D_DOWN]: { key: 'W', label: 'Wear' },
        [D_LEFT]: { key: 'T', label: 'Take off' }, [D_RIGHT]: { key: 'd', label: 'Drop' },
        [BTN_A]: { key: 'e', label: 'Eat' }, [BTN_B]: { key: 'q', label: 'Quaff' },
        [BTN_X]: { key: 'r', label: 'Read' }, [BTN_Y]: { key: 'i', label: 'Invent' }
    }
};

let userLayers = JSON.parse(localStorage.getItem('rogue_layers_std')) || JSON.parse(JSON.stringify(DEFAULT_LAYERS));
let activeLayerName = 'DEFAULT';

// --- 2. DETAIL MODI FÜR DAS HUD ---
// Modes: 'BOTH' (Kürzel + Text), 'KEY' (nur Kürzel), 'LABEL' (nur Text)
const DETAIL_MODES = ['BOTH', 'KEY', 'LABEL'];
let currentDetailModeIndex = parseInt(localStorage.getItem('rogue_hud_mode_idx')) || 0;

const hudDetailBtn = document.getElementById('hud-detail-toggle');

function updateDetailBtnText() {
    const mode = DETAIL_MODES[currentDetailModeIndex];
    if (hudDetailBtn) hudDetailBtn.innerText = `[ HUD: ${mode} ]`;
}
updateDetailBtnText();

if (hudDetailBtn) {
    hudDetailBtn.onclick = () => {
        currentDetailModeIndex = (currentDetailModeIndex + 1) % DETAIL_MODES.length;
        localStorage.setItem('rogue_hud_mode_idx', currentDetailModeIndex);
        updateDetailBtnText();
        updateControlsUI(activeLayerName);
    };
}

// --- 3. GAMEPAD & INITIALISIERUNG ---
let gamepadParser = null;

window.addEventListener("gamepadconnected", (e) => {
    console.log(`[HARDWARE] Controller verbunden: ${e.gamepad.id}`);
});

fetch('gamecontrollerdb.txt')
    .then(response => response.ok ? response.text() : '')
    .then(dbString => {
        if (typeof GamepadStandardizer !== 'undefined' && dbString) {
            gamepadParser = new GamepadStandardizer(dbString);
            console.log('[SYSTEM] SDL Gamepad Database erfolgreich geladen.');
        }
    })
    .catch(err => console.warn('[SYSTEM] gamecontrollerdb.txt nicht geladen.', err));


// --- 4. DYNAMISCHE UI AKTUALISIERUNG (HUD) ---
function updateControlsUI(layerName, isShiftHeld = false, isCtrlHeld = false) {
    const header = document.getElementById('controls-header');
    if (header) {
        if (isShiftHeld) header.innerHTML = '<span style="color:#ffb700">// MODUS: RUN (SHIFT)</span>';
        else if (isCtrlHeld) header.innerHTML = '<span style="color:#ffb700">// MODUS: CTRL-RUN</span>';
        else if (layerName === 'L1') header.innerHTML = '<span style="color:#ff3366">// LAYER: L1 (COMBAT)</span>';
        else if (layerName === 'R1') header.innerHTML = '<span style="color:#00ff73">// LAYER: R1 (ACTION)</span>';
        else header.innerHTML = '// LAYER: DEFAULT';
    }

    const currentMap = userLayers[layerName];
    const mode = DETAIL_MODES[currentDetailModeIndex];

    for (const [btnIdStr, element] of Object.entries(HUD_ELEMENTS)) {
        if (!element) continue;
        const btnId = parseInt(btnIdStr);
        
        // Triggers L2/R2 sind statische Modifikatoren
        if (btnId === BTN_L2 || btnId === BTN_R2) continue;

        const labelSpan = element.querySelector('.act-label');
        const config = currentMap[btnId];

        if (config) {
            let keyDisplay = config.key;
            let labelDisplay = config.label;

            // Dynamische Anzeige beim Halten von L2 / R2
            if (isShiftHeld && config.key.length === 1 && config.key.match(/[a-z]/)) {
                keyDisplay = config.key.toUpperCase();
                labelDisplay = `Run ${config.label}`;
            } else if (isCtrlHeld && config.key.length === 1 && config.key.match(/[a-z]/)) {
                keyDisplay = `^${config.key.toUpperCase()}`;
                labelDisplay = `Ctrl ${config.label}`;
            }

            // Anzeigemodus anwenden
            if (mode === 'BOTH') {
                labelSpan.innerText = `[${keyDisplay}] ${labelDisplay}`;
            } else if (mode === 'KEY') {
                labelSpan.innerText = `[${keyDisplay}]`;
            } else if (mode === 'LABEL') {
                labelSpan.innerText = labelDisplay;
            }
            
            element.title = `${labelDisplay} (${keyDisplay})`;
        } else {
            labelSpan.innerText = '';
            element.title = 'Unmapped';
        }
    }
}
updateControlsUI('DEFAULT');


// --- 5. HILFSFUNKTION FÜR RUN / CTRL-RUN MODIFIKATOREN ---
function transformKeyForModifiers(baseKey, isShiftHeld, isCtrlHeld) {
    if (!baseKey) return null;

    // Nur Einzelbuchstaben (Bewegungstasten: h, j, k, l, y, u, b, n) transformieren
    if (baseKey.length === 1 && baseKey.match(/[a-z]/i)) {
        const lowerKey = baseKey.toLowerCase();
        
        // SHIFT (L2): Verwandelt in Großbuchstabe (z.B. 'h' -> 'H')
        if (isShiftHeld) {
            return lowerKey.toUpperCase();
        }
        
        // CTRL (R2): Verwandelt in ASCII Control-Code
        if (isCtrlHeld) {
            const charCode = lowerKey.charCodeAt(0);
            // 'a' ist 97, ASCII Control Code für Ctrl+A ist 1
            const ctrlCode = charCode - 96; 
            return String.fromCharCode(ctrlCode);
        }
    }
    
    return baseKey;
}


// --- 6. POLLING LOOP ---
let lastBtnState = {};
const BUTTONS_TO_TRACK = [BTN_A, BTN_B, BTN_X, BTN_Y, BTN_L1, BTN_R1, D_UP, D_DOWN, D_LEFT, D_RIGHT];

function pollGamepad() {
    const rawGamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gpRaw = null;
    
    for (let i = 0; i < rawGamepads.length; i++) {
        if (rawGamepads[i]) { gpRaw = rawGamepads[i]; break; }
    }

    if (gpRaw) {
        const gp = gamepadParser ? gamepadParser.standardize(gpRaw) : gpRaw; 
        const buttons = gp.buttons || [];

        // Modifikator Zustände auslesen
        let l1 = buttons[BTN_L1]?.pressed || false;
        let r1 = buttons[BTN_R1]?.pressed || false;
        let l2_shift = buttons[BTN_L2]?.pressed || false;
        let r2_ctrl = buttons[BTN_R2]?.pressed || false;

        // Visualisierung für L2/R2
        if (HUD_ELEMENTS[BTN_L2]) HUD_ELEMENTS[BTN_L2].classList.toggle('pressed', l2_shift);
        if (HUD_ELEMENTS[BTN_R2]) HUD_ELEMENTS[BTN_R2].classList.toggle('pressed', r2_ctrl);

        // Layer bestimmen
        let newLayer = l1 ? 'L1' : (r1 ? 'R1' : 'DEFAULT');
        
        // UI bei Layer- oder Modifier-Änderung aktualisieren
        if (newLayer !== activeLayerName || l2_shift !== lastBtnState['_shift'] || r2_ctrl !== lastBtnState['_ctrl']) {
            activeLayerName = newLayer;
            lastBtnState['_shift'] = l2_shift;
            lastBtnState['_ctrl'] = r2_ctrl;
            updateControlsUI(activeLayerName, l2_shift, r2_ctrl);
        }

        BUTTONS_TO_TRACK.forEach(btnIndex => {
            let isPressed = buttons[btnIndex]?.pressed || false;
            let wasPressed = lastBtnState[btnIndex] || false;

            const uiElement = HUD_ELEMENTS[btnIndex];
            if (uiElement) {
                if (isPressed) uiElement.classList.add('pressed');
                else uiElement.classList.remove('pressed');
            }

            if (isPressed && !wasPressed) {
                if (window.term) { 
                    let keyConfig = userLayers[activeLayerName][btnIndex];
                    if (keyConfig && keyConfig.key) {
                        // Modifikator anwenden (Shift / Ctrl)
                        let finalKey = transformKeyForModifiers(keyConfig.key, l2_shift, r2_ctrl);
                        if (finalKey) {
                            window.socket.emit('input', finalKey);
                        }
                    }
                }
            }
            lastBtnState[btnIndex] = isPressed;
        });
    }
    requestAnimationFrame(pollGamepad);
}

requestAnimationFrame(pollGamepad);