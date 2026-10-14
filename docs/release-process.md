# 版本更新与发布流程

本文把日常改代码、合并、发布三件事串成一条线，覆盖后端、iOS、Android 三条发布链路。各环节的细节与原始规则见：

- 分支与 CI 规则：[ci-cd-review-bot.md](ci-cd-review-bot.md)
- 后端部署、环境变量、Render：[deployment/README.md](deployment/README.md)
- 下载页、固定二维码、Android 安装包、OTA：[download-qr/README.md](download-qr/README.md)
- App Store 素材：[app-store/README.md](app-store/README.md)

## 一、先判断：这次改动要发什么

| 改动内容 | 后端 | OTA 热更新 | 新原生安装包（iOS / Android） |
| --- | --- | --- | --- |
| 只改后端接口、数据库 | 需要 | 不需要 | 不需要 |
| 只改前端 JS、页面、文案、样式、图片资源 | 不需要 | 需要 | 不需要 |
| 改了原生部分：权限、原生模块、`app.json` 插件、包名、图标、启动图、升级 Expo SDK | 视情况 | 不能代替 | 需要，并提升版本号 |
| 前后端接口一起改 | 需要，且先发 | 需要或需要新包 | 视前端改动而定 |

判断原生改动的简单办法：如果改动需要重新执行 `expo prebuild` 或新增了带原生代码的依赖，就必须发新安装包。

## 用户入口：固定二维码与下载页

给用户的入口只有一个二维码，它指向 GitHub Pages 下载页 `https://ytwl1013.github.io/uniclife-keycabinet-app/`。页面会识别手机系统：iPhone 用户进入说明页，Android 用户进入说明页后下载 APK。二维码永远不用重印。

下载页源码在本仓库 `site/`，**和其他代码走同样的 `dev → main` PR 流程**，合并到 `main` 后由 `.github/workflows/pages.yml` 自动发布（只发布 `site/` 生成的页面）。要改说明文字或链接，编辑 `site/generate_download.py` 顶部的常量和文案即可。

**iOS 上架后的一次性动作：** 在 `site/generate_download.py` 里把 `APP_STORE_URL` 填成 App Store 链接，合并到 `main`。在此之前 iPhone 页不显示按钮，只提示用户去 App Store 搜索 UnicLife。详见 [download-qr/README.md](download-qr/README.md)。

## 二、从改代码到合入 main（所有改动共用）

仓库规则：`dev`、`main` 禁止直接推送，所有改动必须经 GitHub Pull Request 且 `CI / check` 通过。

```text
本地改代码 → 本地检查 → push 实现分支 → PR 到 dev → CI 通过 → 合并 dev
   → PR dev 到 main → CI 通过 → 合并 main → Render 自动部署后端 → 按需发布移动端
```

1. 从最新的 `dev` 创建分支，名称用 `feat/*`、`fix/*`，或者继续使用 `ltdev`：

   ```bash
   git fetch origin
   git checkout -b feat/xxx origin/dev
   ```

2. 本地开发，改动涉及接口字段时，先更新 `shared/` 契约和 `docs/api`，再改前后端（见 AGENTS.md 的契约规则）。

3. 推送前在仓库根目录运行与 CI 完全一致的检查：

   ```bash
   pnpm check
   ```

   它依次执行 lint、类型检查、测试。前端改动还应在 `frontend/` 里执行 `npx expo-doctor`，原生改动需要在真机上验证。

4. 提交并推送实现分支：

   ```bash
   git add <具体文件>
   git commit -m "feat: 简述改动"
   git push origin feat/xxx
   ```

5. 在 GitHub 创建 PR：`feat/xxx → dev`。看 **Actions / Checks** 里 `CI / check` 变绿后合并。CI 红了先本地复现再修，不要绕过。

6. 需要上线时，创建第二个 PR：`dev → main`，CI 通过后合并。**合并到 `main` 是后端的生产发布动作，也是移动端发布的前置条件。**

7. 紧急修复：从 `main` 拉 `fix/*`，PR 合入 `main`，然后必须再通过 PR 把它同步回 `dev`，避免两个分支分叉。

8. 可选的 GitLab 备份：

   ```bash
   git fetch origin --prune
   git push gitlab origin/main:refs/heads/backup/github-main origin/dev:refs/heads/backup/github-dev
   ```

## 三、后端发布流程（Render）

触发方式：代码合并到 GitHub `main`，Render 在 GitHub 检查全部通过后自动部署（`autoDeployTrigger: checksPass`）。你不需要手动执行任何命令。

Render 的构建命令会依次执行：安装依赖、构建后端、**执行数据库迁移**。迁移失败则整个部署失败，旧版本继续运行。

### 1. 没有数据库变更的发布

1. 按第二节合并到 `main`。
2. 打开 Render Dashboard 观察部署日志，等待状态变为 Live。
3. 验证健康检查返回 `code: "OK"`：

   ```bash
   curl https://<你的服务域名>/api/v1/health
   ```

4. 免费实例闲置会休眠，首次请求可能需要约一分钟冷启动，属于正常现象。

### 2. 有数据库变更的发布

1. 修改 `backend/src/db/schema.ts`。
2. 本地生成迁移文件，并**检查生成的 SQL 是否符合预期**：

   ```bash
   pnpm --filter @uniclife/backend db:generate
   ```

3. 在本地数据库验证迁移：

   ```bash
   pnpm dev:db
   pnpm db:migrate:dev
   ```

4. 把新增的迁移文件、`schema.ts` 一起提交。
5. 在文档中补充：表或字段的用途、索引、约束、回滚策略（AGENTS.md 要求）。
6. 按第二节合并到 `main`，迁移会在 Render 构建时自动运行。
7. **不要在生产库运行 `db:seed:dev`。**

### 3. 后端发布的安全原则

- **先发后端，再发前端。** 新接口先上线，新版 App 才能安全调用。
- **后端必须兼容旧版 App。** 用户不会同时升级：Android 通过 OTA 更新有延迟，iOS 要经过审核，老版本会长期存在。不要直接删除或重命名接口字段，改用「先新增、等老版本基本消失后再删除」的两步走。
- 数据库迁移同理：先新增列或表，不要在同一次发布里删除仍被旧代码使用的列。
- Render 可以在 Dashboard 回滚到上一次部署，但**回滚不会撤销已经执行的数据库迁移**，所以迁移必须向后兼容。
- 新增环境变量时，先在 Render 配置好值，再合并代码；同时更新 `.env.example` 和部署文档。

## 四、Android 发布流程

Android 有两种发布方式，按第一节的表格选择。

### A. 前端只改 JS 或资源：OTA 热更新（用户不用重新安装）

前提：已经发布过带 `expo-updates` 的安装包（`android-v1.0.0` 之后才满足）。

1. 代码已按第二节合并到 `main`。
2. 打开 GitHub **Actions → Publish EAS Update → Run workflow**，**分支选 `main`**，在 `message` 里写明这次更新内容，点击运行。
3. 工作流把更新发布到 EAS 的 `production` channel。
4. 用户下次启动 App 时在后台下载，**再下一次启动时生效**。

也可以本地手动发布：

```bash
cd frontend
pnpm dlx eas-cli@latest update --channel production --message "更新说明" --environment production
```

**重要限制：** 项目配置了 `runtimeVersion.policy = appVersion`，OTA 更新只会发给**与 `app.json` 的 `expo.version` 相同**的安装包。所以：

- 发布 OTA 时，`main` 上 `app.json` 的版本号必须等于用户手机上已安装的版本号。
- 如果你把 `main` 的版本升到 `1.1.0` 但 `1.1.0` 安装包还没发出去，这时发布的 OTA 只有 `1.1.0` 的包才会收到，老用户收不到。
- 因此升版本号的 PR，应当和「发布新安装包」放在同一个动作里完成。

### B. 改了原生部分：发新的 APK

1. 在一个 PR 里把 `frontend/app.json` 的 `expo.version` 提升（例如 `1.0.0 → 1.1.0`），按第二节合并到 `main`。Android 的 `versionCode` 由 EAS 远端自动递增，不需要手动改。
2. 在最新的 `main` 上打标签并推送，**标签必须与 `app.json` 的版本严格对应**：

   ```bash
   git checkout main && git pull origin main
   git tag android-v1.1.0
   git push origin android-v1.1.0
   ```

3. GitHub Actions 的 `Android release` 自动运行：校验标签与版本号、校验提交已在 `main`、调用 EAS 构建 `apk` profile、上传 `uniclife-android.apk` 到 GitHub Release。
4. 构建大约 10 到 30 分钟。完成后在 **Releases** 页面能看到新版本。
5. **二维码和下载页都不用改**：二维码只指向下载页，下载页的 Android 按钮指向 `releases/latest/download/uniclife-android.apk`，总是下载最新 Release。
6. 在一台手机上扫码，从下载页进入 Android 页面安装验证，确认能**覆盖安装**旧版本（签名和包名保持不变）。

注意：

- keystore 由 EAS 保存，**千万不要丢失或重新生成**，否则老用户无法覆盖安装。
- 工作流失败时，可以在 **Actions → Android release → Run workflow** 输入已有标签重新运行，同名标签会覆盖 APK。
- 打错标签需要删除时：

  ```bash
  git push origin :refs/tags/android-v1.1.0
  git tag -d android-v1.1.0
  ```

## 五、iOS 发布流程（TestFlight 与 App Store）

iOS 没有 GitHub Actions 工作流，目前由本地命令触发 EAS 构建。iOS 同样可以使用 OTA。

### A. 前端只改 JS 或资源：OTA

和 Android 共用同一个通道。**Publish EAS Update** 工作流默认会同时给 iOS 和 Android 发布更新，规则和限制与第四节 A 完全相同（需要版本号一致）。

提醒：App Store 审核规范允许用 OTA 修复 bug 和小幅调整，但不得借此改变 App 的主要用途或绕过审核。

### B. 改了原生部分，或者要正式上新版本：构建并提交

1. 按第二节把改动合并到 `main`，需要时提升 `frontend/app.json` 的 `expo.version`。iOS 的 `buildNumber` 由 EAS 远端自动递增。
2. 在 `main` 最新代码上，进入 `frontend/` 完成检查：

   ```bash
   cd frontend
   pnpm lint && pnpm typecheck && pnpm test
   npx expo-doctor
   ```

3. 构建并自动提交到 App Store Connect：

   ```bash
   pnpm dlx eas-cli@latest build --platform ios --profile production --auto-submit
   ```

4. 如果构建成功但提交失败（比如配置有误），修好配置后复用同一个构建，不用重新构建：

   ```bash
   pnpm dlx eas-cli@latest submit --platform ios --profile production --id <build-id>
   ```

5. 进入 **App Store Connect → UnicLife → TestFlight**，等待 Apple 处理构建（通常几分钟到几十分钟）。
6. 先用**内部测试**真机验证：扫码、相机权限、联网、断网重连、推送通知。
7. 要对外正式发布时，在 App Store Connect 的 App Store 标签页里选择这个构建，填写版本说明，**点击「提交审核」**。审核结果由 Apple 决定，通常需要一到数天。
8. 通过审核后，选择手动发布或自动发布。

商店文案、截图在 [app-store/](app-store/README.md) 中维护，上传前需要对照最终功能再核对一遍。

## 六、三条链路总览

| | 后端 | Android | iOS |
| --- | --- | --- | --- |
| 触发 | 合并到 `main` | 推送 `android-vX.Y.Z` 标签 | 本地运行 EAS 命令 |
| 自动化程度 | 全自动（Render） | 全自动（GitHub Actions + EAS） | 半自动（命令行触发） |
| 产物 | 线上 API | `uniclife-android.apk`（经下载页分发） | TestFlight / App Store 构建（经下载页跳转 App Store） |
| 是否需要审核 | 否 | 否（直接分发） | 是（Apple 审核） |
| 热更新 | 不适用 | EAS Update 到 `production` | EAS Update 到 `production` |
| 前置条件 | CI 通过 | 提交已在 `main`、版本号与标签一致、`EXPO_TOKEN` | EAS 凭据、App Store Connect 权限 |

## 七、一次完整版本发布的推荐顺序

1. 确认后端兼容旧版 App，需要的迁移已写好并本地验证。
2. 开发完成，本地 `pnpm check` 通过。
3. 推送实现分支，PR 到 `dev`，CI 通过后合并。
4. PR `dev → main`，CI 通过后合并，**后端自动发布**。
5. 在 Render 确认部署成功，访问 `/api/v1/health` 返回 `OK`。
6. 如果有原生改动：提升 `app.json` 版本号（走 PR 合入 `main`），然后：
   - 推送 `android-vX.Y.Z` 标签发布 Android。
   - 运行 iOS 的 EAS 构建并提交 TestFlight。
7. 如果只有 JS 改动：在 Actions 里运行 **Publish EAS Update**，分支选 `main`。
8. 真机验证后，iOS 在 App Store Connect 提交审核。
9. iOS 通过审核并上架后，把 App Store 链接填进 `site/generate_download.py` 的 `APP_STORE_URL`，走 PR 合并到 `main`，下载页的 iPhone 按钮就会出现。

## 八、发布前检查清单

- [ ] `pnpm check` 本地通过，GitHub 上 `CI / check` 为绿色
- [ ] 没有提交 `.env`、密钥、Token、证书
- [ ] 接口字段变更已同步 `shared/` 和接口文档
- [ ] 数据库迁移向后兼容，已写回滚说明
- [ ] 新增环境变量已配置到 Render 或 EAS，并更新了 `.env.example`
- [ ] 版本号：原生发布时 `app.json` 的 `expo.version` 已提升
- [ ] Android 标签格式为 `android-v` + 版本号，且与 `app.json` 一致
- [ ] GitHub Secret `EXPO_TOKEN` 有效
- [ ] 真机验证过登录、扫码、领取、归还和离线重连
- [ ] 钥匙领取、归还、授权等关键动作的确认与失败提示正常

## 九、常见问题

**推送了标签但 Actions 没有出现 Android release？**
标签指向的提交里必须已经包含 `.github/workflows/android-release.yml`，并且该提交要已合并到 `main`。

**Android release 报「标签与版本不一致」？**
标签 `android-vX.Y.Z` 必须等于 `frontend/app.json` 的 `expo.version`。

**OTA 发布了但用户没收到？**
先检查用户手机上的 App 版本是否等于发布 OTA 时 `app.json` 的版本；其次 App 需要启动两次才会生效。

**后端部署失败？**
先看 Render 日志，多数是迁移 SQL 报错或缺少环境变量；失败时旧版本仍在运行，修好后重新合并即可。

**想回退？**
后端在 Render 回滚上一个部署（数据库迁移不会回退）；OTA 重新发布上一个版本的更新；原生包需要重新发新版本。
