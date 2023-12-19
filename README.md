# 我的官方博客

欢迎浏览，评论： https://blog.stark-x.cn

我的个人博客，基于 [AstroPaper](https://github.com/satnaing/astro-paper)做了一些修改。

原主题基于 Astro 3.X，我的修改版本已经把 Astro 更新到 4.X，并做了对应的适配。

## 特性

新增若干特性，持续更新中。

#### Gist URL 自动转换

Markdown 文件内的 `gist.github.com/Stark-X/3dab3058e1c38d53821ba621ccd461ed`会被转换为`<script src="https://gist.github.com/Stark-X/3dab3058e1c38d53821ba621ccd461ed.js"></script>`并渲染。注意，`https://`必须去掉，才能正常转换，目前发现是因为 markdown 里的超链接会被自动转换成`<a>`标签，导致最终的渲染冲突，目前还没修复的头绪。

#### 文章阅读数

利用了 Vercel 提供的[kv存储](https://vercel.com/docs/storage/vercel-kv)实现，参考[「使用 Vercel Storage 给Astro站点添加浏览量统计功能」](https://yuy1n.io/articles/add-pv-with-vercel-kv)实现，在原基础上增加了一段代码检查是否为本地开发，如果是，则直接返回999，避免本地开发时报错。

**注意**

- 开启本功能，需要在运行环境提供环境变量 `KV_REST_API_URL`以及`KV_REST_API_TOKEN`，并使用 serverless 模式或者 hybrid 模式部署服务。
- hybrid 模式下，setPv.ts 里的 `export const prerender = false;` 不能去掉，否则会因为服务器渲染而变成一直是统计 404 页面的浏览量。

#### 预计阅读时长

参照[官网介绍](https://docs.astro.build/zh-cn/recipes/reading-time/)通过自定义 remark 插件实现。

文章的预计阅读时长会展现在文章的日期旁边。

#### 认证证书陈列组件

参考 SAFe Aglist 的认证证书的网页内嵌样式，模仿出来的组件，参考[about.mdx](https://github.com/Stark-X/my-astro-blog/blob/master/src/pages/about.mdx)的使用方法，打开[关于我(about)](https://blog.stark-x.cn/about#%E8%AF%81%E4%B9%A6--certified)页面查看效果。

#### GTag 统计浏览量

环境变量`GTAG_ID`有值时，就会开启 GTag 统计。

#### WalineJS 评论框

配置文件`src/config.ts` 里提供以下设置时，在文章详情内会开启 [WalineJS](https://waline.js.org/) 的评论框。

```javascript
export const COMPONENTS_CFG = {
  walineServer: "<commentServerUrl>",
};
```

### 🔥 原主题的特性

- [x] type-safe markdown
- [x] super fast performance
- [x] accessible (Keyboard/VoiceOver)
- [x] responsive (mobile ~ desktops)
- [x] SEO-friendly
- [x] light & dark mode
- [x] fuzzy search
- [x] draft posts & pagination
- [x] sitemap & rss feed
- [x] followed best practices
- [x] highly customizable
- [x] dynamic OG image generation for blog posts [#15](https://github.com/satnaing/astro-paper/pull/15) ([Blog Post](https://astro-paper.pages.dev/posts/dynamic-og-image-generation-in-astropaper-blog-posts/))

_Note: I've tested screen-reader accessibility of AstroPaper using **VoiceOver** on Mac and **TalkBack** on Android. I couldn't test all other screen-readers out there. However, accessibility enhancements in AstroPaper should be working fine on others as well._

### ✅ Lighthouse Score

<p align="center">
  <a href="https://pagespeed.web.dev/report?url=https%3A%2F%2Fastro-paper.pages.dev%2F&form_factor=desktop">
    <img width="710" alt="AstroPaper Lighthouse Score" src="AstroPaper-lighthouse-score.svg">
  <a>
</p>

## 📜 License

Licensed under the MIT License, Copyright © 2023
