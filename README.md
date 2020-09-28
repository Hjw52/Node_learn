# 深入浅出Node

## 1.Node简介

- node特点

  首先，Node并不是一门语言，而是一种JavaScript的运行环境，使JavaScript脱离浏览器的局限，在服务端也有一定的影响力。Node构成与Chrome类似，除了没有WebKit 和HTML等支持。node基于事件驱动来服务，它可以连接数据库，搭建websocket服务端，玩转多进程等。

  ![image-20200928202424042](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20200928202424042.png)

  它的特点：

  1. 异步I/O：每次调用无须等待之前的I/O调用结束。

     ![image-20200928203019494](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20200928203019494.png)

     这样多次调用的耗时取决于最慢的那个任务耗时。

  2. 事件与回调：造成代码的编写顺序与执行顺序无关。

  3. 单线程：JavaScript执行在单线程，无法与其他线程共享状态，无须关注状态的同步问题，但也存在无法利用多核CPU的特点。（但node可利用子进程分担计算任务）

  4. 跨平台：通过libuv解决平台差异

     ![image-20200928203757602](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20200928203757602.png)

- node应用场景

  1. I/O密集型
  2. 分布式应用
  3. 实时应用

## 2.模块机制

- 模块实现
  1. 优先缓存加载
  2. 路径分析与文件定位
  3. 模块编译（不同的拓展名不同的载入方法）
  
  在Node中模块分两类：一类Node提供的核心模块，部分核心模块在进程启动时就加载进内存，省略了文件定位和编译，并在路径分析中优先执行；一类用户编写的文件模块，需要进过上面3个步骤，速度较慢。

文件载入：

1. .js文件 通过fs模块同步读取文件后编译执行。
2. .node文件 通过dlopen()方法加载。
3. .json文件  通过fs模块同步读取文件后编译执行，JSON.parse()解析返回。
4. 其他拓展名，按js文件处理。

- 核心模块引入：从调JavaScript到底层C++

  ![image-20200928205820820](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20200928205820820.png)

## 3.异步I/O

- 为什么要异步I/O？

  1. I/O的时间是昂贵的
  2. 让单线程远离多线程死锁，上下文切换；同时不阻塞I/O。

- 异步I/O的现状

操作系统内核对于I/O只有阻塞和非阻塞。这和异步/同步实际上是两回事，即使听起来似乎相同。

**阻塞I/O：**阻塞I/O的一个特点就是调用之后要等到系统内核完成所以操作，调用才结束。这造成了CPU等待I/O，浪费等待时间。

**非阻塞I/O：**非阻塞I/O则是调用后立即返回，但返回的只是调用的状态，为了获取回调结果 ，应用程序需要重复调用I/O确认是否完成，称之为轮询。它让CPU处理状态判断，造成CPU资源的浪费。

现有轮询技术：

- read：最原始 性能最低的方法，重复调用检查I/O状态来获取完整数据的读取。

  ![image-20200921133917566](E:\Git工作区\深入浅出node\image\image-20200921133917566.png)

- select：在read的基础上改进，通过对文件描述符的事件状态来判断，由于它采用1024长度的数组来存储状态，所以它最多可同时检查1024个文件描述符。

  ![image-20200921134049320](E:\Git工作区\深入浅出node\image\image-20200921134049320.png)

- poll：它采用链表避免数组长度的限制，其次它能避免不需要的检查，但当文件描述符较多时，性能较低。

  ![image-20200921134415647](E:\Git工作区\深入浅出node\image\image-20200921134415647.png)

- epoll：该方案是Linux下效率最高的事件通知机制，在轮询时如果没有检查到I/O事件，将会进行休眠，直到事件将它唤醒，它真实利用事件通知，执行回调 不是遍历查询 不会浪费CPU，执行效率较高。

  ![image-20200921134750888](E:\Git工作区\深入浅出node\image\image-20200921134750888.png)

- kqueue：该方案实现与epoll类似，不过是在FreeBSD系统下实现。

轮询技术解决了非阻塞I/O获取数据的需求，但对于程序，它仍然是同步，因为它需要等待I/O完全返回，等待期间，CPU要么遍历文件描述符，要么用于休眠等待事件发生。而我们理想的异步是在CPU等待期间也能够处理下一个任务，I/O完成后通过信号或回调将数据传给应用程序。

**理想中的异步I/O：**

![image-20200921135127431](E:\Git工作区\深入浅出node\image\image-20200921135127431.png)

Linux存在一方式（AIO）就是通过信号或回调传递数据的，不过AIO仅支持内核I/O的0_DIRECT方式读取，无法读取系统缓存。

**现实中的异步I/O：**

![image-20200921140146405](E:\Git工作区\深入浅出node\image\image-20200921140146405.png)

采用线程池，通过线程之间的通信将I/O得到的数据进行传递，模拟实现异步。

**Node的异步I/O：**事件循环，观察者，请求对象，I/O线程池

![image-20200921174857986](E:\Git工作区\深入浅出node\image\image-20200921174857986.png)

事件循环

![image-20200921143304773](E:\Git工作区\深入浅出node\image\image-20200921143304773.png)

观察者：判断是否有事件需要处理的过程就是向观察者轮询。

请求对象：从JavaScript发起调用内核到执行完I/O操作的过程，这中间产物叫请求对象。

#### 异步API

1. 定时器（非精准）

![image-20200922084641077](E:\Git工作区\深入浅出node\image\image-20200922084641077.png)

调用setTimeout，setInterval 创建的定时器插入定时器观察者内部的红黑树。每次循环从该红黑树迭代取出定时器对象，检查是否超过定时，如果超过就形成事件，立即执行回调。两个的区别在于setInterval 是重复地检测。

 2.process.nextTick()

为了立即执行异步任务，调用next Tick将回调放入队列，下一轮Tick中取出执行。时间复杂度为O(1),而定时器采用红黑树，时间复杂度为O（lg n)，相比下process.nextTick更轻量高效。

![image-20200922090133410](E:\Git工作区\深入浅出node\image\image-20200922090133410.png)

3.setImmediate()

setImmediate与process.nextTick类似，都是延迟执行，但nextTick回调函数保存至数组，setImmediate则保存在链表，nextTick优先级高于setImmediate。这是由于事件循环观察者检查有先后，process.nextTick属于idle观察者，setImmediate属于check观察者。优先级：idle观察者>I/O观察者>check观察者。

![image-20200922091110606](E:\Git工作区\深入浅出node\image\image-20200922091110606.png)

## 4.异步编程

- 异步编程解决方案
  1. 事件发布/订阅模式
  
  2. Promise/Deferred模式：Deferred主要用于内部，维护异步模型的状态，Promise作用于外部，通过then()方法暴露给外部添加自定义逻辑。

     ![image-20200928214203999](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20200928214203999.png)
  
     ```
     // Deferred实现
     var Deferred = function () {
      this.state = 'unfulfilled';
      this.promise = new Promise();
     };
     Deferred.prototype.resolve = function (obj) {
      this.state = 'fulfilled';
      this.promise.emit('success', obj);
     };
     Deferred.prototype.reject = function (err) {
      this.state = 'failed';
      this.promise.emit('error', err);
     };
     Deferred.prototype.progress = function (data) {
      this.promise.emit('progress', data);
     }; 
     
     // Promise实现
     var Promise = function () {
      EventEmitter.call(this);
     };
     util.inherits(Promise, EventEmitter);
     Promise.prototype.then = function (fulfilledHandler, errorHandler, progressHandler) {
      if (typeof fulfilledHandler === 'function') {
      // 利用once()方法保证成功回调只执行一次
      this.once('success', fulfilledHandler);
      }
      if (typeof errorHandler === 'function') {
      //利用once()方法保证成功回调只执行一次
      this.once('error', errorHandler);
      }
      if (typeof progressHandler === 'function') {
      this.on('progress', progressHandler);
      }
      return this;
     }; 
     ```
  
     Promise.all
  
     ```
     Deferred.prototype.all = function (promises) { 
     var count = promises.length;
      var that = this;
      var results = [];
      promises.forEach(function (promise, i) {
      promise.then(function (data) {
      count--;
      results[i] = data;
      if (count === 0) {
      that.resolve(results);
      }
      }, function (err) {
      that.reject(err);
      });
      });
      return this.promise;
     }; 
     ```
  
  3. 流程控制库：Step ，wind
  
- 异步并发控制

1. async
   - async.parallel 无相关依赖
   - async.waterfall 存在前后依赖
   - async.auto 自动检查依赖

## 5.内存控制

- V8垃圾回收与内存限制
- 如何使用好内存

1. 垃圾回收算法

   -  Mark-Sweep & Mark-Compact 

     ![image-20200928215651219](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20200928215651219.png)

     ![image-20200928215735206](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20200928215735206.png)

- Scavenge

  ![image-20200928220014481](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20200928220014481.png)

![image-20200923135728747](E:\Git工作区\深入浅出node\image\image-20200923135728747.png)

- buffer对象不经V8内存分配机制，不会有堆内存大小限制。

## 6.Buffer

- buffer的结构

- buffer的转换，宽字节编码容易形成乱码

```
var fs = require('fs');
var rs = fs.createReadStream('test.md');
var data = '';
rs.on("data", function (chunk){
 data += chunk;
});
rs.on("end", function () {
 console.log(data);
});
```

这段代码用于流读取规范，chunk即buffer对象。这段代码对于英文可能没问题，但遇到宽字节编码就会产生乱码。问题在于

```
 data += chunk;
```

这句话相当于toString操作，等价于：

```
data = data.toString() + chunk.toString(); 
```

当我们读取中文静夜思来测试时，有可能产生

![image-20200924140621994](E:\Git工作区\深入浅出node\image\image-20200924140621994.png)

原因：

![image-20200924140716694](E:\Git工作区\深入浅出node\image\image-20200924140716694.png)

通过setEncoding()，ཨstring_decoder模块可以解决表面上的问题 ，但不改变实质。正确的拼接方式应该是用数组存储buffer，由小合并成大buffer。

- 读取相同一个大文件，hightWaterMark（每次读取限定值）越大，读取速度越快。

## 7.网络编程

- TCP与UDP
- HTTP与HTTPS

- webcocket

  ![image-20200925135725261](E:\Git工作区\深入浅出node\image\image-20200925135725261.png)

## 8.构建web应用

- 数据上传
- 路由解析
- 中间件
- 页面渲染

## 9.进程

严格意义上讲，Node并非真正单线程架构。它自身还有一定的I/O线程存在，由底层libuv处理。单线程是指：**JavaScript代码永远运行在V8上，所以称单线程**。

- **子进程**

![image-20200927134718811](E:\Git工作区\深入浅出node\image\image-20200927134718811.png)

![image-20200927134921824](E:\Git工作区\深入浅出node\image\image-20200927134921824.png)

补充：JavaScript文件通过execFile 必须在首行添加，才能成为可直接执行文件。

```
#!/usr/bin/env node
```

- **进程间通信**

  ![image-20200927135920039](E:\Git工作区\深入浅出node\image\image-20200927135920039.png)

补充：只有子进程为node进程时，才会根据环境变量去连接IPC通道。其他类型无法实现进程间通信。

- 句柄传递

  ![image-20200928085804898](E:\Git工作区\深入浅出node\image\image-20200928085804898.png)

![image-20200928085825502](E:\Git工作区\深入浅出node\image\image-20200928085825502.png)

- 集群模块

## 10.测试

略

## 11.产品化

略