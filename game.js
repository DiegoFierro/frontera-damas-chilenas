/**
 * SISTEMA FRONTERA - Motor Lógico v1.9
 * Regla: La banda limita el movimiento. Verificación estricta de límites.
 */

let board = [];
let playerColor = 'white';
let pangiColor = 'black';
let turn = 'white';
let selected = null;
let isChain = false;

const COLS = ['A','B','C','D','E','F','G','H'];

function setupGame(color) {
    playerColor = color;
    pangiColor = (color === 'white') ? 'black' : 'white';
    document.getElementById('setup-overlay').style.display = 'none';
    init();
}

function init() {
    board = Array.from({ length: 8 }, () => Array(8).fill(null));
    for(let c=0; c<8; c++) {
        board[0][c] = { color: 'white', isSoberana: false };
        board[1][c] = { color: 'white', isSoberana: false };
        board[6][c] = { color: 'black', isSoberana: false };
        board[7][c] = { color: 'black', isSoberana: false };
    }
    render();
    if (turn === pangiColor) setTimeout(pangiAI, 600);
}

function getNotation(r, c) { return `${COLS[c]}${r + 1}`; }

function getValidMoves(r, c, onlyCaptures = false) {
    const p = board[r][c];
    if (!p) return [];
    let moves = [];
    const fwd = p.color === 'white' ? 1 : -1;
    
    // Direcciones permitidas
    const soberanaDirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    const peonDirs = [[fwd, 0], [0, 1], [0, -1]]; // Mov. simple peón
    const peonCapDirs = [[fwd, 0], [fwd, 1], [fwd, -1], [0, 1], [0, -1]]; // Captura peón

    // 1. MOVIMIENTOS SIMPLES
    if (!onlyCaptures) {
        if (p.isSoberana) {
            soberanaDirs.forEach(d => {
                let nr = r + d[0], nc = c + d[1];
                // La soberana vuela hasta encontrar un obstáculo o el borde (la banda)
                while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
                    moves.push({ r: nr, c: nc, type: 'a' });
                    nr += d[0]; nc += d[1];
                }
            });
        } else {
            peonDirs.forEach(d => {
                let nr = r + d[0], nc = c + d[1];
                // El peón se frena en la banda
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
                    moves.push({ r: nr, c: nc, type: 'a' });
                }
            });
        }
    }

    // 2. CAPTURAS (CON RESPETO A LA BANDA)
    const activeCapDirs = p.isSoberana ? soberanaDirs : peonCapDirs;
    
    activeCapDirs.forEach(d => {
        if (p.isSoberana) {
            let nr = r + d[0], nc = c + d[1];
            let victim = null;
            // Buscar primera pieza en la línea
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                if (board[nr][nc]) {
                    if (board[nr][nc].color !== p.color) victim = { r: nr, c: nc };
                    break;
                }
                nr += d[0]; nc += d[1];
            }
            // Si hay víctima, verificar espacio tras ella antes de la banda
            if (victim) {
                let tr = victim.r + d[0], tc = victim.c + d[1];
                // La soberana puede aterrizar en cualquier celda vacía tras la víctima hasta chocar con la banda u otra pieza
                while (tr >= 0 && tr < 8 && tc >= 0 && tc < 8 && !board[tr][tc]) {
                    moves.push({ r: tr, c: tc, type: 'captura', cap: victim });
                    tr += d[0]; tc += d[1];
                }
            }
        } else {
            let nr = r + d[0], nc = c + d[1];     // Celda víctima
            let er = r + d[0] * 2, ec = c + d[1] * 2; // Celda aterrizaje
            // El peón solo captura si la celda de aterrizaje está DENTRO de los límites (la banda)
            if (er >= 0 && er < 8 && ec >= 0 && ec < 8) {
                if (board[nr][nc] && board[nr][nc].color !== p.color && !board[er][ec]) {
                    moves.push({ r: er, c: ec, type: 'captura', cap: { r: nr, c: nc } });
                }
            }
        }
    });
    return moves;
}

function execute(move) {
    if (!selected) return;
    const fromR = selected.r, fromC = selected.c;
    const p = board[fromR][fromC];
    
    document.getElementById('current-move-text').innerText = 
        `${p.color.toUpperCase()}: ${getNotation(fromR, fromC)} ${move.type} ${getNotation(move.r, move.c)}`;

    board[move.r][move.c] = p;
    board[fromR][fromC] = null;

    if (move.type === 'captura') {
        updateGraveyard(board[move.cap.r][move.cap.c].color);
        board[move.cap.r][move.cap.c] = null;
        
        const next = getValidMoves(move.r, move.c, true);
        if (next.length > 0) {
            selected = { r: move.r, c: move.c };
            isChain = true;
            render();
            if (turn === pangiColor) setTimeout(() => execute(next[0]), 500);
            return;
        }
    }

    if (move.r === (p.color === 'white' ? 7 : 0)) p.isSoberana = true;
    turn = (turn === 'white') ? 'black' : 'white';
    selected = null;
    isChain = false;
    render();
    if (!checkGameEnd() && turn === pangiColor) setTimeout(pangiAI, 600);
}

function pangiAI() {
    let options = [];
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        if(board[r][c]?.color === pangiColor) {
            getValidMoves(r,c).forEach(m => options.push({origin:{r,c}, ...m}));
        }
    }
    if(options.length === 0) return;
    const captures = options.filter(o => o.type === 'captura');
    const move = captures.length > 0 ? captures[0] : options[Math.floor(Math.random() * options.length)];
    selected = move.origin;
    execute(move);
}

function render() {
    const b = document.getElementById('board');
    b.innerHTML = '';
    const rows = playerColor === 'white' ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
    rows.forEach(r => {
        for (let c = 0; c < 8; c++) {
            const sq = document.createElement('div');
            sq.className = 'square';
            const p = board[r][c];
            if (p) {
                const pEl = document.createElement('div');
                pEl.className = `piece ${p.color} ${p.isSoberana ? 'soberana' : ''}`;
                if (turn === playerColor && p.color === playerColor) {
                    if (!isChain || (selected?.r === r && selected?.c === c)) {
                        pEl.onclick = () => { selected = {r, c}; render(); showDots(r, c); };
                    }
                }
                sq.appendChild(pEl);
            }
            b.appendChild(sq);
        }
    });
}

function showDots(r, c) {
    const moves = getValidMoves(r, c, isChain);
    const squares = document.getElementById('board').children;
    const rowsMap = playerColor === 'white' ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
    moves.forEach(m => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.onclick = (e) => { e.stopPropagation(); execute(m); };
        squares[rowsMap.indexOf(m.r) * 8 + m.c].appendChild(dot);
    });
}

function updateGraveyard(color) {
    const div = document.createElement('div');
    div.className = `captured ${color}`;
    document.getElementById(`graveyard-${color}`).appendChild(div);
}

function checkGameEnd() {
    let pieces = { white: 0, black: 0 }, moves = { white: 0, black: 0 };
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        let p = board[r][c];
        if(!p) continue;
        pieces[p.color]++;
        moves[p.color] += getValidMoves(r, c).length;
    }
    if (pieces.white === 0 || (turn === 'white' && moves.white === 0)) { endGame('NEGRO'); return true; }
    if (pieces.black === 0 || (turn === 'black' && moves.black === 0)) { endGame('BLANCO'); return true; }
    return false;
}

function endGame(winner) {
    document.getElementById('end-message').innerText = `VICTORIA: ${winner}`;
    document.getElementById('end-reason').innerText = "Un bando ha sido neutralizado o bloqueado.";
    document.getElementById('end-overlay').style.display = 'flex';
}
