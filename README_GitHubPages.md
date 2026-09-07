# 方案 C：GitHub Pages + JSONBin 云数据库部署教程（v1.6）

> 适用场景：想让**全家任何手机/电脑**打开同一个网址，共用一份数据（学习计划、积分、作业）。
> 本方案不依赖自己的电脑/服务器，用两个免费服务组合：
> - **GitHub Pages**：托管网页（正式 HTTPS，摄像头/录音完整可用）
> - **JSONBin**：云端数据库（多设备数据自动同步）
>
> v1.6 起已提速（脚本延迟加载 + 缓存节流），并支持**在网站里直接配置云同步**，
> 妈妈不用再碰代码文件。

---

## 第一步：上传网页文件（约 5 分钟）

> 需要先有一个 GitHub 仓库（没有就注册 https://github.com → New repository → 名称填 `study-app`，Public）。

1. 打开你的仓库页面，点 **uploading an existing file** 链接
2. 把部署包 **`study-pages-cloud.zip`** 里的**全部 12 个文件**拖进上传区
   （index.html、style.css、app.js、app-ext.js、app-auth.js、app-sync.js、cloud-config.js、sw.js、manifest.json、icon-192.png、icon-512.png、README_GitHubPages.md）
3. 拉到最下面点 **Commit changes**

## 第二步：开启 GitHub Pages（约 2 分钟）

1. 仓库页面点 **Settings** → 左侧 **Pages**
2. Branch 选 `main`，目录 `/(root)` → **Save**
3. 等 1~2 分钟刷新，顶部出现网址：`https://你的用户名.github.io/study-app/`
4. 先在电脑浏览器打开确认能进

## 第三步：在网站内开启“多设备云同步”（约 5 分钟，妈妈手机就能做）

打开网站 → **妈妈账号登录** → 底部「设置」→「多设备云同步」：

1. 手机/电脑浏览器打开 **https://jsonbin.io** 注册（邮箱即可，免费）
2. 右上角 **+ Create Bin** → 内容随便填 → **Create**
   → 网址里 `.../v3/b/` 后面的那串字符就是 **Bin ID**
3. 点头像 → **API Keys** → 复制 **X-Master-Key**
4. 回到网站同步设置框：粘贴 **Bin ID** 和 **X-Master-Key** → 点「💾 保存并连接」

看到「✅ 已连接云端并开始同步」= 成功。以后：
- 妈妈改完计划点「保存并同步到全家」→ 其他手机/电脑打开自动更新；
- 孩子在家、在爷爷奶奶家、在姥姥家打开同一个网址，数据都一样。

> 不想用手机操作？也可以直接在 GitHub 仓库里编辑 `cloud-config.js`，
> 把两个 `替换我` 换成 Bin ID 和 Master Key 再 Commit 即可，效果相同。

## 第四步：验证 + 添加到手机主屏

1. 等 1~2 分钟（Pages 部署有缓存延迟），手机浏览器打开网址
2. 页面底部显示「✅ 云端已连接」= 全部成功 🎉
3. **数据最全的那台设备先打开一次**，数据会自动上传云端
4. 浏览器菜单 → **添加到主屏幕**，以后像 App 一样点开

---

## 常见问题

**Q：GitHub 打开慢？**
v1.6 已做提速（页面秒开、缓存节流）。如果还想更快，可改用 Cloudflare Pages（国内一般更快）：
Cloudflare Dashboard → Workers & Pages → Create → Pages → Upload assets → 把 `study-pages-cloud` 文件夹里全部文件拖进去上传，得到 `xxx.pages.dev` 网址。
注意：Cloudflare 直传后不方便在线改文件，请在网站后台（方式 A）开启同步。

**Q：忘了配置，两台设备数据不一样怎么办？**
以数据最全的那台为准：在另一台浏览器清掉该网站数据后重新打开，会自动拉取云端。

**Q：换手机/新设备怎么同步？**
新设备打开网站 → 用妈妈账号登录 → 设置 → 多设备云同步 → 填同样的 Bin ID / Master Key → 保存。数据自动出现。

**Q：如何备份数据？**
打开 jsonbin.io → 你的 Bin → 可查看/下载当前 JSON；免费版每月约 1 万次请求，全家使用足够。

**Q：原来的 PythonAnywhere / 局域网版本会受影响吗？**
完全不会。三套环境共用同一份前端代码，自动适配。
