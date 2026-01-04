/**
 * board.js - 棋盘逻辑
 * 
 * 处理星形棋盘的渲染和状态管理
 */

const Board = {
    // 棋盘上的所有三角形（48个）
    triangles: [],

    // 三角形坐标到索引的映射
    triangleDict: {},

    // 被阻挡的位置
    blockedIndices: [],

    // 已放置拼块占用的位置
    occupiedIndices: [],

    /**
     * 初始化棋盘
     */
    init() {
        this.triangles = [];
        this.triangleDict = {};

        // 生成所有三角形坐标
        // 向上三角形：t0 + t1 + t2 = 10
        // 向下三角形：t0 + t1 + t2 = 11
        const upTriangles = [];
        const downTriangles = [];

        for (let t0 = 0; t0 < 8; t0++) {
            for (let t1 = 0; t1 < 8; t1++) {
                for (let t2 = 0; t2 < 8; t2++) {
                    const sum = t0 + t1 + t2;
                    if (sum === 10) {
                        upTriangles.push([t0, t1, t2]);
                    } else if (sum === 11) {
                        downTriangles.push([t0, t1, t2]);
                    }
                }
            }
        }

        const allTriangles = [...upTriangles, ...downTriangles];

        // 过滤出星形区域内的三角形
        this.triangles = allTriangles.filter(t => {
            return (t[0] <= 5 && t[1] <= 5 && t[2] <= 5) ||
                (t[0] >= 2 && t[1] >= 2 && t[2] >= 2);
        });

        // 排序：从顶部到底部，与实物游戏编号一致
        // t[0] 从大到小（顶部 t[0] 大）
        // 同一行内从左到右
        this.triangles.sort((a, b) => {
            if (a[0] !== b[0]) return b[0] - a[0];  // t[0] 降序（顶部先）
            if (a[1] !== b[1]) return b[1] - a[1];  // t[1] 降序（左边先）
            return a[2] - b[2];  // t[2] 升序
        });

        // 建立映射
        this.triangles.forEach((t, i) => {
            this.triangleDict[this.keyFor(t)] = i;
        });

        this.blockedIndices = [];
        this.occupiedIndices = [];
    },

    /**
     * 生成三角形的键值
     */
    keyFor(t) {
        return `${t[0]},${t[1]},${t[2]}`;
    },

    /**
     * 根据索引获取三角形坐标
     */
    getTriangle(index) {
        return this.triangles[index];
    },

    /**
     * 根据坐标获取索引
     */
    getIndex(t) {
        return this.triangleDict[this.keyFor(t)];
    },

    /**
     * 设置被阻挡的位置（骰子结果）
     * @param {Array} indices - 1-based 索引数组
     */
    setBlocked(indices) {
        this.blockedIndices = indices.map(i => i - 1);  // 转换为 0-based
    },

    /**
     * 检查位置是否被阻挡
     */
    isBlocked(index) {
        return this.blockedIndices.includes(index);
    },

    /**
     * 检查位置是否被占用
     */
    isOccupied(index) {
        return this.occupiedIndices.includes(index);
    },

    /**
     * 检查位置是否可用
     */
    isAvailable(index) {
        return !this.isBlocked(index) && !this.isOccupied(index);
    },

    /**
     * 放置拼块
     * @param {Object} piece - 拼块实例
     * @param {Array} shift - 平移量
     * @returns {boolean} - 是否成功放置
     */
    placePiece(piece, shift) {
        const triangles = Pieces.getPlacedTriangles(piece, shift);
        const indices = [];

        // 检查所有三角形是否在棋盘上且可用
        for (const t of triangles) {
            const index = this.getIndex(t);
            if (index === undefined) return false;  // 超出棋盘
            if (!this.isAvailable(index)) return false;  // 被占用或阻挡
            indices.push(index);
        }

        // 放置成功，更新状态
        this.occupiedIndices.push(...indices);
        piece.placed = true;
        piece.position = shift;

        return true;
    },

    /**
     * 移除拼块
     * @param {Object} piece - 拼块实例
     */
    removePiece(piece) {
        if (!piece.placed || !piece.position) return;

        const triangles = Pieces.getPlacedTriangles(piece, piece.position);

        for (const t of triangles) {
            const index = this.getIndex(t);
            if (index !== undefined) {
                const idx = this.occupiedIndices.indexOf(index);
                if (idx !== -1) {
                    this.occupiedIndices.splice(idx, 1);
                }
            }
        }

        piece.placed = false;
        piece.position = null;
    },

    /**
     * 检查拼块是否可以放置在指定位置
     * @param {Object} piece - 拼块实例
     * @param {Array} shift - 平移量
     * @returns {boolean}
     */
    canPlace(piece, shift) {
        const triangles = Pieces.getPlacedTriangles(piece, shift);

        for (const t of triangles) {
            const index = this.getIndex(t);
            if (index === undefined) return false;
            if (!this.isAvailable(index)) return false;
        }

        return true;
    },

    /**
     * 找到最近的有效放置位置
     * @param {Object} piece - 拼块实例
     * @param {number} x - 目标 x 坐标
     * @param {number} y - 目标 y 坐标
     * @returns {Array|null} - 平移量或 null
     */
    findPlacement(piece, x, y) {
        // 找到最近的三角形
        let minDist = Infinity;
        let bestShift = null;

        // 尝试所有可能的平移量
        const possibleShifts = this.getPossibleShifts();

        for (const shift of possibleShifts) {
            if (this.canPlace(piece, shift)) {
                // 计算放置后拼块中心到目标点的距离
                const triangles = Pieces.getPlacedTriangles(piece, shift);
                let sumX = 0, sumY = 0;
                for (const t of triangles) {
                    const center = Geometry.triangleCenter(t);
                    sumX += center[0];
                    sumY += center[1];
                }
                const centerX = sumX / triangles.length;
                const centerY = sumY / triangles.length;

                const dist = Math.sqrt((centerX - x) ** 2 + (centerY - y) ** 2);
                if (dist < minDist) {
                    minDist = dist;
                    bestShift = shift;
                }
            }
        }

        return bestShift;
    },

    /**
     * 获取所有可能的平移量
     */
    getPossibleShifts() {
        const shifts = new Set();

        for (const t of this.triangles) {
            const sum = t[0] + t[1] + t[2];
            if (sum === 10) {
                shifts.add(this.keyFor(t));
            } else if (sum === 11) {
                shifts.add(this.keyFor([t[0] - 1, t[1], t[2]]));
            }
        }

        return Array.from(shifts).map(key => key.split(',').map(Number));
    },

    /**
     * 渲染棋盘到 SVG
     * @param {SVGElement} svg - SVG 容器
     * @param {boolean} showNumbers - 是否显示编号（默认true）
     */
    render(svg, showNumbers = true) {
        // 清空现有内容
        svg.innerHTML = '';

        // 创建棋盘组
        const boardGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        boardGroup.setAttribute('class', 'board-group');

        // 渲染每个三角形
        this.triangles.forEach((t, index) => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', Geometry.trianglePath(t));
            path.setAttribute('class', 'board-triangle');
            path.setAttribute('data-index', index);
            path.setAttribute('data-coord', this.keyFor(t));

            if (this.isBlocked(index)) {
                path.classList.add('blocked');
            }

            boardGroup.appendChild(path);

            // 添加编号（非阻挡位置显示数字）
            if (showNumbers && !this.isBlocked(index)) {
                const center = Geometry.triangleCenter(t);
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', center[0]);
                text.setAttribute('y', center[1]);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'central');
                text.setAttribute('font-size', '0.28');
                text.setAttribute('fill', '#64748b');
                text.setAttribute('class', 'board-number');
                text.textContent = index + 1;  // 1-based 编号
                boardGroup.appendChild(text);
            }
        });

        svg.appendChild(boardGroup);

        // 渲染阻挡标记（白色三角形 + 星号）
        const blockerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        blockerGroup.setAttribute('class', 'blocker-group');

        for (const index of this.blockedIndices) {
            const t = this.triangles[index];
            const center = Geometry.triangleCenter(t);

            // 白色填充
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', Geometry.trianglePath(t));
            path.setAttribute('fill', '#ffffff');
            path.setAttribute('class', 'blocked-marker');
            blockerGroup.appendChild(path);

            // 星号标记
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            marker.setAttribute('x', center[0]);
            marker.setAttribute('y', center[1]);
            marker.setAttribute('text-anchor', 'middle');
            marker.setAttribute('dominant-baseline', 'central');
            marker.setAttribute('font-size', '0.5');
            marker.setAttribute('fill', '#1a202c');
            marker.textContent = '★';
            blockerGroup.appendChild(marker);
        }

        svg.appendChild(blockerGroup);
    },

    /**
     * 检查是否完成（所有可用位置都被填满）
     */
    isComplete() {
        for (let i = 0; i < this.triangles.length; i++) {
            if (!this.isBlocked(i) && !this.isOccupied(i)) {
                return false;
            }
        }
        return true;
    },

    /**
     * 重置棋盘（清除放置的拼块）
     */
    reset() {
        this.occupiedIndices = [];
    }
};

// 导出给其他模块使用
window.Board = Board;
