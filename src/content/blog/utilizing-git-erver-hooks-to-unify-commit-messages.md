---
title: 利用 Git 服务端 hook 统一提交消息
pubDatetime: 2023-12-01T23:30:00
tags:
  - git
  - "git hook"
  - "commit message"
description: "这篇文章讨论了使用服务器端和本地钩子来强制执行提交消息标准，并自动化验证过程。"
---

由于某些原因，需要强制开发人员提交带有有效提交消息的提交。作为一名 DevOps 工程师，我的任务是确定一个解决方案，以在 Git 提交和 Jira 事务之间建立联系。这种便利性将使我们能够在项目部署之前通过代码验证每个 Jira issue 已被实现。由此产生的链接可以进一步简化"发布单"的创建，一键即可把所有要发布的项目添加到一个发布单里，每个项目都由其对应的 Jira issue-id 关联。

## Server Hooks

经过一番搜索，我确定了一种可行的解决方案 —— "git server hooks"，可以有效地满足上述要求。

> Git 的功能之一是能够在某些事件（例如提交、推送或合并）之前或之后执行脚本（称为 hook ）。这些 hook 可用于执行各种任务，例如运行测试、检查代码质量或强制执行策略。

通常，开发人员在本地使用 git-hooks 来修复代码问题并检查样式是否一致。不过，值得注意的是， hook 也可以在远程存储库上执行。

git server hook （git 服务端 hook )是在远程存储库上运行的 hook ，而不是在开发人员的本地计算机上运行的。经过实践证明，服务端 hook 对于确保推送到存储库的代码符合某些标准很有用。这些标准可能包括无错误代码、遵守风格指南或通过凭据泄露检查。此外，git server hook 允许在服务器上触发特定操作，例如将代码部署到生产环境、发送通知或更新数据库。

虽然某些 git 平台（如 GitLab）在其管理配置中提供服务端 hook ，但使用这些功能可能需要订阅。考虑到所涉及的支出，单独使用此功能对我来说可能太昂贵了。值得庆幸的是，还有另一种方法允许我们通过直接在 GitLab 实例上编写脚本来实现相同的功能 —— 可以在 GitLab 服务器上使用全局 hook 实现我们的需求。

## Server Hook 的工作原理

服务端 hook 是在远程存储库上运行的 git hook 。利用 GitLab 提供的功能，我们可以建立全局服务端 hook ，从而实现跨所有存储库的 hook 。

> Before actually doing any of the requested updates, your Git:
> Feeds the entire list to the pre-receive hook. That hook can say "no"; if so, the entire push, as a whole, is rejected.
> If that says "ok", feeds the list, one request at a time, to the update hook. When that hook says "ok", does the update. If the hook says "no", your Git rejects the one update, but goes on to examine others.
> After all updates are accepted or rejected in step 2, feeds the accepted list to the post-receive hook.
> -- 来自 StackOverflow

因此，我们可以先编写脚本来检索"rev-list"项，

```bash
#!/bin/bash

GREEN='\033[0;32m'
ERROR='\033[0;31m'
WARN='\033[0;33m'
BLINK='\033[1;4;5m'
COLOR_OFF='\033[0m'

read stdin # read args from hook

src=`echo $stdin | awk '{print $1}'` # source ref
target=`echo $stdin | awk '{print $2}'` # target ref

# DO NOT quote the ^0+$, or it will failed
if [[ "${target}" =~ ^0+$ ]]; then
    # `git push --delete origin/<refs>` will provide src=XXXX*, target=0000*
    exit 0
fi

FLAG_ERR=0

commits=`git rev-list ${target} --not --all` # get all commits from HEAD to target
for commit_hash in ${commits[*]}; do
    obj_type=`git cat-file -t ${commit_hash}` # get type of the commit objectId
    if [[ ${obj_type} == 'commit' ]]; then
        message=`git log -1 --format='%s' ${commit_hash}` # extract the commit message from the commit
        check_commit "${message}" # execute function to check the message
        if [[ $? = 1 ]];then # if check_commit failed, print the illegal commit id and it's message
            echo -e "GL-HOOK-ERR: ${WARN} [`echo ${commit_hash} | cut -c -7`] ${message}${COLOR_OFF}"
            FLAG_ERR=1
        fi
    fi
done

if [[ ${FLAG_ERR} == 0 ]]; then
    exit 0
fi

echo ''
echo -e "GL-HOOK-ERR: Please note! The commits listed above that do not follow the standard are not allowed to be submitted ${COLOR_OFF}"
echo -e "GL-HOOK-ERR: Please visit http://github.com for rules and fixes ${COLOR_OFF}"
echo -e "GL-HOOK-ERR: Commit convention example: feat(ISSUE-123): legal message ${COLOR_OFF}"

# 0 indicates permission to commit, 1 indicates commit is not allowed
exit 1
```

在第一个片段中，我们创建一个流程来检查从源分支到目标分支的所有提交。细心的读者可以发现，我在脚本中添加了一些特殊的逻辑，

- 忽略了分支删除，因为该操作也会调用 commit-msg hook
- 逐行打印所有非法提交消息，并提供一个链接 wiki，以便提交者可以找出问题所在

然后，我们重点关注用于检查消息的函数 `check_commit`。

```bash
is_merge_or_revert_resolve () {
    # arg is commit message
    echo "$@" | grep -Pq '^(Merge|Revert|Resolve)\s+'
}

is_legal_pattern () {
    # arg is commit message
    echo $@ | grep -Pq '^.*?(feat|fix|docs|refactor|test|chore|style)\((.*?\s+)?\w+-\d+\):.*$'
}

check_commit() {
    message=$@
    is_merge_or_revert_resolve ${message} || is_legal_pattern ${message}
}
```

上面的片段的功能是忽略了特殊的提交（它们的提交信息开头是 MergeRequest、Revert、Resolve），再判断提交消息是否符合要求。

此外，我们还可以添加一些其他功能，例如白名单等。让我们将它们结合起来，完整的脚本如下：

```bash
#!/bin/bash

# Defining several color indicators to be used in the script
GREEN='\033[0;32m'
ERROR='\033[0;31m'
WARN='\033[0;33m'
BLINK='\033[1;4;5m'
COLOR_OFF='\033[0m'

# Define a list of projects that are whitelisted
WHITE_LIST_PROJ=(
    ^github-mirror/.*$
    ^qa/.*$
)
for proj in ${WHITE_LIST_PROJ[*]}; do
  if [[ ${GL_PROJECT_PATH} =~ $proj ]]; then
    echo -e "Whitelist matched ${COLOR_OFF}"
    exit 0
  fi
done

# The list of existing projects to be checked
EXISTS_PROJ=(IFDEVOPS DEMO)

is_merge_or_revert_resolve () {
    # This function checks if the commit message begins with "Merge", "Revert" or "Resolve"
    echo "$@" | grep -Pq '^(Merge|Revert|Resolve)\s+'
}

is_legal_pattern () {
    # This function checks if the commit message conforms to a specific pattern
    echo $@ | grep -Pq '^.*?(feat|fix|docs|refactor|test|chore|style)\((.*?\s+)?\w+-\d+\):.*$'
}

is_exists_issue () {
    prefix=$(echo $@ | perl -nle 'print $1 if /^.*?(?:feat|fix|docs|refactor|test|chore|style)\((?:.*?\s+)?(\w+-\d+)\):.*$/' | cut -f 1 -d '-')
    if [[ ! "${EXISTS_PROJ[*]}" =~ "$" ]]; then
        return 1
    fi
}

check_commit() {
    message=$@
    is_merge_or_revert_resolve $ || is_legal_pattern $ && is_exists_issue $
}

# if the hook is triggered by merge request, skip the check
if [[ ${GL_PROTOCOL} == 'web' ]]; then
    exit 0
fi

read stdin
# For debug purpose
# echo -e "GL-HOOK-ERR: $$${COLOR_OFF}"

src=`echo $stdin | awk '{print $1}'`
target=`echo $stdin | awk '{print $2}'`

# DO NOT quote the ^0+$, or it will lead to failure
if [[ "$" =~ ^0+$ ]]; then
    # `git push --delete origin/<refs>` will set src=XXXX*, target=0000*
    exit 0
fi

FLAG_ERR=0

commits=`git rev-list $ --not --all`
for commit_hash in ${commits[*]}; do
    obj_type=`git cat-file -t ${commit_hash}`
    if [[ ${obj_type} == 'commit' ]]; then
        message=`git log -1 --format='%s' ${commit_hash}`
        check_commit "$"
        if [[ $? = 1 ]];then
            echo -e "GL-HOOK-ERR: $ [`echo ${commit_hash} | cut -c -7`] $${COLOR_OFF}"
            FLAG_ERR=1
        fi
    fi
done

if [[ ${FLAG_ERR} == 0 ]]; then
    exit 0
fi

echo ''
echo -e "GL-HOOK-ERR: Please note! The commits listed above that do not follow the standard are not allowed to be submitted ${COLOR_OFF}"
echo -e "GL-HOOK-ERR: Please visit http://github.com for rules and fixes ${COLOR_OFF}"
echo -e "GL-HOOK-ERR: Commit convention example: feat(ISSUE-123): legal message ${COLOR_OFF}"

# 0 indicates permission to commit, 1 indicates commit is not allowed
exit 1
```

上述脚本具有以下功能：

- 它会阻止任何与标准模式不匹配的提交，匹配的提交应该如： `feat(xx-123): foobar`。
- 不检查已在远程存储库中创建的提交
- 不检查任何 MergeRequest、Merge 或 Revert 提交
- 不检查白名单中列出的任何组或项目
- 忽略"分支删除"提交
- 使用颜色编码打印输出以增强可读性

将上面的脚本保存在 GitLab 服务器，将其放置到 GitLab 服务端 hook 路径中，例如 `/opt/gitlab/embedded/service/gitlab-shell/hooks/pre-receive.d/commit-msg`。

当 `pre-receive.d/commit-msg` 存在时，所有推送到 GitLab 的提交都会被检查，如果检查失败，git push 命令将收到如下错误输出，并且所有不符合规定的提交被列出来。

## 检查左移

为了防止开发人员在修复提交上浪费时间，在项目里使用一个在提交之前验证每个提交消息的本地 hook 将非常有用。

如果您是 IDE 用户，请安装 GitToolBox 插件。对于使用 Vim 或其他文本编辑器的极客，请将以下脚本保存到 `repoRoot/.git/hooks/commit-msg`

```bash
#!/bin/bash

ERROR='\033[0;31m'
WARN='\033[0;33m'
BLINK='\033[1;4;5m'
COLOR_OFF='\033[0m'

commit_msg=`cat $1`

is_merge_or_revert () {
    echo "$@" | perl -nle 'exit 1 if !m{^(Merge|Revert)\s*}'
}

is_legal_pattern () {
    echo "$@" | perl -nle 'exit 1 if !m{^.*?(feat|fix|docs|refactor|test|chore|style)\((.*?\s+)?\w+-\d+\):.*$}'
}


is_merge_or_revert ${commit_msg} || is_legal_pattern ${commit_msg}

if [[ $? = 1 ]];then
    echo -e "${ERROR}${BLINK}commit message illegal ${COLOR_OFF}"
    echo ""
    echo -e "${ERROR}${commit_msg}${COLOR_OFF}"
    exit 1
fi
```

## 更进一步 - 自动化

当新成员加入项目或设置新项目时，他们需要手动将脚本复制并粘贴到 hook 目录中才能启用它们。然而，默认情况下，Git 中无法跟踪 hook 文件，导致无法确定哪个团队成员未启用 hook。

考虑到这一点，更有效的方法是默认启用本地 hook。

对于 NodeJs 项目，请使用这个工具 可见 [husky | 🐶（typicode.github.io）](https://typicode.github.io/husky/#/?id=features)

Maven 项目请参考[☞ Managing Git Hooks in Maven Projects | Dev With Imagination](https://www.devwithimagination.com/2020/04/05/managing-git-hooks-in-maven-projects/)

其他请参考 [☞ Putting Git hooks into a repository - Stack Overflow](https://stackoverflow.com/questions/3462955/putting-git-hooks-into-a-repository/54281447#54281447) 以及 [pre-commit](https://pre-commit.com/)

## 相关链接

- [本文首发 Medium](https://medium.com/@Stark-X/utilizing-git-server-hooks-to-unify-commit-messages-27e40904e809)
- 由 Bing / GPT 辅助翻译回中文
- 长按关注不迷路：[medium/@Stark-X](https://medium.com/@Stark-X), [blog/@Stark-x](https://blog.stark-x.cn/)
