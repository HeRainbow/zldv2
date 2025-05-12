<script setup>
import { ref, reactive, nextTick, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()
const questionId = route.query.id
const loading = ref(false)
const formRef = ref(null)

// 标签相关变量
const inputTagVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref(null)

// 测试用例相关
const judgeCase = ref([
  { input: '', output: '' }
])

// 添加测试用例
const addTestCase = () => {
  judgeCase.value.push({ input: '', output: '' })
}

// 删除测试用例
const removeTestCase = (index) => {
  if (judgeCase.value.length <= 1) {
    ElMessage.warning('至少需要保留1个测试用例')
    return
  }
  judgeCase.value.splice(index, 1)
}

// 题目表单数据
const questionForm = reactive({
  id: questionId,
  title: '',
  defaultProgram: '', // 默认代码
  tags: [], // 题目标签
  answer: '', // 参考答案
  judgeConfig: {
    timeLimit: 256,
    memoryLimit: 256,
    stackLimit: 256
  }
})

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入题目内容', trigger: 'blur' },
    { min: 2, message: '题目内容至少包含2个字符', trigger: 'blur' }
  ],
  answer: [
    { required: true, message: '请输入参考答案', trigger: 'blur' }
  ]
}

// 获取编程题详情
const fetchQuestionDetail = async () => {
  if (!questionId) {
    ElMessage.error('题目ID不能为空')
    router.push('/teacher/program-questions')
    return
  }
  
  loading.value = true
  console.log('获取编程题详情，ID:', questionId)
  
  try {
    // 获取编程题详情
    const res = await request({
      url: '/program/list/page',
      method: 'post',
      data: {
        id: Number(questionId),
        current: 1,
        pageSize: 1
      }
    })
    
    if (res.code === 0 && res.data && res.data.records && res.data.records.length > 0) {
      // 填充表单数据
      const questionData = res.data.records[0]
      questionForm.id = questionData.id // 确保使用后端返回的ID
      questionForm.title = questionData.title
      questionForm.defaultProgram = questionData.defaultProgram || ''
      questionForm.answer = questionData.answer || ''
      
      // 解析tags
      if (questionData.tags) {
        if (typeof questionData.tags === 'string') {
          try {
            questionForm.tags = JSON.parse(questionData.tags) || []
          } catch (e) {
            console.error('解析tags失败:', e)
            questionForm.tags = []
          }
        } else if (Array.isArray(questionData.tags)) {
          questionForm.tags = questionData.tags
        } else {
          questionForm.tags = []
        }
      }

      // 解析judgeCase
      if (questionData.judgeCase) {
        try {
          const parsedJudgeCase = JSON.parse(questionData.judgeCase)
          if (Array.isArray(parsedJudgeCase) && parsedJudgeCase.length > 0) {
            judgeCase.value = parsedJudgeCase
          }
        } catch (e) {
          console.error('解析judgeCase失败:', e)
        }
      }
      
      // 解析judgeConfig
      if (questionData.judgeConfig) {
        try {
          const parsedConfig = JSON.parse(questionData.judgeConfig)
          questionForm.judgeConfig = {
            ...questionForm.judgeConfig,
            ...parsedConfig
          }
        } catch (e) {
          console.error('解析judgeConfig失败:', e)
        }
      }
      
      console.log('编程题详情获取成功:', questionData)
    } else {
      ElMessage.error(res.message || '获取编程题详情失败')
    }
  } catch (error) {
    console.error('获取编程题详情失败', error)
    ElMessage.error('获取编程题详情失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

// 更新编程题
const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      // 创建测试用例相关验证表单
      let hasError = false;
      judgeCase.value.forEach((item, index) => {
        if (!item.input || !item.output) {
          ElMessage.error(`测试用例 ${index + 1} 的输入和输出不能为空`);
          hasError = true;
        }
      });
      
      if (hasError) {
        return;
      }
      
      loading.value = true
      
      // 构建编程题更新数据
      const updateData = {
        id: Number(questionForm.id),
        title: questionForm.title,
        answer: questionForm.answer,
        defaultProgram: questionForm.defaultProgram || null,
        tags: questionForm.tags,
        judgeCase: judgeCase.value,
        judgeConfig: questionForm.judgeConfig,
        containWords: [] // 预留字段，可以用于约束必须包含的关键词
      }
      
      console.log('更新编程题数据:', updateData)
      
      // 调用更新编程题接口
      request({
        url: '/program/update',
        method: 'post',
        data: updateData
      })
      .then(res => {
        loading.value = false
        if (res.code === 0) {
          ElMessage.success('编程题更新成功')
          // 跳转到编程题列表页
          router.push('/teacher/program-questions')
        } else {
          ElMessage.error(res.message || '更新失败')
        }
      })
      .catch(error => {
        loading.value = false
        ElMessage.error('更新失败: ' + (error.message || '未知错误'))
        console.error('更新编程题失败:', error)
      })
    }
  })
}

// 取消更新
const handleCancel = () => {
  router.push('/teacher/program-questions')
}

// 预览题目
const handlePreview = () => {
  console.log('预览编程题', questionForm)
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

onMounted(() => {
  fetchQuestionDetail()
})
</script>

<template>
  <div class="edit-program-question-container">
    <div class="page-header">
      <h2>编辑编程题</h2>
    </div>
    
    <el-card class="question-form-card" v-loading="loading">
      <el-form
        ref="formRef"
        :model="questionForm"
        :rules="rules"
        label-width="120px"
        label-position="right"
      >
        <!-- 题目内容 -->
        <el-form-item label="题目内容" prop="title">
          <el-input
            v-model="questionForm.title"
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
        
        <!-- 默认代码 -->
        <el-form-item label="默认代码">
          <el-input
            v-model="questionForm.defaultProgram"
            type="textarea"
            :rows="5"
            placeholder="请输入初始代码，学生开始答题时会显示这些代码（可选）"
          ></el-input>
        </el-form-item>
        
        <!-- 参考答案 -->
        <el-form-item label="参考答案" prop="answer">
          <el-input
            v-model="questionForm.answer"
            type="textarea"
            :rows="10"
            placeholder="请输入参考答案代码"
          ></el-input>
        </el-form-item>
        
        <!-- 测试用例 -->
        <el-divider content-position="left">测试用例</el-divider>
        
        <div v-for="(item, index) in judgeCase" :key="index" class="test-case-item">
          <el-row :gutter="10">
            <el-col :span="11">
              <el-form-item :label="`输入 ${index + 1}`" :prop="`judgeCase[${index}].input`" >
                <el-input
                  v-model="item.input"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入测试输入"
                ></el-input>
              </el-form-item>
            </el-col>
            
            <el-col :span="11">
              <el-form-item :label="`输出 ${index + 1}`" :prop="`judgeCase[${index}].output`" >
                <el-input
                  v-model="item.output"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入预期输出"
                ></el-input>
              </el-form-item>
            </el-col>
            
            <el-col :span="2" class="test-case-actions">
              <el-button type="danger" @click="removeTestCase(index)" :disabled="judgeCase.length <= 1">删除</el-button>
            </el-col>
          </el-row>
        </div>
        
        <div class="test-case-actions">
          <el-button type="primary" plain @click="addTestCase">添加测试用例</el-button>
        </div>
        
        <!-- 判题配置 -->
        <el-divider content-position="left">判题配置</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="时间限制(ms)">
              <el-input-number 
                v-model="questionForm.judgeConfig.timeLimit" 
                :min="100" 
                :max="10000" 
                :step="100"
              ></el-input-number>
            </el-form-item>
          </el-col>
          
          <el-col :span="8">
            <el-form-item label="内存限制(MB)">
              <el-input-number 
                v-model="questionForm.judgeConfig.memoryLimit" 
                :min="16" 
                :max="1024" 
                :step="16"
              ></el-input-number>
            </el-form-item>
          </el-col>
          
          <el-col :span="8">
            <el-form-item label="栈限制(MB)">
              <el-input-number 
                v-model="questionForm.judgeConfig.stackLimit" 
                :min="16" 
                :max="1024" 
                :step="16"
              ></el-input-number>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">保存题目</el-button>
          <el-button @click="handlePreview">预览</el-button>
          <el-button @click="handleCancel">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.edit-program-question-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.question-form-card {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
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

/* 测试用例相关样式 */
.test-case-item {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
}

.test-case-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 10px 0;
}
</style> 