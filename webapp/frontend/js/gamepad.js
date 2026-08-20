// --- 1. W3C STANDARD NUMMERN ---
// Jedes standardisierte Gamepad hat dieses genaue Nummern-Layout
const BTN_A = 0, BTN_B = 1, BTN_X = 2, BTN_Y = 3;
const BTN_L1 = 4, BTN_R1 = 5;
const D_UP = 12, D_DOWN = 13, D_LEFT = 14, D_RIGHT = 15;

// Map: Numeric Button-ID -> HTML-Element im HUD
const HUD_ELEMENTS = {
    [BTN_A]: document.getElementById('btn-vis-A'),
    [BTN_B]: document.getElementById('btn-vis-B'),
    [BTN_X]: document.getElementById('btn-vis-X'),
    [BTN_Y]: document.getElementById('btn-vis-Y'),
    [BTN_L1]: document.getElementById('btn-vis-L1'),
    [BTN_R1]: document.getElementById('btn-vis-R1'),
    [D_UP]: document.getElementById('btn-vis-UP'),
    [D_DOWN]: document.getElementById('btn-vis-DOWN'),
    [D_LEFT]: document.getElementById('btn-vis-LEFT'),
    [D_RIGHT]: document.getElementById('btn-vis-RIGHT'),
};

// Die drei Ebenen (Layers) nutzen die numerischen IDs
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

// --- 2. GAMEPAD INITIALISIERUNG & DEBUGGING ---

let gamepadParser = null;

// Prüfen ob ein Controller verbunden/freigeschaltet wurde (Wake-Up)
window.addEventListener("gamepadconnected", (e) => {
    console.log(`[HARDWARE] Controller freigeschaltet: ${e.gamepad.id}`);
});

window.addEventListener("gamepaddisconnected", (e) => {
    console.log(`[HARDWARE] Controller getrennt: ${e.gamepad.id}`);
});

// SDL Datenbank laden
fetch('gamecontrollerdb.txt')
    .then(response => {
        if (!response.ok) throw new Error("Netzwerkantwort war nicht ok");
        return response.text();
    })
    .then(dbString => {
        // Angenommen das Objekt in der window-Umgebung heißt GamepadStandardizer
        if (typeof GamepadStandardizer !== 'undefined') {
            gamepadParser = new GamepadStandardizer(dbString);
            console.log('[SYSTEM] SDL Gamepad Database erfolgreich geladen.');
        } else {
            console.warn('[SYSTEM] GamepadStandardizer Skript geladen, aber Klasse nicht gefunden.');
        }
    })
    .catch(err => console.warn('[SYSTEM] Konnte gamecontrollerdb.txt nicht laden (Lokaler Server aktiv?).', err));


// --- 3. DYNAMISCHE UI AKTUALISIERUNG (HUD) ---
function updateControlsUI(layerName) {
    const header = document.getElementById('controls-header');
    if(layerName === 'L1') header.innerHTML = '<span style="color:#ff3366">// IO-MAPPING: L1 (COMBAT)</span>';
    else if(layerName === 'R1') header.innerHTML = '<span style="color:#00ff73">// IO-MAPPING: R1 (ACTION)</span>';
    else header.innerHTML = '// IO-MAPPING: DEFAULT';

    const currentMap = userLayers[layerName];

    for(const [btnId, element] of Object.entries(HUD_ELEMENTS)) {
        if(!element) continue;
        const labelSpan = element.querySelector('.act-label');
        if(currentMap[btnId]) {
            labelSpan.innerText = `[${currentMap[btnId].key}]`;
            element.title = currentMap[btnId].label;
        } else {
            labelSpan.innerText = '';
            element.title = 'Unmapped';
        }
    }
}
updateControlsUI('DEFAULT');


// --- 4. POLLING LOOP ---
let lastBtnState = {};
// Liste aller Button-IDs, die wir tracken wollen
const BUTTONS_TO_TRACK = [BTN_A, BTN_B, BTN_X, BTN_Y, BTN_L1, BTN_R1, D_UP, D_DOWN, D_LEFT, D_RIGHT];

function pollGamepad() {
    const rawGamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gpRaw = null;
    
    // Finde den ersten physisch verbundenen Controller
    for(let i=0; i < rawGamepads.length; i++) {
        if(rawGamepads[i]) { gpRaw = rawGamepads[i]; break; }
    }

    if (gpRaw) {
        // Standardizer anwenden, falls geladen
        const gp = gamepadParser ? gamepadParser.standardize(gpRaw) : gpRaw; 
        
        // Buttons ist ein Array!
        const buttons = gp.buttons || [];

        let l1 = buttons[BTN_L1]?.pressed || false;
        let r1 = buttons[BTN_R1]?.pressed || false;

        let newLayer = l1 ? 'L1' : (r1 ? 'R1' : 'DEFAULT');
        if (newLayer !== activeLayerName) {
            activeLayerName = newLayer;
            updateControlsUI(activeLayerName);
        }

        BUTTONS_TO_TRACK.forEach(btnIndex => {
            let isPressed = buttons[btnIndex]?.pressed || false;
            let wasPressed = lastBtnState[btnIndex] || false;

            const uiElement = HUD_ELEMENTS[btnIndex];
            if(uiElement) {
                if(isPressed) uiElement.classList.add('pressed');
                else uiElement.classList.remove('pressed');
            }

            if (isPressed && !wasPressed) {
                if (window.term) { 
                    let keyConfig = userLayers[activeLayerName][btnIndex];
                    if (keyConfig && keyConfig.key) {
                        window.socket.emit('input', keyConfig.key);
                    }
                }
            }
            lastBtnState[btnIndex] = isPressed;
        });
    }
    requestAnimationFrame(pollGamepad);
}

// Start Loop
requestAnimationFrame(pollGamepad);