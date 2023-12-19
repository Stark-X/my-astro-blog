import type { CollectionEntry } from "astro:content";
import { notDraftInPROD } from "@utils/postFilter";

const getSortedPosts = (posts: CollectionEntry<"blog">[]) =>
  posts
    .filter(notDraftInPROD)
    .sort(
      (a, b) =>
        Math.floor(new Date(b.data.pubDatetime).getTime() / 1000) -
        Math.floor(new Date(a.data.pubDatetime).getTime() / 1000)
    );

export default getSortedPosts;
