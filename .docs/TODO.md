- [x] `/create` 实现
- [x] 全站迁移 Antd
- [ ] 列表页里的元素显示小一点
- [ ] 优化首屏体积， /create 和 AntD 的 lazy loading/code splitting
- [ ] 夜间模式支持
- [ ] 多语言支持
- [x] `/create` 上传后根据文件名自动填充表单
- [ ] 完成该功能: MVP only generates JSON. Put the image file under public/memes separately.
- [ ] 添加 Google Analytics
- [x] src/memes 里的 json 配置文件迁移到 public/memes 里
- [x] 考虑下是否增加一个后端来存储 meme 数据
- [ ] 设计一个 logo
- [ ] 添加常用 meme 模板
	- [x] Batman Slapping Robin
	- [x] Bike Fall
	- [x] Change My Mind
	- [x] Distracted Boyfriend
	- [x] Mother Ignoring Kid In A Pool
	- [ ] Two Buttons
- [ ] 做了任何编辑后，退出前都提示用户保存
- [x] Text box 增加旋转功能
  - [x] ~~旋转后 resize handles 仍在 AABB 角上，没贴在斜框角上~~ — 评估后放弃，imgflip 也没解决；性价比不高，未来想做参考 git log `c797622` 后面的讨论（路径 A：手画 handle + delta 反旋转）。
- [x] localStorage 里保存用户最近使用的模板列表，打开首页时, 有两种排序模式可选择，第一种就是现有的「字母序」，第二种是「按照使用频率排序」。排序方式也保存在 localStorage 里。
- [x] Duplicate TextBox

# 性能优化
- [x] 图片和 json 配置全部散落在 public/memes 里，考虑下未来数量多了以后是否有性能问题
- [ ] 还能再做的事（先不做，等真到那个量级）
  - [ ] 目录分桶：public/memes/<a-c>/、<d-f>/……纯粹是文件管理问题（IDE 卡、git status 慢），上千个时再说。manifest
  内联了之后，运行时不在乎目录结构。
  - [ ] 拆出 thumbnail：作者上传一张大图 → 构建期生成 <id>.thumb.webp，gallery 用缩略图、editor 用原图。500+
  模板时画廊滚动能差出量级。这是独立工作，不影响本次。
  - [ ] 虚拟滚动：Antd 没现成 virtualized grid，要引 react-window。500+ 模板再考虑。
  - [ ] 搜索索引：纯 substring 在 1000 模板下还是 OK 的；要再优化是 Fuse.js 级别的事，远非眼下问题。