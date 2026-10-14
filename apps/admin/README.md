# Fitness Tracker Admin Web

## 本地启动

```sh
pnpm --filter @fitness-tracker/api dev
pnpm --filter @fitness-tracker/admin dev
```

Vite 开发服务器默认代理 `/admin` 和 `/health` 到 `http://localhost:4000`。
打开终端输出的本地地址，在页面顶部粘贴管理员 Bearer token 后连接。

## 当前能力

- 公共动作创建、编辑、审核和发布。
- 公共模板创建、配置编辑、审核和发布。
- 管理员角色编辑（`content_editor`、`content_reviewer`、`content_admin`）。
- 管理员启用/停用。
- 审计日志查询。

已发布或已归档内容不能从管理端直接编辑，最终权限仍由 API 校验。
当前页面是内部管理基线，尚未接入具体 OIDC 登录页面或生产部署平台。
