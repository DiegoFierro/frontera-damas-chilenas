/**
 * SISTEMA FRONTERA - Motor Lógico v1.9 (Refactor completo)
 *
 * Cambios principales:
 * - Encapsulado en un módulo `Game` para evitar globals.
 * - Creación del DOM del tablero una sola vez (initBoardDOM) y render incremental.
 * - Delegación de eventos para piezas y puntos de movimiento (menos listeners).
 * - showDots guarda el movimiento en data-move (JSON) para ejecutar sin búsquedas costosas.
 * - updateGraveyard optimizado y accesibilidad mejorada (atributos ARIA).
 * - Mantiene la lógica original de reglas (getValidMoves, execute, pangiAI, checkGameEnd)
 *   integrada en el módulo, con comportamiento equivalente al original.
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
            // Keep previous text if set by execute; otherwise show whose turn it is
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
        // mark as preset so render doesn't overwrite
        elCurrentMoveText.dataset.preset = '1';
    }

    function updateGraveyard(color) {
        const container = graveyardEls[color];
        if (!container) return;
        const div = createEl('div', `captured ${color}`);
        container.appendChild(div);
    }

    // --- Game logic (adapted from original) ---

    function setupGame(color) {
        playerColor = color || 'white';
        pangiColor = (playerColor === 'white') ? 'black' : 'white';
        turn = 'white';
        selected = null;
        isChain = false;

        // Prepare board (mirror original initial setup)
        board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
        for (let c = 0; c < 8; c++) {
            board[0][c] = { color: 'white', isSoberana: false };
            board[1][c] = { color: 'white', isSoberana: false };
            board[6][c] = { color: 'black', isSoberana: false };
            board[7][c] = { color: 'black', isSoberana: false };
        }

        // Hide setup overlay if exists
        const setupOverlay = document.getElementById('setup-overlay');
        if (setupOverlay) setupOverlay.style.display = 'none';

        initBoardDOM();
        render();

        if (turn === pangiColor) setTimeout(pangiAI, 600);
    }

    function init() {
        // default playerColor already set; call setup
        setupGame(playerColor);
    }

    function getNotation(r, c) { return `${COLS[c]}${r + 1}`; }

    function getValidMoves(r, c, onlyCaptures = false) {
        const p = board[r][c];
        if (!p) return [];
        let moves = [];
        const fwd = p.color === 'white' ? 1 : -1;

        const soberanaDirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
        const peonDirs = [[fwd, 0], [0, 1], [0, -1]];
        const peonCapDirs = [[fwd, 0], [fwd, 1], [fwd, -1], [0, 1], [0, -1]];

        // Simple moves
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
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
                        moves.push({ r: nr, c: nc, type: 'a' });
                    }
                });
            }
        }

        // Captures
        const activeCapDirs = p.isSoberana ? soberanaDirs : peonCapDirs;
        activeCapDirs.forEach(d => {
            if (p.isSoberana) {
                let nr = r + d[0], nc = c + d[1];
                let victim = null;
                while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    if (board[nr][nc]) {
                        if (board[nr][nc].color !== p.color) victim = { r: nr, c: nc };
                        break;
                    }
                    nr += d[0]; nc += d[1];
                }
                if (victim) {
                    let tr = victim.r + d[0], tc = victim.c + d[1];
                    while (tr >= 0 && tr < 8 && tc >= 0 && tc < 8 && !board[tr][tc]) {
                        moves.push({ r: tr, c: tc, type: 'captura', cap: victim });
                        tr += d[0]; tc += d[1];
                    }
                }
            } else {
                let nr = r + d[0], nc = c + d[1];
                let er = r + d[0] * 2, ec = c + d[1] * 2;
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
        if (!move) return;

        // If move comes from dot dataset, it has r,c,type and maybe cap
        // If it came from earlier structure (pangiAI), it may include origin.
        let fromR, fromC;
        if (move.origin) {
            fromR = move.origin.r; fromC = move.origin.c;
        } else if (selected) {
            fromR = selected.r; fromC = selected.c;
        } else if (move.from) {
            fromR = move.from.r; fromC = move.from.c;
        } else {
            // No origin; ignore
            return;
        }

        const p = board[fromR][fromC];
        if (!p) return;

        // Log move text
        const moveText = `${p.color.toUpperCase()}: ${getNotation(fromR, fromC)} ${move.type} ${getNotation(move.r, move.c)}`;
        updateMoveLog(moveText);

        // Move piece
        board[move.r][move.c] = p;
        board[fromR][fromC] = null;

        if (move.type === 'captura' && move.cap) {
            // capture color before clearing
            const captured = board[move.cap.r][move.cap.c];
            if (captured) updateGraveyard(captured.color);
            board[move.cap.r][move.cap.c] = null;

            // chain captures
            const next = getValidMoves(move.r, move.c, true);
            if (next.length > 0) {
                selected = { r: move.r, c: move.c };
                isChain = true;
                render();
                // if pangi playing, auto-execute first chain move
                if (turn === pangiColor) setTimeout(() => execute(next[0]), 500);
                return;
            }
        }

        // Crown
        if (move.r === (p.color === 'white' ? 7 : 0)) p.isSoberana = true;

        // Change turn
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
        const captures = options.filter(o => o.type === 'captura');
        const move = captures.length > 0 ? captures[0] : options[Math.floor(Math.random() * options.length)];
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
        // Expose minimal internals for debugging/tests
        _debug: () => ({ board, playerColor, pangiColor, turn, selected, isChain }),
        // Allow external reset or custom setups
        setPlayerColor: (c) => { playerColor = c; pangiColor = (c === 'white' ? 'black' : 'white'); }
    };
})();

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', () => { try { Game.init(); } catch (e) { console.warn('Game init error:', e); } }
