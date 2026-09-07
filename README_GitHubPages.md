# 方案 C：GitHub Pages + JSONBin 云数据库部署教程

> 适用场景：PythonAnywhere 的唯一网站名额要留给原来的网站，不想动它。
> 本方案**完全不碰 PythonAnywhere**，用两个免费服务组合：
> - **GitHub Pages**：托管网页（正式 HTTPS，摄像头/录音完整可用）
> - **JSONBin**：云端数据库（多设备数据自动同步）
>
> 电脑关机、出门在外、换 WiFi 都能用。预计耗时 20~30 分钟。

---

## 第一步：注册 GitHub 并创建仓库（约 5 分钟）

1. 打开 https://github.com → Sign up 注册（邮箱+密码，用户名随便起，比如 `mama2026`）
2. 登录后，点右上角 **+** → **New repository**
3. Repository name 填：`study-app`
4. 选择 **Public**（免费版 Pages 只支持公开仓库，网页本身没有敏感信息，数据都在 JSONBin，不用担心）
5. 点 **Create repository**

## 第二步：上传网页文件（约 5 分钟）

1. 在新仓库页面，点 **uploading an existing file** 链接
2. 把部署包 `study-pages-deploy` 文件夹里的 **全部 10 个文件** 一起拖进上传区
   （index.html、style.css、app.js、app-ext.js、app-sync.js、cloud-config.js、sw.js、manifest.json、icon-192.png、icon-512.png）
3. 拉到最下面点 **Commit changes**

## 第三步：开启 GitHub Pages（约 2 分钟）

1. 仓库页面点 **Settings** → 左侧 **Pages**
2. Branch 下面选 `main`，目录 `/(root)` → 点 **Save**
3. 等 1~2 分钟刷新，页面顶部会出现网址：
   `https://你的用户名.github.io/study-app/`
4. 现在先在电脑浏览器打开这个网址确认能进（此时云同步还没配置，会提示"未检测到云端接口"，属正常）

## 第四步：注册 JSONBin 并创建数据库（约 5 分钟）

1. 打开 https://jsonbin.io → Sign Up 注册（免费）
2. 登录后左侧 **Bins** → 点 **Create Bin** → Name 随便填（如 study-data）→ 内容保持 `{}` → **Create**
3. 创建成功后页面会显示 **Bin ID**（一串字符，如 `66d1a2b3c4d5`），复制保存
4. 左侧 **API Keys** → 复制 **X-Master-Key**（一长串字符）

> 💡 免费额度约 1 万次请求/月。系统已自动把轮询放宽到 3 分钟一次，
> 两个孩子+妈妈三台设备正常使用完全够。想更省可以在密钥页创建只绑定这一个 Bin 的 Access Key。

## 第五步：填写云同步配置（约 2 分钟，关键步骤）

1. 回到 GitHub 仓库页面，点开 **cloud-config.js** 文件
2. 点右上角 **铅笔图标（Edit this file）**
3. 把两个 `替换我` 分别换成：
   - `binUrl`：`https://api.jsonbin.io/v3/b/你的BinID`
   - `masterKey`：你的 X-Master-Key
4. 点 **Commit changes** 保存

## 第六步：验证 + 添加到手机主屏

1. 等 1~2 分钟（Pages 部署有缓存延迟），手机浏览器打开：
   `https://你的用户名.github.io/study-app/`
2. 看到提示 **"☁️ 已连接云端，多设备数据同步中"** = 全部成功 🎉
3. 没提示？等 2 分钟再刷新一次，或检查 cloud-config.js 是否保存成功
4. **数据最全的那台设备先打开一次**，它的数据会自动上传云端，其他设备随后自动拉取
5. 浏览器菜单 → **添加到主屏幕**，以后像 App 一样点开

---

## 常见问题

**Q：GitHub 打开慢/偶尔打不开？**
国内访问 github.io 有时较慢，可以改用 Cloudflare Pages（一般更快）：
Cloudflare Dashboard → Workers & Pages → Create → Pages → Upload assets → 把 `study-pages-deploy` 文件夹拖进去 → 得到 `xxx.pages.dev` 网址。
注意：Cloudflare 直传后**无法在线改文件**，所以要先在本地把 cloud-config.js 填好再上传。

**Q：忘了同步提示，两台设备数据不一样怎么办？**
以数据最全的那台为准，在另一台浏览器里清掉网站数据后重新打开，会自动拉取云端。

**Q：如何备份数据？**
打开 JSONBin → 你的 Bin → 可以随时查看/下载当前 JSON；也能在网页端手动编辑（紧急修复用）。

**Q：原来的 PythonAnywhere 网站会受影响吗？**
完全不会。本方案一个文件都不用上传到 PythonAnywhere。

**Q：本地局域网版还能用吗？**
能。三套环境（局域网 / PythonAnywhere / GitHub Pages）前端代码是同一份，自动适配。
