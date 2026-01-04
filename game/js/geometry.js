/**
 * geometry.js - 三角形网格几何计算
 * 
 * 处理三角形坐标系统和笛卡尔坐标之间的转换
 */

const Geometry = {
    // 三角形网格的单位向量
    a: [0.0, -1.0],
    b: [-Math.sqrt(3.0) / 2.0, 0.5],
    c: [Math.sqrt(3.0) / 2.0, 0.5],

    /**
     * 将三角形坐标转换为笛卡尔坐标中心点
     * @param {Array} t - 三角形坐标 [t0, t1, t2]
     * @returns {Array} - 笛卡尔坐标 [x, y]
     */
    triangleCenter(t) {
        const x = this.a[0] * t[0] + this.b[0] * t[1] + this.c[0] * t[2];
        const y = this.a[1] * t[0] + this.b[1] * t[1] + this.c[1] * t[2];
        return [x, y];
    },

    /**
     * 获取三角形的三个顶点坐标
     * @param {Array} t - 三角形坐标 [t0, t1, t2]
     * @returns {Array} - 三个顶点坐标 [[x1,y1], [x2,y2], [x3,y3]]
     */
    triangleVertices(t) {
        const center = this.triangleCenter(t);
        const sum = t[0] + t[1] + t[2];
        
        if (sum % 2 === 1) {
            // 向上的三角形
            return [
                [center[0] + this.a[0], center[1] + this.a[1]],
                [center[0] + this.b[0], center[1] + this.b[1]],
                [center[0] + this.c[0], center[1] + this.c[1]]
            ];
        } else {
            // 向下的三角形
            return [
                [center[0] - this.a[0], center[1] - this.a[1]],
                [center[0] - this.b[0], center[1] - this.b[1]],
                [center[0] - this.c[0], center[1] - this.c[1]]
            ];
        }
    },

    /**
     * 获取三角形的 SVG path 字符串
     * @param {Array} t - 三角形坐标 [t0, t1, t2]
     * @returns {string} - SVG path 的 d 属性
     */
    trianglePath(t) {
        const verts = this.triangleVertices(t);
        return `M ${verts[0][0]} ${verts[0][1]} L ${verts[1][0]} ${verts[1][1]} L ${verts[2][0]} ${verts[2][1]} Z`;
    },

    /**
     * 点群变换 - 60度旋转矩阵
     */
    rotationMatrix: [
        [0, -1, 0],
        [0, 0, -1],
        [-1, 0, 0]
    ],

    /**
     * 点群变换 - 反射矩阵
     */
    reflectionMatrix: [
        [-1, 0, 0],
        [0, 0, -1],
        [0, -1, 0]
    ],

    /**
     * 应用矩阵变换到三角形坐标
     * @param {Array} t - 三角形坐标
     * @param {Array} matrix - 3x3 变换矩阵
     * @returns {Array} - 变换后的坐标
     */
    applyMatrix(t, matrix) {
        const result = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                result[i] += matrix[i][j] * t[j];
            }
        }
        // 处理旋转矩阵的偏移
        if (matrix === this.rotationMatrix) {
            result[2] += 1;
        }
        if (matrix === this.reflectionMatrix) {
            result[0] += 1;
        }
        return result;
    },

    /**
     * 旋转三角形坐标（顺时针60度）
     * @param {Array} t - 三角形坐标
     * @returns {Array} - 旋转后的坐标
     */
    rotate(t) {
        // 简化的60度顺时针旋转
        return [-t[1], -t[2], -t[0] + 1];
    },

    /**
     * 翻转三角形坐标
     * @param {Array} t - 三角形坐标
     * @returns {Array} - 翻转后的坐标
     */
    reflect(t) {
        return [-t[0] + 1, -t[2], -t[1]];
    },

    /**
     * 对一组三角形应用旋转
     * @param {Array} triangles - 三角形坐标数组
     * @returns {Array} - 旋转后的三角形数组
     */
    rotateTriangles(triangles) {
        const rotated = triangles.map(t => this.rotate(t));
        return this.normalizeTriangles(rotated);
    },

    /**
     * 对一组三角形应用翻转
     * @param {Array} triangles - 三角形坐标数组
     * @returns {Array} - 翻转后的三角形数组
     */
    reflectTriangles(triangles) {
        const reflected = triangles.map(t => this.reflect(t));
        return this.normalizeTriangles(reflected);
    },

    /**
     * 归一化三角形组，使第一个三角形靠近原点
     * @param {Array} triangles - 三角形坐标数组
     * @returns {Array} - 归一化后的数组
     */
    normalizeTriangles(triangles) {
        if (triangles.length === 0) return triangles;
        
        // 排序
        triangles.sort((a, b) => {
            if (a[0] !== b[0]) return a[0] - b[0];
            if (a[1] !== b[1]) return b[1] - a[1];
            return a[2] - b[2];
        });
        
        const first = triangles[0];
        const sum = first[0] + first[1] + first[2];
        
        let shift;
        if (sum % 2 === 0) {
            // 向下三角形，和为偶数
            shift = first;
        } else {
            // 向上三角形，和为奇数
            shift = [first[0] - 1, first[1], first[2]];
        }
        
        return triangles.map(t => [
            t[0] - shift[0],
            t[1] - shift[1],
            t[2] - shift[2]
        ]);
    },

    /**
     * 平移三角形组
     * @param {Array} triangles - 三角形坐标数组
     * @param {Array} shift - 平移量 [s0, s1, s2]
     * @returns {Array} - 平移后的数组
     */
    translateTriangles(triangles, shift) {
        return triangles.map(t => [
            t[0] + shift[0],
            t[1] + shift[1],
            t[2] + shift[2]
        ]);
    },

    /**
     * 判断笛卡尔坐标点在哪个三角形内
     * @param {number} x - x 坐标
     * @param {number} y - y 坐标
     * @param {Array} boardTriangles - 棋盘上所有三角形
     * @returns {Array|null} - 三角形坐标或 null
     */
    pointToTriangle(x, y, boardTriangles) {
        for (const t of boardTriangles) {
            if (this.isPointInTriangle(x, y, t)) {
                return t;
            }
        }
        return null;
    },

    /**
     * 判断点是否在三角形内
     */
    isPointInTriangle(px, py, t) {
        const verts = this.triangleVertices(t);
        const [v0, v1, v2] = verts;
        
        const sign = (p1, p2, p3) => {
            return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
        };
        
        const d1 = sign([px, py], v0, v1);
        const d2 = sign([px, py], v1, v2);
        const d3 = sign([px, py], v2, v0);
        
        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        
        return !(hasNeg && hasPos);
    }
};

// 导出给其他模块使用
window.Geometry = Geometry;
