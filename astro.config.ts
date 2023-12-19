import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import toc from "@jsdevtools/rehype-toc";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypeSlug from "rehype-slug";
import { SITE } from "./src/config";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";

import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
    sitemap(),
    mdx(),
  ],
  markdown: {
    remarkPlugins: [remarkReadingTime],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: "wrap" }],
      [rehypeExternalLinks, { content: { type: "text", value: " 🔗" } }],
      toc,
    ],
    shikiConfig: {
      theme: "one-dark-pro",
      wrap: true,
    },
  },
  vite: {
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  scopedStyleStrategy: "where",
  output: "hybrid",
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
    speedInsights: {
      enabled: true,
    },
    edgeMiddleware: true,
  }),
  redirects: {
    "/Solutions/Local-kubernetes-cluster-with-kubeadm-vagrant-and-virtualbox.html":
      "/posts/%E4%BD%BF%E7%94%A8kubeadm-vagrant-virtualbox%E9%83%A8%E7%BD%B2%E6%9C%AC%E5%9C%B0kubernetes%E9%9B%86%E7%BE%A4",
    "/Solutions/local-kubernetes-cluster-with-kubeadm-vagrant-and-virtualbox-tldr.html":
      "/posts/%E4%BD%BF%E7%94%A8kubeadm-vagrant-virtualbox%E9%83%A8%E7%BD%B2%E6%9C%AC%E5%9C%B0kubernetes%E9%9B%86%E7%BE%A4---tldr",
    "/Solutions/Use-kolla-ansible-deploy-OpenStack.html":
      "/posts/%E4%BD%BF%E7%94%A8-kolla-ansible-%E9%83%A8%E7%BD%B2-openstack",
    "/troubleshoot/shell-value-too-great-for-base-error-token-is-08.html":
      "/posts/shell---value-too-great-for-base-error-token-is-08",
    "/Develop/Using-Mockito-to-partially-mock-a-class.html":
      "/posts/%E4%BD%BF%E7%94%A8-mockito-mock-%E7%B1%BB%E7%9A%84%E4%B8%80%E9%83%A8%E5%88%86-%E8%AF%91",
    "/Tools/the-great-vim.html":
      "/posts/%E4%B8%8A%E5%8F%A4%E7%A5%9E%E5%99%A8vim",
    "/Basic/http-2-0.html": "/posts/http2",
  },
});
