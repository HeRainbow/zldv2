<template>
  <div class="monaco-editor-container">
    <vue-monaco-editor
      v-model:value="code"
      :language="language"
      :theme="theme"
      :options="editorOptions"
      @mount="handleEditorMounted"
      @change="handleChange"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'

// 定义props
const props = defineProps({
  // 默认代码内容
  modelValue: {
    type: String,
    default: ''
  },
  // 编程语言
  language: {
    type: String,
    default: 'javascript'
  },
  // 主题
  theme: {
    type: String,
    default: 'vs-dark'
  },
  // 编辑器高度
  height: {
    type: [String, Number],
    default: '300px'
  },
  // 编辑器选项
  options: {
    type: Object,
    default: () => ({})
  },
  // 是否只读
  readonly: {
    type: Boolean,
    default: false
  }
})

// 定义事件
const emit = defineEmits(['update:modelValue', 'change', 'editor-mounted'])

// 编辑器实例
const editor = ref(null)
// 代码内容
const code = ref(props.modelValue)

// 合并编辑器选项
const editorOptions = computed(() => {
  return {
    automaticLayout: true, // 自动调整布局
    scrollBeyondLastLine: false, // 不允许滚动超过最后一行
    minimap: { enabled: true }, // 启用缩略图
    readOnly: props.readonly, // 是否只读
    fontSize: 14,
    tabSize: 2,
    ...props.options
  }
})

// 监听代码变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== code.value) {
    code.value = newValue
  }
}, { immediate: true })

// 处理编辑器内容变化
const handleChange = (value, event) => {
  emit('update:modelValue', value)
  emit('change', { value, event })
}

// 处理编辑器挂载完成
const handleEditorMounted = (editorInstance) => {
  editor.value = editorInstance
  emit('editor-mounted', editorInstance)
}

// 格式化代码方法
const formatCode = () => {
  if (editor.value) {
    editor.value.getAction('editor.action.formatDocument')?.run()
  }
}

// 暴露组件方法
defineExpose({
  editor,
  formatCode
})
</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  height: 200px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}
</style> 