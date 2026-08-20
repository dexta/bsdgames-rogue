window.triggerSmartInventoryScan = function() {
    if (!window.term) return;

    // Wir geben Rogue 250ms Zeit, das Inventar in das Terminal zu rendern
    setTimeout(() => {
        let foundItems = [];
        
        // WICHTIG: viewportY ermittelt die Zeile, die GANZ OBEN im sichtbaren Browserfenster ist
        const viewportY = window.term.buffer.active.viewportY;
        const rows = window.term.rows;
        
        // Scanne Zeile für Zeile im aktuell sichtbaren Bereich
        for (let i = 0; i < rows; i++) {
            let line = window.term.buffer.active.getLine(i + viewportY);
            if (!line) continue;
            
            let text = line.translateToString(true).trim();
            
            // Verbesserter Regex: 
            // - Akzeptiert führende Leerzeichen (\s*)
            // - Erkennt den Buchstaben und die Klammer ([a-zA-Z])\)
            // - Greift den Rest als Beschreibung ab
            let match = text.match(/^\s*([a-zA-Z])\)\s+(.+)$/);
            
            if (match) {
                let key = match[1];
                let desc = match[2].trim();
                
                // Manchmal klebt Rogue ein "--More--" ans Ende der Item-Zeile. Das schneiden wir ab.
                desc = desc.replace(/--More--$/, '').trim();
                
                foundItems.push({ key: key, desc: desc });
            }
        }

        const invList = document.getElementById('inventory-list');
        
        if (foundItems.length > 0) {
            invList.innerHTML = '';
            // Baue die Liste in der Sidebar visuell neu auf
            foundItems.forEach(item => {
                let div = document.createElement('div');
                div.className = 'inv-item';
                div.innerHTML = `<div class="inv-key">[${item.key}]</div><div>${item.desc}</div>`;
                invList.appendChild(div);
            });
            
            // Visuelles Feedback
            const header = document.querySelector('#inventory-section .sidebar-header');
            const oldText = header.innerText;
            header.innerHTML = '<span style="color:#00ff73">// INVENTORY (AKTUALISIERT)</span>';
            setTimeout(() => { header.innerText = oldText; }, 1500);

        } else {
            invList.innerHTML = '<div style="color:var(--text-dim)">Inventar leer oder Ansicht geschlossen.</div>';
        }
    }, 250); 
};