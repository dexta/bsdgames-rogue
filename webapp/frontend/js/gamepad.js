// Buttons (Standard Gamepad)
const BTN_A = 0, BTN_B = 1, BTN_X = 2, BTN_Y = 3;
const BTN_L1 = 4, BTN_R1 = 5, D_UP = 12, D_DOWN = 13, D_LEFT = 14, D_RIGHT = 15;

// Die drei Ebenen (Layers)
const DEFAULT_LAYERS = {
    DEFAULT: {
        [D_UP]: { key: 'k', label: 'Move Up' }, [D_DOWN]: { key: 'j', label: 'Move Down' },
        [D_LEFT]: { key: 'h', label: 'Move Left' }, [D_RIGHT]: { key: 'l', label: 'Move Right' },
        [BTN_A]: { key: ' ', label: 'Confirm/Next' }, [BTN_B]: { key: 's', label: 'Search' },
        [BTN_X]: { key: '.', label: 'Rest' }, [BTN_Y]: { key: ',', label: 'Pick up' }
    },
    L1: { // Combat / Diag
        [D_UP]: { key: 'y', label: 'Diag UL' }, [D_DOWN]: { key: 'n', label: 'Diag DR' },
        [D_LEFT]: { key: 'b', label: 'Diag DL' }, [D_RIGHT]: { key: 'u', label: 'Diag UR' },
        [BTN_A]: { key: 't', label: 'Throw' }, [BTN_B]: { key: 'z', label: 'Zap Wand' },
        [BTN_X]: { key: '<', label: 'Stairs Up' }, [BTN_Y]: { key: '>', label: 'Stairs Down' }
    },
    R1: { // Inventory / Actions
        [D_UP]: { key: 'w', label: 'Wield Weapon' }, [D_DOWN]: { key: 'W', label: 'Wear Armor' },
        [D_LEFT]: { key: 'T', label: 'Take off Armor' }, [D_RIGHT]: { key: 'd', label: 'Drop Item' },
        [BTN_A]: { key: 'e', label: 'Eat' }, [BTN_B]: { key: 'q', label: 'Quaff Potion' },
        [BTN_X]: { key: 'r', label: 'Read Scroll' }, [BTN_Y]: { key: 'i', label: 'Open Inventory' }
    }
};

// Aus LocalStorage laden
let userLayers = JSON.parse(localStorage.getItem('rogue_layers')) || JSON.parse(JSON.stringify(DEFAULT_LAYERS));

let activeLayerName = 'DEFAULT';
let isConfigOpen = false;
let listeningBtnId = null; 
let configSelectedLayer = 'DEFAULT';

// --- DYNAMISCHE UI AKTUALISIERUNG (SIDEBAR UNTEN) ---
function updateControlsUI(layerName) {
    const header = document.getElementById('controls-header');
    const list = document.getElementById('controls-list');
    
    if(layerName === 'L1') header.innerHTML = '<span style="color:#ff3366">// IO-MAPPING: L1 (COMBAT)</span>';
    else if(layerName === 'R1') header.innerHTML = '<span style="color:#00ff73">// IO-MAPPING: R1 (ACTION)</span>';
    else header.innerHTML = '// IO-MAPPING: DEFAULT';

    list.innerHTML = '';
    const currentMap = userLayers[layerName];
    for(const [btnId, action] of Object.entries(currentMap)) {
        list.innerHTML += `<div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span style="color:#fff">BTN ${btnId}</span> <span>${action.label} [${action.key}]</span>
        </div>`;
    }
}
updateControlsUI('DEFAULT'); // Init

// --- CONFIG MODAL LOGIK ---
function renderConfigList() {
    const list = document.getElementById('mapping-list');
    list.innerHTML = '';
    const layer = userLayers[configSelectedLayer];
    
    for (const [btnId, action] of Object.entries(layer)) {
        const row = document.createElement('div'); row.className = 'mapping-row';
        row.innerHTML = `<span>${action.label} (Key: ${action.key})</span>
                         <button class="btn mapping-btn" id="map-btn-${btnId}">B${btnId}</button>`;
        list.appendChild(row);

        row.querySelector('button').onclick = (e) => {
            document.querySelectorAll('.mapping-btn').forEach(b => b.classList.remove('listening'));
            e.target.classList.add('listening');
            e.target.innerText = "PRESS...";
            listeningBtnId = btnId; // Wir warten nun auf einen Druck, um diesen Slot zu überschreiben
        };
    }
}

document.getElementById('config-toggle').onclick = () => {
    isConfigOpen = !isConfigOpen;
    document.getElementById('config-modal').style.display = isConfigOpen ? 'block' : 'none';
    if(isConfigOpen) renderConfigList();
};
document.getElementById('close-config').onclick = () => {
    isConfigOpen = false; listeningBtnId = null;
    document.getElementById('config-modal').style.display = 'none';
};
document.getElementById('layer-select').onchange = (e) => {
    configSelectedLayer = e.target.value; renderConfigList();
};
document.getElementById('reset-mapping').onclick = () => {
    userLayers = JSON.parse(JSON.stringify(DEFAULT_LAYERS));
    localStorage.setItem('rogue_layers', JSON.stringify(userLayers));
    renderConfigList(); updateControlsUI(activeLayerName);
};

// --- GAMEPAD POLLING LOOP ---
let lastBtnState = {};

function pollGamepad() {
    const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;

    if (gp) {
        let l1 = gp.buttons[BTN_L1].pressed;
        let r1 = gp.buttons[BTN_R1].pressed;

        // Welcher Layer ist aktiv?
        let newLayer = l1 ? 'L1' : (r1 ? 'R1' : 'DEFAULT');
        if (newLayer !== activeLayerName) {
            activeLayerName = newLayer;
            updateControlsUI(activeLayerName);
        }

        gp.buttons.forEach((button, index) => {
            let isPressed = button.pressed;
            let wasPressed = lastBtnState[index];

            if (isPressed && !wasPressed) {
                // Modus 1: Wir sind im Remapping-Screen und warten auf einen Tastendruck
                if (isConfigOpen && listeningBtnId !== null && index !== BTN_L1 && index !== BTN_R1) {
                    // Tausche die Tasten-Belegung in der Konfiguration
                    let actionToMove = userLayers[configSelectedLayer][listeningBtnId];
                    delete userLayers[configSelectedLayer][listeningBtnId];
                    userLayers[configSelectedLayer][index] = actionToMove;
                    
                    localStorage.setItem('rogue_layers', JSON.stringify(userLayers));
                    listeningBtnId = null;
                    renderConfigList();
                    updateControlsUI(activeLayerName);
                } 
                // Modus 2: Spielen
                else if (!isConfigOpen && window.term) {
                    let keyConfig = userLayers[activeLayerName][index];
                    if (keyConfig && keyConfig.key) {
                        window.socket.emit('input', keyConfig.key);
                    }
                }
            }
            lastBtnState[index] = isPressed;
        });
    }
    requestAnimationFrame(pollGamepad);
}
requestAnimationFrame(pollGamepad);