# React lint 工具链

## 为什么单独安装

根项目业务类型检查使用 TypeScript 7.0.2。2026-09-05 实际安装验证发现，@typescript-eslint/parser 8.69.0 的 peer 范围为 >=4.8.4 <6.1.0，且其依赖需要旧版 TypeScript JS API。不能让它解析时误用根目录 TypeScript 7。

因此将解析器 8.69.0 与 TypeScript 6.0.3 固定在本目录独立锁文件中。**它们只服务 ESLint 的语法树，不参与产品编译、运行或 tsc 类型检查。** 不使用 Babel 临时替代、不强制忽略 peer 冲突，也不降级业务编译器。

```bash
npm ci --prefix tooling/eslint --ignore-scripts --install-strategy=nested
npm run lint:react
```

根目录 postinstall 自动执行该安装。nested 防止解析器的间接依赖提升后误用根 TypeScript。根 .eslintrc.react.cjs 通过本目录解析 parser。

规则覆盖 React 推荐、Hooks 调用/依赖和 JSX 可访问性，零警告门禁。类型正确性由根 `npm run typecheck` 负责。

未来解析器正式支持业务 TypeScript 版本后，可以在同一变更中合并工具链、删除此隔离目录并验证干净安装。当前不要为“目录整洁”手工删掉这层边界。
