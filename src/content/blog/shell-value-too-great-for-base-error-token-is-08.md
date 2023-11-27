---
title: shell - value too great for base (error token is '08')
tags:
  - shell
  - 疑难杂症
keywords:
  - shell, error token is 08, troubleshoot
pubDatetime: 2020-03-06T23:39:54+08:00
description: "Shell 里的数字进制"
categories: troubleshoot
header_image:
---

<!-- toc -->
<!-- Description to show on index here  -->

在 shell 脚本编写时，有时候需要进行数学运算（例子🌰：`$((1 + 1))`），特殊情况下，输入的数字是带着 0 前序的，当对这个带着 0 前序的数字进行数学运算时，计算结果会与预想中的不一致，或者直接报错，错误信息如`value too great for base (error token is "02")`

那是因为 bash 执行 shell script 时，0 前缀的数字被认为是 8 进制的数字，经过测试，zsh 里不会报错，数字“09”还是被认为是十进制的“9”。

<!-- more -->

## 例子 🌰

有如下 crontab 定时任务，在每隔一个周日的凌晨 3 点钟执行脚本 /backup/backup.sh，编写的 crontab 内容如下

```bash
# crontab
0 3 * * 7 [ $(($(date +%U) % 2)) -eq 0 ] && sh /bakcup/backup.sh
```

`[ $(($(date +%U) % 2)) -eq 0 ]` 表示获取当前的周序号（以周日作为第一天的周），把结果模 2，余数是否等于 0，以此判定是否为偶数周，如果是，则执行“&&”后面的命令。

如果把 zsh 作为 shell，在测试这一条命令时，或者刚好当前的周是双位数，则不会报错，也就不会发现这个问题，直到最多长达 40+ 周之后，才会在第二年的开头发现定时任务无法正常执行。

## 解决办法

在数字前面加上 `10#`，显式地把该数字标记为十进制，上述的 crontab 改为如下版本即可。

```bash
0 3 * * 7 [ $((10#$(date +%U) % 2)) -eq 0 ] && sh /bakcup/backup.sh
```
