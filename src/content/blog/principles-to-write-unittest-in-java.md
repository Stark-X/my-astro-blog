---
title: 单元测试的一些原则及实践
tags:
  - java
  - unittest
  - principle
  - practice
  - maven
keywords:
  - java
  - unittest
  - maven
pubDatetime: 2023-12-17T11:11:11+08:00
description: ""
categories: practice
---

## 单测是什么

单元测试是自动验证软件的最小可测试部分（例如函数或方法）在隔离状态下按预期工作的过程。它是软件开发中的基础实践，允许开发人员及早识别和修复缺陷，降低更改成本并增强可维护性。

### 单元测试对开发人员的一些关键好处：

- **错误隔离**：单元测试针对单个功能点，有助于快速定位问题的源头。
- **代码质量**：编写单元测试鼓励开发人员构建可测试和模块化的代码，提高整体软件架构的质量。
- **自信重构**：强大的单元测试套件为重构代码提供了安全保障，确保修改不会意外破坏现有功能。
- **活的文档**：单元测试代码演示了如何使用主要代码及其预期行为，作为不断发展的文档。
- **集成容易**：使用测试单元构建的系统更容易集成，减少集成期间的复杂性。

为了实现高效的单元测试，开发人员可以使用各种测试框架，例如JUnit、Jest 和 pytest。这些框架促进了测试实现并加快了执行速度。高质量的单元测试应该是自动化的、全面的、独立的、可重复的和易于编写的。通过将这些测试集成到持续集成/持续部署（CI/CD）流水线中，可以确保代码在每次提交时都保持稳定性和质量。

因为上面的这些好处，我们在开发软件时，写单元测试是很有必要的。

## 怎么写单测

那应该怎么写呢？ 写单侧应该遵循下面的一些原则，遵循它们可以让你的单测写得有效，且高效。

- **建立正确的认知**：单测不是为了阻碍生产力，不是为了追求一个很高的覆盖率；而是为了程序的健壮性，是为了保证代码的修改不影响原有的逻辑。它是能持续安全地优化重构代码的重要保障。
- **合适的用例大小**：单元测试通常针对软件中最小的可测试部分（通常是函数或方法）进行测试，以验证它们的独立功能正确无误。集成测试则验证多个单元（组件、模块）协同工作时的行为和接口是否正确。不要直接在类似 Controller 这么高的层级写测试，过高的层级会因为太多的依赖要处理，太多的分支要处理而事倍功半。
- **写断言（assert）**：一定要写断言，不要只是为了单纯的覆盖率数值，没断言 == 没测。后面我们计划开启 SonarQube 规则里的断言检查。
- **从核心逻辑开始**：遵循 [[帕累托法则（80 20 法则）]] 先从核心的 20% 的开始写单测。
- **合适的覆盖率**：过高的覆盖率达标线只会影响士气，消耗开发人员的精力。即便如 ThoughtWorks 这样推崇敏捷开发的公司，在实际项目的要求一般都不会超过 60%。
- **可读性好的用例**：三段式：Given - When - Then；友好的用例命名；多数据用例
- **避免使用 SpringRunner**：SpringRunner 频繁的启动，会拖慢测试的效率，使用 MockitoExtension
- **不要依赖外部服务**：无论是数据库还是其它上下游服务
- **避免使用 PowerMock**：Mockito 新版（3.0.4 以上）已经支持静态，配合 ReflectionTestUtils ，能解决大部分的场景
- **修复用例失败**：不要设置跳过失败用例，单测用例失败就应该修复，如果暂时无法修复，使用 `@Skip` 注明原因，再找时间修复，或者删掉这个用例，因为它已经无法发挥它本来的作用了

下面，我会使用 Java + Maven + Junit 5（Jupiter）来做一些示范。

## 单测的例子

以下例子都是基于 Mockito 、Junit 5（Jupiter），请注意版本差异

### 多个数据

```java
package com.stark.utils;

import org.assertj.core.util.Arrays;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SequenceUtilTest {

    @ParameterizedTest
    @CsvSource(value = {
            "foo|bar|bar2|tar,foo,1",
            "foo|bar|bar2|tar,bar,2",
            "foo|bar|foo|tar,foo,1"
    })
    void skippedHeadsUtil_strings(String sequence, String contains, int expected) {
        // given
        String[] array = Arrays.array(sequence.split("\\|"));
        // when
        int skipped = SequenceUtil.skippedHeadsUntil(array, item -> item.equals(contains));
        // then
        assertEquals(expected, skipped);
    }
}
```

### MockitoExtension 而不是 SpringRunner

使用 `@Spy` 、`@Mock` 、`@InjectMock`

```java
package com.stark.biz.action.helpAction;

import com.alibaba.fastjson.JSON;
import com.stark.pojo.request.GitProjectVo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import com.stark.utils.ElasticsearchUtil;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.InjectMocks;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GitLabHelperTest {

    private static GitProjectVo respVo;
    @Spy
    private GitLabHelper vcsProvider = new GitLabHelper("http://127.0.0.1:8080", "1");
    @InjectMocks
    private JenkinsPluginLogProcessorFactory factory;
    @Mock
    private ElasticsearchUtil elasticsearchUtil;

    @BeforeEach
    void setUp() {
        reset(vcsProvider);
        respVo = new GitProjectVo();
        respVo.setId(1L);
        respVo.setBranch("master");
    }
    @Test
    void searchProjectInfoById() throws Exception {
        // given
        String respStr = JSON.toJSONString(respVo);

        doReturn(ResponseEntity.ok(respStr)).when(vcsProvider).gitHttpRequest(any(), any(), any());

        // when
        GitProjectVo actual = vcsProvider.searchProjectInfoById(1L);

        // then
        verify(vcsProvider).gitHttpRequest("/api/v4/projects/1", null, HttpMethod.GET);
        assertEquals(respVo, actual);
    }

    public static Stream<Arguments> mapping() {
        return Stream.of(
                Arguments.of(JenkinsPluginLogProcessorFactory.SCAN, JenkinsPluginLogProcessor4Scan.class),
                Arguments.of(JenkinsPluginLogProcessorFactory.TEST, JenkinsPluginLogProcessor4Test.class)
        );
    }

    @ParameterizedTest
    @MethodSource("mapping")
    void provide(String type, Class<? extends JenkinsPluginLogProcessor> clazz) {
        JenkinsPluginLogProcessor processor = factory.provide(type, null);
        assertEquals(clazz, processor.getClass());
    }
}
```

最快，最直接的方法是在本地使用 maven 命令验证单测没问题，再提交代码。

### 覆盖率报告位置

Jacoco 的报告位置在 `target/site/jacoco/index.html` ，执行下面的命令之后可以直接打开查看报告详情

### 一般项目

`mvn org.jacoco:jacoco-maven-plugin:prepare-agent test prepare-package org.jacoco:jacoco-maven-plugin:report`

如果是多模块项目，可以考虑加上 `-pl moduleA,moduleB` 来指定只运行某几个模块的单测以及单测覆盖率报告生成

### 使用了 PowerMock

如果是多模块项目，同样也可以考虑加上 `-pl moduleA,moduleB` 来指定只运行某几个模块的单测以及单测覆盖率报告生成

Linux：

```bash
mkdir -p $HOME/.jacoco \
&& export JACOCO_VERSION=0.8.11 \
&& mvn clean dependency:copy -Dartifact="org.jacoco:org.jacoco.agent:${JACOCO_VERSION}:jar:runtime" -DoutputDirectory=$HOME/.jacoco  test-compile org.jacoco:jacoco-maven-plugin:${JACOCO_VERSION}:instrument  surefire:test org.jacoco:jacoco-maven-plugin:${JACOCO_VERSION}:restore-instrumented-classes org.jacoco:jacoco-maven-plugin:${JACOCO_VERSION}:report  -Djacoco-agent.destfile=./target/jacoco.exec -Dmaven.test.additionalClasspath="$HOME/.jacoco/org.jacoco.agent-${JACOCO_VERSION}-runtime.jar"
```

如果是在 Windows cmd 里，则执行:

```batch
mkdir %USERPROFILE%\.jacoco 2>nul

set JACOCO_VERSION=0.8.11

mvn clean dependency:copy -Dartifact="org.jacoco:org.jacoco.agent:%JACOCO_VERSION%:jar:runtime" -DoutputDirectory=%USERPROFILE%\.jacoco test-compile org.jacoco:jacoco-maven-plugin:%JACOCO_VERSION%:instrument  surefire:test org.jacoco:jacoco-maven-plugin:%JACOCO_VERSION%:restore-instrumented-classes org.jacoco:jacoco-maven-plugin:%JACOCO_VERSION%:report -Djacoco-agent.destfile=./target/jacoco.exec -Dmaven.test.additionalClasspath="%USERPROFILE%\.jacoco\org.jacoco.agent-%JACOCO_VERSION%-runtime.jar"
```

## 学习推荐

- 用谷歌搜索 `site:www.baeldung.com 关键字` 例如 `site:www.baeldung.com mockito`，这个网站上面的教程都非常的简明易懂
- Junit 、Mockito 的官网
- 用好 GPT，很多问题都能通过它得到解答
- 欢迎关注我的 [Medium](https://medium.com/@Stark-X) 以及我的[个人博客](https://blog.stark-x.cn/)，持续更新中英文两个版本的文章。
