# 🌟 Genius Star 拼图游戏

一个交互式的网页拼图游戏，基于 [The Genius Star](https://www.happypuzzle.co.uk/word-maths-and-shape-games/the-genius-star) 实现。

![游戏截图](./docs/screenshot.png)

## ✨ 功能特性

- 🎲 **摇骰子** - 随机生成7个阻挡位置
- 🖱️ **拖拽拼块** - 选中拼块拖放到棋盘
- 🔄 **旋转/翻转** - 键盘快捷键调整拼块方向
- 💡 **自动求解** - DLX算法秒级求解
- 📱 **响应式** - 支持移动端

## 🚀 快速开始

### 在线体验
访问：[https://your-username.github.io/genius-star-game](https://your-username.github.io/genius-star-game)

### 本地运行
```bash
cd game
python3 -m http.server 8080
# 或使用任何静态文件服务器
```
然后访问 http://localhost:8080

## 🎮 操作说明

| 操作 | 方式 |
|------|------|
| 选择拼块 | 点击 |
| 移动拼块 | 拖拽到棋盘 |
| 旋转 | 按 `R` 键 |
| 翻转 | 按 `F` 键 |
| 取消选择 | 按 `Esc` 键 |

## 📁 项目结构

```
├── game/
│   ├── index.html      # 游戏页面
│   ├── styles.css      # 样式
│   └── js/
│       ├── geometry.js # 几何计算
│       ├── pieces.js   # 拼块定义
│       ├── board.js    # 棋盘逻辑
│       ├── solver.js   # DLX求解器
│       └── game.js     # 游戏主逻辑
├── ROADMAP.md          # 开发路线图
└── LICENSE             # 许可证
```

## 🗺️ 开发路线

查看 [ROADMAP.md](./ROADMAP.md) 了解后续开发计划。

## 📄 许可证

[LGPL-3.0](./LICENSE)

## 🙏 致谢

- 原始 Python 求解器：[johnrudge/genius_star](https://github.com/johnrudge/genius_star)
- 精确覆盖算法：[Donald Knuth's Dancing Links](https://arxiv.org/abs/cs/0011047v1)
