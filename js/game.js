/**
 * game.js - 游戏主逻辑
 * 
 * 处理游戏状态、用户交互和界面更新
 */

const Game = {
    // 游戏状态
    pieces: [],           // 所有拼块
    selectedPiece: null,  // 当前选中的拼块
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
    // 每组是一个骰子的所有可能值
    diceNumbers: [
        [1, 5, 15, 34, 44, 48],           // 骰子1: 6面
        [2, 4, 7, 8, 9, 11, 16, 17],      // 骰子2: 8面
        [10, 27, 31],                      // 骰子3: 3面
        [12, 13, 23, 24, 32, 33, 41, 42], // 骰子4: 8面
        [18, 22, 39],                      // 骰子5: 3面
        [19, 20, 21, 28, 29, 30],         // 骰子6: 6面
        [25, 26, 36, 37, 38, 40, 45, 47]  // 骰子7: 8面
    ],

    // 当前选中的骰子值（每个骰子一个）
    selectedDice: [null, null, null, null, null, null, null],

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

        // 创建拼块（11个，包含两个三联梯形）
        this.pieces = Pieces.createAll();

        // 渲染骰子选择器
        this.renderDiceSelectors();

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
        document.getElementById('btn-apply-dice').addEventListener('click', () => this.applySelectedDice());
        document.getElementById('btn-reset').addEventListener('click', () => this.resetGame());
        document.getElementById('btn-solve').addEventListener('click', () => this.autoSolve());
        document.getElementById('btn-check').addEventListener('click', () => this.checkSolution());
        document.getElementById('btn-new-game').addEventListener('click', () => {
            document.getElementById('victory-modal').classList.add('hidden');
            this.rollDice();
        });

        // 抽屉切换按钮
        document.getElementById('drawer-toggle').addEventListener('click', () => {
            document.getElementById('control-panel').classList.toggle('collapsed');
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
        this.boardSvg.addEventListener('click', (e) => this.handleBoardClick(e));

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
        this.clearPreview();
        this.hidePieceActions();
        this.setStatus('已取消选择');
    },

    /**
     * 渲染骰子选择器
     */
    renderDiceSelectors() {
        const container = document.getElementById('dice-selectors');
        container.innerHTML = '';

        this.diceNumbers.forEach((dice, diceIndex) => {
            const row = document.createElement('div');
            row.className = 'dice-row';

            const label = document.createElement('span');
            label.className = 'dice-label';
            label.textContent = `骰子${diceIndex + 1}:`;
            row.appendChild(label);

            const options = document.createElement('div');
            options.className = 'dice-options';

            dice.forEach(value => {
                const btn = document.createElement('button');
                btn.className = 'dice-option';
                btn.textContent = value;
                btn.dataset.diceIndex = diceIndex;
                btn.dataset.value = value;

                if (this.selectedDice[diceIndex] === value) {
                    btn.classList.add('selected');
                }

                btn.addEventListener('click', () => this.selectDiceValue(diceIndex, value));
                options.appendChild(btn);
            });

            row.appendChild(options);
            container.appendChild(row);
        });
    },

    /**
     * 选择骰子值
     */
    selectDiceValue(diceIndex, value) {
        this.selectedDice[diceIndex] = value;
        this.renderDiceSelectors();
    },

    /**
     * 应用手动选择的骰子
     */
    applySelectedDice() {
        // 检查是否所有骰子都已选择
        const allSelected = this.selectedDice.every(v => v !== null);
        if (!allSelected) {
            this.setStatus('⚠️ 请先选择全部7个骰子的值');
            return;
        }

        // 获取选中的值并排序
        const roll = [...this.selectedDice].sort((a, b) => a - b);

        // 重置游戏状态
        this.resetGame();

        // 设置阻挡位置
        Board.setBlocked(roll);
        this.gameStarted = true;

        // 重新渲染棋盘
        Board.render(this.boardSvg, true);

        this.setStatus(`✓ 手动选择: [${roll.join(', ')}]`);
    },

    /**
     * 摇骰子 - 随机生成新谜题
     */
    rollDice() {
        // 随机选择每个骰子的值
        const roll = this.diceNumbers.map((dice, index) => {
            const idx = Math.floor(Math.random() * dice.length);
            const value = dice[idx];
            this.selectedDice[index] = value;  // 同步更新选中状态
            return value;
        });
        roll.sort((a, b) => a - b);

        // 重置游戏状态
        this.resetGame();

        // 设置阻挡位置
        Board.setBlocked(roll);
        this.gameStarted = true;

        // 更新骰子选择器显示
        this.renderDiceSelectors();

        // 重新渲染棋盘
        Board.render(this.boardSvg, true);

        this.setStatus(`🎲 随机骰子: [${roll.join(', ')}]`);
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
        this.hidePieceActions();

        // 重新渲染
        Board.render(this.boardSvg, true);
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
        this.showPieceActions(piece);
        this.setStatus(`已选中: ${piece.name} - 可旋转/翻转/放回`);
    },

    /**
     * 显示浮动操作面板
     */
    showPieceActions(piece) {
        const actionsEl = document.getElementById('piece-actions');
        actionsEl.classList.remove('hidden');

        // 找到选中拼块的 DOM 元素
        const pieceWrapper = this.piecesContainer.querySelector(`.piece-wrapper[data-piece-index="${piece.index}"]`);
        if (pieceWrapper) {
            const rect = pieceWrapper.getBoundingClientRect();
            // 显示在拼块上方
            actionsEl.style.left = `${rect.left + rect.width / 2 - actionsEl.offsetWidth / 2}px`;
            actionsEl.style.top = `${rect.top - actionsEl.offsetHeight - 10 + window.scrollY}px`;

            // 确保不超出屏幕
            const actionsRect = actionsEl.getBoundingClientRect();
            if (actionsRect.left < 10) {
                actionsEl.style.left = '10px';
            }
            if (actionsRect.right > window.innerWidth - 10) {
                actionsEl.style.left = `${window.innerWidth - actionsEl.offsetWidth - 10}px`;
            }
            if (actionsRect.top < 10) {
                // 如果上方空间不够，显示在下方
                actionsEl.style.top = `${rect.bottom + 10 + window.scrollY}px`;
            }
        }
    },

    /**
     * 隐藏浮动操作面板
     */
    hidePieceActions() {
        document.getElementById('piece-actions').classList.add('hidden');
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
            // Also show preview on board
            const boardRect = Game.boardSvg.getBoundingClientRect();
            if (e.clientX >= boardRect.left && e.clientX <= boardRect.right &&
                e.clientY >= boardRect.top && e.clientY <= boardRect.bottom) {
                const svgPoint = Game.clientToSvg(e.clientX, e.clientY);
                const shift = Board.findPlacement(Game.selectedPiece, svgPoint.x, svgPoint.y);
                if (shift) Game.renderPreview(Game.selectedPiece, shift);
                else Game.clearPreview();
            } else {
                Game.clearPreview();
            }
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

            // Also show preview on board
            const touch = e.touches[0];
            const boardRect = Game.boardSvg.getBoundingClientRect();
            if (touch.clientX >= boardRect.left && touch.clientX <= boardRect.right &&
                touch.clientY >= boardRect.top && touch.clientY <= boardRect.bottom) {
                const svgPoint = Game.clientToSvg(touch.clientX, touch.clientY);
                const shift = Board.findPlacement(Game.selectedPiece, svgPoint.x, svgPoint.y);
                if (shift) Game.renderPreview(Game.selectedPiece, shift);
                else Game.clearPreview();
            } else {
                Game.clearPreview();
            }
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

        this.clearPreview();

        // 检查是否在棋盘上
        const boardRect = this.boardSvg.getBoundingClientRect();
        if (clientX >= boardRect.left && clientX <= boardRect.right &&
            clientY >= boardRect.top && clientY <= boardRect.bottom) {

            // 转换为 SVG 坐标
            const svgPoint = this.clientToSvg(clientX, clientY);

            // 尝试放置拼块
            this.tryPlacePiece(this.selectedPiece, svgPoint.x, svgPoint.y);
        }
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
     * 渲染预览（Ghost Piece）
     */
    renderPreview(piece, shift) {
        this.clearPreview();

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'preview-piece');
        group.style.opacity = '0.4';
        group.style.pointerEvents = 'none'; // Ensure it doesn't block events

        const placedTriangles = Pieces.getPlacedTriangles(piece, shift);

        for (const t of placedTriangles) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', Geometry.trianglePath(t));
            path.setAttribute('fill', piece.color);
            path.setAttribute('stroke', 'white');
            path.setAttribute('stroke-width', '0.05');
            group.appendChild(path);
        }

        this.boardSvg.appendChild(group);
    },

    /**
     * 清除预览
     */
    clearPreview() {
        const existing = this.boardSvg.querySelector('.preview-piece');
        if (existing) {
            existing.remove();
        }
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
                this.selectedPiece = null; // Deselect after placing
                this.renderPieces();
                this.clearPreview();
                this.hidePieceActions();
                this.setStatus(`✓ 已放置: ${piece.name}`);

                // 检查是否完成
                if (Board.isComplete()) {
                    this.showVictory();
                }
            } else {
                this.setStatus(`✗ 放置失败`);
            }
        } else {
            this.setStatus(`✗ 无法放置在此位置`);
        }
    },

    /**
     * 渲染棋盘（包括已放置的拼块）
     */
    renderBoard() {
        Board.render(this.boardSvg, true);

        // 渲染已放置的拼块
        this.pieces.forEach(piece => {
            if (piece.placed && piece.position) {
                const group = Pieces.renderOnBoard(piece, this.boardSvg, piece.position);

                // Add click listener to lift piece
                group.style.cursor = 'pointer';
                group.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent board click
                    this.liftPiece(piece);
                });

                // Add touch listener for mobile tap
                // Note: touchstart bubbles to touchstart on svg (which doesn't place).
                // touchend bubbles to touchend on svg (which places).
                // We need to stop explicit tap-to-lift from triggering place.
                group.addEventListener('touchstart', (e) => {
                    // Start lift logic
                    // If we use click, do we need touchstart? 
                    // Mobile browsers trigger click after tap.
                    // Doing it on click is safer.
                    e.stopPropagation();
                });
            }
        });
    },

    /**
     * 提起已放置的拼块
     */
    liftPiece(piece) {
        if (!piece.placed) return;

        Board.removePiece(piece);
        this.selectedPiece = piece;
        this.renderBoard();
        this.renderPieces();
        this.setStatus(`已提起: ${piece.name} - 可旋转/翻转/移动`);

        // Show Ghost immediately if mouse is there?
        // Hard to know mouse pos here.
    },

    /**
     * 棋盘鼠标移动
     */
    handleBoardMouseMove(e) {
        if (this.selectedPiece && !this.selectedPiece.placed) {
            const svgPoint = this.clientToSvg(e.clientX, e.clientY);
            const shift = Board.findPlacement(this.selectedPiece, svgPoint.x, svgPoint.y);

            if (shift) {
                this.renderPreview(this.selectedPiece, shift);
            } else {
                this.clearPreview();
            }
        }
    },

    /**
     * 棋盘鼠标释放 - No op for placement (moved to click)
     */
    handleBoardMouseUp(e) {
        // We use click for placement now to avoid conflict with lift
    },

    /**
     * 棋盘点击 - New placement handler
     */
    handleBoardClick(e) {
        if (!this.isDragging && this.selectedPiece && !this.selectedPiece.placed) {
            const svgPoint = this.clientToSvg(e.clientX, e.clientY);
            this.tryPlacePiece(this.selectedPiece, svgPoint.x, svgPoint.y);
        }
    },

    /**
     * 棋盘鼠标离开
     */
    handleBoardMouseLeave(e) {
        this.clearPreview();
    },

    /**
     * 触摸移动
     */
    handleBoardTouchMove(e) {
        if (this.selectedPiece && !this.selectedPiece.placed && e.touches.length > 0) {
            e.preventDefault(); // Prevent scroll
            const touch = e.touches[0];
            const svgPoint = this.clientToSvg(touch.clientX, touch.clientY);
            const shift = Board.findPlacement(this.selectedPiece, svgPoint.x, svgPoint.y);

            if (shift) {
                this.renderPreview(this.selectedPiece, shift);
            } else {
                this.clearPreview();
            }
        }
    },

    /**
     * 触摸结束
     */
    handleBoardTouchEnd(e) {
        // If not dragging, try to place
        // Note: touch end might trigger click. 
        // If we handle touchEnd, we might duplicate place.
        // Let's rely on click for placement (so tap -> placement).
        // Standard mobile browsers fire click 300ms after tap.
        // So we can remove this or ensure it doesn't double place.
        // For responsiveness, touchEnd is better.
        // But conflict with Lift is real.
        // Stick to click for unity? Or handle touchEnd carefully.

        if (!this.isDragging && this.selectedPiece && !this.selectedPiece.placed && e.changedTouches.length > 0) {
            // If we trust click event will fire, we can skip this.
            // Or strictly use this and prevent default click.
            // Let's use click for now to match mouse logic fixes.
            // e.preventDefault(); // This would stop click.
            // Let's NOT place here, let Click handle it.
        }
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
                // If over board, update preview immediately? 
                // Hard to get mouse position here without tracking it globally.
                // Just update status. Preview will update on next mouse move.
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
                this.clearPreview();
                this.hidePieceActions();
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
            const solution = Solver.solve(this.pieces);

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
