// Quán ăn quanh Quận 7 cũ (khu Phú Mỹ Hưng, bán kính khoảng 5 km).
// Dữ liệu tổng hợp ngày 10/11/2026 từ Foody, trang của quán và các bài review.
// - rating: điểm do nguồn ghi, KHÔNG phải điểm Google hiện tại. Xem đánh giá mới nhất bằng nút Google Maps.
// - parking: "oto" = nguồn ghi có chỗ đậu ô tô; "xe" = có bãi giữ xe (chưa rõ ô tô); null = chưa có thông tin.
// - dishes: tên món khớp với data.js, để gợi ý quán theo món.
// Giờ mở cửa / giá có thể đã đổi — nên gọi hoặc xem Google Maps trước khi đi.

const PLACES = [
  // ---------- Bún mắm / Lẩu mắm ----------
  {
    name: "Bún Mắm Cẩm Tú", address: "1703A Huỳnh Tấn Phát, Quận 7",
    type: "Bún", dishes: ["Bún mắm"], hours: "08:00–21:00",
    rating: "Foody 8.0/10", note: "Quán lâu đời, vị bún mắm miền Nam.",
    parking: null, source: "https://www.foody.vn/ho-chi-minh/bun-mam-cam-tu/binh-luan-509006",
  },
  {
    name: "Bún Mắm Lẩu Mắm Cô Tư", address: "79 Phạm Hữu Lầu, P. Phú Mỹ, Quận 7",
    type: "Bún", dishes: ["Bún mắm", "Lẩu mắm"], hours: "09:00–22:00",
    rating: null, note: "Bún mắm và lẩu mắm.",
    parking: "xe", source: "https://www.foody.vn/ho-chi-minh/bun-mam-lau-mam-co-tu-bun-mam",
  },
  {
    name: "Lẩu Mắm Bà Diên", address: "45 Đường Số 4, P. Phú Mỹ, Quận 7",
    type: "Lẩu", dishes: ["Lẩu mắm"], hours: null,
    rating: null, note: "Món miền Nam, lẩu mắm.",
    parking: null, source: "https://www.foody.vn/ho-chi-minh/lau-mam-ba-dien-45-duong-so-4",
  },
  {
    name: "Lẩu Mắm Bà Dú (SC VivoCity)", address: "SC VivoCity, 1058 Nguyễn Văn Linh, Quận 7",
    type: "Lẩu", dishes: ["Lẩu mắm"], hours: "10:30–22:30",
    rating: null, note: "Trong trung tâm thương mại. Các nguồn ghi địa chỉ chưa thống nhất — nên gọi trước.",
    parking: "oto", source: "https://diadiem247.com/tp-ho-chi-minh/lau-mam-ba-du-sc-vivocity-quan-7-l117958.html",
  },

  // ---------- Phở ----------
  {
    name: "Phở Xích", address: "4-1A Đường P, Mỹ Cảnh, Phú Mỹ Hưng, Quận 7",
    type: "Phở", dishes: ["Phở gà", "Phở bò"], hours: "06:00–14:00, 17:00–21:00",
    rating: null, note: "Phở gà kiểu Hà Nội, sợi mỏng, nước dùng trong.",
    parking: null, source: "https://www.foody.vn/ho-chi-minh/pho-xich",
  },
  {
    name: "Phở SOL", address: "53 Nguyễn Đức Cảnh, Mỹ Khánh 4, Phú Mỹ Hưng, Quận 7",
    type: "Phở", dishes: ["Phở bò"], hours: null,
    rating: null, note: "Phở Hà Nội. Có thêm chi nhánh 01 Phố Tiểu Nam, Cảnh Viên 1.",
    parking: null, source: "https://phosol.vn/pho-ngon-quan-7-huong-vi-ha-noi-giua-long-phu-my-hung-tai-pho-sol/",
  },

  // ---------- Hủ tiếu ----------
  {
    name: "Minh Quán – Hủ Tiếu Nam Vang", address: "77 Hà Huy Tập, P. Tân Phong, Quận 7",
    type: "Bún", dishes: ["Hủ tiếu Nam Vang"], hours: null,
    rating: null, note: "Nước lèo trong, ngọt thanh; quán rộng, có khu ngoài trời. Khoảng 30–60k.",
    parking: null, source: "https://ghiensaigon.com/minh-quan-hu-tieu-nam-vang/",
  },
  {
    name: "Hòa – Hủ Tiếu Nam Vang", address: "87 Nguyễn Thị Thập, P. Tân Hưng, Quận 7",
    type: "Bún", dishes: ["Hủ tiếu Nam Vang"], hours: null,
    rating: "Foody 7.4/10 (chất lượng 9.0)", note: "Hủ tiếu khô thập cẩm.",
    parking: null, source: "https://www.foody.vn/ho-chi-minh/hoa-hu-tieu-nam-vang",
  },
  {
    name: "Hủ Tiếu Nam Vang Huỳnh Gia", address: "593 Trần Xuân Soạn, Quận 7",
    type: "Bún", dishes: ["Hủ tiếu Nam Vang"], hours: null,
    rating: "Foody 8.0/10", note: "Giá hợp lý, sạch sẽ, phần ăn nhiều.",
    parking: null, source: "https://www.foody.vn/ho-chi-minh/hu-tieu-nam-vang-huynh-gia",
  },

  // ---------- Bún riêu ----------
  {
    name: "Bún Riêu Cua Đồng – Cô Ba Nguyệt", address: "178/14 Nguyễn Văn Linh, P. Tân Thuận Tây, Quận 7",
    type: "Bún", dishes: ["Bún riêu cua"], hours: "07:00–21:00",
    rating: null, note: "Bún riêu cua đồng.",
    parking: null, source: "https://www.foody.vn/ho-chi-minh/bun-rieu-cua-dong-co-ba-nguyet",
  },
  {
    name: "Bún Riêu Cua Minh Châu", address: "142/47 Nguyễn Thị Thập, P. Bình Thuận, Quận 7",
    type: "Bún", dishes: ["Bún riêu cua"], hours: "07:00–21:00",
    rating: null, note: "Trong hẻm.",
    parking: null, source: "https://www.foody.vn/ho-chi-minh/bun-rieu-cua-minh-chau-nguyen-thi-thap",
  },
  {
    name: "165 – Quán Bún Riêu", address: "165 Đường Số 79, P. Tân Quy, Quận 7",
    type: "Bún", dishes: ["Bún riêu cua"], hours: null,
    rating: null, note: "Bình dân, khoảng 20–23k.",
    parking: null, source: "https://www.foody.vn/ho-chi-minh/165-quan-bun-rieu/thuc-don",
  },

  // ---------- Bánh mì / Bánh hỏi ----------
  {
    name: "Ghiền Món Việt – Bánh Hỏi & Heo Quay", address: "39/35 Bùi Văn Ba, P. Tân Thuận Đông, Quận 7",
    type: "Bánh", dishes: ["Bánh hỏi heo quay"], hours: null,
    rating: null, note: "Heo quay ba rọi rút sườn, bánh hỏi ăn kèm rau thơm.",
    parking: null, source: "https://www.foody.vn/ho-chi-minh/ghien-mon-viet-banh-hoi-heo-quay-bui-van-ba",
  },
  {
    name: "Xích Ký – Bánh Mì & Bánh Hỏi Heo Quay", address: "285 Lê Văn Lương, P. Tân Hưng, Quận 7",
    type: "Bánh", dishes: ["Bánh hỏi heo quay", "Bánh mì thịt"], hours: "05:00–10:00 (chỉ buổi sáng)",
    rating: null, note: "Bán buổi sáng.",
    parking: null, source: "https://www.foody.vn/ho-chi-minh/xich-ky-banh-mi-banh-hoi-heo-quay-le-van-luong",
  },
  {
    name: "Bánh Mì Bánh Hỏi Heo Quay Thị Nở", address: "1543 Huỳnh Tấn Phát, P. Phú Mỹ, Quận 7",
    type: "Bánh mì", dishes: ["Bánh mì thịt", "Bánh hỏi heo quay"], hours: null,
    rating: null, note: "Bánh mì heo quay.",
    parking: null, source: "https://bestbanhmivietnam.com/cities/ho-chi-minh-city/restaurants/ho-chi-minh-city-banh-mi-banh-hoi-heo-quay-thi-no",
  },
  {
    name: "Bánh Mì Ông Hưng", address: "458 Phạm Thái Bường, Quận 7",
    type: "Bánh mì", dishes: ["Bánh mì thịt"], hours: null,
    rating: null, note: "Thương hiệu có nhiều chi nhánh ở Quận 7.",
    parking: null, source: "https://mytour.vn/vi/blog/bai-viet/top-8-quan-banh-mi-ngon-nhat-quan-7-tp-hcm.html",
  },
  {
    name: "Bánh Mì Chảo Ngọc Xíu", address: "220 Lâm Văn Bền, Quận 7",
    type: "Bánh mì", dishes: ["Bánh mì chảo", "Hủ tiếu Nam Vang", "Bún riêu cua"], hours: null,
    rating: "Google 4.5/5 (~508 đánh giá, theo bài tổng hợp)", note: "Bánh mì chảo, hủ tiếu chảo, bún riêu chảo.",
    parking: null, source: "https://top10tphcm.com/top-quan-banh-mi-ngon-nhat-tai-quan-7-tphcm",
  },

  // ---------- Cơm ----------
  {
    name: "Cơm Tấm Phúc Lộc Thọ", address: "223 Nguyễn Thị Thập, Quận 7",
    type: "Cơm", dishes: ["Cơm tấm sườn bì chả"], hours: null,
    rating: null, note: "Hơn 15 năm, nổi bật sườn bì chả.",
    parking: null, source: "https://www.bachhoaxanh.com/kinh-nghiem-hay/10-quan-com-tam-quan-7-ngon-nuc-tieng-ma-ban-nen-thu-mot-lan-1401427",
  },
  {
    name: "Cơm Tấm Phạm Hữu Lầu", address: "86 Phạm Hữu Lầu, Quận 7",
    type: "Cơm", dishes: ["Cơm tấm sườn bì chả"], hours: null,
    rating: null, note: "Cơm tấm chuẩn vị, phục vụ nhanh.",
    parking: null, source: "https://ghiensaigon.com/com-tam-pham-huu-lau/",
  },
  {
    name: "Cơm Tấm Ngon", address: "3G Lâm Văn Bền, Quận 7",
    type: "Cơm", dishes: ["Cơm tấm sườn bì chả"], hours: null,
    rating: "Google 4.5/5 (theo bài tổng hợp)", note: "",
    parking: null, source: "https://tripi.vn/blog/vi/kinh-nghiem-hay/10-quan-com-tam-ngon-nuc-tieng-tai-quan-7-ban-nhat-dinh-phai-thu-tripi",
  },
  {
    name: "Cơm Niêu Cuội (Nam Quang 1)", address: "R1-40 Nam Quang 1, Phú Mỹ Hưng, Quận 7",
    type: "Cơm", dishes: ["Cơm niêu", "Cơm nhà: cá kho tộ + canh chua", "Cơm nhà: cá lóc kho + canh bí"], hours: "07:00–22:00",
    rating: null, note: "Cơm niêu cháy cạnh, món gia đình — hợp đi chung.",
    parking: "oto", source: "https://pasgo.vn/blog/com-nieu-cuoi-quan-com-gia-dinh-quan-7-5803",
  },
];

const PARKING_LABEL = { oto: "🚗 Có chỗ đậu ô tô", xe: "🅿️ Có bãi giữ xe" };
