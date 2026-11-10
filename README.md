# 🍜 Hôm nay ăn gì?

Web app (PWA) giúp 2 vợ chồng chọn món mỗi bữa. Không cần server, không cần build, **chi phí 0đ**.

## Tính năng
- **Hôm nay:** chọn *ai ăn* (Cả hai / Vợ / Chồng), *bữa* (tự đoán theo giờ), lọc loại món → quay số chọn món, có icon cho từng món.
  - "Cả hai" chỉ ra món **cả hai đều ăn được** → không bao giờ ra Fast food.
  - Món ❤️ được ưu tiên hơn món 🙂; tránh lặp món đã chốt trong 3 ngày.
- **✨ Gợi ý món khác:** đề xuất món *ngoài danh sách* (kho ~30 món Nam/miền Tây/Bắc), có mô tả; bấm "Thêm món" để đưa vào danh sách.
- **Thực đơn:** lên thực đơn theo **Ngày / Tuần / Tháng / Năm** (3 bữa/ngày). Không trùng món trong ngày, hạn chế lặp trong 3 ngày, ưu tiên đổi loại món. Chạm vào một bữa để đổi riêng món đó.
- **Danh sách:** thêm / xoá món, chỉnh mức thích của từng người.
- **Đã ăn:** lịch sử + thống kê 30 ngày.
- Cài lên màn hình điện thoại như app thật, dùng được offline, hỗ trợ dark mode.

## Chạy thử trên máy
```bash
python3 -m http.server 5173
```
Mở http://localhost:5173

## Đưa lên mạng miễn phí (GitHub Pages)
1. Push code lên repo `sangle18/Hom-nay-an-gi`.
2. **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, thư mục `/ (root)` → Save.
3. Bật **Enforce HTTPS** (mặc định đã bật).
4. Sau ~1 phút app có ở: https://sangle18.github.io/Hom-nay-an-gi/

## Cài lên điện thoại
- **iPhone (Safari):** mở link → nút Chia sẻ → *Thêm vào MH chính*.
- **Android (Chrome):** mở link → menu ⋮ → *Cài đặt ứng dụng*.

## Sửa dữ liệu
- Món mặc định: `DEFAULT_DISHES` trong [`data.js`](data.js). Kho món gợi ý: `EXTRA_DISHES`.
- Mỗi lần cập nhật code, tăng `VERSION` trong [`sw.js`](sw.js) để điện thoại tải bản mới.

## Bảo mật
- Trang tĩnh: không có server, không đăng nhập, không gửi dữ liệu đi đâu. Dữ liệu chỉ nằm trong localStorage của từng máy.
- **Content-Security-Policy** chỉ cho chạy script của chính trang (chặn script chèn vào và script từ ngoài); chỉ cho tải font từ Google Fonts.
- Không dùng `innerHTML` với dữ liệu người dùng — mọi text đi qua `textContent`, nên tên món chứa mã HTML/JS chỉ hiện ra như chữ thường.
- Dữ liệu đọc từ localStorage được kiểm tra/làm sạch (giới hạn độ dài, kiểu, giá trị hợp lệ) trước khi dùng.
- `Referrer-Policy: no-referrer`; service worker chỉ cache file cùng nguồn.
- Giới hạn: GitHub Pages không cho đặt HTTP header, nên không có `frame-ancestors`/`X-Frame-Options` (trang có thể bị nhúng iframe). Rủi ro thấp vì app không có thao tác nhạy cảm.
- Dữ liệu chưa đồng bộ giữa 2 điện thoại.
