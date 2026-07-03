<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\HocVienController;
use App\Http\Controllers\KhoaHocController;
use App\Http\Controllers\KhoaHocDaoTaoController;
use App\Http\Controllers\LopHocController;
use App\Http\Controllers\LichHocController;
use App\Http\Controllers\ThiController;
use App\Http\Controllers\HocPhiController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\DangKyController;
use App\Http\Controllers\CapBangController;
use App\Http\Controllers\GiangVienController;

use App\Http\Controllers\XeController;
use App\Http\Controllers\LienHeController;
use App\Http\Controllers\BaiThiController;
// ═══════════════════════════════════════════════════════

// Đăng nhập học viên (CCCD + ngày sinh)
Route::post('/auth/login',       [AuthController::class, 'loginHocVien']);

// Đăng nhập admin/giảng viên (email + password)
Route::post('/admin/login',      [AuthController::class, 'adminLogin']);

// Khóa học public (trang quảng bá)
Route::get('/khoa-hoc',          [KhoaHocController::class, 'publicIndex']);

// Đăng ký tư vấn từ trang quảng bá (tạo hồ sơ online)
Route::post('/dang-ky-tu-van',   [DangKyController::class, 'dangKyTuVan']);

// Liên hệ từ trang quảng bá (public)
Route::post('/lien-he',          [LienHeController::class, 'store']);

// ═══════════════════════════════════════════════════════
// HỌC VIÊN (cần đăng nhập)
// ═══════════════════════════════════════════════════════
Route::middleware('auth.jwt')->group(function () {
    Route::get('/auth/me',                  [AuthController::class, 'me']);
    Route::post('/auth/doi-mat-khau',       [AuthController::class, 'doiMatKhau']);

    // Hồ sơ & tiến độ
    Route::get('/hoc-vien/profile',         [HocVienController::class, 'profile']);
    Route::put('/hoc-vien/profile',         [HocVienController::class, 'updateProfile']);
    Route::get('/hoc-vien/summary',         [HocVienController::class, 'summary']);
    Route::get('/hoc-vien/lich-hoc',        [HocVienController::class, 'myLichHoc']);
    Route::get('/hoc-vien/tien-do',         [HocVienController::class, 'tienDo']);
    Route::get('/hoc-vien/giang-vien',      [HocVienController::class, 'myGiangVien']);

    // Kết quả thi & chứng chỉ
    Route::get('/thi/ket-qua/my',           [ThiController::class, 'myKetQua']);
    Route::get('/thi/chung-chi/my',         [ThiController::class, 'myChungChi']);

    // Học phí
    Route::get('/hoc-phi/my',               [HocPhiController::class, 'myHocPhi']);
});

// ═══════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════
Route::middleware(['auth.jwt', 'role:admin|giang_vien'])->prefix('admin')->group(function () {

    // Dashboard
    Route::get('/dashboard',                [AdminController::class, 'dashboard']);
    Route::get('/dashboard-extra',          [AdminController::class, 'dashboardExtra']);
    Route::get('/chart-ket-qua-thi',        [AdminController::class, 'chartKetQuaThi']);
    Route::get('/hoat-dong-gan-day',        [AdminController::class, 'hoatDongGanDay']);
    Route::get('/chart-doanh-thu',          [AdminController::class, 'chartDoanhThu']);
    Route::get('/chart-hoc-vien',           [AdminController::class, 'chartHocVien']);

    // ── Hồ sơ học viên ──────────────────────────────────────────────────────
    Route::get('/ho-so',                    [AdminController::class, 'hoSoList']);
    Route::get('/ho-so/{id}',               [AdminController::class, 'hoSoDetail']);
    Route::post('/ho-so',                   [AdminController::class, 'taoHoSoOffline']);
    Route::post('/ho-so/{id}/anh-the',      [AdminController::class, 'uploadAnhThe']);
    Route::put('/ho-so/{id}',               [AdminController::class, 'capNhatHoSo']);
    Route::post('/ho-so/{id}/update',       [AdminController::class, 'capNhatHoSo']);  // FormData fallback
    Route::delete('/ho-so/{id}',            [AdminController::class, 'xoaHoSo']);
    Route::patch('/ho-so/{id}/trang-thai',  [AdminController::class, 'capNhatTrangThai']);

    // Ghi nhận học phí
    Route::post('/ho-so/{id}/hoc-phi',      [AdminController::class, 'ghiNhanHocPhi']);

    // Tạo tài khoản học viên (sau khi đóng học phí)
    Route::post('/ho-so/{id}/tao-tai-khoan',        [AdminController::class, 'taoTaiKhoanHocVien']);

    // Xếp lớp + tạo tài khoản cùng lúc
    Route::post('/ho-so/{id}/xep-lop',              [AdminController::class, 'xepLopVaTaoTaiKhoan']);

    // Trigger thủ công khai giảng (đồng bộ trạng thái lớp + học viên)
    Route::post('/lop-hoc/khai-giang',              [AdminController::class, 'triggerKhaiGiang']);

    // ── Khóa học (loại bằng lái - dùng cho trang BangLai) ──────────────────
    Route::get('/khoa-hoc',                 [KhoaHocController::class, 'index']);
    Route::get('/khoa-hoc/{id}',            [KhoaHocController::class, 'show']);
    Route::post('/khoa-hoc',                [KhoaHocController::class, 'store']);
    Route::post('/khoa-hoc/{id}/update',    [KhoaHocController::class, 'update']); // FormData fallback
    Route::put('/khoa-hoc/{id}',            [KhoaHocController::class, 'update']);
    Route::delete('/khoa-hoc/{id}',         [KhoaHocController::class, 'destroy']);

    // ── Khóa học đào tạo (theo tháng/năm) ───────────────────────────────────
    Route::get('/khoa-hoc-dao-tao',                             [KhoaHocDaoTaoController::class, 'index']);
    Route::post('/khoa-hoc-dao-tao',                            [KhoaHocDaoTaoController::class, 'store']);
    Route::get('/khoa-hoc-dao-tao/{id}',                        [KhoaHocDaoTaoController::class, 'show']);
    Route::put('/khoa-hoc-dao-tao/{id}',                        [KhoaHocDaoTaoController::class, 'update']);
    Route::delete('/khoa-hoc-dao-tao/{id}',                     [KhoaHocDaoTaoController::class, 'destroy']);
    // Lớp học trong khóa đào tạo
    Route::post('/khoa-hoc-dao-tao/{khoaId}/lop',               [KhoaHocDaoTaoController::class, 'storeLop']);
    Route::put('/lop-hoc-dao-tao/{lopId}',                      [KhoaHocDaoTaoController::class, 'updateLop']);
    Route::delete('/lop-hoc-dao-tao/{lopId}',                   [KhoaHocDaoTaoController::class, 'destroyLop']);
    // Phân học viên & xe
    Route::post('/lop-hoc-dao-tao/{lopId}/phan-hoc-vien',       [KhoaHocDaoTaoController::class, 'phanHocVien']);
    Route::post('/lop-hoc-dao-tao/{lopId}/phan-xe',             [KhoaHocDaoTaoController::class, 'phanXe']);
    // Học viên chờ mở lớp (lọc theo hạng bằng)
    Route::get('/hoc-vien-cho-mo-lop',                          [KhoaHocDaoTaoController::class, 'hocVienChoMoLop']);

    // ── Lớp học ─────────────────────────────────────────────────────────────
    Route::get('/lop-hoc',                  [LopHocController::class, 'index']);
    Route::get('/lop-hoc/{id}',             [LopHocController::class, 'show']);
    Route::post('/lop-hoc',                 [LopHocController::class, 'store']);
    Route::put('/lop-hoc/{id}',             [LopHocController::class, 'update']);
    Route::delete('/lop-hoc/{id}',          [LopHocController::class, 'destroy']);
    Route::post('/lop-hoc/{id}/dong-bo',    [LopHocController::class, 'dongBoTrangThai']);
    Route::delete('/lop-hoc/{lopId}/hoc-vien/{hoSoId}', [LopHocController::class, 'xoaHocVienKhoiLop']);

    // ── Lịch học ────────────────────────────────────────────────────────────
    Route::get('/lich-hoc',                 [LichHocController::class, 'index']);
    Route::post('/lich-hoc',                [LichHocController::class, 'store']);
    Route::put('/lich-hoc/{id}',            [LichHocController::class, 'update']);
    Route::delete('/lich-hoc/{id}',         [LichHocController::class, 'destroy']);
    Route::get('/lich-hoc/{id}/diem-danh',  [LichHocController::class, 'getDiemDanh']);
    Route::post('/lich-hoc/{id}/diem-danh', [LichHocController::class, 'diemDanh']);

    // ── Thi ─────────────────────────────────────────────────────────────────
    Route::get('/lich-thi',                                     [ThiController::class, 'indexLichThi']);
    Route::post('/lich-thi',                                    [ThiController::class, 'storeLichThi']);
    Route::put('/lich-thi/{id}',                                [ThiController::class, 'updateLichThi']);
    Route::delete('/lich-thi/{id}',                             [ThiController::class, 'destroyLichThi']);
    Route::post('/lich-thi/{id}/ket-qua',                       [ThiController::class, 'nhapKetQua']);
    Route::get('/lich-thi/{id}/hoc-vien-du-dieu-kien',          [ThiController::class, 'hocVienDuDieuKien']);
    Route::post('/lich-thi/{id}/them-hoc-vien',                 [ThiController::class, 'themHocVienVaoLich']);
    Route::delete('/lich-thi/{id}/hoc-vien/{hoSoId}',           [ThiController::class, 'xoaHocVienKhoiLich']);
    Route::post('/chung-chi',                                   [ThiController::class, 'capChungChi']);

    // ── Bài thi (cấu hình điểm đạt, điểm tối đa theo hạng bằng) ────────────
    Route::get('/bai-thi',                                      [BaiThiController::class, 'index']);
    Route::get('/bai-thi/by-loai-bang',                         [BaiThiController::class, 'byLoaiBang']);
    Route::post('/bai-thi',                                     [BaiThiController::class, 'store']);
    Route::put('/bai-thi/{id}',                                 [BaiThiController::class, 'update']);
    Route::delete('/bai-thi/{id}',                              [BaiThiController::class, 'destroy']);    // ── Học phí ─────────────────────────────────────────────────────────────
    Route::get('/hoc-phi',                         [HocPhiController::class, 'index']);
    Route::delete('/hoc-phi/{id}',                 [HocPhiController::class, 'destroy']);
    Route::get('/phi-thi-lai',                     [AdminController::class, 'danhSachPhiThiLai']);
    Route::get('/ho-so/{id}/phi-thi-lai-chua-thu', [AdminController::class, 'phiThiLaiChuaThu']);
    Route::post('/ho-so/{id}/phi-thi-lai',         [AdminController::class, 'thuPhiThiLai']);

    // ── Giảng viên ──────────────────────────────────────────────────────────
    Route::get('/giang-vien',               [AdminController::class, 'giangVienList']);
    Route::post('/giang-vien',              [AdminController::class, 'taoGiangVien']);
    Route::put('/giang-vien/{id}',          [AdminController::class, 'capNhatGiangVien']);
    Route::delete('/giang-vien/{id}',       [AdminController::class, 'xoaGiangVien']);
    Route::patch('/giang-vien/{id}/trang-thai', [AdminController::class, 'capNhatTrangThaiGiangVien']);
    Route::patch('/users/{id}/toggle',      [AdminController::class, 'toggleUser']);

    // ── Xe ──────────────────────────────────────────────────────────────────
    Route::get('/xe',                       [XeController::class, 'index']);
    Route::get('/xe/san-sang',              [XeController::class, 'xeSanSang']);
    Route::get('/xe/ban-trong-khung-gio',   [XeController::class, 'xeBanTrongKhungGio']);
    Route::post('/xe/sync-km',              [XeController::class, 'syncKmXe']);
    Route::get('/xe/{id}',                  [XeController::class, 'show']);
    Route::post('/xe',                      [XeController::class, 'store']);
    Route::put('/xe/{id}',                  [XeController::class, 'update']);
    Route::delete('/xe/{id}',               [XeController::class, 'destroy']);
    Route::patch('/xe/{id}/trang-thai',     [XeController::class, 'capNhatTrangThai']);
    Route::patch('/xe/{id}/km',             [XeController::class, 'capNhatKm']);
    Route::patch('/lich-hoc/{id}/phan-xe',  [XeController::class, 'phanXeChoLichHoc']);

    // ── Cấp bằng ────────────────────────────────────────────────────────────
    Route::get('/cap-bang/tot-nghiep',             [CapBangController::class, 'danhSachCapBangTN']);
    Route::post('/cap-bang/tot-nghiep/{id}',       [CapBangController::class, 'capBangTN']);
    Route::delete('/cap-bang/tot-nghiep/{id}',     [CapBangController::class, 'huyCBangTN']);
    Route::get('/cap-bang/bang-lai',               [CapBangController::class, 'danhSachCapBangLX']);
    Route::post('/cap-bang/bang-lai/{id}',         [CapBangController::class, 'capBangLX']);
    Route::delete('/cap-bang/bang-lai/{id}',       [CapBangController::class, 'huyCBangLX']);

    // ── Báo lỗi xe (admin xem & xử lý) ─────────────────────────────────────
    Route::get('/bao-loi-xe',               [XeController::class, 'danhSachBaoLoi']);
    Route::patch('/bao-loi-xe/{id}/xu-ly',  [XeController::class, 'xuLyBaoLoi']);

    // ── Liên hệ ─────────────────────────────────────────────────────────────
    Route::get('/lien-he',                  [LienHeController::class, 'index']);
    Route::patch('/lien-he/{id}/xu-ly',     [LienHeController::class, 'xuLy']);
    Route::delete('/lien-he/{id}',          [LienHeController::class, 'destroy']);

    // ── AI Analytics — Thống kê linh hoạt ───────────────────────────────────
    Route::get('/ai/doanh-thu',             [AdminController::class, 'aiDoanhThuTheoKhoang']);
    Route::get('/ai/hoc-vien',              [AdminController::class, 'aiHocVienTheoKhoang']);
    Route::get('/ai/lich-day-giang-vien',   [AdminController::class, 'aiLichDayGiangVien']);
    Route::get('/ai/goi-y-lich-day',        [AdminController::class, 'aiGoiYLichDay']);
});

// ═══════════════════════════════════════════════════════
// GIẢNG VIÊN
// ═══════════════════════════════════════════════════════
Route::middleware(['auth.jwt', 'role:giang_vien'])->prefix('giang-vien')->group(function () {
    Route::get('/thong-tin',                [GiangVienController::class, 'thongTin']);
    Route::get('/lop-cua-toi',              [GiangVienController::class, 'lopCuaToi']);
    Route::get('/lich-hom-nay',             [GiangVienController::class, 'lichHomNay']);
    Route::get('/lich-theo-tuan',           [GiangVienController::class, 'lichTheoTuan']);
    Route::get('/lop/{lopId}/hoc-vien',     [GiangVienController::class, 'hocVienTrongLop']);
    Route::get('/lop/{lopId}/lich-hoc',     [GiangVienController::class, 'lichHocCuaLop']);

    // Xe
    Route::get('/xe-cua-toi',               [XeController::class, 'xeCuaToi']);
    Route::post('/bao-loi-xe',              [XeController::class, 'baoBaoLoi']);
    Route::get('/bao-loi-xe',               [XeController::class, 'lichSuBaoLoi']);
});
