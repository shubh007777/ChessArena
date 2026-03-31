class ChessGame {
    constructor() {
        this.board = [];
        this.selectedSquare = null;
        this.legalMoves = [];
        this.turn = 'white';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.kingPositions = { white: 60, black: 4 };
        this.isCheck = false;
        this.isGameOver = false;
        this.flipped = false;
        this.lastMove = null;
        this.soundEnabled = true;
        this.gameMode = 'standard';
        
        // Mode-specific variables
        this.checkCount = { white: 0, black: 0 };
        this.pockets = { white: {}, black: {} }; // For crazyhouse
        this.exploding = false; // For atomic
        this.isAIEnabled = false;
        this.playerColor = 'white';
        this.aiThinking = false;
        
        // Piece Unicode characters
        this.pieces = {
            'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
            'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
        };
        
        // Initialize
        this.initBoard();
        this.setupEventListeners();
        this.startTimers();
    }
    
    initBoard() {
        let setup;
        
        this.isAIEnabled = this.gameMode === 'ai';
        
        switch(this.gameMode) {
            case 'chess960':
                setup = this.generateChess960();
                break;
            case 'horde':
                setup = this.generateHorde();
                break;
            case 'racing':
                setup = this.generateRacingKings();
                break;
            default:
                // Standard setup (includes AI mode which uses standard board)
                setup = [
                    'r', 'n', 'b', 'q', 'k', 'b', 'n', 'r',
                    'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p',
                    null, null, null, null, null, null, null, null,
                    null, null, null, null, null, null, null, null,
                    null, null, null, null, null, null, null, null,
                    null, null, null, null, null, null, null, null,
                    'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P',
                    'R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'
                ];
        }
        
        this.board = setup;
        this.updateModeUI();
        this.render();
    }

    generateChess960() {
        // Generate random valid Chess960 position
        const backRank = new Array(8).fill(null);
        const pieces = ['R', 'R', 'N', 'N', 'B', 'B', 'Q', 'K'];
        
        // Place bishops on opposite colors
        const bishop1 = Math.floor(Math.random() * 4) * 2; // 0, 2, 4, 6
        const bishop2 = Math.floor(Math.random() * 4) * 2 + 1; // 1, 3, 5, 7
        backRank[bishop1] = 'b';
        backRank[bishop2] = 'b';
        
        // Fill remaining with other pieces
        const remaining = ['r', 'r', 'n', 'n', 'q', 'k'];
        for (let i = 0; i < 8; i++) {
            if (backRank[i] === null) {
                const idx = Math.floor(Math.random() * remaining.length);
                backRank[i] = remaining.splice(idx, 1)[0];
            }
        }
        
        // Ensure king is between rooks (Fisher Random rules)
        // If not, swap with a rook
        const kingIdx = backRank.indexOf('k');
        const rookIndices = backRank.map((p, i) => p === 'r' ? i : -1).filter(i => i !== -1);
        
        if (kingIdx < Math.min(...rookIndices) || kingIdx > Math.max(...rookIndices)) {
            // Swap king with middle piece between rooks
            const middle = Math.floor((rookIndices[0] + rookIndices[1]) / 2);
            backRank[kingIdx] = backRank[middle];
            backRank[middle] = 'k';
        }
        
        // Create full board
        const setup = [...backRank.map(p => p ? p.toLowerCase() : null)];
        setup.push(...Array(8).fill('p'));
        setup.push(...Array(32).fill(null));
        setup.push(...Array(8).fill('P'));
        setup.push(...backRank.map(p => p ? p.toUpperCase() : null));
        
        return setup;
    }

    generateHorde() {
        // White has standard pieces, Black has 36 pawns
        const setup = new Array(64).fill(null);
        
        // Black pawns (36 of them) - rows 0-4 completely filled
        for (let i = 0; i < 40; i++) {
            if (i < 36) setup[i] = 'p';
        }
        
        // Standard white pieces
        const whiteBackRank = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
        for (let i = 0; i < 8; i++) {
            setup[56 + i] = whiteBackRank[i];
            setup[48 + i] = 'P';
        }
        
        return setup;
    }

    generateRacingKings() {
        // Both kings on opposite sides, no pawns, no checks allowed
        const setup = new Array(64).fill(null);
        
        // White pieces (rank 8)
        setup[60] = 'K'; // King in center
        setup[58] = 'R';
        setup[61] = 'R';
        setup[59] = 'B';
        setup[62] = 'N';
        
        // Black pieces (rank 1) - mirrored
        setup[4] = 'k';
        setup[2] = 'r';
        setup[5] = 'r';
        setup[3] = 'b';
        setup[6] = 'n';
        
        return setup;
    }
    
    render() {
        const boardEl = document.getElementById('chess-board');
        boardEl.innerHTML = '';
        
        for (let i = 0; i < 64; i++) {
            const square = document.createElement('div');
            const row = Math.floor(i / 8);
            const col = i % 8;
            
            // Determine color
            const isLight = (row + col) % 2 === 0;
            square.className = `square ${isLight ? 'light' : 'dark'}`;
            square.dataset.index = i;
            
            // Add coordinates on border squares
            if (col === 0) {
                const rank = document.createElement('span');
                rank.className = 'coordinate coord-rank';
                rank.textContent = this.flipped ? row + 1 : 8 - row;
                square.appendChild(rank);
            }
            if (row === 7) {
                const file = document.createElement('span');
                file.className = 'coordinate coord-file';
                file.textContent = String.fromCharCode(97 + col);
                square.appendChild(file);
            }
            
            // Highlight last move
            if (this.lastMove && (this.lastMove.from === i || this.lastMove.to === i)) {
                square.classList.add('last-move');
            }
            
            // Highlight selected
            if (this.selectedSquare === i) {
                square.classList.add('selected');
            }
            
            // Highlight legal moves
            if (this.legalMoves.includes(i)) {
                square.classList.add('legal-move');
                if (this.board[i]) {
                    square.classList.add('capture');
                }
            }
            
            // Highlight check
            if (this.isCheck && this.kingPositions[this.turn] === i) {
                square.classList.add('check');
            }
            
            // Add piece
            if (this.board[i]) {
                const piece = document.createElement('span');
                piece.className = `piece ${this.board[i] === this.board[i].toUpperCase() ? 'white' : 'black'}`;
                piece.textContent = this.pieces[this.board[i]];
                piece.draggable = true;
                piece.dataset.index = i;
                
                // Drag events
                piece.addEventListener('dragstart', (e) => this.handleDragStart(e, i));
                piece.addEventListener('dragend', (e) => this.handleDragEnd(e));
                
                square.appendChild(piece);
            }
            
            // Click event
            square.addEventListener('click', () => this.handleSquareClick(i));
            square.addEventListener('dragover', (e) => this.handleDragOver(e));
            square.addEventListener('drop', (e) => this.handleDrop(e, i));
            
            boardEl.appendChild(square);
        }
    }
    
    handleSquareClick(index) {
        if (this.isGameOver) return;
        
        // Handle pocket drops
        if (this.selectedSquare === 'pocket' && this.legalMoves.includes(index)) {
            this.executeMove('pocket', index);
            this.selectedPocketPiece = null;
            return;
        }
        
        const piece = this.board[index];
        
        // If square has piece of current turn, select it
        if (piece && this.isPieceColor(piece, this.turn)) {
            this.selectedSquare = index;
            this.legalMoves = this.getLegalMoves(index);
            this.playSound('select');
            this.render();
            return;
        }
        
        // If move is legal, execute it
        if (this.selectedSquare !== null && this.legalMoves.includes(index)) {
            this.executeMove(this.selectedSquare, index);
            return;
        }
        
        // Deselect
        this.selectedSquare = null;
        this.legalMoves = [];
        this.selectedPocketPiece = null;
        this.render();
    }
    
    handleDragStart(e, index) {
        if (this.isGameOver) {
            e.preventDefault();
            return;
        }
        
        const piece = this.board[index];
        if (!piece || !this.isPieceColor(piece, this.turn)) {
            e.preventDefault();
            return;
        }
        
        this.selectedSquare = index;
        this.legalMoves = this.getLegalMoves(index);
        e.target.classList.add('dragging');
        this.render();
    }
    
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }
    
    handleDragOver(e) {
        e.preventDefault();
    }
    
    handleDrop(e, index) {
        e.preventDefault();
        if (this.selectedSquare !== null && this.legalMoves.includes(index)) {
            this.executeMove(this.selectedSquare, index);
        }
    }
    
    getLegalMoves(index) {
        const piece = this.board[index];
        if (!piece) return [];
        
        const color = piece === piece.toUpperCase() ? 'white' : 'black';
        
        // In racing kings, black can't move (only white plays to rank 1)
        if (this.gameMode === 'racing' && color === 'black') return [];
        
        let moves = this.getRawMoves(index, piece, color);
        
        // Mode-specific move filtering
        if (this.gameMode === 'atomic') {
            // In atomic chess, kings can't capture
            moves = moves.filter(move => {
                if (piece.toLowerCase() === 'k') {
                    return !this.board[move]; // King can't capture
                }
                return true;
            });
        }
        
        // Filter moves that would leave king in check (except racing kings)
        if (this.gameMode !== 'racing') {
            moves = moves.filter(move => {
                const testBoard = [...this.board];
                
                // Handle atomic explosion in testing
                if (this.gameMode === 'atomic' && testBoard[move]) {
                    // Simulate explosion - remove adjacent pieces except kings
                    this.simulateAtomicExplosion(move, testBoard);
                } else {
                    testBoard[move] = testBoard[index];
                }
                
                testBoard[index] = null;
                
                const kingPos = piece.toLowerCase() === 'k' ? move : this.kingPositions[color];
                return !this.isSquareAttacked(kingPos, color === 'white' ? 'black' : 'white', testBoard);
            });
        }
        
        return moves;
    }

    simulateAtomicExplosion(square, board) {
        // Remove piece and all adjacent non-king pieces
        const row = Math.floor(square / 8);
        const col = square % 8;
        
        // Remove captured piece
        board[square] = null;
        
        // Remove adjacent pieces
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    const idx = newRow * 8 + newCol;
                    const piece = board[idx];
                    if (piece && piece.toLowerCase() !== 'k') {
                        board[idx] = null;
                    }
                }
            }
        }
    }
    
    getRawMoves(index, piece, color) {
        const moves = [];
        const row = Math.floor(index / 8);
        const col = index % 8;
        
        const directions = {
            'r': [[0,1], [0,-1], [1,0], [-1,0]],
            'b': [[1,1], [1,-1], [-1,1], [-1,-1]],
            'q': [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]],
            'n': [[2,1], [2,-1], [-2,1], [-2,-1], [1,2], [1,-2], [-1,2], [-1,-2]],
            'k': [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]]
        };
        
        const p = piece.toLowerCase();
        
        if (p === 'p') {
            const direction = color === 'white' ? -1 : 1;
            const startRow = color === 'white' ? 6 : 1;
            
            // Forward
            const next = index + (direction * 8);
            if (this.isValidSquare(next) && !this.board[next]) {
                moves.push(next);
                // Double move from start
                if (Math.floor(index / 8) === startRow) {
                    const double = index + (direction * 16);
                    if (!this.board[double]) moves.push(double);
                }
            }
            
            // Captures
            [-1, 1].forEach(dcol => {
                const capture = index + (direction * 8) + dcol;
                if (this.isValidSquare(capture) && Math.abs((capture % 8) - col) === 1) {
                    if (this.board[capture] && !this.isPieceColor(this.board[capture], color)) {
                        moves.push(capture);
                    }
                    // En passant (simplified - would check last move)
                }
            });
        }
        else if (['r', 'b', 'q'].includes(p)) {
            directions[p].forEach(([dr, dc]) => {
                for (let i = 1; i < 8; i++) {
                    const newRow = row + dr * i;
                    const newCol = col + dc * i;
                    if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) break;
                    
                    const target = newRow * 8 + newCol;
                    if (!this.board[target]) {
                        moves.push(target);
                    } else {
                        if (!this.isPieceColor(this.board[target], color)) {
                            moves.push(target);
                        }
                        break;
                    }
                }
            });
        }
        else if (p === 'n') {
            directions['n'].forEach(([dr, dc]) => {
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    const target = newRow * 8 + newCol;
                    if (!this.board[target] || !this.isPieceColor(this.board[target], color)) {
                        moves.push(target);
                    }
                }
            });
        }
        else if (p === 'k') {
            directions['k'].forEach(([dr, dc]) => {
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    const target = newRow * 8 + newCol;
                    if (!this.board[target] || !this.isPieceColor(this.board[target], color)) {
                        moves.push(target);
                    }
                }
            });
            
            // Castling (simplified - checks if king and rook haven't moved)
            // Would need move history tracking for full implementation
        }
        
        return moves;
    }
    
    isValidSquare(index) {
        return index >= 0 && index < 64;
    }
    
    isPieceColor(piece, color) {
        return color === 'white' ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
    }
    
    isSquareAttacked(index, byColor, board = this.board) {
        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            if (piece && this.isPieceColor(piece, byColor)) {
                const moves = this.getRawMoves(i, piece, byColor);
                if (moves.includes(index)) return true;
            }
        }
        return false;
    }
    
    executeMove(from, to) {
        const piece = this.board[from];
        const captured = this.board[to];
        const color = this.turn;
        
        // Handle crazyhouse drops
        if (from === 'pocket') {
            this.board[to] = piece;
            this.pockets[color][piece]--;
            this.lastMove = { from: -1, to };
            this.turn = color === 'white' ? 'black' : 'white';
            this.selectedSquare = null;
            this.checkGameState();
            this.updateModeUI();
            this.render();
            return;
        }
        
        // Save move for history
        const moveNotation = this.getMoveNotation(from, to, captured);
        
        // Handle capture (or crazyhouse pocket)
        if (captured) {
            if (this.gameMode === 'crazyhouse') {
                // Add to pocket (as opposite color piece)
                const pocketPiece = color === 'white' ? captured.toUpperCase() : captured.toLowerCase();
                if (pocketPiece.toLowerCase() !== 'k') {
                    this.pockets[color][pocketPiece] = (this.pockets[color][pocketPiece] || 0) + 1;
                }
            } else if (this.gameMode === 'atomic') {
                // Handle atomic explosion
                this.triggerAtomicExplosion(to);
                this.board[from] = null;
                this.playSound('capture');
                this.lastMove = { from, to };
                this.turn = color === 'white' ? 'black' : 'white';
                this.selectedSquare = null;
                this.legalMoves = [];
                this.checkGameState();
                this.updateModeUI();
                this.render();
                return;
            } else {
                const capColor = this.isPieceColor(captured, 'white') ? 'black' : 'white';
                this.capturedPieces[capColor].push(captured);
                this.updateCapturedDisplay();
            }
            this.playSound('capture');
        } else {
            this.playSound('move');
        }
        
        // Update king position if king moved
        if (piece.toLowerCase() === 'k') {
            this.kingPositions[color] = to;
        }
        
        // Execute
        this.board[to] = piece;
        this.board[from] = null;
        
        // Pawn promotion
        if (piece.toLowerCase() === 'p') {
            const promotionRank = color === 'white' ? 0 : 7;
            if (Math.floor(to / 8) === promotionRank) {
                this.board[to] = color === 'white' ? 'Q' : 'q';
            }
        }
        
        // Record move
        this.moveHistory.push({ from, to, piece, captured, notation: moveNotation });
        this.lastMove = { from, to };
        
        // Check for mode-specific win conditions
        this.checkModeWinConditions(color, to);
        
        // Switch turn
        this.turn = color === 'white' ? 'black' : 'white';
        this.selectedSquare = null;
        this.legalMoves = [];
        
        // Trigger AI move if it's AI's turn
        if (this.isAIEnabled && this.turn !== this.playerColor && !this.isGameOver) {
            this.makeAIMove();
        }
        
        // Check game state
        this.checkGameState();
        this.updateModeUI();
        this.render();
    }

    triggerAtomicExplosion(square) {
        const row = Math.floor(square / 8);
        const col = square % 8;
        
        // Create visual explosion
        const boardEl = document.getElementById('chess-board');
        const squareEl = boardEl.children[square];
        const explosion = document.createElement('div');
        explosion.className = 'explosion';
        squareEl.appendChild(explosion);
        setTimeout(() => explosion.remove(), 500);
        
        // Remove piece and adjacent non-king pieces
        this.board[square] = null;
        
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    const idx = newRow * 8 + newCol;
                    const piece = this.board[idx];
                    if (piece && piece.toLowerCase() !== 'k') {
                        // Visual explosion on adjacent squares too
                        const adjSquare = boardEl.children[idx];
                        const adjExplosion = document.createElement('div');
                        adjExplosion.className = 'explosion';
                        adjSquare.appendChild(adjExplosion);
                        setTimeout(() => adjExplosion.remove(), 500);
                        
                        this.board[idx] = null;
                    }
                }
            }
        }
    }
    
    getMoveNotation(from, to, captured) {
        const files = 'abcdefgh';
        const ranks = '87654321';
        
        // Validate inputs to prevent undefined errors
        if (typeof from !== 'number' || typeof to !== 'number' || from < 0 || from > 63 || to < 0 || to > 63) {
            return '??';
        }
        
        const fromFile = files[from % 8];
        const fromRank = ranks[Math.floor(from / 8)];
        const toFile = files[to % 8];
        const toRank = ranks[Math.floor(to / 8)];
        
        let notation = '';
        const piece = this.board[from];
        
        // If no piece found, return basic coordinate notation
        if (!piece) {
            return `${fromFile}${fromRank}-${toFile}${toRank}`;
        }
        
        if (piece.toLowerCase() !== 'p') {
            notation += piece.toUpperCase();
        }
        
        if (captured) {
            if (piece.toLowerCase() === 'p') notation += fromFile;
            notation += 'x';
        }
        
        notation += toFile + toRank;
        return notation;
    }
    
    checkGameState() {
        if (this.gameMode === 'racing') return; // No checks in racing kings
        
        // Check if current player is in check
        const kingPos = this.kingPositions[this.turn];
        const enemyColor = this.turn === 'white' ? 'black' : 'white';
        this.isCheck = this.isSquareAttacked(kingPos, enemyColor);
        
        // Track checks for three-check mode
        if (this.isCheck && this.gameMode === 'threecheck') {
            this.checkCount[this.turn]++;
            if (this.checkCount[this.turn] >= 3) {
                this.isGameOver = true;
                const winner = this.turn === 'white' ? 'Black' : 'White';
                setTimeout(() => this.showGameOver(winner, 'Three Checks!'), 300);
                return;
            }
        }
        
        // Check for checkmate or stalemate
        let hasLegalMoves = false;
        
        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (piece && this.isPieceColor(piece, this.turn)) {
                const moves = this.getLegalMoves(i);
                if (moves.length > 0) {
                    hasLegalMoves = true;
                    break;
                }
            }
        }
        
        if (!hasLegalMoves) {
            this.isGameOver = true;
            const winner = this.isCheck ? (this.turn === 'white' ? 'Black' : 'White') : null;
            const reason = this.isCheck ? 'Checkmate' : 'Stalemate';
            
            setTimeout(() => this.showGameOver(winner, reason), 300);
        }
    }

    checkModeWinConditions(color, toSquare) {
        // King of the Hill: King reaches center
        if (this.gameMode === 'koth') {
            const piece = this.board[toSquare];
            if (piece && piece.toLowerCase() === 'k') {
                const centerSquares = [27, 28, 35, 36]; // d4, e4, d5, e5
                if (centerSquares.includes(toSquare)) {
                    this.isGameOver = true;
                    const winner = color === 'white' ? 'White' : 'Black';
                    setTimeout(() => this.showGameOver(winner, 'King reached the Hill!'), 300);
                }
            }
        }
        
        // Racing Kings: King reaches 8th rank (for white) or 1st rank (for black)
        if (this.gameMode === 'racing') {
            const piece = this.board[toSquare];
            if (piece && piece.toLowerCase() === 'k') {
                const row = Math.floor(toSquare / 8);
                if (color === 'white' && row === 0) {
                    this.isGameOver = true;
                    setTimeout(() => this.showGameOver('White', 'King reached goal!'), 300);
                } else if (color === 'black' && row === 7) {
                    this.isGameOver = true;
                    setTimeout(() => this.showGameOver('Black', 'King reached goal!'), 300);
                }
            }
        }
        
        // Horde: White wins if all black pawns captured, Black wins if white has no pieces
        if (this.gameMode === 'horde') {
            const whitePieces = this.board.filter(p => p && p === p.toUpperCase()).length;
            const blackPawns = this.board.filter(p => p === 'p').length;
            
            if (blackPawns === 0) {
                this.isGameOver = true;
                setTimeout(() => this.showGameOver('White', 'All pawns captured!'), 300);
            } else if (whitePieces === 0) {
                this.isGameOver = true;
                setTimeout(() => this.showGameOver('Black', 'White annihilated!'), 300);
            }
        }
        
        // Atomic: Win if king is destroyed by explosion (handled in explosion logic)
        if (this.gameMode === 'atomic') {
            // Check if kings are adjacent to any explosion (simplified check)
            const whiteKing = this.kingPositions.white;
            const blackKing = this.kingPositions.black;
            
            // Check if kings are still on board (would be removed by explosion)
            if (!this.board[whiteKing]) {
                this.isGameOver = true;
                setTimeout(() => this.showGameOver('Black', 'Atomic destruction!'), 300);
            } else if (!this.board[blackKing]) {
                this.isGameOver = true;
                setTimeout(() => this.showGameOver('White', 'Atomic destruction!'), 300);
            }
        }
    }
    
    showGameOver(winner, reason) {
        const modal = document.getElementById('game-over-modal');
        const winnerText = document.getElementById('winner-text');
        const winReason = document.getElementById('win-reason');
        const winnerIcon = document.getElementById('winner-icon');
        
        if (winner) {
            winnerText.textContent = `${winner} Wins!`;
            winnerIcon.textContent = winner === 'White' ? '♔' : '♚';
            this.playSound('checkmate');
        } else {
            winnerText.textContent = 'Draw!';
            winReason.textContent = reason;
            winnerIcon.textContent = '🤝';
        }
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    
    newGame() {
        this.board = [];
        this.selectedSquare = null;
        this.legalMoves = [];
        this.turn = 'white';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.kingPositions = { white: 60, black: 4 };
        this.isCheck = false;
        this.isGameOver = false;
        this.lastMove = null;
        this.checkCount = { white: 0, black: 0 };
        this.pockets = { white: {}, black: {} };
        this.exploding = false;
        this.aiThinking = false;
        
        document.getElementById('game-over-modal').classList.add('hidden');
        document.getElementById('game-over-modal').classList.remove('flex');
        document.getElementById('move-history').innerHTML = '';
        document.body.className = document.body.className.replace(/mode-\w+/g, '');
        
        this.updateCapturedDisplay();
        this.initBoard();
        this.updateUI();
        this.updateModeUI();
        
        // If AI mode and AI plays first (black), make AI move
        if (this.isAIEnabled && this.turn !== this.playerColor) {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    updateModeUI() {
        const modeInfo = document.getElementById('mode-info');
        const modeTitle = document.getElementById('mode-title');
        const modeStats = document.getElementById('mode-stats');
        const board = document.getElementById('chess-board');
        
        if (this.gameMode === 'standard') {
            modeInfo.classList.add('hidden');
            document.body.classList.remove('mode-racing');
            return;
        }
        
        modeInfo.classList.remove('hidden');
        
        switch(this.gameMode) {
            case 'chess960':
                modeTitle.textContent = 'Chess960';
                modeStats.innerHTML = '<p class="text-gray-400">Random back rank. King must be between rooks.</p>';
                break;
                
            case 'koth':
                modeTitle.textContent = 'King of the Hill';
                modeStats.innerHTML = '<p class="text-gray-400">Get your King to the center (d4, d5, e4, e5) to win!</p>';
                // Highlight center squares
                document.querySelectorAll('.square').forEach((sq, i) => {
                    if ([27, 28, 35, 36].includes(i)) {
                        sq.classList.add('center-target');
                    }
                });
                break;
                
            case 'threecheck':
                modeTitle.textContent = 'Three-check';
                modeStats.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <span>White checks:</span>
                        <div class="check-counter">${this.renderCheckDots('white')}</div>
                    </div>
                    <div class="flex justify-between items-center">
                        <span>Black checks:</span>
                        <div class="check-counter">${this.renderCheckDots('black')}</div>
                    </div>
                    <p class="text-gray-400 mt-2">Give check 3 times to win!</p>
                `;
                break;
                
            case 'horde':
                modeTitle.textContent = 'Horde';
                const whiteCount = this.board.filter(p => p && p === p.toUpperCase()).length;
                const blackPawns = this.board.filter(p => p === 'p').length;
                modeStats.innerHTML = `
                    <div class="horde-stats">White pieces: ${whiteCount}</div>
                    <div class="horde-stats">Black pawns remaining: ${blackPawns}/36</div>
                    <p class="text-gray-400 mt-2">White must survive against 36 pawns!</p>
                `;
                break;
                
            case 'atomic':
                modeTitle.textContent = 'Atomic Chess';
                modeStats.innerHTML = '<p class="text-gray-400">Captures cause explosions! Kings can\'t capture. Win by exploding enemy king.</p>';
                break;
                
            case 'racing':
                modeTitle.textContent = 'Racing Kings';
                modeStats.innerHTML = '<p class="text-gray-400">First king to reach the finish line wins! No checks allowed.</p>';
                document.body.classList.add('mode-racing');
                // Add finish line indicators
                for (let i = 0; i < 8; i++) {
                    const sq = document.querySelector(`[data-index="${i}"]`);
                    if (sq) sq.classList.add('finish-line');
                }
                break;
                
            case 'crazyhouse':
                modeTitle.textContent = 'Crazyhouse';
                modeStats.innerHTML = this.renderPockets();
                break;
                
            case 'ai':
                modeTitle.textContent = '🤖 AI Opponent';
                modeStats.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-gray-400">You play:</span>
                        <span class="font-bold ${this.playerColor === 'white' ? 'text-white' : 'text-gray-400'}">White</span>
                    </div>
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-gray-400">AI plays:</span>
                        <span class="font-bold ${this.playerColor === 'black' ? 'text-white' : 'text-gray-400'}">Black</span>
                    </div>
                    <p class="text-gray-400 text-xs mt-2">AI uses strategic evaluation with 3-ply lookahead.</p>
                `;
                break;
        }
    }

    renderCheckDots(color) {
        const count = this.checkCount[color];
        return Array(3).fill(0).map((_, i) => 
            `<div class="check-dot ${i < count ? 'active' : ''}"></div>`
        ).join('');
    }

    renderPockets() {
        const renderPocket = (color) => {
            const pocket = this.pockets[color];
            if (!pocket || Object.keys(pocket).length === 0) return '<span class="text-gray-600">Empty</span>';
            
            return Object.entries(pocket).map(([piece, count]) => {
                if (count === 0) return '';
                const pieceChar = this.pieces[piece];
                return `<span class="pocket-piece ${count > 0 ? 'cursor-pointer hover:scale-110' : 'opacity-50'}" 
                        onclick="game.selectPocketPiece('${piece}', '${color}')"
                        style="${this.turn === color ? '' : 'pointer-events: none; opacity: 0.5'}">
                    ${pieceChar}${count > 1 ? `<span class="pocket-count">${count}</span>` : ''}
                </span>`;
            }).join('');
        };

        return `
            <div class="mb-2">
                <div class="text-xs text-gray-500 mb-1">White Pocket:</div>
                <div class="pocket bg-gray-900/50">${renderPocket('white')}</div>
            </div>
            <div>
                <div class="text-xs text-gray-500 mb-1">Black Pocket:</div>
                <div class="pocket bg-gray-900/50">${renderPocket('black')}</div>
            </div>
            <p class="text-gray-400 mt-2 text-xs">Click pocket piece, then click square to drop. No pawns on 1st/8th rank.</p>
        `;
    }

    selectPocketPiece(piece, color) {
        if (this.turn !== color || this.isGameOver) return;
        
        // Find valid drop squares
        this.selectedSquare = 'pocket';
        this.selectedPocketPiece = piece;
        
        // Get all empty squares (except 1st and 8th rank for pawns)
        this.legalMoves = this.board.map((p, i) => {
            if (p !== null) return -1;
            const row = Math.floor(i / 8);
            if (piece.toLowerCase() === 'p' && (row === 0 || row === 7)) return -1;
            return i;
        }).filter(i => i !== -1);
        
        this.render();
    }
    
    undoMove() {
        if (this.moveHistory.length === 0 || this.isGameOver) return;
        
        const lastMove = this.moveHistory.pop();
        this.board[lastMove.from] = lastMove.piece;
        this.board[lastMove.to] = lastMove.captured;
        
        if (lastMove.captured) {
            const color = this.isPieceColor(lastMove.captured, 'white') ? 'black' : 'white';
            this.capturedPieces[color].pop();
            this.updateCapturedDisplay();
        }
        
        if (lastMove.piece.toLowerCase() === 'k') {
            this.kingPositions[this.turn === 'white' ? 'black' : 'white'] = lastMove.from;
        }
        
        this.turn = this.turn === 'white' ? 'black' : 'white';
        this.isGameOver = false;
        this.lastMove = this.moveHistory.length > 0 ? {
            from: this.moveHistory[this.moveHistory.length - 1].from,
            to: this.moveHistory[this.moveHistory.length - 1].to
        } : null;
        
        this.checkGameState();
        this.updateUI();
        this.render();
    }
    
    flipBoard() {
        this.flipped = !this.flipped;
        // Re-render with flipped orientation
        const boardEl = document.getElementById('chess-board');
        if (this.flipped) {
            boardEl.style.transform = 'rotate(180deg)';
            document.querySelectorAll('.piece').forEach(p => {
                p.style.transform = 'rotate(180deg)';
            });
        } else {
            boardEl.style.transform = 'rotate(0deg)';
            document.querySelectorAll('.piece').forEach(p => {
                p.style.transform = 'rotate(0deg)';
            });
        }
        this.render();
    }
    
    updateUI() {
        const turnIndicator = document.getElementById('turn-indicator');
        if (this.isCheck) {
            turnIndicator.textContent = `${this.turn === 'white' ? 'White' : 'Black'} in Check!`;
            turnIndicator.className = 'text-xs px-2 py-1 rounded-full bg-red-900 text-red-300 font-medium animate-pulse';
            this.playSound('check');
        } else {
            turnIndicator.textContent = `${this.turn === 'white' ? 'White' : 'Black'}'s Turn`;
            turnIndicator.className = `text-xs px-2 py-1 rounded-full ${this.turn === 'white' ? 'bg-gray-200 text-gray-800' : 'bg-gray-700 text-gray-300'} font-medium`;
        }
        
        // Update move history
        const historyEl = document.getElementById('move-history');
        if (!historyEl) return;
        
        historyEl.innerHTML = '';
        for (let i = 0; i < this.moveHistory.length; i += 2) {
            const moveNum = Math.floor(i / 2) + 1;
            const whiteMove = this.moveHistory[i]?.notation ?? '';
            const blackMove = this.moveHistory[i + 1]?.notation ?? '';
            
            const row = document.createElement('div');
            row.className = 'move-row flex gap-3 text-gray-300';
            row.innerHTML = `
                <span class="w-8 text-gray-500">${moveNum}.</span>
                <span class="w-16 font-medium text-white">${whiteMove || ''}</span>
                <span class="w-16 font-medium text-gray-400">${blackMove || ''}</span>
            `;
            historyEl.appendChild(row);
        }
        
        // Auto scroll to bottom
        historyEl.scrollTop = historyEl.scrollHeight;
    }
    
    updateCapturedDisplay() {
        const whiteContainer = document.getElementById('captured-white');
        const blackContainer = document.getElementById('captured-black');
        
        whiteContainer.innerHTML = this.capturedPieces.white.map(p => 
            `<span class="captured-piece">${this.pieces[p]}</span>`
        ).join('');
        
        blackContainer.innerHTML = this.capturedPieces.black.map(p => 
            `<span class="captured-piece">${this.pieces[p]}</span>`
        ).join('');
    }
    
    playSound(type) {
        if (!this.soundEnabled) return;
        
        // Simple beep sounds using Web Audio API
        const audio = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audio.createOscillator();
        const gainNode = audio.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audio.destination);
        
        switch(type) {
            case 'move':
                oscillator.frequency.value = 400;
                gainNode.gain.value = 0.1;
                oscillator.start();
                oscillator.stop(audio.currentTime + 0.1);
                break;
            case 'capture':
                oscillator.frequency.value = 300;
                gainNode.gain.value = 0.2;
                oscillator.start();
                oscillator.stop(audio.currentTime + 0.15);
                break;
            case 'check':
                oscillator.frequency.value = 600;
                gainNode.gain.value = 0.15;
                oscillator.start();
                oscillator.stop(audio.currentTime + 0.2);
                break;
            case 'select':
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.05;
                oscillator.start();
                oscillator.stop(audio.currentTime + 0.05);
                break;
        }
    }
    
    setupEventListeners() {
        // Settings
        document.getElementById('show-hints').addEventListener('change', (e) => {
            document.body.classList.toggle('hide-hints', !e.target.checked);
        });
        
        document.getElementById('sound-toggle').addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
        });
        
        document.getElementById('theme-select').addEventListener('change', (e) => {
            const board = document.getElementById('chess-board');
            board.className = board.className.replace(/theme-\w+/, '');
            if (e.target.value !== 'modern') {
                board.classList.add(`theme-${e.target.value}`);
            }
        });
        
        // Game mode selector
        document.getElementById('game-mode').addEventListener('change', (e) => {
            this.gameMode = e.target.value;
            this.newGame();
        });
    }

    // AI Methods
    makeAIMove() {
        if (this.isGameOver || this.aiThinking) return;
        
        this.aiThinking = true;
        
        // Add thinking indicator
        const turnIndicator = document.getElementById('turn-indicator');
        turnIndicator.textContent = '🤖 AI thinking...';
        turnIndicator.className = 'text-xs px-2 py-1 rounded-full bg-purple-900 text-purple-300 font-medium animate-pulse';
        
        // Use setTimeout to allow UI to update before calculating
        setTimeout(() => {
            const bestMove = this.findBestMove();
            
            if (bestMove) {
                this.executeMove(bestMove.from, bestMove.to);
            }
            
            this.aiThinking = false;
        }, 300);
    }

    findBestMove() {
        const color = this.turn;
        const depth = 3; // Lookahead depth
        let bestMove = null;
        let bestValue = -Infinity;
        
        // Get all possible moves for AI
        const allMoves = this.getAllLegalMoves(color);
        
        // Shuffle moves slightly for variety
        allMoves.sort(() => Math.random() - 0.5);
        
        for (const move of allMoves) {
            // Make temporary move
            const boardCopy = [...this.board];
            const kingPosCopy = { ...this.kingPositions };
            const captured = this.board[move.to];
            
            // Execute move on temp board
            if (this.board[move.from].toLowerCase() === 'k') {
                this.kingPositions[color] = move.to;
            }
            this.board[move.to] = this.board[move.from];
            this.board[move.from] = null;
            
            // Evaluate position
            const value = -this.minimax(depth - 1, -Infinity, Infinity, color === 'white' ? 'black' : 'white');
            
            // Restore board
            this.board = boardCopy;
            this.kingPositions = kingPosCopy;
            
            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    minimax(depth, alpha, beta, color) {
        if (depth === 0 || this.isGameOver) {
            return this.evaluatePosition(color);
        }
        
        const allMoves = this.getAllLegalMoves(color);
        
        if (allMoves.length === 0) {
            // Checkmate or stalemate
            const kingPos = this.kingPositions[color];
            const enemyColor = color === 'white' ? 'black' : 'white';
            if (this.isSquareAttacked(kingPos, enemyColor)) {
                return -100000 + (10 - depth); // Checkmate (prefer sooner)
            }
            return 0; // Stalemate
        }
        
        for (const move of allMoves) {
            const boardCopy = [...this.board];
            const kingPosCopy = { ...this.kingPositions };
            
            if (this.board[move.from].toLowerCase() === 'k') {
                this.kingPositions[color] = move.to;
            }
            this.board[move.to] = this.board[move.from];
            this.board[move.from] = null;
            
            const value = -this.minimax(depth - 1, -beta, -alpha, color === 'white' ? 'black' : 'white');
            
            this.board = boardCopy;
            this.kingPositions = kingPosCopy;
            
            if (value >= beta) return beta;
            if (value > alpha) alpha = value;
        }
        
        return alpha;
    }

    getAllLegalMoves(color) {
        const moves = [];
        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (piece && this.isPieceColor(piece, color)) {
                const legalMoves = this.getLegalMoves(i);
                for (const to of legalMoves) {
                    moves.push({ from: i, to, piece });
                }
            }
        }
        return moves;
    }

    evaluatePosition(color) {
        const pieceValues = {
            'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000
        };
        
        let value = 0;
        
        // Material evaluation
        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (piece) {
                const pieceColor = this.isPieceColor(piece, 'white') ? 'white' : 'black';
                const pieceType = piece.toLowerCase();
                const pieceValue = pieceValues[pieceType];
                
                if (pieceColor === color) {
                    value += pieceValue;
                    // Position bonuses
                    value += this.getPositionBonus(pieceType, i, pieceColor);
                } else {
                    value -= pieceValue;
                    value -= this.getPositionBonus(pieceType, i, pieceColor);
                }
            }
        }
        
        // Mobility bonus (number of legal moves)
        const myMoves = this.getAllLegalMoves(color).length;
        const enemyColor = color === 'white' ? 'black' : 'white';
        const enemyMoves = this.getAllLegalMoves(enemyColor).length;
        value += (myMoves - enemyMoves) * 10;
        
        // Check bonus
        const enemyKingPos = this.kingPositions[enemyColor];
        if (this.isSquareAttacked(enemyKingPos, color)) {
            value += 50;
        }
        
        return value;
    }

    getPositionBonus(pieceType, square, color) {
        // Piece-square tables for better positioning
        const pawnTable = [
            0,  0,  0,  0,  0,  0,  0,  0,
            50, 50, 50, 50, 50, 50, 50, 50,
            10, 10, 20, 30, 30, 20, 10, 10,
            5,  5, 10, 25, 25, 10,  5,  5,
            0,  0,  0, 20, 20,  0,  0,  0,
            5, -5,-10,  0,  0,-10, -5,  5,
            5, 10, 10,-20,-20, 10, 10,  5,
            0,  0,  0,  0,  0,  0,  0,  0
        ];
        
        const knightTable = [
            -50,-40,-30,-30,-30,-30,-40,-50,
            -40,-20,  0,  0,  0,  0,-20,-40,
            -30,  0, 10, 15, 15, 10,  0,-30,
            -30,  5, 15, 20, 20, 15,  5,-30,
            -30,  0, 15, 20, 20, 15,  0,-30,
            -30,  5, 10, 15, 15, 10,  5,-30,
            -40,-20,  0,  5,  5,  0,-20,-40,
            -50,-40,-30,-30,-30,-30,-40,-50
        ];
        
        const bishopTable = [
            -20,-10,-10,-10,-10,-10,-10,-20,
            -10,  0,  0,  0,  0,  0,  0,-10,
            -10,  0,  5, 10, 10,  5,  0,-10,
            -10,  5,  5, 10, 10,  5,  5,-10,
            -10,  0, 10, 10, 10, 10,  0,-10,
            -10, 10, 10, 10, 10, 10, 10,-10,
            -10,  5,  0,  0,  0,  0,  5,-10,
            -20,-10,-10,-10,-10,-10,-10,-20
        ];
        
        const tables = {
            'p': pawnTable,
            'n': knightTable,
            'b': bishopTable
        };
        
        if (!tables[pieceType]) return 0;
        
        // Flip table for black pieces
        if (color === 'black') {
            const row = 7 - Math.floor(square / 8);
            const col = square % 8;
            return tables[pieceType][row * 8 + col];
        }
        
        return tables[pieceType][square];
    }
    
    startTimers() {
        let whiteTime = 600; // 10 minutes
        let blackTime = 600;
        
        setInterval(() => {
            if (this.isGameOver) return;
            
            if (this.turn === 'white') {
                whiteTime--;
                if (whiteTime <= 0) {
                    this.showGameOver('Black', 'Timeout');
                    this.isGameOver = true;
                }
            } else {
                blackTime--;
                if (blackTime <= 0) {
                    this.showGameOver('White', 'Timeout');
                    this.isGameOver = true;
                }
            }
            
            document.getElementById('timer-white').textContent = this.formatTime(whiteTime);
            document.getElementById('timer-black').textContent = this.formatTime(blackTime);
            
            // Add warning color when low on time
            if (whiteTime < 60) document.getElementById('timer-white').classList.add('timer-warning');
            if (blackTime < 60) document.getElementById('timer-black').classList.add('timer-warning');
        }, 1000);
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// Initialize game when DOM is loaded
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new ChessGame();
});
