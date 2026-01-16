/**
 * SISTEMA FRONTERA - Motor Lógico v43.0
 * -------------------------------------------------------------------------
 * VERIFICACIÓN COMPLETA CONTRA MANUAL OFICIAL
 * 
 * IV. DINÁMICA DE LOS MANES:
 * ✓ Movimiento: Un paso frontal o lateral (nunca atrás ni diagonal)
 * ✓ Captura: 5 direcciones (frontal, laterales, diagonales frontales)
 * ✓ Ley Banda: No inicia diagonal desde banda excepto fila origen (1 o 6)
 * ✓ Carril Avance: En banda solo frontal (no diagonal ni lateral)
 * ✓ Frenado: Tras aterrizar en banda post-diagonal → siguiente frontal
 * 
 * V. LA SOBERANA:
 * ✓ Vuelo Táctico: 8 direcciones, cualquier distancia
 * ✓ Captura Ortogonal: Deslizamiento libre
 * ✓ Captura Diagonal: Salto seco (aterrizaje inmediato)
 * ✓ Inercia Banda: Le afecta frenado igual que Man
 * 
 * VI. REGLAS GENERALES:
 * ✓ Extracción Diferida: Piezas se retiran al final del turno
 * ✓ Promoción en Turno: Detiene movimiento y finaliza turno
 * ✓ Captura NO obligatoria (Libertad de Voluntad)
 */

let board = [];
let playerColor = 'white';
let pangiColor = 'black';
let turn = 'white';
let selected = null;
let isChain = false;
let capturedThisTurn = []; // Para extracción diferida
let landedInBandDiagonal = false; // Para frenado de banda

function setupGame(color) {
    playerColor = color;
    pangiColor = (color === 'white') ? 'black' : 'white';
    turn = 'white'; // Siempre empiezan blancas
    selected = null;
    isChain = false;
    capturedThisTurn = [];
    landedInBandDiagonal = false;
    
    board = Array(8).fill(null).map(() => Array(8).fill(null));

    // Despliegue inicial - Muro de Fondo
    for (let c = 0; c < 8; c++) {
        board[0][c] = { color: 'white', isSoberana: false };
        board[1][c] = { color: 'white', isSoberana: false };
        board[6][c] = { color: 'black', isSoberana: false };
        board[7][c] = { color: 'black', isSoberana: false };
    }

    const overlay = document.getElementById('setup-overlay');
    if (overlay) overlay.style.display = 'none';

    updateLog("SISTEMA FRONTERA ONLINE. Turno inicial: Blancas.");
    renderTheater();
    
    // Si el jugador eligió negras, la máquina (blancas) inicia
    if (turn === pangiColor) {
        setTimeout(pangiAI, 1000);
    }
}

/**
 * MOTOR DE POSIBILIDADES V42.0 - FIEL AL MANUAL
 */
function getValidMoves(r, c, forceCapturesOnly = false) {
    const unit = board[r][c];
    if (unit === null) return [];
    
    let actions = [];

    if (unit.isSoberana) {
        // SOBERANA: 8 direcciones
        const dirs = [
            [1, 0], [-1, 0], [0, 1], [0, -1],  // Ortogonales N, S, E, O
            [1, 1], [1, -1], [-1, 1], [-1, -1]  // Diagonales NE, NO, SE, SO
        ];

        for (let [dr, dc] of dirs) {
            const isDiagonal = (dr !== 0 && dc !== 0);
            let nR = r + dr, nC = c + dc;
            let victim = null;

            // Buscar víctima en la dirección
            while (nR >= 0 && nR < 8 && nC >= 0 && nC < 8) {
                if (board[nR][nC] === null) {
                    // Vuelo Táctico: movimiento sin captura
                    if (!victim && !forceCapturesOnly && !isChain) {
                        actions.push({ r: nR, c: nC, type: 'move' });
                    }
                } else {
                    if (board[nR][nC].color !== unit.color && !victim) {
                        victim = { r: nR, c: nC };
                    }
                    break;
                }
                nR += dr;
                nC += dc;
            }

            // Procesar capturas si hay víctima
            if (victim) {
                if (isDiagonal) {
                    // CAPTURA DIAGONAL: Salto Seco (aterrizaje forzoso inmediato)
                    let lR = victim.r + dr, lC = victim.c + dc;
                    if (lR >= 0 && lR < 8 && lC >= 0 && lC < 8 && board[lR][lC] === null) {
                        // Verificar Frenado de Banda
                        if (!applyBandFrenado(dr, dc)) {
                            actions.push({ r: lR, c: lC, type: 'capture', victim });
                        }
                    }
                } else {
                    // CAPTURA ORTOGONAL: Deslizamiento libre
                    let lR = victim.r + dr, lC = victim.c + dc;
                    while (lR >= 0 && lR < 8 && lC >= 0 && lC < 8 && board[lR][lC] === null) {
                        // Verificar Frenado de Banda
                        if (!applyBandFrenado(dr, dc)) {
                            actions.push({ r: lR, c: lC, type: 'capture', victim });
                        }
                        lR += dr;
                        lC += dc;
                    }
                }
            }
        }
    } else {
        // MAN (PEÓN)
        const fwd = (unit.color === 'white') ? 1 : -1;
        
        // MOVIMIENTO ORDINARIO: Solo ortogonal (adelante, izquierda, derecha)
        // "Un paso al frente o lateral (nunca atrás ni diagonal)"
        if (!forceCapturesOnly && !isChain) {
            const moveDirs = [[fwd, 0], [0, 1], [0, -1]];
            for (let [dr, dc] of moveDirs) {
                let nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === null) {
                    actions.push({ r: nr, c: nc, type: 'move' });
                }
            }
        }

        // PROTOCOLO DE CAPTURA: 5 direcciones
        // "Frontal, laterales y diagonales frontales"
        // NO incluye capturas hacia atrás
        const captureDirs = [
            [fwd, 0],    // Frontal
            [0, 1],      // Lateral derecha
            [0, -1],     // Lateral izquierda
            [fwd, 1],    // Diagonal frontal derecha
            [fwd, -1]    // Diagonal frontal izquierda
        ];
        
        for (let [dr, dc] of captureDirs) {
            let vR = r + dr, vC = c + dc;
            let lR = r + (dr * 2), lC = c + (dc * 2);
            
            if (lR >= 0 && lR < 8 && lC >= 0 && lC < 8) {
                if (board[vR][vC] !== null && board[vR][vC].color !== unit.color && board[lR][lC] === null) {
                    // Verificar Ley Estricta de la Banda
                    if (!violatesStrictBandLaw(r, c, dr, dc)) {
                        // Verificar Frenado de Banda
                        if (!applyBandFrenado(dr, dc)) {
                            actions.push({ r: lR, c: lC, type: 'capture', victim: { r: vR, c: vC } });
                        }
                    }
                }
            }
        }
    }
    
    return actions;
}

/**
 * LEY ESTRICTA DE LA BANDA - Man
 * "Restricción de Inicio: Un Man en la banda no puede iniciar capturas diagonales (salvo desde su fila de origen 2 o 7)"
 * "Carril de Avance: Al estar en la banda, el Man solo puede capturar hacia adelante. Se anulan sus diagonales y laterales"
 * Nota: Filas de origen son 1 para blancas y 6 para negras (índice 0-7)
 */
function violatesStrictBandLaw(r, c, dr, dc) {
    const piece = board[r][c];
    const isInBand = (c === 0 || c === 7);
    
    if (!isInBand) return false;
    
    // Filas de origen: 1 para blancas (segunda fila), 6 para negras (séptima fila)
    const isOriginRow = (piece.color === 'white' && r === 1) || 
                        (piece.color === 'black' && r === 6);
    
    const isDiagonal = (dr !== 0 && dc !== 0);
    const isLateral = (dr === 0 && dc !== 0);
    const fwd = (piece.color === 'white') ? 1 : -1;
    const isFrontal = (dr === fwd && dc === 0);
    
    // Restricción de Inicio: No puede INICIAR captura diagonal desde banda (excepto fila origen)
    if (!isChain && isDiagonal && !isOriginRow) {
        return true;
    }
    
    // Carril de Avance: En banda solo puede capturar frontal (no diagonal ni lateral)
    // Excepto en fila de origen donde tiene todos sus rumbos
    if (isInBand && !isOriginRow) {
        if (!isFrontal) {
            return true; // Bloquea diagonales y laterales
        }
    }
    
    return false;
}

/**
 * FRENADO DE BANDA (INERCIA) - Soberana y Man
 * "En una captura múltiple, si un Man aterriza en un lateral tras un salto diagonal,
 *  su siguiente salto en ese mismo combo debe ser estrictamente frontal"
 * Aplica también a Soberana
 */
function applyBandFrenado(dr, dc) {
    // Si en el movimiento anterior aterrizó en banda tras diagonal
    // este movimiento DEBE ser frontal
    if (landedInBandDiagonal) {
        const isFrontal = (dc === 0); // Frontal es cuando no hay movimiento horizontal
        if (!isFrontal) {
            return true; // Bloqueado, debe ser frontal
        }
    }
    return false;
}

function executeAction(action) {
    const piece = board[selected.r][selected.c];
    const cName = (piece.color === 'white') ? "BLANCAS" : "NEGRAS";

    if (action.type === 'capture') {
        updateLog(`CAPTURA: ${cName} elimina unidad en ${action.victim.r}:${action.victim.c}`);
        capturedThisTurn.push({ r: action.victim.r, c: action.victim.c });
        
        // FRENADO DE BANDA: Verificar si aterrizó en banda (lateral) tras diagonal
        const landedInBand = (action.c === 0 || action.c === 7);
        const wasDiagonal = (action.victim.c !== selected.c); // Si cambió columna = diagonal
        landedInBandDiagonal = (landedInBand && wasDiagonal);
        
        if (landedInBandDiagonal) {
            updateLog(`FRENADO: Aterrizó en banda tras diagonal. Siguiente debe ser frontal.`);
        }
    } else {
        const from = String.fromCharCode(65 + selected.c) + (selected.r + 1);
        const to = String.fromCharCode(65 + action.c) + (action.r + 1);
        updateLog(`MOVIMIENTO: ${cName} de ${from} a ${to}`);
        landedInBandDiagonal = false;
    }

    board[action.r][action.c] = piece;
    board[selected.r][selected.c] = null;

    // Comprobar Ascenso a Soberana
    const promoted = checkPromotion(piece, action.r);
    if (promoted) {
        updateLog(`EVENTO: ${cName} asciende a SOBERANA.`);
        // "Si un Man llega a la fila de coronación durante una serie de saltos,
        //  el movimiento se detiene, se corona y el turno finaliza"
        if (action.type === 'capture') {
            finalizeTurn();
            return;
        }
    }

    // Cadena de captura múltiple
    if (action.type === 'capture') {
        const nextMoves = getValidMoves(action.r, action.c, true);
        if (nextMoves.length > 0) {
            updateLog(`CADENA: ${cName} tiene ataques adicionales disponibles.`);
            selected = { r: action.r, c: action.c };
            isChain = true;
            renderTheater();
            drawDots(action.r, action.c);
            return;
        }
    }

    finalizeTurn();
}

function checkPromotion(piece, row) {
    if (piece.color === 'white' && row === 7 && !piece.isSoberana) {
        piece.isSoberana = true;
        return true;
    }
    if (piece.color === 'black' && row === 0 && !piece.isSoberana) {
        piece.isSoberana = true;
        return true;
    }
    return false;
}

function finalizeTurn() {
    // EXTRACCIÓN DIFERIDA: "Las piezas capturadas se retiran al finalizar el turno completo"
    for (let cap of capturedThisTurn) {
        const victim = board[cap.r][cap.c];
        if (victim) {
            updateGraveyard(victim.color);
            board[cap.r][cap.c] = null;
        }
    }
    capturedThisTurn = [];
    landedInBandDiagonal = false; // Resetear al finalizar turno

    turn = (turn === 'white') ? 'black' : 'white';
    updateLog(`TURNO: ${turn === 'white' ? "BLANCAS" : "NEGRAS"}`);
    selected = null;
    isChain = false;
    renderTheater();
    
    // Verificar victoria
    if (checkVictory()) return;
    
    if (turn === pangiColor) setTimeout(pangiAI, 1000);
}

function checkVictory() {
    let whitePieces = 0, blackPieces = 0;
    let whiteCanMove = false, blackCanMove = false;
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c]) {
                if (board[r][c].color === 'white') {
                    whitePieces++;
                    if (!whiteCanMove && getValidMoves(r, c).length > 0) whiteCanMove = true;
                } else {
                    blackPieces++;
                    if (!blackCanMove && getValidMoves(r, c).length > 0) blackCanMove = true;
                }
            }
        }
    }
    
    if (blackPieces === 0 || !blackCanMove) {
        showEndGame("VICTORIA BLANCAS", blackPieces === 0 ? "Aniquilación total" : "Bloqueo estratégico");
        return true;
    }
    if (whitePieces === 0 || !whiteCanMove) {
        showEndGame("VICTORIA NEGRAS", whitePieces === 0 ? "Aniquilación total" : "Bloqueo estratégico");
        return true;
    }
    
    return false;
}

function showEndGame(message, reason) {
    const overlay = document.getElementById('end-overlay');
    const msgEl = document.getElementById('end-message');
    const reasonEl = document.getElementById('end-reason');
    
    if (overlay && msgEl && reasonEl) {
        msgEl.textContent = message;
        reasonEl.textContent = reason;
        overlay.style.display = 'flex';
    }
}

function updateLog(msg) {
    const log = document.getElementById('current-move-text');
    if (log) log.innerText = msg;
    console.log("[SISTEMA FRONTERA] " + msg);
}

function renderTheater() {
    const boardDiv = document.getElementById('board');
    boardDiv.innerHTML = '';
    const rowsMap = (playerColor === 'white') ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
    
    for (let i = 0; i < 8; i++) {
        const r = rowsMap[i];
        for (let c = 0; c < 8; c++) {
            const sq = document.createElement('div');
            sq.className = 'square';
            const p = board[r][c];
            
            if (p !== null) {
                const pDiv = document.createElement('div');
                pDiv.className = 'piece ' + p.color + (p.isSoberana ? ' soberana' : '');
                
                if (turn === playerColor && p.color === playerColor) {
                    pDiv.onclick = (e) => {
                        e.stopPropagation();
                        if (isChain) {
                            if (selected && selected.r === r && selected.c === c) {
                                finalizeTurn();
                                updateLog("SISTEMA: Cadena finalizada voluntariamente.");
                            }
                        } else {
                            selected = { r, c };
                            renderTheater();
                            drawDots(r, c);
                        }
                    };
                }
                sq.appendChild(pDiv);
            }
            boardDiv.appendChild(sq);
        }
    }
}

function drawDots(r, c) {
    const moves = getValidMoves(r, c, isChain);
    const squares = document.getElementById('board').children;
    const rowsMap = (playerColor === 'white') ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
    
    for (let m of moves) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        
        if (m.type === 'capture') {
            dot.style.backgroundColor = 'red';
            dot.style.boxShadow = '0 0 10px red';
            dot.style.border = '2px solid white';
        }
        
        dot.onclick = (e) => { e.stopPropagation(); executeAction(m); };
        
        let visualRow = rowsMap.indexOf(m.r);
        const index = (visualRow * 8) + m.c;
        if (squares[index]) squares[index].appendChild(dot);
    }
}

function updateGraveyard(color) {
    const trayId = (color === 'white') ? 'graveyard-black' : 'graveyard-white';
    const tray = document.getElementById(trayId);
    if (tray) {
        const p = document.createElement('div');
        p.className = 'captured ' + color;
        tray.appendChild(p);
    }
}

function pangiAI() {
    // Verificar que es el turno de Pangi
    if (turn !== pangiColor) return;
    
    // IA básica: Prioriza capturas pero no está obligado
    let allMoves = [];
    let captures = [];
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] && board[r][c].color === pangiColor) {
                const moves = getValidMoves(r, c);
                for (let m of moves) {
                    const entry = { origin: {r, c}, move: m };
                    allMoves.push(entry);
                    if (m.type === 'capture') captures.push(entry);
                }
            }
        }
    }
    
    if (allMoves.length === 0) {
        updateLog("SISTEMA: Pangi no tiene movimientos válidos.");
        return;
    }
    
    // Priorizar capturas si existen (pero no es obligatorio)
    const pool = captures.length > 0 ? captures : allMoves;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    
    selected = choice.origin;
    executeAction(choice.move);
}
