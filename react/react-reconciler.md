# React Reconciler（协调器）

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
