# 字节跳动

## 一面
1. 简单自我介绍：没什么好说的...

2. 讲讲项目的亮点以及遇到的难题  
因人而异吧，根据自己的实际情况展开讲讲

3. 如何获取html下所有使用到的元素标签
    1. 我想到的是递归的方式
    2. 面试官给到的方式是：document.querySelectorAll('*')

4. 如何在 冒泡阶段 或 捕获阶段 执行回调，以及如何阻止冒泡或者捕获
    1. 使用document.addEventListener()的第三个参数
    2. event.preventDefault() / event.stopPropagation();

5. promise的作用，以及如何中断promise的执行
    1. 解决了回调地狱的问题
    2. 解决了回调中错误无法被捕获的问题
    3. 中断执行promise，后续查了，可以使用返回一个pending态的promise进行中断；

6. 解释一下什么是事件循环机制，以及看以下代码，给出输出结果
    ```
    function A () {
      console.log('A');
    }

    function B () {
      console.log('B');
    }

    function C () {
      console.log('C');
    }

    function D () {
      console.log('D');
    }

    function E () {
      console.log('E');
    }

    function F () {
      console.log('F');
    }

    A();
    setTimeout(() => {
      B();
    }, 0);
    setImmediate(() => {
      C();
    })
    process.nextTick(() => {
      D();
    })
    Promise.resolve().then(() => {
      E();
    })
    F();
    ```

7. 实现instanceof
```
function _instanceof (obj, proto) {
  if (typeof obj === 'function' || typeof obj === 'object') {
    let __proto__ = obj.__proto__;
    while (__proto__) {
      if (__proto__ === proto.prototype) {
        return true;
      }
      __proto__ = __proto__.__proto__;
    }
    return false;
  }
  throw new Error('argument must be Object Or Function Type');
}
```

8. webpack的执行流程，以及hotModuleReplacementPlugin(热更新模块)是怎么知道你更新了哪一行代码?
    1. 执行流程
        * 解析配置参数，合并命令行和webpack.config.js文件的配置信息，输出最终的配置信息；  
        * 注册配置中的插件，让插件监听webpack构建生命周期中的事件节点，做出相应的反应；  
        * 解析配置文件中的entry入口文件，找出每个文件依赖的文件，递归执行；  
        * 在递归文件的过程中，根据文件类型和配置文件中的loader找出对应的loader对文件进行转换；  
        * 递归结束后得到文件最终的结果，根据entry配置生产代码chunk；  
        * 输出chunk到文件系统。
    2. 
9. 实现对象属性下划线转驼峰式
```
const obj = {
  name_abc: '123',
  name_bcd_efg: '456',
  name_ccc: [
    {
      name_xyz: '1'
    }
  ],
  name_ddd: {
    name_ee_ff: '222'
  }
}
=>
const obj = {
  nameAbc: '123',
  nameBcdEfg: '456',
  nameCcc: [
    {
      nameXyz: '1'
    }
  ],
  nameDdd: {
    nameEeFf: '222'
  }
}
```
当时在面试时实现如下
```
/**
 * 
 * @param {string} key 
 * @returns {string}
 */
function transformUnderscoreToCamelcase (key) {
  let keyArr = key.split(/_+/g);
  return keyArr.map((k,i)=> {
    if (i === 0) return k;
    let nk = k.toUpperCase().slice(0,1) + k.slice(1);
    return nk;
  }).join('')
}

/**
 * 
 * @param {Object} obj 
 * @returns {Object}
 */
function transform (obj) {
  const newObj = {};
  for (let k in obj) {
    let newKey = transformUnderscoreToCamelcase(k);
    let item = obj[k];
    if (Object.prototype.toString.call(item) === '[object Object]') {
      newObj[newKey] = transform(item);
    } else if (Object.prototype.toString.call(item) === '[object Array]') {
      newObj[newKey] = transform(item);
    } else {
      newObj[newKey] = item;
    }
  }
  return newObj;
}
```