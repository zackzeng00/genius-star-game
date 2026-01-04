/**
 * pieces.js - 拼块定义和渲染
 * 
 * 定义所有游戏拼块及其颜色，处理拼块的渲染和变换
 */

const Pieces = {
    // 拼块定义 - 每个拼块由若干三角形组成
    // 坐标使用三角形坐标系 [t0, t1, t2]
    definitions: [
        {
            name: '单三角',
            triangles: [[0, 0, 0]],
            color: '#4169e1'  // royalblue
        },
        {
            name: '双三角',
            triangles: [[0, 0, 0], [1, 0, 0]],
            color: '#ffd700'  // yellow/gold
        },
        {
            name: '四联直',
            triangles: [[0, 0, 0], [1, 0, 0], [1, -1, 0], [2, -1, 0]],
            color: '#ff69b4'  // pink
        },
        {
            name: '五联直',
            triangles: [[0, 0, 0], [1, 0, 0], [1, -1, 0], [2, -1, 0], [2, -2, 0]],
            color: '#dc143c'  // red
        },
        {
            name: '五联弯',
            triangles: [[0, 0, 0], [1, 0, 0], [1, -1, 0], [2, -1, 0], [2, -1, -1]],
            color: '#7cfc00'  // lawngreen
        },
        {
            name: '四联菱',
            triangles: [[0, 0, 0], [1, 0, 0], [1, -1, 0], [1, -1, 1]],
            color: '#ffa500'  // orange
        },
        {
            name: '五联菱',
            triangles: [[0, 0, 0], [1, 0, 0], [1, -1, 0], [1, -1, 1], [0, -1, 1]],
            color: '#006400'  // darkgreen
        },
        {
            name: '四联T',
            triangles: [[0, 0, 0], [1, 0, 0], [1, -1, 0], [1, 0, -1]],
            color: '#9370db'  // purple
        },
        {
            name: '五联T',
            triangles: [[0, 0, 0], [1, 0, 0], [1, -1, 0], [1, 0, -1], [2, -1, 0]],
            color: '#8b4513'  // saddlebrown
        },
        {
            name: '金星',  // 六边形，带星形标记
            triangles: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, -1, 0], [1, -1, 1], [0, -1, 1]],
            color: '#87ceeb',  // skyblue
            isStar: true
        }
    ],

    // 备用：两个三联直条（非星形版本）
    alternativeDefinitions: [
        {
            name: '三联直A',
            triangles: [[0, 0, 1], [0, 0, 0], [1, 0, 0]],
            color: '#00bfff'  // deepskyblue
        },
        {
            name: '三联直B',
            triangles: [[0, 0, 1], [0, 0, 0], [1, 0, 0]],
            color: '#87cefa'  // lightskyblue
        }
    ],

    /**
     * 创建拼块实例
     * @param {number} index - 拼块索引
     * @param {boolean} useStar - 是否使用星形拼块
     * @returns {Object} - 拼块实例
     */
    create(index, useStar = true) {
        let def;
        if (index < 9) {
            def = this.definitions[index];
        } else if (index === 9) {
            def = useStar ? this.definitions[9] : this.alternativeDefinitions[0];
        } else {
            def = this.alternativeDefinitions[1];
        }

        return {
            index: index,
            name: def.name,
            triangles: JSON.parse(JSON.stringify(def.triangles)),
            originalTriangles: JSON.parse(JSON.stringify(def.triangles)),
            color: def.color,
            isStar: def.isStar || false,
            rotation: 0,
            reflected: false,
            placed: false,
            position: null  // 棋盘上的位置（平移量）
        };
    },

    /**
     * 创建所有拼块
     * @param {boolean} useStar - 是否使用星形拼块
     * @returns {Array} - 拼块实例数组
     */
    createAll(useStar = true) {
        const pieces = [];
        const count = useStar ? 10 : 11;
        for (let i = 0; i < count; i++) {
            pieces.push(this.create(i, useStar));
        }
        return pieces;
    },

    /**
     * 旋转拼块（顺时针60度）
     * @param {Object} piece - 拼块实例
     */
    rotate(piece) {
        piece.triangles = Geometry.rotateTriangles(piece.triangles);
        piece.rotation = (piece.rotation + 1) % 6;
    },

    /**
     * 翻转拼块
     * @param {Object} piece - 拼块实例
     */
    reflect(piece) {
        piece.triangles = Geometry.reflectTriangles(piece.triangles);
        piece.reflected = !piece.reflected;
    },

    /**
     * 重置拼块到初始状态
     * @param {Object} piece - 拼块实例
     */
    reset(piece) {
        piece.triangles = JSON.parse(JSON.stringify(piece.originalTriangles));
        piece.rotation = 0;
        piece.reflected = false;
        piece.placed = false;
        piece.position = null;
    },

    /**
     * 获取拼块放置在棋盘上的三角形坐标
     * @param {Object} piece - 拼块实例
     * @param {Array} shift - 平移量
     * @returns {Array} - 三角形坐标数组
     */
    getPlacedTriangles(piece, shift) {
        return Geometry.translateTriangles(piece.triangles, shift);
    },

    /**
     * 渲染单个拼块到 SVG
     * @param {Object} piece - 拼块实例
     * @param {SVGElement} svg - SVG 容器
     * @param {Object} options - 渲染选项
     */
    render(piece, svg, options = {}) {
        const {
            scale = 1,
            offsetX = 0,
            offsetY = 0,
            showStar = true,
            className = ''
        } = options;

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `piece-group ${className}`);
        group.setAttribute('data-piece-index', piece.index);

        // 计算拼块的边界以居中
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (const t of piece.triangles) {
            const verts = Geometry.triangleVertices(t);
            for (const v of verts) {
                minX = Math.min(minX, v[0]);
                maxX = Math.max(maxX, v[0]);
                minY = Math.min(minY, v[1]);
                maxY = Math.max(maxY, v[1]);
            }
        }

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // 渲染每个三角形
        for (const t of piece.triangles) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const verts = Geometry.triangleVertices(t);

            // 应用变换：居中、缩放、偏移
            const transformedVerts = verts.map(v => [
                (v[0] - centerX) * scale + offsetX,
                (v[1] - centerY) * scale + offsetY
            ]);

            const d = `M ${transformedVerts[0][0]} ${transformedVerts[0][1]} 
                       L ${transformedVerts[1][0]} ${transformedVerts[1][1]} 
                       L ${transformedVerts[2][0]} ${transformedVerts[2][1]} Z`;

            path.setAttribute('d', d);
            path.setAttribute('fill', piece.color);
            path.setAttribute('class', 'piece-triangle');

            group.appendChild(path);
        }

        // 如果是星形拼块，添加星形标记
        if (piece.isStar && showStar) {
            const star = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            star.setAttribute('x', offsetX);
            star.setAttribute('y', offsetY);
            star.setAttribute('text-anchor', 'middle');
            star.setAttribute('dominant-baseline', 'central');
            star.setAttribute('font-size', scale * 0.8);
            star.setAttribute('fill', '#ffd700');
            star.textContent = '⭐';
            group.appendChild(star);
        }

        svg.appendChild(group);
        return group;
    },

    /**
     * 渲染拼块到棋盘位置
     * @param {Object} piece - 拼块实例
     * @param {SVGElement} svg - SVG 容器
     * @param {Array} shift - 平移量
     */
    renderOnBoard(piece, svg, shift) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'placed-piece');
        group.setAttribute('data-piece-index', piece.index);

        const placedTriangles = this.getPlacedTriangles(piece, shift);

        for (const t of placedTriangles) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', Geometry.trianglePath(t));
            path.setAttribute('fill', piece.color);
            path.setAttribute('class', 'piece-triangle on-board');
            group.appendChild(path);
        }

        // 星形标记
        if (piece.isStar) {
            // 找到中心位置
            let sumX = 0, sumY = 0;
            for (const t of placedTriangles) {
                const center = Geometry.triangleCenter(t);
                sumX += center[0];
                sumY += center[1];
            }
            const centerX = sumX / placedTriangles.length;
            const centerY = sumY / placedTriangles.length;

            const star = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            star.setAttribute('x', centerX);
            star.setAttribute('y', centerY);
            star.setAttribute('text-anchor', 'middle');
            star.setAttribute('dominant-baseline', 'central');
            star.setAttribute('font-size', '0.6');
            star.setAttribute('fill', '#ffd700');
            star.textContent = '⭐';
            group.appendChild(star);
        }

        svg.appendChild(group);
        return group;
    }
};

// 导出给其他模块使用
window.Pieces = Pieces;
