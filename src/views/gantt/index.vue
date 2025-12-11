<template>
  <div ref="ganttContainer" class="gantt-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <select v-model="timeScale" @change="redrawGantt">
        <option value="hour">小时</option>
        <option value="day">天</option>
        <option value="week">周</option>
        <option value="month">月</option>
      </select>
      <button @click="zoomIn">放大</button>
      <button @click="zoomOut">缩小</button>
    </div>

    <!-- 时间刻度条 -->
    <div ref="timelineContainer" class="timeline-container"></div>

    <!-- 甘特图画布 -->
    <div ref="stageContainer" class="stage-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Konva from 'konva'

// 时间刻度类型
type TimeScale = 'hour' | 'day' | 'week' | 'month'

// 甘特图数据结构
interface GanttTask {
  id: string
  name: string
  start: Date
  end: Date
  progress: number
  color: string
  dependencies?: string[] // 任务依赖
}

// 示例数据
const tasks = ref<GanttTask[]>([
  {
    id: '1',
    name: '项目规划',
    start: new Date(2023, 0, 1),
    end: new Date(2023, 0, 10),
    progress: 100,
    color: '#4CAF50'
  },
  {
    id: '2',
    name: '需求分析',
    start: new Date(2023, 0, 5),
    end: new Date(2023, 0, 15),
    progress: 80,
    color: '#2196F3',
    dependencies: ['1']
  },
  {
    id: '3',
    name: '设计阶段',
    start: new Date(2023, 0, 12),
    end: new Date(2023, 0, 25),
    progress: 60,
    color: '#FF9800',
    dependencies: ['2']
  },
  {
    id: '4',
    name: '开发实施',
    start: new Date(2023, 0, 20),
    end: new Date(2023, 1, 10),
    progress: 30,
    color: '#F44336',
    dependencies: ['3']
  }
])

const ganttContainer = ref<HTMLDivElement | null>(null)
const stageContainer = ref<HTMLDivElement | null>(null)
const timelineContainer = ref<HTMLDivElement | null>(null)
let stage: Konva.Stage | null = null
let layer: Konva.Layer | null = null
let timelineStage: Konva.Stage | null = null
let timelineLayer: Konva.Layer | null = null

// 时间刻度状态
const timeScale = ref<TimeScale>('day')
// 缩放因子
const zoomFactor = ref<number>(1)

// 计算时间范围
const getTimeRange = () => {
  const starts = tasks.value.map(task => task.start.getTime())
  const ends = tasks.value.map(task => task.end.getTime())
  // 添加一些边距
  const min = Math.min(...starts)
  const max = Math.max(...ends)
  const range = max - min
  return {
    min: min - range * 0.1,
    max: max + range * 0.1
  }
}

// 根据时间刻度获取时间单位毫秒数
const getTimeUnitMs = () => {
  switch (timeScale.value) {
    case 'hour': return 60 * 60 * 1000
    case 'day': return 24 * 60 * 60 * 1000
    case 'week': return 7 * 24 * 60 * 60 * 1000
    case 'month': return 30 * 24 * 60 * 60 * 1000
    default: return 24 * 60 * 60 * 1000
  }
}

// 将日期转换为X坐标
const dateToX = (date: Date, timeRange: { min: number; max: number }, width: number) => {
  const totalTime = (timeRange.max - timeRange.min) / zoomFactor.value
  const timeOffset = date.getTime() - timeRange.min
  return (timeOffset / totalTime) * width
}

// 将X坐标转换为日期
const xToDate = (x: number, timeRange: { min: number; max: number }, width: number) => {
  const totalTime = (timeRange.max - timeRange.min) / zoomFactor.value
  const timeOffset = (x / width) * totalTime
  return new Date(timeRange.min + timeOffset)
}

// 将任务索引转换为Y坐标
const taskToY = (index: number, rowHeight: number) => {
  return index * rowHeight
}

// 生成时间刻度标记 - 优化版本
const generateTimeTicks = (timeRange: { min: number; max: number }) => {
  const ticks = []
  const unitMs = getTimeUnitMs()
  let currentTime = Math.floor(timeRange.min / unitMs) * unitMs

  while (currentTime <= timeRange.max) {
    ticks.push(new Date(currentTime))
    currentTime += unitMs
  }

  return ticks
}

// 获取时间标签格式 - 根据时间刻度类型返回合适的格式
const getTimeLabel = (tick: Date): string => {
  switch (timeScale.value) {
    case 'hour':
      // 小时模式: 显示日期+小时
      return `${tick.getMonth() + 1}/${tick.getDate()} ${tick.getHours()}:00`
    case 'day':
      return `${tick.getMonth() + 1}-${tick.getDate()}`
    case 'week':
      return `W${Math.ceil(tick.getDate() / 7)}`
    case 'month':
      return `${tick.getFullYear()}-${tick.getMonth() + 1}`
    default:
      return `${tick.getMonth() + 1}-${tick.getDate()}`
  }
}

// 绘制时间轴 - 优化版本
const drawTimeline = () => {
  if (!timelineContainer.value || !ganttContainer.value) return

  const containerWidth = ganttContainer.value.clientWidth
  const timeRange = getTimeRange()
  const ticks = generateTimeTicks(timeRange)

  // 销毁之前的时间轴舞台
  if (timelineStage) {
    timelineStage.destroy()
  }

  // 创建时间轴舞台
  timelineStage = new Konva.Stage({
    container: timelineContainer.value,
    width: containerWidth,
    height: 40
  })

  timelineLayer = new Konva.Layer()
  timelineStage.add(timelineLayer)

  const leftPadding = 150

  // 绘制时间刻度
  ticks.forEach((tick, index) => {
    const x = dateToX(tick, timeRange, containerWidth - leftPadding) + leftPadding

    // 时间刻度线
    const line = new Konva.Line({
      points: [x, 0, x, 40],
      stroke: '#ccc',
      strokeWidth: 1
    })
    timelineLayer!.add(line)

    // 时间标签
    const timeLabel = getTimeLabel(tick)

    const label = new Konva.Text({
      x: x + 5,
      y: 15,
      text: timeLabel,
      fontSize: 12,
      fontFamily: 'Arial',
      fill: '#333'
    })
    timelineLayer!.add(label)
  })

  timelineLayer.draw()
}

// 绘制网格线
const drawGridLines = (layer: Konva.Layer, timeRange: { min: number; max: number }, width: number, height: number) => {
  const leftPadding = 150
  const rowHeight = 50
  const ticks = generateTimeTicks(timeRange)

  // 垂直网格线
  ticks.forEach(tick => {
    const x = dateToX(tick, timeRange, width - leftPadding) + leftPadding
    const line = new Konva.Line({
      points: [x, 50, x, height],
      stroke: '#eee',
      strokeWidth: 1
    })
    layer.add(line)
  })

  // 水平网格线
  tasks.value.forEach((_, index) => {
    const y = taskToY(index, rowHeight) + 50 + rowHeight
    const line = new Konva.Line({
      points: [leftPadding, y, width, y],
      stroke: '#eee',
      strokeWidth: 1
    })
    layer.add(line)
  })
}

// 绘制今日线
const drawTodayLine = (layer: Konva.Layer, timeRange: { min: number; max: number }, width: number) => {
  const leftPadding = 150
  const today = new Date()

  // 只在时间范围内绘制今日线
  if (today.getTime() >= timeRange.min && today.getTime() <= timeRange.max) {
    const x = dateToX(today, timeRange, width - leftPadding) + leftPadding

    const line = new Konva.Line({
      points: [x, 50, x, 1000], // 高度足够覆盖所有任务
      stroke: '#ff0000',
      strokeWidth: 2,
      dash: [5, 5]
    })
    layer.add(line)

    const label = new Konva.Text({
      x: x + 5,
      y: 55,
      text: '今天',
      fontSize: 12,
      fontFamily: 'Arial',
      fill: '#ff0000'
    })
    layer.add(label)
  }
}

// 绘制任务依赖关系
const drawDependencies = (layer: Konva.Layer, timeRange: { min: number; max: number }, width: number) => {
  const leftPadding = 150
  const rowHeight = 50

  tasks.value.forEach(task => {
    if (task.dependencies && task.dependencies.length > 0) {
      task.dependencies.forEach(depId => {
        const depTask = tasks.value.find(t => t.id === depId)
        if (depTask) {
          const fromIndex = tasks.value.findIndex(t => t.id === depId)
          const toIndex = tasks.value.findIndex(t => t.id === task.id)

          if (fromIndex !== -1 && toIndex !== -1) {
            const fromY = taskToY(fromIndex, rowHeight) + 50 + 15
            const toY = taskToY(toIndex, rowHeight) + 50 + 15
            const fromX = dateToX(depTask.end, timeRange, width - leftPadding) + leftPadding
            const toX = dateToX(task.start, timeRange, width - leftPadding) + leftPadding

            // 绘制箭头线
            const line = new Konva.Line({
              points: [fromX, fromY, toX, fromY, toX, toY],
              stroke: '#666',
              strokeWidth: 1,
              tension: 0,
              dash: [3, 3]
            })
            layer.add(line)

            // 绘制箭头
            const arrow = new Konva.Line({
              points: [toX - 5, toY - 5, toX, toY, toX - 5, toY + 5],
              stroke: '#666',
              strokeWidth: 1,
              fill: '#666'
            })
            layer.add(arrow)
          }
        }
      })
    }
  })
}

// 绘制甘特图
const drawGantt = () => {
  if (!stageContainer.value || !ganttContainer.value) return

  const containerWidth = ganttContainer.value.clientWidth
  const containerHeight = Math.max(300, tasks.value.length * 60)

  // 销毁之前的舞台
  if (stage) {
    stage.destroy()
  }

  // 创建Konva舞台
  stage = new Konva.Stage({
    container: stageContainer.value,
    width: containerWidth,
    height: containerHeight
  })

  layer = new Konva.Layer()
  stage.add(layer)

  const timeRange = getTimeRange()
  const rowHeight = 50
  const barHeight = 30
  const leftPadding = 150

  // 绘制网格线
  drawGridLines(layer, timeRange, containerWidth, containerHeight)

  // 绘制今日线
  drawTodayLine(layer, timeRange, containerWidth)

  // 绘制任务依赖关系
  drawDependencies(layer, timeRange, containerWidth)

  // 绘制任务条
  tasks.value.forEach((task, index) => {
    const y = taskToY(index, rowHeight) + 50
    const startX = dateToX(task.start, timeRange, containerWidth - leftPadding) + leftPadding
    const endX = dateToX(task.end, timeRange, containerWidth - leftPadding) + leftPadding
    const barWidth = endX - startX

    // 绘制任务背景条
    const backgroundBar = new Konva.Rect({
      x: startX,
      y: y,
      width: barWidth,
      height: barHeight,
      fill: '#f0f0f0',
      cornerRadius: 4,
      stroke: '#ccc',
      strokeWidth: 1
    })

    // 绘制进度条
    const progressWidth = barWidth * (task.progress / 100)
    const progressBar = new Konva.Rect({
      x: startX,
      y: y,
      width: progressWidth,
      height: barHeight,
      fill: task.color,
      cornerRadius: 4
    })

    // 绘制任务名称
    const taskLabel = new Konva.Text({
      x: 10,
      y: y + 8,
      text: task.name,
      fontSize: 12,
      fontFamily: 'Arial',
      fill: '#333'
    })

    // 绘制进度文本
    const progressText = new Konva.Text({
      x: startX + barWidth + 5,
      y: y + 8,
      text: `${task.progress}%`,
      fontSize: 10,
      fontFamily: 'Arial',
      fill: '#666'
    })

    // 添加到图层
    layer!.add(backgroundBar)
    layer!.add(progressBar)
    layer!.add(taskLabel)
    layer!.add(progressText)

    // 添加交互效果
    addInteractionEffects(backgroundBar, progressBar, task)

    // 添加拖拽功能
    addTaskBarDrag(backgroundBar, progressBar, task, timeRange, containerWidth - leftPadding, leftPadding, y, barHeight)

    // 添加调整手柄
    addResizeHandles(backgroundBar, progressBar, task, timeRange, containerWidth - leftPadding, leftPadding, y, barHeight)
  })

  layer.draw()
}

// 添加交互效果
const addInteractionEffects = (
  backgroundBar: Konva.Rect,
  progressBar: Konva.Rect,
  task: GanttTask
) => {
  // 鼠标悬停效果
  backgroundBar.on('mouseenter', () => {
    document.body.style.cursor = 'pointer'
    backgroundBar.fill('#e0e0e0')
    layer?.draw()
  })

  backgroundBar.on('mouseleave', () => {
    document.body.style.cursor = 'default'
    backgroundBar.fill('#f0f0f0')
    layer?.draw()
  })

  // 点击事件
  backgroundBar.on('click', () => {
    console.log('任务详情:', task)
    // 可以在这里显示任务详情弹窗
  })
}

// 添加任务条拖拽功能
const addTaskBarDrag = (
  backgroundBar: Konva.Rect,
  progressBar: Konva.Rect,
  task: GanttTask,
  timeRange: { min: number; max: number },
  availableWidth: number,
  leftPadding: number,
  y: number,
  barHeight: number
) => {
  let initialX: number
  let initialStart: Date
  let initialEnd: Date

  // 设置可拖拽
  backgroundBar.draggable(true)
  progressBar.draggable(true)

  const dragStartHandler = (e: Konva.KonvaEventObject<DragEvent>) => {
    initialX = e.target.x()
    initialStart = new Date(task.start)
    initialEnd = new Date(task.end)
    document.body.style.cursor = 'move'
  }

  const dragMoveHandler = (e: Konva.KonvaEventObject<DragEvent>) => {
    const deltaX = e.target.x() - initialX
    const timeDelta = (deltaX / availableWidth) * ((timeRange.max - timeRange.min) / zoomFactor.value)

    // 更新任务时间
    task.start = new Date(initialStart.getTime() + timeDelta)
    task.end = new Date(initialEnd.getTime() + timeDelta)

    // 同步进度条位置
    if (e.target === backgroundBar) {
      progressBar.x(progressBar.x() + deltaX)
    } else {
      backgroundBar.x(backgroundBar.x() + deltaX)
    }

    layer?.draw()
  }

  const dragEndHandler = () => {
    document.body.style.cursor = 'default'
    // 重新绘制以确保一致性
    redrawGantt()
  }

  backgroundBar.on('dragstart', dragStartHandler)
  progressBar.on('dragstart', dragStartHandler)

  backgroundBar.on('dragmove', dragMoveHandler)
  progressBar.on('dragmove', dragMoveHandler)

  backgroundBar.on('dragend', dragEndHandler)
  progressBar.on('dragend', dragEndHandler)
}

// 添加调整手柄
const addResizeHandles = (
  backgroundBar: Konva.Rect,
  progressBar: Konva.Rect,
  task: GanttTask,
  timeRange: { min: number; max: number },
  availableWidth: number,
  leftPadding: number,
  y: number,
  barHeight: number
) => {
  const handleSize = 6

  // 左侧调整手柄
  const leftHandle = new Konva.Rect({
    x: backgroundBar.x() - handleSize/2,
    y: y + (barHeight - handleSize)/2,
    width: handleSize,
    height: handleSize,
    fill: '#666',
    stroke: '#fff',
    strokeWidth: 1,
    draggable: true
  })

  // 右侧调整手柄
  const rightHandle = new Konva.Rect({
    x: backgroundBar.x() + backgroundBar.width() - handleSize/2,
    y: y + (barHeight - handleSize)/2,
    width: handleSize,
    height: handleSize,
    fill: '#666',
    stroke: '#fff',
    strokeWidth: 1,
    draggable: true
  })

  layer?.add(leftHandle)
  layer?.add(rightHandle)

  // 左侧手柄拖拽
  leftHandle.on('dragstart', (e) => {
    document.body.style.cursor = 'ew-resize'
  })

  leftHandle.on('dragmove', (e) => {
    const newX = e.target.x() + handleSize/2
    const newStart = xToDate(newX, timeRange, availableWidth)

    // 确保开始时间不晚于结束时间
    if (newStart < task.end) {
      task.start = newStart
      const newWidth = backgroundBar.width() + (backgroundBar.x() - newX)
      backgroundBar.x(newX)
      backgroundBar.width(newWidth)

      // 更新进度条
      const progressRatio = task.progress / 100
      progressBar.x(newX)
      progressBar.width(newWidth * progressRatio)

      // 更新左侧手柄位置
      leftHandle.x(newX - handleSize/2)
    }

    layer?.draw()
  })

  leftHandle.on('dragend', () => {
    document.body.style.cursor = 'default'
    redrawGantt()
  })

  // 右侧手柄拖拽
  rightHandle.on('dragstart', (e) => {
    document.body.style.cursor = 'ew-resize'
  })

  rightHandle.on('dragmove', (e) => {
    const newX = e.target.x() + handleSize/2
    const newEnd = xToDate(newX, timeRange, availableWidth)

    // 确保结束时间不早于开始时间
    if (newEnd > task.start) {
      task.end = newEnd
      const newWidth = newX - backgroundBar.x()
      backgroundBar.width(newWidth)

      // 更新进度条
      const progressRatio = task.progress / 100
      progressBar.width(newWidth * progressRatio)

      // 更新右侧手柄位置
      rightHandle.x(backgroundBar.x() + backgroundBar.width() - handleSize/2)
    }

    layer?.draw()
  })

  rightHandle.on('dragend', () => {
    document.body.style.cursor = 'default'
    redrawGantt()
  })

  // 鼠标悬停效果
  leftHandle.on('mouseenter', () => {
    document.body.style.cursor = 'ew-resize'
    leftHandle.fill('#333')
    layer?.draw()
  })

  leftHandle.on('mouseleave', () => {
    if (!leftHandle.isDragging()) {
      document.body.style.cursor = 'default'
    }
    leftHandle.fill('#666')
    layer?.draw()
  })

  rightHandle.on('mouseenter', () => {
    document.body.style.cursor = 'ew-resize'
    rightHandle.fill('#333')
    layer?.draw()
  })

  rightHandle.on('mouseleave', () => {
    if (!rightHandle.isDragging()) {
      document.body.style.cursor = 'default'
    }
    rightHandle.fill('#666')
    layer?.draw()
  })
}

// 重绘甘特图
const redrawGantt = () => {
  drawTimeline()
  drawGantt()
}

// 窗口大小改变时重绘
const handleResize = () => {
  redrawGantt()
}

// 放大
const zoomIn = () => {
  zoomFactor.value = Math.min(zoomFactor.value * 1.2, 5)
  redrawGantt()
}

// 缩小
const zoomOut = () => {
  zoomFactor.value = Math.max(zoomFactor.value / 1.2, 0.2)
  redrawGantt()
}

onMounted(() => {
  redrawGantt()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (stage) {
    stage.destroy()
  }
  if (timelineStage) {
    timelineStage.destroy()
  }
})
</script>

<style scoped>
.gantt-container {
  width: 100%;
  height: 100%;
  border: 1px solid #ddd;
  overflow: auto;
}

.toolbar {
  padding: 10px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
  display: flex;
  gap: 10px;
  align-items: center;
}

.toolbar button {
  padding: 5px 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.toolbar button:hover {
  background-color: #0056b3;
}

.timeline-container {
  width: 100%;
  height: 50px; /* 增加高度以便显示更长的标签 */
  border-bottom: 1px solid #ddd;
}

.stage-container {
  width: 100%;
  height: calc(100% - 50px);
}
</style>
