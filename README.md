# dsh-doc-focus

在 DSH 原生右侧栏点击「全屏」，文档或浏览器铺满上方，底部保留当前主会话的原生输入框与回复区。

支持所有原生右侧栏页签，包括 better-sidebar 文件编辑器、Markdown、PDF、图片、HTML 预览、原生浏览器与第三方浏览器页签。插件调整容器布局，不读取文件、不复制渲染器、不搬动 iframe，也不替换会话输入服务。

## 使用

1. 在右侧栏打开文件、浏览器或其他页签。
2. 点击右上角原有的「全屏」按钮。
3. 在底部原生输入框继续对话。上方仍可操作浏览器、阅读文档；拖动分隔条可调整回复区高度，也可点「展开对话」。
4. 点「退出全屏」恢复普通布局。非输入控件、非模态弹窗内的 Escape 也可退出。

输入草稿、附件、模型选择、发送与审批都继续使用 DSH 原生组件。插件不自动发送任何消息。全屏与调整大小不会因本插件重新加载浏览器或清空其表单；切换页签时是否保留页面，由对应宿主查看器的生命周期设置决定。

安装后，插件会以 `icon.svg` 与 `locale/en.json`、`locale/zh.json` 的名称与简介出现在宿主的插件清单中；仓库标签为 `dsh`、`dsh-plugin`、`deepseek-harness`、`deepseek`、`dsh-plugins`、`sidebar`、`dsh-better-sidebar`、`fullscreen`。

底部会话区默认约 260px，可调整到视口高度的 65%。高度偏好保存在当前浏览器。窄屏自动全屏也会启用底部会话区。首次进入时高度不足 400px 会保持原生布局；已进入后若软键盘压缩可视区，会缩小布局并保留输入区。

## 安装与构建

从 GitHub 安装（宿主插件管理器支持 git 源）：

    /Applications/DeepSeek\ Harness.app/Contents/Resources/runtime/cli/bin/dsh plugin --profile desktop add git+https://github.com/Altha-dt/dsh-doc-focus

从源码安装（本地开发）：

    /Applications/DeepSeek\ Harness.app/Contents/Resources/runtime/cli/bin/dsh plugin --profile desktop add link:/Users/dl/Downloads/wks/dsh-doc-focus

在此目录执行 `pnpm install`、`pnpm run build`、`pnpm test`。

需要 DSH 原生右栏与会话 DOM 语义标记；开发验证基于 DSH 0.2.1-rc.5。安装后宿主应自动重新组合 profile；如果已打开的页面未同步，请刷新当前页面。包不包含新的网络服务或主机文件路由。

## 版本与兼容性

| 项目 | 值 |
| --- | --- |
| 包版本 | 0.1.1 |
| 最低 DSH 版本 | 0.2.1-rc.1（`engines.dsh`） |
| 验证版本 | DSH 0.2.1-rc.5（Desktop，commit d4db512） |
| Node | >= 20 |
| 许可 | MIT |

宿主在安装时按 `engines.dsh` 判断兼容性；版本不满足时插件管理器会拒绝安装，可用 `dsh plugin allow-version` 为指定版本与运行时显式放行。仓库另有 `dsh.compatibility.dshReleases` 逐版本标注兼容性，供社区目录与人工查阅。

## 兼容与限制

- 保留原生查看器行为；具体格式支持取决于宿主与已安装的文件查看器。
- 第三方插件若有独立于右侧栏的全窗口浮层，不受此布局管理。
- 浏览器 iframe 内的 Escape 由网页自己处理，退出时可点击外部工具条。
- 主会话底部区域可以查看回复或放大；这是原生会话区域，而不是另一个侧线程。
- 通过宿主公开的 DOM data 标记适配布局，宿主将来变更这些标记时需要适配；找不到匹配的会话或侧栏时保持原生布局。

## 卸载

在 DSH 插件页停用/卸载 `dsh-doc-focus`，或运行 Desktop CLI 的 `plugin --profile desktop remove dsh-doc-focus`。停用时移除插件标记、样式与工具条，恢复原布局。

## 开发

源码在 `src/client.js` 与 `src/style.css`。`scripts/build.mjs` 将原生 JS 包装成 DSH ModuleLoader 客户端模块。Host 半为空实现，仅用于标准插件注册；没有生产依赖，不引用或复制其他社区插件代码。

浏览器测试用 Playwright Core 驱动本机 Chrome，覆盖浏览器表单与会话输入同时操作、iframe 身份保留、发送回调、拖拽/键盘调整、模态 Escape、会话身份隔离、窄屏与停用清理。
