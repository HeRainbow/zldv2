<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()
const classId = route.query.classId
const loading = ref(true)
const uploadLoading = ref(false)
const importDialogVisible = ref(false)
const addStudentDialogVisible = ref(false)
const addStudentLoading = ref(false)
const searchText = ref('')
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const uploadFile = ref(null)

const classInfo = reactive({
  id: classId,
  name: '班级详情'
})

// 添加学生表单
const addStudentForm = reactive({
  studentId: '',
  studentName: ''
})

// 添加学生表单验证规则
const addStudentRules = {
  studentId: [
    { required: true, message: '请输入学生ID', trigger: 'blur' },
  ],
  studentName: [
    { required: true, message: '请输入学生姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在 2 到 20 个字符', trigger: 'blur' }
  ]
}

const addStudentFormRef = ref(null)

const students = ref([])

// 获取学生列表
const fetchStudentList = async () => {
  if (!classId) {
    ElMessage.error('班级ID不能为空')
    router.push('/teacher/class-list')
    return
  }
  
  loading.value = true
  
  try {
    const res = await request({
      url: '/student/get/list',
      method: 'post',
      data: {
        classId,
        current: currentPage.value,
        pageSize: pageSize.value,
        sortField: "",
        sortOrder: ""
      }
    })
    
    if (res.code === 0 && res.data) {
      students.value = res.data.records || []
      total.value = parseInt(res.data.total) || 0
    } else {
      ElMessage.error(res.message || '获取学生列表失败')
    }
  } catch (error) {
    console.error('获取学生列表出错', error)
    ElMessage.error('获取学生列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 页码变化
const handlePageChange = (page) => {
  currentPage.value = page
  fetchStudentList()
}

// 每页条数变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchStudentList()
}

onMounted(() => {
  fetchStudentList()
})

const filteredStudents = computed(() => {
  if (!searchText.value) return students.value
  
  return students.value.filter(student => {
    return student.name.toLowerCase().includes(searchText.value.toLowerCase())
  })
})

const handleShowImportDialog = () => {
  uploadFile.value = null
  importDialogVisible.value = true
}

// 显示添加学生对话框
const handleAddStudent = () => {
  // 重置表单
  addStudentForm.studentId = ''
  addStudentForm.studentName = ''
  addStudentDialogVisible.value = true
}

// 提交添加学生表单
const submitAddStudent = async () => {
  if (!addStudentFormRef.value) return
  
  addStudentFormRef.value.validate(async (valid) => {
    if (valid) {
      addStudentLoading.value = true
      try {
        // 调用添加学生接口
        const res = await request({
          url: '/class/add/one',
          method: 'post',
          data: {
            classId: classId,
            studentId: addStudentForm.studentId,
            studentName: addStudentForm.studentName
          }
        })
        
        if (res.code === 0) {
          ElMessage.success('添加学生成功')
          addStudentDialogVisible.value = false
          // 刷新学生列表
          fetchStudentList()
        } else {
          ElMessage.error(res.message || '添加学生失败')
        }
      } catch (error) {
        console.error('添加学生出错', error)
        ElMessage.error('添加学生失败，请稍后重试')
      } finally {
        addStudentLoading.value = false
      }
    }
  })
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
      ElMessage({
        type: 'success',
        message: '删除成功'
      })
    }
  }).catch(() => {
    // 取消删除
  })
}

// 刷新学生列表
const refreshStudentList = () => {
  fetchStudentList()
}

// 处理文件变化
const handleFileChange = (file) => {
  // 仅保存文件引用，不自动上传
  uploadFile.value = file.raw
  return false // 阻止自动上传
}

// 提交批量导入学生
const submitBatchImport = async () => {
  if (!uploadFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }
  
  // 检查文件类型
  const isExcel = uploadFile.value.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                  uploadFile.value.type === 'application/vnd.ms-excel' ||
                  uploadFile.value.name.endsWith('.xlsx') ||
                  uploadFile.value.name.endsWith('.xls')
  
  if (!isExcel) {
    ElMessage.error('上传文件只能是 Excel 格式!')
    return
  }
  
  // 文件大小限制: 10MB
  const isLt10M = uploadFile.value.size / 1024 / 1024 < 10
  
  if (!isLt10M) {
    ElMessage.error('上传文件大小不能超过 10MB!')
    return
  }
  
  uploadLoading.value = true
  
  try {
    // 创建FormData对象
    const formData = new FormData()
    formData.append('file', uploadFile.value)
    formData.append('classId', classId)
    
    // 调用批量导入接口
    const res = await request({
      url: '/class/add/batch',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    if (res.code === 0) {
      ElMessage.success('批量导入学生成功')
      importDialogVisible.value = false
      // 刷新学生列表
      fetchStudentList()
    } else {
      ElMessage.error(res.message || '批量导入学生失败')
    }
  } catch (error) {
    console.error('批量导入学生出错', error)
    ElMessage.error('批量导入学生失败，请稍后重试')
  } finally {
    uploadLoading.value = false
  }
}

// 下载导入模板
const downloadTemplate = () => {
  ElMessage.info('下载模板功能暂未实现')
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
        <span class="class-info">班级ID: {{ classInfo.id }} | 学生总数: {{ total }}</span>
      </div>
      <div class="header-actions">
        <el-button @click="refreshStudentList">刷新</el-button>
        <el-button type="success" @click="handleShowImportDialog">导入学生</el-button>
        <el-button type="primary" @click="handleAddStudent">添加学生</el-button>
        <el-button type="info" @click="exportStudents">导出学生</el-button>
      </div>
    </div>
    
    <el-card class="students-list-card">
      <div class="toolbar">
        <el-input
          v-model="searchText"
          placeholder="搜索学生姓名"
          clearable
          prefix-icon="search"
          style="width: 300px"
        ></el-input>
      </div>
      
      <el-table :data="filteredStudents" v-loading="loading" style="width: 100%; margin-top: 20px">
        <el-table-column prop="id" label="学生ID" width="100"></el-table-column>
        <el-table-column prop="name" label="姓名" min-width="120"></el-table-column>
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
      
      <div class="pagination" v-if="total > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[5, 10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
    
    <!-- 导入学生对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="批量导入学生"
      width="500px"
    >
      <div class="import-dialog-content">
        <p class="import-tips">请上传符合格式的Excel文件，表格列必须包含：学生ID和姓名</p>
        
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
          <el-button type="primary" :loading="uploadLoading" @click="submitBatchImport">开始导入</el-button>
          <el-button @click="importDialogVisible = false">取消</el-button>
        </div>
        
        <div style="margin-top: 20px;">
          <h4>模板下载</h4>
          <el-button type="text" @click="downloadTemplate">
            <el-icon><download /></el-icon>
            下载导入模板
          </el-button>
        </div>
      </div>
    </el-dialog>
    
    <!-- 添加学生对话框 -->
    <el-dialog
      v-model="addStudentDialogVisible"
      title="添加学生"
      width="500px"
    >
      <el-form
        ref="addStudentFormRef"
        :model="addStudentForm"
        :rules="addStudentRules"
        label-width="100px"
        label-position="right"
      >
        <el-form-item label="学生ID" prop="studentId">
          <el-input v-model="addStudentForm.studentId" placeholder="请输入学生ID" />
        </el-form-item>
        <el-form-item label="学生姓名" prop="studentName">
          <el-input v-model="addStudentForm.studentName" placeholder="请输入学生姓名" />
        </el-form-item>
        <el-form-item>
          <div style="text-align: center;">
            <el-button type="primary" :loading="addStudentLoading" @click="submitAddStudent">提交</el-button>
            <el-button @click="addStudentDialogVisible = false">取消</el-button>
          </div>
        </el-form-item>
      </el-form>
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

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
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