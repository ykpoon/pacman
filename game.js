// ============================================================================
// 指數吃豆人：跨平台終極挑戰 (Indices PAC-MAN Ultimate) - 核心遊戲引擎
// ============================================================================

// 1. 關卡與題庫設定 (Level 1 為公式運算，Level 2 加入負指數與零指數)
const QUESTIONS = {
    1: [
        { q: "a^2 \\times a^3", options: ["a^5", "a^6", "a^1", "a^8"], ans: "a^5" },
        { q: "x^8 \\div x^2", options: ["x^6", "x^4", "x^{10}", "x^{16}"], ans: "x^6" },
        { q: "(y^3)^4", options: ["y^{12}", "y^7", "y^1", "y^{81}"], ans: "y^{12}" },
        { q: "a^5 \\times a", options: ["a^6", "a^5", "a^4", "a^7"], ans: "a^6" },
        { q: "(ab)^3", options: ["a^3b^3", "a^3b", "ab^3", "a^3b^4"], ans: "a^3b^3" },
        { q: "m^7 \\div m^6", options: ["m", "m^{13}", "1", "m^6"], ans: "m" },
        { q: "(k^2)^5 \\times k^3", options: ["k^{13}", "k^{10}", "k^{30}", "k^8"], ans: "k^{13}" },
        { q: "(x^2y)^3", options: ["x^6y^3", "x^5y^3", "x^6y", "x^2y^3"], ans: "x^6y^3" },
        { q: "p^{10} \\div (p^2)^3", options: ["p^4", "p^8", "p^5", "p^6"], ans: "p^4" },
        { q: "(x^3 \\div x)^2", options: ["x^4", "x^5", "x^6", "x^2"], ans: "x^4" }
    ],
    2: [
        { q: "a^0", options: ["1", "a", "0", "-1"], ans: "1" },
        { q: "x^{-3}", options: ["1/x^3", "-x^3", "-3x", "1/x^{-3}"], ans: "1/x^3" },
        { q: "x^2 \\times x^{-5}", options: ["1/x^3", "x^7", "x^{-10}", "1/x^{-3}"], ans: "1/x^3" },
        { q: "(y^{-2})^3", options: ["1/y^6", "y^6", "y^{-5}", "1/y^5"], ans: "1/y^6" },
        { q: "a^4 \\div a^4", options: ["1", "a", "a^8", "0"], ans: "1" },
        { q: "(2a)^{-1}", options: ["1/(2a)", "2/a", "-2a", "1/2a^{-1}"], ans: "1/(2a)" },
        { q: "3x^0", options: ["3", "1", "0", "3x"], ans: "3" },
        { q: "x^{-2} \\div x^3", options: ["1/x^5", "1/x", "x", "x^5"], ans: "1/x^5" },
        { q: "(a^{-1}b^2)^2", options: ["b^4/a^2", "a^2b^4", "b^4/a", "1/(a^2b^4)"], ans: "b^4/a^2" },
        { q: "(x^2 \\cdot x^0)^{-3}", options: ["1/x^6", "1/x^5", "x^6", "1"], ans: "1/x^6" }
    ]
};

// 2. 地圖設定 (13x13 經典迷宮網格，1=牆壁, 0=通道, 2=吃豆人起點)
const MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,1],
    [1,0,0,0,1,1,0,1,1,0,0,0,1],
    [1,1,1,0,1,0,0,0,1,0,1,1,1],
    [1,0,0,0,1,0,2,0,1,0,0,0,1],
    [1,1,1,0,1,1,1,1,1,0,1,1,1],
    [1,0,0,0,1,0,0,0,1,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,1,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const TILE_SIZE = 40; // 520 px 寬高 (13 * 40 px)

// 3. 遊戲狀態與角色實體
let currentLevel = 1;
let currentQuestionIndex = 0;
let score = 0;
let lives = 3;
let gameOver = false;
let gameInterval = null;
let player = null;
let ghosts = [];
const ghostColors = ["#ff0000", "#ffb8ff", "#00ffff", "#ffb852"]; // 幽靈專用霓虹色

// 吃豆人類別 (Pacman)
class Pacman {
    constructor(gridX, gridY) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.x = gridX * TILE_SIZE + TILE_SIZE / 2;
        this.y = gridY * TILE_SIZE + TILE_SIZE / 2;
        this.radius = 16;
        this.speed = 3;
        this.dirX = 0;
        this.dirY = 0;
        this.nextDirX = 0;
        this.nextDirY = 0;
        this.angle = 0.2; // 嘴巴開合動畫
        this.mouthClosing = false;
    }

    update() {
        const currentTargetX = this.gridX * TILE_SIZE + TILE_SIZE / 2;
        const currentTargetY = this.gridY * TILE_SIZE + TILE_SIZE / 2;
        const distanceToCenter = Math.sqrt((this.x - currentTargetX)**2 + (this.y - currentTargetY)**2);
        
        if (distanceToCenter < this.speed) {
            this.x = currentTargetX;
            this.y = currentTargetY;

            // 如果有預輸入的方向且前方沒有牆壁，則執行轉彎
            if (this.canMove(this.nextDirX, this.nextDirY)) {
                this.dirX = this.nextDirX;
                this.dirY = this.nextDirY;
            } else if (!this.canMove(this.dirX, this.dirY)) {
                this.dirX = 0;
                this.dirY = 0;
            }

            this.gridX += this.dirX;
            this.gridY += this.dirY;
        }

        this.x += this.dirX * this.speed;
        this.y += this.dirY * this.speed;

        // 嘴巴開合動畫邏輯
        if (this.mouthClosing) {
            this.angle -= 0.02;
            if (this.angle <= 0.05) this.mouthClosing = false;
        } else {
            this.angle += 0.02;
            if (this.angle >= 0.25) this.mouthClosing = true;
        }
    }

    canMove(dx, dy) {
        const nextGridX = this.gridX + dx;
        const nextGridY = this.gridY + dy;
        if (nextGridX < 0 || nextGridX >= MAP[0].length || nextGridY < 0 || nextGridY >= MAP.length) return false;
        return MAP[nextGridY][nextGridX] !== 1;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 旋轉吃豆人的嘴巴方向
        let rotation = 0;
        if (this.dirX === 1) rotation = 0;
        else if (this.dirX === -1) rotation = Math.PI;
        else if (this.dirY === 1) rotation = Math.PI / 2;
        else if (this.dirY === -1) rotation = -Math.PI / 2;
        ctx.rotate(rotation);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, this.angle * Math.PI, (2 - this.angle) * Math.PI);
        ctx.lineTo(0, 0);
        ctx.fillStyle = '#ffea00';
        ctx.fill();
        ctx.closePath();

        // 畫眼睛
        ctx.beginPath();
        ctx.arc(2, -8, 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.closePath();

        ctx.restore();
    }
}

// 幽靈類別 (Ghost)
class Ghost {
    constructor(gridX, gridY, color, label, isCorrect) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.x = gridX * TILE_SIZE + TILE_SIZE / 2;
        this.y = gridY * TILE_SIZE + TILE_SIZE / 2;
        this.radius = 16;
        this.speed = 1.5;
        this.color = color;
        this.label = label;
        this.isCorrect = isCorrect;
        this.dirX = 0;
        this.dirY = -1;
    }

    update() {
        const currentTargetX = this.gridX * TILE_SIZE + TILE_SIZE / 2;
        const currentTargetY = this.gridY * TILE_SIZE + TILE_SIZE / 2;
        const distanceToCenter = Math.sqrt((this.x - currentTargetX)**2 + (this.y - currentTargetY)**2);

        if (distanceToCenter < this.speed) {
            this.x = currentTargetX;
            this.y = currentTargetY;

            // 尋求路徑方向分支
            const directions = [
                {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}
            ];
            
            const validDirs = directions.filter(d => {
                const nextGridX = this.gridX + d.x;
                const nextGridY = this.gridY + d.y;
                if (nextGridX < 0 || nextGridX >= MAP[0].length || nextGridY < 0 || nextGridY >= MAP.length) return false;
                if (MAP[nextGridY][nextGridX] === 1) return false;
                if (d.x === -this.dirX && d.y === -this.dirY) return false; // 優先不往反向走
                return true;
            });

            let chosenDir = null;
            if (validDirs.length > 0) {
                chosenDir = validDirs[Math.floor(Math.random() * validDirs.length)];
            } else {
                chosenDir = { x: -this.dirX, y: -this.dirY };
            }

            this.dirX = chosenDir.x;
            this.dirY = chosenDir.y;
            this.gridX += this.dirX;
            this.gridY += this.dirY;
        }

        this.x += this.dirX * this.speed;
        this.y += this.dirY * this.speed;
    }

    draw(ctx) {
        ctx.save();
        
        // 1. 繪製幽靈裙擺身體
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y - 2, this.radius, Math.PI, 0, false);
        ctx.lineTo(this.x + this.radius, this.y + this.radius);
        const waveY = this.y + this.radius;
        const waveStep = (this.radius * 2) / 3;
        ctx.lineTo(this.x + this.radius - waveStep * 0.5, waveY - 4);
        ctx.lineTo(this.x + this.radius - waveStep, waveY);
        ctx.lineTo(this.x - this.radius + waveStep, waveY - 4);
        ctx.lineTo(this.x - this.radius, waveY);
        ctx.lineTo(this.x - this.radius, this.y - 2);
        ctx.fill();
        ctx.closePath();

        // 2. 大白眼與轉動眼珠
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x - 6, this.y - 4, 4.5, 0, 2 * Math.PI);
        ctx.arc(this.x + 6, this.y - 4, 4.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();

        ctx.fillStyle = '#00f';
        ctx.beginPath();
        const pupilDx = this.dirX * 2;
        const pupilDy = this.dirY * 2;
        ctx.arc(this.x - 6 + pupilDx, this.y - 4 + pupilDy, 2, 0, 2 * Math.PI);
        ctx.arc(this.x + 6 + pupilDx, this.y - 4 + pupilDy, 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();

        // 3. 繪製帶有圓角的答案對話泡框 (高對比好辨識)
        ctx.font = "bold 13px Arial";
        const cleanText = this.label.replace(/\\/g, "\\");
        const textWidth = ctx.measureText(cleanText).width;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        
        const boxW = textWidth + 14;
        const boxH = 20;
        const boxX = this.x - boxW / 2;
        const boxY = this.y - this.radius - 22;
        
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 6);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();

        // 將 LaTeX 上標等格式簡化轉換成好讀的 unicode 字元
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const displayLabel = formatLatexToUnicode(this.label);
        ctx.fillText(displayLabel, this.x, boxY + boxH / 2);

        ctx.restore();
    }
}

// 輔助函數：將分數上標格式（a^5 -> a⁵）對應成高解析的字體顯示在畫布上
function formatLatexToUnicode(str) {
    if (!str) return "";
    let res = str;
    res = res.replace(/\^/g, '^');
    res = res.replace(/[{}]/g, '');
    
    const superscripts = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', 
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
        '-': '⁻', 'a': 'ᵃ', 'b': 'ᵇ', 'n': 'ⁿ', 'm': 'ᵐ'
    };
    
    if (res.includes('^')) {
        const parts = res.split('^');
        let base = parts[0];
        let power = parts[1];
        let unicodePower = "";
        for (let char of power) {
            unicodePower += superscripts[char] || char;
        }
        return base + unicodePower;
    }
    return res;
}

// 4. 核心功能：讀取新題目並生成幽靈
function loadQuestion() {
    const qList = QUESTIONS[currentLevel];
    if (currentQuestionIndex >= qList.length) {
        if (currentLevel === 1) {
            showOverlay('nextLevelOverlay');
        } else {
            showOverlay('victoryOverlay');
        }
        if (gameInterval) clearInterval(gameInterval);
        return;
    }

    const curQ = qList[currentQuestionIndex];
    
    // 更新網頁中的題目與進度條
    document.getElementById('questionText').innerText = formatLatexToUnicode(curQ.q);
    document.getElementById('progressText').innerText = `${currentQuestionIndex} / ${qList.length}`;
    document.getElementById('progressBar').style.width = `${(currentQuestionIndex / qList.length) * 100}%`;

    // 每次重置吃豆人在地圖正中心
    player = new Pacman(6, 6);

    // 在迷宮 4 個角落擺放攜帶答案的幽靈
    ghosts = [];
    const spawnPositions = [
        {x: 1, y: 1}, {x: 11, y: 1}, {x: 1, y: 11}, {x: 11, y: 11}
    ];

    // 打亂答案選項排序
    const shuffledOptions = [...curQ.options].sort(() => Math.random() - 0.5);

    for (let i = 0; i < 4; i++) {
        const pos = spawnPositions[i];
        const opt = shuffledOptions[i];
        const isCorrect = (opt === curQ.ans);
        ghosts.push(new Ghost(pos.x, pos.y, ghostColors[i], opt, isCorrect));
    }
}

// 5. 遊戲全域控制
function startGame(level) {
    currentLevel = level;
    currentQuestionIndex = 0;
    score = 0;
    lives = 3;
    gameOver = false;

    // UI 設定
    document.getElementById('levelBadge').innerText = `Level ${level}`;
    document.getElementById('scoreVal').innerText = score;
    updateLivesUI();
    hideAllOverlays();
    
    loadQuestion();

    // 啟動每秒 60 幀渲染畫布的主循環
    const canva
