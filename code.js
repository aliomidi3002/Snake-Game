const container = document.getElementById('game-container');
const canvas = document.querySelector('canvas');
const c = canvas.getContext('2d');

const cellSize = 25;

const eatSound = 'sound/eat.wav';
const gameOverSound = 'sound/GameOver.mp3';

// Play sound from given path, catch playback errors (e.g. user gesture needed)
function sound(path) {
    const s = new Audio(path);
    s.play().catch(e => console.warn('Sound playback failed:', e));
}

let isGameOver = false;
let gameOverSoundPlayed = false;

// Resize canvas to fit container and update game field dimensions
function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    if (game) {
        game.field.width = canvas.width;
        game.field.height = canvas.height;
    }
}
window.addEventListener('resize', resizeCanvas);

// Display game over overlay and retry button
function showGameOver() {
    c.fillStyle = "rgba(0, 0, 0, 0.5)";
    c.fillRect(0, 0, canvas.width, canvas.height);

    c.fillStyle = "rgb(8, 200, 234)";
    c.font = 'bold 72px "Courier New", monospace';
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 40);

    if (!document.getElementById('retry-btn')) {
        const btn = document.createElement('button');
        btn.id = 'retry-btn';
        btn.textContent = 'Retry';

        Object.assign(btn.style, {
            position: 'absolute',
            left: '50%',
            width: '200px',
            height: '60px',
            fontSize: '32px',
            fontWeight: 'bold',
            cursor: 'pointer',
            zIndex: 1000,
            transform: 'translateX(-50%)'
        });

        function positionButton() {
            const rect = canvas.getBoundingClientRect();
            btn.style.top = `${rect.top + canvas.height / 2 + 40}px`;
        }
        positionButton();
        window.addEventListener('resize', positionButton);

        btn.addEventListener('click', () => {
            window.removeEventListener('resize', positionButton);
            resizeCanvas();

            game = new Game();
            resetKeys();
            keys.ArrowUp = true; // Start moving up by default
            isGameOver = false;
            gameOverSoundPlayed = false;

            btn.remove();
        });

        document.body.appendChild(btn);
    }
}

// Object to track current movement direction keys (only one true at a time)
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// Reset all keys to false
function resetKeys() {
    for (let k in keys) keys[k] = false;
}

// Keyboard input handler with logic preventing reverse movement
document.addEventListener('keydown', (event) => {
    if (!keys.hasOwnProperty(event.key)) return;

    // Prevent moving in the opposite direction directly
    if (event.key === "ArrowUp" && !keys.ArrowDown) {
        resetKeys();
        keys.ArrowUp = true;
    } else if (event.key === "ArrowDown" && !keys.ArrowUp) {
        resetKeys();
        keys.ArrowDown = true;
    } else if (event.key === "ArrowLeft" && !keys.ArrowRight) {
        resetKeys();
        keys.ArrowLeft = true;
    } else if (event.key === "ArrowRight" && !keys.ArrowLeft) {
        resetKeys();
        keys.ArrowRight = true;
    }
});

// Apple positioned randomly within the grid, scaled by current canvas size
function Apple() {
    const cols = Math.floor(canvas.width / cellSize);
    const rows = Math.floor(canvas.height / cellSize);
    this.x = Math.floor(Math.random() * cols);
    this.y = Math.floor(Math.random() * rows);

    this.draw = function () {
        const cols = Math.floor(canvas.width / cellSize);
        const rows = Math.floor(canvas.height / cellSize);
        const squareSize = Math.min(canvas.width / cols, canvas.height / rows);

        const cx = this.x * squareSize + squareSize / 2;
        const cy = this.y * squareSize + squareSize / 2;
        const radius = squareSize * 0.4;

        c.beginPath();
        c.arc(cx, cy, radius, 0, Math.PI * 2);
        c.fillStyle = "rgb(200,0,100)";
        c.fill();

        c.lineWidth = 2;
        c.strokeStyle = "black";
        c.stroke();
    };
}

// Background grid of squares to visualize the playing field
function Field(width, height) {
    this.width = width;
    this.height = height;

    this.draw = function () {
        const cols = Math.floor(this.width / cellSize);
        const rows = Math.floor(this.height / cellSize);
        const squareSize = Math.min(this.width / cols, this.height / rows);

        c.lineWidth = 1;
        c.strokeStyle = "rgba(255, 255, 255, 0.05)";

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                c.beginPath();
                c.rect(x * squareSize, y * squareSize, squareSize, squareSize);
                c.stroke();
            }
        }
    }
}

// Snake object holds position, tail segments and movement logic
function Snake() {
    this.x = 10;
    this.y = 15;
    this.length = 3;
    this.tail = [
        { x: 10, y: 15 },
        { x: 10, y: 16 },
        { x: 10, y: 17 }
    ];

    this.move = function () {
        const cols = Math.floor(canvas.width / cellSize);
        const rows = Math.floor(canvas.height / cellSize);
        const maxX = cols - 1;
        const maxY = rows - 1;

        this.tail.unshift({ x: this.x, y: this.y });
        if (this.tail.length > this.length) this.tail.pop();

        if (keys.ArrowUp) this.y -= 1;
        if (keys.ArrowDown) this.y += 1;
        if (keys.ArrowLeft) this.x -= 1;
        if (keys.ArrowRight) this.x += 1;

        // Check collisions with boundaries
        if (this.x < 0 || this.x > maxX || this.y < 0 || this.y > maxY) {
            isGameOver = true;
        }

        // Check collisions with tail
        for (let seg of this.tail) {
            if (seg.x === this.x && seg.y === this.y) {
                isGameOver = true;
                break;
            }
        }
    };

    this.draw = function () {
        const cols = Math.floor(canvas.width / cellSize);
        const rows = Math.floor(canvas.height / cellSize);
        const squareSize = Math.min(canvas.width / cols, canvas.height / rows);

        // Draw tail segments
        for (let seg of this.tail) {
            const dx = seg.x * squareSize;
            const dy = seg.y * squareSize;
            c.fillStyle = "rgb(8, 200, 234)";
            c.fillRect(dx, dy, squareSize, squareSize);
            c.lineWidth = 1;
            c.strokeStyle = "black";
            c.strokeRect(dx, dy, squareSize, squareSize);
        }

        // Draw snake head with thicker stroke
        const hx = this.x * squareSize;
        const hy = this.y * squareSize;
        c.fillStyle = "rgb(8, 200, 234)";
        c.fillRect(hx, hy, squareSize, squareSize);
        c.lineWidth = 2;
        c.strokeStyle = "black";
        c.strokeRect(hx, hy, squareSize, squareSize);
    };
}

// Display current score on the canvas
function score_point(score) {
    const paddingX = 20;
    const paddingY = 40;

    c.font = 'bold 36px Arial';
    c.fillStyle = 'rgba(8, 200, 234, 0.7)';
    c.textBaseline = 'bottom';
    c.fillText('SCORE', paddingX, canvas.height - paddingY);

    c.fillStyle = 'rgba(255, 0, 0, 0.7)';
    c.fillText(score.toString(), paddingX + 150, canvas.height - paddingY);
}

// Main Game class containing the field, snake, and multiple apples
function Game() {
    this.field = new Field(canvas.width, canvas.height);
    this.snake = new Snake();
    this.apples = [];
    // Create five apples at random positions
    for (let i = 0; i < 5; i++) {
        this.apples.push(new Apple());
    }
}

let game = new Game();
keys.ArrowUp = true;

// Move snake every 100ms
setInterval(() => {
    if (!isGameOver) game.snake.move();
}, 100);

// Main animation loop for rendering game state
function animate() {
    c.clearRect(0, 0, canvas.width, canvas.height);

    if (game) {
        game.field.draw();

        game.snake.draw();
        game.apples.forEach(apple => apple.draw());

        score_point(game.snake.length - 3);

        // Check if snake ate any apple
        game.apples.forEach((apple, index) => {
            if (game.snake.x === apple.x && game.snake.y === apple.y) {
                sound(eatSound);
                game.snake.length++;
                game.apples.splice(index, 1);
                game.apples.push(new Apple());
            }
        });
    }

    if (isGameOver) {
        // Play game over sound once
        if (!gameOverSoundPlayed) {
            sound(gameOverSound);
            gameOverSoundPlayed = true;
        }
        showGameOver();
    }

    requestAnimationFrame(animate);
}

resizeCanvas();
animate();