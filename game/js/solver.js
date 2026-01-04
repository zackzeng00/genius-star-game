/**
 * solver.js - 精确覆盖问题求解器
 * 
 * 使用 Dancing Links (DLX) 算法求解拼图
 */

const Solver = {
    /**
     * 求解当前棋盘状态
     * @param {Array} pieces - 可用拼块数组
     * @returns {Array|null} - 解决方案或 null
     */
    solve(pieces) {
        // 生成所有可能的放置方式
        const fits = this.generateFits(pieces);

        if (fits.length === 0) {
            return null;
        }

        // 构建精确覆盖矩阵
        const { matrix, rowInfo, colCount } = this.buildMatrix(fits, pieces);

        // 使用 DLX 求解
        const solution = this.dlx(matrix, colCount);

        if (!solution) {
            return null;
        }

        // 将解转换为放置信息
        return solution.map(rowIdx => rowInfo[rowIdx]);
    },

    /**
     * 生成所有可能的拼块放置方式
     */
    generateFits(pieces) {
        const fits = [];
        const shifts = Board.getPossibleShifts();

        // 对每个拼块尝试所有变换和位置
        pieces.forEach((piece, pieceIdx) => {
            if (piece.placed) return;  // 跳过已放置的拼块

            // 获取所有可能的变换
            const transformations = this.getAllTransformations(piece);

            transformations.forEach((triangles) => {
                // 尝试所有平移
                shifts.forEach(shift => {
                    const placedTriangles = Geometry.translateTriangles(triangles, shift);

                    // 检查是否有效
                    const indices = [];
                    let valid = true;

                    for (const t of placedTriangles) {
                        const index = Board.getIndex(t);
                        if (index === undefined || Board.isBlocked(index) || Board.isOccupied(index)) {
                            valid = false;
                            break;
                        }
                        indices.push(index);
                    }

                    if (valid) {
                        fits.push({
                            pieceIndex: pieceIdx,
                            triangles: triangles,
                            shift: shift,
                            boardIndices: indices
                        });
                    }
                });
            });
        });

        return fits;
    },

    /**
     * 获取拼块的所有可能变换（旋转和翻转）
     */
    getAllTransformations(piece) {
        const seen = new Set();
        const result = [];

        let current = JSON.parse(JSON.stringify(piece.originalTriangles));

        // 6次旋转
        for (let r = 0; r < 6; r++) {
            // 当前状态
            const key = JSON.stringify(current);
            if (!seen.has(key)) {
                seen.add(key);
                result.push(JSON.parse(JSON.stringify(current)));
            }

            // 翻转后的状态
            const reflected = Geometry.reflectTriangles(JSON.parse(JSON.stringify(current)));
            const reflectedKey = JSON.stringify(reflected);
            if (!seen.has(reflectedKey)) {
                seen.add(reflectedKey);
                result.push(reflected);
            }

            // 旋转
            current = Geometry.rotateTriangles(current);
        }

        return result;
    },

    /**
     * 构建精确覆盖矩阵
     */
    buildMatrix(fits, pieces) {
        // 列：所有可用棋盘位置 + 拼块约束
        const availablePositions = [];
        for (let i = 0; i < Board.triangles.length; i++) {
            if (!Board.isBlocked(i) && !Board.isOccupied(i)) {
                availablePositions.push(i);
            }
        }

        const posToCol = {};
        availablePositions.forEach((pos, col) => {
            posToCol[pos] = col;
        });

        // 未放置的拼块
        const unplacedPieces = pieces.filter(p => !p.placed);
        const pieceToCol = {};
        unplacedPieces.forEach((p, idx) => {
            pieceToCol[p.index] = availablePositions.length + idx;
        });

        const colCount = availablePositions.length + unplacedPieces.length;
        const matrix = [];
        const rowInfo = [];

        fits.forEach(fit => {
            const row = new Array(colCount).fill(0);

            // 棋盘位置
            for (const pos of fit.boardIndices) {
                if (posToCol[pos] !== undefined) {
                    row[posToCol[pos]] = 1;
                }
            }

            // 拼块约束
            const pieceCol = pieceToCol[fit.pieceIndex];
            if (pieceCol !== undefined) {
                row[pieceCol] = 1;
            }

            matrix.push(row);
            rowInfo.push(fit);
        });

        return { matrix, rowInfo, colCount };
    },

    /**
     * Dancing Links 算法求解精确覆盖问题
     */
    dlx(matrix, colCount) {
        if (matrix.length === 0 || colCount === 0) {
            return null;
        }

        // 构建链表结构
        const header = { id: -1, left: null, right: null, up: null, down: null, size: 0, col: null };
        const columns = [];

        // 创建列头
        let prev = header;
        for (let c = 0; c < colCount; c++) {
            const col = {
                id: c,
                left: prev,
                right: null,
                up: null,
                down: null,
                size: 0,
                col: null
            };
            col.up = col;
            col.down = col;
            col.col = col;

            prev.right = col;
            prev = col;
            columns.push(col);
        }
        prev.right = header;
        header.left = prev;

        // 填充矩阵
        matrix.forEach((row, rowIdx) => {
            let firstNode = null;
            let prevNode = null;

            row.forEach((val, colIdx) => {
                if (val === 1) {
                    const col = columns[colIdx];
                    const node = {
                        row: rowIdx,
                        col: col,
                        up: col.up,
                        down: col,
                        left: null,
                        right: null
                    };

                    col.up.down = node;
                    col.up = node;
                    col.size++;

                    if (firstNode === null) {
                        firstNode = node;
                        node.left = node;
                        node.right = node;
                    } else {
                        node.left = prevNode;
                        node.right = firstNode;
                        prevNode.right = node;
                        firstNode.left = node;
                    }

                    prevNode = node;
                }
            });
        });

        // 递归搜索
        const solution = [];

        const cover = (col) => {
            col.right.left = col.left;
            col.left.right = col.right;

            let i = col.down;
            while (i !== col) {
                let j = i.right;
                while (j !== i) {
                    j.down.up = j.up;
                    j.up.down = j.down;
                    j.col.size--;
                    j = j.right;
                }
                i = i.down;
            }
        };

        const uncover = (col) => {
            let i = col.up;
            while (i !== col) {
                let j = i.left;
                while (j !== i) {
                    j.col.size++;
                    j.down.up = j;
                    j.up.down = j;
                    j = j.left;
                }
                i = i.up;
            }

            col.right.left = col;
            col.left.right = col;
        };

        const search = () => {
            if (header.right === header) {
                return true;  // 找到解
            }

            // 选择最小的列
            let minCol = header.right;
            let c = header.right;
            while (c !== header) {
                if (c.size < minCol.size) {
                    minCol = c;
                }
                c = c.right;
            }

            if (minCol.size === 0) {
                return false;  // 无解
            }

            cover(minCol);

            let r = minCol.down;
            while (r !== minCol) {
                solution.push(r.row);

                let j = r.right;
                while (j !== r) {
                    cover(j.col);
                    j = j.right;
                }

                if (search()) {
                    return true;
                }

                solution.pop();

                j = r.left;
                while (j !== r) {
                    uncover(j.col);
                    j = j.left;
                }

                r = r.down;
            }

            uncover(minCol);
            return false;
        };

        if (search()) {
            return solution;
        }

        return null;
    }
};

// 导出给其他模块使用
window.Solver = Solver;
