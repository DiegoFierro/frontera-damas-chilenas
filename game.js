/**
 * SISTEMA FRONTERA - Motor Lógico v1.9 (Refactor completo) + Ley de Cantidad
 *
 * Cambios principales en esta versión:
 * - Implementación completa de la "Ley de Cantidad": el jugador debe elegir
 *   la secuencia de captura que elimina el mayor número de piezas enemigas.
 * - Búsqueda de todas las secuencias de captura (DFS) para peones y soberanas.
 * - Coronación durante secuencias (si aplica) y continuación usando el nuevo estado.
 * - Integración con la UI refactorizada: showDots, execute y pangiAI respetan la regla.
 * - Mantenimiento del render incremental y delegación de eventos.
 */

const Game = (function () {
    'use strict';

    // --- Estado interno ---
    let board = [];
    let playerColor = 'white';
    let pangiColor = 'black';
    let turn = 'white';
    let selected = null;
    let isChain = false;

    const BOARD_SIZE = 8;
    const COLS = ['A','B','C','D','E','F','G','H'];

    // DOM cache
    let elBoard, squares; // squares: array of 64 square elements in DOM order
    let elCurrentMoveText, elMoveLogger;
    let graveyardEls = { white: null, black: null };

    // Helpers
    function createEl(tag, cls, attrs = {}) {
        const el = document.createElement(tag);
        if (cls) el.className = cls;
        Object.keys(attrs).forEach(k => {
            if (k === 'text') el.textContent = attrs[k];
            else if (k.startsWith('data-')) el.setAttribute(k, attrs[k]);
            else el.setAttribute(k, attrs[k]);
        });
        return el;
    }

    function idxFromRC(r, c) {
        const rowsMap = (playerColor === 'white') ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
        return rowsMap.indexOf(r) * BOARD_SIZE + c;
    }

    function cloneBoard(src) {
        return src.map(row => row.map(cell => cell ? { color: cell.color, isSoberana: !!cell.isSoberana } : null));
    }

    // --- Capture sequence generation (Ley de Cantidad) ---
    // Returns array of sequences; each sequence is an array of move objects {r,c,type:'captura', cap:{r,c}}
    function generateCaptureSequences(bd, r, c) {
        const p = bd[r][c];
        if (!p) return [];
        const fwd = p.color === 'white' ? 1 : -1;
        const soberanaDirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
        const peonCapDirs = [[fwd, 0], [fwd, 1], [fwd, -1], [0, 1], [0, -1]];

        const seqs = [];

        // Internal DFS; bd is a cloned board for independent path
        function dfs(boardState, cr, cc, isSoberana) {
            let found = false;
            const results = [];
            const activeCapDirs = isSoberana ? soberanaDirs : peonCapDirs;

            if (isSoberana) {
                // Soberana: search along rays
                activeCapDirs.forEach(d => {
                    let nr = cr + d[0], nc = cc + d[1];
                    // find first piece in line
                    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                        if (boardState[nr][nc]) {
                            if (boardState[nr][nc].color !== boardState[cr][cc].color) {
                                // victim found at nr,nc -> possible landings after victim
                                let vr = nr, vc = nc;
                                let tr = vr + d[0], tc = vc + d[1];
                                while (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
                                    if (boardState[tr][tc]) break; // blocked by piece
                                    // simulate capture: move piece to tr,tc and remove victim
                                    const nextBoard = cloneBoard(boardState);
                                    const movingPiece = { color: nextBoard[cr][cc].color, isSoberana: isSoberana };
                                    nextBoard[cr][cc] = null;
                                    // remove victim
                                    nextBoard[vr][vc] = null;
                                    // place piece
                                    // consider coronation: if peon (not isSoberana) reaching last rank becomes soberana
                                    movingPiece.isSoberana = movingPiece.isSoberana || (movingPiece.isSoberana ? true : (tr === (movingPiece.color === 'white' ? 7 : 0)));
                                    nextBoard[tr][tc] = movingPiece;

                                    // Recurse
                                    const further = dfs(nextBoard, tr, tc, movingPiece.isSoberana);
                                    const move = { r: tr, c: tc, type: 'captura', cap: { r: vr, c: vc } };
                                    if (further.length > 0) {
                                        further.forEach(fseq => results.push([move, ...fseq]));
                                    } else {
                                        results.push([move]);
                                    }
                                    found = true;

                                    tr += d[0]; tc += d[1];
                                }
                            }
                            break; // stop at first piece
                        }
                        nr += d[0]; nc += d[1];
                    }
                });
            } else {
                // Peon captures: victim adjacent, landing the cell after
                activeCapDirs.forEach(d => {
                    const nr = cr + d[0], nc = cc + d[1];
                    const er = cr + d[0] * 2, ec = cc + d[1] * 2;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && er >= 0 && er < 8 && ec >= 0 && ec < 8) {
                        if (boardState[nr][nc] && boardState[nr][nc].color !== boardState[cr][cc].color && !boardState[er][ec]) {
                            const nextBoard = cloneBoard(boardState);
                            const movingPiece = { color: nextBoard[cr][cc].color, isSoberana: false };
                            nextBoard[cr][cc] = null;
                            nextBoard[nr][nc] = null;
                            // coronation
                            movingPiece.isSoberana = (er === (movingPiece.color === 'white' ? 7 : 0));
                            nextBoard[er][ec] = movingPiece;

                            const further = dfs(nextBoard, er, ec, movingPiece.isSoberana);
                            const move = { r: er, c: ec, type: 'captura', cap: { r: nr, c: nc } };
                            if (further.length > 0) {
                                further.forEach(fseq => results.push([move, ...fseq]));
                            } else {
                                results.push([move]);
                            }
                            found = true;
                        }
                    }
                });
            }

            return results;
        }

        // Start DFS on cloned board
        const cloned = cloneBoard(bd);
        // Ensure starting square has a movable piece preserved
        if (!cloned[r][c]) return [];
        const startIsSoberana = !!cloned[r][c].isSoberana;
        const all = dfs(cloned, r, c, startIsSoberana);
        return all; // array of sequences (arrays)
    }

    // Return maximum capture length available for the given player across the whole board
    function maxCapturesForPlayer(color) {
        let max = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (!p || p.color !== color) continue;
                const seqs = generateCaptureSequences(board, r, c);
                seqs.forEach(s => { if (s.length > max) max = s.length; });
            }
        }
        return max;
    }

    // --- Inicialización DOM ---
    function initBoardDOM() {
        elBoard = document.getElementById('board');
        elMoveLogger = document.getElementById('move-logger');
        elCurrentMoveText = document.getElementById('current-move-text');
        graveyardEls.white = document.getElementById('graveyard-white');
        graveyardEls.black = document.getElementById('graveyard-black');

        if (!elBoard) throw new Error('#board element not found');

        // Build squares once in orientation order
        elBoard.innerHTML = '';
        squares = [];
        const fragment = document.createDocumentFragment();
        const rows = (playerColor === 'white') ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

        rows.forEach(r => {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const sq = createEl('div', 'square', {
                    'data-r': r,
                    'data-c': c,
                    'role': 'button',
                    'aria-label': `Casilla ${COLS[c]}${r+1}`
                });
                fragment.appendChild(sq);
                squares.push(sq);
            }
        });

        elBoard.appendChild(fragment);

        // Delegation: one handler on board for clicks
        elBoard.removeEventListener('click', onBoardClick);
        elBoard.addEventListener('click', onBoardClick);
    }

    // Delegated click handler
    function onBoardClick(ev) {
        const dot = ev.target.closest('.dot');
        if (dot) {
            ev.stopPropagation();
            const moveJson = dot.getAttribute('data-move');
            try {
                const move = JSON.parse(moveJson);
                execute(move);
            } catch (e) {
                console.warn('Invalid move data', e);
            }
            return;
        }

        const pieceEl = ev.target.closest('.piece');
        if (pieceEl) {
            const square = pieceEl.parentElement;
            const r = parseInt(square.getAttribute('data-r'), 10);
            const c = parseInt(square.getAttribute('data-c'), 10);
            const p = board[r][c];
            if (!p) return;
            if (turn === playerColor && p.color === playerColor) {
                selected = { r, c };
                render();
                showDots(r, c);
            }
            return;
        }

        // Click on empty square: clear selection
        const sq = ev.target.closest('.square');
        if (sq) {
            selected = null;
            clearDots();
            render();
        }
    }

    // -- Render incremental: update piece elements, selection, move text
    function render() {
        if (!squares || squares.length !== BOARD_SIZE * BOARD_SIZE) {
            initBoardDOM();
        }

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const idx = idxFromRC(r, c);
                const sq = squares[idx];
                const p = board[r][c];
                const existing = sq.querySelector('.piece');

                if (p) {
                    if (existing) {
                        existing.className = `piece ${p.color} ${p.isSoberana ? 'soberana' : ''}`.trim();
                    } else {
                        const pEl = createEl('div', `piece ${p.color} ${p.isSoberana ? 'soberana' : ''}`.trim());
                        sq.appendChild(pEl);
                    }
                } else {
                    if (existing) existing.remove();
                }

                if (selected && selected.r === r && selected.c === c) sq.classList.add('selected');
                else sq.classList.remove('selected');
            }
        }

        if (elCurrentMoveText) {
            if (!elCurrentMoveText.dataset.preset) {
                elCurrentMoveText.textContent = (turn === playerColor) ? 'TU TURNO' : 'TURNO ENEMIGO';
            }
        }
    }

    function clearDots() {
        const existing = elBoard.querySelectorAll('.dot');
        existing.forEach(d => d.remove());
    }

    // showDots: attach data-move JSON to each dot; append to target square
    function showDots(r, c) {
        clearDots();
        const moves = getValidMoves(r, c, isChain);
        if (!moves || !moves.length) return;

        moves.forEach(m => {
            const dot = createEl('div', 'dot');
            dot.setAttribute('data-move', JSON.stringify(m));
            dot.setAttribute('title', `Mover a ${COLS[m.c]}${m.r + 1}`);
            const idx = idxFromRC(m.r, m.c);
            squares[idx].appendChild(dot);
        });
    }

    function updateMoveLog(text) {
        if (!elCurrentMoveText) return;
        elCurrentMoveText.textContent = text;
        elCurrentMoveText.dataset.preset = '1';
    }

    function updateGraveyard(color) {
        const container = graveyardEls[color];
        if (!container) return;
        const div = createEl('div', `captured ${color}`);
        container.appendChild(div);
    }

    // --- Inicialización y setup ---
    function setupGame(color) {
        playerColor = color || 'white';
        pangiColor = (playerColor === 'white') ? 'black' : 'white';
        turn = 'white';
        selected = null;
        isChain = false;

        board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
        for (let c = 0; c < 8; c++) {
            board[0][c] = { color: 'white', isSoberana: false };
            board[1][c] = { color: 'white', isSoberana: false };
            board[6][c] = { color: 'black', isSoberana: false };
            board[7][c] = { color: 'black', isSoberana: false };
        }

        const setupOverlay = document.getElementById('setup-overlay');
        if (setupOverlay) setupOverlay.style.display = 'none';

        initBoardDOM();
        render();

        if (turn === pangiColor) setTimeout(pangiAI, 600);
    }

    function init() { setupGame(playerColor); }

    function getNotation(r, c) { return `${COLS[c]}${r + 1}`; }

    // getValidMoves now enforces Ley de Cantidad
    function getValidMoves(r, c, onlyCaptures = false) {
        const p = board[r][c];
        if (!p) return [];

        // First, compute global maximum captures for the player (only when not in chain)
        let globalMax = 0;
        if (!onlyCaptures) globalMax = maxCapturesForPlayer(p.color);

        // If we're in a chain or onlyCaptures requested, compute sequences from this piece
        const sequencesFromPiece = generateCaptureSequences(board, r, c);
        const localMax = sequencesFromPiece.reduce((m, s) => Math.max(m, s.length), 0);

        // If global captures exist (>0) and not onlyCaptures: we must force capture moves that are part of sequences with length == globalMax
        // If onlyCaptures (chain) or globalMax === 0: behave accordingly (either force local captures or allow simple moves)

        const moves = [];
        const fwd = p.color === 'white' ? 1 : -1;
        const soberanaDirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
        const peonDirs = [[fwd, 0], [0, 1], [0, -1]];
        const peonCapDirs = [[fwd, 0], [fwd, 1], [fwd, -1], [0, 1], [0, -1]];

        // If captures are required (globalMax > 0) then only include capture moves that begin maximal sequences
        if (globalMax > 0) {
            // collect first moves from sequences across all pieces matching globalMax
            const allowedFirstMoves = new Set();
            for (let rr = 0; rr < 8; rr++) for (let cc = 0; cc < 8; cc++) {
                const piece = board[rr][cc];
                if (!piece || piece.color !== p.color) continue;
                const seqs = generateCaptureSequences(board, rr, cc);
                seqs.forEach(s => {
                    if (s.length === globalMax) {
                        const first = s[0];
                        // stringify origin+dest to identify moves uniquely: origin included elsewhere; we will compare by origin coordinates
                        const key = `${rr},${cc}->${first.r},${first.c}`;
                        allowedFirstMoves.add(key);
                    }
                });
            }
            // Now gather allowed moves for this specific piece (r,c)
            sequencesFromPiece.forEach(s => {
                if (s.length === globalMax) moves.push({ r: s[0].r, c: s[0].c, type: 'captura', cap: s[0].cap, origin: { r, c } });
            });
            return moves;
        }

        // If no global captures or we're inside a chain (onlyCaptures true): prefer local captures if any
        if (localMax > 0) {
            // Only include first steps of sequences that reach localMax
            sequencesFromPiece.forEach(s => {
                if (s.length === localMax) moves.push({ r: s[0].r, c: s[0].c, type: 'captura', cap: s[0].cap });
            });
            return moves;
        }

        // No captures available: allow simple moves
        if (!onlyCaptures) {
            if (p.isSoberana) {
                soberanaDirs.forEach(d => {
                    let nr = r + d[0], nc = c + d[1];
                    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
                        moves.push({ r: nr, c: nc, type: 'a' });
                        nr += d[0]; nc += d[1];
                    }
                });
            } else {
                peonDirs.forEach(d => {
                    let nr = r + d[0], nc = c + d[1];
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) moves.push({ r: nr, c: nc, type: 'a' });
                });
            }
        }

        return moves;
    }

    function execute(move) {
        if (!move) return;

        let fromR, fromC;
        if (move.origin) {
            fromR = move.origin.r; fromC = move.origin.c;
        } else if (selected) {
            fromR = selected.r; fromC = selected.c;
        } else if (move.from) {
            fromR = move.from.r; fromC = move.from.c;
        } else {
            return;
        }

        const p = board[fromR][fromC];
        if (!p) return;

        const moveText = `${p.color.toUpperCase()}: ${getNotation(fromR, fromC)} ${move.type} ${getNotation(move.r, move.c)}`;
        updateMoveLog(moveText);

        board[move.r][move.c] = p;
        board[fromR][fromC] = null;

        if (move.type === 'captura' && move.cap) {
            if (board[move.cap.r] && board[move.cap.r][move.cap.c]) updateGraveyard(board[move.cap.r][move.cap.c].color);
            board[move.cap.r][move.cap.c] = null;

            // After capture, check for further captures from new pos (chain)
            const nextSeqs = generateCaptureSequences(board, move.r, move.c);
            if (nextSeqs.length > 0) {
                selected = { r: move.r, c: move.c };
                isChain = true;
                render();
                // If opponent AI is moving in chain, auto-play first continuation
                if (turn === pangiColor) setTimeout(() => {
                    // choose continuation that leads to maximum captures (local)
                    const localMax = nextSeqs.reduce((m,s) => Math.max(m, s.length), 0);
                    const best = nextSeqs.find(s => s.length === localMax);
                    if (best) execute(best[0]);
                }, 300);
                return;
            }
        }

        // Coronación
        if (move.r === (p.color === 'white' ? 7 : 0)) p.isSoberana = true;

        // Cambiar turno
        turn = (turn === 'white') ? 'black' : 'white';
        selected = null;
        isChain = false;
        render();

        if (!checkGameEnd() && turn === pangiColor) setTimeout(pangiAI, 600);
    }

    function pangiAI() {
        let options = [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if (board[r][c]?.color === pangiColor) {
                getValidMoves(r,c).forEach(m => options.push({ origin: { r, c }, ...m }));
            }
        }
        if (options.length === 0) return;

        // Prefer captures (options should already be filtered by Ley de Cantidad), else random
        const captures = options.filter(o => o.type === 'captura');
        let move;
        if (captures.length > 0) {
            // Heuristic: prefer moves that lead to coronation or that maximize immediate sequence length
            // Compute sequence lengths for each capture option
            let best = null; let bestLen = -1;
            captures.forEach(o => {
                // simulate move and compute remaining capture chain length
                const copy = cloneBoard(board);
                const p = copy[o.origin.r][o.origin.c];
                if (!p) return;
                copy[o.r][o.c] = p;
                copy[o.origin.r][o.origin.c] = null;
                if (o.cap) copy[o.cap.r][o.cap.c] = null;
                // coronation
                if (o.r === (p.color === 'white' ? 7 : 0)) p.isSoberana = true;
                const seqs = generateCaptureSequences(copy, o.r, o.c);
                const len = seqs.reduce((m,s) => Math.max(m, s.length), 0) + 1; // include this capture
                if (len > bestLen) { bestLen = len; best = o; }
            });
            move = best || captures[0];
        } else {
            move = options[Math.floor(Math.random() * options.length)];
        }

        selected = move.origin;
        execute(move);
    }

    function checkGameEnd() {
        let pieces = { white: 0, black: 0 }, moves = { white: 0, black: 0 };
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p) continue;
            pieces[p.color]++;
            moves[p.color] += getValidMoves(r, c).length;
        }
        if (pieces.white === 0 || (turn === 'white' && moves.white === 0)) { endGame('NEGRO'); return true; }
        if (pieces.black === 0 || (turn === 'black' && moves.black === 0)) { endGame('BLANCO'); return true; }
        return false;
    }

    function endGame(winner) {
        const endOverlay = document.getElementById('end-overlay');
        if (endOverlay) {
            const em = document.getElementById('end-message');
            const er = document.getElementById('end-reason');
            if (em) em.innerText = `VICTORIA: ${winner}`;
            if (er) er.innerText = 'Un bando ha sido neutralizado o bloqueado.';
            endOverlay.style.display = 'flex';
        } else {
            alert(`VICTORIA: ${winner}`);
        }
    }

    // Public API
    return {
        init,
        setupGame,
        render,
        getNotation,
        _debug: () => ({ board, playerColor, pangiColor, turn, selected, isChain }),
        setPlayerColor: (c) => { playerColor = c; pangiColor = (c === 'white' ? 'black' : 'white'); }
    };
})();

document.addEventListener('DOMContentLoaded', () => { try { Game.init(); } catch (e) { console.warn('Game init error:', e); } });
