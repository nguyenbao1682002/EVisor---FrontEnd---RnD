import { ElMessage } from "element-plus";
import { ref } from "vue";
import { useAuthStore } from "../../stores/auth";
import { downloadWorkManagementFile, writeWorkManagementLogApi } from "../../services/auth.service";

export function useDownloadWorkManagement() {
    const authStore = useAuthStore();
    const loggedInUserId = authStore.user?.id;
    const downloadDialogVisible = ref(false);
    const downloadFileName = ref('');
    const downloadFileUrl = ref('');
    const isDownloadPreparing = ref(false);

    const openDownloadDialog = () => {
        downloadDialogVisible.value = true;
        downloadFileName.value = '';
        downloadFileUrl.value = '';
    };

    const downloadFile = async (filterPayload) => {
        isDownloadPreparing.value = true; 
        const payload = {
            "request_id": `evisor-${Date.now()}`,
            "owner": loggedInUserId,
            "version": filterPayload || null,
        };

        downloadFileName.value = '';
        downloadFileUrl.value = '';
        downloadDialogVisible.value = true;
        try {
            const response = await downloadWorkManagementFile(payload);       
            if (response && response.data.status === 'success') {
                await writeWorkManagementLogApi({
                    task_id: "DOWNLOAD_ACTION",
                    user_id: loggedInUserId ? String(loggedInUserId) : "Unknown",
                    user_name: authStore.user?.name || "Unknown",
                    action_type: "DOWNLOAD_FILE",
                    function_name: "WorkManagement_KHTC_Download",
                    description: `Người dùng kết xuất dữ liệu và tải về file quản lý công việc thành công.`,
                    metadata: { filters_applied: filterPayload || null }
                });
                downloadFileUrl.value = response.data.data;
                
                const versionVal = filterPayload;

                if (versionVal) {
                    downloadFileName.value = `PhieuQuanLyCongViec_Ver${filterPayload}`;
                }

            } else {
                throw new Error("Không nhận dạng được đường dẫn file hợp lệ từ server.");
            }
            isDownloadPreparing.value = false;
        } catch (err) {
            console.error("Download preparation error:", err);
            isDownloadPreparing.value = false; 
            downloadFileUrl.value = ''; 
            ElMessage({
                type: 'error',
                message: `Lỗi: ${err.message || 'Không thể tạo file in. Vui lòng thử lại.'}`,
            });
        }
    };

    const confirmDownloadFile = () => {
        if (downloadFileUrl.value) {
            const a = document.createElement('a');
            a.href = downloadFileUrl.value;
            a.download = downloadFileName.value || 'PhieuQuanLyCongViec.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            downloadDialogVisible.value = false;
            downloadFileName.value = '';
            downloadFileUrl.value = '';

            ElMessage({
                type: 'success',
                message: 'Đang tải file...',
            });
        } else {
            ElMessage({
                type: 'warning',
                message: 'Không có đường dẫn file để tải.',
            });
        }
    };

    return {
        downloadDialogVisible,
        downloadFileName,
        downloadFile,
        confirmDownloadFile,
        openDownloadDialog,
        downloadFileUrl,
        isDownloadPreparing,
    };
}