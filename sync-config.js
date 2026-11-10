// Cấu hình đồng bộ qua Firebase (gói miễn phí Spark). Xem hướng dẫn trong README, mục "Bật đồng bộ".
// Để trống = tắt đồng bộ online (vẫn dùng được "Sao lưu bằng file").
// Web API key của Firebase là thông tin công khai theo thiết kế; dữ liệu được bảo vệ bằng Firestore Rules
// và giới hạn key theo tên miền trong Google Cloud Console.
const SYNC_CONFIG = {
  apiKey: "",
  projectId: "",
};
