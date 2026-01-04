# 🌟 Genius Star 拼图游戏

一个交互式的网页拼图游戏，基于 [The Genius Star](https://www.happypuzzle.co.uk/word-maths-and-shape-games/the-genius-star) 实现。

## ✨ 功能特性

- 🎲 **摇骰子** - 随机生成7个阻挡位置，创建新谜题
- 🖱️ **拖拽拼块** - 选中拼块拖放到星形棋盘
- 🔄 **旋转/翻转** - 使用键盘快捷键调整拼块方向
- 💡 **自动求解** - DLX算法秒级求解
- ✅ **完成检查** - 验证拼图是否完整
- 📱 **响应式** - 支持桌面和移动端

---

## 🚀 快速开始

### 方式一：本地运行

1. **克隆仓库**
   ```bash
   git clone https://github.com/zackzeng00/genius-star-game.git
   cd genius-star-game
   ```

2. **启动本地服务器**
   ```bash
   # 使用 Python
   cd game
   python3 -m http.server 8080
   
   # 或使用 Node.js
   npx serve game
   
   # 或使用 PHP
   php -S localhost:8080 -t game
   ```

3. **打开浏览器**
   
   访问 http://localhost:8080

### 方式二：直接打开

直接用浏览器打开 `game/index.html` 文件即可（部分功能可能受限）

---

## 🎮 游戏玩法

### 游戏目标
用10个不同形状的拼块，填满星形棋盘上的所有空位（被骰子标记的位置除外）。

### 操作步骤

1. **开始游戏** - 点击「🎲 摇骰子」生成新谜题
2. **选择拼块** - 点击底部的拼块进行选中
3. **调整方向** - 按 `R` 旋转，按 `F` 翻转
4. **放置拼块** - 将拼块拖拽到棋盘上合适的位置
5. **完成拼图** - 填满所有空位即可获胜

### 快捷键

| 按键 | 功能 |
|------|------|
| `R` | 顺时针旋转选中的拼块（60°）|
| `F` | 水平翻转选中的拼块 |
| `Esc` | 取消选中当前拼块 |

### 按钮说明

| 按钮 | 功能 |
|------|------|
| 🎲 摇骰子 | 随机生成新的谜题 |
| 🔄 重置 | 清空棋盘上所有已放置的拼块 |
| 💡 自动求解 | 让电脑自动计算并展示解决方案 |
| ✓ 检查 | 验证当前拼图状态，显示剩余空位数 |

---

## 📁 项目结构

```
genius-star-game/
├── game/
│   ├── index.html      # 游戏主页面
│   ├── styles.css      # 样式表（暗色主题）
│   └── js/
│       ├── geometry.js # 三角形坐标系几何计算
│       ├── pieces.js   # 10种拼块的定义和渲染
│       ├── board.js    # 星形棋盘逻辑
│       ├── solver.js   # DLX精确覆盖算法求解器
│       └── game.js     # 游戏主逻辑和交互
├── ROADMAP.md          # 开发路线图
├── LICENSE             # LGPL-3.0 许可证
└── README.md           # 本文档
```

---

## 🧩 游戏背景

### 关于 The Genius Star
The Genius Star 是由 Happy Puzzle Company 制作的实体拼图游戏：
- 棋盘是一个由48个三角形组成的六角星形状
- 玩家掷7颗骰子确定被阻挡的位置
- 然后用多边形拼块填满剩余空间

### 求解算法
本项目使用 **Dancing Links (DLX)** 算法求解，这是 Donald Knuth 提出的精确覆盖问题求解方法：
- 将拼图问题转化为精确覆盖问题
- 使用双向链表实现高效的回溯搜索
- 平均求解时间 < 100ms

---

## 🗺️ 开发路线

查看 [ROADMAP.md](./ROADMAP.md) 了解后续开发计划，包括：
- v1.1 拖拽体验优化
- v1.2 计时器和音效
- v1.3 游戏存档
- v1.4 难度和挑战模式

---

## 📄 许可证

[LGPL-3.0](./LICENSE)

## 🙏 致谢

- 原始 Python 求解器：[johnrudge/genius_star](https://github.com/johnrudge/genius_star)
- 精确覆盖算法：[Donald Knuth's Dancing Links](https://arxiv.org/abs/cs/0011047v1)
