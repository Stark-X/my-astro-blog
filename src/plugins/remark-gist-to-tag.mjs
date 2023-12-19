import { findAndReplace } from "mdast-util-find-and-replace";

export function remarkGistToTag() {
  const regex = /gist\.github\.com\/[\w-]+\/[\w-]+/g;
  function gistToTag(match) {
    return {
      type: "html",
      value: `<script src="//${match}.js"></script>`,
    };
  }
  return function (tree) {
    const replacer = [[regex, gistToTag]];
    findAndReplace(tree, replacer);
  };
}
