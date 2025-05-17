# React Fiber 机制

1. React架构的发展历程
  1. React15分为两层
      1. Reconciler（协调器）- 负责找出变化的组件；
      2. Renderer（渲染器）- 负责将变化的组件渲染到页面上
  2. React16分为三层
      1. Scheduler（调度器）- 调度任务优先级，高优先级优先进入Reconciler；
      2. Reconciler（协调器）- 负责找出变化的组件；更新工作从递归变成了可以中断的循环过程。Reconciler内部采用了Fiber架构；
      3. Renderer（渲染器）- 负责将变化的组件渲染到页面上

2. 推出Fiber机制的原因
    1. 解决React中的“单线程渲染”问题；Fiber架构通过使用协程来解决这个问题。协程允许再渲染过程中暂停和重新启动组件的渲染，这使得可以优先处理优先级较高的组件，从而提高性能；
    2. Fiber架构中，每个组件对应一个协程。通过使用js的Generator函数来实现；Generator是一个特殊函数，可以在执行时暂停并保存当前的执行状态。Fiber的协程并不是真正的多线程协程，而是在单个js线程上模拟多线程的行为。

3. Fiber是什么？
    1. 从运行机制看，Fiber是一种流程让出机制，可以实现中断式渲染，并将渲染的控制权让回浏览器，从而达到不阻塞浏览器渲染的目的；
    2. 从数据结构看，Fiber是一种链表，是一个执行单元；
    3. Fiber中每个节点有三个指针：分别指向第一个子节点、下一个兄弟节点、父节点。它的遍历规则如下：
        1. 从根节点开始,依次遍历该节点的子节点、兄弟节点，如果两者都遍历了，则回到父节点；
        2. 当一个节点的所有子节点遍历完成，才认为该节点完成遍历；
    4. fiber被称为纤程，被认为是协程的一种实现形式。协程是比线程更小的调度单位：它的开启、暂停可以背程序员控制。

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
    2. 中断和恢复渲染成为了可能，作为工作单元，可以在时间内执行工作，没时间了交还控制权；合适时间又可以获取控制权返回到fiber执行；
    3. 可以在reconcile的时候进行相应的diff更新，让最后的更新应用在真实节点上；

11. Fiber的Reconciliation和Dom Diff的不同
    1. 前者在js应用代码中执行，后者通常指在浏览器执行的操作；
    2. 与DOM diff相比，Reconciliation显著优势在于，DOM diff时一种在两棵树之间找到最小补丁集的算法。它需要遍历整棵树寻找变化，是一个O(n ^ 3)的复杂度算法。相比之下，Reconciliation的复杂度是O(n)，因为它只遍历了有变化的节点；

12. 性能优化好在哪？
    1. v15及之前，React直接递归渲染vdom，setState会触发重新渲染，对比渲染出的新旧vdom对差异部分进行dom操作；
    2. v16及之后，会先把vdom转换为fiber，也就是从树转为链表，然后再渲染，整体渲染分为两个阶段：
        1. render阶段：从vdom转为fiber，并且对需要dom操作的节点打上effectTag标记；
        2. commit阶段：对有effectTag的标记的fiber节点进行dom操作，并执行所有的effect副作用函数。
    3. vdom转fiber的过程叫调和（reconcile）。

14. 动画优化：使用requestAnimationFrame机制可以在浏览器下一次重绘之前处理动画。requetAnimationFrame可以更好控制帧率；另外提供了”animation scheduling“。这种机制可以精细控制动画时间进程