<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const classId = route.query.classId
const loading = ref(true)
const uploadLoading = ref(false)
const importDialogVisible = ref(false)
const searchText = ref('')

const classInfo = reactive({
  id: null,
  name: '',
  year: '',
  count: 0
})

const students = ref([])

onMounted(() => {
  // 模拟获取班级信息和学生列表
  setTimeout(() => {
    // 获取班级信息
    classInfo.id = classId
    classInfo.name = '高一(1)班'
    classInfo.year = '2023'
    classInfo.count = 45
    
    // 获取学生列表
    students.value = [
      {
        id: 1,
        studentId: '202301001',
        name: '张三',
        gender: '男',
        phone: '13800138001'
      },
      {
        id: 2,
        studentId: '202301002',
        name: '李四',
        gender: '男',
        phone: '13800138002'
      },
      {
        id: 3,
        studentId: '202301003',
        name: '王五',
        gender: '男',
        phone: '13800138003'
      },
      {
        id: 4,
        studentId: '202301004',
        name: '赵六',
        gender: '女',
        phone: '13800138004'
      },
      {
        id: 5,
        studentId: '202301005',
        name: '钱七',
        gender: '女',
        phone: '13800138005'
      }
    ]
    
    loading.value = false
  }, 1000)
})

const filteredStudents = computed(() => {
  if (!searchText.value) return students.value
  
  return students.value.filter(student => {
    return student.name.includes(searchText.value) || 
           student.studentId.includes(searchText.value)
  })
})

const handleShowImportDialog = () => {
  importDialogVisible.value = true
}

const handleAddStudent = () => {
  // 实际应用中应该弹出添加学生表单
  console.log('添加学生')
}

const handleEditStudent = (student) => {
  // 实际应用中应该弹出编辑学生表单
  console.log('编辑学生', student)
}

const handleDeleteStudent = (student) => {
  ElMessageBox.confirm(
    `确定要删除学生 ${student.name} 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 模拟删除
    const index = students.value.findIndex(item => item.id === student.id)
    if (index !== -1) {
      students.value.splice(index, 1)
      classInfo.count--
      ElMessage({
        type: 'success',
        message: '删除成功'
      })
    }
  }).catch(() => {
    // 取消删除
  })
}

// 模拟文件上传处理
const handleFileChange = (file) => {
  // 检查文件类型
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                  file.type === 'application/vnd.ms-excel'
  
  if (!isExcel) {
    ElMessage.error('上传文件只能是 Excel 格式!')
    return false
  }
  
  // 文件大小限制: 10MB
  const isLt10M = file.size / 1024 / 1024 < 10
  
  if (!isLt10M) {
    ElMessage.error('上传文件大小不能超过 10MB!')
    return false
  }
  
  // 模拟上传和解析
  uploadLoading.value = true
  
  setTimeout(() => {
    // 模拟新增5名学生
    const newStudents = [
      {
        id: students.value.length + 1,
        studentId: '202301006',
        name: '孙八',
        gender: '男',
        phone: '13800138006'
      },
      {
        id: students.value.length + 2,
        studentId: '202301007',
        name: '周九',
        gender: '女',
        phone: '13800138007'
      }
    ]
    
    // 添加到学生列表
    students.value = [...students.value, ...newStudents]
    classInfo.count = students.value.length
    
    uploadLoading.value = false
    importDialogVisible.value = false
    
    ElMessage({
      type: 'success',
      message: '成功导入 2 名学生'
    })
  }, 2000)
  
  return false // 阻止自动上传
}

const exportStudents = () => {
  // 实际应用中应该调用API导出学生数据
  ElMessage({
    type: 'success',
    message: '导出成功'
  })
}
</script>

<template>
  <div class="students-management-container">
    <div class="page-header">
      <div class="header-left">
        <h2>学生管理 - {{ classInfo.name }}</h2>
        <span class="class-info">年份: {{ classInfo.year }} | 学生数量: {{ classInfo.count }}</span>
      </div>
      <div class="header-actions">
        <el-button type="success" @click="handleShowImportDialog">导入学生</el-button>
        <el-button type="primary" @click="handleAddStudent">添加学生</el-button>
        <el-button type="info" @click="exportStudents">导出学生</el-button>
      </div>
    </div>
    
    <el-card class="students-list-card">
      <div class="toolbar">
        <el-input
          v-model="searchText"
          placeholder="搜索学生姓名或学号"
          clearable
          prefix-icon="search"
          style="width: 300px"
        ></el-input>
      </div>
      
      <el-table :data="filteredStudents" v-loading="loading" style="width: 100%; margin-top: 20px">
        <el-table-column prop="studentId" label="学号" width="120"></el-table-column>
        <el-table-column prop="name" label="姓名" width="120"></el-table-column>
        <el-table-column prop="gender" label="性别" width="80"></el-table-column>
        <el-table-column prop="phone" label="联系电话" min-width="150"></el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button type="warning" size="small" @click="handleEditStudent(scope.row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDeleteStudent(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 导入学生对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="导入学生"
      width="500px"
    >
      <div class="import-dialog-content">
        <p class="import-tips">请上传符合格式的Excel文件，表格列必须包含：学号、姓名、性别、联系电话</p>
        
        <el-upload
          class="upload-excel"
          drag
          action="#"
          :auto-upload="false"
          :limit="1"
          :on-change="handleFileChange"
          :show-file-list="true"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            拖拽文件到此处或 <em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              只能上传xlsx/xls文件，且不超过10MB
            </div>
          </template>
        </el-upload>
        
        <div style="margin-top: 20px; text-align: center">
          <el-button type="primary" :loading="uploadLoading">开始导入</el-button>
          <el-button @click="importDialogVisible = false">取消</el-button>
        </div>
        
        <div style="margin-top: 20px;">
          <h4>模板下载</h4>
          <el-button type="text">
            <el-icon><download /></el-icon>
            下载导入模板
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.students-management-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  flex-direction: column;
}

.class-info {
  margin-top: 5px;
  color: #666;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.students-list-card {
  width: 100%;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.import-dialog-content {
  padding: 0 20px;
}

.import-tips {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f8f8f8;
  border-radius: 4px;
  color: #666;
  font-size: 14px;
}

.upload-excel {
  width: 100%;
}
</style> 