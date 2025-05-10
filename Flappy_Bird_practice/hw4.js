"use strict";

// 音效資源
class AudioManager {
    constructor() {
        this.bgm = new Audio("https://raw.githubusercontent.com/LIN0010/xing-personal-homepage/main/Flappy_Bird_practice/bgm.mp3");
        this.jumpSFX = new Audio("https://raw.githubusercontent.com/LIN0010/xing-personal-homepage/main/Flappy_Bird_practice/jump.wav");
        this.gameoverBGM = new Audio("https://raw.githubusercontent.com/LIN0010/xing-personal-homepage/main/Flappy_Bird_practice/gameover.mp3");
        this.bgm.loop = true;
        this.bgm.volume = 0.5;
        this.jumpSFX.volume = 0.6;
        this.gameoverBGM.volume = 1;
        this.audioEnabled = localStorage.getItem("audioEnabled") === "true";
        this.alreadyPlayedGameOver = false;
    }

    playBGM() {
        if (this.audioEnabled) {
            this.bgm.currentTime = 0;
            this.bgm.play().catch(() => {});
        }
    }

    playJumpSFX() {
        if (this.audioEnabled) {
            this.jumpSFX.currentTime = 0;
            this.jumpSFX.play();
        }
    }

    playGameOverBGM() {
        if (this.audioEnabled && !this.alreadyPlayedGameOver) {
            this.alreadyPlayedGameOver = true;
            this.bgm.pause();
            this.gameoverBGM.currentTime = 0;
            this.gameoverBGM.play();
        }
    }

    pauseAll() {
        this.bgm.pause();
        this.gameoverBGM.pause();
        this.gameoverBGM.currentTime = 0;
    }

    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        if (this.audioEnabled) {
            this.playBGM();
        } else {
            this.pauseAll();
        }
        localStorage.setItem("audioEnabled", this.audioEnabled);
        document.getElementById("audioToggle").textContent = this.audioEnabled ? "🔊" : "🔇";
    }
}

// 全局圖片變數
let birdImage = new Image();
let pillarImage = new Image();
let bgImage = new Image();
const timestamp = new Date().getTime();
birdImage.src = `https://raw.githubusercontent.com/LIN0010/xing-personal-homepage/main/Flappy_Bird_practice/bird.png?t=${timestamp}`;
pillarImage.src = `https://raw.githubusercontent.com/LIN0010/xing-personal-homepage/main/Flappy_Bird_practice/pillar.png?t=${timestamp}`;
bgImage.src = `https://raw.githubusercontent.com/LIN0010/xing-personal-homepage/main/Flappy_Bird_practice/bg.png?t=${timestamp}`;

class AssetManager {
    constructor() {
        this.birdImage = birdImage;
        this.pillarImage = pillarImage;
        this.bgImage = bgImage;
    }

    areImagesLoaded() {
        return this.birdImage.complete && this.birdImage.naturalWidth > 0 &&
               this.pillarImage.complete && this.pillarImage.naturalWidth > 0 &&
               this.bgImage.complete && this.bgImage.naturalWidth > 0;
    }
}

// 遊戲常量
const CONSTANTS = {
	INIT_SPEED: 1.8,
    HORIZ_SPEED: 1,
    BOUNCE_FACTOR: 0.65,
    MIN_PIXEL_GAP: 180,
    MIN_GAP_BETWEEN: 90,
    MAX_GAP_BETWEEN: 140,
    SPEED_STEP_SCORE: 3000,
    SPEED_DELTA: 0.5,
};

// 遊戲區域類
class GameArea {
    constructor(audioManager, assetManager) {
        this.canvas = document.createElement("canvas");
        this.canvas.width = 480;
        this.canvas.height = 270;
        this.context = this.canvas.getContext("2d");
        if (!this.context) {
            console.error("Failed to get 2D context");
            return;
        }
        this.context.imageSmoothingEnabled = false;
        this.frameNo = 0;
        this.interval = null;
        this.gameSpeed = CONSTANTS.INIT_SPEED;
        this.nextSpeedUp = CONSTANTS.SPEED_STEP_SCORE;
        this.audioManager = audioManager;
        this.assetManager = assetManager;
        this.gameOver = false;
    }

    start() {
		const first = document.body.firstElementChild;   // 抓到 <button id="audioToggle">
		document.body.insertBefore(this.canvas, first);  // ➜ 插到最前面
        // 繪製一個簡單的背景色，確認 canvas 可見
        this.context.fillStyle = "blue";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = "white";
        this.context.font = "20px Arial";
        this.context.fillText("Loading...", 10, 30);
        this.interval = setInterval(() => this.update(), 20);
    }

    clear() {
        clearInterval(this.interval);
    }

    update() {
        if (this.gameOver) return;
        this.frameNo++;
        if (this.frameNo >= this.nextSpeedUp) {
            this.gameSpeed += CONSTANTS.SPEED_DELTA;
            this.nextSpeedUp += CONSTANTS.SPEED_STEP_SCORE;
        }
    }

    endGame(score) {
        this.gameOver = true;
        this.clear();
        this.context.fillStyle = "rgba(0, 0, 0, 0.5)";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.font = "bold 50px Consolas";
        this.context.fillStyle = "red";
        this.context.textAlign = "center";
        this.context.shadowColor = "black";
        this.context.shadowBlur = 10;
        this.context.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2 - 40);
        this.context.font = "28px Consolas";
        this.context.fillText(`Final Score: ${score}`, this.canvas.width / 2, this.canvas.height / 2);
        this.context.shadowBlur = 0;
        this.audioManager.playGameOverBGM();
        this.canvas.style.pointerEvents = "none";
		document.getElementById("accelerateBtn").style.display = "none";
		document.getElementById("restartButton").style.display = "inline-block";
    }
}

// 背景類
class Background {
    constructor(gameArea, assetManager) {
        this.gameArea = gameArea;
        this.bgImage = assetManager.bgImage;
        this.x = 0;
    }

    update() {
        this.x -= this.gameArea.gameSpeed;
        if (this.x <= -this.gameArea.canvas.width) {
            this.x = 0;
        }
        const ctx = this.gameArea.context;
        if (this.bgImage.complete && this.bgImage.naturalWidth > 0) {
            ctx.drawImage(this.bgImage, this.x, 0, this.gameArea.canvas.width, this.gameArea.canvas.height);
            ctx.drawImage(this.bgImage, this.x + this.gameArea.canvas.width, 0, this.gameArea.canvas.width, this.gameArea.canvas.height);
        } else {
            console.warn("Background image not ready for drawing, complete:", this.bgImage.complete, "naturalWidth:", this.bgImage.naturalWidth);
        }
    }
}

// 玩家類
class Player {
    constructor(gameArea, assetManager) {
        this.gameArea = gameArea;
        this.birdImage = assetManager.birdImage;
        this.width = 32;
        this.height = 25.5;
        this.x = 10;
        this.y = 120;
        this.speedX = 0;
        this.speedY = 0;
        this.gravity = 0.04;
        this.gravitySpeed = 0;
        this.frameIndex = 0;
        this.tickCount = 0;
        this.ticksPerFrame = 5;
        this.numberOfFrames = 6;
        this.accelerateHeld = false;
    }

    update() {
        const ctx = this.gameArea.context;
        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
            this.tickCount = 0;
            this.frameIndex = (this.frameIndex + 1) % this.numberOfFrames;
        }
        if (this.birdImage.complete && this.birdImage.naturalWidth > 0) {
            ctx.drawImage(
                this.birdImage,
                this.frameIndex * this.width, 0,
                this.width, this.height,
                this.x, this.y,
                this.width, this.height
            );
        } else {
            console.warn("Player image not ready for drawing, complete:", this.birdImage.complete, "naturalWidth:", this.birdImage.naturalWidth);
        }
    }

    newPos() {
        this.gravitySpeed += this.gravity;
        if (this.gravitySpeed > 2.5) this.gravitySpeed = 2.5;
        if (this.gravitySpeed < -2.5) this.gravitySpeed = -2.5;
        this.y += this.speedY + this.gravitySpeed;
        this.x += this.speedX;
        const left = 0;
        const right = this.gameArea.canvas.width - this.width;
        if (this.x < left) this.x = left;
        if (this.x > right) this.x = right;
        const bottom = this.gameArea.canvas.height - this.height;
        const top = 0;
        if (this.y > bottom) {
            this.y = bottom;
            this.gravitySpeed = -this.gravitySpeed * CONSTANTS.BOUNCE_FACTOR;
            if (Math.abs(this.gravitySpeed) < 0.5) this.gravitySpeed = 0;
        }
        if (this.y < top) {
            this.y = top;
            this.gravitySpeed = 0;
        }
    }

    accelerate(audioManager) {
        this.gravitySpeed -= 0.25;
        if (this.gravitySpeed < -2.5) this.gravitySpeed = -2.5;
        audioManager.playJumpSFX();
    }

    crashWith(other) {
        const shrink = 4;
        const myleft = this.x + shrink;
        const myright = this.x + this.width - shrink;
        const mytop = this.y + shrink;
        const mybottom = this.y + this.height - shrink;
        const otherleft = other.x;
        const otherright = other.x + other.width;
        const othertop = other.y;
        const otherbottom = other.y + other.height;
        return !(mybottom < othertop || mytop > otherbottom ||
                 myright < otherleft || myleft > otherright);
    }
}

// 柱子類
class Pillar {
    constructor(gameArea, assetManager, x, y, width, height) {
        this.gameArea = gameArea;
        this.pillarImage = assetManager.pillarImage;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    update() {
        this.x -= this.gameArea.gameSpeed;
        const ctx = this.gameArea.context;
        if (this.pillarImage.complete && this.pillarImage.naturalWidth > 0) {
            ctx.drawImage(
                this.pillarImage,
                0, 0, this.pillarImage.width, this.pillarImage.height,
                this.x, this.y, this.width, this.height
            );		
		}
	}
}

// 柱子管理器
class PillarManager {
    constructor(gameArea, assetManager) {
        this.gameArea = gameArea;
        this.assetManager = assetManager;
        this.pillars = [];
        this.alreadySpawnedFirst = false;
    }

    trySpawnPillars() {
        const lastX = this.pillars.length ? this.pillars[this.pillars.length - 1].x : Infinity;
        if (!this.alreadySpawnedFirst || lastX < this.gameArea.canvas.width - CONSTANTS.MIN_PIXEL_GAP) {
            const x = this.gameArea.canvas.width;
            const minHeight = 20;
            const maxHeight = 140;
            const height = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
            const gap = Math.floor(Math.random() * (CONSTANTS.MAX_GAP_BETWEEN - CONSTANTS.MIN_GAP_BETWEEN + 1) + CONSTANTS.MIN_GAP_BETWEEN);
            const bottomH = this.gameArea.canvas.height - height - gap;
            if (bottomH > 0) {
                this.pillars.push(new Pillar(this.gameArea, this.assetManager, x, 0, 30, height));
                this.pillars.push(new Pillar(this.gameArea, this.assetManager, x, height + gap, 30, bottomH));
                this.alreadySpawnedFirst = true;
            }
        }
    }

    update() {
        this.trySpawnPillars();
        this.pillars.forEach(pillar => pillar.update());
    }

    checkCollision(player) {
        return this.pillars.some(pillar => player.crashWith(pillar));
    }

    reset() {
        this.pillars = [];
        this.alreadySpawnedFirst = false;
    }
}

// 得分類
class Score {
    constructor(gameArea) {
        this.gameArea = gameArea;
        this.score = 0;
    }

    update() {
        this.score = this.gameArea.frameNo;
        const ctx = this.gameArea.context;
        ctx.font = "30px Courier New";
        ctx.fillStyle = "#ffcccc";
        ctx.shadowColor = "#ff3300";
        ctx.shadowBlur = 6;
        ctx.textAlign = "left";
        ctx.fillText(`SCORE: ${this.score}`, 20, 50);
        ctx.shadowBlur = 0;
    }
}

// 主遊戲類
class FlappyBirdGame {
    constructor() {
        this.audioManager = new AudioManager();
        this.assetManager = new AssetManager();
        this.gameArea = new GameArea(this.audioManager, this.assetManager);
        this.background = new Background(this.gameArea, this.assetManager);
        this.player = new Player(this.gameArea, this.assetManager);
        this.pillarManager = new PillarManager(this.gameArea, this.assetManager);
        this.score = new Score(this.gameArea);
        this.setupEventListeners();
    }

    start() {
        const startGame = () => {
            if (this.assetManager.areImagesLoaded() && this.gameArea.context) {
                this.gameArea.start();
				this.gameArea.clear();
				this.gameArea.interval = setInterval(() => this.update(), 20);
                this.audioManager.playBGM();
                document.getElementById("audioToggle").textContent = this.audioManager.audioEnabled ? "🔊" : "🔇";
            } else {
                console.error("Images or canvas not ready, delaying start");
                setTimeout(startGame, 1000); // 每秒檢查一次
            }
        };

        // 使用 window.onload 確保所有資源載入後啟動
        window.onload = () => {
            let loadedCount = 0;
            const checkLoad = () => {
                loadedCount++;
                if (loadedCount === 3) {
                    startGame();
                }
            };

            // 設置圖片載入超時
            setTimeout(() => {
                if (loadedCount < 3) {
                    console.error("Image loading timeout, loaded:", loadedCount);
                }
            }, 10000); // 10秒超時

            // 檢查圖片是否已從快取載入
            if (birdImage.complete) checkLoad();
            else birdImage.onload = checkLoad;
            if (pillarImage.complete) checkLoad();
            else pillarImage.onload = checkLoad;
            if (bgImage.complete) checkLoad();
            else bgImage.onload = checkLoad;

            birdImage.onerror = () => console.error("Failed to load bird image");
            pillarImage.onerror = () => console.error("Failed to load pillar image");
            bgImage.onerror = () => console.error("Failed to load background image");
        };
    }

    update() {
        if (this.gameArea.gameOver) return;
        this.gameArea.update();
        this.gameArea.context.clearRect(0, 0, this.gameArea.canvas.width, this.gameArea.canvas.height);
        this.background.update();
        this.pillarManager.update();
        if (this.pillarManager.checkCollision(this.player)) {
            this.gameArea.endGame(this.score.score);
            return;
        }
        this.score.update();
        if (this.player.accelerateHeld) {
            this.player.gravitySpeed -= 0.15;
        }
        this.player.newPos();
        this.player.update();
    }

    restart() {
        this.audioManager.pauseAll();
        this.audioManager.alreadyPlayedGameOver = false;
		document.getElementById("accelerateBtn").style.display = "inline-block";   // 顯示 Jump
		document.getElementById("restartButton").style.display = "none"; 
		document.getElementById("accelerateBtn").disabled = false; 
        this.gameArea.canvas.style.pointerEvents = "auto";
        this.gameArea.gameSpeed = CONSTANTS.INIT_SPEED;
        this.gameArea.nextSpeedUp = CONSTANTS.SPEED_STEP_SCORE;
        this.gameArea.frameNo = 0;
        this.gameArea.gameOver = false;
        this.pillarManager.reset();
        this.background.x = 0;
        this.player = new Player(this.gameArea, this.assetManager);
        this.score = new Score(this.gameArea);
        this.gameArea.clear();
        this.gameArea.interval = setInterval(() => this.update(), 20);
        if (this.audioManager.audioEnabled) {
            this.audioManager.playBGM();
        }
    }

    setupEventListeners() {
        document.addEventListener("keydown", e => {
            switch (e.code) {
                case "KeyA":
                case "ArrowLeft":
                    this.player.speedX = -CONSTANTS.HORIZ_SPEED;
                    break;
                case "KeyD":
                case "ArrowRight":
                    this.player.speedX = CONSTANTS.HORIZ_SPEED;
                    break;
                case "Space":
                    e.preventDefault();
                    this.player.accelerate(this.audioManager);
                    this.player.accelerateHeld = true;
                    break;
            }
        });

        document.addEventListener("keyup", e => {
            if ((e.code === "KeyA" || e.code === "ArrowLeft") && this.player.speedX < 0) {
                this.player.speedX = 0;
            }
            if ((e.code === "KeyD" || e.code === "ArrowRight") && this.player.speedX > 0) {
                this.player.speedX = 0;
            }
            if (e.code === "Space") {
                this.player.accelerateHeld = false;
            }
        });

        const accelBtn = document.getElementById("accelerateBtn");
        if (accelBtn) {
            accelBtn.addEventListener("mousedown", () => {
                this.player.accelerate(this.audioManager);
                this.player.accelerateHeld = true;
            });
            accelBtn.addEventListener("mouseup", () => this.player.accelerateHeld = false);
            accelBtn.addEventListener("mouseleave", () => this.player.accelerateHeld = false);
            accelBtn.addEventListener("touchstart", e => {
                e.preventDefault();
                this.player.accelerate(this.audioManager);
                this.player.accelerateHeld = true;
            });
            accelBtn.addEventListener("touchend", () => this.player.accelerateHeld = false);
        }

        document.getElementById("audioToggle").addEventListener("click", () => {
            this.audioManager.toggleAudio();
        });

        document.getElementById("restartButton").addEventListener("click", () => {
            this.restart();
        });

        this.gameArea.canvas.addEventListener("touchstart", e => {
            e.preventDefault();
            const touchX = e.touches[0].clientX - this.gameArea.canvas.getBoundingClientRect().left;
            const canvasWidth = this.gameArea.canvas.width;
            if (touchX < canvasWidth / 2) {
                this.player.speedX = -CONSTANTS.HORIZ_SPEED;
            } else {
                this.player.speedX = CONSTANTS.HORIZ_SPEED;
            }
        });

        this.gameArea.canvas.addEventListener("touchend", () => {
            this.player.speedX = 0;
        });
    }
}

// 啟動遊戲
const game = new FlappyBirdGame();
game.start();
