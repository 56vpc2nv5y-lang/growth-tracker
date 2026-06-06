# 部署说明

## 本地使用

不建议长期通过 `file:///` 直接打开，因为浏览器对本地文件的存储行为并不稳定。建议在 `D:\growth` 目录启动本地静态服务器：

```powershell
python -m http.server 8000
```

然后访问 `http://localhost:8000/growth_tracker.html`。

从 `file:///` 切换到本地服务器前，请先在设置中导出 JSON；打开新地址后再导入，因为两个地址的浏览器存储相互独立。

## 部署到 Vercel

### 通过 Git 仓库

1. 将 `growth_tracker.html` 和 `vercel.json` 提交到 GitHub 仓库。
2. 在 Vercel 中选择 **Add New Project**，导入该仓库。
3. Framework Preset 选择 **Other**，无需 Build Command。
4. 点击 Deploy。`vercel.json` 已将网站根路径 `/` 指向应用页面。

### 通过 Vercel CLI

```powershell
npm install -g vercel
cd D:\growth
vercel
vercel --prod
```

## 数据与安全边界

- 页面数据默认保存在当前浏览器的 `localStorage`；部署到 Vercel 不等于自动跨设备同步。
- 跨设备同步可继续使用页面现有的 Firebase 配置，但应配置严格的 Firebase Security Rules。
- AI API Key 会保存在当前浏览器中。不要把真实 Key 写进 HTML、Git 仓库或 `vercel.json`。
- 更正式的多人或跨设备版本，应将 Firebase 写入和 AI 请求迁移到带身份认证的后端接口。
- 应用会在浏览器中保留最近 7 个每日快照；Firebase 同步成功时也会每天留下一个独立云端快照。
- 页面会每 7 天提醒手动导出一次 JSON，避免浏览器存储和云同步同时失效。
- 部署到 HTTPS 后可安装为 PWA 并离线打开。Service Worker 已预留推送通知接收能力，但可靠的关页定时提醒仍需要额外的推送后端。

## 提醒与日历的当前边界

- 当前提醒适合页面保持打开时使用；设置页可以授权并测试系统通知。
- 暂不建议只为个人日程接轻后端：可靠 Web Push 还需要保存浏览器订阅、管理 VAPID 密钥，并用定时任务扫描到期日程。等关页提醒成为明确刚需后再接更划算。
- 日程定位为规划沙盘，并支持标准 `.ics` 导入和导出。可以与 Outlook、Google 日历、苹果日历交换日程，但不会自动双向同步，也不会要求读取你的完整日历账号。
