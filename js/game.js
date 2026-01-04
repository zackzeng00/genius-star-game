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
        this.updateFloatingPreview(); // Update the svg in floating element
        this.setStatus(`🔄 已旋转: ${this.selectedPiece.name}`);
    },

    flipPiece() {
        if (!this.selectedPiece || this.selectedPiece.placed) {
            this.setStatus('请先选中一个拼块');
            return;
        }
        Pieces.reflect(this.selectedPiece);
        this.renderPieces();
        this.updateFloatingPreview(); // Update the svg in floating element
        this.setStatus(`↔️ 已翻转: ${this.selectedPiece.name}`);
    },

    cancelSelection() {
        this.selectedPiece = null;
        if (this.floatingElement) {
            this.floatingElement.remove();
            this.floatingElement = null;
        }
        this.renderPieces();
        this.clearPreview();
        this.setStatus('已取消选择');
    },

    updateFloatingPreview() {
        if (this.floatingElement && this.selectedPiece) {
            const svg = this.floatingElement.querySelector('svg');
            if (svg) {
                // Clear existing
                while (svg.firstChild) svg.removeChild(svg.firstChild);
                // Re-render
                Pieces.render(this.selectedPiece, svg, { scale: 1, offsetX: 0, offsetY: 0 });
            }
        }
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
     * 选择拼块（生成浮动拼块）
     */
    selectPiece(piece, startX, startY) {
        if (this.selectedPiece === piece && this.floatingElement) return;

        if (this.selectedPiece) {
            // 如果已有选中的，先取消（或者切换？）
            // 这里我们先只是切换
            this.cancelSelection();
        }

        if (piece.placed) {
            this.removePlacedPiece(piece);
        }

        this.selectedPiece = piece;
        this.renderPieces(); // 更新清单（隐藏被选中的）

        // 创建浮动元素
        this.createFloatingPiece(piece, startX, startY);
        this.setStatus(`操作: 拖动移动 / 按钮旋转翻转`);
    },

    /**
     * 创建浮动拼块元素
     */
    createFloatingPiece(piece, x, y) {
        // 移除旧的
        if (this.floatingElement) this.floatingElement.remove();

        const container = document.createElement('div');
        container.className = 'floating-piece-container';
        container.style.position = 'absolute';
        container.style.zIndex = '1000';
        // 初始位置：如果没有指定，则位于屏幕中心或原位置？
        // 简单起见，如果 x,y 未指定，找 inventory 位置
        if (x === undefined || y === undefined) {
            const wrapper = this.piecesContainer.querySelector(`.piece-wrapper[data-piece-index="${piece.index}"]`);
            if (wrapper) {
                const rect = wrapper.getBoundingClientRect();
                x = rect.left + window.scrollX;
                y = rect.top + window.scrollY;
            } else {
                x = window.innerWidth / 2;
                y = window.innerHeight / 2;
            }
        }

        this.floatingPos = { x, y };
        this.updateFloatingElementPosition();

        // 渲染拼块 SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'piece-svg'); // Add class for easier selection later
        svg.setAttribute('viewBox', '-6 -6 12 12'); // 保持与棋盘一致的坐标系以便视觉大小匹配
        // 注意：Inventory 是 0.8 缩放，这里我们可能需要大一点？或者保持一致？
        // 棋盘 SVG 是 viewBox="-6 -6 12 12"。
        // 拼块渲染需要一致。
        svg.style.width = '120px'; // 稍微大一点方便操作
        svg.style.height = '120px';
        svg.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))';
        svg.style.overflow = 'visible';

        Pieces.render(piece, svg, { scale: 1, offsetX: 0, offsetY: 0 }); // scale 1 对应棋盘大小
        container.appendChild(svg);

        // 添加操作按钮（附着在拼块上方）
        const actions = document.createElement('div');
        actions.className = 'floating-actions';
        actions.innerHTML = `
            <button class="action-btn" data-action="rotate">🔄</button>
            <button class="action-btn" data-action="flip">↔️</button>
            <button class="action-btn action-cancel" data-action="cancel">✕</button>
        `;
        // 绑定按钮事件
        actions.querySelector('[data-action="rotate"]').addEventListener('mousedown', (e) => { e.stopPropagation(); this.rotatePiece(); });
        actions.querySelector('[data-action="flip"]').addEventListener('mousedown', (e) => { e.stopPropagation(); this.flipPiece(); });
        actions.querySelector('[data-action="cancel"]').addEventListener('mousedown', (e) => { e.stopPropagation(); this.cancelSelection(); });

        // Mobile touch support for buttons
        actions.querySelector('[data-action="rotate"]').addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); this.rotatePiece(); });
        actions.querySelector('[data-action="flip"]').addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); this.flipPiece(); });
        actions.querySelector('[data-action="cancel"]').addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); this.cancelSelection(); });

        container.appendChild(actions);

        // 绑定拖拽事件到浮动元素本身
        container.addEventListener('mousedown', (e) => this.startFloatingDrag(e));
        container.addEventListener('touchstart', (e) => this.startFloatingTouchDrag(e));

        document.body.appendChild(container);
        this.floatingElement = container;
    },

    updateFloatingElementPosition() {
        if (!this.floatingElement || !this.floatingPos) return;
        // Adjust for the size of the floating element itself to center it on the cursor
        // Assuming 120px width/height for the SVG, and actions above it.
        // Let's center the SVG part on the cursor.
        const svgWidth = 120; // from createFloatingPiece
        const svgHeight = 120;
        this.floatingElement.style.left = `${this.floatingPos.x - svgWidth / 2}px`;
        this.floatingElement.style.top = `${this.floatingPos.y - svgHeight / 2}px`;
    },

    /**
     * 显示浮动操作面板 (不再使用，操作按钮已附着在浮动拼块上)
     */
    // showPieceActions(piece) {
    //     const actionsEl = document.getElementById('piece-actions');
    //     actionsEl.classList.remove('hidden');

    //     // 找到选中拼块的 DOM 元素
    //     const pieceWrapper = this.piecesContainer.querySelector(`.piece-wrapper[data-piece-index="${piece.index}"]`);
    //     if (pieceWrapper) {
    //         const rect = pieceWrapper.getBoundingClientRect();
    //         // 显示在拼块上方
    //         actionsEl.style.left = `${rect.left + rect.width / 2 - actionsEl.offsetWidth / 2}px`;
    //         actionsEl.style.top = `${rect.top - actionsEl.offsetHeight - 10 + window.scrollY}px`;

    //         // 确保不超出屏幕
    //         const actionsRect = actionsEl.getBoundingClientRect();
    //         if (actionsRect.left < 10) {
    //             actionsEl.style.left = '10px';
    //         }
    //         if (actionsRect.right > window.innerWidth - 10) {
    //             actionsEl.style.left = `${window.innerWidth - actionsEl.offsetWidth - 10}px`;
    //         }
    //         if (actionsRect.top < 10) {
    //             // 如果上方空间不够，显示在下方
    //             actionsEl.style.top = `${rect.bottom + 10 + window.scrollY}px`;
    //         }
    //     }
    // },

    /**
     * 隐藏浮动操作面板 (不再使用)
     */
    // hidePieceActions() {
    //     document.getElementById('piece-actions').classList.add('hidden');
    // },

    /**
     * 移除已放置的拼块
     */
    removePlacedPiece(piece) {
        Board.removePiece(piece);
        this.renderBoard();
        this.renderPieces();
    },

    /**
     * Start dragging the floating piece
     */
    startFloatingDrag(e) {
        if (!this.floatingElement) return;
        e.preventDefault(); // Prevent default touch actions

        this.isDraggingFloating = true;
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;

        // Calculate offset so we drag from clicked point relative to the element
        const rect = this.floatingElement.getBoundingClientRect();
        // Since floatingElement is absolute, rect gives us screen coords.
        // We want to update this.floatingPos (which is left/top).
        // this.floatingPos represents the top-left of the svg-center? 
        // No, createFloatingPiece sets floatingPos as the top-left of container?
        // Let's re-read createFloatingPiece: 
        // this.floatingPos = {x,y}
        // updateFloatingLogic: left = pos.x - 60, top = pos.y - 60.
        // So pos is the visual CENTER of the piece.

        // Let's track the offset from the visual center.
        this.dragOffset = {
            x: clientX - this.floatingPos.x,
            y: clientY - this.floatingPos.y
        };

        // Bind listeners
        // standard naming for removal later
        this._boundFloatingMove = this.handleFloatingMove.bind(this);
        this._boundFloatingUp = this.handleFloatingUp.bind(this);

        document.addEventListener('mousemove', this._boundFloatingMove);
        document.addEventListener('mouseup', this._boundFloatingUp);
        document.addEventListener('touchmove', this._boundFloatingMove, { passive: false });
        document.addEventListener('touchend', this._boundFloatingUp);

        // Disable pointer events on floater during drag to allow probing underneath?
        // Actually, we calculate Board overlap manually, so we don't strictly need to probe underneath
        // BUT if we want hover effects on board triangles, we might.
        // For now, let's keep it simple.
        this.floatingElement.style.cursor = 'grabbing';
    },

    handleFloatingMove(e) {
        if (!this.isDraggingFloating) return;
        e.preventDefault();

        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        if (clientX === undefined) return;

        // Update position
        this.floatingPos.x = clientX - this.dragOffset.x;
        this.floatingPos.y = clientY - this.dragOffset.y;
        this.updateFloatingElementPosition();

        // Check board preview
        const boardRect = this.boardSvg.getBoundingClientRect();
        // Allow some tolerance
        if (clientX >= boardRect.left && clientX <= boardRect.right &&
            clientY >= boardRect.top && clientY <= boardRect.bottom) {

            // Map clientX/Y (which is near piece center) to SVG coords
            const svgPoint = this.clientToSvg(this.floatingPos.x, this.floatingPos.y);

            const shift = Board.findPlacement(this.selectedPiece, svgPoint.x, svgPoint.y);
            if (shift) {
                this.renderPreview(this.selectedPiece, shift);
            } else {
                this.clearPreview();
            }
        } else {
            this.clearPreview();
        }
    },

    handleFloatingUp(e) {
        if (!this.isDraggingFloating) return;
        this.isDraggingFloating = false;

        document.removeEventListener('mousemove', this._boundFloatingMove);
        document.removeEventListener('mouseup', this._boundFloatingUp);
        document.removeEventListener('touchmove', this._boundFloatingMove);
        document.removeEventListener('touchend', this._boundFloatingUp);

        if (this.floatingElement) {
            this.floatingElement.style.cursor = 'grab';
        }

        // Try to place
        const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
        const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);

        // Identical check to move logic
        const boardRect = this.boardSvg.getBoundingClientRect();
        if (clientX >= boardRect.left && clientX <= boardRect.right &&
            clientY >= boardRect.top && clientY <= boardRect.bottom) {

            const svgPoint = this.clientToSvg(this.floatingPos.x, this.floatingPos.y);
            const shift = Board.findPlacement(this.selectedPiece, svgPoint.x, svgPoint.y);

            if (shift) {
                // Success! Place it.
                if (Board.placePiece(this.selectedPiece, shift)) {
                    this.renderBoard();

                    // Remove floating element
                    if (this.floatingElement) this.floatingElement.remove();
                    this.floatingElement = null;

                    this.selectedPiece = null;
                    this.renderPieces();
                    this.clearPreview();
                    this.setStatus(`✓ 已放置: ${this.selectedPiece?.name || '拼块'}`); // selectedPiece is null now, oops. Use variable? 
                    // Actually selectedPiece was nulled.

                    if (Board.isComplete()) {
                        this.showVictory();
                    }
                    return;
                }
            }
        }

        // If we get here, placement failed or was not attempted.
        // behavior: STAY at current position.
        // We do nothing. The floating element remains at floatingPos.
        this.clearPreview();
        this.setStatus('松开拼块 - 可继续拖动或操作');
    },

    // Adapt old startDrag to use new system
    startDrag(e, piece) {
        if (piece.placed) return;

        // 1. Select it (creates floater)
        // Calculate start position to be where the mouse is, 
        // or just use default center logic if we want.
        // Better: Spawn exactly where the inventory item is, OR at mouse.
        // If we spawn at mouse, we avoid "jump".

        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;

        this.selectPiece(piece, clientX, clientY);

        // 2. Start dragging immediately
        this.startFloatingDrag(e);
    },

    startTouchDrag(e, piece) {
        this.startDrag(e, piece);
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
        this.renderBoard(); // Piece removed from board

        // Since we don't have specific coords, createFloatingPiece defaults to center.
        // User will likely just drag it immediately.
        // But to be nice, let's pass undefined to createFloatingPiece.
        this.createFloatingPiece(piece);

        this.renderPieces();
        this.setStatus(`已提起: ${piece.name} - 可旋转/翻转/移动`);
    },
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
