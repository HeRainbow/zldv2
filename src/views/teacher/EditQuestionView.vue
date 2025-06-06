<template>
  <div class="edit-question-container">
    <div class="page-header">
      <h2>编辑题目</h2>
    </div>
    
    <el-card class="question-form-card" v-loading="loading">
      <el-tabs v-model="activeTab" @tab-click="handleTabClick">
        <el-tab-pane name="single" label="单选题"></el-tab-pane>
        <el-tab-pane name="fill" label="填空题"></el-tab-pane>
        <el-tab-pane name="text" label="简答题"></el-tab-pane>
        <el-tab-pane name="programming" label="编程题"></el-tab-pane>
      </el-tabs>
      
      <el-form
        ref="formRef"
        :model="questionForm"
        :rules="rules"
        label-width="120px"
        label-position="right"
      >
        <el-form-item label="题目内容" prop="content">
          <el-input
            v-model="questionForm.content"
            type="textarea"
            :rows="3"
            placeholder="请输入题目内容"
          ></el-input>
        </el-form-item>
        
        <!-- 题目标签 -->
        <el-form-item label="题目标签">
          <el-tag
            v-for="(tag, index) in questionForm.tags"
            :key="index"
            closable
            @close="handleRemoveTag(index)"
            class="tag-item"
          >
            {{ tag }}
          </el-tag>
          
          <el-input
            v-if="inputTagVisible"
            ref="tagInputRef"
            v-model="tagInputValue"
            class="tag-input"
            size="small"
            @keyup.enter="handleAddTag"
            @blur="handleAddTag"
          />
          
          <el-button v-else class="button-new-tag" size="small" @click="showTagInput">
            + 添加标签
          </el-button>
        </el-form-item>
        
        <!-- 单选题选项 -->
        <template v-if="activeTab === 'single'">
          <el-divider content-position="left">选项</el-divider>
          
          <div v-for="(option, index) in questionForm.options" :key="index" class="option-item">
            <el-row :gutter="10">
              <el-col :span="2">
                <div class="option-label">{{ option.label }}</div>
              </el-col>
              <el-col :span="18">
                <el-input v-model="option.content" placeholder="请输入选项内容"></el-input>
              </el-col>
              <el-col :span="4">
                <el-button type="danger" @click="removeOption(index)">删除</el-button>
              </el-col>
            </el-row>
          </div>
          
          <div class="option-actions">
            <el-button type="primary" plain @click="addOption">添加选项</el-button>
          </div>
          
          <!-- 单选题答案 -->
          <el-form-item label="正确答案" prop="answer">
            <el-radio-group v-model="questionForm.answer">
              <el-radio
                v-for="option in questionForm.options"
                :key="option.label"
                :label="option.label"
              >
                {{ option.label }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </template>
        
        <!-- 填空题答案 -->
        <template v-if="activeTab === 'fill'">
          <el-form-item label="答案" prop="fillAnswer">
            <el-input
              v-model="questionForm.fillAnswer"
              placeholder="请输入填空题答案"
            ></el-input>
          </el-form-item>
        </template>
        
        <!-- 简答题参考答案 -->
        <template v-if="activeTab === 'text'">
          <el-form-item label="参考答案" prop="referenceAnswer">
            <el-input
              v-model="questionForm.referenceAnswer"
              type="textarea"
              :rows="5"
              placeholder="请输入参考答案"
            ></el-input>
          </el-form-item>
        </template>
        
        <!-- 编程题参考答案和测试用例 -->
        <template v-if="activeTab === 'programming'">
          <el-form-item label="参考答案" prop="programmingAnswer">
            <el-input
              v-model="questionForm.programmingAnswer"
              type="textarea"
              :rows="8"
              placeholder="请输入参考代码"
            ></el-input>
          </el-form-item>
          
          <el-form-item label="测试用例" prop="testCases">
            <el-input
              v-model="questionForm.testCases"
              type="textarea"
              :rows="5"
              placeholder="请输入测试用例，每行一个，格式：输入=>输出"
            ></el-input>
          </el-form-item>
        </template>
        
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">保存题目</el-button>
          <el-button @click="handlePreview">预览</el-button>
          <el-button @click="handleCancel">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

// 接收defaultType作为props
const props = defineProps({
  id: {
    type: [String, Number],
    default: ''
  },
  defaultType: {
    type: String,
    default: 'single',
    validator: (value) => ['single', 'fill', 'text', 'programming'].includes(value)
  }
})

const router = useRouter()
const route = useRoute()
const questionId = props.id || route.query.id
const loading = ref(false)
const activeTab = ref(props.defaultType)
const formRef = ref(null)

// 标签相关变量
const inputTagVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref(null)

// 题目表单数据
const questionForm = reactive({
  id: questionId, // 重要：确保id正确设置
  type: props.defaultType,
  content: '',
  options: [
    { label: 'A', content: '' },
    { label: 'B', content: '' },
    { label: 'C', content: '' },
    { label: 'D', content: '' }
  ],
  answer: '', // 单选题答案
  fillAnswer: '', // 填空题答案
  referenceAnswer: '', // 简答题参考答案
  programmingAnswer: '', // 编程题参考代码
  testCases: '', // 编程题测试用例
  tags: [] // 题目标签
})

// 表单验证规则
const rules = computed(() => {
  const baseRules = {
    content: [
      { required: true, message: '请输入题目内容', trigger: 'blur' },
      { min: 2, message: '题目内容至少包含2个字符', trigger: 'blur' }
    ]
  }
  
  if (questionForm.type === 'single') {
    return {
      ...baseRules,
      answer: [
        { required: true, message: '请选择正确答案', trigger: 'change' }
      ]
    }
  } else if (questionForm.type === 'fill') {
    return {
      ...baseRules,
      fillAnswer: [
        { required: true, message: '请输入填空题答案', trigger: 'blur' }
      ]
    }
  } else if (questionForm.type === 'text') {
    return {
      ...baseRules,
      referenceAnswer: [
        { required: true, message: '请输入参考答案', trigger: 'blur' },
        { min: 2, message: '参考答案至少包含2个字符', trigger: 'blur' }
      ]
    }
  } else if (questionForm.type === 'programming') {
    return {
      ...baseRules,
      programmingAnswer: [
        { required: true, message: '请输入参考代码', trigger: 'blur' }
      ],
      testCases: [
        { required: true, message: '请输入测试用例', trigger: 'blur' }
      ]
    }
  }
  
  return baseRules
})

// 监听 activeTab 变化，同步更新 questionForm.type
watch(activeTab, (newValue) => {
  questionForm.type = newValue
})

// 获取题目详情
const fetchQuestionDetail = async () => {
  if (!questionId) {
    ElMessage.error('题目ID不能为空')
    router.push('/teacher/question-bank')
    return
  }
  
  loading.value = true
  console.log('获取题目详情，ID:', questionId, '类型:', activeTab.value)
  
  try {
    let res;
    
    // 根据题目类型选择不同的接口
    if (activeTab.value === 'fill') {
      // 获取填空题详情
      res = await request({
        url: '/blank/list/page',
        method: 'post',
        data: {
          id: Number(questionId),
          current: 1,
          pageSize: 1
        }
      })
    } else {
      // 获取其他类型题目详情
      res = await request({
        url: '/op/list/page',
        method: 'post',
        data: {
          id: Number(questionId),
          current: 1,
          pageSize: 1,
          sortField: "",
          sortOrder: ""
        }
      })
    }
    
    if (res.code === 0 && res.data && res.data.records && res.data.records.length > 0) {
      // 填充表单数据
      const questionData = res.data.records[0]
      questionForm.id = questionData.id // 确保使用后端返回的ID
      questionForm.content = questionData.title
      
      // 根据题型设置不同字段
      const type = questionData.type || activeTab.value
      
      if (type === 'single') {
        questionForm.options = [
          { label: 'A', content: questionData.optionA || '' },
          { label: 'B', content: questionData.optionB || '' },
          { label: 'C', content: questionData.optionC || '' },
          { label: 'D', content: questionData.optionD || '' }
        ]
        questionForm.answer = questionData.answer || ''
      } else if (type === 'fill') {
        // 填空题答案直接从answer字段获取
        questionForm.fillAnswer = questionData.answer || ''
      } else if (type === 'text') {
        questionForm.referenceAnswer = questionData.referenceAnswer || ''
      } else if (type === 'programming') {
        questionForm.programmingAnswer = questionData.programmingAnswer || ''
        questionForm.testCases = questionData.testCases || ''
      }
      
      // 确保tags是数组
      if (questionData.tags) {
        if (typeof questionData.tags === 'string') {
          try {
            // 如果是字符串，尝试解析成数组
            questionForm.tags = JSON.parse(questionData.tags) || []
          } catch (e) {
            console.error('解析tags失败:', e)
            questionForm.tags = []
          }
        } else if (Array.isArray(questionData.tags)) {
          // 如果直接是数组则直接使用
          questionForm.tags = questionData.tags
        } else {
          questionForm.tags = []
        }
      } else {
        questionForm.tags = []
      }
      
      // 设置当前标签页
      activeTab.value = type
      questionForm.type = type
      
      console.log('题目详情获取成功:', questionData)
    } else {
      ElMessage.error(res.message || '获取题目详情失败')
    }
  } catch (error) {
    console.error('获取题目详情失败', error)
    ElMessage.error('获取题目详情失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchQuestionDetail()
})

// 处理标签页点击事件
const handleTabClick = (tab) => {
  // 切换题目类型时重置部分表单数据
  if (tab.props.name === 'single') {
    questionForm.answer = ''
    questionForm.fillAnswer = ''
    questionForm.referenceAnswer = ''
    questionForm.programmingAnswer = ''
    questionForm.testCases = ''
  } else if (tab.props.name === 'fill') {
    questionForm.answer = ''
    questionForm.fillAnswer = ''
    questionForm.referenceAnswer = ''
    questionForm.programmingAnswer = ''
    questionForm.testCases = ''
  } else if (tab.props.name === 'text') {
    questionForm.answer = ''
    questionForm.fillAnswer = ''
    questionForm.referenceAnswer = ''
    questionForm.programmingAnswer = ''
    questionForm.testCases = ''
  } else if (tab.props.name === 'programming') {
    questionForm.answer = ''
    questionForm.fillAnswer = ''
    questionForm.referenceAnswer = ''
    questionForm.programmingAnswer = ''
    questionForm.testCases = ''
  }
}

const addOption = () => {
  const nextLabel = String.fromCharCode('A'.charCodeAt(0) + questionForm.options.length)
  questionForm.options.push({ label: nextLabel, content: '' })
}

const removeOption = (index) => {
  if (questionForm.options.length <= 2) {
    ElMessage.warning('至少需要保留2个选项')
    return
  }
  
  questionForm.options.splice(index, 1)
  
  // 重新标记选项标签
  questionForm.options.forEach((option, idx) => {
    option.label = String.fromCharCode('A'.charCodeAt(0) + idx)
  })
  
  // 重置答案
  if (questionForm.type === 'single') {
    questionForm.answer = ''
  }
}

// 显示标签输入框
const showTagInput = () => {
  inputTagVisible.value = true
  nextTick(() => {
    tagInputRef.value.input.focus()
  })
}

// 添加标签
const handleAddTag = () => {
  const inputValue = tagInputValue.value
  if (inputValue) {
    // 避免重复添加相同标签
    if (!questionForm.tags.includes(inputValue)) {
      questionForm.tags.push(inputValue)
    }
  }
  inputTagVisible.value = false
  tagInputValue.value = ''
}

// 删除标签
const handleRemoveTag = (index) => {
  questionForm.tags.splice(index, 1)
}

const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      loading.value = true
      
      // 根据题型构建不同的提交数据和API
      if (questionForm.type === 'fill') {
        // 填空题专用的更新数据
        const fillUpdateData = {
          id: Number(questionForm.id),
          title: questionForm.content,
          answer: questionForm.fillAnswer,
          tags: questionForm.tags // 确保tags是数组
        }
        
        console.log('更新填空题的数据:', fillUpdateData)
        
        // 调用填空题更新接口
        request({
          url: '/blank/update',
          method: 'post',
          data: fillUpdateData
        })
        .then(res => {
          loading.value = false
          if (res.code === 0) {
            ElMessage({
              type: 'success',
              message: '填空题更新成功'
            })
            // 跳转到填空题列表页
            router.push('/teacher/blank-questions')
          } else {
            ElMessage({
              type: 'error',
              message: res.message || '更新失败'
            })
          }
        })
        .catch(error => {
          loading.value = false
          ElMessage({
            type: 'error',
            message: '更新失败: ' + (error.message || '未知错误')
          })
          console.error('更新填空题失败:', error)
        })
      } else {
        // 其他类型题目的更新逻辑
        let updateData = {
          id: Number(questionForm.id), // 确保ID是数字类型
          title: questionForm.content,
          type: questionForm.type,
          tags: questionForm.tags || [] // 直接使用tags数组，不再转为JSON字符串
        }
        
        // 根据不同题型添加特定字段
        if (questionForm.type === 'single') {
          Object.assign(updateData, {
            answer: questionForm.answer,
            optionA: questionForm.options.find(o => o.label === 'A')?.content || '',
            optionB: questionForm.options.find(o => o.label === 'B')?.content || '',
            optionC: questionForm.options.find(o => o.label === 'C')?.content || '',
            optionD: questionForm.options.find(o => o.label === 'D')?.content || ''
          })
        } else if (questionForm.type === 'text') {
          Object.assign(updateData, {
            referenceAnswer: questionForm.referenceAnswer
          })
        } else if (questionForm.type === 'programming') {
          Object.assign(updateData, {
            programmingAnswer: questionForm.programmingAnswer,
            testCases: questionForm.testCases
          })
        }
        
        console.log('更新题目的数据:', updateData)
        
        // 调用通用题目更新接口
        request({
          url: '/op/update',
          method: 'post',
          data: updateData
        })
        .then(res => {
          loading.value = false
          if (res.code === 0) {
            ElMessage({
              type: 'success',
              message: '题目更新成功'
            })
            // 跳转到题库列表页
            router.push('/teacher/question-bank')
          } else {
            ElMessage({
              type: 'error',
              message: res.message || '更新失败'
            })
          }
        })
        .catch(error => {
          loading.value = false
          ElMessage({
            type: 'error',
            message: '更新失败: ' + (error.message || '未知错误')
          })
          console.error('更新题目失败:', error)
        })
      }
    }
  })
}

const handleCancel = () => {
  // 根据题目类型选择返回的页面
  if (questionForm.type === 'fill') {
    router.push('/teacher/blank-questions')
  } else {
    router.push('/teacher/question-bank')
  }
}

const handlePreview = () => {
  // 实际应用中可以预览题目
  console.log('预览题目', questionForm)
}
</script>

<style scoped>
.edit-question-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.question-form-card {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.option-item {
  margin-bottom: 15px;
}

.option-label {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  font-weight: bold;
}

.option-actions {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}

/* 标签相关样式 */
.tag-item {
  margin-right: 10px;
  margin-bottom: 10px;
}

.button-new-tag {
  margin-bottom: 10px;
}

.tag-input {
  width: 120px;
  margin-right: 10px;
  vertical-align: bottom;
}
</style> 