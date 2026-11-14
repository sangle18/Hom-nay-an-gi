// vo / chong: 0 = không ăn, 1 = ăn được, 2 = thích
// meals: các bữa phù hợp — "sang", "trua", "toi"

const TYPES = ["Phở", "Bún", "Bánh mì", "Bánh", "Cơm", "Lẩu", "Fast food", "Khác"];

const TYPE_ICON = {
  "Phở": "🍜", "Bún": "🍲", "Bánh mì": "🥖", "Bánh": "🥞",
  "Cơm": "🍚", "Lẩu": "🫕", "Fast food": "🍔", "Khác": "🍽️",
};

const ALL = ["sang", "trua", "toi"];
const LUNCH_DINNER = ["trua", "toi"];

// Danh sách món của gia đình (mặc định)
const DEFAULT_DISHES = [
  { name: "Phở bò", icon: "🍜", type: "Phở", vo: 2, chong: 2, meals: ALL },
  { name: "Phở gà", icon: "🐔", type: "Phở", vo: 2, chong: 2, meals: ALL },

  { name: "Bún mắm", icon: "🐟", type: "Bún", vo: 2, chong: 1, meals: LUNCH_DINNER },
  { name: "Bún riêu cua", icon: "🦀", type: "Bún", vo: 2, chong: 1, meals: ["sang", "trua"] },
  { name: "Bún thịt nướng", icon: "🍢", type: "Bún", vo: 2, chong: 1, meals: ALL },
  { name: "Bún bò Huế", icon: "🌶️", type: "Bún", vo: 2, chong: 1, meals: ALL },
  { name: "Bún nước lèo", icon: "🍲", type: "Bún", vo: 2, chong: 1, meals: ["sang", "trua"] },
  { name: "Bún cá", icon: "🐠", type: "Bún", vo: 2, chong: 1, meals: ["sang", "trua"] },
  { name: "Hủ tiếu Nam Vang", icon: "🦐", type: "Bún", vo: 2, chong: 1, meals: ALL },

  { name: "Bánh mì thịt", icon: "🥖", type: "Bánh mì", vo: 2, chong: 1, meals: ["sang"] },
  { name: "Bánh mì chảo", icon: "🍳", type: "Bánh mì", vo: 2, chong: 1, meals: ["sang"] },
  { name: "Bánh mì xíu mại", icon: "🥪", type: "Bánh mì", vo: 2, chong: 1, meals: ["sang"] },
  { name: "Bánh hỏi heo quay", icon: "🐷", type: "Bánh", vo: 2, chong: 1, meals: ALL },
  { name: "Bánh xèo", icon: "🥞", type: "Bánh", vo: 2, chong: 1, meals: LUNCH_DINNER },
  { name: "Bánh canh cua", icon: "🦀", type: "Bánh", vo: 2, chong: 1, meals: ALL },
  { name: "Bánh cuốn", icon: "🌯", type: "Bánh", vo: 1, chong: 1, meals: ["sang"] },

  { name: "Cơm tấm sườn bì chả", icon: "🍖", type: "Cơm", vo: 1, chong: 2, meals: ALL },
  { name: "Cơm gà xối mỡ", icon: "🍗", type: "Cơm", vo: 1, chong: 2, meals: LUNCH_DINNER },
  { name: "Cơm chiên dương châu", icon: "🍛", type: "Cơm", vo: 1, chong: 2, meals: LUNCH_DINNER },
  { name: "Cơm nhà: cá kho tộ + canh chua", icon: "🍱", type: "Cơm", vo: 2, chong: 2, meals: LUNCH_DINNER },
  { name: "Cơm nhà: thịt kho trứng + canh rau", icon: "🥚", type: "Cơm", vo: 1, chong: 2, meals: LUNCH_DINNER },
  { name: "Cơm sườn ram mặn", icon: "🍚", type: "Cơm", vo: 1, chong: 2, meals: LUNCH_DINNER },

  { name: "Lẩu mắm", icon: "🫕", type: "Lẩu", vo: 2, chong: 1, meals: ["toi"] },
  { name: "Lẩu cá kèo", icon: "🍲", type: "Lẩu", vo: 2, chong: 1, meals: ["toi"] },

  { name: "Gà rán", icon: "🍗", type: "Fast food", vo: 0, chong: 2, meals: LUNCH_DINNER },
  { name: "Burger", icon: "🍔", type: "Fast food", vo: 0, chong: 2, meals: LUNCH_DINNER },
  { name: "Pizza", icon: "🍕", type: "Fast food", vo: 0, chong: 1, meals: LUNCH_DINNER },

  // Thêm ngày 14/11/2026 (v: 2) — app tự thêm các món này vào máy đã có dữ liệu cũ
  { v: 2, name: "Mì sủi cảo", icon: "🥟", type: "Bún", vo: 2, chong: 1, meals: ALL },
  { v: 2, name: "Hủ tiếu chay", icon: "🥬", type: "Bún", vo: 1, chong: 1, meals: ALL },
  { v: 2, name: "Bún mọc", icon: "🍲", type: "Bún", vo: 2, chong: 1, meals: ["sang", "trua"] },
  { v: 2, name: "Xôi", icon: "🍙", type: "Khác", vo: 1, chong: 1, meals: ["sang"] },
  { v: 2, name: "Hủ tiếu gà", icon: "🐔", type: "Bún", vo: 2, chong: 1, meals: ALL },
  { v: 2, name: "Bún cá thác lác", icon: "🐟", type: "Bún", vo: 2, chong: 1, meals: ["sang", "trua"] },
  { v: 2, name: "Bò né", icon: "🍳", type: "Bánh mì", vo: 2, chong: 2, meals: ["sang"] },
  { v: 2, name: "Bò kho", icon: "🥘", type: "Bánh mì", vo: 2, chong: 2, meals: ["sang", "trua"] },
  { v: 2, name: "Hủ tiếu Cô 9", icon: "🍜", type: "Bún", vo: 2, chong: 1, meals: ALL },
];

// Phiên bản danh sách món mặc định — tăng khi thêm món mới (đánh dấu món bằng v: <số>)
const DEFAULTS_VERSION = 2;

// Kho món "mới" — dùng cho nút "Gợi ý món khác" (chưa có trong danh sách)
const EXTRA_DISHES = [
  { name: "Hủ tiếu Mỹ Tho", icon: "🍜", type: "Bún", vo: 2, chong: 1, meals: ALL, desc: "Sợi hủ tiếu dai, nước lèo ngọt xương, tôm thịt." },
  { name: "Bánh canh ghẹ", icon: "🦀", type: "Bánh", vo: 2, chong: 1, meals: ALL, desc: "Nước dùng sệt, ghẹ nguyên con chắc thịt." },
  { name: "Cháo lòng", icon: "🥣", type: "Khác", vo: 1, chong: 1, meals: ["sang", "toi"], desc: "Cháo nóng với lòng heo, dồi, giá, hành phi." },
  { name: "Cháo cá lóc rau đắng", icon: "🐟", type: "Khác", vo: 2, chong: 1, meals: ["sang", "toi"], desc: "Món miền Tây thanh mát, rau đắng chấm nước mắm." },
  { name: "Gỏi cuốn", icon: "🥬", type: "Khác", vo: 2, chong: 1, meals: LUNCH_DINNER, desc: "Tôm thịt cuốn bánh tráng, chấm tương đậu." },
  { name: "Bánh khọt", icon: "🥟", type: "Bánh", vo: 2, chong: 1, meals: ["sang", "toi"], desc: "Bánh nhỏ giòn rụm, tôm tươi, ăn kèm rau sống." },
  { name: "Bánh tằm bì", icon: "🍝", type: "Bánh", vo: 2, chong: 1, meals: ["sang", "trua"], desc: "Đặc sản Bạc Liêu, nước cốt dừa béo ngậy." },
  { name: "Bánh ướt chả lụa", icon: "🌯", type: "Bánh", vo: 2, chong: 1, meals: ["sang"], desc: "Bánh mềm mỏng, chả lụa, nước mắm chua ngọt." },
  { name: "Bánh bèo chén", icon: "🥢", type: "Bánh", vo: 2, chong: 1, meals: ["sang", "trua"], desc: "Bánh bèo tôm chấy, mỡ hành, nước mắm." },
  { name: "Bún chả Hà Nội", icon: "🍢", type: "Bún", vo: 2, chong: 1, meals: LUNCH_DINNER, desc: "Chả nướng than hoa, nước chấm chua ngọt." },
  { name: "Bún đậu mắm tôm", icon: "🧆", type: "Bún", vo: 1, chong: 1, meals: LUNCH_DINNER, desc: "Đậu rán giòn, chả cốm, thịt luộc, mắm tôm." },
  { name: "Mì Quảng", icon: "🍜", type: "Bún", vo: 2, chong: 1, meals: ALL, desc: "Sợi mì vàng, ít nước, tôm thịt, bánh tráng mè." },
  { name: "Bún cá rô đồng", icon: "🐟", type: "Bún", vo: 2, chong: 1, meals: ["sang", "trua"], desc: "Cá rô chiên giòn, nước dùng chua nhẹ." },
  { name: "Cơm chiên cá mặn", icon: "🍛", type: "Cơm", vo: 1, chong: 2, meals: LUNCH_DINNER, desc: "Cơm chiên tơi, cá mặn thơm, hành lá." },
  { name: "Cơm gà Hải Nam", icon: "🍗", type: "Cơm", vo: 1, chong: 2, meals: LUNCH_DINNER, desc: "Gà luộc mềm, cơm nấu nước gà, gừng tỏi." },
  { name: "Cơm bò lúc lắc", icon: "🥩", type: "Cơm", vo: 1, chong: 2, meals: LUNCH_DINNER, desc: "Bò xào tiêu đen, khoai tây, salad." },
  { name: "Cơm niêu", icon: "🍚", type: "Cơm", vo: 1, chong: 2, meals: LUNCH_DINNER, desc: "Cơm cháy giòn, ăn kèm cá kho, canh chua." },
  { name: "Cơm nhà: cá lóc kho + canh bí", icon: "🍱", type: "Cơm", vo: 2, chong: 2, meals: LUNCH_DINNER, desc: "Bữa cơm nhà kiểu miền Tây." },
  { name: "Cơm nhà: gà kho gừng + rau luộc", icon: "🍱", type: "Cơm", vo: 1, chong: 2, meals: LUNCH_DINNER, desc: "Ấm bụng, dễ nấu, đưa cơm." },
  { name: "Cá lóc nướng trui", icon: "🔥", type: "Khác", vo: 2, chong: 2, meals: ["toi"], desc: "Cá nướng rơm, cuốn bánh tráng rau sống." },
  { name: "Bò lá lốt", icon: "🌿", type: "Khác", vo: 2, chong: 2, meals: LUNCH_DINNER, desc: "Bò cuốn lá lốt nướng, ăn kèm bún." },
  { name: "Ốc các loại", icon: "🐚", type: "Khác", vo: 2, chong: 1, meals: ["toi"], desc: "Ốc hương xào bơ, ốc len xào dừa…" },
  { name: "Lẩu Thái", icon: "🌶️", type: "Lẩu", vo: 2, chong: 2, meals: ["toi"], desc: "Chua cay, hải sản, ăn kèm bún." },
  { name: "Lẩu gà lá é", icon: "🐔", type: "Lẩu", vo: 2, chong: 2, meals: ["toi"], desc: "Thơm lá é, gà ta dai ngọt." },
  { name: "Lẩu bò", icon: "🐂", type: "Lẩu", vo: 1, chong: 2, meals: ["toi"], desc: "Bò nhúng, gân, bò viên, nước dùng đậm." },
  { name: "Mì xào giòn hải sản", icon: "🍤", type: "Khác", vo: 1, chong: 2, meals: LUNCH_DINNER, desc: "Mì chiên giòn, sốt hải sản rau củ." },
  { name: "Bò bít tết", icon: "🥩", type: "Khác", vo: 1, chong: 2, meals: ["sang", "toi"], desc: "Chảo gang, trứng ốp la, pate, bánh mì." },
  { name: "Gà nướng muối ớt", icon: "🍗", type: "Khác", vo: 1, chong: 2, meals: ["toi"], desc: "Da giòn, cay mặn, chấm muối tiêu chanh." },
  { name: "Mì cay", icon: "🍜", type: "Fast food", vo: 0, chong: 2, meals: LUNCH_DINNER, desc: "Mì cay Hàn Quốc nhiều cấp độ." },
  { name: "Gà rán sốt cay Hàn", icon: "🍗", type: "Fast food", vo: 0, chong: 2, meals: LUNCH_DINNER, desc: "Gà giòn phủ sốt cay ngọt." },
  { name: "Hotdog", icon: "🌭", type: "Fast food", vo: 0, chong: 1, meals: LUNCH_DINNER, desc: "Nhanh gọn cho bữa vội." },
];
