// --- Iconos en SVG ---
const ICONS = {
    folder: '<svg class="tree-icon folder" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
    file: '<svg class="tree-icon file" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
};

// --- Estado Inicial Totalmente Vacío (a decisión del usuario) ---
let fileSystem = [];
let openTabs = [];
let activeFileId = null;
let currentCreationType = null;
let activeFolderId = null; // Para saber en qué carpeta crear elementos

// --- Elementos del DOM ---
const fileTreeEl = document.getElementById('fileTree');
const tabsBarEl = document.getElementById('tabsBar');
const codeEditorEl = document.getElementById('codeEditor');
const emptyStateEl = document.getElementById('emptyState');
const inputContainer = document.getElementById('inputContainer');
const newItemInput = document.getElementById('newItemInput');
const contentArea = document.getElementById('contentArea');
const deviceFrame = document.getElementById('deviceFrame');
const previewIframe = document.getElementById('previewIframe');

// --- Funciones del Sistema de Archivos ---
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

function findFile(id, items = fileSystem) {
    for (let item of items) {
        if (item.id === id) return item;
        if (item.children) {
            let found = findFile(id, item.children);
            if (found) return found;
        }
    }
    return null;
}

// --- Renderizar Árbol ---
function renderTree(items, container, level = 0) {
    container.innerHTML = '';
    items.forEach(item => {
        const el = document.createElement('div');
        el.className = `tree-item ${activeFileId === item.id || activeFolderId === item.id ? 'active' : ''}`;
        el.style.paddingLeft = `${15 + (level * 15)}px`;
        el.innerHTML = `${ICONS[item.type]} <span>${item.name}</span>`;

        el.onclick = (e) => {
            e.stopPropagation();
            if (item.type === 'folder') {
                item.isOpen = !item.isOpen;
                activeFolderId = item.id; // Seleccionar carpeta para crear dentro
                renderAll();
            } else {
                activeFolderId = null; // Deseleccionar carpeta
                openFile(item.id);
            }
        };
        container.appendChild(el);

        if (item.type === 'folder' && item.isOpen && item.children) {
            const childrenContainer = document.createElement('div');
            renderTree(item.children, childrenContainer, level + 1);
            container.appendChild(childrenContainer);
        }
    });
}

// --- Renderizar Pestañas y Editor ---
function renderTabs() {
    tabsBarEl.innerHTML = '';
    if (openTabs.length === 0) {
        codeEditorEl.style.display = 'none';
        emptyStateEl.style.display = 'block';
        return;
    } else {
        codeEditorEl.style.display = 'block';
        emptyStateEl.style.display = 'none';
    }

    openTabs.forEach(id => {
        const file = findFile(id);
        if (!file) return;

        const tab = document.createElement('div');
        tab.className = `tab ${activeFileId === id ? 'active' : ''}`;
        tab.innerHTML = `
            <span>${file.name}</span>
            <button class="tab-close" title="Cerrar">${ICONS.close}</button>
        `;

        tab.onclick = () => openFile(id);
        tab.querySelector('.tab-close').onclick = (e) => {
            e.stopPropagation();
            closeFile(id);
        };

        tabsBarEl.appendChild(tab);
    });

    // Actualizar textarea
    const activeFile = findFile(activeFileId);
    if (activeFile) {
        if (codeEditorEl.value !== activeFile.content) {
            codeEditorEl.value = activeFile.content || '';
        }
        codeEditorEl.disabled = false;
    } else {
        codeEditorEl.value = '';
        codeEditorEl.disabled = true;
    }
}

function openFile(id) {
    if (!openTabs.includes(id)) openTabs.push(id);
    activeFileId = id;
    renderAll();
    codeEditorEl.focus();
}

function closeFile(id) {
    openTabs = openTabs.filter(t => t !== id);
    if (activeFileId === id) {
        activeFileId = openTabs.length > 0 ? openTabs[openTabs.length - 1] : null;
    }
    renderAll();
}

// --- Crear Archivos/Carpetas ---
function showInput(type) {
    currentCreationType = type;
    inputContainer.style.display = 'block';
    newItemInput.placeholder = type === 'folder' ? 'Nombre de la Carpeta...' : 'Nombre del Archivo... (ej. index.html)';
    newItemInput.value = '';
    newItemInput.focus();
}

function handleInputKeydown(e) {
    if (e.key === 'Enter') {
        const name = newItemInput.value.trim();
        if (name) {
            const newItem = {
                id: generateId(),
                name: name,
                type: currentCreationType,
                content: currentCreationType === 'file' ? '' : undefined,
                children: currentCreationType === 'folder' ? [] : undefined,
                isOpen: true
            };

            // Si hay una carpeta seleccionada, añadirlo allí. Si no, a la raíz.
            const targetFolder = activeFolderId ? findFile(activeFolderId) : null;
            if (targetFolder && targetFolder.type === 'folder') {
                targetFolder.children.push(newItem);
                targetFolder.isOpen = true;
            } else {
                fileSystem.push(newItem);
            }

            if (currentCreationType === 'file') openFile(newItem.id);
        }
        inputContainer.style.display = 'none';
        renderAll();
    } else if (e.key === 'Escape') {
        inputContainer.style.display = 'none';
    }
}

// Guardar al escribir
codeEditorEl.addEventListener('input', (e) => {
    const activeFile = findFile(activeFileId);
    if (activeFile) {
        activeFile.content = e.target.value;
    }
});

// Permitir uso del tabulador en el editor
codeEditorEl.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 4;
    }
});

// --- SISTEMA DE COMPILACIÓN Y VISTA PREVIA REAL ---
function compileAndPreview() {
    let indexHtml = null;
    let cssContent = '';
    let jsContent = '';

    // Extraer el código de todos los archivos creados por el usuario
    function extractCode(items) {
        items.forEach(item => {
            if (item.type === 'file') {
                if (item.name.toLowerCase() === 'index.html') {
                    indexHtml = item.content || '';
                } else if (item.name.endsWith('.css')) {
                    cssContent += (item.content || '') + '\n';
                } else if (item.name.endsWith('.js')) {
                    jsContent += (item.content || '') + '\n';
                }
            } else if (item.type === 'folder' && item.children) {
                extractCode(item.children);
            }
        });
    }

    extractCode(fileSystem);

    // Si el usuario no ha creado index.html, mostrar aviso
    if (indexHtml === null) {
        const aviso = `
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #333;">
                <h2>No se encontró index.html</h2>
                <p>Para ver la vista previa de tu web o juego, debes crear un archivo llamado <b>index.html</b></p>
            </div>`;
        previewIframe.srcdoc = aviso;
        return;
    }

    // Inyectar el CSS y JS compilado dentro del HTML del usuario de forma segura
    const docBuild = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${cssContent}</style>
        </head>
        <body>
            ${indexHtml}
            <script>
                try {
                    ${jsContent}
                } catch(error) {
                    console.error("Error en tu JavaScript:", error);
                }
            <\/script>
        </body>
        </html>
    `;
    previewIframe.srcdoc = docBuild;
}

// --- Control de Modos (PC / Móvil / Editor) ---
function setMode(mode) {
    document.getElementById('btn-editor').classList.remove('active');
    document.getElementById('btn-movil').classList.remove('active');
    document.getElementById('btn-pc').classList.remove('active');
    
    document.getElementById('btn-' + mode).classList.add('active');

    if (mode === 'editor') {
        contentArea.classList.remove('show-preview');
        contentArea.classList.add('show-editor');
    } else {
        contentArea.classList.remove('show-editor');
        contentArea.classList.add('show-preview');
        
        deviceFrame.className = 'device-frame'; // Reset
        if (mode === 'movil') {
            deviceFrame.classList.add('mode-movil');
        } else if (mode === 'pc') {
            deviceFrame.classList.add('mode-pc');
        }

        // SOLUCIÓN: Retraso de 50ms para que el CSS aplique el tamaño antes de compilar
        setTimeout(() => {
            compileAndPreview();
            
            // Forzamos un evento de resize dentro del iframe por si el motor 3D lo necesita
            const iframe = document.getElementById('previewIframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.dispatchEvent(new Event('resize'));
            }
        }, 50);
    }
}

// Click fuera para ocultar input
document.addEventListener('click', (e) => {
    if (!inputContainer.contains(e.target) && !e.target.closest('.icon-btn')) {
        inputContainer.style.display = 'none';
        activeFolderId = null; // Deseleccionar carpeta al hacer clic fuera
        renderAll();
    }
});

newItemInput.addEventListener('keydown', handleInputKeydown);

function renderAll() {
    renderTree(fileSystem, fileTreeEl);
    renderTabs();
}

// Iniciar app vacía
renderAll();
