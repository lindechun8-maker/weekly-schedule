# 我的周日程表

一个可在电脑与手机上使用的课程与任务周日程表。课程底稿来自用户提供的课表图片；任务数据默认保存于浏览器本地。

## 发布到 GitHub Pages

仓库创建并推送后，在 GitHub 仓库中依次打开 **Settings → Pages**，选择 **Deploy from a branch**，分支选择 `main` 和 `/ (root)`，保存即可。发布网址将是：

`https://lindechun8-maker.github.io/<仓库名>/`

## 启用跨设备同步（Supabase）

1. 在 [Supabase](https://supabase.com) 创建一个免费项目。
2. 在 **SQL Editor** 执行 [`supabase-setup.sql`](./supabase-setup.sql) 的内容。
3. 在 **Authentication → URL Configuration** 中加入 GitHub Pages 的网址作为 Redirect URL。
4. 将 **Project URL** 和 **anon public key** 提供给我，我会将登录与实时同步接入网页。

该方案使用 Supabase 登录和 Row Level Security；只有登录同一账号的设备能够读取或修改同一份日程。
