# web-interview

## HTML

## CSS

## JavaScript

## Vue
  1. vue的生命周期定义？  
  vue实例从创建到销毁的整个过程，就是生命周期；即vue实例从开始创建、初始化数据、编译模板、挂载DOM -> 渲染、更新->渲染、销毁的一系列过程，称之为vue的生命周期。
  2. vue生命周期的作用？  
  vue在它的生命周期过程中有多个事件钩子函数，可以让我们更好地控制vue实例整个生命周期过程中的处理逻辑。
  3. vue生命周期公共有几个阶段极其对应的钩子函数？  
  8个阶段，分别是创建前后（beforeCreate、created），挂载前后（beforeMount、mounted），更新前后（beforeUpdate、updated）、销毁前后（beforeDestroy，destroyed）
  4. vue第一次加载页面会触发哪几个钩子函数？  
  第一次加载一定会触发beforeCreated、created、beforeMount、mounted
  5. DOM渲染在哪个周期完成？  
  DOM渲染在mounted中挂载到页面上，此时可以获取到dom元素
  6. v-show和v-if的区别？  
  v-show是css切换，v-if包含完成的创建和销毁过程  
  使用频繁使用v-show，较少改变使用v-if  
  v-if是条件渲染，当值为false时不会渲染，即页面不存在该dom元素(及其子元素)  
  v-show不管是true还是false，dom元素都存在，只是css的display在none和block间切换  
  7. MVVM  
  M - model，代表数据模型，可以在model中处理数据业务逻辑  
  V - view，代表视图，负责将数据模型在UI中显示出来  
  VM - viewmodel，负责监听模型数据的改变以及控制视图行为、处理用户交互，即同步view和model的对象  
  8. computed和watch的差别  
  computed是计算属性：（1）可以缓存，只有当它依赖的属性值改变后，下一次获取computed值时重新获取值并缓存起来；（2）无法进行异步操作；（3）适用于计算比较消耗性能的场景  
  watch起到观察的作用：（1）无缓存，页面渲染时值不变也会执行；（2）可以执行异步操作；  
## HTTP协议

## 性能优化

