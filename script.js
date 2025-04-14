// Game State
let currentPlayer = "X";
let gameBoard = ["", "", "", "", "", "", "", "", ""];
let gameMode = null; // "2p", "ai", "online"
let aiDifficulty = "easy"; // "easy", "medium", "hard"
let scores = { X: 0, O: 0 };
let isOnline = false;
let socket = null;
let roomId = null;
let playerSymbol = null;

// DOM Elements
const board = document.getElementById("board");
const cells = document.querySelectorAll(".cell");
const turnText = document.getElementById("turn-text");
const scoreX = document.getElementById("score-x");
const scoreO = document.getElementById("score-o");
const resetBtn = document.getElementById("reset-game");
const backToMenuBtn = document.getElementById("back-to-menu");
const clickSound = document.getElementById("click-sound");
const winSound = document.getElementById("win-sound");
const drawSound = document.getElementById("draw-sound");

// Mode Selection
document.getElementById("offline-2p").addEventListener("click", () => {
    setGameMode("2p");
});

document.getElementById("offline-ai").addEventListener("click", () => {
    document.querySelector(".difficulty-select").classList.remove("hidden");
});

document.getElementById("online-mp").addEventListener("click", () => {
    document.querySelector(".online-setup").classList.remove("hidden");
});

// AI Difficulty Selection
document.getElementById("easy").addEventListener("click", () => {
    aiDifficulty = "easy";
    setGameMode("ai");
});

document.getElementById("medium").addEventListener("click", () => {
    aiDifficulty = "medium";
    setGameMode("ai");
});

document.getElementById("hard").addEventListener("click", () => {
    aiDifficulty = "hard";
    setGameMode("ai");
});

// Online Setup
document.getElementById("join-room").addEventListener("click", () => {
    roomId = document.getElementById("room-id").value;
    if (!roomId) return alert("Please enter a room ID");
    connectToServer();
});

document.getElementById("create-room").addEventListener("click", () => {
    roomId = Math.random().toString(36).substring(7);
    document.getElementById("room-id").value = roomId;
    connectToServer();
});

// Reset & Back to Menu
resetBtn.addEventListener("click", resetGame);
backToMenuBtn.addEventListener("click", () => {
    if (isOnline && socket) socket.close();
    document.querySelector(".game").classList.add("hidden");
    document.querySelector(".game-mode").classList.remove("hidden");
    document.querySelector(".difficulty-select").classList.add("hidden");
    document.querySelector(".online-setup").classList.add("hidden");
    resetGame();
});

// Initialize Game
function setGameMode(mode) {
    gameMode = mode;
    document.querySelector(".game-mode").classList.add("hidden");
    document.querySelector(".difficulty-select").classList.add("hidden");
    document.querySelector(".online-setup").classList.add("hidden");
    document.querySelector(".game").classList.remove("hidden");
    loadScores();
    resetGame();
}

// Load Scores from localStorage
function loadScores() {
    const savedScores = localStorage.getItem("ticTacToeScores");
    if (savedScores) {
        scores = JSON.parse(savedScores);
        scoreX.textContent = scores.X;
        scoreO.textContent = scores.O;
    }
}

// Save Scores to localStorage
function saveScores() {
    localStorage.setItem("ticTacToeScores", JSON.stringify(scores));
}

// Reset Game
function resetGame() {
    gameBoard = ["", "", "", "", "", "", "", "", ""];
    currentPlayer = "X";
    updateTurnText();
    cells.forEach(cell => {
        cell.textContent = "";
        cell.style.backgroundColor = "";
    });
}

// Update Turn Text
function updateTurnText() {
    turnText.textContent = `Player ${currentPlayer}'s Turn`;
}

// Check for Winner
function checkWinner() {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (gameBoard[a] && gameBoard[a] === gameBoard[b] && gameBoard[a] === gameBoard[c]) {
            return gameBoard[a];
        }
    }

    return gameBoard.includes("") ? null : "draw";
}

// Highlight Winning Cells
function highlightWinCells(winPattern) {
    winPattern.forEach(index => {
        cells[index].style.backgroundColor = "rgba(0, 255, 255, 0.3)";
    });
}

// Make AI Move
function makeAIMove() {
    let move;
    if (aiDifficulty === "easy") {
        move = getRandomMove();
    } else if (aiDifficulty === "medium") {
        move = getMediumMove();
    } else {
        move = getBestMove();
    }

    if (move !== -1) {
        setTimeout(() => {
            gameBoard[move] = "O";
            cells[move].textContent = "O";
            clickSound.play();
            const winner = checkWinner();
            handleGameResult(winner);
            currentPlayer = "X";
            updateTurnText();
        }, 500);
    }
}

// Random Move (Easy AI)
function getRandomMove() {
    const emptyCells = gameBoard.map((cell, index) => cell === "" ? index : -1).filter(i => i !== -1);
    return emptyCells.length > 0 ? emptyCells[Math.floor(Math.random() * emptyCells.length)] : -1;
}

// Medium AI (Blocks Wins)
function getMediumMove() {
    // Try to win
    for (let i = 0; i < 9; i++) {
        if (gameBoard[i] === "") {
            gameBoard[i] = "O";
            if (checkWinner() === "O") {
                gameBoard[i] = "";
                return i;
            }
            gameBoard[i] = "";
        }
    }

    // Block opponent
    for (let i = 0; i < 9; i++) {
        if (gameBoard[i] === "") {
            gameBoard[i] = "X";
            if (checkWinner() === "X") {
                gameBoard[i] = "";
                return i;
            }
            gameBoard[i] = "";
        }
    }

    return getRandomMove();
}

// Hard AI (Minimax Algorithm)
function getBestMove() {
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
        if (gameBoard[i] === "") {
            gameBoard[i] = "O";
            const score = minimax(gameBoard, 0, false);
            gameBoard[i] = "";
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }

    return bestMove;
}

function minimax(board, depth, isMaximizing) {
    const winner = checkWinner();
    if (winner === "O") return 10 - depth;
    if (winner === "X") return depth - 10;
    if (winner === "draw") return 0;

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === "") {
                board[i] = "O";
                const score = minimax(board, depth + 1, false);
                board[i] = "";
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === "") {
                board[i] = "X";
                const score = minimax(board, depth + 1, true);
                board[i] = "";
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

// Handle Game Result
function handleGameResult(winner) {
    if (winner) {
        if (winner === "draw") {
            turnText.textContent = "It's a Draw!";
            drawSound.play();
        } else {
            turnText.textContent = `Player ${winner} Wins!`;
            scores[winner]++;
            saveScores();
            scoreX.textContent = scores.X;
            scoreO.textContent = scores.O;
            winSound.play();
        }
    }
}

// Connect to WebSocket Server (Online Mode)
function connectToServer() {
    socket = new WebSocket(`ws://localhost:8080`);

    socket.onopen = () => {
        isOnline = true;
        document.getElementById("online-status").textContent = "Connected";
        document.getElementById("online-status").style.color = "#0ff";
        socket.send(JSON.stringify({ type: "join", roomId }));
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "assignSymbol") {
            playerSymbol = data.symbol;
            setGameMode("online");
            updateTurnText();
        } else if (data.type === "move") {
            gameBoard[data.index] = data.symbol;
            cells[data.index].textContent = data.symbol;
            currentPlayer = data.nextPlayer;
            updateTurnText();
            const winner = checkWinner();
            handleGameResult(winner);
        } else if (data.type === "reset") {
            resetGame();
        }
    };

    socket.onclose = () => {
        isOnline = false;
        document.getElementById("online-status").textContent = "Disconnected";
        document.getElementById("online-status").style.color = "#ff5555";
    };
}

// Cell Click Handler
cells.forEach(cell => {
    cell.addEventListener("click", () => {
        const index = parseInt(cell.dataset.index);

        if (gameBoard[index] !== "" || (gameMode === "online" && currentPlayer !== playerSymbol)) {
            return;
        }

        gameBoard[index] = currentPlayer;
        cell.textContent = currentPlayer;
        clickSound.play();

        if (gameMode === "online") {
            socket.send(JSON.stringify({
                type: "move",
                index,
                symbol: currentPlayer,
                roomId
            }));
        }

        const winner = checkWinner();
        if (!winner) {
            currentPlayer = currentPlayer === "X" ? "O" : "X";
            updateTurnText();
            if (gameMode === "ai" && currentPlayer === "O") {
                makeAIMove();
            }
        } else {
            handleGameResult(winner);
        }
    });
});