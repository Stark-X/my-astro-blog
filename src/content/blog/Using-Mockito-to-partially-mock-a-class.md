---
title: 使用 Mockito mock 类的一部分 [译]
tags:
  - 翻译
  - java
  - mock
keywords:
  - Mockito
  - mock
  - java
pubDatetime: 2020-03-10T08:49:08+08:00
description: "怎么使用 Mocito mock 一个类"
categories: Develop
header_image:
---

<!-- Description to show on index here  -->

原文：[Using Mockito to partially mock a class](https://medium.com/@sudarshan_sreenivasan/using-mockito-to-partially-mock-a-class-bf0be6c33dcc)
作者：[Sudarshan](https://medium.com/@sudarshan_sreenivasan)

有时候，我们需要 mock 一个类的其中一些方法，其它的方法保持 un-mocked。

接下来，我会告诉你如何使用 Mockito 的 `mock` 或者 `spy` 去完成这件事。

<!-- more -->

假设我们有下面这个名为 _Stock_ 的类

```java Stock.java
public class Stock {
  private final double price;
  private final int quantity;

  Stock(double price, int quantity) {
    this.price = price;
    this.quantity = quantity;
  }

  public double getPrice() {
    return price;
  }

  public int getQuantity() {
    return quantity;
  }
  public double getValue() {
    return getPrice() * getQuantity();
  }
}
```

如果你想 mock 大多数的方法，而其中一小部分还是提供真正的实现，我们可以使用`mock`方法。

```java UseMock.java
Stock stock = mock(Stock.class);
when(stock.getPrice()).thenReturn(100.00);    // Mock implementation
when(stock.getQuantity()).thenReturn(200);    // Mock implementation
when(stock.getValue()).thenCallRealMethod();  // Real implementation
```

反过来，如果你想保持大多数的方法使用真正的实现，只 mock 其中一小部分的方法，我们可以使用`spy`方法。

```java UseSpy.java
Stock stock = spy(Stock.class);
doReturn(100.00).when(stock).getPrice();    // Mock implementation
doReturn(200).when(stock).getQuantity();    // Mock implementation
// All other method call will use the real implementations
```

## 总结

**Mockito::mock** 一般用于对调用打桩，也就是对各种方法覆盖返回特定的值，跟其它的“mock”库非常类似。

**Mockito::spy**，只 mock 一个对象的部分方法，其余部分保持不变，调用时使用原有的实现。
