# React优先级管理

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
