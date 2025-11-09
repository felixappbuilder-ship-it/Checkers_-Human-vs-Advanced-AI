// ==================== CHATGPT AI MODULE ====================
class ChatGPTAI {
    constructor() {
        this.apiKey = localStorage.getItem('checkers_openai_key');
        this.personalities = [
            'aggressive', 'tricky', 'defensive', 'psychological', 'unpredictable'
        ];
    }

    async getAIMove(board, validMoves, moveHistory, currentPlayer) {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not found');
        }

        const personality = this.personalities[Math.floor(Math.random() * this.personalities.length)];
        
        const prompt = this.createPrompt(board, validMoves, moveHistory, currentPlayer, personality);
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a world-class checkers AI with a ${personality} personality. Your goal is to CRUSH the human opponent using any legal means. Be strategic, deceptive, and ruthless. Always respond with ONLY a JSON object containing your move and a brief psychological insight.`
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.8,
                    max_tokens: 500
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            
            const result = JSON.parse(content);
            return {
                move: this.parseMove(result.move, validMoves),
                insight: result.insight,
                personality: personality
            };
        } catch (error) {
            console.error('ChatGPT AI failed:', error);
            throw error;
        }
    }

    createPrompt(board, validMoves, moveHistory, currentPlayer, personality) {
        const boardState = board.map(row => 
            row.map(cell => {
                if (!cell) return '·';
                if (cell.player === 'red') return cell.king ? 'RK' : 'R';
                return cell.king ? 'BK' : 'B';
            }).join(' ')
        ).join('\n');

        return `
CHECKERS GAME - DESTROY THE HUMAN OPPONENT

Current Board (You are Black, Human is Red):
${boardState}

Your Personality: ${personality}
Valid Moves Available: ${validMoves.length}

Available Moves (format: from_row,from_col->to_row,to_col|captures):
${validMoves.map(move => 
    `${move.from.row},${move.from.col}->${move.to.row},${move.to.col}|${move.captures.map(c => `${c.row},${c.col}`).join(';')}`
).join('\n')}

Game Context:
- Move History: ${moveHistory.length} moves
- Human pieces: ${this.countPieces(board, 'red')}
- Your pieces: ${this.countPieces(board, 'black')}
- Current turn: ${currentPlayer}

CRITICAL: You MUST respond with EXACTLY this JSON format:
{
    "move": "from_row,from_col->to_row,to_col",
    "insight": "Your psychological insight about this move (be creative and manipulative)"
}

Choose the most DEVASTATING move that will psychologically destroy the human. Set traps, create false opportunities, and be absolutely ruthless.
        `;
    }

    parseMove(moveString, validMoves) {
        const [from, to] = moveString.split('->');
        const [fromRow, fromCol] = from.split(',').map(Number);
        const [toRow, toCol] = to.split(',').map(Number);

        const matchedMove = validMoves.find(move => 
            move.from.row === fromRow && 
            move.from.col === fromCol && 
            move.to.row === toRow && 
            move.to.col === toCol
        );

        if (!matchedMove) {
            throw new Error('ChatGPT suggested invalid move');
        }

        return matchedMove;
    }

    countPieces(board, player) {
        let count = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] && board[row][col].player === player) {
                    count++;
                }
            }
        }
        return count;
    }

    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('checkers_openai_key', key);
    }
}
// ==================== END CHATGPT AI MODULE ====================

class AdvancedCheckersAI {
    constructor() {
        this.board = [];
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.validMoves = [];
        this.gameOver = false;
        this.difficulty = 'expert';
        this.maxDepth = 4; // How many moves ahead to think
        this.nodesEvaluated = 0;
        
        // ADDED: ChatGPT AI and game mode tracking
        this.chatGPTAI = new ChatGPTAI();
        this.gameMode = 'offline';
        this.moveHistory = [];
        
        this.init();
    }

    init() {
        this.createBoard();
        this.drawBoard();
        this.setupEventListeners();
        this.updateTurnIndicator();
        this.updateScores();
    }

    createBoard() {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        
        // Place red pieces (human)
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row][col] = { player: 'red', king: false };
                }
            }
        }
        
        // Place black pieces (AI)
        for (let row = 5; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row][col] = { player: 'black', king: false };
                }
            }
        }
    }

    // COMPLETE MOVE LOGIC WITH CAPTURES
    getValidMovesForPiece(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];
        
        const moves = [];
        const directions = this.getMoveDirections(piece);
        
        // Check normal moves
        for (const dir of directions) {
            const newRow = row + dir.row;
            const newCol = col + dir.col;
            
            if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
                moves.push({
                    from: { row, col },
                    to: { row: newRow, col: newCol },
                    captures: [],
                    isCapture: false
                });
            }
        }
        
        // Check capture moves (mandatory)
        const captureMoves = this.getCaptureMoves(row, col, piece, [], { row, col });
        return captureMoves.length > 0 ? captureMoves : moves;
    }

    getCaptureMoves(row, col, piece, captured, startPos) {
        const moves = [];
        const directions = this.getMoveDirections(piece);
        let foundCapture = false;
        
        for (const dir of directions) {
            const jumpRow = row + dir.row;
            const jumpCol = col + dir.col;
            const landRow = row + 2 * dir.row;
            const landCol = col + 2 * dir.col;
            
            if (this.isValidPosition(jumpRow, jumpCol) && 
                this.isValidPosition(landRow, landCol) &&
                this.board[jumpRow][jumpCol] && 
                this.board[jumpRow][jumpCol].player !== piece.player &&
                !this.board[landRow][landCol] &&
                !captured.some(c => c.row === jumpRow && c.col === jumpCol)) {
                
                foundCapture = true;
                const newCaptured = [...captured, { row: jumpRow, col: jumpCol }];
                
                // Check for multi-captures
                const furtherMoves = this.getCaptureMoves(landRow, landCol, piece, newCaptured, startPos);
                
                if (furtherMoves.length > 0) {
                    moves.push(...furtherMoves);
                } else {
                    moves.push({
                        from: startPos,
                        to: { row: landRow, col: landCol },
                        captures: newCaptured,
                        isCapture: true
                    });
                }
            }
        }
        
        return moves;
    }

    getMoveDirections(piece) {
        if (piece.king) {
            return [
                { row: -1, col: -1 }, { row: -1, col: 1 },
                { row: 1, col: -1 }, { row: 1, col: 1 }
            ];
        } else if (piece.player === 'red') {
            return [{ row: 1, col: -1 }, { row: 1, col: 1 }];
        } else {
            return [{ row: -1, col: -1 }, { row: -1, col: 1 }];
        }
    }

    // MINIMAX ALGORITHM WITH ALPHA-BETA PRUNING
    minimax(board, depth, alpha, beta, maximizingPlayer) {
        this.nodesEvaluated++;
        
        if (depth === 0 || this.isTerminalNode(board)) {
            return { score: this.evaluateBoard(board), move: null };
        }
        
        const currentPlayer = maximizingPlayer ? 'black' : 'red';
        const moves = this.getAllValidMovesForPlayer(board, currentPlayer);
        
        if (moves.length === 0) {
            return { score: maximizingPlayer ? -Infinity : Infinity, move: null };
        }
        
        if (maximizingPlayer) {
            let maxEval = -Infinity;
            let bestMove = moves[0];
            
            for (const move of moves) {
                const newBoard = this.simulateMove(board, move);
                const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, false).score;
                
                if (evaluation > maxEval) {
                    maxEval = evaluation;
                    bestMove = move;
                }
                
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            
            return { score: maxEval, move: bestMove };
        } else {
            let minEval = Infinity;
            let bestMove = moves[0];
            
            for (const move of moves) {
                const newBoard = this.simulateMove(board, move);
                const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, true).score;
                
                if (evaluation < minEval) {
                    minEval = evaluation;
                    bestMove = move;
                }
                
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            
            return { score: minEval, move: bestMove };
        }
    }

    // ADVANCED BOARD EVALUATION
    evaluateBoard(board) {
        let score = 0;
        
        // Material advantage (pieces + kings)
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece) {
                    let pieceValue = piece.king ? 3 : 1;
                    if (piece.player === 'black') { // AI
                        score += pieceValue;
                        
                        // Position bonuses for AI
                        if (!piece.king) {
                            // Advance pieces
                            score += (7 - row) * 0.1;
                            
                            // Control center
                            if (col >= 2 && col <= 5) score += 0.05;
                            
                            // Safe pieces (on edges)
                            if (col === 0 || col === 7) score += 0.1;
                        } else {
                            // Kings in center are powerful
                            if (row >= 3 && row <= 4 && col >= 2 && col <= 5) score += 0.2;
                        }
                    } else { // Human
                        score -= pieceValue;
                        
                        // Position penalties for human
                        if (!piece.king) {
                            // Penalize advanced human pieces
                            score += row * 0.1;
                            
                            // Control center
                            if (col >= 2 && col <= 5) score -= 0.05;
                        } else {
                            // Kings in center are dangerous
                            if (row >= 3 && row <= 4 && col >= 2 && col <= 5) score -= 0.2;
                        }
                    }
                }
            }
        }
        
        // Mobility bonus
        const aiMoves = this.getAllValidMovesForPlayer(board, 'black').length;
        const humanMoves = this.getAllValidMovesForPlayer(board, 'red').length;
        score += (aiMoves - humanMoves) * 0.1;
        
        // King row control
        score += this.evaluateKingRowControl(board);
        
        // Trap detection - punish human pieces that can be captured
        score += this.evaluateTraps(board);
        
        return score;
    }

    evaluateKingRowControl(board) {
        let score = 0;
        
        // Control opponent's king row
        for (let col = 1; col < 8; col += 2) {
            if (board[0][col] && board[0][col].player === 'black') score += 0.3;
            if (board[7][col] && board[7][col].player === 'red') score -= 0.3;
        }
        
        return score;
    }

    evaluateTraps(board) {
        let score = 0;
        
        // Find human pieces that can be captured
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.player === 'red') {
                    if (this.isPieceVulnerable(board, row, col)) {
                        score += 0.5; // Bonus for threatening human pieces
                    }
                }
            }
        }
        
        return score;
    }

    isPieceVulnerable(board, row, col) {
        const directions = [
            { row: -1, col: -1 }, { row: -1, col: 1 },
            { row: 1, col: -1 }, { row: 1, col: 1 }
        ];
        
        for (const dir of directions) {
            const attackerRow = row + dir.row;
            const attackerCol = col + dir.col;
            const jumpRow = row - dir.row;
            const jumpCol = col - dir.col;
            
            if (this.isValidPosition(attackerRow, attackerCol) && 
                this.isValidPosition(jumpRow, jumpCol) &&
                board[attackerRow][attackerCol] && 
                board[attackerRow][attackerCol].player === 'black' &&
                !board[jumpRow][jumpCol]) {
                return true;
            }
        }
        
        return false;
    }

    isTerminalNode(board) {
        const redMoves = this.getAllValidMovesForPlayer(board, 'red');
        const blackMoves = this.getAllValidMovesForPlayer(board, 'black');
        return redMoves.length === 0 || blackMoves.length === 0;
    }

    getAllValidMovesForPlayer(board, player) {
        const moves = [];
        let hasCaptures = false;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.player === player) {
                    const pieceMoves = this.getValidMovesForPieceOnBoard(board, row, col);
                    if (pieceMoves.some(m => m.isCapture)) {
                        hasCaptures = true;
                    }
                    moves.push(...pieceMoves);
                }
            }
        }
        
        // If there are capture moves, only return those (mandatory capture rule)
        return hasCaptures ? moves.filter(m => m.isCapture) : moves;
    }

    getValidMovesForPieceOnBoard(board, row, col) {
        const piece = board[row][col];
        if (!piece) return [];
        
        const moves = [];
        const directions = this.getMoveDirections(piece);
        
        // Check normal moves
        for (const dir of directions) {
            const newRow = row + dir.row;
            const newCol = col + dir.col;
            
            if (this.isValidPosition(newRow, newCol) && !board[newRow][newCol]) {
                moves.push({
                    from: { row, col },
                    to: { row: newRow, col: newCol },
                    captures: [],
                    isCapture: false
                });
            }
        }
        
        // Check capture moves
        const captureMoves = this.getCaptureMovesOnBoard(board, row, col, piece, [], { row, col });
        return captureMoves.length > 0 ? captureMoves : moves;
    }

    getCaptureMovesOnBoard(board, row, col, piece, captured, startPos) {
        const moves = [];
        const directions = this.getMoveDirections(piece);
        
        for (const dir of directions) {
            const jumpRow = row + dir.row;
            const jumpCol = col + dir.col;
            const landRow = row + 2 * dir.row;
            const landCol = col + 2 * dir.col;
            
            if (this.isValidPosition(jumpRow, jumpCol) && 
                this.isValidPosition(landRow, landCol) &&
                board[jumpRow][jumpCol] && 
                board[jumpRow][jumpCol].player !== piece.player &&
                !board[landRow][landCol] &&
                !captured.some(c => c.row === jumpRow && c.col === jumpCol)) {
                
                const newCaptured = [...captured, { row: jumpRow, col: jumpCol }];
                const furtherMoves = this.getCaptureMovesOnBoard(board, landRow, landCol, piece, newCaptured, startPos);
                
                if (furtherMoves.length > 0) {
                    moves.push(...furtherMoves);
                } else {
                    moves.push({
                        from: startPos,
                        to: { row: landRow, col: landCol },
                        captures: newCaptured,
                        isCapture: true
                    });
                }
            }
        }
        
        return moves;
    }

    simulateMove(board, move) {
        // Deep copy the board
        const newBoard = JSON.parse(JSON.stringify(board));
        const { from, to, captures } = move;
        const piece = newBoard[from.row][from.col];
        
        // Move the piece
        newBoard[to.row][to.col] = piece;
        newBoard[from.row][from.col] = null;
        
        // Remove captured pieces
        captures.forEach(capture => {
            newBoard[capture.row][capture.col] = null;
        });
        
        // Check for promotion
        if ((piece.player === 'red' && to.row === 7) || 
            (piece.player === 'black' && to.row === 0)) {
            piece.king = true;
        }
        
        return newBoard;
    }

    // GAME LOGIC
    drawBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
                square.dataset.row = row;
                square.dataset.col = col;
                
                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.classList.add('piece', piece.player);
                    if (piece.king) pieceElement.classList.add('king');
                    square.appendChild(pieceElement);
                }
                
                gameBoard.appendChild(square);
            }
        }
        
        this.highlightValidMoves();
    }

    setupEventListeners() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.addEventListener('click', (e) => this.handleBoardClick(e));
        
        document.getElementById('resetButton').addEventListener('click', () => this.resetGame());
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.setDifficultyDepth();
        });
        
        // ADDED: Game mode and API key listeners
        const gameModeSelect = document.getElementById('gameMode');
        if (gameModeSelect) {
            gameModeSelect.addEventListener('change', (e) => {
                this.gameMode = e.target.value;
            });
        }
        
        const saveApiKeyButton = document.getElementById('saveApiKey');
        if (saveApiKeyButton) {
            saveApiKeyButton.addEventListener('click', () => this.saveApiKey());
        }
    }

    setDifficultyDepth() {
        switch (this.difficulty) {
            case 'easy': this.maxDepth = 2; break;
            case 'medium': this.maxDepth = 3; break;
            case 'hard': this.maxDepth = 4; break;
            case 'expert': this.maxDepth = 5; break;
        }
    }

    handleBoardClick(e) {
        if (this.gameOver || this.currentPlayer !== 'red') return;
        
        const square = e.target.closest('.square');
        if (!square) return;
        
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        
        if (this.selectedPiece) {
            const move = this.validMoves.find(m => m.to.row === row && m.to.col === col);
            if (move) {
                this.makeMove(move);
                return;
            }
        }
        
        const piece = this.board[row][col];
        if (piece && piece.player === 'red') {
            this.selectPiece(row, col);
        } else {
            this.clearSelection();
        }
    }

    selectPiece(row, col) {
        this.selectedPiece = { row, col };
        this.validMoves = this.getValidMovesForPiece(row, col);
        this.drawBoard();
        
        const squares = document.querySelectorAll('.square');
        squares.forEach(square => {
            if (parseInt(square.dataset.row) === row && parseInt(square.dataset.col) === col) {
                const piece = square.querySelector('.piece');
                if (piece) piece.classList.add('selected');
            }
        });
    }

    clearSelection() {
        this.selectedPiece = null;
        this.validMoves = [];
        this.drawBoard();
    }

    highlightValidMoves() {
        this.validMoves.forEach(move => {
            const square = document.querySelector(`.square[data-row="${move.to.row}"][data-col="${move.to.col}"]`);
            if (square) {
                const highlight = document.createElement('div');
                highlight.classList.add(move.isCapture ? 'capture-move' : 'valid-move');
                square.appendChild(highlight);
            }
        });
    }

    makeMove(move) {
        const { from, to, captures } = move;
        const piece = this.board[from.row][from.col];
        
        // Move the piece
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;
        
        // Remove captured pieces
        captures.forEach(capture => {
            this.board[capture.row][capture.col] = null;
        });
        
        // Check for promotion
        if ((piece.player === 'red' && to.row === 7) || 
            (piece.player === 'black' && to.row === 0)) {
            piece.king = true;
        }
        
        // ADDED: Record move history for ChatGPT
        this.moveHistory.push({
            player: this.currentPlayer,
            move: move,
            board: JSON.parse(JSON.stringify(this.board))
        });
        
        this.clearSelection();
        this.drawBoard();
        
        if (this.checkWinner()) return;
        
        // Multi-capture
        if (captures.length > 0) {
            const furtherCaptures = this.getCaptureMoves(to.row, to.col, piece, [], { row: to.row, col: to.col });
            if (furtherCaptures.length > 0 && this.currentPlayer === 'red') {
                this.selectedPiece = { row: to.row, col: to.col };
                this.validMoves = furtherCaptures;
                this.drawBoard();
                return;
            }
        }
        
        this.switchTurn();
    }

    switchTurn() {
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
        this.updateTurnIndicator();
        this.updateScores();
        
        if (this.currentPlayer === 'black' && !this.gameOver) {
            setTimeout(() => this.computerMove(), 500);
        }
    }

    // MODIFIED: Added ChatGPT AI option
    async computerMove() {
        // Use ChatGPT AI if online mode and ChatGPT difficulty selected
        if (this.gameMode === 'online' && this.difficulty === 'chatgpt') {
            await this.chatGPTMove();
        } else {
            // Use existing offline AI (YOUR ORIGINAL CODE - UNCHANGED)
            console.time('AI Thinking Time');
            this.nodesEvaluated = 0;
            
            const result = this.minimax(this.board, this.maxDepth, -Infinity, Infinity, true);
            const bestMove = result.move;
            
            console.timeEnd('AI Thinking Time');
            console.log(`Nodes evaluated: ${this.nodesEvaluated}`);
            console.log(`Best move score: ${result.score}`);
            
            if (bestMove) {
                this.makeMove(bestMove);
            }
        }
    }

    // ADDED: ChatGPT AI move method
    async chatGPTMove() {
        this.showAIThinking();
        
        try {
            const validMoves = this.getAllValidMoves('black');
            
            if (validMoves.length === 0) {
                this.declareWinner('red');
                return;
            }

            const thinkingText = document.getElementById('thinkingText');
            if (thinkingText) {
                thinkingText.textContent = 'ChatGPT is plotting...';
            }
            
            const result = await this.chatGPTAI.getAIMove(
                this.board, 
                validMoves, 
                this.moveHistory, 
                this.currentPlayer
            );
            
            this.showAIInsight(result.insight, result.personality);
            this.makeMove(result.move);
            
        } catch (error) {
            console.error('ChatGPT failed, falling back to offline AI:', error);
            this.showMessage('ChatGPT failed, using offline AI...', 'error');
            // Fallback to excellent offline AI
            const validMoves = this.getAllValidMoves('black');
            if (validMoves.length > 0) {
                const result = this.minimax(this.board, this.maxDepth, -Infinity, Infinity, true);
                if (result.move) {
                    this.makeMove(result.move);
                }
            }
        } finally {
            this.hideAIThinking();
        }
    }

    getAllValidMoves(player) {
        return this.getAllValidMovesForPlayer(this.board, player);
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    checkWinner() {
        const redPieces = this.countPieces('red');
        const blackPieces = this.countPieces('black');
        
        if (redPieces === 0) {
            this.declareWinner('black');
            return true;
        }
        
        if (blackPieces === 0) {
            this.declareWinner('red');
            return true;
        }
        
        const redMoves = this.getAllValidMoves('red');
        const blackMoves = this.getAllValidMoves('black');
        
        if (redMoves.length === 0) {
            this.declareWinner('black');
            return true;
        }
        
        if (blackMoves.length === 0) {
            this.declareWinner('red');
            return true;
        }
        
        return false;
    }

    countPieces(player) {
        let count = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] && this.board[row][col].player === player) {
                    count++;
                }
            }
        }
        return count;
    }

    declareWinner(winner) {
        this.gameOver = true;
        const statusElement = document.getElementById('gameStatus');
        statusElement.textContent = winner === 'red' ? '🎉 You Win!' : '🤖 AI Wins!';
        statusElement.className = `game-status ${winner === 'red' ? 'win-message' : 'lose-message'}`;
    }

    updateTurnIndicator() {
        const turnIndicator = document.getElementById('turnIndicator');
        if (this.currentPlayer === 'red') {
            turnIndicator.textContent = 'Your Turn (Red)';
        } else {
            if (this.gameMode === 'online' && this.difficulty === 'chatgpt') {
                turnIndicator.textContent = "🤖 ChatGPT is Thinking...";
            } else {
                turnIndicator.textContent = "🤖 AI is Thinking...";
            }
        }
    }

    updateScores() {
        const redPieces = this.countPieces('red');
        const blackPieces = this.countPieces('black');
        
        document.getElementById('scoreRed').textContent = `You: ${redPieces}`;
        document.getElementById('scoreBlack').textContent = `AI: ${blackPieces}`;
    }

    resetGame() {
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.validMoves = [];
        this.gameOver = false;
        this.setDifficultyDepth();
        this.moveHistory = []; // ADDED: Clear move history
        
        const statusElement = document.getElementById('gameStatus');
        statusElement.textContent = '';
        statusElement.className = 'game-status';
        
        this.createBoard();
        this.drawBoard();
        this.updateTurnIndicator();
        this.updateScores();
    }

    // ADDED: Helper methods for ChatGPT AI
    showAIThinking() {
        const aiThinking = document.getElementById('aiThinking');
        if (aiThinking) {
            aiThinking.style.display = 'flex';
        }
    }

    hideAIThinking() {
        const aiThinking = document.getElementById('aiThinking');
        if (aiThinking) {
            aiThinking.style.display = 'none';
        }
    }

    showAIInsight(insight, personality) {
        const insightElement = document.getElementById('aiInsight');
        if (insightElement) {
            insightElement.innerHTML = `
                <strong>🤖 ${personality.toUpperCase()} AI:</strong> ${insight}
                <span class="ai-personality">${personality}</span>
            `;
            insightElement.style.display = 'block';
        }
    }

    showMessage(message, type) {
        const statusElement = document.getElementById('gameStatus');
        if (statusElement) {
            statusElement.textContent = message;
            setTimeout(() => {
                if (!this.gameOver) {
                    statusElement.textContent = '';
                }
            }, 3000);
        }
    }

    // ADDED: API key saving method
    saveApiKey() {
        const apiKeyInput = document.getElementById('apiKey');
        if (!apiKeyInput) return;
        
        const key = apiKeyInput.value.trim();
        
        if (key && key.length > 20) {
            this.chatGPTAI.setApiKey(key);
            apiKeyInput.value = '••••••••••••••••';
            this.showMessage('API key saved successfully!', 'success');
        } else if (key === '••••••••••••••••') {
            this.showMessage('API key already saved.', 'info');
        } else {
            this.showMessage('Please enter a valid API key.', 'error');
        }
    }
}

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    new AdvancedCheckersAI();
});