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
- **📍 Quán ăn:** 21 quán quanh Quận 7 cũ (~5 km quanh Phú Mỹ Hưng) — bún mắm, lẩu mắm, phở, hủ tiếu, bún riêu, bánh mì, bánh hỏi heo quay, cơm tấm, cơm niêu. Lọc theo loại món, tìm theo tên/đường, lọc **quán có chỗ đậu ô tô**. Mỗi quán có nút 🗺️ *Chỉ đường* và ⭐ *Đánh giá* (mở Google Maps) và 📰 *Nguồn*.
  - Sau khi quay ra món, app gợi ý luôn 2–3 quán bán món đó.
- **🔄 Đồng bộ 2 điện thoại** qua Firebase (miễn phí), hoặc **sao lưu bằng file** (không cần tài khoản).
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
- Quán ăn: [`places.js`](places.js). Trường `dishes` phải trùng tên món trong `data.js` để gợi ý quán theo món; `parking: "oto"` chỉ đặt khi có nguồn xác nhận.
- Mỗi lần cập nhật code, tăng `VERSION` trong [`sw.js`](sw.js) để điện thoại tải bản mới.

## Về dữ liệu quán ăn
- Tổng hợp ngày 10/11/2026 từ Foody, trang của quán và các bài review. Chỉ giữ quán có địa chỉ rõ ràng; bỏ những quán mà các nguồn ghi địa chỉ khác nhau.
- **Điểm số** (Foody x/10, Google x/5) là con số nguồn đã ghi — **không phải điểm Google hiện tại**. Bấm ⭐ *Đánh giá* để đọc review thật, mới nhất trên Google Maps.
- Link Google Maps tạo từ *tên + địa chỉ* (không dùng toạ độ đoán), nên luôn mở đúng nơi Google tìm thấy.
- Chỗ đậu ô tô: chỉ 2 quán có nguồn xác nhận (Lẩu Mắm Bà Dú – SC VivoCity, Cơm Niêu Cuội). Các quán khác ghi "Chưa rõ".
- Từ 7/2025 TP.HCM bỏ cấp quận; địa chỉ vẫn ghi "Quận 7" cho dễ nhận, Google Maps vẫn hiểu.

## Bật đồng bộ online (Firebase, miễn phí)
Làm **1 lần** bởi chủ repo (khoảng 10 phút):
1. Vào https://console.firebase.google.com → **Add project** (tắt Google Analytics cho gọn).
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
3. **Build → Firestore Database → Create database** → chọn vùng `asia-southeast1` → *Production mode*.
4. Tab **Rules** của Firestore → dán nội dung file [`firestore.rules`](firestore.rules) → **Publish**.
5. **Project settings (⚙️) → General → Your apps → Web (`</>`)** → đặt tên → lấy `apiKey` và `projectId`, điền vào [`sync-config.js`](sync-config.js) → commit & push.
6. (Nên làm) Google Cloud Console → **APIs & Services → Credentials** → chọn API key → *Application restrictions: Websites* → thêm `https://sangle18.github.io/*` và `http://localhost:5173/*`.

Dùng trên điện thoại: bấm nút 🔄 góc trên → **Tạo mã gia đình mới** trên máy 1 → **Chép** mã → máy 2 nhập mã → **Kết nối**. Từ đó mọi thay đổi tự đồng bộ (vài giây sau khi sửa, khi mở app, và mỗi 2 phút).

Cách gộp khi 2 máy cùng sửa: món ăn lấy bản sửa sau; món đã xoá không bị "sống lại"; lịch sử đã ăn gộp cả hai; thực đơn lấy bản tạo/sửa sau. Ghi có điều kiện (`updateTime`), nên hai máy ghi cùng lúc cũng không mất dữ liệu.

## Bảo mật
- Trang tĩnh, không có server riêng. Khi **chưa** bật đồng bộ, dữ liệu chỉ nằm trong localStorage của từng máy.
- **Content-Security-Policy** chỉ cho chạy script của chính trang (chặn script chèn vào và script từ ngoài), chỉ tải font từ Google Fonts, chỉ gọi mạng tới 3 domain của Firebase (`identitytoolkit`, `securetoken`, `firestore.googleapis.com`). Không dùng SDK Firebase.
- Đồng bộ: đăng nhập **ẩn danh**; dữ liệu nằm ở `households/<mã 24 ký tự ngẫu nhiên ~120 bit>`. [`firestore.rules`](firestore.rules) chỉ cho *get* đúng mã (cấm *list* nên không ai dò được mã nhà khác), chỉ cho 2 trường, giới hạn < 900 KB, cấm xoá. **Ai có mã là đọc/sửa được** — đừng gửi mã cho người ngoài.
- Dữ liệu kéo từ mây hoặc từ file sao lưu đều đi qua bước làm sạch như dữ liệu localStorage.
- Link quán chỉ nhận `https://`, mở tab mới với `rel="noopener noreferrer"`.
- Không dùng `innerHTML` với dữ liệu người dùng — mọi text đi qua `textContent`, nên tên món chứa mã HTML/JS chỉ hiện ra như chữ thường.
- Dữ liệu đọc từ localStorage được kiểm tra/làm sạch (giới hạn độ dài, kiểu, giá trị hợp lệ) trước khi dùng.
- `Referrer-Policy: no-referrer`; service worker chỉ cache file cùng nguồn.
- Giới hạn: GitHub Pages không cho đặt HTTP header, nên không có `frame-ancestors`/`X-Frame-Options` (trang có thể bị nhúng iframe). Rủi ro thấp vì app không có thao tác nhạy cảm.
