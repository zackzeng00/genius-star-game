/**
 * game.js - 游戏主逻辑
 * 
 * 处理游戏状态、用户交互和界面更新
 */

const Game = {
    // 游戏状态
    pieces: [],           // 所有拼块
    selectedPiece: null,  // 当前选中的拼块
    useStar: true,        // 是否使用星形拼块
    gameStarted: false,   // 游戏是否已开始

    // DOM 元素
    boardSvg: null,
    piecesContainer: null,
    statusMessage: null,

    // 拖拽状态
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    dragElement: null,

    // 骰子定义（与 Python 版本一致）
    diceNumbers: [
        [1, 5, 15, 34, 44, 48],
        [2, 4, 7, 8, 9, 11, 16, 17],
        [10, 27, 31],
        [12, 13, 23, 24, 32, 33, 41, 42],
        [18, 22, 39],
        [19, 20, 21, 28, 29, 30],
        [25, 26, 36, 37, 38, 40, 45, 47]
    ],

    /**
     * 初始化游戏
     */
    init() {
        // 获取 DOM 元素
        this.boardSvg = document.getElementById('board-svg');
        this.piecesContainer = document.getElementById('pieces-container');
        this.statusMessage = document.getElementById('status-message');

        // 初始化棋盘
        Board.init();

        // 创建拼块
        this.pieces = Pieces.createAll(this.useStar);

        // 渲染初始状态
        Board.render(this.boardSvg, true);
        this.renderPieces();

        // 绑定事件
        this.bindEvents();

        // 自动开始新游戏
        this.rollDice();
    },

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 游戏控制按钮
        document.getElementById('btn-roll').addEventListener('click', () => this.rollDice());
        document.getElementById('btn-reset').addEventListener('click', () => this.resetGame());
        document.getElementById('btn-solve').addEventListener('click', () => this.autoSolve());
        document.getElementById('btn-check').addEventListener('click', () => this.checkSolution());
        document.getElementById('btn-new-game').addEventListener('click', () => {
            document.getElementById('victory-modal').classList.add('hidden');
            this.rollDice();
        });

        // 拼块操作按钮
        document.getElementById('btn-rotate').addEventListener('click', () => this.rotatePiece());
        document.getElementById('btn-flip').addEventListener('click', () => this.flipPiece());
        document.getElementById('btn-cancel').addEventListener('click', () => this.cancelSelection());

        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        // 棋盘拖放事件
        this.boardSvg.addEventListener('mousemove', (e) => this.handleBoardMouseMove(e));
        this.boardSvg.addEventListener('mouseup', (e) => this.handleBoardMouseUp(e));
        this.boardSvg.addEventListener('mouseleave', (e) => this.handleBoardMouseLeave(e));

        // 触摸事件
        this.boardSvg.addEventListener('touchmove', (e) => this.handleBoardTouchMove(e));
        this.boardSvg.addEventListener('touchend', (e) => this.handleBoardTouchEnd(e));
    },

    /**
     * 旋转当前选中的拼块
     */
    rotatePiece() {
        if (!this.selectedPiece || this.selectedPiece.placed) {
            this.setStatus('请先选中一个拼块');
            return;
        }
        Pieces.rotate(this.selectedPiece);
        this.renderPieces();
        this.setStatus(`🔄 已旋转: ${this.selectedPiece.name}`);
    },

    /**
     * 翻转当前选中的拼块
     */
    flipPiece() {
        if (!this.selectedPiece || this.selectedPiece.placed) {
            this.setStatus('请先选中一个拼块');
            return;
        }
        Pieces.reflect(this.selectedPiece);
        this.renderPieces();
        this.setStatus(`↔️ 已翻转: ${this.selectedPiece.name}`);
    },

    /**
     * 取消选中拼块
     */
    cancelSelection() {
        this.selectedPiece = null;
        this.renderPieces();
        this.setStatus('已取消选择');
    },

    /**
     * 摇骰子 - 生成新谜题
     */
    rollDice() {
        // 随机选择每个骰子的值
        const roll = this.diceNumbers.map(dice => {
            const idx = Math.floor(Math.random() * dice.length);
            return dice[idx];
        });
        roll.sort((a, b) => a - b);

        // 重置游戏状态
        this.resetGame();

        // 设置阻挡位置
        Board.setBlocked(roll);
        this.gameStarted = true;

        // 重新渲染棋盘
        Board.render(this.boardSvg, false);

        this.setStatus(`🎲 骰子结果: [${roll.join(', ')}]`);
    },

    /**
     * 重置游戏
     */
    resetGame() {
        // 重置棋盘
        Board.reset();

        // 重置所有拼块
        this.pieces.forEach(piece => Pieces.reset(piece));
        this.selectedPiece = null;

        // 重新渲染
        Board.render(this.boardSvg, !this.gameStarted);
        this.renderPieces();

        this.setStatus('已重置，可以开始拼图！');
    },

    /**
     * 渲染拼块到选择区域
     */
    renderPieces() {
        this.piecesContainer.innerHTML = '';

        this.pieces.forEach((piece, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'piece-wrapper';
            wrapper.dataset.pieceIndex = index;

            if (piece.placed) {
                wrapper.classList.add('placed');
            }

            if (this.selectedPiece === piece) {
                wrapper.classList.add('selected');
            }

            // 创建 SVG 容器
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'piece-svg');
            svg.setAttribute('viewBox', '-2 -2 4 4');

            // 渲染拼块
            Pieces.render(piece, svg, {
                scale: 0.8,
                offsetX: 0,
                offsetY: 0
            });

            wrapper.appendChild(svg);

            // 点击选择
            wrapper.addEventListener('click', () => this.selectPiece(piece));

            // 拖拽开始
            wrapper.addEventListener('mousedown', (e) => this.startDrag(e, piece));
            wrapper.addEventListener('touchstart', (e) => this.startTouchDrag(e, piece));

            this.piecesContainer.appendChild(wrapper);
        });
    },

    /**
     * 选择拼块
     */
    selectPiece(piece) {
        if (piece.placed) {
            // 如果拼块已放置，先移除
            this.removePlacedPiece(piece);
        }

        this.selectedPiece = piece;
        this.renderPieces();
        this.setStatus(`已选中: ${piece.name}`);
    },

    /**
     * 移除已放置的拼块
     */
    removePlacedPiece(piece) {
        Board.removePiece(piece);
        this.renderBoard();
        this.renderPieces();
    },

    /**
     * 开始拖拽
     */
    startDrag(e, piece) {
        if (piece.placed) return;

        e.preventDefault();
        this.isDragging = true;
        this.selectedPiece = piece;

        // 创建拖拽元素
        this.createDragElement(piece, e.clientX, e.clientY);
    },

    /**
     * 开始触摸拖拽
     */
    startTouchDrag(e, piece) {
        if (piece.placed) return;

        e.preventDefault();
        this.isDragging = true;
        this.selectedPiece = piece;

        const touch = e.touches[0];
        this.createDragElement(piece, touch.clientX, touch.clientY);
    },

    /**
     * 创建拖拽元素
     */
    createDragElement(piece, clientX, clientY) {
        // 移除现有拖拽元素
        if (this.dragElement) {
            this.dragElement.remove();
        }

        // 创建新的拖拽元素
        const dragEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        dragEl.setAttribute('class', 'drag-element');
        dragEl.setAttribute('viewBox', '-2 -2 4 4');
        dragEl.style.cssText = `
            position: fixed;
            width: 100px;
            height: 80px;
            pointer-events: none;
            z-index: 1000;
            opacity: 0.8;
        `;

        Pieces.render(piece, dragEl, { scale: 0.8 });

        document.body.appendChild(dragEl);
        this.dragElement = dragEl;

        this.updateDragPosition(clientX, clientY);

        // 添加全局事件监听
        document.addEventListener('mousemove', this.handleGlobalMouseMove);
        document.addEventListener('mouseup', this.handleGlobalMouseUp);
        document.addEventListener('touchmove', this.handleGlobalTouchMove);
        document.addEventListener('touchend', this.handleGlobalTouchEnd);
    },

    /**
     * 更新拖拽位置
     */
    updateDragPosition(clientX, clientY) {
        if (this.dragElement) {
            this.dragElement.style.left = (clientX - 50) + 'px';
            this.dragElement.style.top = (clientY - 40) + 'px';
        }
    },

    /**
     * 全局鼠标移动
     */
    handleGlobalMouseMove: function (e) {
        if (Game.isDragging) {
            Game.updateDragPosition(e.clientX, e.clientY);
        }
    },

    /**
     * 全局鼠标释放
     */
    handleGlobalMouseUp: function (e) {
        if (Game.isDragging) {
            Game.endDrag(e.clientX, e.clientY);
        }
    },

    /**
     * 全局触摸移动
     */
    handleGlobalTouchMove: function (e) {
        if (Game.isDragging && e.touches.length > 0) {
            e.preventDefault();
            Game.updateDragPosition(e.touches[0].clientX, e.touches[0].clientY);
        }
    },

    /**
     * 全局触摸结束
     */
    handleGlobalTouchEnd: function (e) {
        if (Game.isDragging) {
            const touch = e.changedTouches[0];
            Game.endDrag(touch.clientX, touch.clientY);
        }
    },

    /**
     * 结束拖拽
     */
    endDrag(clientX, clientY) {
        this.isDragging = false;

        // 移除全局事件监听
        document.removeEventListener('mousemove', this.handleGlobalMouseMove);
        document.removeEventListener('mouseup', this.handleGlobalMouseUp);
        document.removeEventListener('touchmove', this.handleGlobalTouchMove);
        document.removeEventListener('touchend', this.handleGlobalTouchEnd);

        // 移除拖拽元素
        if (this.dragElement) {
            this.dragElement.remove();
            this.dragElement = null;
        }

        // 检查是否在棋盘上
        const boardRect = this.boardSvg.getBoundingClientRect();
        if (clientX >= boardRect.left && clientX <= boardRect.right &&
            clientY >= boardRect.top && clientY <= boardRect.bottom) {

            // 转换为 SVG 坐标
            const svgPoint = this.clientToSvg(clientX, clientY);

            // 尝试放置拼块
            this.tryPlacePiece(this.selectedPiece, svgPoint.x, svgPoint.y);
        }

        this.renderPieces();
    },

    /**
     * 客户端坐标转 SVG 坐标
     */
    clientToSvg(clientX, clientY) {
        const svg = this.boardSvg;
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
        return { x: svgP.x, y: svgP.y };
    },

    /**
     * 尝试放置拼块
     */
    tryPlacePiece(piece, x, y) {
        if (!piece || piece.placed) return;

        // 找到最近的有效放置位置
        const shift = Board.findPlacement(piece, x, y);

        if (shift) {
            // 放置拼块
            if (Board.placePiece(piece, shift)) {
                this.renderBoard();
                this.setStatus(`✓ 已放置: ${piece.name}`);

                // 检查是否完成
                if (Board.isComplete()) {
                    this.showVictory();
                }
            }
        } else {
            this.setStatus(`✗ 无法放置在此位置`);
        }
    },

    /**
     * 渲染棋盘（包括已放置的拼块）
     */
    renderBoard() {
        Board.render(this.boardSvg, false);

        // 渲染已放置的拼块
        this.pieces.forEach(piece => {
            if (piece.placed && piece.position) {
                Pieces.renderOnBoard(piece, this.boardSvg, piece.position);
            }
        });
    },

    /**
     * 棋盘鼠标移动
     */
    handleBoardMouseMove(e) {
        // 预览拖拽位置
    },

    /**
     * 棋盘鼠标释放
     */
    handleBoardMouseUp(e) {
        // 放置拼块
    },

    /**
     * 棋盘鼠标离开
     */
    handleBoardMouseLeave(e) {
        // 取消预览
    },

    /**
     * 触摸移动
     */
    handleBoardTouchMove(e) {
        // 触摸预览
    },

    /**
     * 触摸结束
     */
    handleBoardTouchEnd(e) {
        // 触摸放置
    },

    /**
     * 键盘事件处理
     */
    handleKeydown(e) {
        if (!this.selectedPiece || this.selectedPiece.placed) return;

        switch (e.key.toLowerCase()) {
            case 'r':
                // 旋转
                Pieces.rotate(this.selectedPiece);
                this.renderPieces();
                this.setStatus(`🔄 已旋转: ${this.selectedPiece.name}`);
                break;
            case 'f':
                // 翻转
                Pieces.reflect(this.selectedPiece);
                this.renderPieces();
                this.setStatus(`↔ 已翻转: ${this.selectedPiece.name}`);
                break;
            case 'escape':
                // 取消选择
                this.selectedPiece = null;
                this.renderPieces();
                this.setStatus('已取消选择');
                break;
        }
    },

    /**
     * 自动求解
     */
    autoSolve() {
        if (!this.gameStarted) {
            this.setStatus('请先摇骰子开始游戏！');
            return;
        }

        this.setStatus('🔍 正在求解...');

        // 使用 setTimeout 让界面有机会更新
        setTimeout(() => {
            // 重置所有拼块
            this.pieces.forEach(piece => {
                if (piece.placed) {
                    Board.removePiece(piece);
                }
                Pieces.reset(piece);
            });
            Board.reset();

            // 求解
            const solution = Solver.solve(this.pieces, this.useStar);

            if (solution) {
                // 应用解决方案
                this.applySolution(solution);
                this.setStatus('✨ 已找到解决方案！');
            } else {
                this.setStatus('❌ 此谜题无解');
            }
        }, 50);
    },

    /**
     * 应用解决方案
     */
    applySolution(solution) {
        solution.forEach(fit => {
            const piece = this.pieces[fit.pieceIndex];
            piece.triangles = JSON.parse(JSON.stringify(fit.triangles));
            Board.placePiece(piece, fit.shift);
        });

        this.renderBoard();
        this.renderPieces();
    },

    /**
     * 检查解决方案
     */
    checkSolution() {
        if (Board.isComplete()) {
            this.showVictory();
        } else {
            // 计算剩余空位
            let empty = 0;
            for (let i = 0; i < Board.triangles.length; i++) {
                if (!Board.isBlocked(i) && !Board.isOccupied(i)) {
                    empty++;
                }
            }
            this.setStatus(`还有 ${empty} 个空位未填满`);
        }
    },

    /**
     * 显示胜利弹窗
     */
    showVictory() {
        document.getElementById('victory-modal').classList.remove('hidden');
    },

    /**
     * 设置状态消息
     */
    setStatus(message) {
        this.statusMessage.textContent = message;
    }
};

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
