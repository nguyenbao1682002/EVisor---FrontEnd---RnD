// src/composables/KHTC/useExportFile.js
// Sử dụng thư viện mở rộng chuyên dụng để kích hoạt tính năng Đổ màu & Làm viền
import * as XLSX from "xlsx-js-style"; 
import { ElMessage } from "element-plus";

export const useExportFile = () => {

  const exportToExcelCustom = ({
    dataList = [],
    mappingFunction,
    sheetName = "Sheet1",
    filePrefix = "ExportData"
  }) => {
    if (!dataList || dataList.length === 0) {
      ElMessage.warning("Không có dữ liệu phù hợp để xuất file Excel!");
      return false;
    }

    try {
      // 1. Ánh xạ dữ liệu thô sang cấu trúc mảng Excel
      const formattedData = dataList.map((item, index) => mappingFunction(item, index));

      // 2. Khởi tạo cấu trúc lưới Worksheet
      const worksheet = XLSX.utils.json_to_sheet(formattedData);

      // 3. Đọc dải ô (Range) dữ liệu để tiến hành "Trang trí mỹ thuật"
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const rowHeights = []; // Mảng quản lý chiều cao dòng

      for (let R = range.s.r; R <= range.e.r; ++R) {
        // Thiết lập chiều cao: Tiêu đề cao hẳn 28pt tạo nét thoáng, dữ liệu cao 22pt dễ nhìn
        rowHeights.push({ hpt: R === 0 ? 28 : 22 });

        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
          if (!worksheet[cellRef]) continue;

          // Tạo khung phong cách nền tảng (Font chữ Segoe UI cao cấp, Viền xám mảnh UI hiện đại)
          worksheet[cellRef].s = {
            font: { name: "Segoe UI", size: 10.5, color: { rgb: "334155" } },
            border: {
              top: { style: "thin", color: { rgb: "E2E8F0" } },
              bottom: { style: "thin", color: { rgb: "E2E8F0" } },
              left: { style: "thin", color: { rgb: "E2E8F0" } },
              right: { style: "thin", color: { rgb: "E2E8F0" } }
            },
            alignment: { vertical: "center", wrapText: true }
          };

          if (R === 0) {
            worksheet[cellRef].s.fill = { fgColor: { rgb: "1E293B" } }; // Nền Xám xanh Slate 800 quyền lực
            worksheet[cellRef].s.font = { name: "Segoe UI", size: 11, bold: true, color: { rgb: "FFFFFF" } }; // Chữ trắng đậm
            worksheet[cellRef].s.alignment.horizontal = "center"; // Căn giữa chữ tiêu đề
          } 
          else {
            // Đổ màu nền xen kẽ (Zebra Striping) dòng chẵn để chống mỏi mắt khi đọc hàng ngang
            if (R % 2 === 0) {
              worksheet[cellRef].s.fill = { fgColor: { rgb: "F8FAFC" } }; // Nền xám Slate 50 siêu dịu nhẹ
            }

            // Căn lề tự động theo đặc tính cột dữ liệu để đảm bảo tính mỹ thuật
            // Cột STT(0), Thời gian(1), Mã NV(2), Hành động(4) -> Tiến hành Căn Giữa
            if (C === 0 || C === 1 || C === 2 || C === 4) {
              worksheet[cellRef].s.alignment.horizontal = "center";
              
              // Riêng cột mã số và thời gian, chuyển sang font số Consolas đều tăm tắp nhìn rất pro
              if (C !== 0) {
                worksheet[cellRef].s.font.name = "Consolas";
                worksheet[cellRef].s.font.size = 10;
              }
            } else {
              // Cột Tên người thực hiện, Chức năng, Mô tả nội dung nhật ký -> Căn Trái
              worksheet[cellRef].s.alignment.horizontal = "left";
            }
          }
        }
      }

      // Áp dụng mảng chiều cao dòng vào bảng tính
      worksheet['!rows'] = rowHeights;

      // 4. Tự động tính toán giãn cách độ rộng cột thông minh (Cộng bù khoảng trống thông thoáng)
      if (formattedData.length > 0) {
        const maxWidths = [];
        const headers = Object.keys(formattedData[0]);
        
        headers.forEach((header, index) => {
          maxWidths[index] = Math.max(header.length + 6, 13);
        });

        formattedData.forEach((row) => {
          headers.forEach((header, index) => {
            const val = row[header] ? String(row[header]) : "";
            if (val.length + 4 > maxWidths[index]) {
              maxWidths[index] = val.length + 4;
            }
          });
        });

        worksheet['!cols'] = maxWidths.map(width => ({ wch: width }));
      }

      // 5. Khởi tạo Workbook, đóng gói tệp và xuất file
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_` +
                        `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const fileName = `${filePrefix}_${timestamp}.xlsx`;

      XLSX.writeFile(workbook, fileName);
      ElMessage.success(`Xuất file Excel Nhật Ký Hoạt Động thành công!`);
      return true;

    } catch (error) {
      console.error("Lỗi đóng gói giao diện Excel chuyên nghiệp:", error);
      ElMessage.error("Đã xảy ra lỗi trong quá trình kết xuất đồ họa tệp Excel.");
      return false;
    }
  };

  return {
    exportToExcelCustom
  };
};