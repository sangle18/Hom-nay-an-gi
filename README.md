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
- **📍 Quán ăn:** 35 quán được đánh giá tốt trên Google trong 8 km — bún mắm, lẩu mắm, phở, hủ tiếu, bún riêu, bánh canh cua, bánh mì, bánh hỏi heo quay, bánh xèo, cơm tấm, cơm niêu. Lọc theo loại món, tìm theo tên/đường, lọc **bán kính 3 / 5 / 8 km**. Mỗi quán có nút 🗺️ *Chỉ đường*, ⭐ *Đánh giá* (mở Google Maps) và 📰 *Nguồn*.
  - **Khoảng cách từ nhà:** đặt "khu nhà" bằng 📍 *Định vị* hoặc ✏️ *Nhập* (link Google Maps bản đầy đủ / toạ độ). Quán được xếp từ gần đến xa, ghi "~2.7 km" (đường chim bay).
  - Sau khi quay ra món, app gợi ý luôn 2–3 quán gần nhất bán món đó (bỏ quán xa hơn 8 km).
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
- Quán ăn: [`places.js`](places.js). Trường `dishes` phải trùng tên món trong `data.js` để gợi ý quán theo món; `g` là ⭐/lượt đánh giá Google; `parking: "oto"` chỉ đặt khi có nguồn xác nhận; `lat`/`lng` lấy từ đúng trang quán trên Google Maps.
- Mỗi lần cập nhật code, tăng `VERSION` trong [`sw.js`](sw.js) để điện thoại tải bản mới.

## Về dữ liệu quán ăn
- **35 quán trong bán kính 8 km** quanh khu nhà (Quận 7, Quận 4, Quận 1, Quận 3, Quận 5, Quận 10), kiểm tra trực tiếp trên Google Maps ngày 10/11/2026.
- **Tiêu chí giữ quán:** đang mở cửa · ⭐ ≥ 4.0 và ≥ 100 lượt đánh giá Google (quán mới thêm: ⭐ ≥ 4.2 và ≥ 150). Bỏ quán 4.9–5.0⭐ mà quá ít đánh giá (dễ là đánh giá ảo).
- Lần kiểm tra này đã **loại 22 quán** của bản trước: 5 quán đã đóng cửa vĩnh viễn (Lẩu Mắm Bà Dú, Tiệm ăn Bà Diên, Bánh Mì Chảo Ngọc Xíu, Lẩu Mắm Cô 7 Bạc Liêu, Bánh Canh Bến Có), quán chưa có hoặc quá ít đánh giá, quán dưới 4.0⭐, và quán không tìm thấy trên Google Maps.
- App hiện **⭐ số sao · số lượt đánh giá** của Google tại ngày kiểm tra. Con số này thay đổi theo thời gian — bấm ⭐ *Đánh giá* để xem bản mới nhất.
- Toạ độ lấy từ đúng trang quán trên Google Maps; khoảng cách là đường chim bay.
- **Vị trí nhà không nằm trong code** (repo và trang web là công khai). Nó chỉ lưu trên từng điện thoại, làm tròn ~100 m, không đồng bộ lên mây.
- Chưa có quán nào được nguồn xác nhận chỗ đậu ô tô, nên bộ lọc 🚗 tạm ẩn.

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
