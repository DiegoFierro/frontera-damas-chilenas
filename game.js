/** * FRONTERA: EL SISTEMA DE LAS DAMAS CHILENAS 🇨🇱
 * Motor Optimizado con Detección de Victoria y Gestión de Cadenas.
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
        board[0][c] = { color: playerColor, isSoberana: false };
        board[1][c] = { color: playerColor, isSoberana: false };
        board[6][c] = { color: pangiColor, isSoberana: false };
        board[7][c] = { color: pangiColor, isSoberana: false };
    }
    render();
    if (turn === pangiColor) setTimeout(pangiAI, 800);
}

function getNotation(r, c) { return `${COLS[c]}${r + 1}`; }

function getValidMoves(r, c, onlyCaptures = false) {
    const p = board[r][c];
    if (!p) return [];
    let moves = [];
    const fwd = p.color === playerColor ? 1 : -1;

    if (!onlyCaptures) {
        if (p.isSoberana) {
            [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d => {
                let nr=r+d[0], nc=c+d[1];
                while(nr>=0 && nr<8 && nc>=0 && nc<8 && !board[nr][nc]) {
                    moves.push({r:nr, c:nc, type:'move'});
                    nr+=d[0]; nc+=d[1];
                }
            });
        } else {
            [[r+fwd, c], [r, c+1], [r, c-1]].forEach(([nr, nc]) => {
                if (nr>=0 && nr<8 && nc>=0 && nc<8 && !board[nr][nc]) moves.push({r:nr, c:nc, type:'move'});
            });
        }
    }

    const dirs = p.isSoberana ? [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]] : [[fwd,0],[0,1],[0,-1],[fwd,1],[fwd,-1]];
    dirs.forEach(d => {
        let nr=r+d[0], nc=c+d[1];
        if (p.isSoberana) {
            let victim = null;
            while(nr>=0 && nr<8 && nc>=0 && nc<8) {
                if (board[nr][nc]) {
                    if (board[nr][nc].color !== p.color) victim = {r:nr, c:nc};
                    break;
                }
                nr+=d[0]; nc+=d[1];
            }
            if (victim) {
                let tr=victim.r+d[0], tc=victim.c+d[1];
                const isDiag = Math.abs(d[0]) === 1 && Math.abs(d[1]) === 1;
                if (tr>=0 && tr<8 && tc>=0 && tc<8 && !board[tr][tc]) {
                    if (isDiag) moves.push({r:tr, c:tc, type:'capture', cap:victim});
                    else {
                        while (tr>=0 && tr<8 && tc>=0 && tc<8 && !board[tr][tc]) {
                            moves.push({r:tr, c:tc, type:'capture', cap:victim});
                            tr+=d[0]; tc+=d[1];
                        }
                    }
                }
            }
        } else {
            const er=r+d[0]*2, ec=c+d[1]*2;
            if (er>=0 && er<8 && ec>=0 && ec<8 && board[nr][nc] && board[nr][nc].color !== p.color && !board[er][ec]) {
                moves.push({r:er, c:ec, type:'capture', cap:{r:nr, c:nc}});
            }
        }
    });
    return moves;
}

function checkGameEnd() {
    let canPlayerMove = false;
    let canPangiMove = false;
    let playerPieces = 0;
    let pangiPieces = 0;

    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            const p = board[r][c];
            if (p) {
                const moves = getValidMoves(r, c);
                if (p.color === playerColor) {
                    playerPieces++;
                    if (moves.length > 0) canPlayerMove = true;
                } else {
                    pangiPieces++;
                    if (moves.length > 0) canPangiMove = true;
                }
            }
        }
    }

    if (playerPieces === 0 || !canPlayerMove) endGame(pangiColor, playerPieces === 0 ? "EXTINCIÓN" : "ACORRALAMIENTO");
    else if (pangiPieces === 0 || !canPangiMove) endGame(playerColor, pangiPieces === 0 ? "EXTINCIÓN" : "ACORRALAMIENTO");
}

function endGame(winner, reason) {
    const overlay = document.getElementById('end-overlay');
    const msg = document.getElementById('end-message');
    const res = document.getElementById('end-reason');
    overlay.style.display = 'flex';
    msg.innerText = winner === playerColor ? "VICTORIA" : "DERROTA";
    msg.style.color = winner === playerColor ? "#2ecc71" : "#e74c3c";
    res.innerText = `El bando ${winner === 'white' ? 'Blanco' : 'Negro'} gana por ${reason}.`;
}

function execute(move) {
    if (!selected) return;
    const fromR = selected.r, fromC = selected.c;
    const p = board[fromR][fromC];
    
    document.getElementById('current-move-text').innerText = 
        `${p.color.toUpperCase()}: ${getNotation(fromR, fromC)} ${move.type==='capture'?'CAPTURA EN':'A'} ${getNotation(move.r, move.c)}`;

    board[move.r][move.c] = p;
    board[fromR][fromC] = null;

    if (move.type === 'capture') {
        const victim = board[move.cap.r][move.cap.c];
        updateGraveyard(victim.color);
        board[move.cap.r][move.cap.c] = null;

        const next = getValidMoves(move.r, move.c, true);
        if (next.length > 0) {
            selected = { r: move.r, c: move.c };
            isChain = true;
            render();
            if (turn === pangiColor) setTimeout(() => execute(next[0]), 700);
            return;
        }
    }

    if (move.r === (p.color === playerColor ? 7 : 0)) p.isSoberana = true;
    turn = (turn === 'white') ? 'black' : 'white';
    selected = null;
    isChain = false;
    render();
    checkGameEnd();
    if (turn === pangiColor) setTimeout(pangiAI, 1000);
}

function pangiAI() {
    let options = [];
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        if(board[r][c]?.color === pangiColor) getValidMoves(r,c).forEach(m => options.push({origin:{r,c}, ...m}));
    }
    if(options.length > 0) {
        options.sort((a,b) => a.type === 'capture' ? -1 : 1);
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
    for (let r = 7; r >= 0; r--) {
        for (let c = 0; c < 8; c++) {
            const sq = document.createElement('div');
            sq.className = 'square';
            const p = board[r][c];
            if (p) {
                const pEl = document.createElement('div');
                pEl.className = `piece ${p.color} ${p.isSoberana ? 'soberana' : ''}`;
                if (turn === playerColor && (!isChain || (selected?.r === r && selected?.c === c))) {
                    pEl.onclick = () => { selected = {r, c}; render(); showDots(r, c); };
                }
                sq.appendChild(pEl);
            }
            b.appendChild(sq);
        }
    }
    if (isChain && turn === playerColor && selected) showDots(selected.r, selected.c);
}

function showDots(r, c) {
    const moves = getValidMoves(r, c, isChain);
    const squares = document.getElementById('board').children;
    moves.forEach(m => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.onclick = (e) => { e.stopPropagation(); execute(m); };
        squares[(7 - m.r) * 8 + m.c].appendChild(dot);
    });
}