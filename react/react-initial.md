# React 容器初始化过程

1. 入口：updateContainer：执行render函数后，react内部执行updateContainer函数，主要作用是更新React容器，将新的React元素渲染到指定容器中，并返回更新所使用的优先级通道；包括以下操作：
    1. 获取当前Fiber节点：从传入的container对象中获取当前的Fiber节点current，代表当前容器的根节点；
    2. 请求更新通道：调用requestUpdateLane函数，根据当前Fiber节点current请求一个更新通道lane。这个通道表示此次更新优先级；
    3. 调用更新实现函数：调用updateContainerImpl函数，将current、lane和新的react元素element、容器container、父组件parentComponent以及回调函数callback作为参数传递给它，进行实际更新操作。
    4. 返回更新通道：返回请求到的的更新通道lane；

2. scheduleUpdateOnFiber：该函数会将一个更新任务添加到root的更新队列中，然后根据lane的优先级来决定何时执行这个更新任务。这个函数是React协调器（Reconciler）的一部分，负责更新组件和渲染；

3. 注册调度任务：在scheduleUpdateOnFiber函数之后，立即进入ensureRootIsScheduled函数，在这个地方会和调度中心（schedule包）交互，注册调度任务task，等待任务回调；

4. 执行任务回调：实际上就是执行performSyncWorkOnRoot；

5. 输出到用户界面：在输出阶段，commitRoot其主要逻辑是处理副作用队列，将最新的fiber树结构反映到DOM上。

