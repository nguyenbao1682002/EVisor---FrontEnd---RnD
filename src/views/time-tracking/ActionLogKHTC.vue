<template>
  <div class="work-management-khtc-container">
    <div v-if="isLoading" class="loading-message">
      {{ langStore.t('DataUploading') }}
    </div>
    
    <div v-else class="table-data">
      <div class="filter-section">
        <div class="filter-area" style="width: 100%; justify-content: flex-start; gap: 10px;">
          
          <el-select
            v-model="selectedUser"
            placeholder="Lọc theo người thao tác"
            clearable
            @change="applyFilters"
            class="user-select"
            style="width: 200px;"
          >
            <el-option
              v-for="user in uniqueUsersList"
              :key="user"
              :label="user"
              :value="user"
            ></el-option>
          </el-select>

          <el-select
            v-model="selectedAction"
            placeholder="Lọc theo hành động"
            clearable
            @change="applyFilters"
            class="status-select"
            style="width: 220px;"
          >
            <el-option 
              v-for="(label, key) in actionLanguageMap" 
              :key="key" 
              :label="`${key} (${label})`" 
              :value="key"
            ></el-option>
          </el-select>

          <el-date-picker
            v-model="startAndEndDateVal"
            type="daterange"
            :start-placeholder="langStore.t('StartDate')"
            :end-placeholder="langStore.t('EndDate')"
            value-format="YYYY-MM-DD"
            placement="bottom-start"
            style="width: 280px;"
            @change="applyFilters"
          />

          <el-button plain type="warning" @click="refreshLogData" :icon="Refresh"></el-button>
          <el-badge :value="filteredLogs.length" :max="9999" :hidden="filteredLogs.length === 0" type="primary">
            <el-button 
              type="success" 
              :icon="Download"
              :disabled="filteredLogs.length === 0"
              :loading="isExporting"
              @click="handleExport"
            >
              Xuất file Excel
            </el-button>
          </el-badge>
        </div>
      </div>

      <el-table
        :data="paginatedLogs"
        style="width: 100%"
        border
        stripe
        class="tasks-table"
        v-loading="isLoading"
      >
        <template #empty>
          <div class="empty-data-message">
            <el-empty :description="langStore.t('NoData')" />
          </div>
        </template>

        <el-table-column prop="timestamp" label="Thời gian tạo" width="170" align="center" sortable />

        <el-table-column prop="user_name" label="Người thực hiện" width="180" sortable>
          <template #default="{ row }">
            <span style="font-weight: bold;">{{ row.user_name }}</span>
            <p style="margin: 0; font-size: 11px; color: #909399;">ID: {{ row.user_id }}</p>
          </template>
        </el-table-column>

        <el-table-column prop="action_type" label="Hành động" width="180" align="center" sortable>
          <template #default="{ row }">
            <el-tag :type="getActionTagType(row.action_type)" style="font-weight: bolder; min-width: 130px;" effect="dark">
              {{ translateAction(row.action_type) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="function_name" label="Chức năng tác động" width="220" sortable />

        <el-table-column prop="description" label="Nội dung mô tả nhật ký" min-width="250" />

        <!-- <el-table-column label="Lịch sử dữ liệu" width="130" align="center">
          <template #default="{ row }">
            <el-button 
              size="small" 
              type="primary" 
              plain
              :disabled="!row.metadata || Object.keys(row.metadata).length === 0"
              @click="viewMetadataJson(row.metadata)"
            >
              Xem JSON
            </el-button>
          </template>
        </el-table-column> -->
      </el-table>

      <el-pagination
        background
        layout="prev, pager, next, sizes, total"
        :total="filteredLogs.length"
        :page-sizes="[10, 20, 50, 100]"
        v-model:page-size="pageSize"
        v-model:current-page="currentPage"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        class="pagination-controls"
      ></el-pagination>
    </div>

    <el-dialog
      title="Chi tiết cấu trúc thay đổi dữ liệu (History Metadata)"
      v-model="dialogVisible"
      width="50%"
    >
      <pre style="background: #2d2d2d; color: #7ec699; padding: 15px; border-radius: 6px; overflow-x: auto; max-height: 400px;">{{ JSON.stringify(selectedMetadata, null, 2) }}</pre>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="info" @click="dialogVisible = false">Đóng</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { Refresh, Download } from "@element-plus/icons-vue";
import { useLanguageStore } from "../../stores/language";
import { getWorkManagementLogsApi } from "../../services/auth.service"; 
import * as XLSX from "xlsx";
import { ElMessage } from "element-plus";
import { useExportFile } from "../../composables/KHTC/useExportFile";

export default {
  name: "WorkManagementLogView",
  setup() {
    const langStore = useLanguageStore();
    const isLoading = ref(false);
    const allLogs = ref([]);
    const { exportToExcelCustom } = useExportFile();
    const isExporting = ref(false);
    
    const selectedUser = ref('');
    const selectedAction = ref('');
    const startAndEndDateVal = ref(null);

    const currentPage = ref(1);
    const pageSize = ref(20);

    const dialogVisible = ref(false);
    const selectedMetadata = ref({});

    const actionLanguageMap = {
      CREATE: "Thêm mới",
      UPDATE: "Cập nhật",
      DELETE: "Xóa đơn",
      ADVANCED_DELETE: "Xóa hàng loạt",
      UPLOAD_FILE: "Tải tệp lên",
      DOWNLOAD_FILE: "Tải xuống"
    };

    const loadLogsFromServer = async () => {
      isLoading.value = true;
      try {
        const response = await getWorkManagementLogsApi(1000, 0); 
        if (response && response.status === "success") {
          allLogs.value = response.data;
        } else {
          ElMessage.error(response.message || "Không thể lấy dữ liệu nhật ký hệ thống");
        }
      } catch (err) {
        ElMessage.error("Lỗi kết nối API lấy lịch sử hệ thống");
      } finally {
        isLoading.value = false;
      }
    };

    const uniqueUsersList = computed(() => {
      const users = allLogs.value.map(item => item.user_name).filter(Boolean);
      return [...new Set(users)];
    });

    const filteredLogs = computed(() => {
      return allLogs.value.filter(log => {
        const matchUser = !selectedUser.value || log.user_name === selectedUser.value;
        const matchAction = !selectedAction.value || log.action_type === selectedAction.value;
        
        let matchDate = true;
        if (startAndEndDateVal.value && startAndEndDateVal.value.length === 2) {
          const [start, end] = startAndEndDateVal.value;
          const logDate = log.timestamp ? log.timestamp.substring(0, 10) : '';
          matchDate = logDate >= start && logDate <= end;
        }
        return matchUser && matchAction && matchDate;
      });
    });

    const paginatedLogs = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value;
      const end = start + pageSize.value;
      return filteredLogs.value.slice(start, end);
    });

    const applyFilters = () => {
      currentPage.value = 1;
    };

    const refreshLogData = () => {
      selectedUser.value = '';
      selectedAction.value = '';
      startAndEndDateVal.value = null;
      currentPage.value = 1;
      loadLogsFromServer();
    };

    const handleSizeChange = (val) => {
      pageSize.value = val;
      currentPage.value = 1;
    };

    const handleCurrentChange = (val) => {
      currentPage.value = val;
    };

    const viewMetadataJson = (meta) => {
      selectedMetadata.value = meta;
      dialogVisible.value = true;
    };

    // 2. HÀM CHUYỂN ĐỔI NGÔN NGỮ ĐỘNG (Ưu tiên langStore, tự động fallback về tiếng Việt)
    const translateAction = (actionKey) => {
      if (!actionKey) return "";
      
      // Nếu trong file i18n Store của bạn đã khai báo mã này, i18n sẽ tự dịch
      if (langStore.has && langStore.has(actionKey)) {
        return langStore.t(actionKey);
      }
      
      // Nếu chưa khai báo trong i18n store, hệ thống lấy từ map Tiếng Việt dự phòng ở trên
      return actionLanguageMap[actionKey] || actionKey;
    };

    const getActionTagType = (action) => {
      switch (action) {
        case "CREATE":
          return "success";        
        case "UPDATE":
          return "warning";        
        case "DELETE":
          return "danger";         
        case "ADVANCED_DELETE":
          return "danger";         
        case "UPLOAD_FILE":
          return "primary";   
        case "DOWNLOAD_FILE":
          return "success";       
        default:
          return "info";           
      }
    };

    const handleExport = () => {
      // Bật trạng thái quay vòng Loading cho nút bấm
      isExporting.value = true;

      setTimeout(() => {
        try {
          const cleanDataArray = JSON.parse(JSON.stringify(filteredLogs.value));

          const logMappingFunction = (item, index) => ({
            "STT": index + 1,
            "Thời gian tạo": item.timestamp || "",
            "Mã nhân viên (ID)": item.user_id ? String(item.user_id) : "", 
            "Người thực hiện": item.user_name || "",
            "Hành động": translateAction(item.action_type),
            "Chức năng tác động": item.function_name || "",
            "Nội dung mô tả nhật ký": item.description || ""
          });

          exportToExcelCustom({
            dataList: cleanDataArray,
            mappingFunction: logMappingFunction,
            sheetName: "Nhật ký hoạt động",
            filePrefix: "NhatKy_HeThong"
          });
        } finally {
          isExporting.value = false;
        }
      }, 100);
    };

    onMounted(() => {
      loadLogsFromServer();
    });

    return {
      isLoading,
      langStore,
      Refresh,
      selectedUser,
      selectedAction,
      startAndEndDateVal,
      uniqueUsersList,
      filteredLogs,
      paginatedLogs,
      currentPage,
      pageSize,
      dialogVisible,
      selectedMetadata,
      actionLanguageMap,
      applyFilters,
      refreshLogData,
      handleSizeChange,
      handleCurrentChange,
      viewMetadataJson,
      getActionTagType,
      translateAction,
      Download,
      isExporting,
      handleExport,
      exportToExcelCustom,
    };
  }
};
</script>

<style scoped>
/* Giữ nguyên phần style cũ của bạn */
.work-management-khtc-container {
  padding: 20px;
  height: 100vh;
  display: flex;
  background-color: #f9f9f9;
  flex-direction: column;
  overflow: scroll;
  overflow-x: hidden;
}
.loading-message {
  text-align: center;
  padding: 20px;
  font-size: 1.1em;
  color: #666;
}
.filter-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
}
.filter-area {
  display: flex;
  flex-direction: row;
  gap: 5px;
  width: 100%;
}
.tasks-table {
  flex-grow: 1;
  margin-bottom: 20px;
}
.pagination-controls {
  margin-top: auto;
  display: flex;
  justify-content: center;
  padding-top: 15px;
  padding-bottom: 15px;
}
.table-data {
  display: contents;
}
pre {
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
}
</style>