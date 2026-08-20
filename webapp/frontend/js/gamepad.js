// --- 1. NUMERISCHE W3C/SDL BUTTON INDIZES ---
const BTN_A = 0, BTN_B = 1, BTN_X = 2, BTN_Y = 3;
const BTN_L1 = 4, BTN_R1 = 5;
const BTN_L2 = 6, BTN_R2 = 7; // Triggers für RUN / CTRL-RUN
const D_UP = 12, D_DOWN = 13, D_LEFT = 14, D_RIGHT = 15;

const BUTTONS_TO_TRACK = [BTN_A, BTN_B, BTN_X, BTN_Y, BTN_L1, BTN_R1, D_UP, D_DOWN, D_LEFT, D_RIGHT];

// Das "Wörterbuch" aller verfügbaren Aktionen für das Dropdown
const ROGUE_ACTIONS = [
    { key: '', label: '-- UNMAPPED --' },
    { key: 'k', label: 'Move Up' }, { key: 'j', label: 'Move Down' },
    { key: 'h', label: 'Move Left' }, { key: 'l', label: 'Move Right' },
    { key: 'y', label: 'Diag Up-Left' }, { key: 'u', label: 'Diag Up-Right' },
    { key: 'b', label: 'Diag Down-Left' }, { key: 'n', label: 'Diag Down-Right' },
    { key: ' ', label: 'Confirm / Space' }, { key: 's', label: 'Search' },
    { key: '.', label: 'Rest (1 turn)' }, { key: ',', label: 'Pick up' },
    { key: 'i', label: 'Inventory' }, { key: 'e', label: 'Eat food' },
    { key: 'q', label: 'Quaff Potion' }, { key: 'r', label: 'Read Scroll' },
    { key: 'w', label: 'Wield Weapon' }, { key: 'W', label: 'Wear Armor' },
    { key: 'T', label: 'Take off Armor' }, { key: 'P', label: 'Put on Ring' },
    { key: 'R', label: 'Remove Ring' }, { key: 'd', label: 'Drop Item' },
    { key: 't', label: 'Throw Item' }, { key: 'z', label: 'Zap Wand' },
    { key: '<', label: 'Stairs Up' }, { key: '>', label: 'Stairs Down' },
    { key: 'S', label: 'Save Game' }, { key: 'Q', label: 'Quit Game' },
    { key: '^R', label: 'Redraw Screen' }
];

const HUD_ELEMENTS = {
    [BTN_A]: document.getElementById('btn-vis-A'), [BTN_B]: document.getElementById('btn-vis-B'),
    [BTN_X]: document.getElementById('btn-vis-X'), [BTN_Y]: document.getElementById('btn-vis-Y'),
    [BTN_L1]: document.getElementById('btn-vis-L1'), [BTN_R1]: document.getElementById('btn-vis-R1'),
    [BTN_L2]: document.getElementById('btn-vis-L2'), [BTN_R2]: document.getElementById('btn-vis-R2'),
    [D_UP]: document.getElementById('btn-vis-UP'), [D_DOWN]: document.getElementById('btn-vis-DOWN'),
    [D_LEFT]: document.getElementById('btn-vis-LEFT'), [D_RIGHT]: document.getElementById('btn-vis-RIGHT'),
};

const DEFAULT_LAYERS = {
    DEFAULT: {
        [D_UP]: { key: 'k', label: 'Up' }, [D_DOWN]: { key: 'j', label: 'Down' },
        [D_LEFT]: { key: 'h', label: 'Left' }, [D_RIGHT]: { key: 'l', label: 'Right' },
        [BTN_A]: { key: ' ', label: 'Confirm' }, [BTN_B]: { key: 's', label: 'Search' },
        [BTN_X]: { key: '.', label: 'Rest' }, [BTN_Y]: { key: ',', label: 'Pick up' }
    },
    L1: {
        [D_UP]: { key: 'y', label: 'Diag UL' }, [D_DOWN]: { key: 'n', label: 'Diag DR' },
        [D_LEFT]: { key: 'b', label: 'Diag DL' }, [D_RIGHT]: { key: 'u', label: 'Diag UR' },
        [BTN_A]: { key: 't', label: 'Throw' }, [BTN_B]: { key: 'z', label: 'Zap' },
        [BTN_X]: { key: '<', label: 'Stairs Up' }, [BTN_Y]: { key: '>', label: 'Stairs Down' }
    },
    R1: {
        [D_UP]: { key: 'w', label: 'Wield' }, [D_DOWN]: { key: 'W', label: 'Wear' },
        [D_LEFT]: { key: 'T', label: 'Take off' }, [D_RIGHT]: { key: 'd', label: 'Drop' },
        [BTN_A]: { key: 'e', label: 'Eat' }, [BTN_B]: { key: 'q', label: 'Quaff' },
        [BTN_X]: { key: 'r', label: 'Read' }, [BTN_Y]: { key: 'i', label: 'Invent' }
    }
};

let userLayers = JSON.parse(localStorage.getItem('rogue_layers_std')) || JSON.parse(JSON.stringify(DEFAULT_LAYERS));
let activeLayerName = 'DEFAULT';
let isConfigOpen = false;
let configSelectedLayer = 'DEFAULT';

// --- 2. CONFIG MODAL LOGIK (JETZT MIT DROPDOWNS) ---
function renderConfigList() {
    const list = document.getElementById('mapping-list');
    if (!list) return;
    list.innerHTML = '';
    const layer = userLayers[configSelectedLayer];
    
    // Für jeden relevanten Knopf generieren wir ein Dropdown
    BUTTONS_TO_TRACK.forEach(btnId => {
        // L1 und R1 überspringen wir im Dropdown, da sie feste Layer-Umschalter sind
        if (btnId === BTN_L1 || btnId === BTN_R1) return;

        const row = document.createElement('div');
        row.className = 'mapping-row';

        let selectHtml = `<select class="btn" style="flex:1; margin-left:15px; font-size: 13px;">`;
        ROGUE_ACTIONS.forEach(act => {
            let isSelected = (layer[btnId] && layer[btnId].key === act.key) ? 'selected' : '';
            selectHtml += `<option value="${act.key}" ${isSelected}>${act.label} ${act.key ? '['+act.key+']' : ''}</option>`;
        });
        selectHtml += `</select>`;

        row.innerHTML = `<span style="width: 60px; font-weight: bold;">BTN ${btnId}</span> ${selectHtml}`;
        list.appendChild(row);

        // Speichern, wenn der User etwas im Dropdown ändert
        row.querySelector('select').onchange = (e) => {
            const newKey = e.target.value;
            if (newKey === '') {
                delete layer[btnId]; // Unmapped
            } else {
                const act = ROGUE_ACTIONS.find(a => a.key === newKey);
                layer[btnId] = { key: act.key, label: act.label };
            }
            localStorage.setItem('rogue_layers_std', JSON.stringify(userLayers));
            updateControlsUI(activeLayerName);
        };
    });
}

// Event-Listener für das Config-Menu wiederhergestellt!
const configToggleBtn = document.getElementById('config-toggle');
if (configToggleBtn) {
    configToggleBtn.onclick = () => {
        isConfigOpen = !isConfigOpen;
        document.getElementById('config-modal').style.display = isConfigOpen ? 'block' : 'none';
        if (isConfigOpen) renderConfigList();
    };
}
document.getElementById('close-config').onclick = () => {
    isConfigOpen = false;
    document.getElementById('config-modal').style.display = 'none';
};
document.getElementById('layer-select').onchange = (e) => {
    configSelectedLayer = e.target.value; 
    renderConfigList();
};
document.getElementById('reset-mapping').onclick = () => {
    userLayers = JSON.parse(JSON.stringify(DEFAULT_LAYERS));
    localStorage.setItem('rogue_layers_std', JSON.stringify(userLayers));
    renderConfigList(); 
    updateControlsUI(activeLayerName);
};

// --- 3. HUD DETAIL MODI ---
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

// --- 4. GAMEPAD INITIALISIERUNG ---
let gamepadParser = null;

fetch('gamecontrollerdb.txt')
    .then(response => response.ok ? response.text() : '')
    .then(dbString => {
        if (typeof GamepadStandardizer !== 'undefined' && dbString) {
            gamepadParser = new GamepadStandardizer(dbString);
        }
    }).catch(() => {});

function updateControlsUI(layerName, isShiftHeld = false, isCtrlHeld = false) {
    const header = document.getElementById('controls-header');
    if (header) {
        if (isShiftHeld) header.innerHTML = '<span style="color:#ffb700">// MODUS: RUN (SHIFT)</span>';
        else if (isCtrlHeld) header.innerHTML = '<span style="color:#ffb700">// MODUS: CTRL-RUN</span>';
        else if (layerName === 'L1') header.innerHTML = '<span style="color:#ff3366">// LAYER: L1 (COMBAT)</span>';
        else if (layerName === 'R1') header.innerHTML = '<span style="color:#00ff73">// LAYER: R1 (ACTION)</span>';
        else header.innerHTML = '// LAYER: DEFAULT';
    }

    const currentMap = userLayers[layerName] || {};
    const mode = DETAIL_MODES[currentDetailModeIndex];

    for (const [btnIdStr, element] of Object.entries(HUD_ELEMENTS)) {
        if (!element) continue;
        const btnId = parseInt(btnIdStr);
        if (btnId === BTN_L2 || btnId === BTN_R2 || btnId === BTN_L1 || btnId === BTN_R1) continue;

        const labelSpan = element.querySelector('.act-label');
        const config = currentMap[btnId];

        if (config) {
            let keyDisplay = config.key;
            let labelDisplay = config.label;

            if (isShiftHeld && config.key.length === 1 && config.key.match(/[a-z]/)) {
                keyDisplay = config.key.toUpperCase();
                labelDisplay = `Run ${config.label}`;
            } else if (isCtrlHeld && config.key.length === 1 && config.key.match(/[a-z]/)) {
                keyDisplay = `^${config.key.toUpperCase()}`;
                labelDisplay = `Ctrl ${config.label}`;
            }

            if (mode === 'BOTH') labelSpan.innerText = `[${keyDisplay}] ${labelDisplay}`;
            else if (mode === 'KEY') labelSpan.innerText = `[${keyDisplay}]`;
            else if (mode === 'LABEL') labelSpan.innerText = labelDisplay;
            
        } else {
            labelSpan.innerText = '';
        }
    }
}
updateControlsUI('DEFAULT');

function transformKeyForModifiers(baseKey, isShiftHeld, isCtrlHeld) {
    if (!baseKey) return null;
    if (baseKey.length === 1 && baseKey.match(/[a-z]/i)) {
        const lowerKey = baseKey.toLowerCase();
        if (isShiftHeld) return lowerKey.toUpperCase();
        if (isCtrlHeld) return String.fromCharCode(lowerKey.charCodeAt(0) - 96); 
    }
    return baseKey;
}

// --- 5. POLLING LOOP ---
let lastBtnState = {};

function pollGamepad() {
    const rawGamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gpRaw = null;
    
    for (let i = 0; i < rawGamepads.length; i++) {
        if (rawGamepads[i]) { gpRaw = rawGamepads[i]; break; }
    }

    if (gpRaw) {
        const gp = gamepadParser ? gamepadParser.standardize(gpRaw) : gpRaw; 
        const buttons = gp.buttons || [];

        let l1 = buttons[BTN_L1]?.pressed || false;
        let r1 = buttons[BTN_R1]?.pressed || false;
        let l2_shift = buttons[BTN_L2]?.pressed || false;
        let r2_ctrl = buttons[BTN_R2]?.pressed || false;

        if (HUD_ELEMENTS[BTN_L2]) HUD_ELEMENTS[BTN_L2].classList.toggle('pressed', l2_shift);
        if (HUD_ELEMENTS[BTN_R2]) HUD_ELEMENTS[BTN_R2].classList.toggle('pressed', r2_ctrl);
        if (HUD_ELEMENTS[BTN_L1]) HUD_ELEMENTS[BTN_L1].classList.toggle('pressed', l1);
        if (HUD_ELEMENTS[BTN_R1]) HUD_ELEMENTS[BTN_R1].classList.toggle('pressed', r1);

        let newLayer = l1 ? 'L1' : (r1 ? 'R1' : 'DEFAULT');
        
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
            if (uiElement && btnIndex !== BTN_L1 && btnIndex !== BTN_R1 && btnIndex !== BTN_L2 && btnIndex !== BTN_R2) {
                if (isPressed) uiElement.classList.add('pressed');
                else uiElement.classList.remove('pressed');
            }

            if (isPressed && !wasPressed) {
                // Keine Befehle ans Spiel senden, wenn das Config-Menü offen ist
                if (window.term && !isConfigOpen) { 
                    let keyConfig = userLayers[activeLayerName][btnIndex];
                    if (keyConfig && keyConfig.key) {
                        let finalKey = transformKeyForModifiers(keyConfig.key, l2_shift, r2_ctrl);
                        if (finalKey) {
                            window.socket.emit('input', finalKey);
                            
                            // Trigger Scraper
                            if (finalKey === 'i' || finalKey === 'I') {
                                if (typeof window.triggerSmartInventoryScan === 'function') {
                                    window.triggerSmartInventoryScan();
                                }
                            }
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