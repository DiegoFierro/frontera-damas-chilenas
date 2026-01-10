/**
 * SISTEMA FRONTERA - Motor Lógico v1.4
 * Reglas: Movimiento peón ortogonal, Captura peón ortogonal/diagonal (solo frente/lados),
 * Vuelo de Soberana en 8 direcciones, Captura Obligatoria y Seguridad de Turno.
 */

let board = [];
let playerColor = 'white';
let pangiColor = 'black';
let turn = 'white';
let selected = null;
let isChain = false;

const COLS = ['A','B','C','D','E','F','G','H'];

// Inicialización
function setupGame(color) {
    playerColor = color;
    pangiColor = (color === 'white') ? 'black' : 'white';
    document.getElementById('setup-overlay').style.display = 'none';
    init();
}

function init() {
    board = Array.from({ length: 8 }, () => Array(8).fill(null));
    for(let c=0; c<8; c++) {
        board[0][c] = { color: playerColor, isSoberana: false };
        board[1][c] = { color: playerColor, isSoberana: false };
        board[6][c] = { color: pangiColor, isSoberana: false };
        board[7][c] = { color: pangiColor, isSoberana: false };
    }
    render();
}

function getNotation(r, c) { return `${COLS[c]}${r + 1}`; }

// Cálculo de movimientos con reglas chilenas
function getValidMoves(r, c, onlyCaptures = false) {
    const p = board[r][c];
    if (!p) return [];
    let moves = [];
    
    const fwd = p.color === playerColor ? 1 : -1;
    const soberanaDirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    
    // El peón chileno solo conoce 3 direcciones: frente, izquierda y derecha.
    // Esto aplica tanto para movimiento como para captura.
    const peonDirs = [
        [fwd, 0],  // Frente
        [fwd, 1],  // Diagonal frontal derecha (solo captura)
        [fwd, -1], // Diagonal frontal izquierda (solo captura)
        [0, 1],    // Lateral derecho
        [0, -1]    // Lateral izquierdo
    ];

    // MOVIMIENTOS SIMPLES
    if (!onlyCaptures) {
        if (p.isSoberana) {
            soberanaDirs.forEach(d => {
                let nr=r+d[0], nc=c+d[1];
                while(nr>=0 && nr<8 && nc>=0 && nc<8 && !board[nr][nc]) {
                    moves.push({r:nr, c:nc, type:'a'});
                    nr+=d[0]; nc+=d[1];
                }
            });
        } else {
            // Movimiento peón: Solo ortogonal (frente y lados), no diagonales
            [[fwd, 0], [0, 1], [0, -1]].forEach(d => {
                let nr=r+d[0], nc=c+d[1];
                if (nr>=0 && nr<8 && nc>=0 && nc<8 && !board[nr][nc]) {
                    moves.push({r:nr, c:nc, type:'a'});
                }
            });
        }
    }

    // CAPTURAS
    if (p.isSoberana) {
        soberanaDirs.forEach(d => {
            let nr=r+d[0], nc=c+d[1];
            let victim = null;
            while(nr>=0 && nr<8 && nc>=0 && nc<8) {
                if (board[nr][nc]) {
                    if (board[nr][nc].color !== p.color) victim = {r:nr, c:nc};
                    break;
                }
                nr+=d[0]; nc+=d[1];
            }
            if (victim) {
                let tr = victim.r + d[0], tc = victim.c + d[1];
                while(tr>=0 && tr<8 && tc>=0 && tc<8 && !board[tr][tc]) {
                    moves.push({r:tr, c:tc, type:'captura', cap:victim});
                    tr += d[0]; tc += d[1];
                }
            }
        });
    } else {
        // Peón captura en sus 5 direcciones frontales/laterales (NUNCA ATRÁS)
        peonDirs.forEach(d => {
            let nr=r+d[0], nc=c+d[1];
            let er=r+d[0]*2, ec=c+d[1]*2;
            if (er>=0 && er<8 && ec>=0 && ec<8) {
                if (board[nr][nc] && board[nr][nc].color !== p.color && !board[er][ec]) {
                    moves.push({r:er, c:ec, type:'captura', cap:{r:nr, c:nc}});
                }
            }
        });
    }
    return moves;
}



function execute(move) {
    if (!selected) return;
    const fromR = selected.r, fromC = selected.c;
    const p = board[fromR][fromC];
    const colorNombre = p.color === 'white' ? 'BLANCO' : 'NEGRO';
    
    document.getElementById('current-move-text').innerText = 
        `${colorNombre}: ${getNotation(fromR, fromC)} ${move.type} ${getNotation(move.r, move.c)}`;

    board[move.r][move.c] = p;
    board[fromR][fromC] = null;

    if (move.type === 'captura') {
        const victimColor = board[move.cap.r][move.cap.c].color;
        updateGraveyard(victimColor);
        board[move.cap.r][move.cap.c] = null;
        
        const next = getValidMoves(move.r, move.c, true);
        if (next.length > 0) {
            selected = { r: move.r, c: move.c };
            isChain = true;
            render();
            if (turn === pangiColor) setTimeout(() => execute(next[0]), 600);
            return;
        }
    }

    if (move.r === (p.color === playerColor ? 7 : 0)) p.isSoberana = true;
    
    turn = (turn === 'white') ? 'black' : 'white';
    selected = null;
    isChain = false;
    render();
    checkGameEnd();
    
    if (turn === pangiColor) setTimeout(pangiAI, 800);
}

function checkGameEnd() {
    let pieces = { white: 0, black: 0 }, moves = { white: 0, black: 0 };
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        let p = board[r][c];
        if(p) { pieces[p.color]++; moves[p.color] += getValidMoves(r,c).length; }
    }
    if (pieces.white === 0 || moves.white === 0) endGame('black');
    else if (pieces.black === 0 || moves.black === 0) endGame('white');
}

function endGame(winner) {
    const overlay = document.getElementById('end-overlay');
    document.getElementById('end-message').innerText = `VICTORIA: ${winner === 'white' ? 'BLANCAS' : 'NEGRAS'}`;
    document.getElementById('end-reason').innerText = `Misión cumplida. El oponente ha sido neutralizado.`;
    overlay.style.display = 'flex';
}

function pangiAI() {
    let options = [];
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        if(board[r][c]?.color === pangiColor) {
            getValidMoves(r,c).forEach(m => options.push({origin:{r,c}, ...m}));
        }
    }
    if(options.length > 0) {
        // La IA cumple la Ley de Cantidad básica priorizando capturas
        options.sort((a,b) => a.type === 'captura' ? -1 : 1);
        selected = options[0].origin;
        execute(options[0]);
    }
}

function updateGraveyard(color) {
    const div = document.createElement('div');
    div.className = `captured ${color}`;
    document.getElementById(`graveyard-${color}`).appendChild(div);
}

function render() {
    const b = document.getElementById('board');
    b.innerHTML = '';
    // El tablero se renderiza de 7 a 0 para que el bando blanco empiece abajo
    for (let r = 7; r >= 0; r--) {
        for (let c = 0; c < 8; c++) {
            const sq = document.createElement('div');
            sq.className = 'square';
            const p = board[r][c];
            if (p) {
                const pEl = document.createElement('div');
                pEl.className = `piece ${p.color} ${p.isSoberana ? 'soberana' : ''}`;
                
                // SEGURIDAD: Solo permite interactuar si es turno del humano y su pieza
                if (turn === playerColor && p.color === playerColor) {
                    if (!isChain || (selected?.r === r && selected?.c === c)) {
                        pEl.style.cursor = 'pointer';
                        pEl.onclick = () => { 
                            selected = {r, c}; 
                            render(); 
                            showDots(r, c); 
                        };
                    }
                }
                sq.appendChild(pEl);
            }
            b.appendChild(sq);
        }
    }
}

function showDots(r, c) {
    const moves = getValidMoves(r, c, isChain);
    const squares = document.getElementById('board').children;
    moves.forEach(m => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.onclick = (e) => { e.stopPropagation(); execute(m); };
        // Ajuste de índice para el grid visual
        squares[(7 - m.r) * 8 + m.c].appendChild(dot);
    });
}
