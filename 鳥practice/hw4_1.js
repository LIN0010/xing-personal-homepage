"use strict";
//聲音
const bgm        = new Audio("bgm.mp3");
const jumpSFX    = new Audio("jump.wav");
const gameoverBGM= new Audio("gameover.mp3");
bgm.loop  = true;
bgm.volume = .5;
jumpSFX.volume = .6;
gameoverBGM.volume = 1;
let audioEnabled = localStorage.getItem("audioEnabled") === "true";
let alreadyPlayedGameOver = false;

//圖片們
const birdImage = new Image();
birdImage.src = "bird.png";
const pillarImage = new Image();
pillarImage.src = "pillar.png";
pillarImage.onload = checkAllAssetsLoaded;
const bgImage = new Image();
bgImage.src = "bg.png";

//左右移動
const HORIZ_SPEED   = 1;

//反彈
const BOUNCE_FACTOR = 0.65;

//柱子
const MIN_PIXEL_GAP   = 180;   //兩組柱子水平最小間距
const MIN_GAP_BETWEEN = 90;    //上、下柱子之間垂直通道最小高度
const MAX_GAP_BETWEEN = 140;   //上、下柱子之間垂直通道最大高度

let alreadySpawnedFirst = false;   //是否已經生出過第一組(防止重疊

//難度設定
const SPEED_STEP_SCORE = 3000;   //每 3000 分升級
const SPEED_DELTA      = 0.5;    //每級速度 +0.5
let   gameSpeed        = 1;      //目前倍率
let   nextSpeedUp      = SPEED_STEP_SCORE;

let accelerateHeld = false;      //是否正在長按

// 圖片載入計數器
let assetsLoaded = 0;
function checkAllAssetsLoaded() {
    assetsLoaded++;
    if (assetsLoaded === 3) {
        startGame();
    }
}

birdImage.onload = checkAllAssetsLoaded;
bgImage.onload = checkAllAssetsLoaded;

let myGamePiece;
let myObstacles = [];
let myScore;
let backgroundX = 0;
let backgroundImage = new Image();
backgroundImage.src = "bg.png";
let gameOver = false;


// 建立遊戲區域
const myGameArea = {
    canvas: document.createElement("canvas"),
    context: null,
    frameNo: 0,
    interval: null,
    start: function () {
        this.canvas.width = 480;
        this.canvas.height = 270;
        this.context = this.canvas.getContext("2d");
        this.context.imageSmoothingEnabled = false;
        document.body.insertBefore(this.canvas, document.body.childNodes[0]);
        this.frameNo = 0;
        this.interval = setInterval(updateGameArea, 20);
    },
    clear: function () {
    }
};

class Component {
    constructor(width, height, color, x, y, type) {
        this.type = type;
        this.color = color;
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
        this.speedX = 0;
        this.speedY = 0;
        this.gravity = 0;
        this.gravitySpeed = 0;

        if (this.type === "player") {
            this.frameIndex = 0;
            this.tickCount = 0;
            this.ticksPerFrame = 5;
            this.numberOfFrames = 6;
        }
    }

    update() {
        const ctx = myGameArea.context;

        if (this.type === "text") {
            ctx.font = this.width + " " + this.height;
            ctx.fillStyle = "#ffcccc";
            ctx.shadowColor = "#ff3300";
            ctx.shadowBlur = 6;
			ctx.textAlign = "left";
            ctx.fillText(this.text, this.x, this.y);
            ctx.shadowBlur = 0;
        }
        else if (this.type === "player") {
            this.tickCount++;
            if (this.tickCount > this.ticksPerFrame) {
                this.tickCount = 0;
                this.frameIndex = (this.frameIndex + 1) % this.numberOfFrames;
            }
            ctx.drawImage(
                birdImage,
                this.frameIndex * this.width, 0,
                this.width, this.height,
                this.x, this.y,
                this.width, this.height
            );
        }
		
		else if (this.type === "pillar") {
			ctx.drawImage(
				pillarImage,
				0, 0, pillarImage.width, pillarImage.height,
				this.x, this.y, this.width, this.height
			);
		}
		
		else {
			ctx.fillStyle = this.color;
			ctx.fillRect(this.x, this.y, this.width, this.height);
		}
	}

	newPos(){
		this.gravitySpeed += this.gravity;

		// 限制速度
		if (this.gravitySpeed > 2.5) this.gravitySpeed = 2.5;
		if (this.gravitySpeed < -2.5) this.gravitySpeed = -2.5;
		
		// 垂直位移
		this.y += this.speedY + this.gravitySpeed;
		
		// 水平位移
		this.x += this.speedX;
		const left  = 0;
		const right = myGameArea.canvas.width - this.width;
		if (this.x < left)  this.x = left;
		if (this.x > right) this.x = right;
		const bottom = myGameArea.canvas.height - this.height;
		const top = 0;
		//反彈		
		if (this.y > bottom) {
			this.y = bottom;
			this.gravitySpeed = -this.gravitySpeed * BOUNCE_FACTOR;
			// 若速度太小就乾脆歸 0，避免抖動
			if (Math.abs(this.gravitySpeed) < 0.5) this.gravitySpeed = 0;
		}
		if (this.y < top) {
			this.y = top;
			this.gravitySpeed = 0;
		}
	}

    hitBottom() {
        const bottom = myGameArea.canvas.height - this.height;
        if (this.y > bottom) {
            this.y = bottom;
            this.gravitySpeed = 0;
        }
        if (this.y < 0) {
            this.y = 0;
            this.gravitySpeed = 0;
        }
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

//畫柱子
function trySpawnPillars() {
  const lastX = myObstacles.length
              ? myObstacles[myObstacles.length - 1].x
              : Infinity;

  if (!alreadySpawnedFirst || lastX < myGameArea.canvas.width - MIN_PIXEL_GAP) {
    const x          = myGameArea.canvas.width;
    const minHeight  = 20;
    const maxHeight  = 140;
    const height     = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);

    //縫隙
    const gap        = Math.floor(Math.random() * (MAX_GAP_BETWEEN - MIN_GAP_BETWEEN + 1) + MIN_GAP_BETWEEN);
    const bottomH    = myGameArea.canvas.height - height - gap;
    if (bottomH > 0) {
      
	  // 上方柱子
      myObstacles.push(new Component(30, height,  "", x, 0,              "pillar"));
      
	  // 下方柱子
      myObstacles.push(new Component(30, bottomH, "", x, height + gap,  "pillar"));
      alreadySpawnedFirst = true;   // 記錄已經有第一組
    }
  }
}

// 初始化遊戲
function startGame() {
    myGamePiece = new Component(32, 25.5, "", 10, 120, "player");
    myGamePiece.gravity = 0.04;
    myScore = new Component("30px", "Courier New", "#ffcccc", 20, 50, "text");
    myGameArea.start();
	myObstacles.length = 0;     // 清空上一局遺留的柱子
	alreadySpawnedFirst = false;// 讓新的一局重新再生成第一組柱子
	document.getElementById("audioToggle").textContent = audioEnabled ? "🔊" : "🔇";
	if (audioEnabled) {
    bgm.currentTime = 0;
    bgm.play().catch(()=>{});   // 已授權就直接播
	}
}

// 每幀更新邏輯
function updateGameArea() {
	let ctx = myGameArea.context;
	
	// 背景滾動
	backgroundX -= gameSpeed;
	if (backgroundX <= -myGameArea.canvas.width) {
		backgroundX = 0;
	}

	//畫出背景圖
	ctx.drawImage(backgroundImage, backgroundX, 0, myGameArea.canvas.width, myGameArea.canvas.height);
	ctx.drawImage(backgroundImage, backgroundX + myGameArea.canvas.width, 0, myGameArea.canvas.width, myGameArea.canvas.height);
	
	//Game Over
	for (let i = 0; i < myObstacles.length; i++) {
		if (myGamePiece.crashWith(myObstacles[i])) {
			clearInterval(myGameArea.interval);
			const ctx = myGameArea.context;

			ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
			ctx.fillRect(0, 0, myGameArea.canvas.width, myGameArea.canvas.height);

			ctx.font = "bold 50px Consolas";
			ctx.fillStyle = "red";
			ctx.textAlign = "center";
			ctx.shadowColor = "black";
			ctx.shadowBlur = 10;
			ctx.fillText("GAME OVER", myGameArea.canvas.width / 2, myGameArea.canvas.height / 2 - 40);
			
			//音樂切換
			if (audioEnabled && !alreadyPlayedGameOver) {  // 只進來一次
				alreadyPlayedGameOver = true;
				bgm.pause();
				gameoverBGM.currentTime = 0;
				gameoverBGM.play();
			}
			ctx.font = "28px Consolas";
			ctx.fillText("Final Score: " + (myGameArea.frameNo - 1), myGameArea.canvas.width / 2, myGameArea.canvas.height / 2);
			document.getElementById("restartWrap").style.display = "block";
			document.getElementById("buttonGroup").style.display = "none";
			myGameArea.canvas.style.pointerEvents = "none";
			document.getElementById("restartButton")
					.addEventListener("click", restartGame);
			document.getElementById("accelerateBtn").disabled = true; //鎖加速

			// 顯示重新開始按鈕
			const restartButton = document.getElementById("restartButton");
			if (restartButton) restartButton.style.display = "block";
			return;
		}
	}
    myGameArea.frameNo += 1;
	
	//破關變速
	if (myGameArea.frameNo >= nextSpeedUp) {
    gameSpeed   += SPEED_DELTA;
    nextSpeedUp += SPEED_STEP_SCORE;
    // console.log("速度上升", gameSpeed);   //測試
	}
		trySpawnPillars();
    for (let i = 0; i < myObstacles.length; i++) {
        myObstacles[i].x -= gameSpeed;
        myObstacles[i].update();
    }
    myScore.text = "SCORE: " + myGameArea.frameNo;
    myScore.update();	
	if (accelerateHeld) {
    myGamePiece.gravitySpeed -= 0.15; //推力大小
	}
    myGamePiece.newPos();
    myGamePiece.update();
}

//按住加速
function accelerate() {
    myGamePiece.gravitySpeed -= 0.25;
    if (myGamePiece.gravitySpeed < -2.5)  myGamePiece.gravitySpeed = -2.5; // 上限
    if (audioEnabled){
        jumpSFX.currentTime = 0;
        jumpSFX.play();
    }
}

//左右移動,空白鍵功能等同按鈕
document.addEventListener("keydown", e => {
  switch (e.code) {
    case "KeyA":
    case "ArrowLeft":
      myGamePiece.speedX = -HORIZ_SPEED;
      break;
    case "KeyD":
    case "ArrowRight":
      myGamePiece.speedX =  HORIZ_SPEED;
      break;
	case "Space":
		e.preventDefault();         //不捲動頁面
		accelerate();
		accelerateHeld = true;
		break;
  }
});

document.addEventListener("keyup", e => {
  if ((e.code === "KeyA" || e.code === "ArrowLeft")  && myGamePiece.speedX < 0)
      myGamePiece.speedX = 0;
  if ((e.code === "KeyD" || e.code === "ArrowRight") && myGamePiece.speedX > 0)
      myGamePiece.speedX = 0;
  if (e.code === "Space") accelerateHeld = false;
});

//長按
const accelBtn = document.getElementById("accelerateBtn");
if (accelBtn) {
    accelBtn.addEventListener("mousedown", () => { accelerate(); accelerateHeld = true; });
    accelBtn.addEventListener("mouseup"  , () => accelerateHeld = false);
    accelBtn.addEventListener("mouseleave", () => accelerateHeld = false);
    accelBtn.addEventListener("touchstart", () => { accelerate(); accelerateHeld = true; });  // 手機
    accelBtn.addEventListener("touchend"  , () => accelerateHeld = false);
}

//音量開關
document.getElementById("audioToggle").addEventListener("click", () => {
    if (!audioEnabled) {              // 現在靜音 → 開啟
        audioEnabled = true;
        bgm.currentTime = 0;
        bgm.play();
    } else {                          // 現在有聲 → 關閉
        audioEnabled = false;
        bgm.pause();
        gameoverBGM.pause();
    }
    
	// 更新圖示 & 記憶
    document.getElementById("audioToggle").textContent = audioEnabled ? "🔊" : "🔇";
    localStorage.setItem("audioEnabled", audioEnabled);
});
/* ---------------------------------------------------------- */

function restartGame(){
	
	//停gameover聲音
	bgm.pause(); gameoverBGM.pause(); gameoverBGM.currentTime = 0;
	alreadyPlayedGameOver = false;
	
	//介面恢復
	document.getElementById("restartWrap").style.display = "none";
	document.getElementById("buttonGroup").style.display = "flex";
	document.getElementById("accelerateBtn").disabled    = false;
	myGameArea.canvas.style.pointerEvents = "auto";

	//重置變數
	gameSpeed = 1; nextSpeedUp = SPEED_STEP_SCORE;
	myObstacles.length = 0; alreadySpawnedFirst = false;
	backgroundX = 0; myGameArea.frameNo = 0;

	//重建角色
	myGamePiece = new Component(32,25.5,"",10,120,"player");
	myScore = new Component("30px", "Courier New", "#ffcccc", 20, 50, "text");
	myGamePiece.gravity = 0.04;

	//重新跑迴圈
	clearInterval(myGameArea.interval);
	myGameArea.interval = setInterval(updateGameArea,20);
	
	//紀錄聲音按鈕
	if (audioEnabled){ bgm.currentTime = 0; bgm.play(); }
}
