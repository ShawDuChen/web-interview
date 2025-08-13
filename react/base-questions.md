# 补充问题
1. H5相关的常见兼容性
    1. 键盘行为弹出：iOS：键盘弹出遮挡输入框页面不自动滚动；Android通常会自动调整页面布局；通过监听focus事件，滚动输入框到指定位置；
    2. 键盘收起行为：iOS：键盘收起后页面不回弹；Android通常无此问题；监听resize事件，强制重置页面高度；
    3. 300ms点击延迟：fastclick、遮罩延迟隐藏、节流或防抖、使用touch事件替代；
    4. 触摸事件冲突：touchstart和click可能重复触发，统一使用pointer事件或封装触摸逻辑；
    5. 滚动卡顿：ios默认滚动惯性较强，但可能卡顿（-webkit-overflow-scrolling）；
    6. 滚动条隐藏：ios默认隐藏；Android默认常显；（-webkit-scrollbar { display: none }统一行为）
    7. flex布局：旧版本AndroidWebView部分支持，通过添加前缀解决；
    8. sticky定位：ios需-webkit-sticky；
    9. IntersectionObserver：旧版AndroidWebView不支持；
    10. WebRTC：iOS严格要求HTTPS
    11. 安全区域刘海屏/挖孔屏：使用iOS的env(safe-area-inset-*)属性进行调整；
    12. Android底部导航栏重叠：通过window.innereHeight动态调整布局；
    13. 视频自动播放问题：iOS需要用户交互后才可能够进行播放；
    14. 双击缩放问题：使用meta标签，<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    15. iOS强制全屏播放适配，Android支持内联播放；

2. H5页面与原生应用（Hybrid App）的交互方案（JaveScript Bridge）
    1. Javascript Bridge：原生应用注入全局对象（window.WebViewJavascriptBridge）供H5调用
        - 优点：兼容性好，支持双向通信；
        - 缺点：需要原生配合，安全性需处理；
        - 适用场景：通用Hybrid开发
    2. URL Scheme：H5通过iframe.src或location.hre触发原生协议（myapp://action）
        - 优点：简单，无需依赖Bridge；
        - 缺点：单向通信，数据长度受限；
        - 应用场景：简单跳转或深层链接；
    3. PostMessage：基于WebView.postMessage和window.addEventListener
        - 优点：官方标准，安全性高；
        - 缺点：仅支持Android/iOS新版；
        - 适用场景：需要高安全性的场景；
    4. RN/Flutter：通过WebView组件与H5通信；
        - 优点：开发体验统一；
        - 缺点：性能开销大；
        - 适用场景：基于RN/Flutter的混合开发；

3. Dockerfile的核心指令
    1. FROM：指定基础镜像（必须为第一条指令）
    2. RUN：执行命令并创建新的镜像层
    3. COPY：从构建上下文复制文件
    4. ADD：类似COPY，但支持自动解压和远程URL
    5. CMD：指定容器启动时的默认命令
    6. ENTRYPOINT：设置容器的主程序（与CMD配合使用）
    7. WORKDIR：设置工作目录
    8. ENV：设置环境变量
    9. EXPOSE：指定容器端口
    10. ARG：定义构建时的变量（构建后失效）
    11. USER：切换运行用户
    12. HEALTHCHECK：容易容器健康检查逻辑

4. H5开发需要考虑的核心问题
    1. 兼容性问题
        - 浏览器兼容：不同浏览器内核的差异；
        - 系统兼容问题：iOS和Android的差异表现；
        - 版本兼容：老版本浏览器的降级处理；
    2. 适配问题
        - 多终端适配：手机/平板/PC等不同尺寸设备；
        - 屏幕密度适配：Retina屏、高DPI设备；
        - 横竖屏切换处理；
    3. 性能问题
        - 首屏加载问题
        - 交互流畅度
        - 内存管理
    4. 网络问题
        - 弱网环境下的体验
        - 离线访问能力
        - 数据预加载策略；
    5. 安全问题
        - XSS防护
        - CSRF防御
        - 数据加密传输
    6. 用户体验
        - 交互反馈及时性
        - 页面过渡动画
        - 无障碍访问

5. H5开发最佳实践清单
    1. 资源优化
        - 压缩图片（WebP格式）
        - 代码分割（Code Spliting）
        - Tree Shaking
    2. 渲染优化
        - 减少DOM节点数量
        - 避免表格布局
        - 使用CSS动画代替JS动画
    3. 缓存策略
        - Service Worker缓存
        - LocalStorage缓存API数据
    4. 网络优化
        - 数据预取
        - 接口合并
        - 使用CDN
    5. 内存管理
        - 及时销毁不再需要的对象
        - 避免全局变量污染
        - 使用对象池复用对象

# Section 1

## React 容器初始化过程

   1. 入口：updateContainer：执行 render 函数后，react 内部执行 updateContainer 函数，主要作用是更新 React 容器，将新的 React 元素渲染到指定容器中，并返回更新所使用的优先级通道；包括以下操作：

      1. 获取当前 Fiber 节点：从传入的 container 对象中获取当前的 Fiber 节点 current，代表当前容器的根节点；
      2. 请求更新通道：调用 requestUpdateLane 函数，根据当前 Fiber 节点 current 请求一个更新通道 lane。这个通道表示此次更新优先级；
      3. 调用更新实现函数：调用 updateContainerImpl 函数，将 current、lane 和新的 react 元素 element、容器 container、父组件 parentComponent 以及回调函数 callback 作为参数传递给它，进行实际更新操作。
      4. 返回更新通道：返回请求到的更新通道 lane；

   2. scheduleUpdateOnFiber：该函数会将一个更新任务添加到 root 的更新队列中，然后根据 lane 的优先级来决定何时执行这个更新任务。这个函数是 React 协调器（Reconciler）的一部分，负责更新组件和渲染；

   3. 注册调度任务：在 scheduleUpdateOnFiber 函数之后，立即进入 ensureRootIsScheduled 函数，在这个地方会和调度中心（schedule 包）交互，注册调度任务 task，等待任务回调；

   4. 执行任务回调：实际上就是执行 performSyncWorkOnRoot；

   5. 输出到用户界面：在输出阶段，commitRoot 其主要逻辑是处理副作用队列，将最新的 fiber 树结构反映到 DOM 上。

## React Fiber 机制

1. React架构的发展历程
  - React15分为两层
      1. Reconciler（协调器）- 负责找出变化的组件；
      2. Renderer（渲染器）- 负责将变化的组件渲染到页面上
  - React16分为三层
      1. Scheduler（调度器）- 调度任务优先级，高优先级优先进入Reconciler；
      2. Reconciler（协调器）- 负责找出变化的组件；更新工作从递归变成了可以中断的循环过程。Reconciler内部采用了Fiber架构；
      3. Renderer（渲染器）- 负责将变化的组件渲染到页面上

2. 推出Fiber机制的原因
    1. 解决React中的“单线程渲染”问题；Fiber架构通过使用协程来解决这个问题。协程允许在渲染过程中暂停和重新启动组件的渲染，这使得可以优先处理优先级较高的组件，从而提高性能；
    2. Fiber架构中，每个组件对应一个协程。通过使用js的Generator函数来实现；Generator是一个特殊函数，可以在执行时暂停并保存当前的执行状态。Fiber的协程并不是真正的多线程协程，而是在单个js线程上模拟多线程的行为。

3. Fiber是什么？
    1. 从运行机制看，Fiber是一种流程让出机制，可以实现中断式渲染，并将渲染的控制权让回浏览器，从而达到不阻塞浏览器渲染的目的；
    2. 从数据结构看，Fiber是一种链表，是一个执行单元；
    3. Fiber中每个节点有三个指针：分别指向第一个子节点、下一个兄弟节点、父节点。它的遍历规则如下：
        1. 从根节点开始,依次遍历该节点的子节点、兄弟节点，如果两者都遍历了，则回到父节点；
        2. 当一个节点的所有子节点遍历完成，才认为该节点完成遍历；
    4. fiber被称为纤程，被认为是协程的一种实现形式。协程是比线程更小的调度单位：它的开启、暂停可以被程序员控制。

4. Fiber解决的问题
    1. React15及之前，采用递归方式创建虚拟DOM，递归过程不能中断。如果组件树层级很深，递归会占用线程很多时间，造成卡顿；JS是单线程，JS和UI线程互斥，JS线程执行UI线程挂起；因此JS执行时间长就会有页面卡顿现象；
    2. Fiber引入了动态优先级和可中断渲染：
        1. 动态优先级：旧版本中，“Reconciliation”一次性进行，所有工作具有相同优先级，这导致在处理大型或复杂UI时，性能可能会变差。Fiber提出的优先级概念，可以动态调整优先级提高性能；
        2. 可中断渲染：旧版本中，“Reconciliation”是一个单向流程，开始不能停止。意味着渲染过程发生阻塞，例如网络请求需要等待，整个UI就会被挂起，直到阻塞完成；Fiber允许渲染过程暂停和恢复，从而避免阻塞UI；

5. 动态优先级：通过追踪当前状态不断调整优先级来实现。可以通过"scheduleUpdate"方法控制，该方法允许开发人员为特定组件设置权重。旧版本使用expirationTime属性代表优先级，该优先级和IO不能很好适配，现在使用Lane表示优先级。react通过31位的二进制表示优先级；

6. 渲染过程的可中断：Fiber中，渲染过程分”帧“进行。每个帧都是一段时间，在这段时间里react可以执行一些工作，然后将控制权返回给浏览器；这允许浏览器在渲染过程中处理用户输入或执行其他任务，比如阻塞整个UI；React在执行任务时，如果发现某个任务的执行时间超过了当前帧的剩余时间，就会暂停执行，并在下一帧继续。

7. Fiber让出控制权：让出控制权的技术通过使用浏览器的requestIdleCallback函数实现的（React通过MessageChannel+requestAnimationFrame自己模拟实现了requestIdleCallback）；这个函数允许浏览器空闲时调用回调函数，并且可以指定使用多长时间CPU资源。

8. 为何自己模拟实现requestIdleCallback？
    1. 不使用setTimeout：因为递归层级过深，延迟就不是1ms，而是4ms，这样造成延迟时间过长；
    2. 不使用requestAnimationFrame：requestAnimationFrame是在微任务执行完后，浏览器重排重绘之前，执行的时机时不准确的。如果raf之前js执行过长，依旧会造成延迟；优势在于requestAnimationFrame是由系统来决定回调函数的执行时机；
    3. 不使用requestIdleCallback: requestIdleCallback的执行时机在浏览器重排重绘之后，也就是浏览器空闲时间执行。执行时机依旧不准确；
    4. 使用MessageChannel：执行时机比setTimeout靠前，其次是requestIdleCallback的兼容性；React使用它模拟requestIdleCallback行为；

9. Fiber为何是链表？
    1. 因为链表可以方便在中间插入和删除元素，这在更新和构建用户页面时非常有用，因为可能会有大量的元素需要插入或删除；
    2. 缺点：链表的查找性能差，因为需要遍历整个列表才能找到需要的元素；

10. Fiber优势
    1. Fiber双缓存可以在构建好wip Fiber树之后切换成current Fiber，内存中直接一次性切换，提高性能；
    2. 中断和恢复渲染成为了可能，作为工作单元，可以在有效时间内执行工作，没时间了交还控制权；合适时间又可以获取控制权返回到fiber执行；
    3. 可以在reconcile的时候进行相应的diff更新，让最后的更新应用在真实节点上；

11. Fiber的Reconciliation和Dom Diff的不同
    1. 前者在js应用代码中执行，后者通常指在浏览器执行的操作；
    2. 与DOM diff相比，Reconciliation显著优势在于，DOM diff是一种在两棵树之间找到最小补丁集的算法。它需要遍历整棵树寻找变化，是一个O(n ^ 3)的复杂度算法。相比之下，Reconciliation的复杂度是O(n)，因为它只遍历了有变化的节点；

12. 性能优化好在哪？
    1. v15及之前，React直接递归渲染vdom，setState会触发重新渲染，对比渲染出的新旧vdom对差异部分进行dom操作；
    2. v16及之后，会先把vdom转换为fiber，也就是从树转为链表，然后再渲染，整体渲染分为两个阶段：
        1. render阶段：从vdom转为fiber，并且对需要dom操作的节点打上effectTag标记；
        2. commit阶段：对有effectTag的标记的fiber节点进行dom操作，并执行所有的effect副作用函数。
    3. vdom转fiber的过程叫调和（reconcile）。

14. 动画优化：使用requestAnimationFrame机制可以在浏览器下一次重绘之前处理动画。requetAnimationFrame可以更好控制帧率；另外提供了”animation scheduling“。这种机制可以精细控制动画时间进程

## React优先级管理

1. 优先级管理是确保高效渲染的关键机制之一；主要通过实现可中断渲染、时间切片和异步渲染等技术，优化组件的渲染性能；核心在于优先级管理，即根据不同的任务类型和紧急程度，决定哪些任务应该优先执行；

2. 优先级体系分类
    1. LanePriority（车道优先级）
        * 基于位掩码（bitmask）实现通过二进制位标识不同优先级任务，如SyncLane、InputContinuousLanel等；
        * 优先级数值越低级别越高，通过&运算判断任务是否属于当前处理范围；

    2. SchedulerPriority（调度优先级）
        * 调度器内部使用，与浏览器事件循环协作，定义ImmediatePriority、UserBlockingPriority等五种级别。
        * 任务过期时间决定执行顺序，如IMMEDIATE_PRIORITY_TIMEOUT=-1(立即执行);

    3. ReactPriorityLevel（协调优先级）
        * 用于协调阶段的优先级映射，如DiscreteEventPriority（离散事件）对应SyncLane，确保事件响应与渲染逻辑匹配。

3. 转换流程的三级体系：React通过事件类型 -> Lane -> 调度优先级的三级体系实现优先级转换，核心逻辑如下：
    1. 事件类型映射为Lane
        * 用户交互（如点击、输入）触发事件，React根据其类型确定所属Lane
            * 点击 -> SyncLane(同步、最高优先级)
            * 滚动事件 -> InputContinuousLane(连续输入、次高优先级)
        * Lane使用位掩码标识，通过二进制位运算快速合并或分离不同任务；
    2. Lane转换为调度优先级
        * Lane通过getCurrentPriorityLevel函数映射为SchedulerPriority(调度优先级)。
            * SyncLane -> ImmediatePriority(立即执行)
            * InputContinuousLane -> UserBlockingPriority(用户阻塞优先级)
        * 调度器根据优先级分配任务过期时间、决定执行顺序；
    3. 协调阶段的ReactPriorityLevel映射
        * 在协调阶段进一步映射为ReactPriorityLevel，用于内部状态更新决策；
            * SyncLane -> DiscreteEventPriority(离散事件优先级)

4. 动态调整与异常处理
    1. 高优先级插队
        * 若低优先级任务执行中被高优先级任务中断，则React将缓存当前状态，优先处理高优先级任务，完成后恢复低优先级任务。
        * 例如：滚动中触发点击，点击任务立即执行，滚动任务暂存后恢复；
    2. 饥饿问题处理
        * 长时间未执行的低优先级任务会被提升位RetryLane，防止永久延迟;

## React Reconciler（协调器）

1. 概述：协调器是负责组件更新协调和虚拟DOM树构建的核心模块。其核心是通过以下机制实现高效渲染：
    1. 增量更新：仅处理变化的组件，避免全量渲染；
    2. 双缓冲机制：在内存中维护两颗Fiber树(current和workInProgress)，通过交替切换实现无卡顿更新；
    3. 优先级调度：与调度器（Scheduler）协作，支持高优先级任务抢占执行；
    4. 可中断渲染：通过时间切片和任务优先级调度，允许高优先级任务中断并抢占低优先级任务；

2. [运作过程](./reconciler.webp)

3. 输入阶段
    1. 初始化Fiber树：首次渲染时，通过createRoot创建根Fiber节点，并调用updateContainer触发初始协调流程；
    2. 触发更新：通过setState、useState、render等API触发组件更新，最终调用scheduleUpdateOnFiber函数。此函数标记需要更新的Fiber节点并生成更新优先级。

4. 协调阶段（Reconciler Phase）
    1. 任务调度：与调度器交互，根据更新优先级将任务拆分为时间切片，注册到调度队列中等待执行；
    2. 构建Fiber树：以”双缓冲机制“为基础，在内存中构建新的workInProgress Fiber树：通过beginWork逐层对比新旧Fiber节点，调用updateClassComponent或其他组件逻辑生成子节点；通过completeWork处理副作用（如DOM节点创建），并连接兄弟节点形成树结构；
    3. 差异比较（diff算法）：对比新旧虚拟DOM，标记节点更新类型（如插入、更新、删除），生成effectTag标识；
    4. 生成Effect List：将带有副作用的Fiber节点（如需要DOM操作）连接成链表形式的effectList，供提交阶段使用。

5. 输出阶段（Commit Phase）
    1. 提交副作用：遍历effectList，根据effectTag调用渲染器（如ReactDOM）执行DOM更新、生命周期函数等操作；
    2. 切换Fiber树：将workInProcess Fiber树设置为新的current，完成双缓冲切换；


# Section 2

1. 大文件如何做断点续传？

   - 断点续传的核心流程

     - 前端分片：将大文件切割成固定大小的切片；
     - 上传分片：逐个上传分片，并记录已上传的分片信息；
     - 服务端存储：服务端保存分片，并在全部上传完成后合并；
     - 恢复上传：中断上传后，前端访问服务端已上传的分片，跳过已传部分；

   - 优化和注意事项

     - 分片大小：根据网络状况动态调整；
     - 并发控制：限制并发请求数量（如 3-5 个）；
     - 断点持久化：刷新页面后恢复进度（可借助 localStorage 存储）
     - 错误重试：失败的切片自动重试 2-3 次；

   - 常见问题解决
     - 分片顺序错乱：服务端按文件名中的偏移量排序合并；
     - 文件哈希冲突：结合文件大小和哈希值双重校验；
     - 服务端存储压力：定期清理未完成的临时分片（跳过超时机制）；

2. js 的本地存储方式有哪些？区别是什么？

   - cookies

     - 存储大小：4KB 左右；
     - 生命周期：可设置过期时间（默认会话级）
     - 访问范围：同源可访问；
     - 特点：适合小数据，自动随请求发送到服务器，存在安全性问题；

   - localStorage

     - 存储大小：5-10MB 左右；
     - 生命周期：永久有效（需要手动清除）；
     - 访问范围：同源可访问；
     - 特点：键值对存储，简单易用，适合持久化配置或离线数据；

   - sessionStorage

     - 存储大小：5-10MB 左右；
     - 生命周期：会话有效（会话结束即清除）；
     - 访问范围：同源且单标签页；
     - 特点：临时存储敏感数据，页面刷新后仍存在；

   - IndexedDB

     - 存储大小：50MB 以上（可扩展）
     - 生命周期：永久有效，需要手动删除；
     - 访问范围：同源；
     - 特点：非关系型数据库，支持事务、索引，适合大量结构化数据（如离线应用）；

   - Cache Storage

     - 存储大小：动态分配
     - 生命周期：永久有效，需要手动删除；
     - 访问范围：同源；
     - 特点：属于 Service Worker API，专为缓存网络请求设计；

   - 安全注意事项
     - 敏感数据：避免在 Cookie 或 Web Storage 中存储密码等敏感信息（可用 httponly cookie + 服务端 session）
     - XSS 防护“对存入 localStorage 的数据进行转义，防止注入攻击；
     - 容量清理”定期清理过期数据（如 IndexDB 的旧缓存）

3. js 中事件循环的理解

   - 事件循环是实现异步和非阻塞 I/O 的核心机制。它通过协调调用栈、任务队列和微任务队列来管理代码执行顺序；
   - 核心组成：
     1. 调用栈
        - 后进先出结构，存储同步任务的执行上下文（函数调用）
        - 当函数执行完毕，会从栈顶弹出；
     2. 任务队列：
        - 存放宏任务，如 setTimeout、setInterval、I/O 操作、UI 渲染、script 标签中的整体代码；
     3. 微任务队列
        - 存放微任务，如 Promise、MutationObserver、queueMiscrotask
     4. 事件循环流程
        - 不断循环：检查调用栈是否为空 -> 执行微任务 -> 执行一个宏任务 -> 重复；
   - 关键规则
     1. 同步任务优先：调用栈中的同步任务总是先执行；
     2. 微任务 - 宏任务：每执行完一个宏任务后，会清空整个微任务队列；
     3. 渲染时机
        - 宏任务之间可能穿插 UI 渲染（取决于浏览器优化）
        - requestAnimationFrame 在渲染前执行；
   - 事件循环的本质
     1. 单线程：Js 是单线程语言，通过事件循环实现异步；
     2. 非阻塞：i/o 等耗时操作通过回调委托给系统线程池，不阻塞主线程；
     3. 优先级：同步代码 -> process.nextTick -> 微任务 -> 宏任务 -> UI 渲染

4. 在 js 中如何实现函数缓存，函数缓存有哪些应用场景？

   - 函数缓存是一种通过存储函数计算结果来避免重复计算的优化技术，特别适用于计算密集型或重复调用相同参数的函数。
   - 闭包 + 缓存对象

   ```js
   function memorize(fn) {
     const cache = {};
     return function (...args) {
       const key = JSON.stringify(args);
       if (cache[key] !== undefined) {
         return cache[key];
       } else {
         const result = fn.apply(this, args);
         cache[key] = result;
         return result;
       }
     };
   }
   ```

   - 支持自定义缓存键

   ```js
   function memoize(fn, getKey = JSON.stringify) {
     const cache = new Map();
     return function (...args) {
       const key = getKey(args);
       if (cache.has(key)) {
         return cache.get(key);
       }
       const result = fn.apply(this, args);
       cache.set(key, result);
       return result;
     };
   }
   ```

   - 基于 WeakMap 的缓存（避免内存泄漏）

   ```js
   function memoize(fn, getKey = JSON.stringify) {
     const cache = new WeakMap();
     return function (...args) {
       const key = getKey(args);
       if (cache.has(key)) {
         return cache.get(key);
       }
       const result = fn.apply(this, args);
       cache.set(key, result);
       return result;
     };
   }
   ```

   - 应用场景
     1. 计算密集型任务：斐波那契数列、阶乘、素数判断等；避免重复计算，提升性能；
     2. API 请求缓存：缓存相同的 API 响应（如用户信息查询）注意设置缓存过期时间；
     3. DOM 操作优化：缓存元素尺寸或计算样式；
     4. 动态规划算法：背包问题、最长公共子序列等；
     5. 配置或权限检查：缓存系统配置或用户权限结果；
   - 注意事项
     1. 内存管理：长期缓存可能导致内存泄漏，因此需要设计上限或过期时间；对对象参数使用 WeakMap 避免强引用；
     2. 缓存键的生成：复杂对象序列化（JSON.stringify），但可能丢失细节（如函数、Symbol），自定义键生成逻辑需确保唯一性；
   - 纯函数适用性：
     1. 仅对纯函数（相同输入始终返回相同输出）缓存有效；
     2. 避免缓存依赖外部状态或随机性的函数。

5. 如何区别深拷贝和浅拷贝？如何实现一个深拷贝函数？

   - 浅拷贝：仅复制对象的第一层属性、引用类型新旧对象共享同一引用（修改互相影响），常见于 Object.assign()、扩展运算符的对象拷贝；
   - 深拷贝：递归复制所有嵌套属性、引用类型新旧对象完全对立，可使用 JSON.parse(JSON.stringify())、递归拷贝;
   - 深拷贝的递归实现（支持复杂类型）

   ```js
   function deepClone(target, map = new WeakMap()) {
     // 处理基本类型和null/undefined
     if (target === null || typeof target !== "object") {
       return target;
     }

     // 处理循环引用
     if (map.has(target)) {
       return map.get(target);
     }

     // 处理日期
     if (target instanceof Date) {
       return new Date(target);
     }

     // 处理正则
     if (target instanceof RegExp) {
       return new RegExp(target.source, target.flags);
     }

     // 处理Map
     if (target instanceof Map) {
       const clone = new Map();
       map.set(target, clone);
       target.forEach((value, key) => {
         clone.set(key, deepClone(value, map));
       });
       return clone;
     }

     // 处理Set
     if (target instanceof Set) {
       const clone = new Set();
       map.set(target, clone);
       target.forEach((value) => {
         clone.add(deepClone(value, map));
       });
       return clone;
     }

     // 处理数组或普通对象
     const clone = target instanceof Array ? [] : {};
     map.set(target, clone);
     for (let key in target) {
       if (target.hasOwnProperty(key)) {
         clone[key] = deepClone(target[key], map);
       }
     }

     // 处理Symbol作为键的情况
     const symbolKeys = Object.getOwnPropertySymbols(target);
     for (let key of symbolKeys) {
       clone[key] = deepClone(target[key], map);
     }

     return clone;
   }
   ```

   - 关键优化点：
     1. 循环引用：通过 WeakMap 存储已拷贝对象；
     2. 特殊对象：单独处理 Date、RegExp、Map、Set；
     3. Symbol 键：Object.getOwnPropertySymbos()确保复制 Symbol 属性；
     4. 原型链：可扩展保留原型（如 Object.create(Object.getPrototypeOf(target))）

6. ES6 中的 Map 和 WeakMap 的区别？

   - Map：键支持任意类型（对象、原始值）、使用强引用键（组织垃圾回收），支持遍历 keys\values、可通过 size 获取大小、应用于长期存储键值对；
   - WeakMap：键的类型仅限对象（不能是原始值）、使用弱引用键（不阻止垃圾回收）、不可遍历、无法获取大小、应用于临时关联数据（避免内存泄漏）；
   - 在实现深拷贝时，使用 WeakMap 的主要原因是解决循环引用并避免引起内存泄漏；

7. js 中隐式类型转换？

   - 隐式类型转换：是 js 语言在运行时自动将值从一种类型转换为另一种类型的机制，通常发生在操作符、函数调用或逻辑判断中。
   - 运算符操作：
     1. +运算符：优先字符串拼接
     2. 其他运算符（-、\*、/、%）：优先数字运算
   - 比较操作
     1. == 宽松相等（触发类型转换）
     2. === 严格相等（不触发类型转换）
   - 逻辑判断（if、&&、||）
   - 对象到原始值的转换：调用 valueOf、toString 方法
   - 经典陷阱
     1. == 的诡异行为
     ```js
     [] == ![]; // TRUE
     // 解析： ![] -> false -> 0
     // [] -> "" -> 0
     // 最终 0 == 0 -> true
     ```
     2. 对象比较的意外结果
     ```js
     {} == [] // false,比较的是引用地址
     {} + [] // 0 {} -> 0, [] -> "" -> 0 =>  0 + 0 = 0
     ```
     3. 运算符的歧义
     ```js
     1 + 2 + "3"; // "33"（从左到右计算，1+2=3， 3 + "3" = "33"）
     "1" + 2 + 3; // "123"（从左到右计算，"1" + 2 = "12"，12 + 3 = "123"）
     ```
   - 总结：隐式转换的本质，js 试图在操作中自动统一类型，但规则复杂；
     1. 安全准则：
        - 使用===代替==
        - 算术运算前显式转换为数字；
        - 模板字符串使用拼接
        - 理解对象的 valueOf 和 toString 行为；
     2. 调试技巧：通过 console.log(typeof value)检查中间类型

8. 事件代理是什么？有哪些应用场景？

   - 事件代理是一种利用事件冒泡机制，通过将事件监听器绑定到父元素而非子元素上来管理动态子元素事件的优化技术。其核心思想是“委托父级元素处理子级事件”。
     - 事件冒泡：当子元素触发事件，事件会冒泡到父元素、祖父元素，直到文档根节点；
     - 统一监听：在父元素上绑定事件监听器，通过 event.target 识别实际触发事件的子元素；
     - 动态适应：即使子元素是后续动态添加的，父元素仍能捕获其事件；
   - 事件代理的优势
     - 减少内存占用：只需要一个父元素监听器，而非为每个子元素绑定（适合列表、表格等大量子元素）；
     - 动态元素支持：自动处理后续添加的子元素，无需重新绑定事件；
     - 简化代码：避免重复绑定和清理事件监听器逻辑；
     - 性能优化：减少浏览器事件监听器数量，提升页面响应速度；
   - 应用场景
     - 动态内容列表；
     - 表格操作；
     - 表单组处理；
     - 性能敏感场景；
     - 避免内容泄漏；
   - 注意事项：
     - 精确过滤目标元素，使用 event.target 配合条件判断;
     - 阻止冒泡的例外情况：如果子元素使用 stopPropagation，事件代理会失效；
     - 性能权衡：在极深层级 DOM 中，冒泡路径过长可能影响性能（通过 event.target.closest()优化）
     - 不适应场景
       - 需要直接阻止默认行为的事件（如 blur、focus 不冒泡）
       - 某些特殊事件（如 mouseenter/mouseleave 无冒泡）

9. js 中的事件模型；

   - 事件模型定义了事件在 DOM 中如何被传播和处理，主要包括事件流、事件监听和事件对象三个核心部分。
   - 事件模型的三个阶段：
     1. 捕获阶段：事件从 window 向下传播到目标元素；
     2. 目标阶段：事件达到目标元素，如果事件在目标元素上被监听，触发目标阶段；
     3. 冒泡阶段：事件从目标元素上冒泡到 window；
   - 事件对象：事件触发时，浏览器创建的事件对象，包含事件相关信息；
     1. target：触发事件的原始元素；
     2. currentTarget：当前处理事件的元素；
     3. stopPropagation：停止事件继续传播；
     4. stopImmediatePropagation：阻止同一事件的其他监听器被调用；
     5. preventDefault：阻止默认行为；

10. Web 常见的攻击方式有哪些？如何进行防御？

    - 跨站脚本攻击（XSS）：攻击者注入恶意脚本到网页中，用户浏览时执行脚本；

      - 类型：（1）存储型 XSS：恶意脚本存入数据库；（2）反射型 XSS：脚本通过 URL 参数反射到页面；（3）DOM 型 XSS：前端 js 操作 DOM 时触发；
      - 防御措施
        1. 输入过滤与转义
           - 服务端：对用户输入进行转义；
           - 前端：使用 textContent 替代 innerHTML，避免直接操作 DOM；
        2. 内容安全策略（CSP）
        3. HttpOnly Cookie：防止 js 读取敏感 Cookie；

    - 跨站请求伪造（CSRF）：诱骗用户在已登录状态下，恶意访问页面发起伪造请求；

      - 防御措施
        1. CSRF Token
           - 服务端生成随机 TOken，嵌入表单或请求头；
           - 校验请求是否携带有效 Token；
        2. SameSite Cookie
        3. 验证 Referer/Origin：：检查请求来源是否合法；；

    - SQL 注入：通过恶意输入 SQL 片段篡改数据库

      - 防御措施：
        1. 参数化查询（预编译）
        2. ORM 框架：使用 Sequelize、TypeORM 等避免手写 SQL；
        3. 最小权限原则：数据库用户仅分配必要权限；

    - 点击劫持：通过透明 iframe 覆盖诱骗用户点击隐藏按钮；

      - 防御措施：
        1. X-Frame-Option 响应头；
        2. CSP 的 frame-ancestors 指令；

    - 中间人攻击（MITM）：劫持网络通信，窃取或篡改数据；

      - 防御措施：
        1. HTTPS：强制使用 TLS 加密
        2. 证书校验：防止伪造证书；

    - 文件上传漏洞：上传恶意文件（.php,.jsp）并执行；

      - 防御措施：
        1. 文件类型检查：检查文件头而非扩展名；
        2. 重命名文件：存储时使用随机文件名；
        3. 隔离存储：将上传文件存放到非 Web 根目录；

    - DDoS 攻击：通过海量请求耗尽服务器资源；

      - 防御措施：
        1. 流量清洗：使用 Cloudflare、AWS Shield 等服务器过滤恶意流量；
        2. 速率限制（Rate Limit）
        3. CAPTCHA：针对高频操作验证人机；

11. js 中 apply、call、bind 的区别，并实现；

    - apply：func.apply(thisArg, [argArray])，参数通过数组传递，返回函数执行结果；
    - call：func.call(thisArg, arg1, arg2, ...)，参数通过逗号隔开，返回函数执行结果；
    - bind: func.bind(thisArg, arg1, arg2, ...)，参数通过逗号隔开，返回绑定后的新函数；

    ```js
    Function.prototype.myCall = function (context, ...args) {
      // 绑定this
      context = context || window;
      const fnKey = Symbol("fn");
      context[fnKey] = this;
      const result = context[fnKey](...args);
      delete context[fnKey];
      return result;
    };
    Function.prototype.myApply = function (context, args = []) {
      context = context || window;
      const fnKey = Symbol("fn");
      context[fnKey] = this;
      const result = context[fnKey](...args);
      delete context[fnKey];
      return result;
    };
    Function.prototype.myBind = function (context, ...bindArgs) {
      const originalFunc = this;
      return function (...callArgs) {
        return originalFunc.apply(context, [...bindArgs, ...callArgs]);
      };
    };
    ```

12. js 中的 new 操作符具体做了什么？

    - 创建空对象（原型链指向构造函数的 prototype）
    - 设置原型链：obj.**proto** = Constructor.prototype
    - 绑定 this 并指向构造函数：const result = Constructor.call(obj, ...args)
    - 处理构造函数返回值
      1. 如果构造函数返回一个对象，直接返回该对象
      2. 如果构造函数返回非对象值，则忽略返回值，返回创建的实例对象；

    ```js
    function myNew(Constructor, ...args) {
      const obj = Object.create(Constructor.prototype);
      const result = Constructor.call(obj, ...args);
      return typeof result === "object" ? result : obj;
    }
    ```

13. 谈谈 this 的理解

    - js 中，this 是一个动态绑定的关键字，它的值取决于函数的调用方式而非定义位置；理解 this 的绑定规则是掌握 js 面向对象编程的核心；
    - this 的绑定规则：
      1. 默认绑定：非严格模式下，this 指向全局对象（浏览器 window，node 中 global），严格模式下为 undefined；
      2. 隐式绑定（方法调用）：函数作为对象的方法调用时，this 指向调用它的对象；
      3. 显式绑定（call/apply/bind）：强制指定 this 的值；
      4. new 绑定（构造函数调用）：通过 new 调用构造函数时，this 指向新创建的对象实例；
      5. 箭头函数的 this：箭头函数没有自己的 this，继承外层作用域 this 值；
    - this 的优先级：多种规则冲突时，优先级从高到低：new 绑定 -> 显式绑定 -> 隐式绑定 -> 默认绑定

14. 请解释你对 js 作用域链的理解？

    - 本质：作用域链是当前执行上下文中变量对象的链表，用于在函数嵌套时查找变量。它的形成分为两个阶段：
      1. 词法作用域：函数定义时确定作用域链，与调用位置无关；
      2. 执行时构建：函数调用时，将当前变量对象添加到作用域链的前端；
    - 构建过程：
      1. 变量对象（Variable Object，VO）
         - 全局上下文：变量对象是全局对象（浏览器中为 window，nodejs 中为 global）；
         - 函数上下文：变量对象包含函数的参数、局部变量和函数声明）
      2. 作用域链的组成；
         - inner 的作用域链：[inner.AO, outer.AO, global.VO]（查找顺序：自身 -> 外层 -> 全局）；
    - 关键特性和规则
      1. 遍历查找机制：从当前作用域开始，逐级向外查找变量，直到全局作用域；如果全局作用域仍未找到，报错 ReferenceError；
      2. 闭包的形成：返回的函数保留了对外层作用域链的引用；
      3. 块级作用域（ES6 let/const）：let/const 会创建块级作用域，但不影响函数作用域链的层级关系；

15. js 中原型和原型链有什么特点？

    - 原型的特点
      1. 每个函数都有一个 prototype 属性：只有函数（包括构造函数）拥有 prototype 属性（箭头函数除外）；该属性指向一个对象，称为原型对象，用于存储共享方法和属性；
      2. 每个对象都有一个**proto**属性：对象通过**proto**（或 Object.getPrototypeOf()）访问其原型；实例对象的**proto**指向其构造函数的 prototype 属性；
      3. 原型对象的 constructor 指回构造函数本身；
    - 原型链的特点
      1. 继承机制：当访问对象的属性时，若自身对象不存在该属性，则通过**proto**向上查找原型链，直到 Object.prototype（终点为 null）；
      2. 链式结构：原型链是单向链表结构，实例->构造函数原型->Object.prototype->null；
      3. 动态性：修改原型对象的属性会立即影响所有实例；

16. 解释上拉加载更多和下拉刷新的机制，并说明如何实现它们？

    - 上拉加载更多
      1. 触发条件：当用户滚动到页面底部（或接近底部）时自动加载下一页的数据；
      2. 核心逻辑：监听滚动事件+计算滚动位置，当滚动距离-可视区高度>=文档总高度-阈值时，发起数据请求；
      3. 优化点：
         1. 避免重复请求；
         2. 显示加载状态；
         3. 数据全部加载完成后禁用监听；
      ```js
      let isLoading = false;
      let currentPage = 1;
      window.addEventListener("scroll", function () {
        const { scrollTop, clientHeight, scrollHeight } =
          document.documentElement;
        const threshold = 100;
        if (
          scrollTop + clientHeight >= scrollHeight - threshold &&
          !isLoading
        ) {
          loadMoreData();
        }
      });
      ```
    - 下滑刷新
      1. 触发条件：用户在页面顶部向下拖动并释放；
      2. 核心逻辑：监听触摸事件（touchstart, touchmove, touchend）；计算下拉距离，显式加载提示；释放后触发数据刷新，重置页面位置；
      3. 优化点：阻尼效果（下拉距离的弹性阻力）；避免与浏览器原生下拉冲突；
      ```js
      let startY = 0;
      let isRefreshing = false;
      document.addEventListener('touchstart', function(e) {
          if (window.scrollY === 0) {
              startY = e.touches[0].clientY;
          }
      })
      document.addEventListener('touchmove', function(e) {
          const y = e.touches[0].clientY;
          const distance = y - startY;
          if (window.scrollY === 0 && distance > 0) {
              e.preventDefault();
              updateRefreshUI(distance);
          }
      })
      document.addEventListener('touchend', function(e) {
          const y = e.changedTouches[0].pageY;
          const distance = y - startY;
          if (distance > 50 && !isRefreshing) {
              isRefreshing = true;
              await refreshData();
              isRefreshing = false;
          }
          resetRefreshUI();
      })
      ```

17. 解释单点登录及其工作原理

    - 单点登录是一种身份认证机制，允许用户通过一次登录访问多个互相信任的应用系统，无需重复输入凭证；
    - 单点登录的核心价值：
      1. 用户体验：登陆一次，访问所有关联系统；
      2. 安全性：减少密码重复输入，降低密码泄漏风险；
      3. 管理效率：集中管理用户权限和认证流程；
    - SSO 的工作原理
      1. 基于令牌*Token*的 SSO 流程；
         - 用户访问应用 A：应用 A 检测用户未登录，重定向到 SSO 认证中心；
         - 认证中心检查登录状态：若用户已登录，直接返回加密令牌；若未登录，跳转登录页，用户输入用户名/密码；
         - 令牌验证和授权：认证中心生成令牌并返回给应用 A，应用 A 向认证中心验证令牌有效性；
         - 访问其他应用（B、C）：用户访问应用 B 时，应用 B 同样重定向到认证中心；认证中心发现已有 SSO 会话，直接返回令牌，无需重新登录；
      2. 关键技术组件：
         1. 认证中心：中央认证服务；
         2. 服务提供方：集成的应用系统；
         3. 令牌：通常使用 JWT 或 ASML 断言传递用户信息；
         4. 会话共享：通过 cookie 跨域共享登录状态；
    - 安全注意事项：
      1. Token 有效期：设置短寿命的 AccessToken 和长寿命的 RefreshToken；
      2. 防 CSRF 攻击：Token 绑定到用户会话，验证请求来源；
      3. 加密传输：强制 HTTPS，避免令牌泄漏；
      4. 日志审计：记录所有 SSO 登录和令牌颁发事件；

18. JS 动画和 CSS 动画区别是什么？

    - JS 动画
      1. 控制能力：完美控制每一帧，可动态调整参数；（如暂停、反转、复杂路径）
      2. 性能：依赖代码优化，可能触发重绘/回流；
      3. 复杂性：适合复杂逻辑（如物理引擎、游戏动画）
      4. 兼容：全浏览器支持，可降级处理；
      5. 响应式交互：可实时响应用户输入；
    - CSS 动画
      1. 控制能力：声明式，限于预定义的关键帧和过渡效果；
      2. 性能：浏览器优化更好（GPU 加速，合成层处理）
      3. 复杂性：适合复杂动画（如悬态、淡入淡出）
      4. 兼容性：现代浏览器支持，部分属性需前缀；
      5. 响应式交互：无法直接交互，需通过 js 触发；
    - 使用场景：
      1. 优先 CSS 动画的场景：简单 UI 效果、性能敏感动画，硬件加速需求；
      2. 优先 JS 动画的场景：复杂交互、动态控制、跨元素协调；

19. 短轮询、长轮询、SSE、Websocket 的区别及实现？

    - 短轮询：基于 HTTP 协议，由客户端主动发起，实时性差、服务器压力高，适用于简单场景对兼容性要求高；
      - 原理：客户端定期发送 HTTP 请求，服务器立即返回数据；
      - 缺点：无效请求多，服务器压力大；
      - 实现：可使用 setTimeout、setInterval；
    - 长轮询：基于 HTTP 协议，由客户端发起服务器挂起，实时性一般，服务器压力一般，适用于中等实时性要求，如聊天室；
      - 原理：客户端发送请求后，服务器保持连接挂起，直到数据更新或超时才响应；
      - 优点：减少无效请求，实时性优于短轮询；
      - 实现：在每次收到响应后立即发送一个新的请求等待；
    - SSE：基于 HTTP 协议，客户端发起，服务器推送，实时性高，服务器压力低，适用于实时通知，如股票行情，消息推送；
      - 原理：服务器单向推送，客户端通过 EventSource API 监听；
      - 特点：自动重连、轻量级，但仅支持服务器->客户端推送；
      - 实现：EventSource、fetch、XHR；
    - Websocket：基于 TCP 协议，建立连接后，双方互相推送数据；实时性高，服务器压力低，适用于高频交互；

      - 基于 TCP 的全双工通信，建立持久连接后双向实时传输数据；
      - 优点：最低延迟、支持双向通信，适合高频交互场景；
      - 实现：new WebSocket();

    - 注意事项：
      1. 兼容性：SSE 不支持 IE/Edge（旧版本），WebSocket 需要现代浏览器；可降级为长轮询；
      2. 性能优化：WebSocket 和 SSE 需要处理连接稳定性；避免短轮询频率过高；
      3. 协议选择：HTTP1.1 下，浏览器对并发连接数有限制（6-8 个），WebSocket 不受限；

20. 你所理解的前端数据安全指的是什么？

    - 前端数据安全指通过技术和管理措施，确保在用户浏览器处理、传输和存储的数据免受恶意攻击、泄漏和篡改。其核心目的是保护用户隐私、防止业务逻辑被破坏，并确保系统可靠性。
    - 前端数据安全的核心领域
      1. 敏感数据保护：用户隐私、认证凭证、业务敏感数据暴露；
         - 措施：脱敏显式、最小化传输、避免全局存储；
      2. 安全传输：数据在传输过程中被窃听或篡改（中间人攻击）
         - 措施：强制 HTTPS、签名校验；
      3. 输入安全：XSS、SQL 注入；
         - 措施：输入过滤与转义；CSP 限制脚本来源；
      4. 认证与会话安全：CSRF、TOKEN 泄漏；
         - 措施：CSRF Token、HttpOnly+SecureCookie、短期 Token；
      5. 代码与依赖安全：恶意依赖包、混淆代码被逆向；
         - 措施：依赖审计、代码混淆/压缩、禁用危险 API；
      6. 存储安全：本地存储数据被恶意读取；
         - 措施：敏感数据不持久化、加密存储；
    - 前端安全开发原则
      1. 零信任原则：不信任任何用户输入，服务端需二次校验；
      2. 最小权限原则：前端仅请求必要权限；
      3. 防御性编程：假设环境不安全，添加边界检查；
      4. 持续监控：使用 Sentry 捕获前端错误，分析潜在攻击行为；

21. 请谈一下内存泄漏是什么，以及常见的内存泄漏原因和排查的方法

    - 定义：指程序中已动态分配的内存未被正确释放，导致内存占用持续增长，最终可能引发性能下降、卡顿或崩溃。在 js 中，内存泄漏通常表现为：（1）页面长时间运行后越来越卡；（2）浏览器或 Nodejs 进程内存占用持续上升；（3）频繁触发垃圾回收，影响性能；
    - 常见的内存泄漏原因：
      1. 意外的全局变量：使用未声明的变量或 this 指向全局；
      2. 未清理的定时器或回调函数：setInterval、setTimeout 或事件监听未及时清除；
      3. 闭包引用未释放：闭包长期持有外部变量，阻止垃圾回收；
      4. DOM 引用未清除：已移除的 DOM 元素仍被 js 引用；
      5. 未解绑的事件监听：对已销毁的 DOM 元素仍保留事件监听；
      6. 缓存无限增长：缓存未设置清理策略；
    - 内存泄漏的排查方法
      1. 浏览器开发者工具（ChromeDevTools）
         - DevTools->Memory 面板；使用 HeapSnapshot 拍摄堆内存快站，对比操作前后的对象分配；使用 PerformanceMonitor 实时观察内存占用趋势；通过 AllocationInstrumentation 跟踪内存分配时间线；
         - 关键指标：分离 DOM 节点、重复的闭包或事件监听引用；
      2. Nodejs 内存泄漏检测
         - node --inspect + Chrome DevTools; heapdump 模块生成堆快照；memwatch-next 监控内存变化；
      3. 代码审查与最佳实践
         - 全局变量使用严格模式；定时器、事件监听、第三方库资源的销毁逻辑；避免大型对象长期驻留内存；

22. WebSocket 中的心跳是为了解决什么问题？

    - 主要用于解决连接稳定性和资源浪费问题，确保长连接在不可预测的网络环境下保持可用性。
    - 心跳机制解决的核心问题：
      1. 检测连接存活状态：WebSocket 是持久化连接，但网络中断、服务器重启或客户端崩溃时，双方无法立即感知连接已断开；心跳通过定期发送小数据包确认连接是否正常。若多次无响应，则判定为断开并主动重连；
      2. 防止中间设备断开空闲连接：防火墙、代理或负载均衡器等中间设备可能自动关闭长时间无数据传输的连接，心跳定期发送模拟“活跃流量”避免误杀；
      3. 释放无效连接资源：僵尸连接（如客户端异常退出但未发送 CLOSE 帧）会占用服务器资源，超时无响应的连接被主动关闭，释放内存和文件描述符；
    - 心跳机制的实现方式
      1. WebSocket 协议层心跳（PING/PONG）
         - 标准协议支持：WebSocket 协议内置 PING 和 PONG 控制帧；
         - 优点：协议原生支持，无需应用层处理，流量开销小；
      2. 应用层心跳（自定义消息）
         - 兼容不支持协议层心跳的旧版本 WebSocket 实现；
         - 缺点：需要处理额外的消息类型，占用带宽略多；
    - 为什么需要心跳：确保 WebSocket 长连接在复杂网络环境下的可靠性，避免僵尸连接和资源泄漏；

23. 为什么 react 中 useState 返回的是数组而不是对象？

    - 主要基于简洁性、灵活性和开发体验的考量；
    - 核心原因分析：
      1. 数组解构，允许开发者自由命名状态变量、避免对象属性名的固定约束；
      2. 对象解构对比：若返回对象，属性名固定，命名灵活性下降；
      3. 简化代码：数组形式更简洁，尤其是对其调用 useState 时；
      4. 与类组件状态的差异
         - 类组件：状态是一个单一对象
         - 函数组件：通过多个 useState 拆分状态，数组返回形式更符合“原子化状态”的理念；
      5. 性能无关性：数组和对象的性能差异可以忽略，设计主要基于 API 友好性；

24. 怎么解决 canvas 中获取跨域图片数据的问题？

    - canvas 中获取跨域图片时，由于浏览器的同源策略限制，直接操作跨域图片会导致 canvas 被污染，无法调用 getImageData 或 toDataURL 等方法；
    - 解决方法：
      1. 服务器配置 CORS：让图片服务器返回允许跨域的 HTTP 头；前端代码中设置 img.crossOrigin="Anonymous"
      2. 代理服务器转发：通过同域后端代理请求跨域图片，避免前端直接跨域；（无需依赖第三方服务器 CORS 支持）
      3. 使用第三方 CORS 代理服务器：借助现成的 CORS 代理服务中转请求；此类服务可能存在稳定性或隐私风险，仅适用于开发测试；
      4. Base64 编码（需后端配合）：将图片转换为 Base64 字符串绕过跨域限制；使用此方法会导致数据体积增大，不适合大图；
      5. 禁用浏览器安全限制（仅开发环境）

25. 理解 async/await，以及对 generator 的优势？

    - 核心概念
      1. async/await：基于 Promise 的语法糖，用同步写法处理异步操作；
      2. Generator：通过 function\*和 yield 暂停/恢复函数执行，需手动控制迭代器；
    - async/await 对比 Generator 的优势
      1. 更直观的同步式代码
         - async/await：代码逻辑与同步代码一致，无需理解迭代器协议；
         - Generator：需要手动调用 next 方法或依赖外部执行器；
      2. 内置错误处理
         - async/await：直接使用 try/catch 捕获异步错误。
         - Generator：需额外处理迭代器的 throw 方法或外部包装；
      3. 无需外部执行器
         - async/await: 原生支持，无需第三方库；
         - Generator：需自行实现或引入执行器处理 Promise；
      4. 更自然的返回值
         - async/await：函数返回 Promise，可直接链式调用；
         - Generator：返回迭代器，需额外处理返回值；
    - Generator 的独特用途
      1. 惰性求值：按需生产数据流（如大数据分块处理）
      2. 协程：复杂的状态机控制；
      3. 自定义迭代协议：实现可迭代对象；

26. js 中倒计时，如何实现纠正偏差？

    - 在 js 中实现倒计时时，由于事件循环延迟、系统事件偏差或浏览器后台允许限制，倒计时可能会出现偏差：
      1. setInterval 不精确：浏览器主线程阻塞导致回调延迟；
      2. 设备时间不同步：用户手动修改系统时间或时区变化；
      3. 后台运行限制：浏览器切到后台时，setInterval 可能被降频；
    - 纠正偏差的解决方案：

      1. 动态计算下次执行时间（推荐）：每次回调执行时，计算与理想时间的偏差，动态调整下一次执行时间；

      ```js
      function accurateCountdown(targetTime, callback, interval = 1000) {
        let expected = Date.now() + interval;
        let timerId;

        const step = () => {
          const remaining = targetTime - Date.now();
          if (remaining <= 0) {
            callback(0);
            clearTimeout(timerId);
          } else {
            callback(remaining);
            const deviation = Date.now() - expected;
            expected += interval;
            timerId = setTimeout(step, Math.max(0, interval - deviation));
          }
        };
        timerId = setTimeout(step, interval);
      }
      ```

      2. 基于 requestAnimationFrame（适合 UI 动画）：利用屏幕刷新率（通常 60HZ）触发回调，减少视觉卡顿，需要手动计算时间差；

      ```js
      function animationCountdown(targetTime, updateUI) {
        const startTime = Date.now();
        const duration = targetTime - startTime;

        const frame = () => {
          const elapsed = Date.now() - startTime;
          const ramaining = Math.max(0, duration - elapsed);
          updateUI(remaining);
          if (remaining > 0) {
            requestAnimationFrame(frame);
          }
        };

        requestAnimationFrame(frame);
      }
      ```

      3. 同步服务器时间（解决设备时间不同步问题）：首次加载时获取服务器时间，后续基于本地时间差计算；

      ```js
      async function getServerTime() {
        const response = await fecth("/api/serverTime");
        const { timestamp } = await response.json();
        return timestamp;
      }
      async function startServerBasedCountdown(targetTime) {
        const serverTime = await getServerTime();
        const localeTime = Date.now();
        const timeDiff = localeTime - serverTime;

        setInterval(() => {
          const accurateTime = Date.now() - timeDiff;
          const remaining = targetTime - accurateTime;
          // ...
        }, 1000);
      }
      ```

      4. Web Worker 后台运行（避免浏览器降频）：在独立线程中运行计时逻辑，不受主线程阻塞影响；

      ```js
      // worker.js
      let timer;
      self.onmessage = (e) => {
        if (e.data === "start") {
          let startTime = Date.now();
          timer = setInterval(() => {
            self.postMessage(Date.now() - startTime);
          }, 1000);
        } else if (e.data === "stop") {
          clearInterval(timer);
        }
      };
      // main.js
      const worker = new Worker("./worker.js");
      worker.onmessage = (e) => {
        // ...
      };
      worker.postMessage("start");
      ```

27. http 的长连接和短连接分别是什么？keep-alive 是干什么的？

    - 短链接：每次 HTTP 请求后，TCP 连接会立即关闭；
      - 工作流程
        1. 客户端发起 TCP 连接；
        2. 发送 HTTP 请求并接收响应；
        3. 服务器关闭 TCP 连接；
        4. 下一个请求需要重新建立连接；
      - 特点
        1. 简单但效率低，频繁握手/挥手增加延迟；
        2. HTTP1.0 默认使用短连接（除非显式设置 Connection：keep-alive；
    - 长连接：同一个 TCP 连接上可发送多个 HTTP 请求/响应，完成后才关闭连接；
      - 工作流程
        1. 客户端发起 TCP 连接；
        2. 发送多个 HTTP 请求/响应（按顺序或并行，如 HTTP1.1 的管道化）
        3. 空闲一段时间或达到限制后，连接关闭；
      - 特点
        1. 减少 TCP 握手/挥手次数，降低延迟；
        2. HTTP1.1 默认启用长连接（Connection：keep-alive）；
    - keep-alive 的作用：保持 TCP 连接存活，允许多个 HTTP 请求复用同一连接；
      - 实现方式
        1. HTTP 头部：客户端发送 Connection: keep-alive，服务器同意后复用连接；
        2. 参数控制（可选）：Keep-Alive: timeout=10, max=1000;
    - 现代应用中的变化
      - HTTP2：进一步优化，支持多路复用（一个连接并行处理多个请求），无需显式 keep-alive；
      - HTTP3：基于 QUIC 协议，彻底解决队头阻塞问题，连接管理更高效；

28. html 文档渲染过程，css 文件和 js 文件下载，是否会阻塞渲染？

    - HTML 渲染关键流程
      1. 解析 HTML：构建 DOM 树
      2. 解析 CSS：构建 CSSOM 树
      3. 合并 DOM 和 CSSOM 树：生成渲染树
      4. 布局：计算元素的大小和位置
      5. 绘制：将像素渲染到屏幕上；
    - CSS 文件的阻塞行为
      1. CSSOM 树是构建渲染的必要条件：浏览器必须完全解析 CSS 文件并生成 CSSOM 后，才能与 DOM 合成渲染树，因此 CSS 会阻塞渲染；
      2. 优化建议：使用<link ref="stylesheet" />尽早加载 CSS（放在 head 中）；避免使用@import（会增加 css 的阻塞时间）；媒体查询优化（如 media="print"非关键 css 可异步加载）；
    - JS 文件的阻塞行为
      1. JS 的执行默认会阻塞 DOM 解析：浏览器遇到 script 标签时，会暂停 DOM 构建，先下载并执行 js；因此 js 会阻塞 dom 解析和渲染；
      2. 特殊情况：async 属性：脚本异步下载，下载完成后立即执行；defer 属性，脚本异步下载，但在 DOM 解析完成后按顺序执行；动态加载：通过 js 动态插入的脚本默认是异步的；
    - CSS 对 JS 的间接阻塞
      1. 如果 js 依赖 css 样式（如读取元素尺寸），浏览器会先等待 CSSOM 构建完成再执行 js；因此 css 也可能间接阻塞 js 执行，进而阻塞 DOM 解析；
    - 现代浏览器的优化
      1. 预加载扫描器：浏览器在解析 HTML 时，会提前扫描文档并预下载 CSS/JS/图片等资源，减少等待时间；
      2. HTTP2 多路复用：允许通过单个 TCP 连接并行下载多个资源，降低阻塞影响；

29. 如果 new 一个箭头函数会发生什么？

    - 在 js 中，箭头函数不能用作构造函数，因此 new 调用箭头函数会抛出错误 TypeError；
    - 底层原理：
      1. 普通函数：通过 function 声明的函数具有 prototype 属性和[[Contructor]]内部方法，允许被 new 调用，此时：（1）创建一个新对象，绑定到 this，（2）执行函数体；（3）如果函数没有返回对象，则默认返回 this；
      2. 箭头函数：设计初衷时简化函数语法并固定 this，因此移除了构造函数相关能力；（1）没有 prototype 属性；（2）无[[Contructor]]方法，引擎会直接拒绝 new 操作；

30. react 的事件代理机制和原生事件绑定混用会有什么问题？

    - 在 React 中混用 React 合成事件和原生 DOM 事件绑定可能会导致一些意料之外的问题，主要涉及事件执行顺序、事件冒泡/捕获机制、以及内存泄漏等；
    - 事件执行顺序问题
      1. 现象：React 的合成事件时委托到 Document 或根 DOM 节点的，而原生事件是直接绑定到 DOM 元素上的，如果一个 DOM 元素同时绑定合成事件和原生事件，原生事件会先执行（因为 React 事件使用顶层代理，需要冒泡到到 document/根节点才会触发；
      2. 问题：如果业务逻辑依赖事件执行顺序（例如原生事件调用了 stopPropagation，可能会导致 React 事件无法触发；
    - 事件冒泡/捕获冲突
      1. 现象：React 合成事件模拟了浏览器的事件冒泡和捕获机制，但实际是通过顶层代理实现的；如果原生事件调用了 stopPropagation，react 事件可能完全被阻止（因为原生事件先执行，阻断了事件冒泡到 react 的代理层）；
    - 内存泄露风险
      1. 现象：如果在组件卸载时未正确移除原生事件监听器，可能会导致内存泄漏；React 合成事件会自动在组件卸载时清理，但原生事件需要手动清理；
    - this 绑定问题
      1. 现象：react 合成事件的处理函数会自动绑定组件实例的 this；原生事件的处理函数需要手动绑定 this，否则 this 可能指向 DOM 元素或其他值；
    - 兼容性差异
      1. 现象：react 合成事件是对浏览器原生事件的跨浏览器包装，统一了行为（如 preventDefault 的兼容性）；直接使用原生事件时，可能需要自行处理跨浏览器差异；

31. forEach 中 return 有什么效果？如何中断 forEach 循环？

    1. forEach 中 return 不会中断循环，只会跳过当前迭代，继续执行下一次迭代；（类似于 for 循环中的 continue）；
    2. forEach 设计上无法通过常规方式中断（break 或 return）。若需要提前终止循环，可通过以下方法：
       - 抛出异常（不推荐）：滥用异常会影响性能，代码可读性差；
       - 使用 Array.some 或 Array.every 方法（推荐）：some 返回 true 时可中断，every 返回 false 时可中断；
       - 改用 for...of 或 for 循环；
    3. 为什么不能中断？
       - 设计原则：forEach 是函数式编程的产物，强调对每个元素执行操作，而非控制流程；
       - 内部实现：forEach 会遍历所有元素，回调函数的返回值被忽略；

32. isNaN 和 Number.isNaN 函数有什么区别？

    - isNaN（全局函数）
      - 行为特点：
        1. 步骤 1：尝试将参数强制转换为数值（相当于 Number（value））；
        2. 步骤 2：检查转换后的结果是否为 NaN；
        3. 结果：如果原始值无法转换为有效数字（包括非数字类型），返回 true；
      - 问题：过于宽松，任何不能转为数字的值都会返回 true，容易误判；
    - Number.isNaN（Number 对象方法）
      - 行为特点：
        1. 步骤 1：不进行类型转换，直接检查参数类型；
        2. 步骤 2：仅当参数是 NaN（且类型为 Number）时返回 true；
        3. 结果：严格判断，避免误判；
      - 优势：严格精确，仅对真正的 NaN 返回 true；

33. Vue 如何监听一个插槽的变化？

    - vue 中，监听插槽内容变化需要根据不同的场景采用不同的方法，因为 vue 本身不直接提供监听插槽内容的 API；
    - 使用$slots和$watch(Vue2)：在 vue2 中，可以通过 this.$slots访问插槽内容，并结合$watch 监听变化；
      - 适用于 vue2，插槽内容是静态的或由父组件动态渲染；
      - 如果插槽内容是动态生成的可能无法准确捕获变化；
    - 使用 MutationObserver（适用于动态插槽）：如果插槽内容是动态变化的（如异步加载或 js 动态修改），可以使用 MutationObserver 监听 DOM 变化；
      - 适用于插槽内容是动态生成，适用于 vue2 和 vue3；
      - 需要手动管理 MutationObserver 的生命周期，可能会触发多次回调，需防抖处理；
    - 使用@slot-change 自定义事件（vue3+setup）
      - 适用于 vue3+componsitionAPI；适用于动态插槽内容；
      - 需要插槽内容主动触发 onChange；
    - 通过 v-if + $nextTick 强制重新渲染：如果插槽内容是由父组件动态控制的（如 v-if），可以在父组件中触发更新事件；
      - 适用于插槽内容由父组件显式控制；
      - 适用于 vue2 和 vue3；
      - 需要父子组件通信，耦合度高；

34. vue-router 的跳转和 location.href 有什么区别？

    - 核心区别
      1. 路由模式：vue-router 支持 history/hash/abstract，location.href 仅支持 http:/https:完整 URL；
      2. 是否刷新页面：vue-router 无刷新，location.href 刷新页面；
      3. 是否触发组件生命周期：vue-router 触发（beforeRouteLeave 等守卫）；location.href 不触发，直接卸载当前页面；
      4. 性能：vue-router 仅更新差异部分；location.href 重新加载所有资源；
      5. SEO 友好性：vue-router 需额外配置（SSR/预渲染）；location.href 天然支持；
      6. 状态保持：vue-router 保持 vue 组件状态；location.href 所有状态丢失；
      7. 浏览器历史记录：vue-router 可控制（push/replace）；location.href 始终新增记录；
    - 注意事项：
      1. 避免混用：在 SPA 中频繁使用 location.href 会导致应用状态丢失；
      2. Hash 模式兼容性：如果 vue-router 使用 hash 模式，location.href='#/about'也能无刷新跳转，但仍会触发页面滚动行为；
      3. 性能优化：vue-router 的懒加载可减少首屏加载事件；

35. 身份认证过程中会涉及到密钥、对称加密、非堆成加密、摘要的的概念，请解释？

    - 密钥：是一段用于加密或解密数据的秘密信息，通常是一个随机生成的字符串或数字序列；
      - 作用：（1）加密/解密：控制数据的转换过程；（2）身份验证：证明通信方的合法性；
      - 分类：（1）对称密钥：加解密使用同一把密钥；（2）非堆成密钥：加解密使用不同的密钥；（3）会话密钥：临时生成的密钥，用于单次通信；
    - 对称加密：加解密使用同一把密钥；
      - 特点：（1）速度快：适合加密大量数据（文件传输、会话加密）；（2）密钥管理难：需安全地共享密钥，否则易被窃取；
      - 常见算法：（1）AES（高级加密标准）；（2）DES（已淘汰，安全性不足）；（3）ChaCha20（移动设备常用）；
      - 身份认证中的应用：TLS/SSL；会话加密；
    - 非对称加密：使用公钥（公开用于加密或验证签名）和私钥（保密用于解密或生成签名）配对的算法；
      - 特点：（1）安全性高：私钥不外泄，公钥可公开分发；（2）速度快：比对称加密快 100-1000 倍，适合小数据量常见；
      - 常见算法：RSA、ECC、EdDSA；
      - 身份认证中的应用：（1）密钥交换：通过非对称加密安全传递对称密钥；（2）数字签名：私钥签名、公钥验证；（3）身份验证：服务端用私钥证明身份；
    - 摘要（Digest）/哈希（Hash）：将任意长度数据转换为固定长度的唯一值（哈希值）的不可逆算法；
      - 特点：（1）不可逆：无法从哈希值还原原始数据；（2）唯一性：不同数据哈希值不同；（3）抗碰撞：难以找到两个不同数据产生相同哈希值；
      - 常见算法：SHA-256、MD5、Bcrypt；
      - 身份认证中的应用：（1）密码存储：存储哈希值而非明文密码；（2）数据完整性：对比哈希值验证数据是否被篡改；（3）消息认证码：结合密钥生成哈希值，验证消息来源和完整性；

36. vue 中为什么把异步操作封装在 action，同步操作封装在 mutation？

    - 主要是为了遵循单向数据流和可预测状态管理的设计原则；
      - mutation 的职责：
        1. 唯一修改 state 的入口，确保状态的变更是同步、可追踪的；
        2. 每个 mutation 对应一个具体的状态变更；
        3. 必须是同步代码，方便 devtools 记录状态快照；
      - action 的职责：
        1. 处理业务逻辑（如 api 请求、异步操作）；
        2. 可以包含异步代码（如 axios 请求、setTimeout）；
        3. 通过提交 mutation 间接修改 state，而非直接操作状态；
    - 可预测性与调试
      - 同步 mutations：
        1. 每个 mutation 的执行会被 vuex devtools 记录，形成状态变更日志；
        2. 如果 mutation 是异步的，devtools 无法准确跟踪状态的先后顺序；
      - 异步 actions：
        1. 允许在异步操作前后添加逻辑（如加载状态、错误处理）；
        2. 即使异步操作顺序不确定，最终通过 mutation 修改的状态仍是可预测的；
    - 避免竞态条件
      1. 如果允许 mutations 异步修改 state，可能导致多个异步操作同时修改同一状态，引发不可预期的结果；
      2. 通过 actions 协调异步流程，确保最终提交的 mutation 是顺序执行的；
    - 更好的代码组织
      - mutations：只关注状态如何变更；命名通常全大写，与业务逻辑解耦；
      - actions：处理复杂逻辑，可以组合多个 mutations；

37. URI、URL、URN 分别是什么？

    - URI（统一资源标识符）：用于唯一标识某一资源的字符串，可以是资源的名称（URN）或地址（URL）或两者结合；
      - 作用：标识资源（无论通过名称、位置或其他方式）；格式<scheme>:[//<authority>]<path>[?<query>[#<fragment>]]；
      - URI 包含两大子集：URL（通过位置标识资源）；URN（通过名称标识资源）；
    - URL（统一资源定位符）：URL 是 URI 的子集，通过资源的位置来标识资源，并说明如何访问它；
      - 核心组成：scheme + hostname + port + path + query + fragment;
        - scheme: 协议（如 http、ftp）
        - authority：域名/IP + 端口；
        - path：资源路径
        - query：参数
        - fragment：片段标识
      - 特点：依赖位置-如果资源移动，URL 失效；可访问性-直接用于获取资源；
    - URN（统一资源名称）：URN 是 URI 的子集，通过资源的持久名称标识资源，不依赖位置，旨在长期唯一；
      - 格式：url:<namespace>:<identifier>
        1. Namespace：命名空间
        2. Identifier：唯一标识符
      - 特点：持久性-资源位置变化时名称不变；不直接访问-需通过解析服务器转换为 URL；
    - 三者关系：URI = URL + URN；
      1. 所有 URL 和 URN 都是 URI，但并非所有的 URI 都是 URL 或 URN；
      2. 部分 URI 既不是 URL 也不是 URN（如 mailto：）；

38. ts 中的类型断言是什么？

    - 类型断言是一种显式告诉编译器某个值的具体类型的方式，它不会改变运行时的值，仅用于编译阶段的类型检查；
    - 类型断言的作用
      1. 覆盖 ts 的类型推断：当比编译器更清楚某个值的类型时，手动指定类型；
      2. 避免不必要的类型检查：特别是在处理联合类型或动态数据时（如 API 响应）；
      3. 语法形式
         - 尖括号语法（<Type>）
         - as 语法（推荐）：在 jsx 中，尖括号语法会与标签冲突，as 是唯一可用的形式；代码可读性更高；
      4. 类型断言 vs 类型转换
         - 类型断言：仅在编译阶段影响类型检查，不改变运行时值；
         - 类型转换：在运行时实时转换值的类型；

39. ts 中 never 和 void 的区别？

    - 在 ts 中，never 和 void 都用于表示函数返回值类型，但语义和使用场景有本质区别；
    - void：表示函数没有返回值（或返回 undefined）；用于函数没有 return 语句、函数显式返回 undefined 或 void；不能赋值给其他类型（除 any/unknown）
    - never：表示函数永远不会有返回值（函数无法正常执行完成）；用于函数抛出错误、无限循环、类型收窄的兜底分支；never 是任何类型的子类型，可以赋值给任何类型；除 never 外，没有类型可以赋值给 never；

40. 使用 ts 实现判断一个入参是否是数组类型的方法？

    - 使用 Array.isArray：js 原生的数组检测方法，ts 能自动推断类型；
    - 自定义类型守卫（处理泛型数组）
    - 基于 instanceof（不推荐）：仅适用于某些运行环境（如浏览器），无法处理跨框架的数组实例；
    - 类型谓词 + 类型检查（兼容旧环境）

    ```js
    typeof value === "object" && value !== null && "length" in value;
    // 注意：此方法不严谨（某些类数组对象可能被误判）
    ```

    - 结合 ts 类型收窄：直接内联判断，无需单独函数；

41. setTimeout 为什么不能保证立即执行？

    - 核心原因：事件循环的运行机制；js 是单线程语言，通过事件循环处理异步任务；setTimeout 的回调任务属于宏任务，其执行任务受以下流程影响
      1. 任务队列分层
         - 同步代码：立即执行，阻塞主线程；
         - 微任务：在当前宏任务末尾立即执行；
         - 宏任务：进入任务队列等待下一轮事件循环；
      2. setTimeout(fn,0)：即使延迟为 0，setTimeout 的回调仍需等待当前调用栈清空且所有微任务执行完成后才会执行；
    - 浏览器的最小延迟限制：现代浏览器对 setTimeout 的延迟时间有最低阈值（4ms），这是为了防止嵌套 setTimeout 导致的性能问题；
    - 主线程阻塞：如果 js 的主线程在执行长时间运行的同步代码，setTimeout 的回调会被阻塞，直到主线程空闲；
    - 浏览器渲染流程的干扰：浏览器的渲染优先级高于宏任务，即使 setTimeout 已就绪，也可能被渲染任务延迟；
    - 替代方案：
      1. 微任务：Promise、requestAnimationFrame、queueMicrotask；
      2. WebWorker（避免主线程阻塞）；

42. img 的 srcset 属性的作用？

    - img 标签的 srcset 属性是 html5 用于响应式图片加载的关键特性，它允许开发者根据设备的屏幕分辨率、像素密度和视口宽度，为浏览器提供多个候选图像源，由浏览器自动选择最合适的图片加载，从而优化性能和用户体验；
    - 核心作用：
      1. 自适应分辨率：根据设备像素比选择高/低分辨率图片；
      2. 响应式布局：根据视口宽度加载不同尺寸的图片；
      3. 节省带宽：避免在高分辨率设备上加载过大的图片；
    - 浏览器选择策略：
      1. 根据 sizes 计算出图片的所需显式宽度：CSS 像素；
      2. 结合设备的物理像素密度，计算出需要的图片物理宽度：所需物理宽度=所需显示宽度\*DPR；
      3. 从 srcset 的宽度描述符中，选择 ≥ 所需物理宽度的最小图片；

43. canvas 在标签上设置宽高，与在 style 中设置宽高有什么不同？

    - 核心区别
      1. 标签属性：设置画布的像素网格大小，默认与分辨率相同，图像质量清晰（1：1 渲染）；
      2. style 设置：不改变画布像素网格（默认 300\*150），显示缩放至 css 指定尺寸，图像质量可能模糊（拉伸或压缩）；
    - 通过 canvas 属性设置：<canvas width="400" height="300"></canvas
      1. 画布分辨率：创建一个 400\*300 像素的绘图缓冲区；
      2. 显示尺寸：浏览器默认以 400\*300 物理像素显示；
      3. 效果：绘制内容清晰，1 个 css 像素=1 个画布像素；
    - 通过 css 设置：<canvas style="width:400px;height:300px"></canvas>
      1. 画布分辨率：仍为默认的 300\*150 像素；
      2. 显示尺寸：将默认画布（300*150）拉伸到 400*300css 像素；
      3. 效果：绘制内容被拉伸，可能出现模糊或锯齿；1 个 css 像素 ≠ 一个画布像素；
    - 概念：width/height 属性是画布的“内在尺寸”；CSS 样式是“外在尺寸”；

44. 举例 ES6 对 String 字符串类型做的重用升级优化？

    - 模板字符串：支持多行字符串、嵌入变量/表达式，避免频繁的字符串拼接；
    - 新增字符串方法
      1. includes/startsWith/endsWith，更直观判断字符串包含关系，替代 indexOf;
      2. repeat: 重复字符串指定次数；
      3. padStart/padEnd：填充字符串到目标长度；
      4. trimStart/trimEnd：清除字符串首/尾空白字符；
    - Unicode 支持增强
      1. 码点表示法：支持\u{码点}表示超过\uFFFF 的字符；
      2. String.fromCodePoint/codePointAt：正确处理 4 字符的 Unicode 字符；
    - 迭代器支持（for...of）：直接遍历字符串的字符；
    - 标签模板：自定义模板字符串的解析逻辑，用于国际化、安全过滤等场景；
    - 原始字符串：通过 String.raw 获取原始字符串（忽略转义字符）；

45. vue 中 template 的编译原理？

    - vue 中的 template 编译原理是将模板字符串转为可执行的渲染函数（render 函数），这一过程分为解析（Parse）-> 优化（Optimize）-> 生成代码（Generate）三个阶段；
    - 解析（Parse）：将 template 字符串转为 AST（抽象语法树），结构化表示模板内容；
      1. HTML 解析器：处理 HTML 标签、属性、文本；
      2. 文本解析器：处理{{ }}插值表达式；
      3. 过滤器解析器：处理 | 过滤器语法；
    - 优化（Optimize）：标记静态节点（Static Node），避免重复渲染；
      1. 静态节点特征：无动态绑定、无指令或事件监听器；
      2. 优势：跳过静态节点的 diff 对比，优化渲染性能；
    - 生成代码（Generate）：将优化后的 AST 转化为 render 函数字符串；
      1. 递归遍历 AST，拼接 js 代码字符串；使用 vue 的渲染工具函数；
      2. 最终结果：render 函数执行后返回虚拟 DOM，供 vue 进行 diff 对比和真实 DOM 更新；
    - 编译的触发时机
      1. 运行时编译：浏览器中通过 vuejs 直接编译模板；
      2. 预编译：使用 vue-loader 或@vue/compiler-sfc 在构建阶段提前编译为 render 函数；
    - vue3 的改进
      1. 编译器优化：（1）BlockTree-动态节点标记为 Block 减少 Diff 范围；（2）PatchFlag-标记动态绑定的类型，靶向更新；
      2. 更快的生成代码：生成更紧凑的 render 函数，减少运行时开销；

46. 说说 React 中的 diff 算法？

    - React 中的 Diff 算法是用于比较新旧虚拟 DOM 树，找出最小变更并更高效更新真实 DOM 的核心机制。其核心思想是在 O(n)时间复杂度内完成对比（而非传统 Diff 算法的 O(n^3)）；
    - Diff 算法的三大策略
      1. 同级比较（Tree Diff）
         - 只比较同层级的节点，不跨层级移动节点；
         - 如果节点类型不同，直接销毁旧节点及其子树，创建新节点；
      2. 组件类型一致则复用（Component Diff）
         - 相同类型的组件：React 保存实例，更新其 props 并触发生命周期；
         - 不同类型的组件：直接卸载旧组件，挂载新组件；
      3. 列表节点通过 Key 优化（Element Diff）
         - Key 的作用：帮助 React 识别节点的唯一性，避免不必要的重建；
         - 无 Key 时的默认行为：按索引顺序对比，可能导致性能问题；
         - 有 Key 时的优化：通过 Key 匹配新旧节点，仅移动或变更变化的节点；
    - Diff 的具体步骤
      1. 节点类型不同：直接替换，销毁旧节点及其子树，创建新节点；
      2. 节点类型相同：更新属性，仅修改变化的属性；
      3. 列表节点（带 key）
         - 算法策略
           1. 双指针对比，从列表头尾向中间扫描，匹配相同 key 的节点；
           2. 找到最小操作，移动、更新或删除节点，避免全部重建；
    - React18 的优化（Fiber 架构）
      1. 可中断的 Diff 过程：Fiber 将 Diff 拆分为多个小任务，避免阻塞主线程；
      2. 优先级调度：高优先级更新可打断低优先级；
    - Diff 算法的局限性
      1. 无法检测到跨层级移动的节点：如果节点层级变化，会触发销毁和重建；
      2. 依赖 Key 的稳定性：key 变化会导致节点重新被创建；

47. 微前端中的应用隔离是什么，一般是怎么实现的？

    - 定义：指的是确保多个子应用在同一个页面运行时，彼此间 js 执行环境、css 样式和 dom 结构相互独立，避免冲突。
    - js 隔离：多个子应用共享全局对象（window、document）可能导致：（1）全局变量/函数命名冲突；（2）第三方库重复加载（如两个子应用引入不同版本的 vue）；
      - 解决方案
        1. 沙箱（sandbox）
           - 快照沙箱：在子应用加载前保存全局状态快照，卸载时恢复；适用于单实例子应用（同一时间只允许一个子应用）；
           - Proxy 沙箱（多实例沙箱）：通过 Proxy 代理 window，每个子应用访问的是虚拟的全局对象；支持多实例同时运行；
           - 模块联邦（webpack module federation）：通过共享依赖，避免重复加载，要求子应用使用相同版本的框架；
    - css 隔离：子应用的样式可能全局生效，导致样式污染（如类名冲突）
      - 解决方案
        1. Scoped CSS：通过工具自动添加唯一属性选择器；
        2. Shadow DOM：将子应用的 DOM 和样式封装在 ShadowRoot 内，天然隔离；
        3. 命名空间（Prefix）：为子应用的 css 类名添加唯一前缀；
        4. 动态卸载样式：子应用卸载时移除其 style/link 标签；
    - DOM 隔离：子应用可能操作全局 DOM（document.body.appendChild）影响其他应用；
      - 解决方案
        1. 容器化：限制子应用的 DOM 操作范围，只能挂载到特点容器内；
        2. DOM 操作劫持：通过重写 document.appendChild 等方法，限制子应用的 DOM 操作；
    - 通信隔离：子应用通过全局对象通信会导致强耦合；
      - 解决方案
        1. 自定义事件：通过 window.dispatchEvent 和 window.addEventListener 通信；
        2. 状态管理库：主应用提供共享的 Redux 或 Vuex 实例；

48. CSS 中的 1 像素问题是什么，有哪些解决方案？

    - 移动端开发中，css 的 1 像素问题（1px 物理像素问题）指的是：在高 DPR（设备像素比）屏幕上，css 中设置的 1px 会被渲染为多个物理像素，导致线框或线条看起来比设计稿更粗；
    - 问题根源：设备像素比（DPR）= 物理像素/逻辑像素；DPR=2 时，1px 的 css 像素会渲染为 2\*2 的物理像素；表现为设计稿中的 1px 边框在 DPR 的设备上显示为 2px 物理像素；
    - 解决方案
      1. 媒体查询 + transform: scale()：通过缩放将边框压缩到实际物理像素大小；优点-兼容性好，适用于边框、线条；缺点-需手动适配不同 DPR；
      2. viewport 缩放：通过调整 viewport 的 initial-scale，使 css 像素与物理像素 1：1 对应；
      3. border-image 或 linear-gradient：应用图片或渐变模拟细边框；缺点-不灵活，颜色和样式难以动态调整；
      4. box-shadow：用阴影替代边框；缺点-兼容性一般；
      5. PostCss 插件（自动转换）：通过构建工具自动将 1px 转换为适配方案；
      6. CSS 新特性：border-width：thin；部分浏览器支持 thin 关键字渲染更细的边框；缺点-兼容性差；
    - 推荐实践
      1. 通用方案：结合媒体查询+transform
      2. 工程化项目：使用 postcss 插件
      3. 简单页面：调整 viewport 的 initial-scale；

49. react 中的虚拟 DOM 是怎么实现的？

    - 虚拟 DOM 的本质：一个普通的 js 对象，描述真实 DOM 的层次结构和属性；
    - 虚拟 DOM 的实现流程
      1. 创建虚拟 DOM：通过 React.createElement 或 jsx 编译生成虚拟 DOM 对象；
      2. 初次渲染：将虚拟 DOM 转换为真实 DOM 并插入页面；
      3. 更新阶段（Diff + 批量更新）
         - 生成新虚拟 DOM：状态变化时，重新调用 render 生成新的虚拟 DOM 树；
         - Diff 算法对比
           1. 同级比较：仅对比同一层级的节点；
           2. 节点类型不同：直接替换整个子树；
           3. 节点类型相同：更新属性，递归对比子节点；
           4. 列表优化：通过 key 标识节点移动；
         - 生成补丁（Patch）：记录需要更新的具体操作；
         - 批量更新真实 DOM：将补丁一次性应用到真实 DOM；
    - 虚拟 DOM 的核心优化
      1. Diff 算法策略
         - TreeDiff：仅比较同层级，不跨层级移动；
         - ComponentDiff：相同类型的组件复用实例，否则销毁重建；
         - ElementDiff：列表节点通过 key 标识稳定性；
      2. 批量更新
         - 将多次状态更新合并为一次 DOM 操作，避免频繁重绘；
         - React17+使用 Fiber 架构实现可中断的异步渲染；
      3. 跨平台能力
         - 虚拟 DOM 与真实 DOM 解耦，可渲染到不同环境；

50. DNS 协议介绍？

    - DNS 是互联网中用于人类可读的域名转换为机器可识别的 IP 地址（如 192.0.2.1）的核心协议；
    - DNS 的核心作用
      1. 域名解析：将域名转换为 IP 地址或 IP 地址转换为域名；
      2. 负载均衡：通过返回不同的 ip 实现流量分发；
      3. 邮件路由：通过 MX 记录指定邮件服务器；
      4. 抗攻击：分散式架构避免单点故障；
    - DNS 协议分层结构：DNS 是一个分层的分布式数据库；根域名服务器 -> 顶级域服务器.com/.org -> 权威域名服务器 example.com -> 主机记录 www,mail；
      1. 根域名服务器（ROOT DNS）
         - 全球共 13 组（逻辑上的 13 个 IP，实际通过传播术扩展）
         - 管理顶级域的地址；
      2. 顶级域服务器（TLD DNS）
         - 负责特定后缀
         - 返回权威域名服务器的地址
      3. 权威域名服务器（Authorities DNS）
         - 存储具体域名的解析记录；
         - 由域名注册商或企业自建；
      4. 递归解析器（RecursiveResolver）
         - 代表客户端向各级 DNS 服务器查询；
    - DNS 安全与优化
      1. 安全问题
         - DNS 劫持：篡改解析结果
         - DNS 污染：伪造响应
         - DDoS 攻击：针对 DNS 服务器的流量攻击；
      2. 性能优化
         - 缓存：递归解析器缓存结果
         - 预取：浏览器提前解析页面中的域名
         - CDN 联动：根据用户位置返回最近的 IP
      3. 现代协议扩展
         - DoH（DNS over HTTPS）：通过 HTTPS 加密 DNS 查询
         - DoT（DNS over TLS）：通过 TLS 加密 DNS 查询
         - EDNS：扩展 DNS 报文大小和支持更多功能；

51. 协商缓存中，有 Last-Modified，为什么还有 Etag？

    - 在 HTTP 协商缓存机制中，Last-Modified 和 ETag 虽然都用于验证资源是否变更，但它们的实现方式和适用场景有显著差异。同时引入两者是为了解决 Last-Modified 的局限性，提供更精确、灵活的缓存控制；
    - Last-Modified 的局限性
      1. 时间精度问题：秒级精度，若文件在 1s 内多次修改，无法识别；
      2. 文件内容未变但时间戳更新：某些场景下（如备份恢复、git 操作），文件内容未变但修改时间更新，导致不必要的重新下载；
      3. 分布式系统时间同步问题：服务器集群若时间不同步，可能导致 Last-Modified 不可靠；
    - ETag（Entity Tag 是服务器生成的资源唯一标识符）的优势
      1. 内容哈希，精确匹配：基于内容生成，如 MD5 或版本号，内容不变则 ETag 不变；
      2. 忽略时间干扰：即使文件时间戳变化，只要内容未变，ETag 仍相同；
      3. 支持弱验证（WeakValidation）：允许非严格匹配（如只检查语义是否相同，忽略无关更改）；
    - 两者共存：服务器可同时返回 Last-Modified 和 Etag，客户端优先适用 ETag（更可靠）

52. Vuex 和单纯的全局对象有什么区别？

    1. 核心区别
       - 数据响应式：vuex 自动触发视图更新，全局对象需手动监听或触发更新；
       - 状态管理：vuex 使用集中式、结构化；全局对象分散式、无强制规范；
       - 数据修改方式：vuex 通过 mutation/action 严格管控；全局对象直接赋值，任意修改；
       - 调试工具支持：vuex 使用 devtools 可观察数据时间旅行调试、状态快照；全局对象无内置工具支持；
       - 模块化：vuex 支持模块拆分和命名空间；全局对象需要自行实现；
       - 服务端渲染：vuex 天然支持；全局对象需要额外处理数据共享；
       - 性能优化：vuex 自动缓存和高效更新；全局对象需手动优化；
    2. 适用场景
       - 适合使用 Vuex 的情况
         1. 中大型应用，需要集中管理复杂状态；
         2. 需要严格的变更追踪和调试能力；
         3. 涉及组件间深度嵌套的数据共享；
         4. 需要服务端渲染或持久化状态；
       - 适合全局对象的情况
         1. 小型应用或简单的全局配置
         2. 临时共享非响应式数据
         3. 快速原型开发；

53. 如何使用 CSS 来实现禁用移动端页面的左右滑动手势？

    1. 使用 CSS touch-action 属性：touch-action 是专为控制触摸行为设计的 CSS 属性，直接禁用水平滑动；

    ```css
    touch-action: pan-y;
    /** pan-y: 仅允许垂直方向滚动，禁止水平滑动 */
    /** none: 禁用所有触摸手势（可能影响必要交互） */
    ```

    2. 禁止溢出滚动（Overflow）：此方法会禁用水平滚动，可能影响部分页面布局；
    3. 结合 js 阻止默认事件；
    4. Meta 标签辅助（针对 iOS）：user-scalable=no，禁用双指缩放（间接减少滑动误触）；

54. vue 中 mixins 的理解和使用？

    1. mixins 是一种灵活的方式，用于分发组件可复用的功能。它允许你将一组组件选项（data、methods、生命周期钩子等）封装到一个对象中，并在多个组件之间共享；
    2. 合并策略：
       - data：以组件优先，如果同名则组件中的属性覆盖 mixins；
       - 钩子函数：两者都会调用，mixins 的钩子先执行；
       - methods、components、directives 等对象，以组件优先，同名方法覆盖 mixins 方法；
    3. 注意事项：
       1. 命名冲突：组件存在相同命名选项时，以合并策略为主；
       2. 维护性：过度使用可能导致代码难以追踪逻辑来源；
       3. 适用于简单复用：适合不涉及复杂状态管理的场景，如工具方法、通用初始化逻辑等；
    4. vue3 推荐替代方案：vue3 的 Composition API 更适合逻辑复用；

55. Promise.all 和 Promise.allSettled 有什么区别？

    1. Promise.all
       - 成功条件：所有 Promise 都成功；
       - 失败条件：任意一个 Promise 被 reject，则立即拒绝；
       - 返回结果类型：成功时返回各 Promise 的结果数组；
       - 适用于：所有任务必须成功才视为成功；
    2. Promise.allSettled
       - 成功条件：无论成功或失败，所有 Promise 都已完成；
       - 失败条件：不会因某个 Promise 失败而中断，始终等待所有完成；
       - 返回每个 Promise 的状态和结果组成的数组；
       - 适用于：关心每个任务的结果，无论成败；

56. js 中的错误类型有几种？

    1. 内置错误类型
       - Error：所有错误的基类，通用错误对象；自定义错误时继承它；
       - EvalError：于 eval()函数相关的错误；不推荐使用；
       - RangeError：值超出有效范围；数组长度过大、递归过深等；
       - ReferenceError：引用了不存在的变量或非法引用；使用未声明的变量；
       - SyntaxError：语法错误；
       - TypeError：操作的类型错误；调用非函数、访问 null 的属性等；
       - URIError：URI 编码/解码错误；如 decodeURIComponent("%");
    2. 自定义错误类型
       - 可以通过继承 Error 来创建自己的错误类；

57. ts 中 any 和 unknown 有什么区别？

    1. any
       - 特点
         1. 完全绕过类型检查，相当于回到纯 js 的松散类型模式；
         2. 可以赋值给任意类型，也可以接收任意类型的值；
         3. 对 any 类型的变量进行任何操作（访问属性、调用方法、算术运算等）都不会触发类型错误；
       - 风险：滥用 any 会彻底丧失 ts 的类型安全优势；
    2. unknown
       - 特点
         1. 标识“未知类型”，是类型安全的替代方案；
         2. 可以接受任意类型的值，但不能直接操作（除非先进行类型检查或类型断言）
         3. 不能赋值给其他类型（除了 unknown 和 any），除非显式类型断言；
    3. 使用场景
       - any：仅在紧急兼容旧代码或快速原型开发时使用，应尽量避免；
       - unknown：适合处理动态内容（如解析 JSON、第三方库返回值等），强制开发者显式处理类型，提升安全性；

58. 说说如何在 react 项目中捕获错误？

    1. ErrorBoundaries（错误边界）：react16 提供的机制，用于捕获子组件树中的渲染时错误；无法捕获以下错误：
       - 事件处理器中的错误 -> 需用 try/catch;
       - 异步代码 -> 需自行处理；
       - SSR 错误；
       - 错误边界自身抛出的错误；
    2. 事件处理函数中的错误：使用 try/catch 手动捕获
    3. 异步代码错误
       - Promise 错误: .catch() / try..catch
       - window.onerror/window.addEventListener("error", hanlder);
    4. 第三方错误监控服务：集成专业工具（Sentry/Bugsnag）自动捕获错误；
    5. react18+的 react-error-boundary 库；

59. react 的懒加载的实现原理是什么？

    - 通过动态导入和代码分割实现的，核心目的是减少初始加载时的资源体积，提升页面性能；
    - 底层机制：动态导入，懒加载基于 js 的动态导入语法（import()）；
      - 动态导入返回一个 Promise，在组件首次渲染时才会触发加载对应的模块；
      - Webpack/Rollup 等打包工具会将动态导入的模块自动拆分为单独的 chunk 文件；
    - React.lazy 的实现原理
      - 接收一个函数：该函数返回动态导入的 Promise
      - 返回一个特殊组件：React.lazy 返回的组件是一个可挂起的 React 组件；
      - 与 Suspense 协作：当组件加载时，React 会暂停渲染并显示 Suspense 的 fallback UI，直到模块加载完成；
      ```js
      function lazy(load) {
        let loadedModule = null;
        return function LazyComponent(props) {
          if (loadedModuled === null) {
            throw load().then((module) => {
              loadedModule = module.default;
            });
          }
          return React.createElement(loadedModule, props);
        };
      }
      // 如果模块未加载完成，lazy会抛出一个Promise；
      // React捕获这个Promise并在其解决后重新渲染组件；
      ```
    - 与 Suspense 配合：懒加载组件必须包裹在 Suspense 中，以处理加载中的状态；Suspense 的作用是捕获子组件树中的异步操作，在等待期间显示 fallbackUI；
    - 注意事项：
      1. 仅支持默认导出：lazy 的动态导入必须返回 default 导出的组件；
      2. SSR 兼容性：服务端渲染需要使用 next/dynamic 等替代方案；
      3. 错误处理：结合 ErrorBoundary 捕获加载失败错误；

60. react 中，子父组件的生命周期执行顺序是怎么样的？

    - 在 react 中，父子组件的生命周期执行顺序遵循“父组件挂载->子组件挂载->子组件更新->父组件更新”的规则，具体顺序因 react 版本（类组件或函数组件+hooks）而异；
    - 类组件的生命周期顺序
      ```js
      /**
      挂载阶段
      父组件constructor
      父组件getDerivedStateFromProps
      父组件render
      进入子组件
      子组件constructor
      子组件getDerivedStateFromProps
      子组件render
      子组件componentDidMount
      父组件componentDidMount
      关键点：（1）父组件的render执行完毕，才会开始子组件的挂载流程；（2）子组件的componentDidMount先于父组件触发（因为子组件需要先插入DOM树）；
       */
      /**
       更新阶段：当父组件状态/属性变化触发更新时
       父组件getDerivedSTateFromProps
       父组件shouldComponentUpdate
       父组件render
       进入子组件
       子组件getDerivedStateFromProps
       子组件shouldComponentUpdate
       子组件render
       子组件getSnapshotBeforeUpdate
       父组件getSnapshotBeforeUpdate
       子组件componentDidUpdate
       父组件componentDidUpdate
       关键点：（1）子组件componentDidUpdate先于父组件执行；
       */
      /**
        卸载阶段
        父组件componentWillUnmount
        子组件componentWillUnmount
        注意点：（1）父组件的卸载逻辑先执行，然后递归卸载子组件
        */
      ```
    - 函数组件的生命周期顺序：函数组件的生命周期通过 Hooks 模拟，执行顺序与类组件类似，但更线性化

    ```js
    /**
    挂载阶段
    父组件useState/useReducer
    父组件useEffect（调度、未执行）
    父组件render
    进入子组件
    子组件useState/useReducer
    子组件useEffect（调度、未执行）
    子组件render
    子组件useEffect（执行）
    父组件useEffect（执行）
    关键点：（1）useEffetc的回调函数会在子组件渲染完成后，从内到外的顺序执行；
     */
    /**
    更新阶段
    父组件useState/useReducer
    父组件useEffect（调度、未执行）
    父组件render
    进入子组件
    子组件useState/useReducer
    子组件useEffect（调度、未执行）
    子组件render
    子组件useEffect（执行）
    父组件useEffect（执行）
    关键点：（1）useEffect的清理函数（如果有）会先执行，顺序时从父到子，然后执行新的副作用，顺序是从子到父；
     */
    ```

    - 关键结论
      1. 挂载时：父组件先渲染，但子组件的副作用先执行；
      2. 更新时：子组件的副作用先于父组件执行（React 的更新是深度优先遍历）
      3. 卸载时，父组件的清理逻辑先执行（保证父组件能安全释放资源）；

61. 为什么说 HTTP 是无状态协议？

    - HTTP 被称为无状态协议，因为它设计初衷是每个请求都是独立的，服务器默认不会保留任何客户端的历史请求信息；
    - 无状态的核心定义：（1）无状态：指协议本身不具备记忆能力，服务器请求处理时，不会主动记住之前的请求内容；（2）每个 HTTP 请求都是全新的：即使来自同一个客户端，服务器也会将其视为独立请求，除非通过额外手段附加状态信息；
    - 为什么设计为无状态？
      1. 简化服务器设计：（1）无状态设计让服务器无需维护复杂的请求上下文，降低资源占用；（2）服务器可以更容易水平扩展（负载均衡），因为请求可以路由到任意后端实例；
      2. 提高可靠性：如果某个请求失败，其他请求不受影响；
      3. 符合早期 web 场景：早期 HTTP 请求主要用于静态文档传输（如 HTML 文件），无需跟踪用户状态；
    - 如何解决无状态的限制？
      1. cookies
         - 服务器通过 set-cookie 头部向客户端发送标识；
         - 客户端后续请求自动携带 cookie 头部，服务器借此识别用户；
      2. session
         - 服务器在内存或数据库中存储会话数据，通过 cookie 中的 ID 关联；
      3. token（JWT）
         - 客户端在请求头中携带加密的令牌，服务器解密后获取状态；
      4. URL 参数/隐藏字段
         - 将状态信息嵌入 URL 或表单隐藏字段；
    - 无状态的优势与劣势
      1. 优势
         - 降低服务器负担：无需为每个用户保存状态；
         - 提高可扩展性：适合分布式系统；
         - 简化重试机制：单个请求失败可独立重试
      2. 劣势
         - 需额外手段管理状态：如购物车、登录态等需通过 cookie/session 实现；
         - 重复传输数据：每次请求可能需重复发送认证信息；

62. 如何理解静态资源完整性校验？

    - 静态资源完整性校验（Subresource Integrity 简称 SRI）是一种安全机制，用于确保网站加载的第三方静态资源未被篡改。它的核心是通过密码学哈希验证来确保资源的完整性和真实性；
    - 风险场景
      1. CDN 劫持：如果引用第三方资源，被攻击者替换为恶意代码，会导致用户执行不可信内容；
      2. 中间人攻击：网络传输过程中资源被篡改；
      3. 供应链攻击：第三方资源提供者自身被入侵，导致资源被恶意修改；
    - 传统方案的不足：单纯依赖 HTTPS 只能保证传输加密，不能验证资源内容是否被篡改；
    - SRI 的工作原理
      1. 基本流程
         - 生成哈希值：开发者对原始资源文件计算密码学哈希；
         - 声明哈希值：在 script/link 标签中通过 integrity 属性指定哈希值；
         - 浏览器验证：浏览器下载资源后重新计算哈希值，与声明的哈希对比，不匹配则拒绝执行；
    - SRI 的优势与限制
      1. 优势
         - 防篡改：确保资源内容与开发者预期完全一致；
         - 零信任增强：即使第三方 CDN 不可信，也能保证安全；
         - 简单易用：只需添加 integrity 属性，无需修改服务器逻辑；
      2. 限制
         - 动态资源不适用：内容频繁变化的资源无法使用固定哈希；
         - 哈希更新成本：每次资源内容更新需重新计算并替换哈希；
         - 旧浏览器兼容性：IE 不支持，但现代浏览器全覆盖；
    - 实际应用场景
      1. 关键库依赖：如 vue、react、jquery 等通过 CDN 引入的框架；
      2. 合规要求：某些安全标准要求确保第三方资源的完整性；
      3. 高安全性网站：政府、金融等对安全敏感的站点；

63. react 中引入 css 的方式有哪几种？

    1. 行内样式（JSX 中使用 style 属性）
    2. 普通 css 文件导入；
    3. css modules：局部作用域 css，文件名[name].module.css，避免样式冲突；
    4. css-in-js：将 css 写入 js 中，实现动态样式和组件化；
    5. Sass/Less/Stylus 预处理器：通过预处理器增强 css 功能，需安装对应的 loader；
    6. tailwindcss：实用工具优先的 css 框架，通过类名组合实现样式；
    7. postcss：通过插件转换 css（如自动前缀、嵌套语法）

64. 为什么不能使用 this.state 直接改变数据？

    1. react 的状态更新机制依赖 setState；
       - setState 更新状态并触发组件的重新渲染；
       - 合并部分状态（浅合并），并非完全替换；
       - 直接修改 state 不会触发渲染，react 无法感知状态变化，ui 不会更新；
       - 直接修改 state 破坏状态一致性，后续通过 setState 更新时，可能覆盖手动修改值；
    2. 异步更新的风险：react 会将多个 setState 调用合并为一次更新提高性能。直接修改 state 会导致更新时机混乱；
    3. 函数式更新依赖的问题：当状态更新依赖前一个状态时，直接修改会导致计算错误；
    4. 直接修改 this.state 的潜在问题
       - 生命周期方法的依赖失效：shouldComponentUpdate 等依赖状态变化的生命周期方法可能无法正常工作；
       - 并发模式不兼容：react18 的并发特性依赖状态更新的可追踪性，直接修改会破坏其调度机制；
       - 开发者工具无法调试：React DevTools 无法捕获直接的状态修改，导致调试困难；
    5. 底层原理：react 的状态管理
       - 不可变数据：react 通过对比新旧状态来优化渲染性能，直接修改会破坏不可变性，导致比较失败；
       - 批量更新：setState 的批量更新依赖于规范 API 调用，直接修改会绕过此机制；
    6. 构造函数中可以直接赋值：在 constructor 内初始化 this.state 是唯一允许直接赋值的场景；

65. typescript 的 declare 关键字的作用？
    - declare 关键字用于声明类型信息，而无需提供具体的实现。它的核心作用是告诉 ts 编译器“这个函数、变量、类或模块的类型已存在，请直接进行类型检查”。
    - 主要用途
      1. 声明全局变量或类型：当使用第三方库或全局环境中存在的变量时，declare 可以为其添加类型定义；
      2. 描述非 ts 编写的模块（类型声明文件.d.ts）
      3. 扩展已有类型：为现有类型添加新属性（如扩展 Window 接口）
      ```ts
      declare global {
        interface Window {
          myCustomMethod: () => void;
        }
      }
      window.myCustomMethod();
      ```
    - 关键特性
      1. 不生成 js 代码：仅用于类型声明，编译后会被完全删除；
      2. 作用域：可在.d.td 文件或普通.ts 文件中使用；
      3. 与 any 的区别：declare 提供精确类型，any 会绕过类型检查；
    - 注意事项
      1. 避免过度使用：优先使用真实 ts 代码而非 declare，除非处理外部资源；
      2. 声明类型文件(.d.ts)：通常将全局声明放在 global.d.ts 或@types/目录下；
      3. 模块扩展：使用 declare module 时需要确保模块名与导入路径完全匹配；

66. React中如何实现类似vue中watch的deep功能？
    - 使用useEffect + 深度比较依赖：通过手动比较前后值的差异（递归或浅比较库）来模拟deep: true；
    ```js
    function useDeepCompareEffect(callback, deps) {
        const prevDeps = useRef();

        useEffect(() => {
            if (!isEqual(prevDeps.current, deps)) {
                callback();
            }
            prevDeps.current = deps;
        }, [callback, deps]);
    }
    ```
        - 优点：精确监听任意深度的变化；
        - 缺点：深度比较可能带来性能开销（需权衡对象复杂度）
    - 使用自定义Hook + JSON.stringify：通过序列化依赖项来检测变化（适用于简单对象）
    ```js
    function useDeepWatch(value, callback) {
        const seriablizeValue = JSON.stringify(value);
        useEffect(() => {
            callback();
        }), [seriablizeValue]
    }
    ```
        - 优点：实现简单；
        - 缺点：（1）序列化性能较差（大对象不适用）；（2）无法处理函数、循环引用等特殊值；
    - 适用第三方库：use-deep-compare-effect（封装了深度比较的useEffect）；react-use-watch（提供了类似vue的watch功能）
    - 手动监听特定属性：如果只需监听对象的某些属性，直到解构到useEffect依赖项中；

67. Redux中的connect函数有什么作用？
    - connect是react-redux库中的核心高阶函数，用于将react组件和redux的store连接起来，使组件能够访问全局状态（state）和派发动作（dispatch）。
    - connect的核心功能：
        1. 将redux的state映射到组件的props中（通过mapStateToProps）
        2. 将dispatch方法映射到组件的props中（通过mapDispatchToProps）
        3. 自动订阅store的变化（当redux的state更新时，触发连接的组件重新渲染）
    - 工作流程
        1. 初始化时：connect将mapStateToProps和mapDispatchToProps的结果合并到组件的props；
        2. 状态更新时：（1）ReduxStore的state变化 -> 触发mapStateToProps重新计算；（2）如果返回stateProps变化 -> 触发组件重新渲染；
    - connect的优缺点
        1. 优点
            - 集中管理组件与redux的交互逻辑；
            - 自动处理订阅和性能优化
            - 兼容类组件和函数组件
        2. 缺点
            - 高阶组件嵌套可能导致调试困难；
            - 代码模板比较冗长；
            - 现代项目更倾向于适用hook；

68. base64编码图片，为什么会让数据量变大？
    - base64是一种将二进制数据转换为ASCII字符的编码方式，其核心规则是：（1）3字节（24位）二进制数据->4个Base64字符；每6位二进制数据映射为一个base64字符；（2）填充机制：如果原始数据不是3的倍数，会用=补位（如1字节数据->编码位4字符，后加2个=）；
    - 数据变大的原因
        1. 存储效率降低：二进制图片直接以字节（8位）位单位存储，无冗余；base64编码后，每3字节原始数据->4字节编码数据；数据膨胀比例4/3≈1.33
        2. ASCII字符的存储开销：Base64编码结果由ASCII字符组成（每个字符占1字节）但实际表示的信息密度更低；
        3. 填充字符的额外占用：若原始数据长度不是3的倍数，补位的=会进一步增加体积；
    - 具有使用价值的场景
        1. 嵌入到文本文件中：如HTML/CSS/JSON中直接内联图片，避免额外HTTP请求；
        2. 简化数据传输：某些协议仅支持文本，无法直接传输二进制；
        3. 避免跨域问题：内联base64图片不受跨域限制；

69. WebSocket协议升级是什么？
    - 指的是客户端与服务器通过HTTP协议发起协商，将普通的HTTP连接升级成全双工的WebSocket连接的过程。这一机制允许在单个TCP连接上实现持久化的双向通信，突破HTTP协议“请求-响应”模式的限制；
    - 协议升级的核心流程（WebSocket连接建立通过HTTP握手完成）
        1. 客户端发起升级请求，客户端发送有一个带有特殊头部的HTTP请求
        ```http
        GET /chat HTTP/1.1
        Host: server.example.com
        Upgrade: websocket // 声明希望升级到WebSocket
        Connection: Upgrade // 要求切换协议
        Sec-WebSocket-Key: <KEY> // 随机生成的密钥
        Sec-WebSocket-Version: 13 // 指定WebSocket版本
        ```
        2. 服务器响应协议切换，若服务器支持WebSocket，返回101 Switching Protocols
        ```http
        HTTP/1.1 101 Switching Protocols
        Upgrade: websocket // 确认升级
        Connection: Upgrade
        Sec-WebSocket-Accept: <KEY> // 基于客户端Key计算的校验值
        ```
        3. 连接升级完成：此后TCP连接不再遵循HTTP协议，而是使用WebSocket二进制帧协议进行双向通信；
    - 协议升级的意义
        1. 从HTTP到WebSocket的转变
            - HTTP：无状态、单向
            - WebSocket：有状态、双向
        2. 性能优势
            - 避免HTTP重复握手
            - 数据帧轻量
        3. 实时通信场景
            - 适用于聊天、实时游戏、股票行情等需要低延迟双向通信的场景。
    - 常见问题
        1. 为什么需要协议升级？
            - 直接建立WebSocket连接可能被防火墙拦截，而HTTP升级是标准化流程，兼容性更好；
        2. WebSocket和HTTP2的区别？
            - HTTP2支持多路复用，但仍遵循“请求-响应”模式；WebSocket是真正的双向通信；
        3. 如何确保安全性？
            - 使用wss://，类似HTTPS

70. react如何将一个props限制在一个类型的列表？
    - 使用TypeScript联合类型（推荐）
    ```ts
    type ButtonVariant = 'primary' | 'secondary';
    interface ButtonProps {
        variant: ButtonVariant;
        children: React.ReactNode;
    }
    ```
    - 使用TypeScript枚举类型
    ```ts
    enum Theme {
        Light = 'light',
        Dark = 'dark'
    }
    interface ButtonProps {
        theme: Theme;
    }
    ```
    - 使用PropTypes + oneOf（React原生支持，无TypeScript）
    ```js
    function Button({ variant }) {
        return <button className={`btn btn-${variant}`}>{variant}</button>;
    }
    Button.propTypes = {
        variant: PropTypes.oneOf(['primary', 'secondary']).isRequired
    }
    ```

71. 什么是samesite cookie属性？
    - samesite是cookie一个属性，用于控制浏览器在跨站请求（Cross-site）场景下是否该发送Cookie。它的主要目的是增强Web安全性，防止CSRF（跨站请求伪造）攻击。
    - samesite的作用（默认情况下，浏览器发起请求时会自动带上与目标域名匹配的cookie，包括）
        1. 同源请求（Same-site）
        2. 跨站请求（Cross-site），如通过<form>提交、图片加载、iframe嵌入等；
        3. SameSite属性可以限制Cookie是否随这些跨站请求一起发送。
    - samesiate的可选值
        1. Strict：完全不允许跨站请求携带；
        2. Lax：允许部分安全的跨站GET请求携带cookie（如直接访问链接）
        3. None：总是发送Cookie，即使是从外部站点发起的请求；

72. 如何确保构造函数只能被new调用，而不能被普通调用？
    - 使用new.target判断调用方法：es6引入new.target元属性，用于检测函数是否通过new调用；
        - 优点：简洁、语义明确；原生支持es6构造函数逻辑判断；
    - 返回实例确保new行为（适用于类函数返回）：如果构造函数不是通过new调用的，可以让它返回一个新的实例；
    ```js
    function Person(name) {
        if (!(this instanceof Person)) {
            return new Person(name);
        }
        this.name = name;
    }
    ```
    - 使用class + new.target（typescript/es6推荐），在class中也可以使用new.target来限制构造函数的调用方式；
    - Symbol.hasInstance自定义instanceof检查：通过自定义Symbol.hasInstance来控制instanceof行为，但通常用于更复杂的封装场景，不建议使用）

73. document.write 和 innerHTML有什么区别？
    - document.write：向文档流中写入HTML或文本内容，用于页面加载时动态插入内容；
        1. 行为特点
            - 如果在页面加载过程中调用，页面会被追加到文档流中；
            - 如果在页面加载完成后调用，会清空当前文档并写入新内容；
            - 通常用于动态加载脚本或早期页面生成；
            - 不推荐在现代开发中使用，容易引起性能和安全问题；
        2. 注意：使用document.write在异步加载的script中调用可能导致文档被覆盖；
    - innerHTML：属于元素的一个属性，用于设置或获取某个元素的HTML内容，用于动态更新页面内容。
        1. 行为特点
            - 只修改指定元素的内容，不会影响整个文档；
            - 支持读取当前元素的HTML内容；
            - 高频操作可能引起重绘/重排，注意性能优化；
            - 是现代web开发中最常用的DOM更新方式之一；
        2. 注意：可能引起xss 漏洞，需要谨慎使用；

74. Composition API 和 React Hooks 之间的区别？
    - 设计哲学
        1. composition api
            - 逻辑组合：将组件的逻辑按功能居合道独立的setup函数中；
            - 响应式为核心：直接利用vue的响应式自动追踪依赖；
        2. react hooks
            - 状态逻辑复用：允许函数组件“钩入”react状态和生命周期；
            - 渲染驱动：每次渲染都会重新执行hooks函数，依赖闭包保存状态；
    - 响应式机制
        1. vue：ref/reactive创建的变量自动追踪依赖，触发时触发视图更新；无需手动声明依赖数组；
        2. react：状态更新触发组件重新渲染，hooks通过闭包保留最新值；需显式指定依赖，否则可能闭包陷阱；
    - 生命周期管理
        1. vue：显式调用生命周期钩子，与代码逻辑集中；
        2. react：通过useEffect模拟生命周期，依赖树组控制执行时机；
    - 逻辑复用方式
        1. vue：使用composable function（组合式函数），返回响应式状态和方法；
        2. react：使用custom hooks，命名以use开头；
    - 条件与循环限制
        1. vue：可以在条件语句或循环中调用compostion api；
        2. react：必须在组件顶层调用hooks，不可嵌套或条件调用（依赖调用顺序保证状态正确）；
    - 总结：
        1. 相似点：两者都解决了逻辑复用问题，减少了类组件的复杂性；
        2. 差异本质
            - vue的响应式系统让composition api更“声明式”（自动依赖）；
            - react的函数式模型让hooks更“命令式”（显式管理依赖）

75. 对于定长和不定长的数据，HTTP是怎么传输的？
    - 定长数据：当服务器明确知道响应体的长度时，会通过Content-Length头指定精确的字节数；
        1. 工作流程
            - 请求/响应头
            ```http
            HTTP/1.1 200 OK
            Content-Type: text/plain
            Content-Length: 13 # 明确声明数据长度为13
            ```
            - 消息体：客户端读取完Content-Length指定的字节数后，认为传输结束
        2. 特点
            - 优点：简单高效，接收方无需额外解析；
            - 缺点：必须预先直到数据长度（如静态文件、数据库查询结果）
            - 适用场景：图片、PDF等二进制文件或已知长度的文本；
    - 不定长数据的传输：当数据长度未知时，HTTP使用分块传输编码；
        1. 工作流程
            - 请求/响应头
            ```http
            HTTP/1.1 200 OK
            Content-Type: text/plain
            Transfer-Encoding: chunked #启用分块传输
            ```
            - 消息体：数据被拆分为多个块（chunk），每块包含长度和实际数据，最后以0\r\n结束
        2. 特点
            - 优点：无需预先知道总长度，支持流失传输（如实时日志、视频流）
            - 缺点：需解析分块格式，略微增加复杂度；
            - 适用场景：动态API响应、大文件流失上传/下载；
    - 其他传输方式
        1. HTTP2 和 HTTP3
            - 采用二进制帧传输，不再依赖Content-Length或Transfer-Encoding，但逻辑上仍遵循定长或流式语义；
            - 多路复用：允许在单个连接上并行传输多个资源；
        2. 断点续传：通过Range和Content-Range头部支持部分请求，适用于大文件下载；

76. 正向代理和反向代理分别是什么？
    - 正向代理：客户端（用户）的代理，代表客户端向服务端发送请求。客户端需要显式配置代理服务器地址。
        - 核心特点
            1. 代理对象：代表客户端（如公司内网用户）
            2. 隐藏客户端：服务器只看到代理的IP，无法识别真实用户。
            3. 客户端配置：需手动设置代理地址（如proxy.example.com:8080）；
            4. 典型用途
                - 突破访问限制（如访问被屏蔽的网站）
                - 企业内网统一管控外网访问
                - 加速访问（代理缓存静态资源）
        - 示例场景
            1. 科学上网：用户通过正向代理访问google
            2. 公司网络：员工通过代理服务器访问外网，管理员可监控流量；
    - 反向代理：服务器代理，代表服务器接收客户端请求。客户端无感知代理存在，认为直接访问的是真实服务器；
        - 核心特点
            1. 代理对象：代表服务器（如网站后端集群）
            2. 隐藏服务器：客户端不知道真实服务器的IP或架构；
            3. 无需客户端配置：用户直接访问代理地址（如www.example.com）；
            4. 典型用途
                - 负载均衡（分发请求到多台服务器）
                - 安全防护（DDoS防御、SSL卸载）
                - 缓存静态内容（减轻后端压力）
                - 统一入口（隐藏微服务架构细节）
        - 示例场景
            1. 网站高可用：Nginx将用户请求分发给后端的Web服务器集群；
            2. CDN边缘节点：用户访问的是CDN的反向代理，而非源站服务器；
    - 技术原理补充
        1. 正向代理的请求头：会显示Via 或 X-Forwarded-For头
        ```http
        GET http://target.com/ HTTP/1.1
        Host: target.com
        X-Forwarded-For: 192.168.0.1 # 真实客户端IP
        ```
        2. 反向代理的请求头：会修改Host头，将请求转发到后端
        ```http
        GET / HTTP/1.1
        Host: backend-server:8080 # 真实服务器地址（客户端不可见）
        ```
    - 常见误区
        1. VPN是反向代理：VPN是加密通道描述与正向代理（代表客户端）
        2. Nginx只能做反向代理：Nginx也可以配置正向代理（无手动设置）

77. 简述下overflow的原理
    - 触发条件：当容器内的内容尺寸超过容器本身的尺寸，就会发生溢出。此时，overflow属性决定如何处理这些溢出内容；
    - 属性值及行为
        1. visible（默认值）：溢出内容直接显示在容器外部，不剪切；不限制内容的渲染，允许其突破容器边界；
        2. hidden：溢出部分裁剪，不可见且不提供滚动条；通过裁剪将超出容器的内容隐藏，不占用布局空间；
        3. scroll：无论是否溢出，容器始终显示滚动条（水平和垂直）；强制生成滚动条区域，通过滚动查看溢出内容；
        4. auto：仅在内容溢出时显式滚动条（按需显示）；浏览器动态计算内容是否溢出，再决定是否渲染滚动条；
        5. clip（CSS3新增）：类似hidden，但禁止所有滚动（包括程序滚动）；严格裁剪，且忽略scrollTo等js滚动操作；
    - 方向细分
        1. overflow-x和overflow-y可分别控制水平或垂直方向的溢出行为；
        2. 若两者值不同且冲突（如x：scrool + y：hidden），浏览器会先优先保证逻辑一致性（如避免单方向滚动失效）
    - 布局影响
        1. 滚动条占用空间
            - 在标准盒模型下，滚动条会减少容器内容区的可用空间；
            - 可通过box-sizing：border-box或overflow：overlay避免；
        2. BFC创建：设置overflow为非visible会触发日期的块级格式化上下文（BFC），影响浮动、边距折叠等布局行为；
    - 常见应用场景
        1. 限制高度并滚动：如固定高度的对话框内容区域；
        2. 隐藏溢出内容：如裁剪圆形头像；
        3. 避免布局溢出：防止浮动元素或绝对定位内容破坏外部布局；

78. assets 和 static 的区别？
    - assets目录：存在需要经过构建工具处理的静态资源；例如：图片、字体、SCSS/CSS文件，自定义js模块等；
        1. 特点
            - 会被构建工具处理
                1. 文件可能被压缩、转译、代码分割或生成哈希文件名；
                2. 图片可能被压缩或转换为base64；
            - 引用方式
                1. 在代码中通过相对路径或模块化导入；
                2. 构建和路径会被自动替换为最终输出；
            - 适用于：（1）需要动态处理或优化的资源；（2）与组件或样式紧密关联的资源；
    - static目录：存放直接复制到最终构建产物的静态文件，不经过构建工具处理；例如第三方库（直接引用的js/css）、无需优化的图片、PDF文档等；
        1. 特点
            - 原样复制到输出目录：文件内容、路径和名称保持不变；
            - 引用方式
                1. 使用绝对路径直接引用
                2. 在HTML中可能直接通过/static/前缀访问；
            - 适用于：（1）无需处理的固定文件；（2）大型库；（3）需要保持路径文档的文件；
    - 注意事项
        1. 路径问题：在vue/react中，assets的引用路径可能因构建配置而变化，而static的文件路径更稳定；
        2. 框架差异：vue-cli默认使用public/替代static/（功能相同），而nextjs则有public/目录；

79. React的VM一定会提高性能吗？
    1. Virtual DOM的核心作用：是真实DOM的轻量级js对象表示，react通过对比新旧virtual dom的差异，计算出最小化的dom操作，再批量更新真实DOM；
        - 优势场景
            1. 减少直接操作真实DOM的次数：DOM操作昂贵，批量更新可避免频繁重绘和回流；
            2. 跨平台兼容：虚拟DOM抽象了渲染层，便于支持非浏览器环境
            3. 声明式编程：开发者无需手动处理DOM，代码更易维护；
    2. 虚拟DOM不保证性能提升的情况
        - 小规模或简单应用：如果应用状态变化极小或组件树非常小，虚拟DOM的Diff开销可能超过直接操作DOM的成本；
        - 极端高频更新：如果状态每秒更新数百次（如动画、实时数据流），虚拟DOM的diff和协调过程可能成为瓶颈；
        - 不当的使用方式：不必要的重新渲染，未合理使用memo、useMemo、useCallback导致diff范围过大；复杂的diff逻辑，深层嵌套组件或大量动态子组件会增加diff时间；

80. JS脚本延迟加载的方式有哪些？
    - defer属性：脚本异步下载，但会按顺序在DOM解析完成后、DOMContentLoaded事件前执行；不会阻塞HTML解析，适合依赖DOM的脚本（如页面初始化逻辑）；
    - async属性：脚本异步下载，下载完成后立即执行（可能中断HTML解析）；执行顺序不确定，谁先下载完成谁先执行；适用于独立且无依赖的脚本；
    - 动态脚本注入：通过js动态创建script标签插入dom，实现按需加载；可灵活控制加载时机（如用户交互后、页面空闲时）；适用于非关键脚本；
    - type=“module”：现代浏览器原生支持的es模块，默认具有defer行为；支持模块化依赖管理；适用于基于esmodule的现代浏览器应用；
    - Intersection Observer API（懒加载可视区域脚本）：当脚本所在元素进入视口时再加载，节省带宽；适用于长页面中的非首屏组件（如图片、视频、评论区）；
    - requestIdleCallback（空闲时加载）：在浏览器空闲时段加载低优先级脚本；适用于后台任务或不紧急脚本；
    - WebWorkers（非阻塞执行）：将耗时脚本放到web worker中运行，避免阻塞主线程；适用于计算密集型任务；
    - ServiceWorker（缓存与按需加载）：通过ServiceWorker缓存脚本，后续请求直接从缓存中读取，支持离线优先策略。适用于PWA应用或需要离线能力的脚本；

81. React Hooks在使用上有哪些限制？
    - 只能在顶层调用Hooks：不能在循环、条件语句或嵌套函数中调用hooks。因为react依赖hook的调用顺序来正确关联状态和副作用。如果顺序因条件或循环改变，会导致状态错乱；
    - 仅在函数组件或自定义hook中调用：hooks不能在普通js函数、类组件或事件处理函数中调用；因为hooks的设计依赖react的fiber架构，只能在react的函数组件上下文或自定义hooks中工作；
    - 自定义hooks必须以use开头：这是react的约定，便于工具静态检查hook的规则是否被遵守；
    - useEffect的依赖数组需谨慎处理：如果useEffect依赖外部变量，必须将其添加到依赖数组中，否则可能导致闭包问题或过时数据。
    - 避免在渲染期间执行副作用：因为渲染函数应该是纯函数，副作用应放在useEffect或事件处理函数中。
    - useState的更新函数是异步的：状态更新不会立即生效，连续调用更新函数可能合并。
    - useRef不会触发重新渲染：修改useRef的.current属性不会触发组件更新，适用于存储可变值，但不希望引起渲染的值；
    - hooks的闭包陷阱：在useEffect、useCallback等hook中，如果依赖数组为空，内部或捕获初始状态的闭包；
    - 避免滥用useMemo/useCallback：不必要记忆可能会增加性能开销；仅对计算成本高或易引起子组件不必要渲染的值的缓存；
    - strict mode下的双重渲染：开发环境下，react的strictmode会故意双重调用组件函数的某些hooks，以暴露潜在问题；

82. xml 和 json 有什么区别？
    - 语法和结构
        1. xml：标记语言；数据通过标签嵌套；标签重复导致体积较大；
        2. json：轻量级键值对；数据通过对象、数组、键值对表示；
    - 数据类型支持
        1. xml：基本类型需通过标签或属性自定义；复杂类型需要嵌套结构和混合内容；二进制数据需要编码；
        2. json：基本类型原生支持；负载对象支持对象和数组嵌套；二进制数据需要编码；
    - 可读性与简洁性
        1. xml：人类可读，但冗余标签降低可读性，适合需要严格结构验证的场景；
        2. json：更简洁，键值对形式直观，适合开发者；无冗余符号，更适合网络传输；
    - 解析与处理
        1. xml：需要DOM或SAX解析器，处理复杂；解析速度慢；
        2. json：直接解析为js对象，无需转换；解析速度快；
    - 扩展性与灵活性
        1. xml：高度可扩展，支持自定义标签和命名空间；适合复杂稳定；
        2. json：扩展性较弱，但灵活性高，易于代码集成；适合API数据交换；
    - 典型应用场景
        1. xml：传统企业级API；Android布局文件、Spring配置；复杂文档存储；
        2. json：现代API；npm的package.json文件；vscode配置；nosql数据库存储；
    - 验证与模式
        1. xml：支持DTD或XML Schema严格验证数据结构；
        2. json：无原生验证，依赖json schema等扩展；
    - 编码与国际化
        1. xml：原生支持编码声明（<?xml version="1.0" encoding="utf-8"?>）
        2. json：默认使用Unicode（UTF-8），无需显式声明；

83. git 的常用命令有哪些？
    - 仓库操作
        1. git init：初始化本地仓库；
        2. git clone：从远程仓库克隆项目到本地；
        3. git remote -v：查看远程仓库
        4. git remote add origin url：添加远程仓库；
    - 提交和修改
        1. git status：查看当前工作区状态；
        2. git add：添加文件到暂存区；
        3. git commit -m "message"：提交暂存区文件到本地仓库；
        4. git commit --amend：修改最后一次提交；
    - 分支管理
        1. git branch：查看本地分支；
        2. git branch <name>：创建分支；
        3. git checkout <name>：切换分支；
        4. git checkout -b <name>：创建并切换分支；
        5. git merge <name>：合并分支；
        6. git branch -d <name>：删除分支；
    - 代码同步与推送
        1. git pull：拉取远程分支合并；
        2. git pull --rebase：拉去并变基（避免多余合并提交）
        3. git push origin <name>：推送本地分支到远程；
        4. git push -u origin <name>：推送并关联远程分支；
    - 撤销与回退
        1. git restore <file>：撤销工作区修改（未git add）
        2. git restore --staged <file>：撤销暂存区修改（git add）
        3. git reset --hard <commit-id>：回退到指定分支（慎用，会丢失修改）
        4. git revert <commit-id>：撤销某次提交（生成新提交，更安全）；
    - 日志和差异
        1. git log：查看提交日志；
        2. git log --oneline：简洁版提交历史
        3. git log -p：查看提交内容和差异；
        4. git diff：查看工作区和暂存区的差异；
        5. git diff --cached：暂存区与仓库的差异；
    - 暂存和恢复
        1. git stash：将未暂存的修改暂存起来；
        2. git stash list：查看暂存列表；
        3. git stash pop：恢复暂存区；
    - 标签管理
        1. git tag：查看所有标签；
        2. git tag v1.0：创建标签；
        3. git tag -a v1.0 -m "message": 创建附注标签；
        4. git push origin --tags：将标签推送到远程仓库；
    - 高级操作
        1. git rebase <branch>：变基（整理提交历史）
        2. git cherry-pick <commit-id>：复制指定提交到当前分支；
        3. git reflog：查看所有操作记录；
    - 配置相关
        1. git config --global user.name "xxx"：设置全局用户名；
        2. git config --global user.email "xxx"：设置全局邮箱；
        3. git config --list：查看所有配置；

84. app中常提到的webview是什么？
    - webview是移动应用中用于内嵌网页内容的组件，可以理解为”迷你浏览器“，它允许app在不跳转外部浏览器的情况下，直接加载并显示网页，实现混合开发。
    - webview的本质：在原生app中渲染网页内容，实现部分功能的动态化更新；
        - 底层技术
            1. Android：基于系统的webview组件（早期是webkit、现为chromium）
            2. iOS：WKWebView（取代旧版UIWebView，性能更好）
    - 为什么App要用WebView？
        1. 动态化能力：无需发版即可更新页面内容；
        2. 跨平台复用：一套网页代码兼容Android/iOS，降低开发成本；
        3. 快速集成：嵌入第三方服务无需原生开发；
        4. 省流量：部分内容从服务器实时加载，减少安装包体积；
    - 常见应用场景
        1. 混合开发：核心功能利用原生代码。非核心页面用webview加载；
        2. 内置浏览器功能：app打开链接；
        3. 第三方服务嵌入：加载支付页面、广告、客服聊天窗口；
    - webview与原生开发的交互
        1. js调用原生功能
            - Android：通过@JavascriptInterface注解暴露方法；
            - iOS：通过WKScriptMessageHandler通信；
        2. 原生调用js
            - Android：webView.evaluteJavascript("jsFunction()", null);
            - iOS: webView.evaluteJavascript("jsFunction()") { result, error in };
    - 性能优化与安全
        1. 加速加载：预加载webview实例，缓存静态资源；
        2. 安全防护：禁用危险API，过滤非法URL跳转；
        3. 白屏处理：显式加载进度条或占位图；

85. head标签有什么作用，其中什么标签必不可少？
    - head标签是HTML文档的元数据容器，用于定义网页的配置信息、资源引用和基础设置，其内容不会直接显示在页面中，但对网页的运行和展示至关重要；
    - 主要作用
        1. 定义网页元信息：字符编码、视口设置、作者、描述等（供浏览器和搜索引擎使用）；
        2. 引入外部资源：css样式表、js脚本、字体、图标等；
        3. 控制页面行为：缓存策略、页面刷新/重定向、兼容性设置等；
    - 必不可少的标签
        1. <meta charset>：定义文档字符编码，避免乱码；
        2. <title>：设置网页标题（显示在浏览器标签页/搜索结果中）
        3. <meta name="viewport">：控制视口缩放，保证移动端正常显示；
    - 其他常用标签（非必须但重要）
        1. <meta name="description">：网页描述（SEO关键）
        2. <link ref="stylesheet">：引入外部css文件
        3. <script src="app.js">：引入js文件；
        4. <link rel="icon" href="favicon.ico">：设置网站图标
        5. <meta http-equiv="X-UA-Compatible">：指定IE使用最新内核；
    - 注意事项
        1. title缺失后果：浏览器默认显示文件名，seo权重降低；
        2. 字符编码必须在第一行：避免加载错误导致乱码；
        3. 移动端必须加视口标签：未设置viewport时，移动端会按桌面宽度缩放，影响用户体验；

86. 为什么浏览器要限制请求并发数量？
    - 浏览器限制请求并发数量（通常时每个域名6-8个并发连接，不同浏览器有差异）是为了在性能、公平和安全之间取得平衡；
    - 避免服务器过载
        1. 问题：如果允许无限并发请求，单个客户端可能瞬间向服务器发送大量请求，导致：（1）服务器资源被耗尽，影响其他用户访问；（2）小型网站可能直接被流量冲垮；
        2. 解决：通过限制并发数，均衡每个客户端的资源占用；
    - 优化网络资源分配
        1. TCP连接开销：每个http请求都需要建立TCP连接，浏览器复用连接但仍有限制；过多并发会导致TCP端口竞争和网络拥塞，反而降低整体速度；
        2. 浏览器渲染阻塞：页面渲染依赖某些关键资源，无限制并发可能导致关键资源被非关键阻塞；
    - 公平考虑
        1. 多标签页共享：同一浏览器的多个标签页可能访问同一域名，限制并发可以防止单个标签页垄断带宽；
        2. 多用户公平：确保服务器能同时服务更多用户，而非被少数高并发请求的客户端独占；
    - 协议限制（HTTP/1.1）
        1. HTTP/1.1的队头阻塞：同一域名下的请求必须按顺序完成，过多的并发连接并不能显著提升性能；浏览器通过多域名分片（static1.com、static2.com）绕过限制，但这需要额外配置；
    - 现代改进
        1. HTTP/2的多路复用：允许通过单个连接并行传输多个请求，彻底解决了队头阻塞，浏览器对同一域名的并发限制放宽；
        2. HTTP/3的QUIC协议：进一步优化多路复用和连接建立速度，减少并发限制的影响；
    - 安全防护
        1. 防止滥用：限制并发可降低恶意脚本快速消耗服务器资源的风险（爬虫、暴力请求）
        2. 缓解DDoS：虽然无法完全阻止，但增加了攻击成本；

87. iframe安全怎么理解？
    1. 主要安全风险
        - 点击劫持：恶意网站通过透明iframe覆盖在诱骗按钮上，诱导用户点击；
        - xss攻击：（1）iframe加载的第三方页面存在xss漏洞，可能通过postMessage或DOM操作攻击父页面；（2）恶意iframe通过name和id属性访问父窗口的敏感数据；
        - CSRF攻击：iframe偷偷发起请求，利用用户已登录的cookie权限；
        - 钓鱼攻击：内嵌伪造的登陆页面，窃取用户凭据；
        - 隐私泄漏：iframe可通过window.top.location探测用户是否登录特定网站；
    2. 防御措施
        - 限制iframe的加载行为；（X-Frame-Options：Deny）（Content-Security-Policy：frame-ancestors 'self' xxx.com;）
        - 沙箱隔离：限制iframe的权限；（iframe sandbox="allow-scripts allow-same-origin" />
            1. allow-scripts：允许执行脚本，但禁用弹窗等敏感操作；
            2. allow-same-origin：保持同源策略，避免数据泄漏；
        - 同源策略：iframe和域名和父页面不同时，禁止互相访问DOM和Cookies；
        - 安全通信：父页面与iframe通信时，严格验证来源；
        - CSP（内容安全策略）：限制资源加载（Content-Security-Policy）
        - 防钓鱼：视觉提示 - 为用户标记第三方iframe的边界；

88. 为什么推荐将静态资源放到CDN上？
    1. 全球加速访问：CDN通过全球分布的边缘节点缓存资源，用户从最近的节点获取数据，减少网络延迟；
    2. 减轻源服务器负载：静态资源由CDN处理，减少了源服务器的带宽、CPU和连接数压力；突发流量由CDN节点分散，避免源服务器崩溃；
    3. 提升可用性与容灾：某个CDN节点宕机，请求会自动路由到其它可用节点；CDN的分布式架构能吸收恶意流量，保护源服务器；
    4. 优化缓存和版本控制：CDN默认支持强缓存，减少重复下载；通过文件哈希实现长期缓存，内容更新后自动失效旧文件；
    5. 节省成本：CDN提供商的带宽单价通常低于自建服务器；无需自建全球服务器集群；
    6. 支持HTTP/2与HTTPS：HTTP/2能够多路复用；多数CDN提供一键HTTPS加密，保障数据传输安全；
    7. SEO优化：CDN加速能间接提升SEO表现；

89. vue3.0的tree shaking特性是什么？
    - tree shaking定义：基于ESModule的静态结构，通过构建工具在编译阶段识别并删除未被引用的代码；目的是消除“死代码”，尤其是大型库中未被使用的模块；
    - vue3如何实现tree shaking？
        1. 模块化架构设计
            - 按需导出：vue3将代码拆分为独立模块，而非单一全局对象；
            - 副作用标记：在package.json中明确标注无副作用的模块，帮助构建工具安全删除未使用的代码；
        2. 编译器优化：模板编译时，仅包含用到的功能（如未使用v-model则不打包相关逻辑）

90. Symbol有什么用处？
    - Symbol是一种唯一且不可变的基本数据类型（ES6引入），主要用于解决对象属性名冲突、模块私有成员、以及作为标识符使用。
    - 唯一属性值：symbol创建的键唯一，即使描述相同也不同；
    - 模拟私有属性：symbol键无法通过常规方式枚举，适合隐藏内部属性；（注意并非真正私有，可以通过Object.getOwnPropertySymbols()获取）；
    - 内置Symbol值（元编程）
        1. Symbol.iterator: 定义迭代器，使对象可被for...of遍历；
        2. Symbol.toStringTag：修改Object.prototype.toString()的返回值；
    - 全局Symbol注册表：通过Symbol.for(key)创建或获取全局Symbol，相同key返回同一个Symbol；
    - 防止属性覆盖：第三方库可通过Symbol键添加属性，避免与用户代码冲突；
    - 替代魔法字符串：用Symbol代替字符串常量，提升代码可维护性；

91. canvas和svg的区别？
    - canvas：基于像素，无DOM结构，命令式绘图，对像素进行操作，动态生成图像；
        1. 渲染机制
            - 通过js API直接操作像素；
            - 绘制后不保留图形信息；
            - 每次变化需要重绘整个画布；
            - 适合游戏、数据可视化等高频更新场景；
        2. 性能特点：大量图形优，频繁更新优，静态复杂图形中，缩放/变化差；
        3. 交互能力
            - 没有内置的图形事件处理；
            - 需要手动实现点击检测；
            - 适合不需要精细交互的场景；
    - svg：基于数学描述的矢量图，有DOM结构，声明式描述，对图形对象操作，xml文件格式；
        1. 渲染机制
            - 通过xml描述图形；
            - 保留完整的图形对象信息；
            - 可以单独操作和修改每个图形元素；
            - 适合需要交互和动态修改的图形；
        2. 性能特点：大量图形差，频繁更新中，静态复杂图形优，缩放/变化优；
        3. 交互能力
            - 每个图形元素都是DOM元素；
            - 支持标准DOM事件；
            - 适合需要丰富交互的场景；
    - 混合使用策略
        1. 使用svg作为ui层：按钮、控件等交互元素；静态图标和装饰元素；
        2. 使用canvas作为渲染层：动态背景效果；复杂的数据可视化；游戏主渲染区；


92. ts中泛型是什么？
    - 泛型是一种类型参数化的工具，它使得代码可以处理多种数据类型而不丢失类型安全性；
    - 基本使用
        1. 泛型函数
        ```ts
        function logAndReturn<T>(arg: T): T {
            return arg;
        }
        ```
        2. 泛型接口
        ```ts
        interface KeyValuePair<K,V> {
            key: K;
            value: V;
        }
        ```
        3. 泛型类
        ```ts
        class GenericNumber<T> {
            zeroValue: T;
            add: (x: T, y: T) => T;
        }
        ```
    - 泛型约束：需要限制泛型的类型范围，使用extends关键字
        1. 基本约束
        ```ts
        interface Lengthwise {
            length: number;
        }
        function loggingIndetify<T extends Lengthwise>(arg: T): T {
            console.log(arg.length);
            return arg;
        }
        ```
        2. 使用类型参数约束
        ```ts
        function getProperty<T, K extends keyof T>(obj: T, key: K) {
            return obj[key]
        }
        ```
    - 泛型工具类型
        1. Partial<T>: 将类型T的所有属性设置为可选；
        2. Readonly<T>：将类型T的所有属性设置为只读；
        3. Pick<T, K>：从类型T中选取部分属性K组成新类型；
        4. Record<K, T>：构造一个类型，其属性名为K，属性值为T；
    - 高级泛型应用
        1. 条件类型：type IsString<T> = T extends string ? true : false;
        2. 映射类型：type Optional<T> = { [p in keyof T]?: T[P] };
        3. 推断类型：type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;
    - 常见问题
        1. 泛型与any的区别：（1）any放弃了类型检查；（2）泛型保持了类型关联和类型安全；
        2. 运行时泛型：ts的泛型只在编译时存在，运行时会被擦除；不能使用typeof T这样的运行时操作；
        3. 默认泛型参数：可以为泛型参数指定默认类型；

93. 为什么部分请求中，参数需要使用encodeURIComponent进行转码？
    - 核心原因：URL语法规范；URL有严格的语法规范，某些字符在URL中有特殊含义；如果参数值包含这些字符而不编码，会导致URL解析错误；
        1. 保留字符：;,/?:@&=+$#这些字符在URL中有特殊功能；
        2. 非安全字符：空格，引号，尖括号等可能破化URL结构；
        3. 非ASCII字符：中文、日文等非英语字符串；
    - encodeURIComponent vs encoedURI
        1. encodeURIComponent：编码所有非字母数字字符；主要用于编码URI的查询参数部分；
        2. encodeURI：不编码属于URL合法字符的部分；编码整个URI，确保URI完整可用；
    - 安全注意事项
        1. 防御特殊字符注入：防止XSS攻击、防止SQL注入；
        2. 双重编码问题：避免重复编码；服务器应正确处理已编码参数；
        3. Content-Type一致性：application/x-www-urlencoded格式要求必须编码；JSON格式则不需要URL编码；

94. 如何中断Promise？
    - Promise本身一旦被创建就会立即执行，且无法从外部直接中断其执行；
    - 使用AbortController（现代推荐方式）：这是目前最标准的取消异步操作的方式；
    - 使用标志变量（简单方法）；
    - 使用第三方库：bluebird、axios取消令牌；
    - Promise.race竞速模式；
    - 注意事项
        1. 真正的中断：上述方法大多只是解决promise，而不会停止真正的异步操作（AbortController可以真正停止fetch）
        2. 资源清理：确保在“取消”时清理所有资源；
        3. 状态一致性：取消后应确保应用状态一致；
        4. 错误处理：正确处理取消导致的拒绝，与其他错误区分；
        5. React中的应用：在React组件中，常在useEffect清理函数中取消未完成的promise；

95. 说一说ts中的类以及特性？
    - 基本类定义
    ```ts
    class Person {
        name: string;
        constructor(name: string) {
            this.name = name;
        }
        greet(): string {
            return `hello, my name is ${this.name}`
        }
    }
    ```
    - 类的主要特性
    ```ts
    class Example {
        public publicProp: string;
        private privateProps: string;
        protected protectedProps: string;

        readonly PI = 3.14;

        get salary(): number {
            return PI * PI;
        }

        set salary(newSalary: number) {
            if (newSalary >= 0) {
                this._salary = newSalary;
            }
        }

        static VERSION = "1.0.0";
    }
    abstract class Animal {
        abstract makeSound(): void;
    }

    interface Loggable {
        log(): void;
    }
    class ConsoleLogger implements Loggable {
        log(): void {
            console.log("logging to console");
        }
    }
    class Snake extends Animal {}
    class GenericNumber<T> {
        zeroValue: T;
        add: (x: T, y: T) => T;
    }
    ```

96. 什么是点击穿透，怎么解决？
    - 点击穿透是指当前页面上有多个可交互元素重叠时，点击上层元素后，点击事件会“穿透”到下层元素的现象。这种现象通常发生在移动端web开发中，特别是使用触摸事件时；
        1. 弹出关闭后触发底层元素：关闭弹窗后，点击事件传递到了弹窗下方的按钮；
        2. 快速滑动列表时误触：滑动列表时不小心触发了列表项的点击事件；
        3. 动画过渡期间：元素移开时，点击事件仍然触发了被移开位置的元素；
    - 点击穿透的原因
        1. 移动端事件延迟：移动浏览器有300ms的点击延迟；
        2. 事件冒泡机制：浏览器事件传播分为捕获、目标和冒泡阶段；
        3. 元素隐藏/移除后事件仍然传播：当上层元素消失后，浏览器仍会将事件传递给下层元素；
        4. 触摸和点击顺序：touchstart - touchend - mousedown - mouseup - click
    - 解决方案
        1. 使用pointer-events: none;
        2. 阻止默认行为和冒泡；
        3. 使用fastclick库：消除移动端300ms延迟、减少穿透机会；
        4. 延迟隐藏上层元素；
        5. 使用touch事件替代click；
        6. 遮罩层拦截：为弹出添加透明层并绑定点击事件；
        7. 框架特定解决方案；

97. Promise中的值穿透是什么？
    - 值穿透是promise链式调用中的一个重要特性，它指的是当promise的处理器函数(then/catch/finally)没有返回明确值时，promise会自动将上游的值传递给下游；
    ```js
    Promise.resolve("value")
        .then() // 无回调
        .then(val => {
            console.log(val); // value
        })
    ```
    - 值穿透的几种情况
    ```js
    Promise.resolve(42)
        .then() // 无回调
        .then(v => v) // 42
    Promise.resolve(42)
        .then(() => {}) // 无返回值
        .then(v => v) // 42
    Promise.reject(new Error("错误"))
        .catch()
        .catch(err => console.log(err.message))
    Promise.resolve(1)
        .then(v => v + 1) // 2
        .then() // 穿透2
        .then(v => {
            throw new Error(v) // 抛出错误
        }).catch()
        .catch(err => console.log(err.message)) // 2
    ```
    - 值穿透的实现原理，Promise规范明确规定
        1. 如果onFulfilled/onRejected不是函数，则必须忽略它们；
        2. 忽略时，promise2的状态和值必须与promise1相同；
    - 值穿透的实际应用
        1. 条件性添加处理；
        2. 错误处理中间件；
        3. 链式默认值
    - 注意事项
        1. 与返回undefined的区别：
            - 无回调函数：值穿透；
            - 回调返回undefined：明确传递undefined； 
        2. 箭头函数的简写
        ```js
        .then(v => v) // 显式返回值
        .then(v => { v }) // 返回undefined
        ```
    - 与其他特性的关系
        1. Promise.resolve()的关系：值穿透本质是类似于自动调用Promise.resolve()包装前一个值
        2. async/await关系：在async函数中，return/await与值穿透类似；
        3. finally()：也有穿透特性，但它不修改值；
        ```js
        Promise.resolve(1)
            .finally(() => 2) // 忽略返回值
            .then(v => console.log(v)) // 1
        ```


98. documentFragment是什么？它有什么好处？
    - documentFragment是一个轻量级的文档对象，它表示一个没有父文档的文档片段。可以把它看作一个“虚拟DOM容器”，能够临时存储一组DOM节点；
    - 核心特性
        1. 不属于主DOM树：存在于内存中，不会直接渲染到页面上；
        2. 无父结点：是独立的、不与任何文档直接关联；
        3. 高性能操作：对它的操作不会触发页面重排或重绘；
    - 主要优势
        1. 功能优势
            - 减少重排/重绘：批量操作DOM时，使用DocumentFragment可以减少页面渲染次数；
            - 内存高效：比直接操作真实DOM更节省资源；
        2. 临时容器功能
            - 可以临时存储需要多次操作的DOM节点；
            - 避免创建多余的容器元素；
        3. 节点操作更灵活
            - 可以从文档中移除节点放入fragment，稍后再插入；
            - 适合需要暂时“摘除”DOM节点进行操作的场景；
    - 实际应用场景
        1. 大量DOM插入：需渲染长列表
        2. DOM节点重组：需要重新排序或分组节点时；
        3. 模板处理：在将模板插入真实DOM前进行预处理；
        4. 动画操作：准备一组动画元素后再统一插入；
    - 注意事项
        1. 不是真实DOM节点：没有parentNode，不能直接添加到DOM树；
        2. 插入时会“释放”子节点：将fragment插入DOM时，它的内容会被移动而非复制；
        3. 现代框架已内置优化：vue/react等框架已使用类似机制，手动操作DOM时才需要显式使用；

99. ajax的请求状态有哪几种？
    - 状态码
        1. 0（UNSENT）：请求未初始化，open()方法未调用；
        2. 1（OPENED）：open()方法已调用，但send()方法未调用；
        3. 2 （HEADERS_RECEIVED）：已接收响应头（send()已调用），响应状态行和头部已可用；
        4. 3（LOADING）：正在接收响应体，此时responseText包含部分数据；
        5. 4（DONE）：请求完成，整个请求过程已经结束。
    - 实际应用要点
        1. 最常用的状态为4（DONE），即请求完成：大多数情况下只需要处理这个状态；
        2. 状态3（LOADING）的用途
            - 监控大文件下载进度；
            - 实现流式数据处理；
            - 显示加载进度反馈；
        3. 现代替代方案：fetch api使用promise更简洁；
        4. 状态变化顺序：0  -> 1 -> 2 -> 3 -> 3 -> ... -> 3 -> 4
    - 注意事项
        1. 跨域请求时，某些状态可能无法获取完整信息；
        2. 状态3在不同浏览器中的实现可能略有差异；
        3. 使用xhr.addEventListener("readystatechange", fn)也是监听状态变化的有效方式；

100. js中什么是伪数组？如何转换成真数组？
    - 伪数组：具有数组特征但不是真正数组的对象，具有以下特征：
        1. 具有length属性
        2. 可以通过数字索引访问元素（obj[0]）
        3. 不具备数组方法（push、pop等）
    - 将伪数组转为真数组的方法
        1. Array.from()
        2. 扩展运算符...
        3. Array.prototype.slice.call()
        4. Array.apply(null, arrayLike)
    - 为什么需要转换？ 转换后可以使用数组的所有方法；

# Section 3

## JS 相关

1. js 中的设计模式
   - 单例模式（Singleton）
     1. 用途：确保一个类只有一个实例（如全局缓存、数据库连接池）
     2. 原理：通过闭包或静态属性缓存实例，阻止重复创建；
   - 工厂模式（Factory）
     1. 用途：封装对象逻辑，统一入口（根据条件生成不同 UI 组件）
     2. 原理：将 new 操作隔离到工厂函数中。
   - 建造者模式（Builder）
     1. 用途：分步构建复杂对象（如配置 HTTP 请求参数）
     2. 通过链式调用逐步设置属性
   - 原型模式（Prototype）
     1. 用途：通过克隆已有对象创建新对象（如性能优化场景）。
     2. 原理：利用 js 的原型继承（Object.create()）
   - 装饰器模式（Decorator）
     1. 用途：动态扩展对象功能（如添加日志、权限校验）
     2. 原理：用包装类增强原始对象，保持接口一致
   - 适配器模式（Adapter）
     1. 用途：转换接口不兼容的对象（如旧 API 适配新系统）
     2. 原理：包装旧接口、暴露新接口；
   - 代理模式（Proxy）
     1. 用途：控制对象访问（如缓存、验证、懒加载）
     2. 原理：通过代理对象拦截原始对象的操作。
   - 外观模式（Facede）
     1. 用途：简化复杂子系统调用（如封装第三方库）
     2. 原理：提供统一的高层接口；
   - 观察者模式（Observer）
     1. 用途：实现发布-订阅机制（如事件系统、数据响应式）
     2. 原理：主题维护观察者列表、状态变化时通知所有观察者。
   - 策略模式（Strategy）
     1. 用途：动态切换算法（如排序、支付方式选择）
     2. 原理：将算法封装为独立类、运行时替换。
   - 状态模式（State）
     1. 用途：管理对象转换（如订单状态流转）
     2. 原理：将状态封装为独立类，委托当前状态对象处理行为。
   - 迭代器模式（Iterator）
     1. 用途：统一遍历集合结构（如自定义数据结构的 for...of 支持）
     2. 原理：实现[Symbol.iterator]方法；
   - 中介者模式（Mediator）
     1. 用途：减少对象间直接耦合（如聊天室消息转发）
     2. 原理：通过中介者对象协调交互；
   - 备忘录模式（Memento）
     1. 用途：保存和恢复对象状态（如撤销操作）
     2. 原理：将状态存储在外部对象中；
   - 职责链模式（Chain of Responsibility）
     1. 用途：解耦请求发送者和处理者（如中间件管道）
     2. 原理：多个处理器链式调用，直到某个处理器处理请求；

2. 箭头函数和普通函数的区别？

   - 箭头函数比普通函数简洁
   - 箭头函数没有自己的 this：它只会在自己作用域的上一层继承 this，因此在定义时 this 就已经确定，无法改变；
   - call\apply\bind 等改变 this 指向的方法无法改变箭头函数中 this 的指向；
   - 箭头函数不能作为构造函数；
   - 箭头函数没有自己的 argument：箭头函数中访问的 argument 实际上是外层函数的 arguments 值；
   - 箭头函数没有 prototype
   - 箭头函数不能用作 Generator 函数，不能使用 yeild 关键字；

3. ES6 模块和 CommmonJS 模块有什么异同？

   - CommonJS 是对模块的浅拷贝，ES6Module 是对模块的引用，即 ES6Module 只存只读，无法改变其值，也就是指针指向不变，类似 const；
   - import 的接口是 read-only，不能修改其值，即不能修改其变量的指针指向，但可以改变变量内部指针指向，可以对 commonjs 重新赋值（改变指针指向）但对 es6module 赋值会编译报错；
   - CommonJs 和 ES6Module 都可以对引入的对象进行赋值，即对对象内部属性的值进行改变；

4. var、let、const 的区别

   - 块级作用域：let/const 具有、var 不具有；块级作用域解决了
     - 内层变量可能覆盖外层变量
     - 用来计数循环变量泄露为全局变量
   - 变量提升：var 可提升、let/const 不可以提升（声明前使用报错）
   - 全局属性：var 声明的变量为全局变量，但 let/const 不会；
   - 重复声明：var 允许重复声明，let/const 不允许；
   - 暂时性死区：let/const 声明前无法使用，var 声明的变量可以在声明前使用；
   - 初始值设置：var/let 声明可以不赋值，const 必须赋值；
   - 指针指向：let/var 允许改变指针指向，const 不允许改变指针指向；

5. new 操作符的实现原理

   - 创建一个空对象；
   - 设置原型，将对象的原型设置为函数的 prototype 对象；
   - 让函数的 this 指向这个对象，执行构造函数的代码（为对象添加属性）
   - 判断函数的返回值类型，如果是值类型，返回创建的对象，如果是引用类型，返回这个引用类型的对象；

   ```js
   function objectFactory() {
     let newObject = null;
     let constructor = Array.prototype.shift.call(arguments);
     let result = null;

     if (typeof constructor !== "function") {
       console.error("type error");
       return;
     }

     newObject = Object.create(constructor.prototype);
     result = constructor.apply(newObject, arguments);
     let flag =
       result && (typeof result === "object" || typeof result === "function");

     return flag ? result : newObject;
   }
   ```

6. for...in 和 for...of 的区别

   - for...of 遍历获取的是对象的键值，for...in 获取的是对象的键名；
   - for...in 会遍历整个对象的原型链，性能差不推荐使用，而 for...of 只遍历当前对象不会遍历原型链；
   - 对于数组的遍历，for...in 会返回数组所有可枚举的属性（包括原型链上可枚举的属性），for...of 只返回数组的下标对应的属性值；
   - 总结：for...in 循环主要是为了遍历对象而生，不适用于遍历数组，for...of 可以用来遍历数组、类数组对象、字符串、Set、Map 以及 Generator 对象；

7. 闭包：指有权访问另一个函数作用域中变量的函数，创建闭包的最常见方式就是在一个函数内创建另一个函数，创建的函数可以访问到当前函数的局部变量；

   - 闭包的第一个用途是使我们在函数外部能够访问到函数内部的变量。通过使用闭包，可以在外部调用闭包函数，从而在外部访问到函数内部的变量，可以使用这种方式来创建私有变量；
   - 闭包的另一个用途是使已经运行结束的函数上下文中的变量对象继续留在内存中，因为闭包函数保留了这个变量的引用，所以这个变量不会被回收。

8. call、apply 函数的区别

   1. apply 接受两个参数，第一个参数指定了函数体 this 对象的指向，第二参数为一个带下标的集合，这个集合可以是数组，也可以是类数组，apply 方法把这个集合中的元素作为参数传递给被调用的函数。
   2. call 传入的参数数量不固定，跟 apply 相同的是，第一个参数也是代表函数体内的 this 指向，从第二参数开始往后，每个参数依次被传入函数。

9. Promise.all 和 Promise.race 的区别和使用场景

   - Promise.all 可以将多个 Promise 实例包装成一个新的 Promise 实例。同时，成功和失败的返回值是不同的，成功的时候返回的是【结果数组】，失败返回的是【最先 reject 失败的值】；成功返回的结果数组顺序和传入顺序一致，但是执行顺序不一定按照顺序；当遇到需要发送多个请求，并根据请求顺序获取和使用数据的场景，可以使用 Promise.all 来解决；
   - Promise.race，接受多个参数，哪个结果最快获得，就返回相应的结果，不管结果本身是成功还是失败。应用于当要做一件事情，超过多长时间就不做了。

10. async/await 的理解

    - 本质上 Generator 的语法糖，它能实现的效果都能用 then 链来实现，它是为优化 then 链而开发的。
    - async 函数返回的是一个 Promise 对象（如果返回一个直接变量，async 会通过 Promise.resolve 包装成 Promise 对象）
    - 不能在最外层使用 await 语法，如果需要调用 async 函数，应使用.then 方法

11. 浏览器的垃圾回收机制

    - 概念：js 代码在运行时，需要分配内存空间来存储变量和值。当变量不再参与运行时，需要系统回收被占用的内存，这就是垃圾回收机制；
    - 回收机制
      - js 具有自动回收机制，会定期对那些不适用的变量、对象所占有的内存进行释放。
      - 全局变量持续到页面卸载，因此无法无法回收，局部变量在函数内声明，除闭包情况，默认在函数执行完成后会进行回收；
    - 垃圾回收方式
      - 标记清除
      - 计数引用

12. 造成内存泄漏的情况

    1. 意外的全局变量：使用未声明的变量，而意外创建全局变量，导致这个变量一致存在内存中无法被回收；
    2. 被遗忘的定时器或回调函数：设置 setInterval 定时器，如果忘记取消，且执行函数有对外部变量的引用，那么这个变量无法被回收；
    3. 脱离 DOM 的引用：获取一个 DOM 元素的引用，而后面这个元素被删除，由于一直保留这个元素引用，也无法被回收；
    4. 闭包：不合理使用闭包，从而导致某些变量一致存在内存中；

13. 函数柯里化（Curry Function）
    - 柯里化是一种模式，其中具有多个参数的函数被分解为多个函数，当被串联调用时，将一次一个地累积所有需要的参数，这种技术帮助编写函数式风格的代码，使代码更易读、紧凑、值得注意的是，对于需要被 curry 的函数，它需要从一个函数开始，然后分解成一系列函数，每个函数都需要一个参数。

# Vue相关
1. vue3对比vue2有了什么优化？
    - 性能提升
        1. 虚拟DOM重写
            - 优化Diff算法，静态节点标记，跳过静态子树对比；
            - 编译时生成更高效的渲染函数，减少运行时开销；
        2. SSR提速
            - 服务端渲染性能提升2-3倍；
        3. 更小的体积
            - tree-shaking支持：（1）按需引入API，未用模块不打包；（2）基础运行时仅10kb；
        4. 内存优化
            - proxy代替object.defineProperty：（1）响应式系统重构，消除vue2中数组/对象新增属性的响应式限制；
            - 内存占用减少（依赖收集更高效）
    - 组合式API
        1. 逻辑复用与组织
            - setup函数替代data、methods等选项，将相关逻辑集中管理；
            - 自定义hook提取复用逻辑，告别mixins的命名冲突问题；
        2. 更好的ts支持
            - 基于函数的api天然对类型推断友好，减少类型声明复杂度；
    - 新特性
        1. Fragments：单组件支持多根节点；
        2. Teleport：将组件渲染到DOM任意位置；
        3. Suspense：简化异步组件加载状态处理；

2. vue3.x各个版本推出的新功能有哪些？
    - vue3.0
        1. composition api: setup替代option api，支持逻辑复用；
        2. 性能优化：基于proxy的响应式系统、虚拟dom重写；
        3. tree shaking：按需引入api，减少打包体积；
        4. 新组件：fragment、teleport、suspense；
        5. ts支持：源码用ts重写、完整类型推断；
    - vue3.1
        1. script setup语法糖：简化composition api写法；
        2. v-bind支持css变量：在style标签中动态绑定值；
    - vue3.2
        1. 支持顶层await、泛型组件；
        2. 更简洁的defineProps、defineEmits；
        3. web components支持：defineCustomElement快速封装vue组件为原生自定义元素；
        4. 服务端渲染优化，v-memo指令缓存模板子树；
        5. 响应式系统减少不必要的触发；
    - vue3.3
        1. 泛型组件
        ```vue
        <script setup lang="ts" generic="T">
        const props = defineProps<{ data: T }>();
        </script>
        ```
        2. defineOptions: 在script setup中定义组件名等选项；
        3. defineModel：简化双向绑定逻辑；
        4. 响应式props解构：保持响应式的同时解构props；
    - vue3.4
        1. 模板解析速度提升：编译器优化、尤其是大型模板；
        2. v-bind同名缩写；
        3. 服务端渲染Hydration优化，减少客户端激活时间；
        4. 移除弃用api：@vnode-*生命周期钩子；

3. 详细说明vue的diff算法？
    - vue的diff算法是虚拟DOM实现高效更新的核心机制，它通过比较新旧虚拟DOM数的差异，计算出最小化的DOM操作，从而提升虚拟；
    - 虚拟DOM：是真实DOM的轻量级js结构表示，当应用状态变化时，vue会先生成新的虚拟DOM树，然后通过diff算法比较新旧虚拟DOM树的差异，最后只将必要的更新应用到真实DOM上；
    - diff算法的核心目标
        1. 比较新旧虚拟DOM的差异；
        2. 找出最小化的DOM操作；
        3. 尽可能复用现有DOM节点；
    - diff算法的流程
        1. 同级比较：vue的diff算法只会比较同一层级的节点，不跨层级比较。如果发现节点不同，会直接销毁旧节点并创建新节点；
        2. 节点比较：如果确定两个节点是相同节点时，会进入patchVNode过程
            1. 静态节点检查：如果是静态节点，则跳过；
            2. 文本节点更新：如果是文本节点且内容不同，更新文本内容；
            3. 子节点比较
                - 新节点有子节点，旧节点没有 -> 添加新子节点；
                - 旧节点有子节点，新节点没有 -> 删除旧子节点；
                - 两者都有子节点 -> 进入updateChildren过程；
        3. 子节点列表比较（updateChildren）：采用“双端比较”策略；
        ```js
        function updateChildren(parentEl, oldCh, newCh) {
            let oldStartIdx = 0;
            let newStartIdx = 0;
            let oldEndIdx = oldCh.length - 1;
            let newEndIdx = newCh.length - 1;
            let oldStartVnode = oldCh[0];
            let oldEndVnode = oldCh[oldStartIdx];
            let newStartVnode = newCh[0];
            let newEndVnode = newCh[newEndIdx];

            while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
                // 4中比较情况
                if (sameVnode(oldStartVnode, newStartVnode)) {
                    // 情况1，头头相同
                    pathVNode(oldStartVnode, newStartVnode);
                    oldStartVnode = oldCh[++oldStartIdx];
                    newStartVnode = newCh[++newStartIdx];
                } else if (sameVnode(oldEndVnode, newEndVnode)) {
                    // 情况2，尾尾相同
                    pathVNode(oldEndVnode, newEndVnode);
                    oldEndVnode = oldCh[--oldEndIdx];
                    newEndVnode = newCh[--newEndIdx];
                } else if (sameVnode(oldStartVnode, newEndVnode)) {
                    // 情况3：旧头新尾相同
                    pathVNode(oldStartVnode, newEndVnode);
                    // 将旧头节点移动到末尾
                    parentElm.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling);
                    oldStartVnode = oldCh[++oldStartIdx];
                    newEndVnode = newCh[--newEndIdx];
                } else if (sameVnode(oldEndVnode, newStartVnode)) {
                    // 情况4：旧尾新头相同
                    pathVNode(oldEndVnode, newStartVnode);
                    // 将旧尾节点移动到开头
                    parentElm.insertBefore(oldEndVnode.el, oldStartVnode.el);
                    oldEndVnode = oldCh[--oldEndIdx];
                    newStartVnode = newCh[++newStartIdx];
                } else {
                    // 以上都不匹配时使用key映射查找
                    const idxInOld = findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);
                    if (idxInOld) {
                        // 找到可复用节点
                        const vnodeToMove = oldCh[idxInOld];
                        patchVnode(vnodeToMove, newStartVnode);
                        parentElm.inserBefore(vnodeToMove.elm, oldStartVnode.elm);
                        oldCh[idxInOld] = undefined; // 标记以处理
                    } else {
                        // 没找到，创建新节点
                        createElm(newStartVnode, parentElm, oldStartVnode.elm)
                    }
                    newStartVnode = newCh[++newStartIdx]
                }
            }
            // 处理剩余节点
            if (oldStartIdx > oldEndIdx) {
                // 旧节点先遍历，添加剩余新节点
                addVnodes(parentElm, newCh, newStartIdx, newEndIdx);
            } else if (newStartIdx > newEndIdx) {
                // 新节点先遍历，删除剩余旧节点
                removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
            }
        }
        ```
        4. key的作用：识别节点的重要标识，帮助diff算法更高效识别哪些节点可以复用
            - 无key情况：采用就地更新策略，可能导致状态错乱；
            - 有key情况：可以精确跟踪每个节点，实现最大程度的节点复用；
        5. diff算法的优化策略
            - 同层比较：只比较同一层级的节点，时间复杂度n^3 -> n;
            - 双端比较：同时从列表头尾开始比较，减少移动操作；
            - key优化：通过key快速定位可复用节点；
            - 静态节点跳过：标记静态节点，在diff时直接跳过；
            - 异步更新：将多个数据变化合并为一次更新；

4. vue的双向数据绑定是怎么实现的？
    - 主要通过数据劫持和发布订阅模式实现；
    - 数据劫持
        1. vue2.x使用Object.defineProperty()
        ```js
        function defineReactive(obj, key, val) {
            // 递归处理嵌套对象
            observe(val);
            const dep = new Dep(); // 每个属性都有自己的依赖管理器
            Object.defineProperty(obj, key, {
                get() {
                    if (Dep.target) {  // 如果有watcher正在读取这个属性
                        dep.depend(); // 添加依赖
                    }
                    return val;
                },
                set(newVal) {
                    if (newVal === val) return;
                    val = newVal;
                    observe(newVal); // 新值是对象时继续劫持
                    dep.notify(); // 通知所有依赖进行更新
                }
            })
        }
        ```
        2. vue3.x使用Proxy实现
        ```js
        function reactive(obj) {
            return new Proxy(obj, {
                get(target, key, receiver) {
                    const res = Reflect.get(target, key, receiver);
                    track(target, key) // 收集依赖
                    return typeof res === 'object' ? reactive(res) : res; // 深层代理
                },
                set(target, key, value, receiver) {
                    const res = Reflect.set(target, key, value, receiver);
                    trigger(target, key) // 触发依赖
                    return res;
                }
            })
        }
        ```
    - 依赖收集系统：vue使用发布订阅模式管理依赖
    ```js
    class Dep {
        constructor() {
            this.subscribers = []
        }
        depend() {
            if (Dep.target && !this.subscribers.includes(Dep.target)) {
                this.subscribers.push(Dep.target)
            }
        }
        notify() {
            this.subscribers.forEach(sub => sub.update())
        }
    }
    Dep.target = null // 全局变量，指向当前正在计算的watcher
    class Watcher {
        constructor(vm, exp, cb) {
            this.vm = vm
            this.getter = parsePath(exp)
            this.cb = cb
            this.value = this.get()
        }
        get() {
            Dep.target = this
            const value = this.getter.call(this.vm, this.vm)
            Dep.target = null
            return value
        }
        update() {
            const oldValue = this.value
            this.value = this.get()
            this.cb.call(this.vm, this.value, oldValue);
        }
    }
    ```
    - 双向绑定的完整流程：以v-model指令为例，双向绑定实现流程如下：
        1. 模板编译阶段
            - 解析模板v-model指令
            - 为元素添加input事件监听器
            - 创建对应的wachter
        2. 初始化阶段
            - 对data进行响应式处理
            - 为v-model绑定的属性创建wacther
            - 执行首次渲染，将数据显示在界面上
        3. 数据 -> 视图更新
            - 数据变化时，触发setter
            - setter调用dep.notify()
            - watcher执行update方法
            - 最终更新DOM
        4. 视图 -> 数据更新
            - 用户输入触发input事件
            - 事件处理函数修改对应的data属性
            - 数据变化又触发新一轮的视图更新

5. vue中子父组件间通信的方法有哪些？
    - props  & $emit
    - $parent & $children (不推荐)
    - 依赖注入 provide/inject
    - 事件总线 EventBus
    - Vuex状态管理
    - 最佳实践
        1. 优先使用props/events：简单场景下保持数据流清晰；
        2. 避免直接修改props：遵循单向数据流原则，子组件应通过事件通知父组件修改；
        3. 大型项目使用vuex/pinia：当组件通信复杂时，引入状态管理；
        4. 谨慎使用$parent/$children：会使组件耦合度高，难以维护；
        5. 及时清理事件监听：使用事件总线时，记得在组件销毁前移除监听；

6. vue3的composition api 和 option api有什么区别，优势在哪里？
    - 代码组织方式
        1. options api：按照选项类型组织代码（data、methods等）
        2. composition api：按逻辑功能组织代码；
    - 逻辑复用机制
        1. options api：使用mixins服用逻辑（容易命名冲突、来源不清晰）；
        2. composition api：通过自定义hook函数复用逻辑；
    - 核心优势
        1. 更好的代码组织
            - 相关逻辑集中：将同一功能的data、methods、computed等放在一起；
            - 更自然的代码结构：类似普通js函数的组织方式；
            - 更易提取复用逻辑：天然支持将相关功能提取为独立函数；
        2. 更强的类型推导（ts支）
            - options api：类型推导有限，特别是this上下文；
            - composition api：完美支持ts，提供更好的类型检查和ide支持；
        3. 更灵活的逻辑复用
            - 无命名冲突：自定义hook返回的值可以任意命名；
            - 明确依赖关系：所有依赖都是显式导入的；
            - 组合式复用：可以自由组合多个hook函数；
        4. 更好的作用域控制
            - 局部状态：可以在setup函数内创建局部状态；
            - 明确依赖注入：通过provide/inject更清晰管理依赖；
    - 性能对比
        1. 运行时性能：无差异；
        2. 代码压缩效果：options稍差，composition api更优；
        3. tree-shaking支持：options 有限，composition api更优；

7. vue3中的ref和reactive有什么区别？
    - ref：用于创建基本类型/对象类型的响应式代理；（1）返回一个响应式且可变的ref对象；（2）通过.value属性访问和修改值；（3）适用于基本类型和需要替换整个对象的场景；
        1. ref在模板使用和reactive使用时，会自动解包，不再使用.value；
        2. ref通过包装RefImpl对象实现响应式，基于对.value属性的get/set方法进行依赖收集（track）和触发更新（trigger）；
        3. 推荐使用场景
            - 基本数据类型
            - 需要重新分配引用的对象
            - 需要明确区分响应式变量和普通变量时
            - 需要将值传递到组合函数中时
        4. 常见问题
            - 浅层ref（避免不必要的深度响应式转换）：shallowRef(obj);
    - reactive：用于创建对象类型的响应式代理；（1）返回原始对象的响应式代理；（2）直接访问和修改属性，不需要.value；（3）适用于复杂对象或嵌套数据结构；
        1. 使用Proxy代理整个对象；嵌套对象也会被自动代理；
        2. 推荐使用场景
            - 复杂的嵌套对象/数组
            - 不需要重新分配引用对象
            - 需要直接访问属性的场景
            - 表单状态管理等复杂状态对象
        3. 常见问题
            - 解构丢失响应性：通过toRefs(state)保持响应式；
            - 浅层reactive：shallowReactive(obj);


8. vue3中的<script setup></script>是什么，作用是什么？
    - <script setup></script>是vue3引入的编译时语法糖，用于简化composition api的使用，提供更简洁的组件编写方式；
    - 所有在<script setup></script>顶层声明的变量、函数和import导入内容都会自动暴露给模板；
    - 无需手动从setup()函数返回；
    - 减少样板代码
    - 更接近普通的js编写体验；
    - 天然支持类型推导；
    - 不需要额外的类型声明；
    - 导入的组件自动在模板中可用，无需在components选项中注册；
    - props定义使用defineProps编译器宏；
    - 自定义事件使用defineEmits编译器宏；
    - 使用defineExpose暴露组件公共方法；
    - 支持与普通<script></script>共存；
    - 注意事项
        1. 顶层作用域：只能在<script setup></script>的顶层使用await
        2. 没有this：无法访问组件实例
        3. css注入：使用useCssModule访问css模块
        4. 名称冲突：避免变量名与组件名冲突
        5. 工具链要求：需要vue3.2+和配套的构建工具支持；

9. vue3的teleport是什么？在什么场景下会用到？
    - teleport是vue3内置的一个组件，允许将组件的模板部分“传送”到DOM中其他位置，而保持组件逻辑上的父子关系不变；
    - 核心特性
        1. 逻辑位置与渲染位置分离：（1）组件在逻辑上保持原有位置；（2）内容被渲染到指定dom位置；
        2. 保持响应性：（1）传送的内容保持完全的vue响应式特性；（2）数据绑定和事件监听正常工作；
        3. 条件性传送：可以通过v-if/v-show控制传送；
        4. 多传送目标：可以同时传送多个内容到同一目标；
    - 典型使用场景
        1. 模态框（modal）：模态框通常需要放在body末尾以避免z-index和overflow问题，但在组件结构中可能深藏在多层嵌套中。
        2. 通知/Toast提示：停止需要显示在页面顶层，不受父组件样式影响；
        3. 全屏加载指示器：加载状态需要覆盖视口，不受父容器限制；
        4. 复杂布局中的固定元素：在某些复杂布局中，某些元素需要突破布局限制；
    - 实现原理
        1. 编译阶段：vue编译器识别<teleport />组件，生成特殊的渲染函数代码；
        2. 运行时：在虚拟DOM层保持组件关系，在实际DOM渲染时插入到目标位置；
        3. 更新机制：内容变化只更新传送到部分，保持响应式系统的完整性；
    - 注意事项
        1. 目标元素必须存在：确保传送目标在DOM中存在，可以在mounted生命周期后动态创建目标；
        2. SSR兼容性：在服务端渲染时需要特殊处理，客户端激活时确保目标匹配；
        3. 性能要求：避免过度使用，特别是频繁切换的传送内容；对于静态内容，提前创建目标容器；
        4. 无障碍访问：确保传送后的内容可在访问树中的正确位置；管理焦点顺序；

10. vue3中如何使用provide/inject实现依赖注入，它们的作用是什么？
    - provide/reject是vue提供的依赖注入机制，主要用于解决跨层级组件通信问题，特别适合以下场景
        1. 深层嵌套组件传值：避免逐层传递props；
        2. 共享全局配置：如主题、国际化、用户权限；
        3. 插件/组件库开发：提供可以被用户组件使用的上下文；
        4. 解耦父子组件：祖先组件无需知道哪些后代组件使用了它提供的数据；
    - 提供数据
    ```js
    export default {
        provide: {
            siteName: "my vue app"
        },
        // 或使用函数形式提供组件实例属性
        provide() {
            return {
                siteName: this.siteName,
                currentUser: this.user,
            }
        }
    }
    ```
    ```vue
    <script setup>
    import { provide, ref } from 'vue'
    const count = ref(0);
    const user = ref({ name: "alice "})

    provide("siteName", "my vue app")
    provide("count", count);
    provide("increment", () => count.value++);
    </script>
    ```
    - 注入数据：在后代组件中使用inject获取数据
    ```js
    export default {
        inject: ['siteName'],
        // 带默认值
        inject: {
            siteName: {
                from: "siteName",
                default: "default app name"
            },
            user: {
                from: "currentUser",
                default: () => ({ name: "alice" })
            }
        }
    }
    ```
    ```vue
    <script setup>
    import { inject } from 'vue';
    const siteName = inject("siteName");
    const user = inject("currentUser", { name: "Guest" })
    const count = inject("count")
    const increment = inject("increment")
    </script>
    ```
    - 高级用法及最佳实践
        1. 保持响应性：当提供响应式数据时，注入的组件也会保持响应式连接；
        2. 使用Symbol作为键名：为避免命名冲突，建议使用symbol作为provide的键名；
        3. 封装为组合式函数：将provide/inject逻辑封装为可复用的组合式函数；
        4. 类型安全：使用ts时，可以为注入的值提供类型定义；
    - 注意事项
        1. 避免滥用：不应作为props的替代品，只用于真正需要跨多层级的场景；
        2. 响应性丢失：如果提供普通对象而非ref/reactive，注入的组件将无法检测变化；
        3. 命名冲突：字符串键名可能导致冲突，建议使用symbol；
        4. 测试难度：注入的组件更难独立测试，可能需要模拟provide；
        5. 文档要求：团队项目应明确记录提供了哪些可注入值；

11. vue3中，toRef、toRefs、toRaw、watch、wacthEffect等api的作用是什么？
    - toRef：为响应式对象的某个属性创建一个ref引用，保持对该属性的响应式连接；作用于：（1）需要将props的某个属性作为ref传递；（2）解构响应式对象时保持单个属性的响应性；
    - toRefs: 将响应式对象转换为普通对象，其中每个属性都指向原始对象相应属性的ref；作用于：（1）解构响应式对象时保持所有属性的响应性；（2）从组合函数返回响应式对象时；
    - toRaw：返回vue创建的响应式代理对象的原始对象；适用于：（1）需要操作原始对象而不触发响应式更新；（2）性能优化（避免不必要的响应式开销）；（3）与第三方库集成时需要传递非代理对象；
    - watch：侦听特定数据源，并在其变化时执行回调函数；特点是：（1）惰性执行（仅在侦听源变化时执行）；（2）可以获取变化前后的值；（3）可以明确指定侦听源；
    - watchEffect：立即执行传入的函数，并自动追踪其依赖，依赖变化时重新执行；特点是：（1）立即执行；（2）自动收集依赖；（3）无法获取变化前的值；

12. vue2中的filter的作用，为什么在vue3中移除filter，它的缺点是什么？
    - filter的作用：主要用于文本格式化，可以在模板中对数据进行简单的转换处理；
    ```html
    <div>{{ date | dateFormat }}</div>
    <div :id="rawId | formatId"></div>
    <div>{{ message | filterA | filterB }}</div>
    <div>{{ message | filterA('arg1', 'arg2') }}</div>
    ```
    - vue3移除filter的原因
        1. 功能重复：filter的功能完全可以被计算属性或方法替代；
        2. 增加复杂性：filter语法增加了模板的复杂性和学习成本；
        3. 功能考虑：filter在每次重新渲染时都会执行，不如计算属性高效；
        4. 与js习惯不一致：管道式语法在js中并不常见；
        5. 类型支持问题：在ts中，filter的类型推导不够友好；
    - filter的缺点
        1. 调试困难：filter在模板中使用，难以调试和测试；
        2. 全局注册问题：全局注册的filter会增加应用体积，即使某些组件并不使用；
        3. 可重用性有限：无法在组件逻辑中复用filter，只能在模板中使用；
        4. 性能问题：每次重新渲染都会执行filter，没有缓存机制；
        5. 组合性差：复杂的转换逻辑需要串联多个filter，代码可读性下降；
    - vue3中的替代方案
        1. 计算属性
        2. 方法调用
        3. 全局方法：通过app.config.globalProperties注册全局方法；
        4. 组合式函数


13. vue的style上加scoped属性的原理？
    - 在vue的单文件组件中，给<style />标签添加scoped属性时，vue会实现组件样式的作用域隔离，确保样式只作用于当前组件。
    - 核心实现机制
        1. HTML属性标记
            - vue会为当前组件的所有DOM元素添加一个唯一的属性标识；
            - 这个哈希值基于组件文件路径和内容生成；
        2. css转换
            - 编译时，postcss会重写所有css选择器，附加属性选择器；
            - 例如.button会被转换为.button[data-v-xxxxx]；
        3. 最终效果
            - 转换后的css只会作用于带有相同data-v-*属性的元素；
            - 这样就实现了样式的作用域隔离；
    - 深度选择器：如果需要影响子组件样式，可以使用::v-deep、>>>或/deep/；
    - 注意事项
        1. 性能影响
            - 属性选择器比类选择器稍慢，但现代浏览器差异很小；
            - 大量使用scoped会增加css文件大小；
        2. 全局样式
            - 使用不带scoped的style可以定义全局样式；
            - 或者使用:global()包裹选择器
        3. 动态内容
            - 通过v-html动态添加的内容不会自动获得data-v-*属性；
            - 需要手动处理或使用全局样式；
    - 实现细节：在底层，vue-loader使用postcss的postcss-modules-scope插件来实现这一功能，主要步骤：
        1. 为每个组件生成唯一ID；
        2. 解析css选择器；
        3. 转换选择器并添加属性限制；
        4. 处理特殊选择器（如::v-deep）；

# React 相关

1. JSX
    - js 的扩展语法，允许编写类似 HTML 的代码；可以被编译为常规的 js 函数调用（React.createElement(tag, options)）; React 认为渲染逻辑本质上与其他 UI 逻辑内在耦合，React 没有采用将标记与逻辑分离到不同文件这种人为的分离方式，而是通过将二者共同存放在称之为“组件”的松散耦合单元之中，来实现关注点分离。

2. react 的生命周期：MOUNTING、RECEIVE_PROPS、UNMOUNTING

   - 组件挂载时（状态初始化、读取初始 state 和 props 以及两个生命周期方法，只会在初始化时运行一次）
     - componentWillMount：render 之前调用（在此调用 setState 不会触发 re-render 而是进行 state 合并）
     - componentDidMount: render 之后调用
   - 组件更新时（指组件自身 state 变化或父组件传递给组件的 props 变化引起的一系列动作）
     - 组件自身 state 更新时，依次执行
       - shouldComponentUpdate
       - componentWillUpdate
       - render
       - componentDidUpdate
     - 父组件更新 props 而更新
       - componentWillReceiveProps
       - shouldComponentUpdate
       - componentWillUpdate
       - render
       - componentDidUpdate
   - 组件卸载时（一般在此处清除组件副作用）
     - componentWillUnmount
   - 新版增加了 getDerivedStateFromProps，这个生命周期就是将传入的 props 映射到 state 中。16.4 后，这个函数每次会在 re-render 之前调用，作用是：
     - 无条件的根据 props 来更新内部 state，也就是只要有传入 props 值，就更新 state；
     - 只有 props 值和 state 值不同时才更新 state 值；

3. React 的事件机制和原生 DOM 事件流有什么区别？

   - react 的事件是绑定到 document 上的，而原生的事件是绑定到 dom 上的，因此相对绑定的地方来说，dom 上的事件要优先于 document 上的事件执行；
   - react17 及之前：事件委托在 document 上，所有 react 事件需要冒泡到 document 才被处理；如果页面存在多个 react 版本，事件可能冲突；
   - react18 之后（使用 createRoot）事件委托绑定到 root 容器节点。事件仅在当前 react 树的范围内冒泡，隔离性更好；支持并发渲染，避免潜在的事件拦截问题；
   - 设计原因：
     1. 避免多个 react 版本的事件在 document 层冲突（如微前端场景）
     2. 并发渲染兼容性：事件系统与并发模式（Concurrent Mode）深度集成，root 节点作为边界可控；
     3. 性能优化：减少全局 document 的事件监听，按需绑定到 root 节点；

4. React 函数组件和类组件的区别

   1. 语法和定义方式
      - 函数组件：接受 props 返回 jsx
      - 类组件：ES6，继承 React.Component，必须实现 render 方法返回 jsx；
   2. 状态管理
      - 函数组件：useState/useReducer
      - 类组件：this.state 和 this.setState
   3. 生命周期方法：
      - 函数组件：useEffect 模拟生命周期
      - 类组件：componentWillMount、componentDidMount、componentWillUpdate 等；
   4. this 绑定问题
      - 函数组件：无 this、直接访问 state/props
      - 类组件：需要手动绑定 this 或在构造函数使用箭头函数
   5. 性能优化：
      - 函数组件：useMemo\useCallback\memo 等
      - 类组件：shouldComponentUpdate 或继承 PureComponent（只浅比较props）
   6. Hooks 的独占性：
      - 函数组件：可以使用 useState\useEffect\useContext 等；
      - 类组件：无法使用 hooks，只能通过生命周期和类方法实现逻辑；

5. setState 是同步还是异步？

   1. 合成事件与生命周期：在 react 合成事件与生命周期函数中，setState 表现为异步。多次调用会合并更新，并会在未来的某个时机批量处理，不会立即反映到状态中。
   2. 原生事件与定时器：在原生事件和定时器中执行 setState，表现是同步的，执行 setState 后会立即更新状态并触发组件重新渲染；
   3. 异步操作的本质：setState 的异步性并非指内部实现是异步的，而是由于调用顺序和更新机制导致在合成事件和钩子函数中无法立即获取更新后的值。
   4. 确保最新数据：若需要在 setState 完成后执行某函数并使用最新状态，可利用其回调函数。该回调函数在状态更新且组件重新渲染后被调用。
   5. setState 的同步异步性取决于其使用环境和方式。

6. 什么是 fiber，fiber 解决了什么问题？
   由于 15 及之前版本的 StackReconciler 方案由于递归不可中断，如果 diff 时间过长，会造成页面的 UI 无响应的表现，vdom 无法应用到 dom 中。为了解决这个问题，16 版本实现了新的基于 requestIdleCallback 的调度器（react 团队自己 polyfill 了），通过任务优先级的思想，在高优先级任务进入的时候，中断 reconciler。为了适配新的调度器，推出了 FiberReconciler，将原来的树形结构（Vdom）转换为了 Fiber 链表的形式（child/sibling/return），整个 Fiber 的遍历基于循环而非递归，随时可中断。

7. React 组件中的传值方式？

   1. 父传子：props；
   2. 子传父：回调函数；
   3. 跨多层组件：Context/状态管理库；

8. react 中 props 和 state 有什么区别？

   1. props 是传递给组件的（类似函数的形参），而 state 是组件内部组件管理的；
   2. props 不可修改，所有 react 组件都必须像纯函数一样保护它们的 props 不被改变；由于 props 是传入不被改变的，因此将任何仅使用 props 的组件视为 PureComponent，也就是相同的输入下，呈现相同的输出。state 是组件创建的，state 是多变的、可修改的，每次 setState 都是异步更新；

9. react 中 refs 的作用是什么？
   Refs 是 react 提供的安全访问 DOM 元素或者某个组件实例的句柄；

10. React Diff 原理

    1. 把树形结构按照层级分解，只比较同级元素；
    2. 列表结构的每个单元添加唯一的 key，方便比较；
    3. React 只会匹配相同 class 的 component
    4. 合并操作，调用 component 的 setState 方法的时候，React 将其标记为 dirty 到每一个事件循环结束，React 会检查所有标记 dirty 的 component 重新渲染；
    5. 选择性子树渲染。开发人员可以重写 shouldComponentUpdate 控制 diff 性能；

11. 受控组件和非受控组件有什么区别？

    1. 受控组件：数据由 state 驱动，通过 onChange 实时处理，适用于表单复杂需要实时联动校验等场景；
    2. 非受控组件：数据由 DOM 节点管理，需通过 ref 获取，适用于简单表单、文件上传、第三方库集成；
    3. 常见问题：
       1. 为什么文件输入必须是非受控？文件输入是只读的（浏览器限制）无法通过 value 属性控制，必须用 ref 获取文件对象；
       2. 如何让非受控组件支持默认值？使用 defaultValue/defaultChecked
       3. 受控组件性能优化？对高频输入（如实时搜索，使用防抖或避免在 onChange 中执行昂贵操作。

12. 为什么虚拟 DOM 会提高性能？
    虚拟 DOM 相当于在 js 和真实 DOM 中间加了一个缓存，利用 DOM Diff 算法避免了没有必要的 DOM 操作，从而提高性能；

13. React 中 forwardRef 的作用及其应用场景？

    1. 作用：
       1. 打破函数组件的 ref 限制：默认情况下函数组件不能直接接收 ref（因为函数组件没有实例）。forwardRef 允许父组件通过 ref 访问子组件内部的 DOM 节点或自定义值；
       2. 透传 ref 到子组件的特定元素：将父组件传递的 ref 转发到子组件内部的某个 DOM 节点（如 input、div）或类组件实例。
    2. 应用场景：
       1. 访问子组件的 DOM 节点：当父组件需要操作子组件的 DOM 元素（如 focus）
       2. 封装第三方组件库：当封装一个需要暴露内部 DOM 的第三方组件（如自定义 Button 组件需要支持 ref）
       3. 高阶组件（HOC）中转发 ref：在 HOC 中保留原始组件的 ref 引用；
       4. 暴露子组件的自定义方法：通过 useImperativeHandle 配合 forwardRef 暴露子组件的特定方法（而非整个 DOM）
    3. 为什么需要 forwardRef
       1. 函数组件无实例：函数组件没有 this，默认无法通过 ref 获取实例或 DOM；
       2. ref 不是普通 prop：ref 是 React 的保留属性，不通过 props 传递，必须显式转发；
       3. 组件封装性：避免父组件直接操作子组件的内部实现，而是通过 forwardRef 按需暴露特定接口。

14. 什么是合成事件？（React 对浏览器原生事件的封装）

    1. 目的：合成事件是 react 模拟 DOM 事件的一个事件对象，旨在提供一个跨浏览器的事件接口。使得开发者能够通过统一的方式完成对不同浏览器事件的处理；
    2. 特性：合成事件拥有与浏览器原生事件相似的 API，如 stopProppagation 和 preventDefault 方法，并增加了如 nativeEvent 属性等。在 React 中，所有事件都是合成的，而非原生 DOM 事件，但可以通过 e.nativeEvent 属性获取原生事件。
    3. 工作原理：React 采用顶层事件代理机制，保证冒泡一致性，并引入事件池避免频繁创建和销毁事件对象，提高性能。事件不是直接挂载到 jsx 定义的 DOM 节点上，而是通过事件代理挂载到某个祖先节点上。
    4. 16.x 及以前的合成事件：事件委托到 document、部分事件会绑定在当前元素、存在 react 事件和原生事件的映射关系，比如 onMouseLeave 会映射到原生的 mouseout 事件、事件池机制；
    5. 17 后的合成事件：事件委托到 root、react capture 阶段的合成事件提前到原生事件 capture 阶段执行、移除事件池机制、事件具有优先级；

15. react v18 有几种渲染模式？

    1. 传统的同步渲染模式（LegacyMode）：开发者可以通过使用不同的 API（createRoot 或 render）来选择不同的渲染模式；
    2. 并发渲染模式（ConcurentMode）：并发渲染模式通过 Fiber 架构将渲染拆分为多个可中断和可恢复的小任务，并根据优先级进行调度，从而提高渲染效率和用户体验。

16. 什么是高阶组件 hoc？

    1. 定义：react 中用于组件复用和逻辑抽象的设计模式。它是一个函数，接收一个组件作为参数，并返回一个新的组件。
    2. 功能：
       1. 复用逻辑：高阶组件允许开发者在不改变原始组件的情况下，通过封装公共逻辑或者状态，使得多个组件能够共享这些功能，避免编写重复代码，提高开发效率；
       2. 功能增强：高阶组件可以在不修改原始组件的前提下，为其添加新的功能或特性，例如数据获取、权限校验等；
       3. 逻辑抽象：高阶组件可以将复杂的逻辑抽象起来，使得原始组件更加简洁和专注，有助于提高代码可维护性和可读性。
    3. 实际应用场景：
       1. 数据请求：创建一个高阶组件用来处理数据加载功能，可以在多个组件中复用这一逻辑；
       2. 权限控制：通过高阶组件对组件进行权限控制，只有满足特定权限的用户才可以访问某些功能；
       3. 日志记录：创建一个高阶组件来记录组件的渲染信息，帮助调试和监控。

17. 错误边界组件的作用是什么？
    0. 错误边界组件可以捕获并打印发生在其子组件树任何位置的 js 错误，并且它会渲染出备用 UI，而不是渲染那些崩溃了的子组件树。
    1. 可以捕获子组件的错误，自身的错误捕获不到。 
    2. 子组件的异步方法错误捕获不到。 
    3. 通过定义 getDerivedStateFromError 和 componentDidCatch 生命周期，当子组件树发生错误时，getDerivedStateFromError 方法会被调用，并返回一个新的状态对象，用于确定各组件的状态。同时 componentDidCatch 方法会被调用，并接收错误对象和错误信息。

18. React 对插槽（Portals）的理解，如何使用，有哪些使用场景？

    1. 定义：Portal 提供了一种将子节点渲染到存在于父组件以外的 DOM 节点的优秀方案；
    2. Portal 是 React16 提供的官方解决方案，使得组件可以脱离父组件层级挂载在 DOM 树的任何位置。

19. React 中如何避免不必要的 render？
    React 基于虚拟 DOM 和 diff 算法的完美结合，实现对 DOM 的最小粒度更新，对于日常开发都能满足需求。但对于复杂功能的业务场景需要考虑性能问题。提高性能最重要的一点是避免不必要的 render

    1. shouldComponentUpdate 和 PureComponent
    2. 利用高阶组件：在函数组件中没有 shouldComponentUpdate 生命周期，可以利用高阶组件，封装类似 PureComponent 的功能；
    3. memo、useMemo、useCallback：可以用来缓存组件的渲染，避免不必要的更新。memo 只能用于函数组件。

20. 展示组件和容器组件的区别

    1. 职责：展示组件负责界面的展示，它接收输入的属性，然后根据这些属性渲染出界面。容器组件负责数据的获取和处理，它把获取到的数据传递给展示组件。
    2. 与数据的关联：展示组件不关心数据来源，只负责展示。容器组件需要和数据源交互，比如从服务器获取数据或修改数据。

21. 设计 React 组件的思路：

    1. 明确组件的职责：确定这个组件是负责展示数据、处理用户交互还是获取数据等；
    2. 定义组件的接口：确定组件接收哪些属性，以及向外暴露哪些方法或者事件；
    3. 考虑组件的复用性：尽量使组件具有通用性，能够在不同的场景下使用；
    4. 处理组件的状态：根据组件的需求，合理地使用状态管理，确保组件的状态使可预测和可维护的。

22. useEffect、useLayoutEffect 与生命周期的对应关系？

    1. useEffect：类似于 componentDidMount、componentDidUpdate 和 componentWillUnmount 的组合。它在组件挂载后执行，在组件更新后如果依赖发生变化也会执行，并且在组件卸载时可以进行清理操作。
    2. useLayoutEffect：与 useEffect 类似，但它在所有 DOM 变更之后同步调用。可以看作是 componentDidMount 和 componentDidUpdate 在布局阶段的版本。
    3. useEffect 是异步执行，它会在浏览器渲染完成后执行；useLayoutEffect 是同步执行的，它会在所有 DOM 变更后同步调用，在浏览器绘制之前执行。适合需要在 DOM 更新后立即执行的操作，比如读取 DOM 布局信息。

23. React Diff 和 Vue Diff？

    1. react 的 diff 算法基于两个假设：不同类型的元素会产生不同的树；开发人员可以通过设置 key 属性来告知 react 哪些元素在不同的渲染之间是稳定的。在对比时，react 会对新旧虚拟 DOM 树进行深度优先遍历，分层比较节点，当发现节点类型不同时，直接替换整个子树，当节点类型相同且 key 相同，会进行更细致的比较和更新。
    2. vue 的 diff 算法在比较节点时，同样会优先判断节点类型是否相同。在处理列表时也依赖 key 属性。不过 vue 的 diff 算法在某些细节上和 React 不同，例如在静态节点和动态节点的处理上，vue 会对静态节点进行优化，尽量减少对静态节点的重复比较。

24. 什么是 Suspense？
    Suspense 是 React 中的一个特性，它主要用于处理异步操作，比如异步加载组件或者数据。它允许组件在等待异步操作完成时显示一个 fallback 状态（如加载提示），当异步操作完成后，再渲染出实际的内容。这使得异步操作在 React 组件中的处理更加优雅和直观。

25. useRef 的应用场景

    - useRef 用于持久化可变值的 hook，其核心特点是跨渲染周期保留引用，且修改它不会触发组件重新渲染。

    1. 访问/操作 DOM 元素：获取原生 DOM 节点的引用；
    2. 存储可变值：替代 useState 存储需要变化但不需要触发 UI 更新的值
    3. 保存定时器/事件监听器：避免因组件重新渲染导致定时器或监听器被重复创建；
    4. 缓存昂贵计算的结果：配合 useMemo 实现更灵活的计算缓存；对比 useMemo，useMemo 依赖变化会重新计算，useRef 手动控制何时更新；
    5. 获取子组件实例（类组件）：通过 ref 访问子组件的方法或属性；
    6. 与 forwardRef 结合暴露特定方法：控制子组件向父组件暴露的接口；避免父组件直接操作子组件 DOM，仅暴露必要接口；

26. React 的 Diff 算法是 VDOM 的核心机制，用于高效计算出新旧虚拟 DOM 树的差异，并最小化对真实 DOM 的操作

    - Diff 算法的基本原则
      1. 同级比较：仅对同一层级的节点进行比较，不跨层级比较（时间复杂度从 n3 - n）
      2. key 优化：通过 key 属性识别稳定节点，减少不必要的重新渲染；
      3. 组件类型优化：优先比较组件类型，类型不同直接替换；
    - Diff 算法的详细步骤

      1. 比较根节点
         - 规则：根节点类型不同时，直接卸载整棵树并重建；
      2. 比较相同类型的 DOM 节点
         - 规则：若节点类型相同（如都是 div）则只变更变化的属性；
      3. 比较相同类型的组件节点
         - 规则：组件类型相同时
           - 保留组件实例，更新其 props
           - 触发组件生命周期（getDerivedStateFromProps，shouldComponentUpdate）
           - 递归比较其子节点
      4. 列表节点的比较（核心）
         - React 对子节点列表采用双端比较算法（16 版本后）步骤如下
           1. 第一轮遍历：从左到右：逐个对比新旧子节点，直到遇到第一个 key 不匹配的节点停止；
           2. 最后一轮遍历：从右到左，从列表末尾开始反向比较，直到遇到第一个不匹配的节点停止。
           3. 处理剩余节点
              1. 场景 1：新列表有剩余节点 - 创建新 DOM
              2. 场景 2：旧列表有剩余节点 - 删除旧 DOM
              3. 场景 3：乱序节点 - 通过 key 匹配移动节点（尽量复用）
      5. key 的作用：
         1. 唯一标识：帮助 React 识别哪些节点是稳定的、可复用的；

    - Diff 算法的优化策略

      1. Batching（批处理）：将多次 DOM 更新合并为一次
      2. 惰性处理：优先处理用户可见区域的变更（如 React Fiber 的时间切片）
      3. 跳过子树：若 shouldCOmponentUpdate 返回 false，则跳过整个子树的 diff；

    - 为什么 React Diff 高效？
      1. 广度优先分层比较：减少递归深度；
      2. Key 的合理使用：最大优化节点复用；
      3. 组件颗粒度控制：通过组件类型快速跳过无变化子树；

# Nextjs 相关

1. nextjs 重新设计了一套路由？

   1. 与服务器端渲染集成：nextjs 的路由主要是为了更好地与服务器端渲染配合，能够根据不同的请求路径在服务器端动态生成页面，而传统的 react router 主要是基于客户端渲染；
   2. 简化开发流程：它提供了更简洁的路由定义方式，比如基于文件系统的路由，开发者可以通过文件结构来直观地定义路由，减少配置的复杂性。

2. Nextjs 中获取数据有哪些方法？

   1. getStaticProps: 用于在静态生成（SSG）时获取数据，在构建时运行，可以获取数据并将其作为 props 传递给页面组件；
   2. getServerSideProps：用于在服务器端渲染（SSR）时获取数据，在每个请求时运行，同样将数据作为 props 传递给页面组件。
   3. 直接在组件内部获取数据（如使用 useEffect 等）：这种方式适用于客户端获取数据，但需要注意数据加载的时机和性能影响。

3. ServerComponent 的整个渲染过程时怎么样的？在这个渲染过程中 ServerComponent 和 ClientComponent 有什么区别？

server component 出现的目的是为了更靠近服务器能更快速的拿到请求的数据，而服务器的渲染过程中，会构建一个未完成渲染的可序列化的 react tree，然后里面会包含 client component 的节点，而这些节点会被 bundler 处理为只有 id，props 的属性和保留对客户端组件的这么一个节点，又因为所有的 props 都必须是可序列化的，所以像 onClick 这些事件处理方法自然不能给到服务器组件了。
当浏览器接收到服务器返回的 JSON 后，会重新构建 react tree，通过 bundler 将之前的节点引用，替换成对应的客户端组件。
而当 react 组件需要 promise 等待数据的获取时，需要用到 suspense 来包裹，所有在一开始生成 RSC 时，遇到时会通过一个占位符（fallback）来占据这棵构建树的节点，当完成 promise 请求后会再次调用服务端组件函数，完成后再将其流式传递到浏览器，替换原来的占位符。

4.  nextjs 的水合：指客户端渲染时，react 会尝试重用服务端渲染生成的 HTML 结构，然后在其上面绑定事件和状态恢复，以提高性能和用户体验。

5.  nextjs 常见错误:Hydration Failed 如何解决？
    所谓水合（Hydration）指的是 React 为预渲染的 HTML 添加事件处理程序，将其转为完全可交互的应用程序的过程。水合的前提是 DOM 树和组件树渲染一致。出现水合错误的常见原因如下：

    1. HTML 元素错误嵌套：比如在 p 标签里又嵌套一个 p 标签。除了 p 嵌套错误，其他可能的还有：
       - p 嵌套在另一个 p
       - div 嵌套在 p 中
       - ul 或 li 嵌套在 p 中
       - 交互式内容（所谓交互式内容，指的是专门用于用于交互的内容，比如 a、button、img、audio、video、input、label 等等）不能能嵌套
    2. 渲染时使用 typeof window !== "undefined"等判断；这个错误只会出现在客户端组件中，因为 next14 采用基于 React Server Component 架构后，只有客户端组件才会在客户端进行水合，服务端组件直接在服务端进行渲染，并不会在客户端进行水合。服务端渲染的时候，因为在 node 环境下，isClient 为 false，返回 server，而在客户端的时候，会渲染成 client，渲染内容不一致导致出现水合错误。
    3. 渲染时使用客户端 API 如 window、localStorage 等：原因和 2 差不多，因为服务端没有相应的 API，可能出现服务端渲染和客户端渲染不一致的。
    4. 使用时间相关的 API，如 Date：原因在于服务端渲染和客户端渲染的时间不一致，客户端组件它会先在服务端进行依次预渲染，传给客户端后还要进行一次水合，添加事件处理程序，最后根据客户端事件进行更新。所以客户端组件可以简单理解为“SSR+水合+CSR”
    5. 浏览器插件导致：根本原因是有些插件会在页面加载之前修改页面结构，导致 DOM 渲染不一致。
       解决水合 Failed 的方法：
    6. 使用 useEffect：如果要使用客户端的 API，应该尽可能放在 useEffect 中。
    7. 禁用特定组件的 SSR 渲染：渲染不一致的本质是客户端组件既要在服务端也要在客户端渲染一份，因此可以直接取消客户端组件的服务端渲染（借助 nextjs 提供的 dynamic 函数）
    8. 使用 suppressHydrationWarning 取消错误提示：如果实在无法避免可以添加 suppressHydrationWarning={true}属性取消错误提示。该方法是 react 提供的，只能用于一层深度。建议不过度使用；
    9. 自定义 hook（本质是 1 的封装）

6.  Nextjs 中，服务端组件和客户端组件的渲染流程是混合进行的，两者协作以优化性能和用户体验。

    1. 服务端组件
       - 渲染阶段
         1. 请求阶段
            1. 用户访问页面时，nextjs 服务器接收到请求
            2. 识别页面中的服务端组件（默认所有为服务端组件，除非进行标记）
         2. 数据获取
            1. 服务端组件可以直接在组件内部使用 async/await 获取数据（如数据库查询、API 调用）
         3. 渲染为静态 HTML
            1. 服务端组件在服务器上渲染为纯 HTML 和 JSON（不包含 React 状态和事件逻辑）
            2. 生成的 HTML 包含客户端组件的“占位符”
         4. 响应返回
            1. 将渲染好的 HTML、JSON 数据（用于客户端 Hydration）和客户端组件代码一起发送给浏览器。
       - 特点
         1. 无客户端 js：不包含 useState、useEffect 或浏览器 API
         2. 自动代码合并：仅发送必要的组件代码到客户端
         3. SEO 友好：内容完全在服务端渲染，可以被爬虫直接抓取；
    2. 客户端组件
       1. 渲染流程
          1. 服务端预处理
             1. 服务端识别客户端组件（通过“use client”标记）
             2. 服务端生成该组件的静态 HTML 占位符，标记为需要客户端 js
          2. 客户端 Hydration
             1. 浏览器接收到 HTML 后，下载客户端组件的 js 包
             2. React 在客户端激活（hydrate）组件，将静态 HTML 转换为可交互的 React 组件；
             3. 恢复状态（如从服务端传递的初始 props）
          3. 后续交互
             1. 用户点击（如点击按钮）触发客户端组件的状态更新，重新渲染仅发生在客户端。
       2. 特点：
          1. 完整的 react 能力：支持 useState\useEffect、事件监听等；
          2. 渐进式增强：初始内容由服务端渲染，后续交互由客户端处理；
    3. 混合渲染流程（服务端+客户端组件）

    ```jsx
    import ClientCounter from "./clientCounter";

    export default async function Page() {
      const serverData = await getData();

      return (
        <div>
          <h1>{serverData.title}</h1> {/* 服务端渲染 */}
          <ClientCounter initialCount={serverData.initialCount} /> {/** 客户端组件 */}
        </div>
      );
    }
    ```

        1. 服务端
            1. 渲染Page为HTML（包含serverData.title的静态内容）
            2. 为ClientCounter生成占位符，并嵌入serverData.initialCount作为初始props
        2. 客户端
            1. Hydrate ClientCounter；使用initialCount初始化状态；
            2. 用户点击按钮时，仅更新ClientCounter的客户端状态；

    4. 如何选择？
       1. 优先使用服务端组件：静态内容展示、需要直接访问后端数据或敏感逻辑
       2. 必须使用客户端组件：需要交互、使用浏览器 API
    5. 高级场景
       1. 服务端组件可以嵌套客户端组件，反之亦然；
       2. 客户端组件中无法直接导入服务端组件（需通过 children 传递）
       3. 结合 next/dynamic 实现按需加载客户端组件；
    6. 性能优化：
       1. 减少客户端 js：将非交互部分保留位服务端组件
       2. 流式渲染：使用 Suspense 分块发送 HTML；

7.  NextJS 渲染原理

    1. Page Router
       1. 页面路径：基于 pages 目录的文件结构
       2. 渲染方式：通过 getStaticProps(SSG)、getServerSideProps(SSR)或默认客户端渲染（CSR）显式声明；
    2. App Router
       1. 页面路径：基于 app 目录的文件结构，支持嵌套布局和 React Server Components
       2. 渲染方式：根据组件类型（服务端组件/客户端组件）自动选择最优渲染策略；
    3. 核心渲染流程
       1. 请求阶段
          1. 用户访问 URL：浏览器发起页面请求
          2. 服务器路由匹配：nextjs 服务器根据 app 目录结构匹配对应的页面组件
       2. 服务端组件渲染
          1. 数据获取：服务端组件直接使用 async/await 获取数据
          2. 静态 HTML 生成：服务端组件在 Nodejs 环境中渲染为 HTML，不包含客户端 js
       3. 客户端组件处理
          1. 标记与代码分割：通过“use client”指令标记的客户端组件会被单独打包
          2. 占位符注入：服务端生成的 HTML 中包含客户端组件的占位符和初始 props
       4. 响应返回
          1. HTML+JSON 数据：服务器返回以下内容：
             1. 静态 HTML（服务端组件渲染结果）
             2. 客户端组件的 js 包（按需加载）
             3. 初始状态数据（嵌入到**NEXT_DATA**脚本中）
       5. 客户端 Hydration
          1. 激活交互性：浏览器下载客户端组件代码后，react 将静态 html 激活为可交互的 spa
             1. 恢复客户端组件的状态（initialCount）
             2. 绑定事件监听器（如 onClick）
       6. 后续导航（Client-Side Navigation）
          1. SPA 行为：通过 next/link 或 next/router 的导航触发
             1. 仅请求目标页面的 json 数据（而非完整 HTML）
             2. 客户端动态更新 DOM，实现无刷新跳转；
    4. 混合渲染策略
       1. 静态生成（SSG）页面无动态数据或使用 generateStaticParams，可以在构建时生成 HTML、CDN 缓存、性能最佳；
       2. 服务端渲染（SSR）页面包含动态数据（如 cookies()、headers()），在每次请求时生成 HTML，支持个性化内容；
       3. 客户端渲染（CSR）：组件标记为"use client"且无服务端数据依赖，需要 Hydration，支持完整交互性。
    5. App Router 和 Page Router 的差异
       1. 数据获取：app 模式在组件中使用 async/await，page 模式通过 getStaticProps/getServerSideProps

# 构建流程相关

1. webpack 中 loader 和 plugin 的区别

   1. 功能不同
      - loader 本质是一个函数，它是一个转换器。webpack 只能解析原生 js 文件，对于其他类型的文件就需要 loader 进行转换；
      - plugin 是一个插件，用于增强 webpack 功能。webpack 在运行的生命周期中会广播出许多事件，plugin 可以监听这些事件，在合适的时机通过 webpack 提供的 api 改变输出结果；
   2. 用法不同
      - loader 的配置在 module.rules 下进行，类型为数组，每一项都是一个 object，里面描述了什么类型的文件，使用什么加载和使用的参数；
      - plugin 的配置在 plugins 下，类型为数组，每一项都是一个 plugin 实例，参数都通过构造函数传入；

2. webpack 的构建流程

   - 初始化参数，解析 webpack 配置参数，合并 shell 传入和 webpack.config.js 文件配置的参数，形成最后的配置结果；
   - 开始编译，使用得到的参数初始化 compiler 对象，注册所有配置插件，插件监听 webpack 构建生命周期的事件节点，做出相应的反应，执行对象的 run 方法开始执行编译。
   - 确定入口，从 entry 入口，开始解析文件构建 ast 语法树，找出依赖，递归；
   - 编译模块，从递归中根据文件类型和 loader 配置，调用所有配置的 loader 对文件进行转换，再找出该模块依赖的模块，再递归知道所有入口文件的依赖文件都经过了本步骤的处理；
   - 完成模块编译，在上一步使用 loader 翻译所有模块后，得到每个模块被编译后的最终内容以及它们之间的依赖关系；
   - 输出资源，根据入口和模块之间的依赖关系，组装成一个个包含多个模块的 chunk，再把每个 chunk 转换成单独文件加入到输出列表，这步是可以修改输出内容的最后机会；
   - 完成输出，在确定好输出内容后，根据配置确定输出的路径和文件名，把文件内容写入到文件系统；
   - webpack 构建流程是一个串行的过程。它的工作流程就是将各个插件串联起来，在运行过程中广播事件，插件只需要监听它所关心的事件，就能加入到 webpack 机制，去改变 webpack 的运行，使得系统扩展性良好。

3. webpack 的 tree shaking 原理
   是一个利用 es6 模块静态结构特性去除生产环境下不必要代码的优化过程。其工作原理在于：

   - 当 webpack 分析代码时，它会标记出所有的 import 语句和 export 语句
   - 然后，webpack 确定某个模块没有被导入时，它会在生成的 bundle 中排除这个模块的代码；
   - 同时，webpack 还会进行递归的标记清理，以确保所有未使用的依赖项都不会出现在最终的 bundle 中。
   - 确保使用的是 es6 语法，只有这样才能让 tree shaking 发挥作用；

4. 如何提高 webpack 的打包速度

   - 利用缓存：利用 webpack 的持久缓存功能，避免重复构建没有变化的代码；
   - 利用多进程/多线程构建：使用 thread-loader、happypack 等插件可以将构建过程分解为多进程/多线程；
   - 使用 DllPlugin 和 HardSourceWebpackPlugin：DllPlugin 可以将第三方库预先打包成单独文件，减少构建时间；HardSourceWebpackPLugin 可以缓存中间文件，加速后续构建过程。
   - 使用 TreeShaking：配置 Webpack 的 Tree Shaking 机制，去除未使用代码，减少生成的文件体积；
   - 移除不必要的插件：移除不必要的插件和配置，避免不必要的复杂性和性能开销；

5. vite 比 webpack 快在哪里？

   - 开发模式的差异
     - 开发环境下，webpack 是先打包后启动开发服务器，vite 是先启动，然后再按需编译依赖文件；也就是 webpack 所有模块都需要在开发前进行打包，增加了启动时间和构建时间；vite 采用的策略只有在请求模块时进行实时编译，这种按需编译的模式缩短了编译时间。
   - 对 ESModule 的支持
     - 现代浏览器本身就支持，ESModule，会主动请求去获取所需文件。vite 利用这一点，将开发环境下的模块文件直接作为浏览器执行的文件，而不是像 webpack 那样先打包，再交给浏览器执行，减少了中间环节，提高了效率；
   - 底层语言的差异
     - webpack 基于 nodejs 构建，而 vite 则是基于 esbuild 进行预构建依赖。esbuild 时采用 go 语言编写，go 语言时纳秒级别的，而 nodejs 是毫秒级别的。因此 vite 在打包速度上相比 webpack 有 10-100 倍提升；
   - 热更新的处理
     - wenpack 中，当一个模块或其依赖的模块内容改变时，需要重新编译这些模块；
     - vite 中，当某个模块内容改变时，只需要让浏览器重新请求该模块即可，减少了热更新时间；

6. Monorepo 的理解

   - Monorepo 是一种项目代码管理方式，指单个仓库中管理多个项目，有助于简化代码共享，版本控制、构建和部署等方面的复杂性，提供更好的可重用性和协作性。Monorepo 提倡开放、透明、共享的组织文化；
   - 一个仓库多个相关项目、容易看到代码库的变化趋势，更好的团队协作；
   - 相同版本的依赖提升到顶层安装一次，节省磁盘空间
   - 多个项目都在一个仓库中，没有项目力度的权限管理，一个项目出问题，可能影响所有项目；
   - 多项目共存、编码方便，代码复用性高，方便代码重构，以来调试方便，依赖包迭代的情况下，借助工具自动 npm link，直接使用最新版本依赖，简化操作流程；
   - 多个项目共存，工程配置一致，代码质量标准和风格可以一致化；
   - 构建性 monorepo 工具可以配置依赖项目的构建优先级，可以实现一次命令完成所所有部署；

7. Node 服务保活（确保稳定运行）需要从进程管理、错误恢复、监控告警、资源优化等多个维度入手；
   1. 进程管理：防止服务崩溃
      1. 使用进程管理工具：PM2（支持自动重启、负载均衡、日志管理）
      2. 集群模式（提升容错能力）利用多核 CPU 启动多个进程，避免单点故障
   2. 错误处理：预防未捕获异常
      1. 全局错误捕获，监听 process.on("unhandleRejection"), process.on("uncaughtException")
      2. 优雅推出：收到 SIGTERM 信号时清理资源
   3. 健康检查与自动恢复
      1. 添加监控检查接口：配合 Kubernetes/Docker 的 livenessProbe 或 Nginx 定期请求；
      2. 心跳检测：使用 node-cron 定时自检关键功能（如数据库连接）
   4. 资源监控与告警
      1. 实时监控工具
         - 基础监控：pm2 monit / node-process-stats(实时查看 CPU/内存)
         - 高级方案：Prometheus + Grafana: 自定义指标
      2. 日志集中管理
         - 工具：ELK（Elasticsearch + Logstash + Kibana）
         - 关键日志：错误日志、重启记录、性能瓶颈警告；
   5. 系统级保活（生产环境必备）
      1. 使用 docker 容器：通过 restart 策略自动恢复；
      2. linux systemd 托管；
   6. 预防性优化
      1. 内存泄漏优化
         - 使用 heapdump 定期生成内存快照分析；
         - 避免全局变量、及时清理定时器/监听器；
      2. 负载均衡
         - 使用 nginx 或 HAProxy 分流请求、避免单进程过载；
   7. 备灾与回滚
      1. 备份关键数据：数据库、配置文件定期备份至云存储
      2. 快速回滚机制：使用 git 标签或 Docker 镜像版本控制；

# HTTP 和浏览器相关

1. GET 和 POST 的区别?

   - 请求参数的位置：GET 请求参数在 URL 后，参数间用&连接，多个参数会造成 URL 长度增加。而 POST 请求的参数包含在请求体中，不会再 URL 中显式；
   - 请求长度的限制：GET 请求参数由于赋加在 URL 后，因此可能受浏览器对 URL 的限制，存在长度限制。POST 请求则没有这个显式，可以传递大量数据；
   - 安全性：GET 请求参数暴露在 URL 中，因此不能用于传输敏感数据，如密码等。POST 参数在请求体中，相对安全（非绝对，安全性还需要依赖其他因素，比如 SSL/TLS 加密等）
   - 幂等性：GET 请求是幂等的，即多次执行同一 GET 请求，服务器返回相同结果。而 POST 请求则是不幂等的，因为每次提交都会创建新的资源。
   - 缓存：GET 请求可以被缓存，POST 则不会，除非在响应头增加适当的 Cache-Control 或 Expires 字段。
   - 后退/刷新按钮的影响：GET 请求可以被浏览器缓存，因此可以通过点击后退/刷新按钮来重复执行，而 POST 不会，因为这些操作对 POST 请求没有实际意义。

2. HTTP2 相对于 HTTP1.x 有什么优势和特点？

   - 二进制分帧层：HTTP2 不再使用文本传输数据，而是将所有数据分割为更小的消息和帧，并以二进制格式进行编码，这有助于高效解析 HTTP 消息，减少错误解析的可能性；
   - 多路复用：HTTP2 引入多路复用，允许在单个 TCP 连接中并行处理多个请求和响应。消除了 HTTP1.x 中的队头阻塞问题，极大提高了网络性能和资源利用率；
   - 头部压缩：HTTP2 使用头部压缩技术，通过共享头部信息，显著减少传输的数据量。这有助于减少延迟和网络带宽的消耗，特别是在传输大量小请求时效果更为显著；
   - 服务器推送：HTTP2 允许服务器主动向客户端推送资源，实现了对流量的精细控制，有助于防止网络拥堵和资源浪费；

3. HTTPS 怎么保证安全？

   - 加密传输：HTTPS 使用 SSL/TLS 协议对 HTTP 报文进行加密，使得敏感数据在网络传输过程中不容易被窃听和篡改。这种加密过程结合了对称加密和非对称加密，确保数据的保密性和完整性；
   - 身份验证：HTTPS 通过数字证书对身份进行验证，确保通信双方的真实性，在建立 HTTPS 连接时，服务器会提供数字证书来证明自己的身份，如果验证通过，客户端可以信任服务器，并继续对其进行安全的数据传输。这有效防止了被恶意伪装的服务器攻击；
   - 数据完整性保护：在传输数据之前，HTTPS 会对数据进行加密，并使用消息 HASH 算法生成一个 HASH 值，在数据达到接收端后，接收端使用相同的算法对接收到的数据进行 HASH 计算，并与发送端的 HASH 值进行比较，如果一直，说明没有被篡改，如果不一致，通信双方需要重新进行验证或中断。

4. HTTP 状态码

   - 1xx（信息性状态码）
     - 100 Continue：客户端继续请求
     - 101 Switch：切换协议
   - 2xx（成功状态码）
     - 200 OK：请求成功
     - 201 Created：请求已经被实现，并因此创建了一个新的资源；
     - 204 No Content：服务器成功处理请求，但没有返回任何内容；
   - 3xx（重定向状态码）
     - 301 Move Permanently：请求的资源永久移动到新的 URL 上；
     - 302 Found：请求的资源现在临时从不同的 URL 响应请求；
     - 304 Not Modified：客户端执行了 GET 请求，但文件未发送改变；
   - 4xx（客户端错误状态码）
     - 400 Bad Request：服务器无法理解请求
     - 401 Unauthorized：请求要求进行身份验证
     - 403 Forbidden：服务器理解请求，但拒绝执行
     - 404 Not Found：服务器无法找到请求的资源；
     - 405 Method Not Allowed：请求帐指定的方法不被允许
   - 5xx（服务端错误状态码）
     - 500 Internal Server Error：服务器遇到一个未曾预料的情况，导致其无法完成对请求的处理；
     - 501 Not Implemented：服务器不支持当前请求所需要的某个功能；
     - 503 Service Unavailable：由于临时的服务器维护或过载，服务器当前无法处理请求；

5. post 请求为什么会多发送一次 option 请求

   - POST 发送前的 OPTIONS 请求实际上是 HTTP 的一种特性，称为预检请求。这个主要发生在跨域请求的场景中，尤其是当请求涉及一些可能不安全的方法（PUT、DELETE、POST）或使用了一些自定义的 HTTP 头部时；
   - 预检请求的目的是检查服务器是否允许来自不同源的请求进行某些操作。这样做可以确保客户端在发送实际请求之前，先得到服务器的明确许可；以下是 OPTION 请求的主要特点和原因：
     1. 安全性：HTTP 协议中，GET、HEAD 被认为是安全的，它们不会导致服务器上的资源变化，但诸如 POST、PUT、DELETE 等可能会导致资源创建、修改、删除。因此在发送这些非安全请求之前，浏览器会先发送一个 OPTIONS 请求来询问服务器是否允许这样操作.
     2. 自定义头部：如果请求中包含了某些自定义的 HTTP 头部，浏览器也会发送 OPTIONS 请求来询问服务器是否接受这些头部；
     3. CORS 配置：服务器在响应 OPTIONS 时，可以通过 Access-Control-Allow-Methods、Access-Control-Allow-Headers 等头部来告诉浏览器它允许哪些方法和头部。如果服务器的响应中包含了这些头部，并且允许了客户端想要执行的操作，那么浏览器才会继续发送实际的 POST 请求。

6. http 的请求和响应报文分别是什么样的？
    - 请求报文：由请求行、请求头部、空行和请求正文构成。请求行包含了HTTP方法、请求的URI以及HTTP版本。请求头部则包含若干与请求相关的信息，如Accept-Charset、Accept-Encoding等；空行用于分隔请求头和请求正文；请求正文包含需要发送给服务器的数据；
    - 响应报文：由状态行、响应头部和响应正文组成。状态行包含了HTTP版本，状态码及状态码描述，用于描述请求的处理结果；响应头包含了与响应相关的元信息，如Content-Type、Content-Length等；响应正文则包含了服务器返回给客户端的数据。

7. HTTP中的keep-alive是干什么的？
    - http中的keep-alive称为http长连接，是一种通过重用TCP连接来发送和接受多个HTTP请求的机制。主要作用包括：
        1. 减少连接建立开销：在没有keep-alive的情况下，每次http请求都需要经过TCP三次握手建立连接，这会导致大的延迟和资源消耗。而使用keep-alive可以在一个tcp连接上发送多个http请求，从而减少了建立连接的开销；
        2. 降低网络负载：每次建立和关闭连接，都会消耗网络带宽和服务器资源，通过持久连接，可以减少连接的频繁建立和关闭，从而降低了网络负载和服务器负载；
        3. 提高性能和响应时间：由于避免了连接建立和关闭的开销，keep-alive可以提高请求的响应时间和整体性能。客户端可以在同一连接上连续发送请求，而服务器也可以在保持连接的情况下更快地响应这些请求；
        4. 支持HTTP管道化：HTTP管道化是允许客户端在同一个TCP连接中发送多个请求而无需等待每个请求的响应的技术。与keep-alive结合使用时，可以进一步提高性能；

8. 从输入URL到看到页面发生的全过程
    1. 浏览器解析URL：浏览器内部代码解析URL，首先检查本地hosts文件，看是否有对应的域名，如果有，浏览器直接向该IP地址发送请求，如果没有，浏览器会将域名发送给DNS服务器进行解析，将域名替换成对应的服务器IP；
    2. 建立tcp连接：浏览器得到IP地址后，会通过tcp协议与服务器建立连接，tcp/ip协议是internet的基础，它负责确保数据在网络中的可靠传输，这一过程会进行三次握手，确保双方都已经准备好进行通信；
    3. 发送http请求：tcp连接建立后，服务器会向服务器发送http请求，这个请求包含请求行、请求头、空行、请求正文；
    4. 服务器处理请求：服务器接收到请求后，根据请求内容进行相应的处理。这可能包括数据库查询、生成动态内容等；
    5. 发送http响应：服务器处理完请求后，发送一个http响应给浏览器，这个响应包含状态行、响应头、响应正文；
    6. 浏览器解析和渲染页面：浏览器接收到响应后，会解析响应正文中的html代码，并下载所需的css、js等资源文件。然后，浏览器会根据这些资源来渲染页面，最终呈现给用户；

9. 浏览器缓存的优先级
    1. ServiceWorker缓存：由于其可以完全控制网络请求，因此具有最高优先级，即使是强缓存也可以被它覆盖。ServiceWorker是运行在浏览器背后的独立线程，一般可以用来实现缓存功能，但注意，由于serviceworker中涉及拦截请求，所以必须使用https协议来保证安全；
    2. MemoryCache缓存：这是内存中的缓存，主要包含的是当前页面中已经抓取的资源，如样式、脚本、图片等。对我们访问页面以后，再次刷新页面，可以发现很多内容来自内存缓存；
    3. HTTP Cache缓存，包括强制缓存和协商缓存：
        - 强制缓存：在有效时间内，不会向服务器发送请求，直接从缓存中读取资源。控制强缓存的字段分别是expires和cache-control，其中cache-control的优先级高于expires
        - 协商缓存：当强缓存失效后，浏览器会携带缓存标识向服务器发起请求，由服务器根据缓存标识决定是否使用缓存。控制协商缓存的字段有last-modified/if-modified-since和etag/if-none-match
    4. Disk Cache（磁盘缓存）：存储在硬盘中的缓存，读取速度较慢，但胜在容量和存储时效性上。
    5. Push Cache（推送缓存）：这是HTTP2中的内容，当以上4中缓存均没有命中时，才会被使用；

10. 为什么会存在跨域，及常见的跨域解决方法？
    - 跨域的存在主要原因是浏览器的同源策略限制；同源策略是浏览器的安全机制，旨在防止一个域的脚本与另一个域的内容进行交互，以保护用户免受诸如跨站脚本攻击和跨站请求伪造等安全威胁。所谓同源，指的是两个页面具有相同协议、主机和端口。当三个条件任意一个不同时，就会触发跨域问题；
    - 常见的跨域解决方法：
        1. JSONP：利用标签不受同源策略控制的限制，通过动态插入标签来请求不同源的资源。JSONP只支持GET请求，并需要在服务器端进行配合；
        2. CORS（跨域资源共享）：CORS是一种W3C规范，它定义了一种浏览器与服务器交互的方式来确定是否允许跨域请求；通过服务器端设置相应的HTTP头部信息，如Access-Control-Allow-Origin，来允许跨域请求。CORS支持各种http请求方法，并且更加灵活和安全；
        3. 代理服务器：通过搭建一个代理服务器来转发请求，使得前端可以通过代理服务器来简洁访问不同源的资源，这样，前端请求实际在同源服务器，再由服务器去请求不同源的资源；
        4. 使用window.postMessage：window.postMessage是HTML5引入的新API，允许来自不同源的脚本进行通信，通过监听window对象的message事件，可以接收其他窗口发送过来的消息；
        5. 设置document.domain: 如果两个页面同属于一个顶级域名下的不同子域名，可以通过设置document.domain为相同的顶级域名实现跨域，但是这种方式存在限制，并且可能引入其他安全风险；

11. 浏览器的渲染机制：一个复杂且精细的过程，主要涉及解析HTML、CSS、构建DOM树和CSSOM树，然后合并它们以构建渲染树，再进行布局和绘制，最终将页面内容展示给用户。
    - 解析HTML并构建DOM树：当浏览器接收到HTML文档后，解析HTML标签，转为DOM节点，然后按照文档的结构将这些节点组织成一棵树结构，即DOM树。DOM树是浏览器内部表示网页内容的一种方式，它包含了网页中所有的元素和属性；
    - 解析CSS并构建CSSOM树：浏览器解析css代码，将样式规则转为CSSOM节点，并构建成CSSOM树，CSSOM树描述了HTML文档中每个元素的样式信息；
    - 构建渲染树：浏览器将DOM树和CSSOM树合成渲染树，渲染树只包含需要显式的节点和样式信息，不包含隐藏的元素或不可见的样式。这一步是渲染过程中的关键步骤，因为它决定了哪些元素将被渲染以及如何渲染；
    - 布局：构建完渲染树后，浏览器根据渲染树的信息计算每个节点的位置和大小，生成布局。这个过程也称为重排或回流，它涉及到对元素的位置和尺寸进行精确计算，以确保页面元素能够正确显式在屏幕上。
    - 绘制：布局完成后，浏览器会将每个节点的样式信息转换为像素，然后绘制到屏幕上。这个过程也称为重绘，涉及到将元素的视觉表现绘制出来；


12. 什么是重绘和回流及怎么减少重绘和回流？
    - 重绘：当页面中元素的样式改变不影响布局时，浏览器将只会重新绘制受影响的元素，这个过程是重绘；
    - 回流：也称为重排，当页面布局或几何属性发生变化时，浏览器需要重新计算元素的几何属性，并重新构建渲染树，这个过程是回流；
    - 减少重绘和回流的方法：
        1. 避免频繁操作样式：尽量一次性修改多个样式属性，而不是逐一修改；
        2. 利用css3动画：css3动画和过渡不会触发回流，它们是通过GPU进行渲染的；
        3. 避免使用table局部：table布局发生在变化时可能需要多次计算，这会增加回流次数，尽量使用flexbox或grid等现代布局技术；
        4. 批量修改DOM：如果需要添加、删除或修改多个DOM节点，可以考虑使用DocumentFragment或离线节点，这样可以在一次回流中完成所有操作；
        5. 使用绝对布局：绝对布局的元素不会触发其父元素及后续元素的回流，因为它们脱离了正常的文档流；
        6. 避免使用内联样式：内联样式会增加重绘和回流的可能性，因为它们直接修改元素样式，尽量使用css文件管理；
        7. 利用图片加载：使用合适的图片格式和大小，避免使用大量图片，减少页面的渲染负担；
        8. 利用浏览器的缓存机制：对于不经常改动的资源，可以利用浏览器的缓存机制来减少请求次数，从而加快页面加载速度；

13. 浏览器的事件机制：主要涉及到事件的触发、传播和处理；当用户在浏览器进行某些操作时，如点击、移动鼠标或输入文本，会触发相应的事件，这些事件封装为event对象，包含了事件的属性和方法，供开发者在事件处理函数中使用；

    - 事件的传播分为三个阶段：捕获阶段、目标阶段和冒泡阶段；在DOM2级事件模型中，事件首先在最外层HTML进行捕获，然后向下传递到事件的目标元素，沿途触发所有设置了捕获事件处理函数的元素。接着，事件处理器在目标的元素上执行，这是事件处理的核心阶段；最后，事件从目标元素向上回溯，触发所有设置了冒泡事件处理器的元素，完成冒泡阶段。这种机制允许开发者在事件传播的不同阶段拦截并处理事件；
    - 事件处理过程中，浏览器维护事件队列，一旦事件队列中的事件得到处理，它就会被移除。此外，浏览器支持宏任务和微任务的概念，用于管理异步执行的任务。



