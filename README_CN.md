# xExtension-FilterBuilder

一个用于 **FreshRSS 搜索语法** 的可视化查询构建扩展。

该扩展会在搜索框附近提供筛选构建面板，帮助用户通过点选方式构建复杂查询（AND/OR 分组、否定、正则、日期、Feed/分类/标签筛选），避免手写复杂语法。

## 功能特性

- FreshRSS 搜索操作符可视化构建
- 支持 AND 条件与 OR 分组
- 支持否定（`!`）、正则模式、带空格值自动引用
- 支持日期类筛选（`date` / `pubdate` / `userdate`）
- 支持 feed / category / label / saved query 选择
- 支持实时查询预览、填充搜索、直接搜索
- 支持将已有搜索串反向解析回可视化界面

## 项目状态

当前为实验性可用版本：

- 核心扩展文件已实现并通过校验
- OpenSpec 变更已归档
- `tests/` 目录包含 Node.js 测试脚本

## 目录结构

```text
.
├── extension.php              # FreshRSS 扩展入口
├── metadata.json              # 扩展元数据
├── static/
│   ├── filter-builder.js      # UI + 查询构建/解析逻辑
│   └── filter-builder.css     # 样式
├── i18n/
│   ├── en.php                 # 英文翻译
│   └── zh-cn.php              # 中文翻译
├── tests/                     # Node.js 测试
└── docs/archive/              # 调研与过程归档文件
```

## 运行要求

- FreshRSS `>= 1.21`（扩展接口兼容）
- Node.js（用于本地测试验证）
- 目标 FreshRSS 环境需有 PHP 运行时

## 安装方式

1. 将本仓库复制到 FreshRSS 扩展目录，并保持目录名为：

   ```text
   xExtension-FilterBuilder
   ```

2. 示例路径：

   ```text
   /path/to/FreshRSS/extensions/xExtension-FilterBuilder
   ```

3. 在 FreshRSS 管理后台启用 **FilterBuilder** 扩展。

## 使用说明

1. 打开任意 FreshRSS 页面。
2. 点击搜索框旁的筛选按钮。
3. 在面板中添加条件/分组。
4. 使用以下按钮：
   - **Fill search box**：仅写入搜索框
   - **Search now**：写入并立即提交搜索
   - **Load from search box**：将已有查询反向载入构建器

## 本地开发

运行测试：

```bash
node tests/test-operator-registry.js
node tests/test-condition-row.js
node tests/test-group.js
node tests/test-query-builder.js
node tests/test-query-parser.js
```

基础语法检查：

```bash
node --check static/filter-builder.js
```

## 兼容性说明

- 扩展运行依赖 FreshRSS 页面 DOM 与上下文。
- 在纯 Node 环境直接执行 `static/filter-builder.js` 出现 `document is not defined` 属于预期现象（因缺少浏览器 DOM）。

## 后续计划

- 优化 UI/UX 与键盘可访问性
- 增加端到端浏览器验证
- 提供扩展配置页（默认行为可配置）

## 许可证

MIT 许可证，详见 [LICENSE](./LICENSE)。

## 贡献指南

提交 PR 前请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。
