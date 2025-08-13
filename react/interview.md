
# NextJS

0. React如何解决SSG数量过大问题？
	- 增量静态生成（ISR）- 核心策略：通过按需生成减少初始构建压力
	```js
	export async function getStaticPaths() {
		const hotPosts = await getHotPosts(1000); // 仅预生成部分内容；
		return {
			paths: hostPosts.map(post => ({ params: { id: post.id }})),
			fallback: "blocking", // 或true实现渐进式生成
		}
	}
	export async function getStaticProps({ params }) {
		const post = await getPost(params.id);
		return {
			props: { post },
			revalidate: 3600, // 增量更新
		},
	}
	// 优势：初始构建仅生成少量页面，其余企业在首次访问时按需生成；
	// CDN集成：配合Vercel/Netlify等自动平台自动缓存生成的页面；
	```
	- 分布式构建 - 水平扩展
		1. 方案A：数据分片
		```bash
		for i in {0..9}; do
			POST_SHARD=$i TOTAL_SHARDS=10 next build &
		done
		wait
		```
		```js
		// next.config.js中
		if (process.env.POST_SHARD) {
			const ids = await getAllPostIds();
			const shardSize = Math.ceil(ids.length / parseInt(process.env.TOTAL_SHARDS));
			const start = parseInt(process.env.POST_SHARD) * shardSize;
			module.exports = {
				// 覆盖getStaticPath返回当前分片的ids.slice
			}
		}
		```
		2. 方案B：TurboPack + 分布式缓存（Next13+）
		```bash
		next build --turbo
		```
		```env
		# 配合远程缓存
		export TURBO_REMOTE_CACHE_URL="s3://my-cache-bucket"
		export TURBO_API_TOKEN="xxx"
		```
	- 资源优化技术
		1. 内存管理
		```js
		const chunkSize = 1000;
		for (let i = 0; i < totalPosts; i+=chunkSize) {
			const chunk = posts.slice(i, i+chunkSize);
			await generateChunk(chunk);
		}
		```
		2. 文件系统优化
		```bash
		# 使用RAM Disk加速IO
		mount -t tmpfs -o size=20G tmpfs /build-cache
		# 输出到高性能存储
		next build --output=distributed-fs://build-output
		```
	- 混合渲染策略
		1. 首页/热门内容：预生成（SSG）
		2. 长尾内容：ISR按需生成
		3. 用户相关页面：SSR
	- 进阶优化手段
		1. 去重构建：next build --experimental-build-hash
		2. 构建缓存：experimental: { incrementalCacheHandlerPath: "./cache-handler.js" }
		3. 预热策略：curl "/api/prefetch?url=/post/1,...";
	- 监控与告警
		1. 部署指标监控：页面生成速率/内存使用峰值/构建分片均衡度；
	- 实施建议
		1. 优先实施ISR减少首次构建量；
		2. 从100节点分片集群开始，根据性能线性扩展；
		3. 使用SSD存储+内存缓存加速IO；
		4. 为长尾页面设置更长的revalidate时间；

1. Nextjs SSG在docker环境下的优化部署方案
	- 核心Dockerfile配置
	```dockerfile
	# 第一阶段：依赖安装
	FROM node:18-alpine as deps
	WORKDIR /app
	COPY package.json ./
	RUN npm install --fronzen-lockfile --network-timeout 100000
	# 第二阶段：构建阶段（可并行）
	FROM node:18-alpine as builder
	WORKDIR /app
	COPY --from=deps /app/node_modules ./node_modules
	COPY . .
	# 构建参数：分片控制
	ARG SHARD_INDEX=0
	ARG TOTAL_SHARDS=1
	# 设置构建缓存
	ENV NEXT_TELEMETRY_DISABLED 1
	RUN npm build --shard=$SHARD_INDEX --total-shards=$TOTAL_SHARDS
	# 第三阶段：运行时镜像
	FROM node:18-alpine as runner
	WORKDIR /app
	ENV NODE_ENV production
	ENV PORT 3000

	# 仅复制必要文件
	COPY --from=builder /app/package.json ./package.json
	COPY --from=builder /app/.next/standalone ./
	COPY --from=builder /app/.next/static ./.next/static
	COPY --from=builder /app/public ./public

	# 安全设置
	RUN addgroup -g 1001 -S nodejs
	RUN adduser -S nextjs -u 1001
	USER nextjs

	EXPOSE 3000
	CMD [ "node", "server.js" ]
	```
	- 关键优化策略
		1. 分布式构建（分片处理）
		```bash
		TOTAL_SHARDS=10

		for ((i = 0; i < $TOTAL_SHARDS; i++)); do
			docker build \
				--build-arg SHARD_INDEX=$i \
				--build-arg TOTAL_SHARDS=$TOTAL_SHARDS \
				-t myapp-builder-$i \
				. &
		done
		wait

		# 合并构建结果
		docker create --name app-builder myapp-builder-0
		for ((i = 1; i < $TOTAL_SHARDS; i++)); do
			docker run --rm -d --name temp-merge myapp-builder-$i sleep infinity
			docker exec temp-merge sh -c "cp -r /app/.next /app/shared-$i"
			docker cp temp-merge:/app/shared-$i/. ./merged/.next/
			docker stop temp-merge
		done
		docker run app-builder
		```
		2. 构建缓存优化
		3. 增量静态生成（ISR）配置
		4. 自定义缓存处理器
		5. 多阶段构建优化
			- 阶段一：仅安装依赖（利用docker层缓存）
			- 阶段二：并行分片构建
			- 阶段三：最小化运行时镜像
	- 最佳实践总结
		1. 分布式构建
			- 使用分片参数
			- 并行执行构建任务
			- 合并构建结果到共享存储
		2. 缓存策略
			- 使用redis作为isr缓存后端
			- 持久化构建缓存目录
			- 利用docker层缓存加速依赖安装
		3. 镜像优化
			- 使用多阶段构建
			- 基于alpine的轻量级镜像
			- 仅包含运行时必要文件（standalone模式）
		4. 安全加固
			- 使用非root用户运行
			- 最小化运行时权限
			- 禁用nextjs遥测
		5. 资源管理
			- Kubernetes资源限制
			- 垂直自动扩缩容
			- 使用emptyDir卷存储临时缓存
		6. 监控日志

2. Nextjs在Docker环境下的保活方案
	- 健康检查机制
		1. Dockerfile配置：HEALTHCHECK --interval=3s --start-period=5s --retries=3 CMD curl -f /health || exit 1
		2. Nextjs健康检查端点
		```js
		export default function health(req, res) {
			const dbHealthy = checkDatabaseConnection();
			const cacheHealthy = checkCacheHealth();
			res.status(dbHealthy && cacheHealthy ? 200 : 503).json({
				status: dbHealthy && cacheHealthy ? 'ok' : 'error',
				timestamp: Date.now(),
				dependencies: {
					database: dbHealthy,
					cache: cacheHealthy
				}
			});
		}
		```
	2. 进程管理方案
		- 方案A：使用Node进程管理
		```dockerfile
		RUN npm install -g pm2
		CMD ["pm2-runtime", "start", "server.js", "--name", "nextjs"]
		```
		- 方案B：使用内置Node集群
		```javascript
		const cluster = require('cluster');
		const numCPUs = require('os').cpus().length;

		if (cluster.isMaster) {
			for (let i = 0; i < numCPUs; i++) {
				cluster.fork();
			}
			cluster.on('exit', (worker, code, signal) => {
				cluster.fork();
			})
		} else {
			require("./next/standalone/server.js")
		}
		```
	3. 容器编排级保活：Docker Compose配置
	```yaml
	version: '3.8'
	services:
		nextjs:
			build: .
			restart: unless-stopped
			healthcheck:
				test: ["CMD", "curl", "-f", "http://localhost:3000/health || exit 1"]
				interval: 30s
				timeout: 10s
				retries: 3
				start_period: 5s
			depoly:
				resources:
					limits:
						cpus: "2",
						memory: 1G
				start_policy:
					condition: on-failure
					delay: 5s
					max_attempts: 3
					window: 120s
	```
	4. Kebernetes保活
	5. 内存泄漏防护
		- 启动脚本添加内存限制：CMD ["node", "--max-old-space-size=1024", "server.js"]
		- 使用内存监控启动重启
		```bash
		#!/bin/bash
		while true; do
			node --max-old-space-size=1024 server.js
			EXIT_STATUS=$?
			if [ $EXIT_STATUS -eq 0 ]; then
				exit 0
			else
				sleep 5
			fi
		done
		```
	6. 日志与监控集成
		- 结构化日志配置
		```js
		module.exports = {
			experimental: {
				outputFileTracingRoot: path.join(__dirname, '../../'),
				logging: {
					level: "info",
					transports: ["file", "console"]
				}
			}
		}
		```
		- Prometheus 监控端点
	7. 网络层保活
		- 设置TCP KeepAlive配置

3. nextjs的SSG、SSR、CSR的选择考量
	- 内容更新频率
		1. SSG适用常见
			- 博客/文档网站（更新频率<1次/小时）
			- 产品展示页（如电商商品详情页，通过ISR增量更新）
			- 营销落地页
		2. SSR适用场景
			- 用户仪表盘（含实时数据）
			- 个性化推荐页
			- 高频更新的新闻站
	- 性能敏感度
		1. 关键指标：SSG|SSR|CSR
			- TTFB：10-50ms|100-300ms|50-100ms
			- 优化选择
				1. 首屏速度敏感 —> SSG + 渐进式Hydration
				2. 交互复杂 —> CSR + 骨架屏
				3. 混合场景 -> 关键部分SSG/SSR + 非关键CSR；
	- SEO需求等级
		1. 必须SEO：纯SSG（最佳）、SSR（次优）、CSR+预渲染（next export）、CSR+动态元标签（next/head）
	- 数据获取特性
		1. 完全静态：纯SSG；
		2. 半动态：SSG + ISR；
		3. 用户个性化：SSR；
		4. 实时交互数据：CSR + SWR；
		5. 大体积数据：CSR + 分页加载；
	

# 面试题
1. 如果你有一个业务组件库，希望打包输出为 esm+cjs+dts，有什么思路？

   - rollup + typescript（推荐）

   ```js
   import typescript from "@rollup/plugin-typescript";
   import dts from "rollup-plugin-dts";
   import { nodeResolve } from "@rollup/plugin-node-resolve";
   import commonjs from "@rollup/plugin-commonjs";
   import postcss from "rollup-plugin-postcss";

   export default [
     {
       input: "src/index.ts",
       output: {
         dir: "dist/esm",
         format: "esm",
         preserveModules: true,
         preserveModulesRoot: "src",
       },
       plugins: [
         nodeResolve(),
         commonjs(),
         postcss(),
         typescript({
           tsconfig: "tsconfig.json",
           declaration: false,
           outDir: "dist/esm",
         }),
       ],
       external: ["react", "react-dom"],
     },
     {
       input: "src/index.ts",
       output: {
         dir: "dist/cjs",
         format: "cjs",
         exports: "named",
         preserveModules: true,
         preserveModulesRoot: "src",
       },
       plugins: [
         nodeResolve(),
         commonjs(),
         postcss(),
         typescript({
           tsconfig: "./tsconfig.json",
           declaration: false,
           outDir: "dist/cjs",
         }),
       ],
       external: ["react", "react-dom"],
     },
     {
       input: "src/index.ts",
       output: {
         file: "dist/types/index.d.ts",
         format: "es",
       },
       plugins: [
         dts({
           tsconfig: "./tsconfig.json",
         }),
       ],
     },
   ];
   ```

2. AI 工具中，经常提到的 mcp 是什么，有哪些与前端方向结合的场景？

   - MCP 的核心概念：MCP 在 AI 领域中通常指 Model-Control-Prediction（模型-控制-预测）框架，是智能系统中常见的架构模式；
     1. model（模型）：AI 核心算法/神经网络模型；
     2. control（控制）：系统调度和决策逻辑；
     3. prediction（预测）：基于输入的推理输出；
   - 前端领域的 MCP 结合常见
     1. 智能 UI 生成
        - 模型：设计稿识别模型；
        - 控制：组件树生成逻辑；
        - 预测：输出可运行的前端代码；
        - 案例：GPT-4 Vision 识别设计图生成 React 代码；
     2. 前端性能优化
        - 模型：LSTM 预测资源加载时间；
        - 控制：动态调整预加载策略；
        - 预测：预估用户下一步可能访问的路由；
     3. A/B 测试智能化
        - 模型：多臂老虎机；
        - 控制：流量分配策略；
        - 预测：转化率最优的 UI 版本；
   - 推荐技术栈
     1. 模型层
        - TensorFlow.js
        - ONNX Runtime Web
        - HuggingFace.js
     2. 控制层
        - RxJS（响应式编程）
        - XState（状态管理）
     3. 预测层
        - WebAssembly
        - WebGPU

3. 什么是 AIGC？

   - AIGC（AI Generated Content，人工智能生成内容）是指利用人工智能技术自动生成各种形式数字内容的新型内容生产方式；
   - 核心概念
     1. 技术本质：（1）基于深度学习和大规模预训练模型；（2）通过模式识别和概率计算生成新内容；（3）主要技术包括：GANs、Transformer、Diffusion Models 等；
     2. 与传统 AI 的区别
        - 传统 AI：识别分析 -> 分类/检测；
        - AIGC：创造生成 -> 文本/图像/视频/代码
   - 主流技术方向
     1. 文本生成：GPT-4、Claude、文心一言；以文章/代码/对话输出；应用于智能写作/编程助手；
     2. 图像生成：Stable Diffusion、DALLE；以图片/插画/设计稿输出；应用于艺术创作/广告设计；
     3. 音频生成：VITS、Jukebox；以语音/音乐输出；应用于虚拟主播/配乐制作；
     4. 视频生成：Runway、Pika；以视频/动画输出；应用于短视频制作/影视预演；
     5. 3D 模型生成：Point-E、GET3D；以三维模型输出；应用于游戏开发/工业设计；

4. 如果要做一个类似 ChatGPT 的聊天 UI，前端如何处理流式响应？

   - 核心技术方案
     1. 使用 Server-Sent-Event（SSE）
     ```js
     const eventSource = new EventSource("/api/chat");
     eventSource.onmessage = (event) => {};
     eventSource.onerror = (error) => {};
     ```
     2. 使用 FecthApi + 流失读取
     ```js
     const res = await fetch("/api/chat", {});
     const reader = res.body.getReader();
     const decoder = new TextDecoder();
     while (true) {
       const { done, value } = await reader.read();
       if (done) break;
       const chunk = decoder.decode(value);
       const lines = chunk.split("\n").filter((line) => line.trim());
       for (const line of lines) {
         if (line.startsWith("data: ")) {
           const data = JSON.parse(line.slice(6));
           updateUI(data);
         }
       }
     }
     ```
   - 关键优化点
     1. 性能优化：使用防抖更新 UI
     2. markdown 支持；
     3. 打字机效果增强；
   - 错误处理与边界情况
     1. 网络中断处理；
     2. 恢复中断的流；

5. 怎么理解 ESM 中的 export \* from "a.js"这种写法？

   - 语法含义：export \* from "a.js"
     1. 从 a.js 模块导入所有命名导出（不包括默认导出）；
     2. 将所有这些导出原样暴露给当前模块的使用者；
   - 与普通导出的区别
     1. export \* from "a.js"：所有命名导出，不包含默认导出；
     2. export {foo} from "a.js"：指定导出，不包含默认导出；
     3. export { default } from "a.js"：仅默认导出，包含默认导出；

6. template 标签为什么不可以使用 v-show？

   - 根本原因
     1. DOM 结构限制
        - v-show 通过设置 display:none 控制元素显示/隐藏；
        - template 是 HTML5 的文档片段元素，浏览器本身不会渲染它本身；
        - 设置 display:none 对 template 无效，因为它本身就不在渲染树中；
     2. vue 的实现机制：el.style.display = value ? el.\_originalDisplay : "none";
        - template 没有 style 属性可以操作；
   - 技术对比
     1. v-if + template
        - 条件为假时移除整个 DOM 节点；
        - 触发组件的创建/销毁；
        - 运行时条件变化少的区块；
     2. v-show + 普通元素
        - 仅切换 display 样式；
        - 只隐藏，不销毁实例；
        - 需要频繁切换显示的元素；

7. js 中 Boolean 和 boolean 有什么区别？

   - Boolean：属于构造函数、通过 new Boolean(value)创建、typeof==='object'、instanceof === true、极少使用；
   - boolean：原始数据类型、直接赋值使用、typeof==='boolean'、instanceof===false、日常布尔值处理；
   - 重要注意事项
     1. 隐式转换陷阱
     ```js
     const fakeTrue = new Boolean(false);
     if (fakeTrue) {
       console.log("会执行!");
     }
     ```
     2. 类型系统差异
     ```ts
     let flag: boolean = Boolean(1);
     let wrongFlag: boolean = new Boolean(1); // 不能将Boolean类型赋值给boolean类型；
     ```
     3. 相等性比较
     ```js
     true === true; // true
     new Boolean(true) === new Boolean(true); // false
     ```

8. ts 工具类型 Exclude 和 Omit 的区别？

   - Exclude<T, U>：从类型 T 从排除可以赋值给 U 的类型（适用于联合类型）

   ```ts
   type T = string | number | boolean;
   type Result = Exclude<T, number>; // Result = string | boolean;

   type _Exclude<T, U> = T extends U ? never : T;
   ```

   - Omit<T, K>：从类型 T 中排除指定的属性 K（适用于对象类型）

   ```ts
   interface User {
     id: number;
     name: string;
     age: number;
     email: string;
   }
   type UserBasicInfo = Omit<User, "age" | "email">;
   // 等价于
   type UserBasicInfo = {
     id: number;
     name: string;
   };
   type _Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
   ```

   - 总结使用指南
     1. 使用 Exclude：（1）需要从联合类型中过滤掉特定类型；（2）处理类型层面的排除操作；
     2. 使用 Omit：（1）需要从对象类型中移除特定属性；（2）创建现有对象类型的简化版本；
     3. 可以组合使用：（1）先用 Omit 移除对象属性；（2）再用 Exclude 处理属性值的类型；

9. 对于 PC 端的 banner 组件，怎么适配超宽的屏幕？

   - 设计策略
     1. 核心区：保持 1920px 宽度内展示完整内容；
     2. 扩展区：超宽屏幕两侧用可延展元素填充；

10. 说说 pinia 和 vuex 的区别？

    - vuex
      1. 基于 flux 架构实现；
      2. 单一全局 store，包含 modules；
      3. 需要额外声明 ts 支持；
      4. 约 40kb；
    - pinia
      1. 基于 composition api 实现；
      2. 多个独立 store；
      3. 原生完美支持 ts；
      4. 约 10kb；
    - 性能与开发体验
      1. pinia
         - 减少模板代码（无需 mutations/actions）；
         - 自动代码补全；
         - 热模块替换无需重载页面；
      2. vuex
         - 严格流程适合大型团队规范；
         - 需要手动维护类型定义；

11. 使用 const 定义函数和直接用 function 声明有什么区别？

    - 核心区别对比
      1. const 定义函数
        - 仅变量声明提升；
        - 具有块级作用域；
        - 不可重新赋值声明；
        - 可匿名；
        - 不可作为构造函数（箭头函数实体）
        - 调试栈追踪显示变量名；
      2. function 声明函数
         - 函数声明提升；
         - 具有函数作用域；
         - 可以重新赋值声明；
         - 必须具名；
         - 可以作为构造函数使用；
         - 调试栈追踪显示函数名；
    - 性能与调试
      1. 现代引擎优化
         - v8 等引擎对两种形式的优化程度相当；
         - 匿名函数表达式可能影响调试；
      2. 内存占用
         - function 声明会提前创建函数对象；
         - const 表达式在赋值时才创建；
    - 实际应用建议
      1. 推荐使用 const 的情况
         - 需要块级作用域；
         - 避免意外重写；
         - 箭头函数场景（需要继承外部 this）
      2. 推荐使用 function 的情况
         - 需要构造函数
         - 递归函数
         - 需要前置调用的工具函数；

12. position 的 sticky 有什么应用场景？

    - position: sticky 是 CSS 中一种独特的定位方式，它结合了相对定位（relative）和绝对定位（absolute）的特性；

    ```css
    .sticky-element {
      position: sticky;
      top: 0; /** 触发粘性定位的阈值 */
    }
    /** 混合定位：元素在视口内表现为fixed，在父容器内表现为relative */
    /** 滚动依赖：需要与top/bottom/left/right配合使用 */
    /** 容器限制：粘性效果只在父容器内有效 */
    ```

    - 典型应用场景
      1. 导航栏固定：页面滚动时导航栏始终可见，增强用户体验；
      2. 表格标题固定：大数据表格滚动时保持表头可见，便于数据对照；
      3. 侧边栏目录：长文阅读时的快速导航；
      4. 渐进式显示操作栏：平时半透明隐藏，滚动到底部或悬停时完全显示；

13. ChatGPT 的对话功能实现，为什么选择 SSE 而非 WebSocket？

    1. 符合对话场景的单向数据流需求
       - AI 对话本质：客户端发送请求 -> 服务器流式返回响应；
       - 不需要双向实时交互（如聊天室的频繁双向通信）；
       - WebSocket 的全双工能力在此场景下冗余；
    2. 更简单的实现架构
       - 复用现有 HTTP 基础设施；
       - 无需维护单独的 WebSocket 连接池；
       - 天然兼容 RESTful API 体系；
    3. 原生支持流式中断

    ```js
    const eventSource = new EventSource("/api/chat");
    eventSource.close(); // 直接关闭
    ```

    4. 内置重连机制

    ```js
    eventSource.addEventListener("error", (event) => {
      setTimeout(() => {
        new EventSource("/api/chat");
      }, 3000);
    });
    ```

    5. 更低的开销
       - SSE：保持 1 个 HTTP 长连接；无额外握手开销；
       - WebSocket：需要升级协议握手；
    6. 性能优化考量
       - SSE：内存占用较低、CPU 消耗较低、连接数上限同 HTTP 限制；
       - WebSocket：内存占用较高、CPU 消耗较高、连接数更高但更耗资源；
    7. 数据传输效率：对于文本为主的 AI 响应，SSE 的简单格式更高效；不需要 WebSocket 的二进制帧封装开销；

14. 怎么让页面上的某块区域全屏展示？

    - 使用浏览器全屏 API

    ```js
    const el = document.getElementById("fullscreen");
    function enterFullscreen(el) {
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.msRequestFullScreen) {
        el.msRequestFullScreen();
      }
    }
    function exitFullscreen(el) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
    ```

15. 怎么理解 vue3 提供的 markRaw？

    - markRaw：是 vue3 响应式系统中一个重要的 API，用于显式标记对象不被转换为响应式代理。
    - 基本定义：function markRaw<T extends object>(value: T): T;
      1. 作用：标记一个对象为“原始”（非响应式）
      2. 返回值：返回传入的原始对象本身；
      3. 特点：被标记的对象及其嵌套属性都不会被转换为响应式；
    - vue 响应式系统基础
      1. reactive：普通对象 -> reactive -> 响应式代理 -> 修改 -> 触发更新；
      2. markRaw：普通对象 -> markRaw -> 标记对象 -> reactive -> 直接返回原始对象；
    - 典型使用场景
      1. 大型不可变数据；
      2. 第三方库实例；
      3. 避免不必要的响应式转换；

16. js 中本地对象、内置对象、宿主对象分别是什么，有什么区别？

    - 本地对象
      1. 基本特征
         - 由 ECMAScript 规范明确定义；
         - 与执行环境无关，在任何 js 实现中都存在；
         - 需要通过 new 关键字实例化；
      2. 主要本地对象：Object、Array、Function、Boolean、Number、String、Date、RegExp、Error；
    - 内置对象
      1. 基本特征
         - 由 js 引擎预先实现；
         - 无需实例化即可直接使用；
         - 本质上是特殊的本地对象；
      2. 常见内置对象：Math、JSON、Reflect、Atomics、Symbol、Promise、Proxy；
    - 宿主对象
      1. 基本特征
         - 由执行环境提供（浏览器/Nodejs 等）
         - 不同环境提供的对象不同；
         - 行为可能不完全遵循 ECMAScript 规范；
      2. 浏览器环境宿主对象：window、navigator、history、location、document、HTMLElement、XMLHttpRequest；
      3. Nodejs 环境宿主对象：global、process、Buffer、fs、http；
    - 关键区别解析
      1. 创建方式差异
      ```js
      const date = new Date(); // 本地对象需要实例化
      const random = Math.random(); // 内置对象直接使用
      const body = document.body; // 宿主对象由环境提供
      ```
      2. 可扩展性对比
      ```js
      Array.prototype.myMap = function (fn) {}; // 本地对象原型可扩展
      Math.customProps = 1; // 内置对象通常不可扩展
      document.__proto__.customMethod = function () {}; // 宿主对象扩展性取决于环境：
      ```

17. 怎么处理微信小程序里的静默授权异步问题？

    - 微信小程序的静默授权（如获取 openid 和 session_key）是一个异步过程，正确处理其异步流程对保证应用稳定性至关重要。
    - 静默授权流程的异步特性：小程序 -> wx.login 获取 code -> 微信服务器 -> 返回临时 code -> 小程序 -> 发送 code -> 开发者服务器 -> code+appid+secret -> 微信服务器 -> 返回 openid+session_key -> 开发者服务器 -> 返回自定义登录态 -> 小程序；
    - Promise 封装基础流程

    ```js
    async function silentAuth() {
      try {
        const code = await wxLogin();
        const res = await authRequest(code);
        return res.data;
      } catch (err) {
        throw err;
      }
    }
    ```

    - 最佳实践建议
      1. 用户无感知：静默授权不应干扰用户操作流程；
      2. 错误降级：静默失败后应有备用方案；
      3. 频率控制：避免频繁调用 wx.login
      4. 安全存储：session_key 应保存在服务端，客户端只存自定义 token；

18. 如何检测对象是否循环引用？

    - 循环引用指的是对象属性间接或直接引用自身的现象，检测这种结构对于避免内存泄漏和序列化错误非常重要；
    - 检测方法

      1. JSON.stringify：无法定位具体引用路径，大对象性能差；

      ```js
      try {
        JSON.stringify(obj);
      } catch (err) {
        e.message.includes("circular") || e instanceof TypeError;
      }
      ```

      2. 递归检测法（精确定位）

      ```js
      function detectCircular(obj) {
        const seen = new WeakSet();
        function _detect(obj, path = []) {
          if (obj && typeof obj === "object") {
            if (seen.has(obj)) {
              return {
                isCircular: true,
                path: [...path, "CIRCULAr_REF"],
              };
            }
            seen.add(obj);
            for (const key in obj) {
              if (Object.hasOwnProperty.call(obj, key)) {
                const result = _detect(obj[key], [...path, key]);
                if (result.isCircular) return result;
              }
            }
            seen.delete(obj);
          }
          return { isCircular: false };
        }
      }
      ```

      3. 路劲缓存 + 最大深度控制

      ```js
      function safeDetectCircular(obj, maxDepth = 20) {
        const seen = new WeakSet();
        function _detect(current, depth = 0, path = []) {
          if (depth > maxDepth) return { isCircular: false };

          if (current && typeof current === "object") {
            if (seen.has(current)) {
              return {
                isCircular: true,
                path: [...path, "CIRCULAR_REF"],
              };
            }
            seen.set(current, path);
            const keys = Object.keys(current);
            for (const key of keys) {
              const result = _detect(current[key], depth + 1, [...path, key]);
              if (result.isCircular) return result;
            }
            seen.delete(current);
          }
          return { isCircular: false };
        }
        return _detect(obj);
      }
      ```

    - 可视化工具方案
      1. circular-json：可序列化循环引用；
      2. flatted：更现代化的循环结构处理；
      3. cycle.js：Douglas Crockford 的实现；
    - 选择建议
      1. 只需要知道是否存在循环：JSON.stringify(obj)
      2. 需要调试定位问题：WeakSet 递归法；
      3. 生产环境处理大对象：路径缓存方案；
      4. 需要序列化：使用 flatted 等库；

19. postMessage 是如何解决跨域问题？

    - 跨域通信机制：windowA -> postMessage(message, targetOrigin) -> windowB -> 消息事件监听 -> windowA；
      1. 安全沙箱突破：绕过同源策略限制；
      2. 显式授权：通过指定 targetOrigin 参数，控制消息接收方；
      3. 异步通信：基于事件的消息传递；
    - 解决跨域的具体方式
      1. 安全域名验证
      ```js
      iframe.contentWindow.postMessage(message, targetOrigin);
      window.addEventListener("message", (e) => {
        if (e.origin !== targetOrigin) return;
        // safe message
      });
      ```
      2. 多窗口通信示例
      ```html
      <iframe id="iframe" src="xxx" />
      ```
      ```js
      const iframe = document.getElementById("iframe");
      iframe.onload = () => {
        iframe.contentWindow.postMessage("hello", "*");
      };
      window.addEventListener("message", (e) => {
        if (e.origin !== "*") return;
      });
      ```
      ```js
      window.addEventListener("message", (e) => {
        if (e.origin !== "*") return;
      });
      ```
    - 安全实践要点
      1. 必须验证 origin
      2. 敏感操作二次验证
    - postMessage 通过以下设计解决跨域问题
      1. 显式目标声明：强制发送方指定接收方 origin；
      2. 接收方验证：要求接收方检查消息来源；
      3. 数据不可执行：只传递数据而非代码；
      4. 协议无关：不依赖 HTTP 头配置；

20. react-router 中，HashRouter 和 BrowserRouter 的区别和原理？

    - HashRouter
      1. 工作原理：URL Hash 变化 -> 触发 window.onhashchange -> react-router 监听变化 -> 匹配对应路由组件；
      2. 关键技术
         - 使用 window.location.hash 管理路由状态；
         - 监听 hashchange 事件；
         - URL 格式：http://example.com/#/path；
      3. 源码简析
      ```jsx
      class HashRouter extends React.Component {
        componentDidMount() {
          window.addEventListener("hashchange", this.handleHashChange);
        }
        handleHashChange = () => {
          const path = window.location.hash.slice(1);
          // 更新路由状态
        };
        render() {
          return <Router history={createHashHistory()} />;
        }
      }
      ```
    - BrowserRouter
      1. 工作原理：pushState/replaceState -> 触发 popstate 事件 -> react-router 监听变化 -> 匹配对应路由组件
      2. 关键技术
         - 使用 HistoryAPI（pushState、replaceState）实现路由跳转
         - 监听 popstate 事件；
         - URL 格式：http://example.com/path
      3. 源码简析
      ```jsx
      class BrowserRouter extends React.Component {
        history = createBrowserHistory();
        componentDidMount() {
          this.unlisten = this.history.listen((location) => {
            // 处理路由变化
          });
        }
        render() {
          return <Router history={this.history} />;
        }
      }
      ```
    - 应用场景选择
      1. 使用 HashRouter
         - 无需服务器配置：静态文件服务器或无法配置服务器时；
         - 兼容老旧浏览器：需要支持 IE9 及以下版本；
         - 简单应用：快速原型开发或演示项目；
      2. 使用 BrowserRouter
         - 需要干净 URL：追求专业 URL 格式；
         - SEO 重要：搜索引擎优化是关键技术；
         - 现代浏览器环境：无需支持老旧浏览器；
         - 服务器可配置：能处理 HTML History API；
    - 高级特性对比
      1. 状态管理：history.push("/path", { some: "state" }) //可以使用 state；
      2. 滚动恢复：BrowserRouter 内置滚动恢复行为；HashRouter 需要手动实现；
      3. 基准 URL：basename="/app";
    - 性能考量
      1. 初始化速度：HashRouter 稍快、差异在毫秒级通常可忽略；
      2. 内存占用：BrowserRouter 需要维护更多状态，现代设备上差异不明显；
      3. 导航性能：两个都是客户端路由，无需重载页面；性能差异主要取决于应用代码；
      4. 选择依据基于：
         - 目标浏览器支持情况；
         - 服务器配置能力；
         - SEO 需求；
         - URL 美观度需求；

21. Proxy 和 Object.defineProperty()的区别是啥？

    - Object.defineProperty()特点
      1. 直接修改原对象；
      2. 必须预先定义属性；
      3. 无法检测属性删除；
      4. Object.defineProperty()只能拦截：（1）get；（2）set；
    - new Proxy()特点
      1. 创建对象的代理包装；
      2. 无需预定义属性；
      3. 可拦截更多操作类型；
      4. Proxy 可拦截的 13 种操作：get/set/has/deleteProperty/apply/construct/getOwnPropertyDescriptor/defineProperty/getPrototypeOf/setPrototypeOf/isExtensible/preventExtensions/ownKeys/
    - 应用场景选择
      1. 使用 Object.defineProperty
         - 需要支持老旧浏览器；
         - 只需要拦截少量已知属性；
         - 对性能要求极高；
         - 不需要拦截 delete 等操作；
      2. 使用 Proxy
         - 需要拦截未知/动态属性；
         - 需要更全面的操作拦截；
         - 需要处理数组变化；
         - 现代浏览器环境；
         - 实现高级模式：（1）数据验证；（2）自动发布/订阅；（3）虚拟化对象；

22. es5 和 es6 使用 new 关键字实例化对象的流程是一样的吗？

    - 核心流程共性
      1. 创建新对象：创建一个空的普通 js 对象{};
      2. 原型连接：将新对象**proto**指向构造函数的 prototype 属性；
      3. 绑定 this：将新对象作为 this 上下文执行构造函数；
      4. 返回对象：如果构造函数没有返回对象，则返回 this；
    - 继承差异对比
      1. super()要求
         - ES6 派生类必须在 this 前调用 super；
         - ES5 无此限制，但需要手动调用父构造函数；
      2. 原型链建立机制
      ```js
      Object.setPrototypeOf(Child.prototype, Parent.prototype);
      Object.setPrototype(Child, Parent);
      ```
      3. 内置类继承
         - ES5 无法正确继承 Array 等内置类；
         - ES6 可以通过 class MyArray extends Array 实现；
    - 总结
      1. ES6 的 class 是语法糖，但强制了更规范的面向对象实践；
      2. 继承实现机制有本质不同（特别是内置类继承）
      3. ES6 提供了更严格的错误检查和更好的静态成员支持；
      4. 现代引擎对 class 有专门优化；

23. 如何实现可过期的 localStorage 数据？

    - 封装带过期时间的存储方法

    ```js
    const storage = {
      set(key, value, expire) {
        const item = {
          value,
          expire: expire ? Date.now() + expire * 1000 : null,
        };
        localStorage.setItem(key, JSON.stringify(item));
      },
      get(key) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;
        const item = JSON.parse(itemStr);
        if (item.expire && Date.now() > item.expire) {
          localStorage.removeItem(key);
          return null;
        }
        return item.value;
      },
      remove(key) {
        localStorage.removeItem(key);
      },
    };
    ```

    - 自动清理过期数据的封装

    ```js
    class ExpirableStorage {
    	constructor(namespace = "") {
    		this.namespace = namespace;
    	}

    	_getKey(key) {
    		return this.namespace ? `${this.namespace}:${key}` : key;
    	}

    	set(key, value, maxAge) {
    		const payload = {
    			data: value,
    			_expire: maxAge ? Date.now() + maxAge * 1000 : null
    		};
    		localStorage.setItem(this._getKey(key), JSON.stringify(payload))
    	}

    	get(key) {
    		const fullKey = this._getKey(key);
    		const item = localStorage.getItem(fullKey);
    		if (!item) return null;
    		try {
    			const { data, _expire } = JSON.parse(item)
    			if (_expire && Date.now() > _expire) {
    				this.remove(key);
    				return null;
    			}
    			return data;
    		} catch() {
    			return null;
    		}
    	}

    	remove(key) {
    		localStorage.removeItem(this._getKey(key));
    	}

    	clearExpired() {
    		Object.keys(localStorage).forEach(key => {
    			if (key.startsWith(this.namespace)) {
    				this.get(key.split(":")[1]);
    			}
    		})
    	}
    }
    ```

24. 以用户为中心的前端性能指标有哪些？

    - Largest Contentful Paint(LCP)：页面主要内容加载完成时间（即用户看到主内容的时间）；目标 ≤2.5s；影响因素：图片加载、服务器响应、js 渲染等；
    - First Input Delay（FID）：用户首次与页面交互（如点击按钮）到页面实际开始处理该交互的时间；目标 ≤100ms；反映页面的响应能力；FID 仅适用于加载过程中的交互，不能测量加载后的延迟；
    - Cumulative Layout Shift（CLS）：页面元素在渲染过程中发生意外布局偏移程度；目标小于等于 0.1s；常见原因：图片未设置宽高、动态插入内容、字体加载等；
    - First Contentful Paint（FCP）：页面首次绘制任何内容（文本、图片、非空白 canvas 等）的时间；反映“页面开始有内容”的感知速度；
    - Time To Interactive（TTI）：页面从开始加载到具备完整交互能力的时间；衡量 js 执行完毕、主逻辑可操作的时间点；
    - Interaction to Next Paint（INP）：测量用户所有交互动作最差的一次响应时间；目标：≤200ms；

25. 如何组织 monorepo 工程？

    - 按功能划分目录

    ```html
    monorepo/ -- packages/ -- shared-utils/ -- core-libs/ -- components/ --
    apps/ -- web-apps/ -- admin-panel/ -- mobile-app/ -- services/ --
    auth-services/ -- data-services/ -- config/ -- scripts/
    ```

    - 常用工具链
      1. lerna：包管理器，支持多包版本控制与发布；
      2. Nx：支持多种语言（JS/TS/Java/.NET），提供智能任务调度和缓存；
      3. Turborepo：高性能构建系统，基于文件内容缓存；
      4. pnpm：支持 workspace 协议，实现本地包引用与零拷贝安装；
      5. Typescript Path Mapping：实现@shared/utils 等别名导入；
    - 构建与部署策略
      1. 构建方式
         - 增量构建：Turborepo/Nx 支持根据变更自动构建受影响项目；
         - 全量构建：所有项目全部重新构建，适合小项目或首次构建；
         - 按需构建：使用 Lerna 的 run build --scope=xxx 构建指定包；
      2. 部署方式
         - 微前端架构：各子应用独立打包为远程模块；
         - SSR 应用：使用 Nx/Turbo 构建后统一部署；
         - 服务端 API：拆分为独立服务器或 Docker 容器部署；

26. 为什么小程序中无法使用 dom 相关的 api？

    - 主要原因是因为小程序的运行环境与浏览器不同，其渲染机制和底层架构也存在本质差异；
    - 小程序架构特点
      1. 双线程模型（两个线程通过桥协议进行通信，而不是在同一个上下文中操作 DOM）
         - 逻辑层：处理 js 逻辑、数据绑定、事件处理等；在 JS 引擎运行；
         - 渲染层：渲染视图结构（WXML）、样式（WXSS）；在 WebView 或自定义渲染引擎运行；
      2. 非标准浏览器环境：小程序运行在厂商定制的环境中，并不具备完整的浏览器功能；
         - 没有真正的 window、document 全局对象；
         - 不支持原生 DOM 操作 API；
         - 不能直接访问或修改页面节点结构；
    - 为什么禁止使用 DOM API？
      1. 性能限制
         - 原生 DOM 操作会引起页面重排/重绘，影响性能；
         - 小程序通过虚拟 DOM 差异对比更新视图，避免频繁操作真实节点；
      2. 安全隔离
         - 防止开发者绕过框架机制直接操作渲染层，破坏渲染一致性；
         - 避免恶意脚本注入或对宿主环境造成影响；
      3. 平台统一性
         - 小程序可能运行在多个平台上，需要抽象出统一的 API 接口；
         - 直接操作 DOM 会导致平台兼容性问题；

27. HTTP/3 的 QUIC 是什么协议？

    - QUIC（Quick UDP Internet Connection）是一种由 Google 开发、后被 IETF 标准化的基于 UDP 的高效传输协议，旨在解决传统 TCP 协议在现代 web 通信中的性能瓶颈；目标是替代传统的 TCP+TLS+HTTP/2 组合，提升网页加载速度和网络连接的可靠性；
    - 为什么需要 QUIC？
      1. TCP 建立连接延迟高，TCP 需要三次握手+TLS 加密协商可能需要多个往返；
      2. TCP 有队头阻塞，一个丢包可能导致整个流暂停；
      3. TCP 连接与 IP 绑定，移动设备切换网络时连接中断；
    - QUIC 的核心特性
      1. 0-RTT 连接建立：支持客户端在首次连接时就发送数据，减少握手次数；
      2. 内置加密（TLS1.3）：所有 QUIC 连接默认加密，安全性和性能同时优化；
      3. 多路复用：多个请求/响应流独立传输，避免队头阻塞；
      4. 连接迁移：支持客户端更换 IP 或网络接口仍保持连接；
      5. 快速确认机制：使用 ACK 帧实现更细粒度的丢包检测和恢复；
      6. 用户态拥塞控制：可拔插的拥塞控制算法，无需操作系统支持；
    - QUIC 和 HTTP/3 的关系
      1. HTTP/3 是 HTTP 协议的新版本；
      2. 它不再依赖 TCP，而是使用 QUIC 作为传输层协议；
      3. 在 QUIC 上，HTTP/3 的语义与 HTTP/2 类似，但解决了 HTTP/2 over TCP 的一些缺陷；

28. HTTP/3 是基于 UDP 的协议，那么它是如何保障安全性的？

    - 内置 TLS1.3 加密：HTTP/3 强制使用加密通信，所有数据在传输前都经过加密；
      1. 使用 TLS1.3 协议进行密钥交换和身份认证；
      2. 数据加密使用 AEAD 算法，如 AES-GCM 或 ChaCha20-Poly305；
      3. 所有握手过程与数据传输都在 QUIC 流中完成，不再依赖 TCP+TLS 分层；
    - 0-RTT 安全优化：TLS1.3 支持 0-RTT 数据传输
      1. 客户端在首次握手时就可以发送加密的应用数据；
      2. 服务端缓存会话信息，后续连接可直接复用，提升性能的同时保持安全性；
    - 多路复用与流级加密
      1. 每个 HTTP 请求/响应在一个独立的 QUIC 流中传输；
      2. 每个流的数据都单独加密，避免一个流的失败影响其他流；
    - 防止中间人攻击
      1. 客户端验证服务端证书链；
      2. 支持 SNI，确保连接到正确的主机；
      3. 支持 OCSP Staping、Certificate Transparency 等现代证书机制；
    - 抗 DDoS 和 IP 迁移保护
      1. QUIC 使用“源 CID”替代传统的 TCP 五元组来标识连接；
      2. 当客户端切换网络时，CID 保持不变，连接不中断；
      3. 服务器可以通过 Token 机制验证客户端是否合法，防止伪造请求；
    - QUIC 如何弥补 UDP 缺陷？
      1. 不可靠传输：通过 QUIC 自行实现丢包恢复、ACK 机制；
      2. 无连接状态：通过 QUIC 维护连接上下文、支持流控、拥塞控制；
      3. 无加密：通过 QUIC 内置 TLS1.3 强制加密；
      4. 易被拦截伪造：通过 QUIC 使用 Initial Packet 加密部分握手内容；

29. 前端如何实现截图？

    - html2canvas；
      1. 支持 DOM 元素截图；
      2. 支持配置截图质量；
      3. 处理复杂 css 样式；
      4. 跨域资源需要额外配置；
    - dom-to-image
      1. 轻量级；
      2. 支持 SVG 输出；
      3. 生成矢量图更清晰；
    - 浏览器 API 方案
      1. 使用 MediaDevices API（截取屏幕）：需要用户授权屏幕共享权限；
      2. 使用 WebRTC 截图；

30. 介绍下深度优先遍历和广度优先遍历，如何实现？

    - 深度优先遍历
      1. 遍历顺序：从起点出发，尽可能深地探索子节点；
      2. 数据结构：栈或递归实现；
      3. 适用场景：路径查找、拓扑排序、判断环、连通分量等；

    ```js
    // 递归
    function dfs(graph, start, visited = new Set()) {
      visited.add(start);
      for (let neighbor of graph[start]) {
        if (!visited.has(neighbor)) {
          dfs(graph, neighbor, visited);
        }
      }
    }
    // 栈
    function dfsIterative(graph, start) {
      const stack = [start];
      const visited = new Set();
      while (stack.length > 0) {
        const node = stack.pop();
        if (visited.has(node)) continue;
        visited.add(node);
        for (let neighbor of graph[node]) {
          if (!visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }
    }
    ```

    - 广度优先遍历
      1. 遍历顺序：从起点出发，先访问当前层的所有节点，在进入下一层；
      2. 数据结构：队列实现；
      3. 适用场景：最短路径、层级遍历、找最近解等；

    ```js
    function bfs(graph, start) {
      const queue = [start];
      const visited = new Set();
      while (queue.length > 0) {
        const node = queue.shift();
        if (visited.has(node)) continue;
        visited.add(node);
        for (let neighbor of graph[node]) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }
    }
    ```

    - 总结
      1. DFS 更适合“深入探索”，用于判断连通性、寻找路径、回溯问题；
      2. BFS 更适合“横向扩展”，适用于找最近距离、层级遍历、最短路径等文通；
      3. 在实际开发中，两者经常结合使用，例如在图搜索、游戏 AI、爬虫等领域

31. Promise 构造函数是同步执行的还是异步执行，那么 then 方法呢？

    - Promise 构造函数是同步执行的，当创建 promise 实例时，传入的执行器函数会立即同步执行；
    - then 方法是异步执行的，then 方法注册的回调函数是异步执行的，即使 Promise 已经 resolve 或 reject 状态；js 引擎会将 then 的回调放入微任务队列，等待当前同步代码执行完毕后才会执行；类似的，catch 和 finally 也是异步的，遵循同样的微任务机制；

32. 全局作用域中，用 const 和 let 声明的变量不在 window 上，那到底在哪里？如何去获取？

    - var 声明的变量在全局作用域中，会成为全局对象（如 window）的属性；const 和 let 声明的变量仍然在全局作用域中，但不会成为全局对象（如 window）的属性，而是储存在一个全局词法环境的独立空间中；
    - 由于 const/let 变量不在 window 上，但仍然在全局作用域中，可以直接访问；
    - 为什么 const/let 不在 window 上？
      1. 历史原因：var 是 es5 语法，设计上会绑定到全局对象；
      2. 块级作用域：const/let 是 es6 引入，具有块级作用域，不会污染全局对象，避免意外的全局变量冲突；
      3. 模块化：现代 js 鼓励模块化开发，减少对全局对象的依赖；
    - 可以使用 globalThis（ES2020 引入，跨环境全局对象）或直接检查变量是否存在；

33. vue 中的双向绑定和单向数据流原则是否冲突？

    - 不冲突：双向绑定和单向数据流通过不同的机制在不同场景下协作；
    - 单向数据流：（1）数据流单一：父组件向子组件传递数据（通过 props），子组件不能直接修改父组件的数据；（2）修改方式：子组件通过$emit 事件通知父组件，由父组件更新数据，确保数据可变可追踪；（3）可维护性：数据变更来源清晰，便于调试；（4）可预测性：避免子组件意外修改父组件状态；
    - 双向数据绑定：（1）语法糖：v-model 是:value+@input 的简写，本质上仍然是单向数据流+事件通信；（2）适用场景：表单输入、组件通信（如自定义输入组件）；

34. vue2 的响应式原理中 Object.defineProperty()有什么缺陷？

    1. 无法检测对象属性的新增或删除：Object.defineProperty()只能对已存在的属性进行劫持，如果动态添加新属性或删除属性，vue 无法检测到变化；
       - 解决方法：（1）使用 vue.set()或 this.$set()添加属性；（2）使用vue.delete()或this.$delete()删除属性；
    2. 无法监听数组的变化：Object.defineProperty()无法劫持数组的以下操作
       - 通过索引修改值（arr[0] = newValue）；
       - 直接修改数组长度（arr.length = newLength）；
       - vue2 的解决方案
         1. 重写数组的 7 种变更方法(push、pop、shift、unshift、splice、sort、reverse)，这些方法可以被 vue 劫持；
         2. 使用 vue.set()或 splice 修改数组索引；
    3. 性能问题：Object.defineProperty()需要递归遍历对象的每个属性进行劫持，如果对象层级很深（如嵌套的大对象），初始化时性能较差；vue2 必须在初始化时递归劫持所有属性，无法按需监听；
    4. 对 Map、Set、Class 等非纯对象支持不足：Object.defineProperty()只能劫持普通对象（plain object），无法直接监听 map、set、class 实例等复杂数据结构的变化；
       - 使用 Vue.observable()手动包装（功能有限）；
       - 依赖手动触发更新（this.$forceUpdate()）；
    5. 需要显式处理响应式依赖：由于 Object.defineProperty()的局限性，开发者需要额外注意：
       - 使用 Vue.set/Vue.delete 处理动态属性；
       - 避免直接修改数组索引；
       - 对复杂数据结构需手动优化；
    6. Vue3 改进：Proxy
       - 支持动态增删属性（无需 Vue.set/Vue.delete）；
       - 直接监听数组索引和长度变化；
       - 惰性监听（只有访问到的属性才会被劫持）；
       - 支持 Map、Set、Class 等数据结构；

35. 对象取值中 a.b.c 和 a['b']['c']有什么区别？

    - a.b.c：访问对象属性；属性名必须是合法的标识符（不能是数字、特殊字符等）；
      1. 属性名必须是静态的、合法的标识符；
      2. 适用于已知的、固定的属性名；
      3. 无法访问保护特殊字符或数字开头的属性；
      4. 解析速度稍快（引起可以直接优化静态属性访问）；
    - a['b']['c']：访问对象属性；属性名可以是任意字符串，包括数字、特殊字符等；
      1. 属性名可以是动态的（变量、表达式）；
      2. 适用于需要动态计算属性名的情况；
      3. 可以访问任意字符串形式的属性名，包括特殊字符或数字；
      4. 如果属性名是动态的，引擎需要额外计算，理论上稍慢（但实际影响极小）；

36. 进程、线程、协程分别是什么概念？

    - 进程：操作系统分配资源的基本单位，每个进程拥有独立的内存空间（堆、栈、代码段）、文件描述符、安全权限等；进程间通信（IPC）需要显式机制（如管道、消息队列、共享内存）；
      1. 独立性：一个进程崩溃不会直接影响其他进程；
      2. 开销大：创建、销毁或切换进程涉及到较高的 CPU 和内存开销（需要保存/恢复整个上下文）；
      3. 并行性：多进程可真正并行运行在多核 CPU 上；
    - 线程：CPU 调度的基本单位，属于同一个进程的多个线程共享进程的内存空间（如全局变量、文件句柄）；线程的创建、切换开销远小于进程；
      1. 共享资源：线程间可直接读写同一进程的数据（需同步机制如锁避免竞态条件）；
      2. 协作性：一个线程崩溃可能导致整个进程崩溃（共享内存被破坏）；
      3. 并发性：多线程在单核 CPU 上通过时间片轮转实现并发。多核 CPU 上可并行；
    - 协程：用户态的轻量级线程，由程序员在代码中显式调度（而非操作系统内核）；协程主动让出执行权（yield），而非被强制抢占；
      1. 极低开销：协程切换无需内核介入，通常在单线程内实现高并发；
      2. 无并行性：协程式单线程下的并发模型，无法利用多核 CPU（除非结合多线程）；
      3. 同步代码风格：用看似同步的代码实现异步操作（async/await）；
    - 如何选择？
      1. 需要强隔离性 -> 多进程（如安全敏感的沙箱环境）；
      2. 需要利用多核 CPU 计算 -> 多线程（如科学计算）；
      3. 高 IO 密集型任务（如网络请求） -> 协程（Go 的 goroutine、Python 的 asyncio）；

37. 单线程的 nodejs 是如何充分利用计算机 CPU 资源的？

    - Nodejs 虽然是单线程的 js 运行时，但它通过异步非阻塞 I/O、事件循环机制和底层多线程支持，能够高效利用 CPU 和系统资源。
    - 单线程 ≠ 单进程：nodejs 的主线程是单线程的，但底层通过 Libuv 库和操作系统能力实现了多线程的异步 I/O，从而避免阻塞主线程；
      1. 主线程：只负责运行 js 代码和调度事件循环；
      2. 工作线程：通过 Libuv 的线程池（默认 4 个线程）处理耗时的同步操作（如文件 I/O、DNS 解析等）；
      3. 系统内核：利用操作系统提供的异步 i/o 处理网络请求等非阻塞任务；
    - 事件循环机制：Nodejs 通过事件循环实现高并发，避免为每个请求创建线程。事件循环分为多个阶段，按优先级处理不同类型的任务；
      1. 非阻塞 I/O：主线程在等待 I/O 操作时，不会阻塞，而是继续处理其他任务；
      2. 高吞吐量：单线程可处理数千个并发连接；
    - 多进程优化（Cluster 模块）：为了利用多核 CPU，Nodejs 提供了 cluster 模块，通过主进程+多个子进程实现负载均衡；
      1. 多核并行：每个子进程独立运行事件循环，充分利用 CPU 资源；
      2. 共享端口：多个进程监听同一端口（由操作系统调度请求）；
    - WorkerThreads（工作线程）：对于 CPU 密集型任务（加密、图像处理）nodejs 提供了 worker_threads 模块，允许在独立线程中运行 js 代码；
      1. 避免阻塞主线程：耗时计算在子线程中运行，主线程保持响应；
      2. 共享内存：通过 SharedArrayBuffer 实现线程间数据共享（需谨慎同步）；
    - 异步编程模型：Nodejs 通过回调函数、Promise 和 async/await 实现异步代码的简洁表达；

38. 怎么实现同一个链接，pc 访问的 web 应用，而手机打开是 H5 应用；

    - 服务端动态渲染（SSR/后端适配）
      1. 原理：服务端根据请求的 User-Agent 判断设备类型，返回不同的 HTML 或重定向到不同页面；
      2. 实现步骤
         - 检测设备类型：通过 HTTP 请求头中的 User-Agent 区分 PC/移动设备；
         - 返回不同页面：PC 端返回完整 web 应用；移动端返回轻量级 h5 页面；
         - 优化 SEO：如果对 SEO 有要求，可以使用服务端渲染（SSR）动态生成内容；
    - 前端动态适配（响应性 + 条件加载）
      1. 原理：使用同一套代码，通过 css 媒体查询和动态加载组件实现不同设备的展示；
      2. 实现步骤
         - css 媒体查询：通过@media 实现响应式布局；
         - 动态加载组件：根据设备类型加载不同的组件；
         - 使用前端框架的适配方案：Vant+ElementUI；tailwindcss 提供响应式工具类；
    - Nginx/Apache 反向代理：通过 web 服务器根据 user-agent 路由请求到不同的前端资源；
    - Vary 头 + CDN 缓存：利用 CDN 的 Vary: User-Agent 缓存不同设备的内容，避免重复计算；
    - 最佳实践建议
      1. 优先选择前端动态适配：适合大多场景，维护成本低；
      2. 如果需要 SEO 或强适配：结合服务端渲染或 nginx 反向代理实现；
      3. 高并发全球业务：使用 CDN 缓存减轻服务器压力；

39. webpack 是如何给 web 应用注入环境变量的，说说它的原理；

    - Webpack 通过 DefinePlugin 和环境变量配置实现在构建阶段将环境变量注入到 Web 应用中，其核心原理是静态替换和代码生成；
    - 环境变量的注入原理
      1. 构建时注入：通过 DefinePlugin 在代码编译阶段直接替换变量；
      2. 运行时注入：通过 webpack-dev-server 或 HTML 模板动态传递变量；
      3. 核心机制：静态替换；webpack 在打包时会将环境变量直接替换为实际值（类似宏替换），而非保留变量名；
    - 关键工具：DefinePlugin，webpack 的内置插件，负责在编译阶段替换全局变量；
      1. 替换规则
         - 如果是字符串，需要 JSON.stringify 包裹（否则会替换为变量名而非字符串）；
         - 直接替换代码中的匹配标识符；
    - 环境变量来源
      1. 命令行传入：如果--env 参数传递变量；
      2. .env 文件（需借助 dotenv）：使用 dotenv-webpack 插件从.env 文件加载变量；
    - 不同环境的变量管理
      1. 开发环境 vs 生产环境：通过 webpack-merge 合并不同配置；
      2. 通过 HtmlWebpackPlugin 配合模板引擎注入变量；
    - 源码到产物的转换过程
      1. 解析阶段：webpack 读取源码时识别到 process.env.XXX 等全局变量；
      2. 替换阶段：DefinePlugin 将匹配的变量替换为定义的值；
      3. 优化阶段：Terser 等压缩工具进一步优化替换后的代码；
    - 注意事项
      1. 安全性：比如注入敏感信息，这些会被打包到前端代码中；
      2. 类型一致性：确保替换的值类型正确；
      3. 动态变量：如需运行时动态变量，需通过 window 对象或异步加载配置；

40. 为什么普通 for 循环的性能高于 forEach？

    - 底层实现机制
      1. for 循环
         - 直接控制迭代：通过索引直接访问数组元素，属于最基础的循环结构，无需额外函数调用；
         - 编译优化：js 引擎可以将其编译为高效的机器码，甚至进行循环展开等优化；
      2. forEach
         - 函数式编程抽象：forEach 是数组的高阶方法，每次迭代需要执行一个回调函数；
         - 额外开销
           1. 每次迭代都会创建新的函数执行上下文；
           2. 需要检查数组是否被修改；
           3. 回调函数可能涉及 this 绑定；
           4. 不能通过 break/return 提前终止；

41. 在 vue 的 v-for 时给每项元素绑定事件需要用到事件代理吗，为什么？

    - 直接绑定事件的潜在问题
      1. 内存消耗，每个元素都会创建一个独立的事件监听器，当 list 很大时，会导致大量内存占用；
      2. 性能开销：事件绑定和销毁（尤其是在动态列表）会触发频繁的 DOM 操作，影响性能；
    - 事件代理：将事件绑定到父元素，利用冒泡机制统一处理子元素事件；
      1. 内存优化：无论列表有多少项，只需要一个事件监听器；
      2. 动态列表友好：新增/删除子元素无需重新绑定事件；
      3. 兼容性：天然支持动态生成的子元素；
    - 何时需要直接绑定事件？
      1. 需要阻止事件冒泡（如嵌套列表，子项需要单独处理）；
      2. 自定义组件事件（非原生 DOM 事件）；
      3. 性能无关的小型列表；
    - 最佳实践
      1. 默认使用事件代理：尤其是长列表或频繁更新；
      2. 合理使用 key：即使使用事件代理，v-for 的 key 正确设置以优化 DOM 复用；
      3. 避免内联函数：直接绑定@click="handleClick(item)"会隐式创建新函数，可用事件代理或缓存方法优化；

42. vue3 的响应式库是独立出来的，如果单独使用是什么效果？

    - 独立使用响应式库的效果
      1. 数据响应式：自动追踪依赖，数据变化时触发副作用；
      2. 轻量级：无虚拟 DOM、组件系统等 vue 专属逻辑，仅响应式部分；
      3. 框架无关：可与 react、svelte 甚至原生 js 结合使用；
    - 关键 api 及其作用
      1. reactive：创建深层次响应式对象；
      2. ref：创建包装器，使原始类型值变为响应式；
      3. computed：创建计算属性，依赖变化时重新计算；
      4. effect：运行副作用函数，依赖的响应式数据变化时重新执行；
      5. watch：监听响应式数据变化，执行回调；
    - 实际应用场景
      1. 替代手动事件驱动的状态管理；
      2. 与 react 结合使用；
      3. 构建简易状态管理库；
    - 性能优势
      1. 精确更新，依赖追踪基于 Proxy，仅在数据被使用使收集依赖；
      2. 无虚拟 DOM 开销：直接操作 DOM 的场景可避免 diff 成本；
      3. 惰性计算：computed 值只在被访问时重新计算；
    - 局限性
      1. 无批量更新：vue 的异步更新队列（nextTick）需手动实现；
      2. 无生命周期：需自行管理副作用的清理；
      3. 调试工具：脱离 vue devtools 后，需手动实现调试日志；

43. const 和 readonly 的区别？

    - const
      1. 作用：（1）声明常量：变量标识符不可重新赋值；（2）块级作用域：仅在声明的作用域内有效；
      2. 特点：（1）编译时检查：由 js 引擎在语法层面强制约束；（2）仅限制赋值：不限制对象内部属性的改变；
    - readonly（vue3 的响应式 api）
      1. 作用：（1）创建只读代理对象：禁止任何层级的属性修改（深度只读）；（2）响应式保持：仍然是响应式对象，变化会触发依赖更新（但无法主动修改）；
      2. 特点：（1）运行时限制：通过 proxy 拦截修改操作并抛出警告；（2）深度只读：嵌套对象的所有属性均不可修改；

44. npm lock 文件的作用？

    - 核心作用是精确锁定依赖树结构，确保不同环境下的依赖安装结果完全一致；
    - 核心作用
      1. 版本精确锁定：记录所有依赖的具体版本，避免^~等语义化版本范围导致的版本浮动；
      2. 依赖树固化：（1）保存完整的依赖层级关系，解决“依赖地狱”问题；（2）确保 npm install 在不同环境安装完全相同的依赖结构；
      3. 安装加速：记录依赖包的下载地址（resolved）和哈希值（integrity），跳过版本解析和兼容性计算，直接下载缓存；
    - 为什么需要锁定文件？
      1. 始终安装锁定版本；
      2. 所有成员和 CI 使用完全相同的依赖；
      3. 锁定所有子依赖的版本和结构；
    - 文件生成规则
      1. 自动生成：当执行 npm install 时会自动创建或更新；
      2. 优先级：如果存在 lock 文件，npm 会优先按照它安装；npm-shrinkwrap.json 功能相同，但可发布到 registry；
    - 使用注意事项
      1. 提交到版本控制：（1）必须提交，否则团队成员或部署环境可能安装不一致的依赖；（2）例外：开发库项目时，若希望用户灵活安装依赖，可选择不提交；
      2. 更新依赖
         - 正确方式：npm update/npm install <pkg>;
         - 错误方式：手动修改 package.json 后不执行 npm install；直接编辑 package-lock.json；
      3. 与 yarn 的兼容性
         - yarn 的锁定是 yarn.lock，二者格式不兼容；
         - 混用 npm 和 yarn 可能导致依赖冲突，建议项目统一包管理工具；
    - 常见问题
      1. npm ci 和 npm install 的区别？
         - npm ci：严格依赖 package-lock.json；用于 ci 环境，确保安装结果绝对一致；
         - npm install：允许根据 package.json 更新 lock 文件；
      2. 库项目是否需要 lock 文件？
         - 推荐不提交：库项目应该允许用户灵活安装依赖版本，只需在 package.json 中指定合理范围；
         - 例外：若库需要通过 npm pack 测试完整安装流程，可临时生成但不提交；

45. react render 阶段的执行过程？

    - render 阶段的核心目标
      1. 生成新的 fiber 树：通过对比新旧 fiber 树，确定哪些组件需要更新；
      2. 收集副作用：标记需要插入、更新或删除的节点；
      3. 可中断的异步渲染：react16+引入的并发模式允许拆分 render 阶段为多个小任务，避免阻塞主线程；
    - 执行流程
      1. beginWork（向下遍历组件树）
         - 作用：处理当前 Fiber 节点，生成子 Fiber 节点；
         - 关键操作
           1. 调用组件 render 方法；
           2. 对比新旧 props 和 state，决定是否需要更新；
           3. 复用或创建新的 Fiber 节点；
           4. 标记副作用
         - 递归顺序：从根节点开始，深度优先遍历，直到叶子节点；
      2. completeWork（向上回溯完成工作）
         - 作用：处理 Fiber 节点的副作用，准备提交到 DOM；
         - 关键操作
           1. 对于宿主组件，创建 DOM 实例；
           2. 收集副作用到 effectList 链表；
           3. 处理 ref 和生命周期；
         - 回溯顺序：从叶子节点回到根节点，形成完整的 effectList；
    - 关键特性
      1. 可中断性
         - react 将 render 阶段分解为多个小任务，通过时间切片在浏览器空闲时执行；
         - 若任务被中断，react 会保存当前进度，稍后恢复；
      2. 副作用标记
         - 每个 fiber 节点可能被标记为以下副作用
           1. Placement：需要插入 DOM；
           2. Update：需要更新属性/内容；
           3. Deletion：需要删除 DOM；
           4. Snapshot：类组件的 getSnapshotBeforeUpdate 生命周期；
         - 副作用通过 effectList 链表串联，供 commit 阶段批量处理；
      3. Diff 算法优化
         - 同级节点比较：通过 Key 和类型匹配，减少不必要的重建；
         - 提前退出：若组件 shouldComponentUpdate 返回 false，跳过子树渲染；

46. postcss 是什么，有什么作用？

    - postcsss 是一个用 js 编写的 css 处理工具，它通过插件体系将 css 转换为抽象语法树，然后允许开发者通过插件堆 css 进行各种转换和优化。其核心目标时模块化、可扩展的 css 处理，已成为现代前端工具链的重要组成部分；
    - 核心特点
      1. 插件化：所有功能通过插件实现，可按需组合；
      2. AST 驱动：将 css 解析为抽象语法树，支持精确的代码分析和转换；
      3. 高性能：基于 js，与 nodejs 工具链无缝集成，编译速度快；
      4. 未来 css 支持：允许开发者提前使用草案阶段的 css 特性；
    - 主要作用
      1. 自动添加浏览器前缀；
      2. css 模块化；
      3. 支持现代/实验性 css 语法；
      4. 代码优化：（1）压缩 css：删除注释、空白符、合并重复规则；（2）删除未使用的 css：基于 HTML/JS 文件分析；
      5. 代码检查与风格约束：（1）StyleLint：检查 css 语法错误、强制代码风格；（2）排序 css 属性：按字母顺序排列属性；
    - 工作原理
      1. 解析 css：将 css 文件解析为 ast；
      2. 插件处理：按插件顺序遍历 ast 并转换代码；
      3. 生成 css：将处理后的 ast 重新序列化为 css 字符串；
    - 优势总结
      1. 模块化：只安装需要的功能；
      2. 未来友好：提前使用 css 新特性，无需等待浏览器支持；
      3. 生态强大：超过 200 个创建覆盖各种需求；
      4. 性能优异：比传统预处理器更快；

47. 如果 js 函数参数有默认值，如果传递的参数是 undefined 那么会被默认赋值吗？

    - js 函数参数的默认值已定义，且调用时传递的实参时 undefined，则该参数会被赋予默认值。这是 es6 默认参数特性的核心行为；
    - 默认参数的基本规则
      1. 触发条件：当参数为 undefined 时（不包括 null、false、0 等假值）；
      2. 不触发条件：传递 null、false、0、""等其他假值时，默认值不会失效；
    - 与 arguments 对象的关联： 默认参数不会影响 arguments 对象：arguments 仍反映调用时传入的原始值（包括 undefined）；
    - 默认值的惰性求值：默认值在每次调用时按需计算（如果是表达式）
    - 复杂场景下

    ```js
    // 解构赋值 + 默认值
    function foo({ x = 1, y = 2 } = {}) {
      console.log(x, y);
    }
    foo({ x: undefined, y: 5 }); // 1,5 x使用默认值
    // 默认参数与||的区别
    function bar(a = 10) {
      return a;
    }
    console.log(bar() || 10); // 10;
    ```

48. 普通函数的动态参数和箭头函数的动态参数有什么区别？

    - arguments 对象的区别
      1. 普通函数：自动绑定 arguments，普通函数内部可访问类数组的 arguments 对象，包含所有传入参数；
      2. 箭头函数：无 arguments，若访问会向上层普通函数的作用域查找；
    - 剩余参数(...rest)的行为
      1. 通用行为：剩余参数...rest 在普通函数和箭头函数中表现一致，均将多余参数收集为数组；
      2. 区别点：箭头函数必须使用...rest 获取动态参数，而普通函数还可以通过 arguments；
    - 最佳实践建议
      1. 优先使用...rest；
      2. 避免混合使用；
      3. 箭头函数注意点：（1）若需动态参数，必须显式定义...rest；（2）在嵌套函数中注意 arguments 的继承行为；

49. vue 项目中，怎么做性能优化？

    - 代码层优化：（1）懒加载异步组件；（2）使用 v-once/v-memo；（3）拆分高频更新组件；
    - 状态管理：（1）避免频繁更新大对象；（2）局部化响应式数据；
    - 列表渲染：（1）Key 属性唯一且稳定；（2）虚拟滚动列表；
    - 打包体积控制：（1）代码分割；（2）TreeShaking；（3）依赖分析；
    - 压缩与优化：（1）压缩资源；（2）Gzip/Brotli 压缩；（3）第三方库优化；
    - 减少响应式依赖：（1）冻结大数据；（2）浅层响应式；
    - 防抖与节流：高频事件使用 debounce/throttle；
    - SSR/SSG（服务端渲染）
    - 用户体验优化：（1）骨架屏；（2）预加载关键资源；（3）PWA（渐进式 Web 应用）；

50. 为什么 SPA 应用都会提供一个 hash 路由，好处是什么？

    - 兼容性极佳
      1. 无需服务器配置：Hash 路由的 URL 中#后的内容不会被发送到服务器；因此：（1）无需服务器支持；（2）避免因服务器未配置重定向导致 404 错误；
      2. 支持老旧浏览器：兼容 IE9 及以下版本；
    - 无刷新路由切换：基于浏览器原生行为；修改 location.hash 不会触发页面重载，但会触发 hashchange 事件，spa 可监听此事件动态渲染内容；
    - 锚点定位与路由的天然结合：#既可以标记路由路径，也可以用于页面内锚点跳转，两者互不冲突；
    - 避免 HistoryApi 的权限问题：无跨域限制，修改 location.hash 不受同源策略限制，而 history.pushState 在跨域时会抛出安全错误。
    - 简单容易实现：低门槛技术，早期 spa 框架（backbone.js）仅需少量代码即可实现路由功能；
    - 缺点
      1. URL 不美观：#符号破坏 URL 简洁性；
      2. SEO 不友好：传统爬虫可能忽略#后的内容；
      3. 无法利用 HTTP 缓存：#后的变化不会触发新请求，导致缓存策略受限；

51. react 中的 hooks 和 memorizedState 是什么关系？

    - 核心关系：Hooks 是 React 提供给函数组件的 API，用于管理状态和副作用；memorizedState 是 React 内部用于存储 hooks 数据的链表结构，每个 hook 的当前状态值都被保存在对于的 memorizedState 节点中；（Hooks 是开发者使用的接口，memorizedState 是底层存储这些 hook 数据的数据结构；
    - 底层实现原理
      1. 链表结构存储 hook 状态
         - 每个函数组件首次渲染时，react 会创建一个 hooks 链表，每个 hook 对应链表中的一个节点；
         - 节点的 memorizedState 字段保存该 hook 的当前值
           1. useState：存储 state 值；
           2. useEffect：存储 effect 的依赖数组和清理函数；
           3. useRef：存储 ref 对象的 current 值；
      2. hooks 的调用顺序决定链表连接
         - react 依赖 hooks 的调用顺序来匹配链表节点；
         - 这也是为什么 hook 不能写在条件语句中；
    - 关键流程解析
      1. 首次渲染
         - 组件调用 useState、useEffect 等 Hook；
         - react 创建 hooks 链表，将初始值存入 memorizedState；
         - 组件返回 jsx，react 渲染 dom；
      2. 更新渲染
         - 组件再次调用 hooks，react 按顺序遍历链表，读取对应的 memorizedState；
         - 如果状态更新，react 修改 memorizedState 并触发重新渲染；
         - 组件使用更新后的 memorizedState 渲染新 jsx；
    - 为什么需要 memorizedState
      1. 状态持久化：函数组件本身无实例，memorizedStata 提供渲染状态存储；
      2. 性能优化：避免重复计算；
      3. 副作用管理：useEffect 的清理函数和依赖项通过 memorizedState 跟踪；

52. SPA 首屏加载速度慢怎么解决？

    - 代码分割：路由懒加载、组件级懒加载；
    - 资源压缩与 CDN：启用 GZip/Brotli 压缩、静态资源托管到 CDN；
    - 预加载关键资源：<link ref="preload"></link>（提前加载关键资源 css/js/字体）；<link ref="prefetch"></link>（空闲时预加载其他路由资源）；
    - 骨架屏；
    - 构建优化：tree-shaking、依赖分析按需引入组件库、替换臃肿库、图片优化；
    - 渲染优化
      1. 服务端渲染 SSR 或 静态生成 SSG；
      2. 减少重绘与回流；
      3. 虚拟滚动；
    - 网络层优化
      1. HTTP/2 或 HTTP/3：多路复用减少连接开销，提升资源并行加载效率；
      2. 缓存策略：强缓存/协商缓存；
      3. 减少 DNS 查询：DNS 预解析<link rel="dns-prefetch" href="a.com" />

53. pm2 部署 nodejs 有哪些优势？

    - 进程守护与自动恢复
      1. 优势：当 Nodejs 应用崩溃或意外退出时，pm2 会自动重启进程，确保服务高可用；
      2. 场景：避免因未捕获的异常或内存泄漏导致服务中断；
    - 负载均衡与多核利用
      1. 优势：通过集群模式（ClusterMode）一键启动多个进程，充分利用多核 CPU；
      2. 原理：PM2 作为主进程管理多个 Nodejs 子进程，通过轮询分配请求；
    - 零停机热重载：优势：更新代码时无需停机，pm2 逐步重启进程，保持服务持续可用；
    - 日志集中管理：优势：自动收集应用日志（标准输出/错误），支持日志分割和定期清理；
    - 监控与性能分析：优势：实时监控内存、CPU 占用，快速定位性能瓶颈；
    - 环境隔离与配置管理：优势：通过 ecosystem.config.js 文件管理不同环境（测试、开发、生产）的配置；
    - 开机自启动：通过生产系统服务，确保服务器重启后应用自动运行；
    - 插件生态系统：支持插件扩展功能（如日志轮转、内存监控、数据库连接管理）；
    - 跨平台支持：兼容 linux、windows、macos，部署方式一致；
    - 与 DevOps 工具链集成：轻松集成到 CI/CD 流程；

54. 在前端应用中，怎么进行系统权限的设计？

    - 身份认证
      1. 登陆验证：使用 JWT 或 session cookie 等方式对用户进行身份验证；
      2. 单点登录：支持多个系统之间共享身份信息，如 OAuth2、OpenID Connect；
      3. 多因素认证：增强安全性，例如短信验证码、邮箱验证、生物识别等；
    - 权限控制
      1. RBAC（基于角色的访问控制）
         - 用户分配角色，如 admin、user、guest；
         - 角色绑定权限，如 create_user、delete_user；
      2. ABAC（基于属性的访问控制）：根据用户属性、资源属性进行动态授权；
    - 前端实现方式
      1. 路由级别控制
         - 根据角色/权限动态生成可访问的路由表；
         - 使用 vue router/react router 的 beforeEach 或 protected routes 控制页面访问；
      2. 组件级别控制
         - 封装权限指令或高阶组件；
         - 控制按钮、菜单、模块等是否渲染或禁用；
      3. api 接口控制
         - 请求头中携带 token；
         - 后端接口根据 token 验证权限，前端处理 403/401 错误提示；
    - 权限数据管理
      1. 静态配置：将权限规则写在前端配置文件中；
      2. 动态加载：从后端接口获取用户权限列表；
    - 安全注意事项
      1. 最小权限原则：只授予用户完成任务所需的最小权限；
      2. 敏感操作二次确认：如删除、修改关键数据时再次验证身份；
      3. 日志审计：记录用户的操作行为，便于追踪；
    - UI 层面建议
      1. 菜单过滤：根据权限动态渲染侧边栏；
      2. 按钮级权限：隐藏或禁用无权限操作按钮；
      3. 提示友好：无权限时显式友好的提示信息；

55. 后端一次性返回树形结构数据，数据量非常大，前端该如何处理？

    - 虚拟滚动
      1. 只渲染可视区域内的节点，其余节点不挂载；
      2. 适用于扁平化后的树形结构展示；
    - 懒加载展开
      1. 初始只渲染根节点或前几层节点；
      2. 子节点在用户点击时才渲染；
      3. 可结合动画实现平滑展开/收起；
    - 异步分页加载
      1. 树节点初始仅加载父级，点击展开时再请求子节点数据（需后端支持）；
      2. 减少初始加载数据量，提升首屏性能；
      3. 注意避免重复请求，可缓存已加载的子节点；
    - 数据扁平化 + 渲染优化
      1. 将树结构转换为扁平数组，记录层级深度，便于虚拟滚动或条件渲染；
      2. 使用 memorization 避免重复计算和渲染；
    - WebWorker 处理复杂逻辑
      1. 如果需要对树结构做大量计算（过滤、排序、搜索）可移至 WebWorker 中处理，避免阻塞主线程；
    - 前端搜索与过滤优化
      1. 提供关键词搜索功能，动态筛选树节点；
      2. 支持“高亮匹配”、“模糊匹配”等增强体验；
      3. 使用 Trie 或 WebWorker 加速大数据集的搜索；
    - 可视化剪枝（按需显式）
      1. 用户无需看到所有节点时，可通过设置最大展开层级或默认隐藏深层节点来减少渲染负担；
      2. 可提供“展开全部/收起全部”按钮；
    - 性能监控与降级策略
      1. 监控渲染时间、内存占用、FPS 等指标；
      2. 数据过大时自动进入“简化试图”或提示用户切换视图；

56. vite 和 webpack 在热更新的实现上有什么区别？

    1. 底层架构不同
       - webpack：打包式构建、开发服务器需要先打包再启动、初始构建速度较慢；
       - vite：模块化加载、开发服务器基于原生 ES 模块动态加载、初始构建速度极快；（基于原生 ESM、无需重新编译整个 bundle）；
    2. HMR 更新机制
       - webpack
         1. 将多个模块打包成一个或多个 chunk；
         2. 当某个模块发生变化时，webpack 会重新构建受影响的 chunk，并替换整个 chunk；
         3. HMR 信息通过 websocket 发送到客户端，触发模块热更新；
         4. 缺点：即使改动很小，也可能导致整块更新，响应时间较长；
       - vite
         1. 利用浏览器原生支持而是 ESModules，每一个文件就是一个模块；
         2. 修改一个文件后，vite 只需要重新加载该模块及其依赖链；
         3. 更新速度快（毫秒级），且不涉及整体打包。
         4. 支持细粒度更新；
    3. HMR 粒度
       - webpack：热更新粒度-chunk 级别；css 更新-全局刷新样式；vue/react-需配置插件；
       - vite：热更新粒度-模块级别；css 更新-局部更新对应组件样式；vue/react-内置支持，开箱即用；
    4. 依赖处理方式
       - webpack：第三方依赖-打包进 bundle；预构建依赖-启动时分析 node_modules 并预构建；
       - vite：第三方依赖-首次请求时自动优化并缓存为依赖预构建；预构建依赖-启动时自动检测并缓存依赖模块；
    5. 性能对比总结
       - webpack：小项目热更新-差不多；大项目热更新-明显变慢；初次加载-较慢；
       - vite：小项目热更新-更快；大项目热更新-几乎无感知延迟；初次加载-极快；

57. 如果想在图片这块做性能优化，有哪些思路？

    - 压缩图片：使用无损或有损压缩工具，减少文件体积，不影响视觉效果；
    - 使用现代格式：（1）WebP：比 JPEG/PNG 更小，支持透明通道；（2）AVIF：压缩率更高，兼容性逐步提升；（3）SVG：适用于图标、矢量图形；
    - 响应式图片（srcset+sizes）：根据设备像素密度和视口大小加载不同分辨率的图片；避免加载过大的图片资源；
    - 懒加载：使用原生 loading="lazy"或 js 实现滚动加载；对非首屏图片延迟加载，节省初始请求；
    - 预加载关键图片：对首屏关键图片使用<link rel="preload"></link>提前加载；
    - 渐近加载：使用渐进式 JPEG 或低质量占位图，先展示模糊再清晰；
    - 占位图&延迟解码：使用 blurDataURL 或 base64 缩略图作为占位；图片加载完成后替换真实内容，避免布局抖动；
    - 延迟解码图片：使用 decoding="async"让浏览器异步解码图片，减少主线程阻塞；
    - 使用 CDN 加速：将图片托管在 CDN 上，缩短物理传输距离；支持自动压缩、格式转换；
    - 设置缓存策略：设置适合的 HTTP 缓存头；静态资源长期缓存，动态图短期缓存；
    - CSS Sprites：多个小图标合并成一张图，减少请求数；适用于静态图标资源；
    - 按需加载高清图：初始加载缩略图，点击后加载高清图；可用于画廊类应用；
    - 使用 SVG 替代图标：矢量图形，无失真，体积小，可样式控制；

58. 如果需要使用 js 执行 100 万个任务，怎么保证浏览器不卡顿？

    - 异步分批处理
      1. 将任务拆分为小块，利用 setTimeout/requestIdleCallback/Promise.then 等方法让出主线程；
      2. 每批次处理定量任务，间隔释放主线程；
    - 使用 Web Worker 处理
      1. 将耗时任务移至后台线程，避免阻塞 UI；
      2. 适用于计算密集型任务；
    - 利用 requestIdleCallback：在浏览器空闲时执行任务，不影响关键渲染任务；
    - 任务优先级划分
      1. 关键任务（如用户交互）优先执行；
      2. 非关键任务（如日志上报、缓存清理）延迟或低优先级执行；
    - 任务合并与去重
      1. 检查是否有重复任务，合并相似操作，减少执行次数；
      2. 使用防抖/节流机制控制高频触发任务；
    - 避免内存泄漏
      1. 定期释放无用对象，避免长时间持有大量数据；
      2. 使用弱引用结构如 WeakMap、WeakSet 存储临时数据；
    - 进度反馈
      1. 显式加载状态或进度条，提升用户体验；
      2. 可通过 postMessage 向主线程发送进度更新；
    - 使用 Performance API 监控
      1. 使用 performance.now()记录执行时间；
      2. Lighthouse 中检查长任务是否超过 50ms；

59. 对于分页的列表，怎么解决快速翻页场景下的竞态问题？

    - 问题本质：当用户快速点击翻页时，可能产生多个并发请求，由于网络延迟不同，后发出的请求反而先返回结果，从而导致：（1）页面数据显示的是旧的请求结果；（2）数据错乱、重复加载或空白页等问题；
    - 解决方案
      1. 使用 AbortController 取消旧请求（适用于使用 fetch 的场景）；
      2. 使用唯一标识+请求序号控制更新逻辑（适用于无法中断请求或需要更细粒度控制的场景；
      3. 防抖/节流机制：防止用户过快翻页，限制请求频率；
      4. 结合 Promise 链式控制：按顺序执行请求，避免并发冲突；

60. 如何检测网页空闲状态（即一定时间内无操作）？

    - 基本思路：通过监听用户的交互事件（如 mousemove、keydown、click 等），这些事件发生时更新”最后活跃时间“，然后通过定时器判断是否进入空闲状态；
    - 实现步骤
      1. 设置监听事件
      ```js
      let lastActiveTime = Date.now();
      const resetTimer = () => {
        lastActiveTime = Date.now();
      };
      ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(
        (event) => {
          window.addEventListener(event, resetTimer);
        }
      );
      ```
      2. 定期检查是否空闲
      ```js
      const IDLE_TIMEOUT = 5 * 60 * 1000;
      setInterval(() => {
        const now = Date.now();
        const inactiveTime = now() - lastActiveTime;
        if (inactiveTime >= IDLE_TIMEOUT) {
          // 执行超过指定空闲时长操作；
        }
      }, 1000);
      ```
    - 优化建议
      1. 使用 requestIdleCallback 提升性能；
      2. 结合页面可见性 API；
      3. 封装为可复用模块；
    - 安全与隐私注意事项
      1. 不要记录用户具体行为轨迹；
      2. 若用于敏感业务（如银行系统），应提供明确提示并符合隐私政策要求；
      3. 避免频繁触发高耗能操作；

61. 前端应用上线后，怎么通知用户刷新当前页面？

    - 通过版本号检测更新
      1. 前端定期请求一个 version.json 文件（由构建时生成），判断当前版本是否为最新。
      2. 如果发现版本不一致，则提示用户刷新页面；
    - 结合 Service Worker 控制更新（PWA）
      1. 构建时生成新的 SW 缓存版本；
      2. 在主应用中监听 SW 更新事件；
      3. 提示用户点击刷新按钮以加载新版本；
      ```js
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
          navigator.serviceWorker
            .register("/service-worker.js")
            .then((registration) => {
              registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === "installed") {
                    if (navigator.serviceWorker.controller) {
                      // 新版本已下载，提示用户刷新
                    }
                  }
                };
              };
            });
        });
      }
      ```
    - WebSocket/长轮询通知更新
      1. 前端与后端建立 WebSocket 连接；
      2. 后端在部署完成后推出“有新版本”消息；
      3. 前端接收到消息后弹出刷新提示；
    - 结合 CI/CD 自动注入版本信息：在构建阶段自动生成版本号或哈希值，写入 HTML 或 JS 变量中，便于运行时对比；
      1. 使用插件将 git commit hash 或时间戳写入环境变量；
      2. 存储到全局变量 window.appVersion 中；
    - 最佳实践建议
      1. 简单静态网站：版本号检测；
      2. PWA 应用：Service Worker + 更新提示；
      3. 实时性要求高：WebSocket/长轮询；
      4. 多人协作系统：强制刷新+用户确认机制；
      5. 移动 H5/小程序：版本检测+引导跳转新版本；

62. js 的严格模式有什么作用？

    - 主要作用
      1. 禁止使用不安全或容易出错的语言特性
         - 禁止隐式全局变量名；
         - 禁止函数参数重名；
         - 禁止八进制字面量；
         - 禁止使用 with 语句；
         - 禁止删除不可配置的属性；
      2. 提升代码安全性
         - 更多的语法错误会在解析阶段抛出异常，而不是静默失败；
         - 防止某些潜在的逻辑错误；
      3. 增强调试能力
         - 更清晰的错误提示，便于开发者发现问题；
         - 如访问未声明变量会直接报错；
      4. 为未来 js 特性做准备
         - 一些 es6+的新特性只能在严格模式下使用；
    - 注意事项
      1. 'use strict'必须出现在脚本或函数的最顶部；
      2. 在模块化代码中，默认启用严格模式，无需手动添加；
      3. 不会影响旧浏览器兼容性，但建议配合 Babel 等工具进行兼容性处理；

63. Proxy 和 Reflect 有什么关系？

    - Proxy：创建一个代理对象，可以拦截并自定义其基本操作；
    - Reflect：提供一组静态方法，用于以函数式方式执行与对象默认行为相同的操作；
    - 设计目的互补
      1. Proxy 用于拦截操作；
      2. Reflect 提供默认行为，常用于在 Proxy 中调用原始操作；
    - 常用对应 Trap 与 Reflect 方法
      1. get(target, prop, receiver) / Reflect.get(target, prop, receiver);
      2. set(target, prop, value, receiver) / Reflect.set(target, prop, value, receiver);
      3. has(target, prop) / Reflect.has(target, prop);
      4. deleteProperty(target, prop) / Reflect.deleteProperty(target, prop);
      5. apply(target, thisArg, args) / Reflect.apply(target, thisArg, args);
      6. construct(target, args) / Reflect.construct(target, args);
    - 为什么建议配合使用
      1. 更简洁的代码结构，使用 Reflect 可以避免手动实现默认行为，减少出错可能；
      2. 更好的语义化，Reflect 方法名与 Proxy traps 对应，便于理解和维护；
      3. 更好的 this 绑定支持：Reflect 方法通常会自动处理 receiver 参数，确保 this 正确指向；

64. 说说你对 IntersectionObserver API 的理解，它有什么应用场景？

    - IntersectionOvserver 是现代浏览器提供的一种异步观察目标元素与其祖先或视口交集变化的机制。它主要用于检测一个元素是否进入或离开可视区域，从而实现高效的懒加载、滚动监听、曝光统计等功能；
    - 基本作用
      1. 监听一个目标元素与根元素之间的较差状态；
      2. 当目标元素与 root 的交集比例达到设定的阈值时，触发回调函数；
    - 关键参数
      1. target：被观察的目标元素；
      2. root：用于作为观察边界的容器，默认是浏览器视口；
      3. threshold：一个数字数组或单个数字，标识目标元素与 root 交集比例达到多少时触发回调；
      4. rootMargin：类似 css margin，可以扩展或缩小 root 的边界；
    - 主要应用场景
      1. 图片/组件懒加载：图片不在首屏时先不加载，等用户滚动到可视区域再加载；配合<img data-src="xxx">使用，提升页面加载性能；
      2. 无限滚动/分页加载：当用户滚动到底部附近时，自动加载下页数据；替代传统的 window.addEventListener("scroll",...)，避免频繁触发和性能问题；
      3. 内容曝光统计：统计广告位、推荐卡、文章等内容是否被用户看到；可以精确控制“看到”定义；
      4. 动画触发/动画播放：页面滚动到某个模块时，自动播放动画或执行初始化逻辑；
      5. 视频自动播放/暂停：当视频进入视口时自动播放。离开时暂停，节省资源；
    - 注意事项
      1. 不支持 IE：需要 polyfill 或降级处理
      2. 异步触发：回调不是立即执行，受浏览器调度影响；
      3. 多次触发：一个元素可能多次进入/离开视口。需合理控制逻辑；
      4. 移动端兼容：支持主流现代浏览器，包括移动端；

65. 前端渲染和后端渲染分别有什么优缺点，为什么现在的技术大方向，又逐渐往“后端渲染”方向靠拢？

    - 前端渲染（CSR）
      1. 优点
         - 快速交互体验：首次加载后，后续切换无需刷新页面，提升用户体验；
         - 开发效率高：组件化开发、热更新等特性提升开发效率；
         - 前后端分离：易于维护、扩展，前后端可独立部署；
      2. 缺点
         - SEO 不友好：爬虫难以抓取 js 渲染的内容；
         - 初次加载慢：用户需等待 js 下载、解析、执行后才看到内容；
         - 性能依赖客户端：手机低端设备或网络差时体验下降明显；
    - 后端渲染（SSR）
      1. 优点
         - 更好的 SEO：页面内容在 HTML 直接存在，搜索引擎更容易抓取；
         - 首屏速度快：用户无需等待 js 加载即可看到内容；
         - 兼容性好：对低配设备和弱网环境更友好；
      2. 缺点
         - 开发复杂度高：需要处理服务端和客户端的代码共享、生命周期等问题；
         - 服务器压力大：每个请求都要动态生成 HTML，可能影响性能；
         - 后端耦合度高：前后端职责边界模糊，不利于微服务架构演进；
    - 为什么“逐渐往后端渲染方向靠拢”？
      1. 首屏快 + 交互强 = 最佳平衡
         - 服务端先返回 HTML 内容；
         - 浏览器下载后 js 进行“激活”，接管后续交互；
      2. SEO 优化需求驱动
         - 越来越多企业重视内容曝光，搜索引擎抓取是关键；
         - 尤其适用于资讯类、电商类、营销类网站；
      3. Hydration 技术成熟
         - React18 支持 Streaming + Selective Hydration；
         - Vue3 支持异步组件+Suspense；
         - Qwik 支持“按需恢复状态”，极大降低 hydration 成本；
      4. Edge Computing 推动 SSR 回归
         - 利用 CDN 边缘计算实现快速 SSR，缓解传统 SSR 的性能瓶颈；

66. 说说对 MutationObserver 的理解？

    - 定义：MutationObserver 是一个构造函数，用于创建一个观察器实例，该实例可以异步监听目标 DOM 节点的变化；
    - 特点
      1. 异步执行；
      2. 可监听多种类型的 DOM 变化；
      3. 支持观察子树；
    - 主要应用场景
      1. 组件库/框架内部机制：Vue/React 等框架使用 MutationObserver 或类似机制实现 DOM diff 和更新追踪；
      2. 性能监控与埋点：自动监听页面结构变化，触发曝光统计、用户行为采集；
      3. 第三方插件集成：如广告位、弹窗、评论系统等需要监听页面动态内容加载；
      4. UI 自动化测试：在 E2E 测试中监听 DOM 是否渲染完成；
      5. 懒加载/延迟初始化：当某个元素被插入 DOM 后自动初始化功能；
      6. 内容安全策略（CSP）监控：检测是否有非法脚本注入或 DOM 修改；
    - 最佳实践建议
      1. 监听特定元素结构变化：设置 childList: true + subtree: false;
      2. 属性变更监听：设置 attributes: true;
      3. 文本内容变化：设置 characterData: true;
      4. 获取旧值对比：开启 attributeOldValue/characterDataOldValue；
      5. 性能敏感场景：控制监听范围，避免监听整个 document；

67. 在 js 中，如何解决递归导致的栈溢出问题？

    - 使用尾递归优化（tail call optimization）
      1. 如果一个函数的递归调用是其最后一步操作，某些引擎可以进行优化，不增加新的调用栈帧；
      2. 注意：只有严格模式下且现代引擎支持的情况下才有效；
      ```js
      function factorial(n, acc = 1) {
        if (n === 0) return acc;
        return factorial(n - 1, n * acc);
      }
      ```
    - 改写为循环结构（推荐）：用 while 或 for 循环替代递归，避免调用栈增长；

    ```js
    function factorial(n) {
      let result = 1;
      while (n > 0) {
        result *= n;
        n--;
      }
      return result;
    }
    ```

    - 使用 Trampoline 技术手动解递归
      1. 每次递归返回一个函数而不是继续调用自己；
      2. 最终通过一个循环执行这些函数，避免栈增长；
      ```js
      function trampoline(fn) {
        return (...args) => {
          let result = fn(...args);
          while (typeof result === "function") {
            result = result();
          }
          return result;
        };
      }
      function factorial(n, acc = 1) {
        if (n === 0) return acc;
        return () => factorial(n - 1, n * acc);
      }
      const safeFactorial = trampoline(factorial);
      ```
    - 使用 Web Worker 处理复杂递归任务；
      1. 递归逻辑移至 Web Worke，避免阻塞主线程；
      2. 即使栈溢出也不会影响主页面交互；
    - 使用异步递归+Promise/setTimeout 解耦调用栈：使用 setTimeout/Promise.then 让每次递归调用脱离当前调用栈；
    - 使用建议
      1. 数据量大或不确定：改为循环结构；
      2. 需要保持递归风格：使用 Trampoline 技术；
      3. 性能要求高：使用尾递归；
      4. 用户体验敏感：移到 Web Worker；
      5. 防止崩溃：加入最大递归深度限制和异常捕获；

68. React19 有哪些新特性？

    - Actions 异步操作支持
      1. 新增 useActionState Hook，统一管理异步操作的状态；
      2. 支持在 Server Components 和 Client Components 中使用；
    - Server Component 是正式稳定
      1. Server Component 正式成为默认推荐方案，支持更高效的 SSR；
      2. 与 Nextjs 等框架深度集成；
      3. 可在服务端渲染组件树，减少客户端 js 下载量；
    - 'use client'/'use server'指令
      1. 明确区分客户端和服务端代码边界；
      2. use client：指定模块应在客户端执行；
      3. use server：标记函数只能在服务端调用；
    - 原生支持 Document Metadata
      1. 在组件中直接设置<head>内容，无需额外库；
    - 样式优先级管理
      1. 支持 css module、css-in-js 库更好的集成；
      2. 提供内置机制解决样式冲突问题；
      3. 支持动态主题切换和全局样式控制；
    - React Compiler（实验性）
      1. 基于编译时优化，自动将 React 组件转换为高性能的 DOM 操作；
      2. 减少运行时开销，提升首屏性能；
    - Streaming + Selective Hydration
      1. 支持 HTML 流式传输，更快呈现首屏内容；
      2. Selective Hydration：优先激活用户正在交互的部分组件，延迟非关键部分；
    - 并发模式增强
      1. 更完善的 Suspense 集成，支持数据加载、组件懒加载等场景；
      2. 改进并发渲染行为，避免“中间状态”闪烁；
    - 强化对构建工具的支持
      1. vite、webpack5 等现代构建工具全面兼容；
      2. 支持 Partial Hydration、Code Spliting、Tree Shaking 更高效；
    - 增强对 ts 支持
      1. 开箱即用的.tsx 支持；
      2. 类型推导更智能，错误提示更精确；
    - RN 集成加深
      1. 共享组件逻辑、Hooks、状态管理机制；
      2. 支持 Server Actions 在移动端发起请求；

69. React 中，如何避免使用 context 时，引起整个挂载节点树的重新渲染？

    - 本质问题：React 的 Context 更新会触发所有使用该 Context 的组件进行 re-render。即使某个组件没有依赖 Context 中的具体值，只要它使用了这个 Context，也会被强制更新；
    - 解决方案
      1. 拆分 Context：将大 Context 拆分为多个小 Context，按需监听；
         - 精确控制哪些组件相应变化；
         - 减少不必要的 re-render；
      2. 使用 useMemo/useCallback 优化子组件
         - 使用 useMemo 缓存计算结果；
         - 使用 useCallback 缓存回调函数；
         - 使用 React.memo 包裹组件；
         - 使用 PureComponent 提升性能；
      3. 使用 Proxy/Selector 模式：通过封装一个“选择器”来订阅 Context 中的部分值，而不是整个对象；
      4. 使用 Redux/Zustand/Jotai 等全局状态管理工具替代 Context；

70. 仅使用 css，实现类似 ChatGPT 中，文案一个个输出的打字机效果？
    - 基本原理
      1. 使用 white-space:nowrap 防止文本换行；
      2. 使用 overflow:hidden 隐藏超出容器的内容；
      3. 使用 width 的动画控制内容逐渐显示。
      4. 可选：添加一个闪烁的光标（通过伪元素和@keyframes 实现）；
    - 限制与注意事项
      1. 不支持换行，如果希望支持多行，需用 js 或额外 css 技巧处理；
      2. 不支持动态内容，纯 css 方案适用于静态内容。
      3. 性能良好：完全由浏览器原生动画引擎驱动，性能优秀；
    - 关键点
      1. 利用 width 动画逐步展开内容；
      2. 使用 steps()控制动画节奏；
      3. 添加光标动画闪烁提升视觉体验；

71. webpack或者vite这样的打包工具，是如何识别到路由懒懒加载的？
    - webpack的路由懒加载识别
        1. 动态导入语法（import()）：通过解析动态import()语法，标记代码分割点；
        2. 代码分割逻辑
            - 编译阶段：webpack将import()转换为异步加载逻辑，并生成对应的分块文件；
            - 运行时：浏览器按需加载这些分块文件，通过JSONP或fetch请求资源；
        3. 生成的分块文件
            - 命名规则：默认按照数字ID命名（如1.js），可通过魔法注释自定义；
        4. 底层实现
            - 依赖分析：webpack构建时生成依赖图，动态导入的模块会被标记为异步边界；
            - 运行时管理：通过__webpack_require__.e方法加载分块文件；
    - vite的路由懒加载识别
        1. 动态导入语法（基于import()）：vite使用标准import()语法，但利用浏览器原生ESM实现按需加载；
        2. 原生ESM的优化
            - 开发环境：直接使用浏览器原生import()，无需打包，实现秒级热更新；
            - 生产环境：Rollup将动态导入转换为分块文件；
        3. 生成的分块文件
            - 命名规格：默认基于文件哈希，可通过配置修改；
        4. 预加载优化：vite自动为动态导入的模块生成<link rel="modulepreload">，加速后续加载；
    - 通用优化建议
        1. 统一命名：使用注释或配置为分块文件赋予可读性名称，便于调试；
        2. 预加载关键路由：在用户可能访问的路由提前预加载资源；
        3. 避免过度分割：合理控制分块大小，避免过多小文件增加HTTP请求开销；

72. Nextjs是如何做打包优化的？
    - Nextjs在打包优化方面通过智能代码分割、静态资源优化、编译时优化和运行时性能增强等多个维度显著提升性能；
    - 代码分割与懒加载
        1. 基于路由代码的自动代码分割
            - 每个页面独立分块：Nextjs将每个页面（pages/下的文件）自动打包为单独的js块，访问时按需加载；
        2. 动态导入
            - 组件级懒加载：使用next/dynamic延迟加载非关键组件（如弹窗、复杂图表）；
        3. 第三方库分割
            - 自动分离node_modules：通过next.config.js配置将第三方库拆分为独立分块；
    - 静态资源优化
        1. 自动图片优化：next/image组件
            - 自动转换为现代格式（webp/avif）；
            - 按需调整尺寸（避免传输过大图片）；
            - 懒加载（视口外图片延迟加载）；
        2. 字体与css优化
            - 自动字体预加载：使用next/font内联关键字体CSS，减少布局偏移；
            - css内联与最小化：提取关键css并内联到HTML，其余CSS异步加载；
    - 编译时优化
        1. Tree Shaking
            - 自动移除未使用的代码；nextjs基于esmodule静态分析，剔除未引用的导出代码；
            ```js
            const config = {
                experimental: {
                    esmExternals: true, // 优化外部ESM库的Tree Shaking
                }
            }
            ```
        2. SWC编译
            - 替代Babel：nextjs默认使用Rust编写的SWC编译器，比Babel快17倍，支持更高效的TreeShaking；
        3. 预渲染优化
            - 静态生成（SSG）：getStaticProps生成的页面直接输出为HTML+JSON，无需运行时计算；
            - 增量静态再生（ISR）：允许静态页面按需重新生成，适合频繁更新的内容；
            ```js
            export async function getStaticProps() {
                return { props: {}, revalidate: 60 };
            }
            ```
    - 运行时性能增强
        1. 智能预加载：next/link自动预加载；鼠标悬停在<Link>上时，预加载目标页面的资源；
        2. 流式渲染（Streaming SSR）：逐步发送HTML，nextjs13+的app/目录支持流式渲染，边生成边发送内容，缩短TTFB；
        3. 内存缓存：（1）构建缓存：重复构建时复用未修改模块，加速编译；（2）路由缓存：客户端缓存已访问页面的资源，减少重复请求；
    - 配置与插件扩展
        1. 自定义webpack配置
            - next.config.js扩展：覆盖默认webpack规则；
        2. 使用分析工具
            - @next/bundle-analyzer：可视化分析打包体积，依赖优化；
    - 生产环境优化
        1. 自动压缩：js/css/html最小化，通过swc和terser自动压缩代码，移除注释和空白符；
        2. CDN支持：资产前缀（Asset Prefix），静态资源托管到CDN；
        3. 中间件优化：next/server中间件，在边缘网络运行逻辑，减少后端延迟；
    - 总结：Nextjs优化哲学
        1. 约定优于配置：自动开箱优化（如代码分割、图片处理）；
        2. 渐进式增强：支持从静态页面到动态渲染的平滑过渡（SSG->ISR->SSR）；
        3. 性能基线保障：默认启用压缩、缓存、现代格式；
        4. 可扩展性：通过配置和插件覆盖特殊场景；


73. 垃圾回收中，有标记引用的情况下，为什么还需要计数引用？
    - 标记引用
        1. 工作原理：从根对象出发，标记所有可达对象，清除未标记对象；
        2. 循环引用处理：可处理循环引用；
        3. 实时性：延迟回收（需要遍历整个堆）；
        4. 性能开销：停顿时间较长（全堆扫描）
    - 计数引用
        1. 工作原理：每个对象维护引用数，技术为0时立即回收；
        2. 循环引用处理：无法处理循环引用（需额外机制）；
        3. 实时性：即时回收（计数器归零立即释放）；
        4. 性能开销：分散开销（每次引用变动时更新计数）；
    - 为什么需要引用计数
        1. 实时性要求高的场景：计数引用在对象归零时立刻回收内存，适合对内存敏感的应用（如嵌入式系统、实时游戏）；
        2. 资源管理（非内存资源）：文件句柄、网络连接等，计数引用可管理需要及时释放的系统资源；
        3. 与标记引用互补：混合垃圾回收器，现代GC常混合使用两种策略；（1）新生代：引用计数管理短期对象（快速回收）；（2）老生代：标记引用处理长期对象（解决循环引用）；
        4. 增量回收优化：减少停顿时间，计数引用的分散回收可避免标记引用的全堆扫描停顿，适合前端应用（如DOM对象管理）；
    - 循环引用的解决方案
        1. 弱引用：不增加计数引用，允许循环中的对象被回收（WeakMap\WeakSet）；
        2. 手动断开引用：在不需要时显式置空；
    - 实际应用案例
        1. 浏览器DOM管理
            - 引用计数：快速释放已移除的DOM节点；
            - 标记引用：定期处理循环引用（如事件监听器未移除）；
        2. python的垃圾回收
            - 主机制：计数引用；
            - 辅助机制：标记引用；
        3. Object-C/Swift
            - 自动引用计数：编译时插入引用计数代码，结合运行时标记清除处理循环；


74. cookie可以实现在不同域名下共享吗？
    - cookie默认情况下不能直接在不同域名下共享，因为浏览器的同源策略会限制cookie的访问范围；不过可以通过以下间接实现跨域名共享cookie；
        1. 主域名相同，子域名不同：如果两个域名属于同一个域名（a.example.com和b.example.com），可以通过设置cookie的domain属性为主域名，实现子域名共享；
        2. 完全不同的域名
            - 服务端同步（后端协作）：用户访问domainA时，后端生成唯一token并存储到数据库，同时将token作为cookie或urk参数传递给domainB；domainB的后端通过token查询数据库，验证用户身份后生成自己的cookie；
            - 前端跨域传送：通过URL参数或window.postMessage将token传递给另一个域名，由目标域名写入自己的cookie；
            - 单点登录：使用独立的认证中心，用户登录后，所有关联域名通过中心验证共享登录状态；
            - 第三方cookie：传统广告跟踪技术依赖第三方cookie，但现代浏览器已默认禁用；需要设置SameSite=None;Secure; 但可能失效；
        3. 关键限制
            - 安全性：浏览器禁止直接跨域读写cookie，防止CSRF攻击；
            - 隐私政策：第三方cookie受到严格限制；
            - 替代方案：现代应用倾向使用jwt、oauth等无状态令牌技术；

75. 浏览器有同源策略，但是为什么可以将静态资源放到CDN上，使用不同的域名访问，这不会有跨域限制吗？
    - 浏览器同源策略确实会限制跨域访问，但静态资源（js、css、图片、字体等）通过CDN使用不同域名加载时，通常不会触发跨域限制，这是由浏览器的默认行为和资源的特性决定的。
    - 同源策略的核心限制范围
        1. ajax/fetch请求；
        2. DOM访问：禁止通过iframe或window.open跨域地区页面内容（需postMessage通信）；
        3. cookie/localstorage：禁止跨域读写；
    - 以下操作默认允许跨域
        1. 加载静态资源：script\img\link\video\audio等标签的src或href属性可以直接引用跨域资源；
        2. 嵌入第三方内容：如iframe可以加载跨域页面（但无法通过js访问其DOM）；
    - 为什么CDN的静态资源可以跨域？
        1. 静态资源“只读”：这些资源不会直接访问页面的dom或数据，安全性风险较低；
        2. 部分资源需要CORS配置：如果静态资源需要js读取内容，则需要cdn服务器返回正确的cors；
            - web字体（@font-face）跨域加载；
            - 通过fetch获取CDN上的json配置文件；
        3. cdn的优化设计
            - cors头：允许主站域名访问需要交互的资源；
            - 无cookie：静态资源请求默认不携带cookie；
    - 为什么主站和CDN要使用不同域名？
        1. 性能优化
            - 突破浏览器对同一个域名的并发请求限制；
            - cdn域名通常不懈怠cookie，减少请求头大小；
        2. 缓存隔离：静态资源与主站动态内容分离，缓存策略更灵活；
        3. 安全隔离：避免主站cookie泄漏到cdn域名；

76. 如果将一个前端项目中的px全部转为rem，有什么思路？
    - 核心思路
        1. rem单位：1rem=根元素的font-size值；
        2. 动态计算根字体大小：通过js或css媒体查询，根据屏幕宽度调整html的font-size实现整体缩放；
        3. px转rem：通过工具或手动计算，将设计稿中的px值转换为rem；
    - 具体实现步骤
        1. 设置根字体大小
        ```css
        html {
            font-size: 100px;
        }
        @media screen and (min-width: 750px) {
            html {
                font-size: calc(100px + 2 * (100vw - 750px) / 39);
            }
        }
        @media screen and (min-width: 1000px) {
            html {
                font-size: 200px;
            }
        }
        /** 缺点：需要手动编写多个媒体查询，不够灵活 */
        ```
        ```js
        const designWidth = 750
        const baseFontSize = 16;
        function setFontSize() {
            document.documentElement.style.fontSize = `${(document.documentElement.clientWidth / designWidth) * baseFontSize}px`
        };
        window.addEventListener('resize', setFontSize);
        setFontSize();
        // 优点：自动适配所有屏幕尺寸，无需手动设置媒体查询；
        ```
        2. px转rem的换算方法：rem = px / baseFontSize；
        3. 自动转换工具（避免手动计算）
            - postcss + postcss-pxtorem；
            - webpack + px2rem-loader；
    - 注意事项
        1. 边框（border）是否转换：通常1px边框不转为rem（避免在高清屏下过细），可通过selectorBlackList排除；
        2. 第三方UI库兼容：如果使用AntDesign等，需检查是否支持rem，或通过配置覆盖其样式；
        3. 移动端适配：结合viewport的meta标签：<meta name="viewport" content="width=device-width,initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        3. Retina屏处理：使用-webkit-min-device-pixel-ratio媒体查询适配高清屏；

77. vue3为什么不需要时间切片？
    - 时间切片的背景：React引入时间切片（通过Fiber架构）是为了解决以下问题：
        1. 长任务阻塞渲染：当组件树庞大或更新计算复杂时，同步渲染会导致主线程长时间占用，阻塞用户交互，造成卡顿；
        2. 优先级调度：需要区分高优先级和低优先级更新，确保交互流畅；
        3. react的解决方案是将渲染过程拆分为多个可中断的“小任务”，通过requestIdleCallback或手动调度在浏览器空闲时段执行，避免阻塞主线程；
    - vue3不需要的具体原因
        1. 响应式系统的细粒度更新，vue3的响应式基于proxy，能精确追踪依赖关系；
            - 组件级更新：只有依赖变化的数组才会重新渲染；
            - 更少的无效计算：避免像react那样需要对比整棵虚拟DOM树；
            - vue的更新通常更轻量级，很少出现需要长时间占用主线程的情况；
        2. 编译时优化：vue3的模板编译器会在编译阶段标记为静态节点和动态节点；
            - 静态提升：将静态节点提取为常量，跳过对比；
            - 区块树：动态节点按区块组织，减少虚拟DOM对比范围；
            - 渲染效率更高，无需通过时间切片拆分任务；
        3. 批量异步更新：vue3通过异步队列批量处理更新；避免频繁的同步渲染压力；
        4. 更简单的调度需求
            - vue的响应式更新本质上是“推”模型（数据变化驱动视图），而react的调度是“拉”模型（需要主动协调）；
            - vue的更新粒度更细，通常不需要手动区分优先级；
    - 场景对比
        1. react：默认同步处理所有列表项的虚拟DOM对比，可能阻塞交互，需时间切片拆分任务；
        2. vue3：通过响应式追踪，只有数据变化的列表项会重新渲染，其余项跳过，天然规避长任务；
    - vue3的替代优化策略
        1. Suspense异步组件：延迟加载非关键组件，避免一次性渲染压力；
        2. 虚拟滚动：处理长列表时仅渲染可见区域；
        3. 手动控制更新：使用v-once或shallowRef减少不必要的响应式开销；
    - 何时vue仍可能需类似优化，但解决方案不同
        1. 分块渲染：手动分割数据，分批更新DOM；
        2. Web Workers：将计算密集型任务移出主线程；
        3. 减少响应式依赖：使用shallowRef或markRaw避免深层响应式；

78. computed计算值为什么还可以依赖另外一个computed计算值？
    - 由响应式系统的依赖追踪机制和计算属性的惰性求值特性共同实现的。
    - computed的核心机制
        1. 惰性求值：计算属性不会立即计算，只有在被访问时才会重新计算；
        2. 依赖追踪：vue在计算属性求值时，会自动追踪其依赖的响应式数据；
    - 为什么可以依赖其他computed？
        1. 依赖链的自动建立：当一个computed（B）在计算过程中访问了另一个computed（A）时
            - 首次访问B：（1）Vue执行B的getter函数；（2）在函数内部访问A，触发A的getter；（3）A执行自己的计算，并记录自己的依赖；（4）B会将A作为自己的依赖；
            - 依赖关系链：reactiveData -> computedA -> computedB；当reactiveData变化时，会依次触发computedA和computedB的重新计算；
        2. 缓存机制保证效率：如果A的依赖未变化，A会直接返回缓存值，避免B的重新计算；
    - 底层原理（Proxy + 依赖收集）
        1. 响应式数据变更时
            - 触发A的重新计算；
            - 如果A的结果变化，进一步触发依赖它的B重新计算；
        2. 依赖链的触发顺序：vue会确保依赖链按正确顺序更新；
    - 注意事项
        1. 避免循环依赖；
        2. 性能影响：过长依赖链会增加计算开销；


79. vue中父组件如何监听到子组件的生命周期？
    - 使用@hook事件：直接在父组件的子组件标签上@hook:生命周期监听
        1. 无需修改子组件，无侵入性；
        2. 支持所有生命周期（created、mounted、updated）；
    - 通过ref+onMounted：使用ref获取子组件实例，通过onMounted监听；
        1. 需要访问子组件实例的方法或状态时；
    - 子组件手动触发$emit：在子组件生命周期中主动触发事件；
        - 需修改子组件代码，耦合性较高；
    - 使用v-if控制渲染：通过v-if重置子组件，触发其生命周期；
        - 需要强制重置子组件时；
    - 高阶组件（HOC）或自定义Hook：封装一个高阶组件或Hook统一处理生命周期；
        - 需要跨多个组件复用生命周期逻辑时；
    - 最佳实践建议
        1. 优先使用@hook；
        2. 需要操作子组件实例时用ref；
        3. 避免过度依赖生命周期监听；

80. 如何让var [a, b] = { a: 1, b: 2 }解构赋值成功？
    - 直接原因分析：数组解构赋值的左侧[a,b]会尝试调用右侧对象的迭代器接口；普通对象默认不可迭代，因此会报错；
    - 解决方案
        1. 将对象转为可迭代对象：为对象添加[Symbol.iterator]方法，使其返回一个符合迭代器协议的对象
        ```js
        const obj = { a: 1, b: 2, [Symbol.iterator]: function* () {
            yield this a;
            yield this b;
        } };
        // 原理：通过生成器函数(function*)定义迭代行为，依次返回a和b的值；
        ```
        2. 使用Object.values()转为数组：如果不需要自定义迭代逻辑，直接将对象的值转为数组；
            - 代码简洁，无需修改原对象；
        3. 使用解构别名：如果实际需求是从对象中提取属性，应使用对象解构而非数组解构；
            - 明确需要按属性名解构时；
    - 迭代器协议：要让对象支持数组解构，需要满足以下两个协议
        1. 可迭代协议：对象必须实现@@iterator方法（即[Symbol.iterator]键），该方法返回一个迭代器对象
        ```js
        const iterable = {
            [Symbol.iterator]() {
                let step = 0;
                return {
                    next() {
                        step++;
                        if (step === 1) return { value: "a", done: false }
                        if (step === 2) return { value: "b", done: false }
                        return { done: true };
                    }
                }
            }
        }
        ```
        2. 迭代器协议：迭代器对象必须实现next()方法，返回{ value, done }对象；

81. React为什么要废弃componentWillMount、componentWillReceiveProps、componentWillUpdate这三个生命周期钩子？它们有哪些问题？React是如何解决的？
    - componentWillMount
        1. 问题：
            - 无实际用途：在render之前执行，但在此处发起的异步请求或副作用无法保证在首次渲染前完成，可能导致渲染结果不一致；
            - 服务端渲染（SSR）风险：与constructor或componentDidMount不同，componentWillMount在服务端和客户端均会执行，容器导致代码重复执行；
        2. React的解决：逻辑迁移到constructor（初始化状态）或componentDidMount（副作用）；
    - componentWillReceiveProps（nextProps）
        1. 问题
            - 易引发错误：在props变化时触发，但内部若依赖this.props和nextProps的对比，容易因异步更新导致状态不一致；
            - 副作用风险：在此处执行副作用（AJAX请求）可能触发多次更新；
        2. react的解决：使用getDerivedStateFromProps(props, state)替代，这是一个纯函数，禁止副作用，仅用于派生状态；
    - componentWillUpdate(nextProps, nextState)
        1. 问题
            - 不安全操作：在此处执行setState，DOM操作或副作用可能导致更新循环或布局抖动；
            - 与异步渲染冲突：在ConcurrentMode下，react可能暂停或中断渲染，导致此钩子被多次调用；
        2. react的解决：使用getSnapshotBeforeUpdate(prevProps,prevState)捕获更新前的DOM信息，副作用移至componentDidUpdate；
    - 核心原因：异步渲染的兼容性；React16引入Fiber架构和ConcurrentMode，允许渲染过程中断和恢复，被废弃的钩子存在以下共性问题
        1. 不可预测的多次执行：异步渲染下，这些钩子可能在一次更新中被多次调用（即使最终渲染被丢弃）；
        2. 副作用与渲染耦合：它们鼓励将副作用（如数据请求）与渲染逻辑混合，破坏渲染的纯净性；
        3. 阻塞渲染线程：同步执行的钩子可能包含耗时操作，阻塞浏览器的高优先级任务；
    - 底层原理：Fiber与生命周期阶段；React Fiber将渲染分为两个阶段；废弃的钩子属于Reconciliation阶段，而异步渲染要求此阶段必须纯净；
        1. Reconciliation阶段（可中断）；
            - 调用getDerivedStateFromProps、shouldComponentUpdate；
            - 计算变更，不执行副作用；
        2. Commit阶段（不可中断）
            - 调用getSnapshotBeforeUpdate、componentDidUpdate；
            - 执行DOM更新和副作用；

82. 为什么react需要fiber架构，而vue不需要？
    - React为什么需要Fiber
        1. 同步渲染的瓶颈；（1）旧版React（Stack Reconciler）采用递归方式对比虚拟DOM，一旦开始渲染，就会阻塞主线程直到整棵树更新完成。如果组件树庞大或计算复杂，会导致页面卡顿；（2）用户交互延迟；
        2. Fiber的解决方案：（1）可中断的异步渲染，Fiber将渲染任务拆分为多个小任务单元，通过requestIdleCallback或优先级调度在浏览器空闲时段执行；（2）增量渲染：允许React暂停、跳过或复用渲染任务，优先处理高优先级更新；
        3. 核心需求驱动：React作为视图层，需要处理复杂应用场景，而Fiber是实现Concurrent Mode的基础；
    - Vue为什么不需要Fiber？
        1. 响应式系统的差异
            - vue的响应式：基于依赖追踪，在数据变化时精确知道哪些组件需要更新；
            - react的响应式：基于状态变化触发重新渲染，默认从根组件开始协调整棵树；
        2. 模板编译优化
            - vue的模板编译：在编译阶段标记静态节点和动态节点，生成优化的渲染函数，跳过不必要的对比；
            - react的jsx：动态性强，难以在编译时优化，需运行时协调；
        3. 设计哲学不同
            - vue“推”模型：数据变化直接触发对应组件的更新，粒度更细；
            - react“拉”模型：状态变化后，需要从根组件开始协调，找出差异；
    - vue的异步更新策略：（1）虽然vue不需要fiber，但它通过异步批处理更新优化性能；（2）原理：将组件的更新推入队列，在下一个事件循环中批量执行；

83. webpack中的module、bundle、chunk分别指的是什么？
    - module：webpack中的最小单位，对应项目中的单个文件（JS、CSS、图片）。每个文件都视为一个模块，通过import/require建立依赖关系；
        1. 可以是任何文件类型（需配置对应的loader处理）；
        2. 模块间形成依赖图；
    - Chunk（代码块）：介于模块和bundle之间的中间概念，是一组模块的集合。webpack根据配置将模块分组为chunk；
        1. 生成场景
            - 入口点：每个入口文件生成一个chunk；
            - 动态导入：通过import()异步加载的模块会生成独立chunk；
            - 代码分割：将公共模块提取为单独chunk；
        2. 特点
            - chunk是编译过程中的逻辑分组，尚未优化和打包；
            - 一个chunk可能最终输出为一个或多个bundle；
    - Bundle（包）：chunk经过编译和优化后生成的最终输出文件（js、css）可直接被浏览器加载；
        1. 一个bundle对应一个或多个chunk（默认1:1，但可通过配置合并或拆分）；
        2. 包含已压缩，混淆的代码及运行时逻辑；
    - 三者的关系
        1. 编译流程：Module -> 根据依赖和配置分组为Chunk -> 打包优化为Bundle；
        2. 类比
            - Module像一本书的每一页；
            - Chunk像按章节分组的草稿；
            - Bundle是最终印刷成册的书籍；

84. 说一下vite的构建流程
    - 开发模式
        1. 启动流程
            - 初始化服务器
                1. 启动KOA服务器，拦截浏览器请求；
                2. 创建模块依赖图，记录模块间的引用关系；
            - 处理入口文件（index.html）
                1. 解析HTML文件，识别script type="module"标签；
                2. 替换裸模块（如import vue from 'vue'）为node_modules/.vite/vue.js这样浏览器可识别的路径；
        2. 请求拦截与按需编译
            - 第三方模块
                1. 使用预构建将Commonjs/UMD模块转为ESM（通过esbuild），并缓存到node_modules/.vite；
                2. 例如：vue -> 预构建为vue.runtime.esm-bundler.js
            - 源码文件
                1. 浏览器直接请求.vue/.ts等文件时，vite实时编译；
                2. ts/js直接转译为esm；
                3. vue/svelte组件，拆解为template、script、style，分别处理；
                4. css/json，转为js模块；
        3. 热更新（HMR）
            1. 文件修改时，vite通过websocket通知浏览器；
            2. 仅重新编译变更文件及其依赖链，其他模块利用浏览器缓存；
        4. 开发模式优势
            - 极速启动：无需打包，浏览器直接加载ESM；
            - 按需编译：只编译当前页面需要的文件；
            - 原生HMR：基于ESM的精准更新；
    - 生产模式
        1. 依赖预构建（可选）
            - 复用开发阶段的预构建结果（如node_modules/.vite），或重新构建依赖为ESM格式；
        2. Rollup打包流程
            - 入口拆分
                1. 从index.html提取入口文件；
                2. 构建完整依赖图；
            - 代码分割与优化
                1. TreeShaking：删除未使用的代码；
                2. Chunk拆分：根据动态导入（import()）或配置拆分包；
                3. 静态资源处理：图片、css等通过插件优化；
            - 输出产物
                1. 生成dist目录，包含
                    - index.html
                    - assets/[name]-[hash].js
                    - assets/[name]-[hash].css
        3. 生成模式优势
            - 高性能输出：Rollup的打包效率优于webpack；
            - 兼容性处理：通过@vitejs/plugin-legacy支持旧浏览器；
    - 关键机制解析
        1. 原生ESM的利用
            - 开发时直接使用浏览器原生import/export，跳过打包；
            - 依赖解析通过@rollup/plugin-node-resolve处理；
        2. 预构建
            - 目的：将非ESM依赖转为ESM，减少请求数量；
            - 工具：esbuild；
            - 缓存：结果存储在node_modules/.vite
        3. 插件系统
            - 开发插件：处理源码转换（@vite/plugin-vue）；
            - 生产插件：Rollup插件兼容（rollup-plugin-terser）；

85. 如何让Proxy监听基本数据类型？
    - js中，proxy默认无法直接监听基本数据类型，因为proxy只能代理对象（包括数组和函数）；
    - 方法1：将基本类型包装为对象，通过new Object()或Object()将基本类型转为对应的包装对象，再用Proxy代理；
        1. 缺点：操作需要通过对象属性，无法直接赋值；
    - 方法2：使用自定义的getter/setter，结合对象的getter/setter监听基本类型的操作；
        1. 优点：语法更直观（如果proxy.value访问和修改）；
    - 方法3：借助vue3的ref实现，vue3的ref函数通过对象包装基本类型，并触发响应式更新；
    - 方法4：重写变量的赋值行为（非标准），通过Object.defineProperty劫持全局变量；
    - 为什么Proxy不能直接代理基本类型？
        1. 根本原因：基本类型是不可变值，而非对象引用；
        2. Proxy的工作机制是拦截对象属性的操作，而直接修改基本类型值不会触发任何对象属性的变更；
    - 最佳实践建议
        1. 优先使用包装对象配合Proxy；
        2. vue/react等框架中，直接使用内置的响应式api；
        3. 避免hack手段，如劫持全局变量，会导致代码难以维护；

86. Proxy能够监听到对象中的对象的引用吗？
    - Proxy可以监听到嵌套对象的引用变化，但需要根据具体操作方式区分不同的监听场景；
    - 默认情况下Proxy的监听范围：Proxy的拦截器默认只能监听到直接属性的访问或修改，而不会自动深度监听嵌套对象；
    - 如何监听嵌套对象的变化
        1. 递归代理嵌套对象：在get拦截器中返回嵌套对象的Proxy，实现深度监听；
            - 优点：实现完整的深度监听；
            - 缺点：性能开销较大（每次访问嵌套属性都会创建新Proxy）；
        2. 仅在修改引用时触发（vue3的响应式原理）：vue3的reactive仅在访问嵌套对象时才会代理，避免不必要的性能损耗；
        3. 手动标记需要监听的嵌套对象：为特定嵌套对象单独创建Proxy，按需监听；适用于明确知道需要深度监听的特定属性；
    - 注意事项
        1. 循环引用问题：递归代理可能因对象循环引用导致栈溢出，需用WeakMap缓存已代理对象；
        2. 性能权衡：深度监听会牺牲性能，应根据业务需求选择层级；
        3. 数组和特殊对象：Proxy可以监听数组方法，但需在拦截器中处理；

87. 需要在本地实现一个聊天室，多个tab页面互相通信，不使用websocket，怎么做？
    - 使用localStorage或sessionStorage + storage事件
        1. 原理：利用localStorage/sessionStorage的跨页面读写能力，结合window的storage事件监听数据变化；
        2. 实现步骤
            - 发送消息：在TabA中写入数据到localStorage；
            - 接收消息：在TabB中监听storage事件，获取数据；
        3. 特点
            - 跨Tab实时通信：storage事件会在其他tab中触发（当前tab不会触发）；
            - 数据持久化：localStorage数据长期保存，sessionStorage仅在会话期间有效；
            - 限制：同源策略下有效，且数据大小通常限制为5MB；
    - 利用BroadcastChannel API
        1. 原理：BoradcastChannel允许同源下的不同Tab、iframe或worker通过命名频道广播消息；
        2. 特点
            - 实时性强：无需轮询，消息即时广播；
            - 简单易用：无需依赖存储API；
            - 兼容性：现代浏览器支持（IE不支持）
    - 使用SharedWorker（共享Worker）
        1. 原理：SharedWorker是一个后台线程，多个tab可以共享同一个worker实例，通过它中转消息；
        2. 实现步骤
            - 创建一个sharedWorker脚本；
            - 各Tab通过SharedWorker端口通信；
        3. 特点
            - 高效：适合高频通信场景；
            - 复杂场景支持：可扩展为多Tab协同处理任务；
            - 兼容性：IE不支持，其他主流浏览器支持；
    - 使用IndexDB + 轮询
        1. 原理：用IndexDB存储消息，各Tab轮询检查数据变化；
        2. 特点
            - 适合大数据：IndexDB存储空间大；
            - 实时性差：依赖轮询，延迟较高；
    - 使用window.postMessage（跨iframe通信）
        1. 适用场景：如果Tab是通过window.open或iframe打开的，可通过postMessage通信；
        2. 特点
            - 定向通信：需知道目标窗口的引用；
            - 安全限制：需同源或处理跨域问题；

88. 空数组调用reduce会发生什么？
    - 当空数组调用reduce方法时，js会直接抛出错误，因为reduce需要至少一个初始值或非空数组才能进行计算；
    - 错误原因：reduce的核心逻辑是对数组元素从左到右依次执行回调函数，并将结果累积为单个值。如果数组为空且未提供初始值（initialValue），无法进行累积操作，因此报错；
    - 解决空数组调用reduce的两种方法；
        1. 提供初始值：通过第二个参数设置初始值，即使数组为空，也会返回值；
        2. 检查数组长度：在调用reduce前判断数组是否为空；
    - 为什么设计这种行为？
        1. 一致性要求：reduce必须保证回调函数至少执行一次；
        2. 数学意义：空数组的累加操作在数学上无定义；

89. Blob、ArrayBuffer、Base64有什么区别？分别有哪些使用场景？
    - Blob（Binary Large Object）
        1. 特点
            - 不可变：表示原始二进制数据的不可变对象；
            - 浏览器环境专用：主要用于文件操作（上传、下载）；
            - MIME类型支持：可指定数据类型（如image/png、text/plain）；
        2. 使用场景
            - 文件上传/下载：通过FormData上传或URL.createObjectURL下载；
            - 图片/视频预览：将二进制数据转为可展示的URL；
            - 大文件分片处理：通过Blob.slice()方法进行分片处理；
    - ArrayBuffer
        1. 特点
            - 底层二进制容器：表示通用的固定长度二级制数据缓冲区；
            - 不可直接操作：需通过TypedArray（如Unit8Array）或DataView访问；
            - 内存高效：适合处理音频、视频等原始二进制数据；
        2. 使用场景
            - WebSocket/WebRTC：处理网络接收的二进制数据；
            - 加密/解密：与Crypto API配合使用；
            - WebAssembly：作为内存交换格式；
    - Base64
        1. 特点
            - 文本编码格式：将二进制数据编码为ASCII字符串；
            - 体积膨胀：编码后数据比原始数据大1/3；
            - 可嵌入性：可直接嵌入文本文件；
        2. 使用场景
            - 图片内联：通过data URL嵌入网页；
            - 简单数据传输：如API返回二进制数据的文本化表示；
            - 本地存储：将二进制数据存到localStorage；


90. 如果在useEffect的第一个参数中return了一个函数，那么第二个参数分别传空数组和传依赖数组，该函数分别是在什么时候执行？
    - 依赖为数组为空[]
        1. 执行时机
            - 清理函数执行时机：仅在组件卸载时执行一次；
            - 副作用函数执行时机：仅在组件挂载时执行一次；
        2. 应用场景
            - 适用于只需在挂载时订阅（如事件监听、定时器），并在卸载时取消订阅的场合；
    - 依赖数组非空[dep1, dep2]
        1. 执行时机
            - 清理函数执行时机：在每次依赖项变化后、副作用函数重新执行前执行，且在组件卸载时也会执行；
            - 副作用函数执行时机：（1）组件卸载时执行一次；（2）依赖项变化后重新执行；
        2. 应用场景
            - 需要在依赖项变化时重新订阅或清理旧状态（如根据userId重新拉取数据）；
    - 无依赖数组（省略第二个参数）
        1. 执行时机
            - 清理函数执行时机：在每次组件重新渲染后、副作用函数执行前执行，且在组件卸载时也会执行；
            - 副作用函数执行时机：每次组件渲染后都会执行；
        2. 应用场景
            - 极少使用，通常会导致性能问题（除非副作用与强渲染相关）；

91. Electron中的主进程和渲染进程分别是什么？
    - 主进程
        1. 定义
            - 核心进程：每个Electron应用有且只有一个主进程，作为应用的入口点；
            - nodejs环境：拥有完整的nodejs api访问权限；
        2. 职责
            - 窗口管理：创建和控制浏览器窗口；
            - 系统交互：操作菜单、托盘图标、对话框等原生GUI；
            - 生命周期控制：处理应用启动、退出事件；
            - 通信枢纽：作为渲染进程之间的桥梁（通过ipcMain模块）；
        3. 特点
            - 权限高：可调用所有Electron和Nodejs API；
            - 重量级：应避免在主进程中执行且阻塞操作（如长时间计算），否则会导致页面卡顿；
    - 渲染进程
        1. 定义
            - 窗口进程：每个Electron窗口（BrowserWindow）对应一个独立的渲染进程；
            - 浏览器环境：运行Chromium渲染引擎，支持HTML、CSS、JS，但默认无Nodejs权限（除非开启nodeIntegration）；
        2. 职责
            - 界面渲染：展示网页内容；
            - 用户交互：处理页面内的点击、输入事件；
            - 受限系统访问：通过ipcRenderer与主进程通信间接访问系统功能；
        3. 特点
            - 隔离性：每个渲染进程独立运行，崩溃不影响其他窗口；
            - 安全性：默认沙箱环境限制敏感操作（需通过主进程代理）；
    - 进程间通信：由于进程隔离，主进程和渲染进程需要通过Inter-Process Communication（IPC）通信；
        1. 从渲染进程 -> 主进程
            - 发送消息（使用ipcRenderer.send）
            - 主进程监听（使用ipcMain.on）
        2. 从主线程 -> 渲染进程
            - 发送消息：通过webContents.send；
            - 渲染进程监听：ipcRenderer.on

92. Electron有哪些特点和优势？
    - Electron是一个基于Chromium和Nodejs的跨平台桌面应用开发框架，其核心特点和优势使其成为构建现代桌面应用的热门选择；
    - 核心特点
        1. 跨平台开发
            - 一次编写，多平台运行：支持windows、macOS和Linux，代码复用率可达90%以上；
            - 统一UI：基于Chromium渲染，确保界面在不同操作系统上表现一致；
        2. 技术栈复用
            - 前端技术栈：使用HTML、CSS、JS开发界面，降低学习成本；
            - Nodejs集成：可直接调用Nodejs API，轻松实现文件读写、网络通信等底层操作；
        3. 主线程和渲染进程分离
            - 多进程架构：主进程负责系统级操作，渲染进程处理界面渲染，通过IPC交互；
            - 安全性：默认沙箱隔离渲染进程，限制敏感操作；
        4. 丰富的原生能力
            - 系统集成：支持菜单栏、托盘图标、全局快捷键、通知、剪贴板等原生功能；
            - 硬件访问：可通过Nodejs或原生模块调用摄像头、蓝牙等硬件；
        5. 热更新与便捷调试
            - 开发者工具：内置Chromium开发者工具，支持实时调试界面；
            - 热重载：结合electron-reloader或webpack实现代码修改即时生效；
    - 核心优势
        1. 开发效率高
            - 快速原型：借助前端生态，快速构建功能完备的界面；
            - 社区支持：丰富的插件和开源模板；
        2. 生态兼容性强
            - npm包支持：可直接使用数百万npm模块；
            - 原生模块扩展：通过node-gyp或N-API集成C++模块；
        3. 渐进式增强
            - 混合开发：逐步替换传统桌面应用的部分功能；
            - Web技术迁移：将现有web应用快速打包为桌面端；
        4. 企业级应用验证
            - 广泛落地：被vscode、discord、teams、twitch等知名应用采用，稳定性经过验证；
    - 局限性与应对策略
        1. 资源占用较高：启用进程沙箱、延迟加载模块、使用轻量级前端框架；
        2. 安装包体积大：通过electron-builder分平台打包、压缩资源文件；
        3. 安全性风险：禁用nodeIntegration、启用contextIsolation、使用@electron/remote替代已弃用的remote模块；

93. 说说React中Element、Component、Node、Instance四个概念的理解；
    - Element
        1. 定义
            - 轻量级js对象：描述屏幕上希望渲染的内容；
            - 不可变：一旦创建，不应直接修改其属性；
            - 创建方式：通过React.createElement()或JSX语法生成；
        2. 特点
            - 仅包含type、props、children
            - 不是真实DOM：只是描述UI的普通对象
        3. 用途：作为react渲染的最小单位，用于构建虚拟DOM树；
    - Component
        1. 定义
            - UI的抽象单元：可以是函数组件或类组件；
            - 接收props：返回描述UI的Element；
        2. 特点
            - 可复用：组合多个组件构建复杂界面；
            - 无状态或有状态：函数组件或类组件；
        3. 用途：封装可复用的UI逻辑和结构；
    - Node
        1. 定义：指React渲染树中的任意节点
            - Element
            - 原始值
            - 数组
            - null/undefined/false
        2. 用途：描述children的多样性；
    - Instance
        1. 定义
            - 类组件的运行实例：仅存在于类组件中，通过this访问；
            - 生命周期管理：负责状态、副作用等；
        2. 特点
            - 函数组件无实例：React通过Fiber节点管理其状态；
            - 手段创建：开发者通常不直接操作实例，react内部管理；
        3. 用途：类组件中管理状态和生命周期；
    - 关系：Component（函数/类） -> 返回 -> Element（描述UI的js对象）-> 递归渲染 -> Node（Element/字符串/数组等）-> 映射为 -> Instance（仅类组件，内部管理）；
    - 常见问题
        1. 为什么函数族没有实例？
            - 函数组件是纯函数，状态通过Hook存储在Fiber节点中，而非实例；
        2. Element 和 Component的区别？
            - Component是生成Element的“工厂”，Element是Component的“产出”；
        3. 何时需要关注Instance？
            - 使用类组件，通过this访问实例方法或状态；

94. 什么是CI/CD？
    - CI：持续集成，开发人员频繁将代码变更合并到共享主干，每次提交后自动触发构建和测试；（1）尽早发现集成错误（如代码冲突、编译失败）；（2）确保代码库始终处于可工作状态；
    - CD
        1. 持续交付：代码通过CI后，自动打包为可发布的版本，但需手动触发部署到生产环境；
        2. 持续部署：在持续交付的基础上，自动将通过测试的代码发布到生产环境；
    - CI/CD核心流程
        1. 代码提交阶段
            - 开发者推送代码到git仓库；
            - 触发CI/CN流水线；
        2. 持续集成阶段
            - 代码检查：静态分析；
            - 构建：编译打包、打包依赖；
            - 单元测试：运行自动化测试；
            - 生成产物：输出可部署的包；
        3. 持续交付/部署阶段
            - 集成测试：在类生产环境运行端到端测试；
            - 部署到预发布环境：验证功能；
            - 人工审核：确认发布；
            - 生产环境部署：自动或手动发布到线上；
    - CI/CD的优势
        1. 快速交付：缩短从开发到上线的周期；
        2. 质量保障：自动化测试减少人为错误；
        3. 风险降低：小批量发布便于问题回滚；
        4. 团队协作：统一流程减少“在我机器能跑”问题；


95. 说说jsBridge的原理？
    - JSBridge是js和原生代码之间双向通信的桥梁，主要用于混合开发中实现Web页面和原生应用的交互。其核心原理是通过特定的通信机制打破js运行环境于原生环境的隔离；
    - JSBridge的核心原理
        1. 通信基础：WebView的桥接能力；
            - Android的WebView和iOS的WKWebView提供了js于原生代码交互的接口；
            - Android通过@JavascriptInterface注解或evaluateJavascript；
            - iOS通过evaluateJavaScript:或WKScriptMessageHandler；
        2. 双向通信机制
            - js调用navtive
                1. URLScheme拦截：js发起伪协议请求（jsbridge：//methodName?params=xxx），Native拦截并解析；
                2. 注入API：Native向WebView注入全局对象（如window.JSBridge），JS直接调用其方法；
            - native调用js
                1. 通过WebView的evaluateJavascript或stringByEvaluateJavascriptFromString直接执行js代码；
        3. 消息格式与协议
            - 统一消息格式：通常为JSON，包含方法名、参数、回调ID等；
            - 回调管理：通过callbackId映射原生执行结果到js的回调函数；
    - JSBridge的实现方式
        1. URL Scheme拦截
            - 步骤
                1. js动态创建<iframe src="jsbridge://methodName?params=xxxx"></iframe>
                2. Native拦截请求并解析URL，执行对应原生方法；
                3. Native通过evaluateJavascript返回结果；
            - 优缺点
                1. 兼容老旧WebView；
                2. 性能较差（频繁创建iframe），URL长度受限；
        2. 注入全局对象
            - 步骤
                1. Native向WebView注入一个全局对象（window.JSBridge）；
                2. JS直接调用window.JSBridge.callMethod("getUserInfo", params, callback);
                3. Native通过反射或消息队列处理请求，并通过回调返回结果；
            - 优缺点
                1. 性能高，支持复杂数据；
                2. 需要注意Android4.2以下的安全漏洞（@JavascriptInterface限制）；
        3. WebView的原生API（iOS WKWebView）
            - iOS的WKWebView通过addScriptMessageHandler注册方法，js通过window.webkit.messageHandlers.methodName.postMessage(params)调用；
    - JSBridge的关键问题与优化
        1. 安全性
            - Android：限制@JavascriptInterface暴露的方法，避免敏感操作；
            - iOS：禁用JavascriptCanOpenWindowsAutomatically防止恶意跳转；
        2. 性能优化
            - 消息队列：合并高频调用；
            - 长连接：复用WebSocket替代多次短请求；
        3. 跨平台统一
            - 封装统一的JS SDK，屏蔽平台差异；
        4. 调试支持
            - 在Chrome DevTools中模拟Native调用；            

96. 说说你对React Hook的闭包陷阱的理解，有哪些解决方案？
    - 闭包陷阱是指在使用useEffect等Hook时，由于js的闭包机制，函数内部捕获的变量可能不是最新的状态或props，导致出现意料之外的行为；
    - 闭包陷阱本质：js中的函数会“记住”其定义时的作用域中的变量值。在React中，组件每次渲染都会创建新的作用域，但某些Hooks中引用的变量可能会保留旧的值，造成数据不一致的问题；
    - 解决方案
        1. 将依赖项加入到useEffect的依赖数组；当依赖项变化时，会重新执行useEffect中的逻辑；
        2. 使用useRef存储最新值；利用ref来保存最新的状态值，绕过闭包限制；
        3. 使用函数式更新：当需要更新状态而不需要当前值时，可以使用函数式更新；
        4. 封装自定义Hook管理状态与副作用；
        5. 使用useCallback固定函数引用；

97. WebSocket有哪些安全问题，应该如何应对？
    1. 安全问题
        - 跨域WebSocket连接
            1. websocket协议本身没有同源策略，只要服务器允许，任何网站都可以与目标服务器建立连接；
            2. 攻击者可以利用这一点发起恶意连接，进行数据窃取或攻击；
        - 中间人攻击
            1. 如果使用ws://，数据以明文传输，容易被中间人截获；
            2. 推荐使用加密协议wss://；
        - 消息注入攻击
            1. 客户端发送的消息未经过滤或验证，可能包含恶意内容；
        - 拒绝服务攻击（DoS）
            1. 攻击者可以创建大量websocket连接耗尽服务器资源，导致正常用户无法连接；
        - 会话劫持/身份伪造
            1. websocket没有内置的身份验证机制；
            2. 攻击者可以通过获取用户的token或session来伪装成合法用户；
        - 协议降级攻击
            1. 客户端或服务器配置不当，可能导致使用不安全的子协议或扩展；
    2. 应对方法
        - 使用加密协议wss://
        - 设置Origin白名单
        - 对消息内容进行校验和过滤
        - 实施身份验证与授权
        - 限制连接频率与并发数
        - 使用wss中间件或代理
        - 监控日志审计
        - 使用子协议与扩展控制通信格式

98. 相对比npm和yarn，pnpm的优势是什么？
    - 节省磁盘空间
        1. pnpm使用内容可寻址存储来存储包；
        2. 所有项目共享一个全局存储目录；
        3. 同一版本的依赖只存储一次，并通过硬链接或符号链接引用；
    - 更快的安装速度
        1. 因为不许亚萍重复下载和拷贝文件，pnpm的安装速度通常比npm和yarn快；
        2. 尤其适合大型项目或monorepo结构；
    - 严格的扁平化依赖结构
        1. pnpm不允许嵌套依赖，避免“依赖地狱”问题；
        2. 所有依赖扁平化安装，提高了确定性和可维护性；
        3. 如果存在版本冲突，会明确提示错误，而不是静默覆盖；
    - 支持monerepo
        1. pnpm原生支持workspaces功能，可以轻松构建多包项目；
        2. 支持本地包之间的软连接，开发体验更流畅；
        3. npm需要第三方工具npm-workerspaces或lerna，yarn则需要启用workspaces功能；
    - 更好的缓存机制
        1. pnpm缓存基于内容哈希，确保缓存一致性；
        2. 即时切换分子或重装依赖，也能快速恢复；
    - 更小的node_modules目录
        1. pnpm的node_modules是一个由符号链接组成的虚拟结构，体积远小于npm或yarn；

99. cookies怎么设置只在https时携带？
    - 通过Set-Cookie响应头设置：在服务器返回HTTP响应头中使用set-cookie，添加secure属性；
        1. Set-Cookie：session_token=123; Secure; HttpOnly; SameSite=Strict；
        2. Secure：表示cookie只能通过https协议传输；HttpOnly：防止XSS攻击；SameSite：可控制跨站请求是否携带Cookie；
    - 通过JS设置（不推荐用于敏感Cooki）
        1. 如果设置了Secure，js无法通过document.cookie设置带了Secure的cookie；
        2. 因此这种方式通常用于非敏感cookie；
    - 为什么需要设置Secure
        1. 明文传输：如果Cookie没有Secure，在HTTP下会被明文传输，容易被中间人窃取；
        2. 会话劫持：获取用户的Session Cookie后，攻击者可以伪装成用户进行操作；

100. SEO是什么？原理是什么？怎么进行SEO优化？
    - SEO是一种提升网站在搜索引擎（非广告）搜索结果中可见性的方法，其目标是让网站更容易被搜索引擎“发现”，“理解”和“推荐”
    - 工作原理
        1. 爬取：搜索引起使用“爬虫”自动访问网页，它们会从一个已知页面触发，沿着链接不断访问其他页面；
        2. 索引：爬取到的内容会被分析并存储在搜索引擎数据库中；
        3. 排序：当用户进行搜索时，搜索引擎根据数百个因素对已索引的网页进行排序，排名越高，越容易被点击；
    - SEO核心影响因素（Google排名算法参考）
        1. 内容质量：内容相关性强、原创、有深度、满足用户需求；
        2. 页面体验：加载速度快、移动端友好、无死链；
        3. 技术SEO：结构清晰、URL友好、sitemap提交；
        4. 外部链接：来自权威网站的高质量反向链接；
        5. 用户行为：点击率、停留时间、跳出时间；
        6. E-E-A-T原则：Experience（体验）、Expertise（专业）、Authoritativeness（权威）、Trustworthiness（可信）；
    - 如何进行SEO优化
        1. 关键词研究：使用工具找出用户常搜索的词；选择有流量、竞争低、匹配业务的关键词；
        2. 页面内容优化
            - 标题：包含核心关键词、控制在60字以内；
            - 描述：吸引用户点击，建议150-160字；
            - 正文内容：自然融入关键词、分段清晰、图文结合、使用H1-H6标题层级结构；
            - 图片优化：添加alt属性描述图片内容、图片压缩、使用webp格式；
        3. 技术SEO优化
            - 响应速度优化：使用CDN加速、启用Gzip压缩、合并js/css文件；
            - 移动端适配：响应式设计、移动端加载优化；
            - 结构化数据：使用JSON-LD标记文章、产品、FAQ等信息，帮助搜索引擎更好理解内容；
            - 提交站点地图
        4. 外部链接建设
            - 获取来自高权重网站的外链：内容营销、媒体曝光、行业合作、资源互动、社区互动；
        5. 用户体验优化
            - 减少跳出率：确保内容符合用户搜索意图；
            - 提高点击率：优化标题和摘要；
            - 增加停留时间：提供相关内容、内部链接、推荐阅读等；

101. 如何让Promise.all抛出异常后依然有效？
    - 使用.catch捕获每个Promise的错误（推荐）：将每个Promise包装成一个始终resolve的Promise，在catch中返回错误信息；优点是可以控制细粒度，知道哪个promise成功、哪个失败，且不影响其他Promise的执行；
    - 使用Promise.allSettled（现代浏览器推荐）：它会在所有Promise完成（无论成功失败）后返回一个数组，包含每个Promise的状态；优点是原生支持，语义清晰；不需要手动包装每个Promise；所有Promise都会执行完毕；
    - 自定义封装函数处理异常聚合；

102. POST请求的Content-Type常见的有哪几种？
	- application/json
		1. 用途：最常见的类型，适用于前后端分离架构；
		2. 特点：使用JSON格式传递结构化数据；易于解析和调试；
	- application/x-www-form-urlencoded
		1. 用途：模拟HTML表单提交，适用于传统后端数据接收方式；
		2. 特点：数据以key1=value1&key2=value2形式发送；需要URL编码；
	- multipart/form-data
		1. 用途：主要用于文件上传，也可以包含其他字段；
		2. 特点：每个字段之间用边界字符串分隔；支持二进制数据，适合图片、视频等文件上传；
	- text/xml / application/xml
		1. 用途：早期Web Service接口使用；
		2. 特点：结构复杂，不如JSON轻量；现在逐渐被JSON替代；
	- application/octet-stream
		1. 用途：发送原始二进制数据，常用于文件上传或下载；
		2. 特点：通常用于一次性传输整个文件；不携带额外元信息；
	- application/graphql
		1. 用途：GraphQL接口请求；
		2. 特点：专门用于GraphQL查询；一般配合POST方法使用；

103. 怎么触发BFC，BFC有什么应用场景？
	- BFC是一个独立的渲染区域，在这个区域内：
		1. 元素按照特定的规则进行排列；
		2. 外部元素不会影响内部布局；
		3. 内部浮动元素不会影响外部元素的高度（解决高度坍塌）；
	- 如何触发BFC？
		1. 浮动元素：float不为none；
		2. 绝对定位元素：position为fixed或absolute；
		3. 行内块元素：display: inline-block；
		4. 弹性容器：display: flex / inline-flex；
		5. 网格容器：display: grid / inline-grid;
		6. 溢出处理：overflow不为visible；
		7. 根元素：html元素本身是一个BFC；
	- BFC的作用及其应用场景
		1. 清除浮动（防止高度坍塌）：父元素只包含浮动子元素时，父元素高度为0；给父元素创建BFC自动撑开高度；
		2. 防止外边距合并：两个相邻块级元素的上下margin会合并；将其中一个元素放入新的BFC，即可避免margin合并；
		3. 实现两栏/三栏布局：左侧固定宽度、右侧自适应；左侧使用float，右侧利用BFC自动填充剩余空间；
		4. 文字环绕图片（传统排版效果）：图片左浮动，文字围绕图片显示；
	- 注意事项
		1. BFC是浏览器自动创建的，只要满足条件即可触发；
		2. 不同浏览器行为可能略有差异；
		3. 不要滥用overflow: hidden；

104. 怎么理解前端鉴权？
	- 前端鉴权的核心概念
		1. 认证：判断用户是否登录；
		2. 授权：判断用户是否有权限执行某个操作或访问某个页面；
	- 常见前端鉴权的方式
		1. Cookie+Session：浏览器保存cookie，服务端维护session，登陆后由服务端写入set-cookie；
		2. Token（JWT）：前端保存Token，每次请求带上；登陆后返回token，后续请求加到header；
		3. OAuth2/OpenID Connect：第三方登录；授权码模式、隐式模式等；
		4. SSO：多个系统共用一套登陆状态；使用统一认证中心，如CAS、OAuth2；

105. 浏览器乱码的原因是什么？如何解决？
	1. 原因
		- 网页源文件编码与声明的编码不一致
			1. HTML文件保存为UTF-8，但<meta charset>声明为GBK；
			2. HTML文件实际为GBK编码，服务器返回时声明为UTF-8；
		- 服务器响应头为正确设置字符集：服务器没有在响应头中指定字符集，导致浏览器使用默认编码解析（window下默认是GBK）
		- 文件本身编码格式错误：HTML/CSS/JS文件保存的编码格式与网页要求的不一致；
			1. 使用了ANSI格式保存UTF-8内容；
			2. 使用编辑器保存时未选择正确的编码格式；
		- 前后端传输过程中的编码问题
			1. GET请求参数包含中文，未进行URL编码；
			2. POST请求头未设置Content-Type: charset=UTF-8；
		- 数据库或接口返回数据未统一编码；
			1. 接口返回JSON数据，但服务端未设置响应头Content-Type：charset=utf-8；
			2. 数据库存储非utf-8编码，后端未作转换就返回给前端；
	2. 解决方法
		- 统一使用UTF-8编码：html文件保存为utf-8格式；html中添加meta声明；
		- 服务器配置字符集：Content-Type: text/html; charset=utf-8;
		- 检查并统一后端接口编码：Content-Type: application/json; charset=utf-8;
		- GET/POST请求参数编码处理；
		- 使用工具检测编码；

106. title与h1的区别、b与strong的区别、i与em的区别？
	- title/h1
		1. title：页面标题，显示在浏览器标签页或搜索引擎结果中，不属于页面内容；存在于head头部；仅在浏览器标签页可见；对SEO非常重要；一个页面只能有一个title；
		2. h1：页面主标题，是页面内容的一部分，通常用于展示主要内容标题；存在于body体；页面内可见；对SEO重要；一个页面建议一个h1（允许多个，但不建议）；
	- b/strong
		1. b：无语义加粗，仅样式作用，不强调内容的重要性；
		2. strong：语义上的强调，表示内容非常重要，屏幕阅读器会特别强调；
	- i/em
		1. i：无语义斜体，仅样式作用；
		2. em：语义上的强调，表示语气上的强调，屏幕阅读器会用不同语调朗读；
	- 关键：样式交给CSS，语义交给HTML；使用具有语义的标签，可以提升页面的可访问性、SEO和代码可维护性；
	

107. 浏览器是如何对HTML5的离线存储资源进行管理和加载？
	- Application Cache（AppCache）-- 已废弃（不建议使用）
		1. 原理
			- 使用.appcache文件列出需要缓存的资源；
			- 浏览器首次加载后资源缓存到本地；
			- 离线时从缓存中加载页面；
		2. 问题
			- 更新机制复杂，容易出错；
			- 缓存更新需手动更改文件内容；
			- 不利于动态内容加载；
	- Service Worker + Cache Storage（现代主流方案）
		1. 原理流程：用户首次访问 ——> 注册ServiceWorker ——> Service Worker安装阶段 ——> 缓存指定资源 ——> 后端请求由SW拦截并决定是否使用缓存 -> 是否有网络？ - 有 -> 请求资源并更新缓存; - 无 -> 使用缓存资源加载页面；
		2. 核心API
			- navigator.serviceWorker.register("sw.js")；
			- caches.open("v1").then((cache) => cache.addAll([...]))
			- fetch事件拦截与响应控制；
		3. 优点
			- 可编程控制缓存逻辑；
			- 支持后台同步、推送通知等PWA功能；
			- 更好的性能优化空间；
	- LocalStorage / SessionStorage
		1. 特点
			- 键值对存储，最大约5MB；
			- LocalStorage: 永久存储（除非手动清除）；
			- SessionStorage：仅在当前会话有效；
		2. 适用场景
			- 用户偏好设置（如主题、语言）；
			- 表单数据临时缓存；
			- 登录状态缓存（非敏感信息）；
		3. 局限
			- 不能存储复杂对象；
			- 同步操作，阻塞主线程；
			- 不适合大规模数据存储；
	- IndexDB
		1. 特点
			- 强类型客户端数据库；
			- 支持异步操作；
			- 可存储大量结构化数据；
		2. 适用场景
			- 需要离线编辑的数据；
			- 本地缓存接口返回数据；
			- 复杂表结构数据管理；

108. Object和Map有什么区别？
	- 键的类型不同
		1. Object的键只能是：字符串、Symbol；
		2. Map的键可以是：任意类型（数字、字符串、布尔值、对象、函数、NaN等）；
	- 顺序问题
		1. Object在ES6之前不保证键的顺序；
		2. Map始终按照插入顺序保存键值对；
	- 内置方法与便利性
		1. 获取键值对数量：Object无size，需手动计算；Map有size属性；
		2. 遍历：Object不是可迭代对象，需借助Object.entries()；Map支持for...of；
		3. 清空：Object手动删除所有键；Map支持clear()方法；
		4. 设置多个值：object需逐个赋值；map构造器接受数组[[k1,v1],[k2,v2]]；
		5. 检查键是否存在：Object适用in运算符或哈sOwn Property()；Map使用has()方法；
	- 原型链污染问题
		1. Object可能受到原型链上的属性影响，出现意外行为；
		2. Map完全隔离原型链影响；
	- 性能对比
		1. 小量静态数据：Object更轻量级、访问更快；
		2. 频繁增删改查：推荐使用Map；
		3. 使用对象作为键：Map支持；
		4. JSON序列化：Object天然支持JSON.stringify()；Map默认不支持，需自定义处理；
	- 总结
		1. Object更适合静态、简单、可序列化的数据结构；
		2. Map更适合动态、复杂、需要高性能操作的场景；

109. cookie的有效时间设置为0会怎么样？
	- js中，通过document.cookie设置Cookie的expires或max-age为0时，浏览器会将该cookie视为已过期，从而立即删除该cookie；

110. webpack loader和plugin的实现原理？
	- loader的实现原理
		1. 定义：loader是用于转换特点类型模块的工具。它本质上是一个函数或对象，接收源代码作为输入，返回处理后的结果；
		2. 作用：将非js文件转换为webpack可识别的模块；支持链式调用；
		3. 实现原理
			- 匹配规则：wenpack根据webpack.config.js中的module.rules匹配文件路径；
			- 加载器执行顺序：多个loader按照从右到左的顺序执行；每个loader接收上一个loader的输出作为输入；
			- 异步支持：loader可以是同步也可以是异步；
			- 返回值：返回js代码字符串，供webpack继续处理；
	- plugin的实现原理
		1. 定义：Plugin是用于在webpack编译生命周期中注入自定义逻辑的插件机制。它可以监听编译过程中的事件钩子，并执行相应的操作；
		2. 作用
			- 修改编译过程或最终输出（压缩、优化、生成额外文件）
			- 监听构建生命周期事件（如compile、compilation、emit）；
			- 提供全局配置功能；
		3. 实现原理
			- 基于Tapable库的事件驱动机制：Webpack内部使用了Tapable这个库来管理事件钩子；插件通过compiler.hooks.compilation.tap(...)等方式注册钩子函数；
			- 生命周期钩子：webpack在整个构建过程中会触发多个钩子事件，常见的有：
				1. beforeRun：编译开始前；
				2. run：开始读取入口文件；
				3. compile：开始编译；
				4. compilation：创建一次新的compilation（每次增量构建都会触发）；
				5. emit：即将输出文件到dist；
				6. done：构建完成；
			- 插件结构：Plugin是一个类，必须提供apply(compiler)方法，并绑定到某个钩子上；
	- webpack内部流程简析：入口文件 -> 递归解析依赖 -> 调用loader处理每个模块 -> 构建AST，分析依赖关系 —> 调用plugin的各个钩子 -> 生成chunk，写入dist；
		1. loader：负责”翻译“各种格式的模块为js模块；
		2. plugin：负责”控制“整个构建流程，做全局性的优化和处理；

111. 为什么css不支持父选择器？
	- 原因
		1. 性能问题：如果允许通过子元素选择父元素，浏览器需要在渲染页面时进行大量逆向查找，这会显著影响页面性能。这种反向查询可能涉及遍历整个DOM树；
		2. 规范限制：CSS的设计初衷是自上而下应用样式，而不是基于子元素去修改祖先节点的样式。目前的标准没有提供直接支持父选择器的功能；
		3. 复杂性和可维护性：引入父选择器可能导致负责的级联和难以调试的样式规则，从而增加css的维护成本；
	- 替代方案
		1. 使用js或jQuery来动态添加类或样式到父元素；
		2. 在HTML结构中重新组织代码，将逻辑转移到更易控制的地方；
		3. 利用现代css特性如:has()（注意兼容）；

112. vue中的$route和$router有什么区别？
	- $route：用于读取当前路由的信息；
	- $router：用于操作路由的行为，比如跳转、替换、前进或后退；

113. sourcemap的原理
	- 基本结构：一个SourceMap文件（通常以.map结尾）是一个JSON文件，它包含以下关键字段
		1. version：source map的版本号；
		2. file：生成文件的名称（即压缩后的JS/CSS文件）；
		3. sourceRoot：源文件的根路径；
		4. sources：原始源文件的路径数组；
		5. names：原始变量名和函数名列表；
		6. mappings：表示压缩代码与源代码之间的映射关系；
	- mappings的编码规则（VLQ编码）：mappings是Base64 VLQ（Variable Length Quantity）编码字符串，每一段表示一个映射条目。每个条目通常包含以下信息：
		1. 生成文件中的位置；
		2. 对应源文件索引；
		3. 源代码中的位置；
		4. 名称索引；
	- 工作流程
		1. 构建阶段：工具在打包/压缩代码时生成source map；在输出文件末尾添加注释指向source map文件；
		2. 浏览器加载时：浏览器解析到source map注释后，会下载对应的.map文件；将压缩代码的位置通过mappings映射到原始源文件；
		3. 调试时：开发者工具显示的是原始源码，而不是压缩后的代码；报错队栈也会显示原始文件和行号；
	- 注意事项
		1. 安全性：不要将source map部署到生产环境，避免暴露源码；
		2. 性能开销：生成source map会增加构建时间和输出体积；
		3. 格式兼容性：不同构建工具对source map支持程度有差异；

114. React服务端渲染怎么做？原理是什么？
	- React SSR的原理
		1. 渲染流程概览
			- 请求达到服务器：用户访问一个URL；
			- 服务器获取数据：根据路由或接口预取数据；
			- 组件渲染成HTML：使用ReactDOMServer.renderToString()或renderToPipeableStream()将React组件渲染为HTML字符串；
			- 注入到模板中：将渲染结果插入HTML模板中，并返回给到浏览器；
			- Hydration：浏览器接收到HTML后，通过ReactDOM.hydrateRoot()恢复React组件的交互能力；
		2. 核心API
			- ReactDOMServer.renderToString()：将React元素渲染为HTML字符串，适用于简单场景；
			- ReactDOMServer.renderToStaticMarkup()：类似于renderToString，但不会额外添加DOM属性，适合静态内容生成；
			- ReactDOM.hydrateRoot()：在浏览器“水合”已有HTML，使其具备交互功能；

115. 既然vue通过数据劫持可以精确探测数据在具体dom上的变化，为什么还需要虚拟DOM呢？
	1. 数据劫持能做什么？
		- 依赖收集：当组件依赖某个响应式数据时，会建立“数据 -> 组件”的映射关系；
		- 精确更新：当数据变更时，通知对应组件重新渲染；
		- 异步更新机制：Vue使用nextTick异步更新视图，避免频繁重排重绘；
	2. 为什么还需要虚拟DOM？
		- 粒度控制与Diff算法
			1. 数据劫持只能知道某个属性发生变化，无法知道具体更新哪些DOM节点；
			2. 虚拟DOM是对真实DOM的轻量级抽象，它允许我们进行高效的diff运算，找出最小的DOM更新范围；
			3. 如果直接操作真实DOM，即使知道某个数据变化，也无法判断是否需要增删节点、修改属性还是文本内容；
		- 提升性能与减少重排重绘
			1. 每次操作真实DOM都可能触发浏览器布局和绘制，成本很高；
			2. 虚拟DOM允许我们在内存中国构建新的树结构，通过Diff找到最小差异后，再一次更新真实DOM，从而减少重排重绘次数；
		- 跨平台一致性与可扩展性
			1. vue支持多平台，在不同平台的DOM API不同；
			2. 虚拟DOM提供了一个统一的中间层，使得框架可以在不同平台上复用一套更新逻辑；
		- 支持JSX、函数组件等高级特性
			1. vue支持使用jsx或函数组件编写UI，这些语法最终会被编译成虚拟DOM树；
			2. 如果没有虚拟DOM，这类高级写法难以实现；
		- 更好的开发体验与调试
			1. 虚拟DOM提供了组件结构的清晰表示，便于开发者工具进行调试、性能分析和热更新；
			2. 在vue3中，虚拟DOM还支持更细粒度的更新控制；
	3. vue3的优化，引入了compiler + runtime协作机制，可以通过模板编译生成高效的渲染函数，甚至跳过完整的虚拟DOM构建过程，但这仍然是基于虚拟DOM的思想改进而来；

116. 为什么扩展JS的内置对象不是好的做法？
	- 命名冲突风险高：js是动态语言，且多个库开发者可能同时修改同一个内置对象，一旦出现这种行为，可能导致不可预料的行为；
	- 破坏现有代码或第三方库：很多第三方库以及浏览器原生实现都依赖于标准的内置对象行为，如果修改这些原型，可能会导致它们的行为异常甚至崩溃；
	- 影响可维护性和可读性：扩展会使得代码变得难以理解和维护；其他开发者看到扩展代码时，很难判断这是原生方法还是自定义方法；IDE和类型系统对这类扩展支持很差，缺乏智能提示和类型检查；
	- ES6 + 模块化趋势下更不合适：现代js推崇模块化、函数式编程理念，推崇“组合优于继承”的设计模式。
	- ts支持差：在ts中扩展内置方法需要手动声明类型定义，否则会出现编译错误。且多个地方进行扩展，可能出现类型定义冲突；

117. 什么是运营商劫持？有什么防御措施？
	- 指的是互联网服务提供商或中间网络节点在用户与目标服务器之间，未经用户授权拦截、篡改或注入网络请求内容的行为；这种行为通常发生在HTTP请求中，尤其在非加密的通信链路上；
	- 常见的劫持类型
		1. DNS劫持：修改DNS解析结果，将用户引导到恶意或广告网站；
		2. HTTP注入：在网页中插入广告、脚本、统计代码等；
		3. HTTPS中间人攻击：强制降级为HTTP或伪造证书进行监听；
		4. 页面重定向：用户访问正常网页时被跳转到其他页面；
	- 劫持危害
		1. 隐私泄漏：窃取用户输入的树；
		2. 安全风险：注入恶意脚本导致XSS、钓鱼攻击；
		3. 用户体验差：频繁弹出广告、页面加载变慢；
		4. 数据完整性受损：页面内容被篡改，影响业务逻辑和展示效果；
	- 防御措施
		1. 使用HTTPS：HTTPS基于TLS加密传输，可防止中间人篡改或监听；
		2. 内容完整性校验：通过integrity属性指定资源的哈希值；
		3. 使用CSP：限制网页只能加载指定来源的脚本、样式等资源；
		4. 前端埋点监控异常请求；
		5. 使用WebWorker/ServiceWorker进行隔离；
		6. 前端加密敏感数据：对敏感数据进行前端加密后提交；避免明文传输，降低中间人获取有效数据的风险；
		7. 推广使用公共DNS
	- 如何检测是否被劫持？
		1. 抓包分析：查看是否被重定向；查看是否返回内容有额外脚本或广告；
		2. 对比本地测试环境；
		3. 使用在线工具检测；

118. 前端工程化的理解？
	- 前端过程的核心目标
		1. 标准化：统一代码风格、目录结构、命名规范等；降低团队协作成本；
		2. 自动化：自动化构建、测试、部署，减少人为错误；
		3. 模块化：拆分功能为独立模块，提供可复用性和可维护性；
		4. 可维护性：提升代码可读性、文档完备、易于扩展与重构；
		5. 可交付性：确保产品高质量、安全、稳定上线；
	- 关键组成部分
		1. 代码管理：版本控制、分支策略、code review、ci/cd集成；
		2. 模块化开发：ESM、CMD、TS等实现模块拆分；借助组件化框架进行UI分层开发；实现高内聚、低耦合；
		3. 构建工具：打包工具、代码运行器、代码压缩优化；
		4. 质量保障：代码规范、单元测试、e2e测试、类型检查；
		5. 性能优化：静态资源压缩、图片优化、缓存策略、构建产物分析；
		7. 部署与监控：CI/CD集成、部署方式、性能监控、异常上报；
		8. 文档与协作：技术文档、接口文档、设计资产同步；
	- 前端过程化演进
		1. 2015年前：手动开发、无规范、无构建工具；
		2. 2015-2018：Gulp/Grunt + Bower + CommonJS；
		3. 2018-2021: Webpack + npm + React/Vue生态；
		4. 2021至今：Vite + TS + Monerepo + ESM原生支持；
		5. 未来趋势：AI辅助编码、自动化测试增强、DevOps一体化；

119. 移动端适配方案的对比？
	- 响应式布局（@media）
		1. 优点：简单直观、兼容性好、不依赖JS；
		2. 缺点：断点管理麻烦、难以处理复杂的流式布局；无法精确适配所有设备；
	- rem适配
		1. 优点：尺寸可预测，适配精度高；支持1px解决方案；
		2. 缺点：需要JS执行，首次加载可能闪屏；SEO友好性差；
	- vw/vh
		1. 优点：不需要js，纯css实现；适配逻辑简单，开发体验友好；
		2. 缺点：字体大小不适配（不能直接用vw）；1px问题依然存在；某些机型浏览器解析不准；
	- postcss-pxtorem 自动转换px -> rem；
		1. 优点：开发使用px，编译成rem；更符合工程化规范；集成vue cli/vite容易；
		2. 缺点：需要构建支持；首屏渲染可能出现Flash Of Unstyled Content；
	- 媒体查询 + rem混合方案
		1. 优点：精确控制多个设备区间；适配更精细；
		2. 缺点：配置复杂，维护成本高；不利于自动化扩展；
	- 图片和字体适配：srcset/sizes；rem/vw控制字体大小；
		1. 优点：视觉一致性好；减少加载资源体积；
		2. 缺点：需要后端或CDN支持图片转码；需要设计提供多套切图；
	- 响应式框架（Vant/ElementPlusMobile）
		1. 优点：组件统一、开发效率高；社区成熟、文档完善；
		2. 缺点：包体积大；定制化成本高；

120. 如果不希望别人对obj对象添加或删除元素，应该怎么做？
	- Object.preventExtensions(obj)
		1. 功能：阻止向对象添加新的属性；
		2. 特点：可以修改已有属性值；可以删除已有属性；仅防止新增属性；
	- Object.seal(obj)
		1. 功能：等价于Object.preventExtensions(obj)；同时将所有已有属性设置为不可配置，即不能删除属性，也不能重新定义属性描述符；
		2. 特点：可以修改已有属性值；不能添加新属性、删除已有属性；属性描述符不可更改；
	- Object.freeze(obj)
		1. 功能：等价于Object.seal(obj)；同时将所有已有属性设置为只读，即不能修改属性值；
		2. 特点：完全冻结对象，不能添加、删除修改；是最严格的限制方式；如果是引用类型，内部对象对象不会被递归冻结；
	- Proxy/Reflect自定义控制
		1. 功能：可以使用Proxy对象来自定义对象的操作行为，比如拦截set/deleteProperty，从而实现灵活控制；
		2. 特点：灵活控制添加、删除、修改等操作；不改变原对象，返回的是代理对象；更适合用于开发调试或封装库时做细粒度控制；
	- 使用TS + 类型保护
		1. 功能：无法在运行时操作，但可以在编译期通过类型错误提示修复；
		2. 特点：不是运行时保护；只能在开发阶段提供类型检查；推荐结合其他方式使用；

121. 在map中和for中调用异步函数的区别？
	- map(async ...)的行为
		1. map中的异步函数返回的是一个Promise；
		2. 所有异步任务会并行发起；
		3. 如果需要获取最终结果，必须使用await；
		4. 不会阻塞后续代码的执行；
	- for中调用异步函数的行为
		1. 每次迭代都会await异步函数，因此是串行执行；
		2. 上一个异步任务完成后才会开始下一个；
		3. 更适合需要顺序执行的任务；
		4. 回阻塞后续代码执行；

122. Prerender预渲染是什么原理？
	- 基于Headless浏览器：Prerender使用无头浏览器来模拟真实浏览器行为，执行js并等待页面完全渲染完成后，获取最终的HTML内容；
	- 流程概览：搜索引擎或用户请求 -> Prerender Server拦截请求 -> 启动Headless浏览器加载页面 -> 执行js动态渲染页面内容 -> 提取完整HTML返回给客户端；
	- 关键技术点
		1. 等待页面渲染完成，通过监听window.prerenderReady标志位或超时机制判断是否渲染完成；
		2. 缓存机制：首次渲染后缓存HTML，后续请求直接返回缓存结果，提高性能；
		3. User-Agent判断：只对爬虫或特定UA的请求进行Prerender，避免影响正常用户访问；
	- 适用场景
		1. SEO优化：针对不支持JS渲染的搜索引擎提供静态HTML；
		2. 社交分享优化：提升微信、微博等平台的卡片预览效果；
		3. 首屏加载体验：对弱网环境下的用户，提前返回可渲染HTML，减少白屏时间；
		4. SSR成本高时的替代方案：不想引入Vue/React复杂度时，使用Prerender做轻量级预渲染；

123. 请求在客户端报413是什么错误，怎么解决？
	- 413 Payload Too Large：表示客户端发送的请求体超过了服务器所能处理的最大限制，因此服务器拒绝接收该请求；
		1. 请求体过大：客户端上传了过大的JSON数据、文件、表单等；
		2. 服务器配置限制：如Nginx、Apache、Nodejs、Spring、Boot等默认限制了请求体大小；
		3. 反向代理限制：CDN或负载均衡器设置了最大请求体大小限制；
	- 解决方案
		1. 前端解决方案
			- 不应由前端“压缩”数据来规避问题，这可能影响业务逻辑；
			- 如果是上传大文件，建议使用分片上传机制；
			- 前端提前校验请求体大小；
		2. Nginx配置调整：如果使用了Nginx作为反向代理或静态服务器，默认情况下它会限制客户端请求体大小为1MB；（client_max_body_size: 20M;）
		3. Express解决方案：express默认使用body-parser或express.json来解析请求体，默认限制为1MB；
		4. Koa解决方案：Koa默认请求体大小为1MB，可以通过中间件进行扩展；
	- 安全建议
		1. 防止DoS攻击：合理设置最大请求体大小，避免无限增长；
		2. 限制上传类型：对文件上传接口做MIME类型校验；
		3. 启用压缩：使用GZip压缩减少传输体积；
		4. 鉴权前置：对大请求接口做身份验证，避免未授权访问；

124. iframe有哪些缺点？
	- 安全风险
		1. XSS：如果嵌入不可信第三方内容，可能会导致脚本注入；iframe访问父页面的DOM，从而窃取数据；
		2. CSRF：恶意网站可以通过iframe提交表单或发起请求，伪装成用户执行操作；
		3. 点击劫持：攻击者可以将一个透明iframe覆盖在按钮上，诱导用户点击隐藏的iframe内容；
	- 性能问题
		1. 加载阻塞：iframe的加载会阻塞主页面的onload事件，影响首屏性能；用户感知加载时间变长，降低体验；
		2. 资源重复加载：每个iframe都是一个独立的文档上下文，可能引入重复的js、css、字体等资源，增加整体页面体积；
		3. SEO不友好：搜索引擎通常不会深入爬取iframe的内容，不利于SEO；页面权重不会传递到iframe内容中；
	- 用户体验问题
		1. 布局控制困难：iframe的高度、宽度、滚动条难以与父页面统一；响应式设计实现复杂，容易出现“双层滚动”，“空白区域”等问题；
		2. 历史记录混乱：iframe的url变化不会反映在浏览器地址栏中；用户无法通过浏览器的前进/后退按钮导航iframe内容；
		3. 移动端适配差：移动端屏幕小，iframe内容缩放困难；点击、滑动等交互可能出现异常；
	- 通信限制
		1. 跨域限制严重：如果iframe和父页面不同源，两者之间的通信必须通过postMessage实现；无法直接访问iframe的DOM、样式、方法等；
		2. 调试困难：调试嵌套在iframe中的内容不如普通DOM直观；DevTools中需切换上下文查看iframe内容；
	- 可维护性差
		1. 难以统一风格：iframe内容独立于主页面，样式隔离，不易统一UI风格；修改iframe内容需要同步更新多个系统；
		2. 依赖外部服务稳定性：如果iframe引用了外部系统的页面，其可用性直接影响产品；第三方服务挂掉会导致页面显示异常；
	- 现代替代方案
		1. 嵌入外部内容：使用object、embed或前端组件封装；
		2. 模块化展示：使用前端框架动态加载组件；
		3. 广告/统计代码：使用js动态插入，避免iframe；
		4. 富文本编辑器：使用contenteditable或draft.js等现代方案；
		5. 微前端架构：使用Module Fedetation、QianKun等微前端架构；

125. vue中的$nextTick原理？
	- $nextTick是Vue中一个非常重要的异步更新机制，其核心原理是利用js的事件循环和微任务队列实现DOM更新后的回调执行；
	- vue响应式更新流程
		1. 数据变化 ——> 触发setter；
		2. 收集的依赖被通知更新；
		3. 将组件更新任务加入一个异步队列；
		4. 在下一个事件循环“tick”中统一执行更新；
		4. 更新完成后，触发$nextTick回调；
	- $nextTick的作用
		1. 访问更新后的DOM元素，如获取元素尺寸、焦点操作；
		2. 执行依赖DOM状态的操作，如第三方库初始化；
		3. 强制等待DOM更新完成，避免因DOM未更新导致的问题；
	- $nextTick的底层原理
		1. 异步更新机制
			- Vue内部维护一个watcher队列；
			- 数据变化时，不是立即更新DOM，而是将watcher加入待处理队列；
			- vue使用nextTick调度器来决定何时刷新队列并更新视图；
		2. 微任务优先级：Vue会尽可能使用“微任务”来异步执行DOM更新和$nextTick回调，确保它们在一次事件循环中尽快执行；
			- Promise.then
			- MutationObserver
			- queueMicrotask
			- setTimeout(fn, 0)
	- 替代方案
		1. watch/watchEffect：对特定数据变化做出响应；
		2. updated生命周期钩子：所有数据更新完成后执行操作；
		3. requestAnimationFrame：动画或高性能场景下精确控制渲染机制；
		4. 自定义指令：更细粒度控制DOM行为；

126. React怎么做数据检查和变化？
	- React是基于不可变数据 + diff算法来判断组件是否需要更新的，基本流程为：数据变化 —> 触发setState/useState -> 调度更新 -> Recondiliation(协调阶段) -> 对比新旧虚拟DOM -> 决定是否更新真实DOM；
	- 如何做数据检查和变化处理？
		1. 使用useState + useEffect检查值的变化；
			- useEffect监听指定依赖；
			- 如果依赖性未变，则不会重新执行副作用；
			- 适合用于API请求、DOM操作等副作用逻辑；
		2. 使用useMemo缓存计算结果（避免重复计算）
			- 只有依赖项变化时才会重新计算；
			- 提升性能，避免重复渲染中的无谓计算；
			- 适用于开销较大的计算逻辑；
		3. 使用useCallback缓存函数处理
			- 函数引用不变 —> 子组件不会因props引用变化而重新渲染；
			- 常配合React.memo使用；
		4. React.memo控制子组件更新
			- 默认进行浅比较props；
			- 可传入自定义比较函数；
			- 适合纯展示型组件优化；
		5. useRef追踪值的变化
			- useRef不会触发组件重新渲染；
			- 可用于保存上一次的状态或DOM引用；
			- 类似类组件中的实例变量；

127. node中间层怎么做请求合并与转发？
	- nodejs中间层中，请求合并转发是一种常见的优化手段，主要用于减少后端接口调用次数、降低网络延迟、提升前端性能，尤其是适用于需要同时调用多个后端服务的场景；
	- 请求合并：将多个独立的HTTP请求合并为一个，减少请求数量和网络开销；请求转发：node层作为代理，统一接收前端请求，向多个后端服务转发请求，将结果聚合后返回给前端；
	- 适用场景
		1. 前端一次页面加载需要调用多个后端接口；
		2. 多个微服务API聚合；
		3. 接口缓存优化；
		4. 第三方接口封装；
	- 实现方案
		1. 适用Promise.all实现并行请求合并：并行执行，速度快；所有请求都成功才会返回结果；任一失败则整体失败；
		2. 使用中间层做请求聚合（Express等）：统一接口，隐藏多个后端服务细节；可集中处理错误、日志、缓存；更适合前端后分离架构；
		3. 使用GraphQL做数据聚合：字段级按需查询；支持嵌套结构聚合；前端更自由控制数据形态；
		4. 使用缓存机制优化重复请求（redis逻辑）：减少重复请求；提升响应速度；适用于静态或更低频更新数据；
		5. 使用流式合并：适合大数据传输、实时性要求高；内存占用低；处理效率高；

128. 使用Symbol函数有哪些注意事项？
	- 在js中，Symbol是一种原始数据类型，用于创建唯一且不可变的值。它通常用作对象属性的键，以避免命名冲突。
	- 注意事项
		1. Symbol值是唯一的，即时两个symbol描述相同，它们也是不同的值；
		2. Symbol不能参与JSON.stringify，默认情况下，JSON.stringify会忽略Symbol键和值；
		3. Symbol属性不会被for...in枚举，如需获取所有Symbol属性，可使用Object.getOwnPropertySymbols()；
		4. Symbol不会被Object.assign浅拷贝；
		5. Symbol.for与Symbol.keyFor的使用
			- Symbol.for(key)：全局注册一个Symbol，多次调用返回相同的Symbol；
			- Symbol.keyFor(sym)：获取通过Symbol.for注册的Symbol的key；
		6. Symbol作为类私有属性，防止外部访问；
		7. 不要将Symbol用作Map/Set的键；一旦丢失该Symbol的引用，就无法再访问对应的值；
		8. Symbol冲突风险，多个模块与第三方库可能使用了相同描述的Symbol，导致潜在冲突；
			- 使用命名空间；
			- 使用Symbol.for全局注册；
			- 使用WeakMap替代Symbol作为键；
		9. Symbol不能作为对象键名字面量使用；
	- 典型应用场景
		1. 私有属性模拟，避免属性名冲突，逻辑封装性强；
		2. 元编程/Symbol.iterator，自定义迭代器行为；
		3. 唯一事件类型标识，在事件系统中避免字符串命名冲突；
		4. 替代魔法字符串，提高代码可读性和安全性；
		5. Map/Set键使用，确保唯一性，避免冲突；
		6. 插件扩展点，第三方库预留扩展接口；

129. 渐近增强和优雅降级之间的不同？
	- 渐近增强：先确保所有用户都能看到内容和基本功能，再为支持更多特性的浏览器添加更丰富的体验；
		1. 实现步骤
			- HTML结构完整，确保即使没有css/js，页面也能显示内容；
			- css增强样式：为支持样式的浏览器提供更好的视觉体验；
			- js添加交互：为支持脚本的浏览器添加动态行为；
		2. 优点
			- 更好的访问性；
			- SEO更友好；
			- 更稳定的容错能力；
		3. 缺点
			- 开发成本略高，需考虑多层结构；
			- 功能迭代可能需要兼顾低版本支持；
	- 优雅降级：先构建一个面向现代浏览器的高级体验，在旧环境中尽可能保留核心功能；
		1. 实现步骤
			- 在现代浏览器开发完整功能；
			- 检测浏览器特性或版本；
			- 当检测到不支持的功能时，使用替代方案或提示信息；
		2. 优点
			- 开发效率高，专注于现代浏览器体验；
			- 可快速实现复杂交互和动画效果；
		3. 缺点
			- 如果js或css加载失败，可能导致功能完全不可用；
			- 对搜索引擎和辅助设备不够友好；
			- 依赖浏览器特征检测机制，维护成本高；

130. 前端开发常见的兼容性问题有哪些？
	- 浏览器内核差异
		1. 内核及对应特点
			- Chromium/Blink：Chrome、Edge、Opera；支持新特性最快；
			- Gecko：Firebox，对web标准支持好；
			- Webkit：Safari、iOS浏览器，对部分css动画支持有限；
			- Trident：IE系列，老旧且不支持现代特性；
		2. 常见问题
			- flex布局在safari中某些版本不生效；
			- position：sticky在safari ios上需加-webkit-前缀；
			- grid布局在IE上完全不支持；
		3. 解决方案
			- 使用Autoprefix自动添加前缀；
			- 使用Can I Use查询特性兼容性；
			- 使用Polyfill补全缺失API；
	- CSS兼容性问题及其解决方法
		1. 盒模型差异
			- IE的默认盒模型为box-sizing: border-box;
			- Chrome的默认盒模型为box-sizing: content-box;
		2. flex布局兼容性
			- Safari需要-webkit-前缀；
			- IE10+支持但语法不同；
		3. gird布局兼容性
			- IE仅部分支持，推荐使用flex替代；
			- Safari/iOS需测试响应式网格行为；
		4. css变量兼容性
			- IE完全不支持；
			- Safari支持较好；
			- 推荐使用CSS-In-JS或变量降级处理；
		5. 动画于过渡效果
			- Safari对transform和animation支持较慢；
			- 需添加-webkit-前缀；
	- JS兼容性及其解决
		1. ES6+特性支持问题
			- 使用Babel+ @babel/preset-env转译代码；
			- 使用core-js或regenerator-runtime补丁；
			- 使用polyfill.
		2. DOM API差异
			- querySelectorAll，尽量使用；
			- classList，使用className替代；
			- addEventListener，尽量避免attachEvent；
			- fetch：使用XMLHttpRequest或axios；
			- localStorage/sessionStorage：注意隐私模式限制；
	- 移动端兼容性问题及解决方法
		1. 移动端视口设置问题，通过meta标签设置viewport信息；
		2. 点击延迟
			- 使用fastclick插件；
			- 使用css设置touch-action:manipulation;
			- 使用现代框架内置优化；
		3. iPhoneX及以上刘海屏适配：配合viewport-fit=cover使用；（safe-area-inset-top）；
	- 网络与性能兼容性问题
		1. 弱网环境加载失败
			- 使用懒加载；
			- 使用骨架屏提升用户体验；
			- 图片使用webp格式压缩；
			- 使用cdn加载静态资源；
		2. 缓存策略不一致
			- 设置合适的http缓存头；
			- 使用service worker控制缓存策略；
			- 使用localStorage存储静态数据做本地缓存；
	- 第三方库兼容性问题
		1. UI框架兼容性
			- 使用vue2 + element-ui支持IE；
			- 使用兼容包；
			- 使用按需引入+babel转译；


131. react中有useMemo和useCallback，为什么vue中不需要类似的功能

    1. 响应式系统的本质差异

        - React：依赖手动优化
            1. 不可变的渲染逻辑：React组件每次更新都会重新执行整个函数组件（包括所有内部函数和计算），默认不缓存任何结果；
            2. 需要开发者手动标记
                - useMemo：缓存计算结果，避免重复计算；
                - useCallback: 缓存函数引用，避免子组件不必要的重新渲染（如props中的函数变化触发子组件更新）
        - Vue：自动依赖追踪
            1. 基于Proxy/Getter-Setter的响应式：Vue能够自动追踪模板和计算属性中用到的依赖，只有依赖发生变化时才重新计算；
                - 计算属性（computed）：自动缓存结果，依赖不变时直接返回缓存值（类useMemo但无需手动指定依赖）
                - 方法（methods）：在模板中调用方法时，vue的响应式系统确保只有依赖变化时才触发重新渲染，无需缓存函数引用；
    
    2. 组件更新机制差异

        - React：颗粒度较粗的更新
            1. 默认程序渲染整个子树：父组件更新时，所有子组件默认也会重新渲染（除非用memo+不变的props显式优化）
            2. 函数引用问题：内联函数每次渲染都会创建新的引用，导致子组件即使用了memo仍会更新，此时需要useCAllback
        - Vue：颗粒度更细的更新
            1. 精准的依赖触发：VUe的模板编译阶段会分析哪些数据实际被使用，更新时只触发依赖这些数据的组件；
                - 自动优化函数传递：在vue模板中传递方法，方法引用默认稳定（除非重新赋值），无需类似useCallback的优化；
                - 组件默认缓存：vue的组件更新更智能，内置了memo优化行为；

    3. vue的替代方案

        - 虽然vue不需要显式的useMemo/useCallback，但在特定场景下仍然有类似功能的替代品；
        - 缓存计算结果：使用computed属性（自动依赖追踪 + 缓存）
        - 稳定函数引用：vue中方法通常定义在methods或setup层，天然保持稳定引用；
        - 手动优化子组件：v-once或v-memo；

    4. 框架设计哲学影响

        - React：追求极致的灵活性和显式控制，因此将性能优化的责任交给开发者；
        - Vue：追求开箱即用的高效，通过响应式系统和编译时优化减少开发者的心智负担；



# Fabric.js相关
1. 关键记忆点
    - 对象具有自己的属性和关系，而画布仅负责将它们的存在投射到外部世界；
    - 复杂图形渲染：建议使用svg + canvas.loadSVGFromString/canvas.loadSVGFROMURL（而不是使用new Path(path)）自己绘制复杂图形；
    - 动画操作：fabricObject.animate()，支持相对值，rect.animate('left', '+=100', {duration: 1000}); easing属性控制动画效果（fabric.util.ease.XXXX）；fabric.runningAnimations访问当前Fabric运行的动画；
    - 监听画布重新渲染：after:render
    - canvas.on(eventName, (options) => { const { e, target } = options })
    - groups.items(itemIndex)：获取组中指定的对象；
    - group.add/group.remove：添加/删除对象到组中；
    - 数据存储：JSON.stringify(canvas)；canvas.toJSON，canvas.toObject；
    - 每个对象都可以通过toObject方法扩展
    ```js
    obj.toObject = (function (toObject) {
        return function () {
            return fabric.util.object.extend(toObject.call(this), {
                [propsName]:  this[propsName]
            })
        }
    })(rect.toObject)
    ```
    - 反序列化：canvas.loadFromJSON(json)\loadFromDatalessJSON(json)；canvas.loadSVGFromURL(url)/loadSVGFromString(string)
    - 支持配置默认属性，满足自定义环境需求；FabricObject.ownDefaults.propsName = value
    - 配置控制操作方法
    ```js
    const x = {
        cornerSize: number; // 对象控制点大小；
        touchCornerSize: number; // 触摸对象控制点大小
        transparentCorner: boolean; // 是否透明控制点
        cornerColor: string; // 控制点颜色
        cornerStrokeColor: string; // 控制点描边颜色
        cornerStyle: "rect" | "circle"; // 控制点样式
        cornerDashArray: number[]; // 控制点虚线样式
        padding: number; // 边距
        borderColor: string; // 边框颜色
        borderDashArray: number[]; // 边框虚线样式
        hasBorders: boolean; // 是否有边框
        borderOpacityWhenMoving: boolean; // 移动时边框透明度
        borderScaleFactor: number; // 边框缩放
    }
    fabric.InteractiveFabricObject.ownDefaults = {}
    ```
    - 自定义对象属性
    ```ts
    declare module "fabric" {
        interface FabricObject {
            id?: string;
            name?: string;
        }
        interface SerializedObjectProps {
            id?: string;
            name?: string;
        }
        interface Rect {
            getText:  () => string;
        }
    }
    ```
    - 缓存：对象渲染到独立画布，发生渲染时，可以拉取缓存并渲染它，而不是重新绘制对象；（1）性能：如果对象没有改变，就无需渲染；（2）上下文隔离：执行复杂渲染，如裁剪、过滤等，需要一个隔离上下文渲染，以确保操作保持隔离，不会影响整个画布，因此使用缓存；
    - 动态调整画布中对象的顺序
    ```js
    bringToFront(object); // 对象置顶
    sendToBack(object); // 对象置底
    bringForward(object); // 对象前移
    sendBackwards(object); // 对象后移
    // 操作_objects数组：强制修改层级
    ```
