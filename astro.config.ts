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

import vercel from "@astrojs/vercel/static";

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
  output: "static",
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
    speedInsights: {
      enabled: true,
    },
  }),
  redirects: {
    "/Solutions/Local-kubernetes-cluster-with-kubeadm-vagrant-and-virtualbox.html":
      "/posts/使用kubeadm-vagrant-virtualbox部署本地kubernetes集群",
    "/Solutions/local-kubernetes-cluster-with-kubeadm-vagrant-and-virtualbox-tldr.html":
      "/posts/使用kubeadm-vagrant-virtualbox部署本地kubernetes集群---tldr",
    "/Solutions/Use-kolla-ansible-deploy-OpenStack.html":
      "/posts/使用-kolla-ansible-部署-openstack",
    "/troubleshoot/shell-value-too-great-for-base-error-token-is-08.html":
      "/posts/shell---value-too-great-for-base-error-token-is-08",
    "/Develop/Using-Mockito-to-partially-mock-a-class.html":
      "/posts/使用-mockito-mock-类的一部分-译",
    "/Tools/the-great-vim.html": "/posts/上古神器vim",
    "/Basic/http-2-0.html": "/posts/http2",
  },
});
