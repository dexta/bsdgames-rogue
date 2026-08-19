// Scannt das Terminal alle 500ms nach Inventar-Einträgen
setInterval(() => {
    if (!window.term) return;

    let foundItems = [];
    
    // Scanne Zeile für Zeile im aktuellen sichtbaren Bereich
    for (let i = 0; i < window.term.rows; i++) {
        let line = window.term.buffer.active.getLine(i);
        if (!line) continue;
        
        let text = line.translateToString(true).trim();
        // Erkennt Rogue-Pattern: "a) ein Trank" oder "b) +1 Rüstung"
        let match = text.match(/^([a-zA-Z])\)\s+(.+)$/);
        
        if (match) {
            foundItems.push({ key: match[1], desc: match[2] });
        }
    }

    // Wenn Items gefunden wurden, aktualisiere das Persistent-Overlay in der Sidebar
    if (foundItems.length > 0) {
        const invList = document.getElementById('inventory-list');
        invList.innerHTML = '';
        
        foundItems.forEach(item => {
            let div = document.createElement('div');
            div.className = 'inv-item';
            div.innerHTML = `<div class="inv-key">[${item.key}]</div><div>${item.desc}</div>`;
            invList.appendChild(div);
        });
    }
}, 500);