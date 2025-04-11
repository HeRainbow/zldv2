<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const examId = route.params.id
const loading = ref(true)
const submitting = ref(false)
const remainingTime = ref(0)
const timer = ref(null)

const exam = reactive({
  id: null,
  title: '',
  totalPoints: 0,
  duration: 0,
  questions: []
})

const answers = ref({})

onMounted(() => {
  // 模拟获取考试数据
  setTimeout(() => {
    // 获取考试信息
    const examData = {
      id: examId,
      title: '2023年第一学期数学期末考试',
      totalPoints: 100,
      duration: 120, // 分钟
      questions: [
        {
          id: 1,
          type: 'single',
          content: '下列哪个不是JavaScript的数据类型？',
          options: [
            { label: 'A', content: 'String' },
            { label: 'B', content: 'Number' },
            { label: 'C', content: 'Boolean' },
            { label: 'D', content: 'Char' }
          ],
          points: 5
        },
        {
          id: 2,
          type: 'multiple',
          content: '以下哪些是Vue的生命周期钩子？',
          options: [
            { label: 'A', content: 'mounted' },
            { label: 'B', content: 'created' },
            { label: 'C', content: 'rendering' },
            { label: 'D', content: 'destroyed' }
          ],
          points: 5
        },
        {
          id: 3,
          type: 'text',
          content: '简述Vue组合式API的优势',
          points: 10
        },
        {
          id: 4,
          type: 'text',
          content: '请解释Vue中ref和reactive的区别',
          points: 10
        }
      ]
    }
    
    Object.assign(exam, examData)
    
    // 初始化答案对象
    exam.questions.forEach(q => {
      if (q.type === 'single') {
        answers.value[q.id] = ''
      } else if (q.type === 'multiple') {
        answers.value[q.id] = []
      } else if (q.type === 'text') {
        answers.value[q.id] = ''
      }
    })
    
    // 设置倒计时
    remainingTime.value = exam.duration * 60 // 转换为秒
    startTimer()
    
    loading.value = false
  }, 1000)
})

onBeforeUnmount(() => {
  clearInterval(timer.value)
})

const startTimer = () => {
  timer.value = setInterval(() => {
    if (remainingTime.value > 0) {
      remainingTime.value--
    } else {
      clearInterval(timer.value)
      handleSubmitExam()
    }
  }, 1000)
}

const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':')
}

const calculateProgress = computed(() => {
  const answered = Object.values(answers.value).filter(answer => {
    if (Array.isArray(answer)) {
      return answer.length > 0
    }
    return answer !== ''
  }).length
  
  return Math.floor((answered / exam.questions.length) * 100)
})

const handleSubmitExam = () => {
  submitting.value = true
  
  // 模拟提交数据
  setTimeout(() => {
    submitting.value = false
    // 跳转到成绩页面
    router.push('/student/scores')
  }, 1500)
}
</script>

<template>
  <div class="take-exam-container" v-loading="loading">
    <div class="exam-header" v-if="!loading">
      <div class="exam-title">
        <h2>{{ exam.title }}</h2>
        <div class="exam-info">
          <span>总分: {{ exam.totalPoints }}分</span>
          <span>题目数量: {{ exam.questions.length }}</span>
        </div>
      </div>
      
      <div class="exam-timer">
        <el-tag type="danger" size="large">
          <i class="el-icon-time"></i>
          剩余时间: {{ formatTime(remainingTime) }}
        </el-tag>
      </div>
    </div>
    
    <el-divider></el-divider>
    
    <div class="exam-content" v-if="!loading">
      <el-steps :active="calculateProgress / 100 * exam.questions.length" finish-status="success" simple style="margin-bottom: 20px">
        <el-step v-for="i in exam.questions.length" :key="i" :title="`第${i}题`"></el-step>
      </el-steps>
      
      <div class="questions-container">
        <div v-for="(question, index) in exam.questions" :key="question.id" class="question-item">
          <h3>{{ index + 1 }}. {{ question.content }} <span class="question-points">({{ question.points }}分)</span></h3>
          
          <!-- 单选题 -->
          <template v-if="question.type === 'single'">
            <el-radio-group v-model="answers[question.id]">
              <div v-for="option in question.options" :key="option.label" class="option-item">
                <el-radio :label="option.label">{{ option.label }}. {{ option.content }}</el-radio>
              </div>
            </el-radio-group>
          </template>
          
          <!-- 多选题 -->
          <template v-else-if="question.type === 'multiple'">
            <el-checkbox-group v-model="answers[question.id]">
              <div v-for="option in question.options" :key="option.label" class="option-item">
                <el-checkbox :label="option.label">{{ option.label }}. {{ option.content }}</el-checkbox>
              </div>
            </el-checkbox-group>
          </template>
          
          <!-- 简答题 -->
          <template v-else-if="question.type === 'text'">
            <el-input
              v-model="answers[question.id]"
              type="textarea"
              :rows="4"
              placeholder="请输入您的答案"
            ></el-input>
          </template>
        </div>
      </div>
      
      <div class="exam-actions">
        <el-button type="primary" @click="handleSubmitExam" :loading="submitting" size="large">
          提交答卷
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.take-exam-container {
  padding: 20px;
}

.exam-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exam-info {
  display: flex;
  margin-top: 10px;
}

.exam-info span {
  margin-right: 20px;
  color: #666;
}

.exam-timer {
  display: flex;
  align-items: center;
}

.questions-container {
  margin-bottom: 30px;
}

.question-item {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.question-points {
  color: #F56C6C;
  font-size: 0.9em;
}

.option-item {
  margin: 10px 0;
}

.exam-actions {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style> 