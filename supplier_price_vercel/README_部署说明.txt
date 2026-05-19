供应商价格查询网站 - Vercel 免费部署版

一、你会得到什么
部署完成后，你会得到一个类似下面的网址：
https://supplier-price-xxx.vercel.app

以后不同电脑、不同浏览器、手机都可以直接打开这个网址；数据保存在 Supabase 在线数据库中，不再依赖本地 index.html 文件路径。

二、文件说明
index.html：网站页面
app.js：网站功能
styles.css：网站样式
config.js：Supabase 数据库连接配置
supabase建表和导入数据.sql：建表 + 导入当前已有数据
package.json / vercel.json：Vercel 部署配置

三、部署前必须先配置 Supabase
1. 打开 https://supabase.com
2. 注册 / 登录
3. New project 创建项目
4. 进入左侧 SQL Editor
5. 打开本文件夹里的「supabase建表和导入数据.sql」
6. 复制全部 SQL 内容，粘贴到 Supabase SQL Editor 里运行
7. 进入 Project Settings → API
8. 复制：
   - Project URL
   - anon public key
9. 打开 config.js，把里面的空白内容替换成你的 URL 和 anon key：

window.SUPABASE_URL = "你的 Project URL";
window.SUPABASE_ANON_KEY = "你的 anon public key";

注意：anon public key 是前端公开使用的，不是 service_role key。不要填写 service_role key。

四、部署到 Vercel 方法 A：网页上传法，适合小白
1. 打开 https://vercel.com
2. 注册 / 登录
3. 点击 Add New → Project
4. 如果没有 GitHub，也可以使用 Vercel CLI；更推荐方法 B。

五、部署到 Vercel 方法 B：GitHub 导入法，最稳定
1. 打开 https://github.com，新建一个仓库，比如 supplier-price-web
2. 把本文件夹里的所有文件上传到这个仓库
3. 打开 https://vercel.com
4. 点击 Add New → Project
5. 选择刚才的 GitHub 仓库
6. Framework Preset 选择 Vite，如果没有自动识别也没关系
7. Build Command：npm run build
8. Output Directory：dist
9. 点击 Deploy
10. 部署完成后，Vercel 会生成一个网址，收藏这个网址即可。

六、部署到 Vercel 方法 C：命令行法，适合会一点电脑操作的人
1. 安装 Node.js：https://nodejs.org
2. 解压本项目文件夹
3. 在文件夹空白处按住 Shift + 鼠标右键，选择“在终端中打开”
4. 输入：
   npm install
   npm run build
   npx vercel --prod
5. 按提示登录并部署

七、后续如何更新网站
如果你让我继续优化网站，我会给你新版文件。你只需要：
1. 替换 GitHub 仓库里的旧文件
2. Vercel 会自动重新部署
3. 原来的网址一般不变

八、常见问题
1. 打开网页显示“未配置 Supabase”？
说明 config.js 里还没填 Project URL 和 anon key，或上传到 Vercel 的不是修改后的 config.js。

2. 数据没有同步？
请确认不同电脑打开的是同一个 Vercel 网址，并且 config.js 连接的是同一个 Supabase 项目。

3. 修改数据后看不到变化？
刷新网页；如果仍不显示，检查 Supabase 表是否建好、URL/key 是否正确。

4. 是否收费？
Supabase 和 Vercel 都有免费额度。你这个供应商价格查询系统数据量很小，正常使用一般免费额度就够。
