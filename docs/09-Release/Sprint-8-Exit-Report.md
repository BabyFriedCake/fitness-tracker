# Sprint 8 Exit Report

---

# Sprint Information

**Sprint:** Sprint 8 - Product Experience Completion

**Status:** PASS WITH WARNINGS

**Date:** 2026-07-27

**Reviewer:** Codex

---

# Overall Result

Sprint 8 已完成 Product Experience Completion 的主要范围：Today 计划体验、模板详情与编辑分流、动作库 Figma 对齐、历史日历钻取、Workout / Rest / Summary 体验收口，以及 Settings / Onboarding 基础能力。

本地质量门通过：format check、lint、typecheck、tests 和 diff whitespace check 均通过。剩余 warning 为既有 hook dependency warning、GitHub-hosted CI 未验证、真机验证未执行，以及 Settings / Onboarding 的后续增强项。

---

# Sprint Summary

Completed tasks:

- [x] S8-00 Sprint Readiness and Prototype Sync
- [x] S8-01 Today Plan Experience
- [x] S8-02 Template Detail and Edit Flow
- [x] S8-03 Exercise Library Figma Alignment
- [x] S8-04 History Calendar and Drilldown
- [x] S8-05 Workout / Rest / Summary Alignment
- [x] S8-06 Settings and Onboarding Baseline
- [x] S8-07 Sprint Exit Review

Not completed:

- [ ] N/A

Repository status:

```bash
git status --short
```

Result:

```text
 M apps/mobile/app/_layout.tsx
 M docs/00-Project/roadmap.md
 M docs/08-Development/README.md
 M docs/08-Development/prototype-implementation-status.md
?? apps/mobile/app/onboarding.tsx
?? apps/mobile/src/database/repositories/user-setting/
?? apps/mobile/src/domain/user-setting/
?? apps/mobile/src/features/onboarding/
?? docs/08-Development/sprint-8-plan.md
?? tasks/sprint-8-product-experience/
```

当前未提交变更均属于 Sprint 8 实现、任务文档或 release report 范围。

---

# Architecture

**Result:** PASS

Review:

- Architecture 仍遵循 `docs/04-Architecture/architecture.md`。
- `WorkoutSet` 继续是训练事实，Sprint 8 未改写历史训练数据。
- Route 层保持 thin，只负责路由挂载和导航入口。
- Onboarding 写入使用 Application → Domain Repository → SQLite Repository。
- SQL 仍集中在 `apps/mobile/src/database` 模块。
- Workout Runtime、Snapshot Validation 和 Companion Event Source 边界未被扩大。

Comments:

S8-06 新增 `UserSetting` repository，复用既有 `user_settings` 表；未新增 schema 或 migration。Onboarding gate 在数据库初始化失败时不阻断主 App 入口，符合 local-first 和数据安全原则。

---

# Quality

**Result:** PASS WITH WARNINGS

Validation:

- `pnpm format:check`: PASS
- `pnpm lint`: PASS WITH WARNINGS
- `pnpm typecheck`: PASS
- `pnpm test`: PASS
- `git diff --check`: PASS

Test summary:

```text
Suites: 45 passed, 45 total
Tests: 500 passed, 500 total
Result: PASS
```

Comments:

Lint 没有 error。仍有 5 条既有 `react-hooks/exhaustive-deps` warning，均位于 `apps/mobile/src/features/workout-session/application/use-workout-session-screen.ts`。

---

# Metrics

| Metric                   | Result                                      |
| ------------------------ | ------------------------------------------- |
| Sprint Tasks             | 8 / 8 complete                              |
| Format Check             | PASS                                        |
| Lint                     | PASS WITH 5 WARNINGS                        |
| Typecheck                | PASS                                        |
| Tests                    | 45 suites / 500 tests PASS                  |
| GitHub Actions           | CONFIG PASS / HOSTED RUN NOT VERIFIED      |
| Architecture Violations  | 0 blocking findings                         |
| Repository Hygiene       | PASS WITH WARNINGS                          |
| Database Migrations      | 5 numbered migrations unchanged             |
| Remaining Technical Debt | 5 items                                     |

---

# Repository Hygiene

**Result:** PASS WITH WARNINGS

Verify:

- Working tree clean: WARNING, Sprint 8 变更尚未提交。
- Single AGENTS.md: PASS。
- `.DS_Store`: PASS after local cleanup, excluding dependency folders.
- No `.idea`, unexpected `.vscode`, `.claude`, `.cursor` in project source: PASS; dependency folders may contain their own package metadata.
- No production TODO/FIXME: PASS.
- No debugger statements: PASS.
- No merge conflict markers: PASS.
- `git diff --check`: PASS.
- `git clean -nd`: reports only Sprint 8 untracked formal files.
- No obvious secrets found in reviewed scope.

Comments:

当前 `git clean -nd` 报告的 untracked files 是 Sprint 8 正式文件，而非临时文件。工作区未清洁是 release readiness warning，不作为本地质量门失败。

---

# Continuous Integration

**Result:** PASS WITH WARNINGS

Verify:

- GitHub Actions workflow exists: PASS (`.github/workflows/ci.yml`)
- `pnpm/action-setup@v4`: PASS
- `actions/setup-node@v4`: PASS
- Frozen lockfile: PASS (`pnpm install --frozen-lockfile`)
- Push trigger: PASS (`push` to `main`)
- Pull Request trigger: PASS

Pipeline:

- format
- lint
- typecheck
- test

Comments:

本地 CI-equivalent validation 已通过。GitHub-hosted CI 未在本地 Exit Review 中验证，记录为 warning。

---

# Database

**Result:** PASS

Verify:

- Migration runner: PASS.
- Fresh database initialization: PASS through test suite.
- Idempotent migrations: PASS through migration tests.
- Rollback support: PASS through migration tests.
- Foreign key enforcement: PASS.
- SQL isolation: PASS.
- Error mapping: PASS.

Comments:

Sprint 8 未新增 migration。`UserSetting` onboarding 状态复用既有 `user_settings` 表，并新增 SQLite repository 测试。

---

# Documentation

**Result:** PASS

Verify:

- Roadmap updated: PASS.
- Prototype implementation status updated: PASS.
- Sprint 8 plan and task directory created: PASS.
- Architecture synchronized: PASS.
- Database documentation synchronized: PASS, no schema change required.
- Development Guide still valid: PASS.

Comments:

Prototype status 已将 P009 Settings 和 P010 Onboarding 从 Not Started 调整为部分完成，并保留完整 Settings、权限说明、示例预览确认等后续缺口。

---

# Remaining Technical Debt

1. `use-workout-session-screen.ts` 仍有 5 条 `react-hooks/exhaustive-deps` warning。
2. Settings 仍是基础能力，不含完整数据导出、清除、许可和动作来源页。
3. Onboarding 缺权限说明、示例模板预览确认和首次训练分流增强。
4. GitHub-hosted CI 未验证。
5. 未执行 iOS / Android 真机长流程 smoke test。

---

# Lessons Learned

- Sprint 8 证明先补齐 Prototype 差距比提前进入 AI Coach 更符合当前产品状态。
- Today、Template、Workout、History 和 Onboarding 的体验收口可以在不改 Runtime 主干的前提下推进。
- Settings 应继续拆分，避免一次性引入数据清除、导出、权限和许可的高风险写操作。

---

# Suggestions

- Sprint 9 开始前先处理或隔离 hook dependency warning，避免每次 Release 都重复记录。
- 在进入真实 TTS / Voice Engine 前，补一轮原生设备 smoke test。
- 为 Settings 单独创建数据导出、清除、许可页任务，避免与 Voice Sprint 混在一起。
- GitHub-hosted CI 通过后再创建 Sprint 8 tag / release。

---

# Ready for Next Sprint

**Result:** YES WITH WARNINGS

Reason:

Sprint 8 本地质量门和架构边界通过，核心产品体验补齐任务已完成。剩余问题不阻塞进入 Sprint 9，但应在 release follow-up 或 Sprint 9 开始前明确处理顺序。

---

# Reviewer Conclusion

Sprint 8 Exit Review 结论为 **PASS WITH WARNINGS**。

项目可以进入 Sprint 9 Planning / Voice TTS Input Source Hardening，但本报告应先等待 Human Review，且在审阅前不自动执行 commit、tag 或 release。
