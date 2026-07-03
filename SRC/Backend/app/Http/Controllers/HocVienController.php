<?php

namespace App\Http\Controllers;

use App\Models\HoSoHocVien;
use App\Models\LichHoc;
use App\Models\HocVienLop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class HocVienController extends Controller
{
    // ─── Lấy hồ sơ cá nhân ──────────────────────────────────────────────────
    public function profile(Request $request)
    {
        $user = $request->auth_user;
        $hoSo = HoSoHocVien::with([
            'khoaHoc',
            'hocVienLop.lopHoc.giangVienLyThuyet.user',
            'hocVienLop.lopHoc.giangVienThucHanh.user',
            'thanhToan',
        ])->where('user_id', $user->id)->first();

        if (!$hoSo) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy hồ sơ'], 404);
        }

        return response()->json(['success' => true, 'data' => $hoSo]);
    }

    // ─── Cập nhật hồ sơ ─────────────────────────────────────────────────────
    public function updateProfile(Request $request)
    {
        $user = $request->auth_user;
        $hoSo = HoSoHocVien::where('user_id', $user->id)->firstOrFail();

        // ── Lấy giá trị cũ TRƯỚC khi update (getOriginal() sẽ không còn đúng sau update) ──
        $oldCccd     = $hoSo->so_cccd;
        $oldNgaySinh = $hoSo->ngay_sinh
            ? \Carbon\Carbon::parse($hoSo->ngay_sinh)->toDateString()
            : null;

        // Cập nhật thông tin hồ sơ
        $hoSo->update($request->only([
            'ho_ten', 'so_dien_thoai', 'dia_chi', 'email', 'so_cccd', 'ngay_sinh',
        ]));

        // Đồng bộ vào bảng users
        $userUpdates = [];
        if ($request->filled('so_dien_thoai')) {
            $userUpdates['so_dien_thoai'] = $request->so_dien_thoai;
        }
        if ($request->filled('ho_ten')) {
            $userUpdates['ho_ten'] = $request->ho_ten;
        }

        // ── Đồng bộ tài khoản đăng nhập nếu CCCD thay đổi ──────────────────
        if ($request->filled('so_cccd') && $request->so_cccd !== $oldCccd) {
            $newEmail = 'cccd_' . $request->so_cccd;
            // Kiểm tra CCCD mới chưa bị tài khoản khác dùng
            $conflict = \App\Models\User::where('email', $newEmail)
                ->where('id', '!=', $user->id)
                ->exists();
            if ($conflict) {
                return response()->json([
                    'success' => false,
                    'message' => 'Số CCCD này đã được dùng cho tài khoản khác. Vui lòng kiểm tra lại.',
                ], 422);
            }
            $userUpdates['email'] = $newEmail;
        }

        // ── Đồng bộ mật khẩu nếu ngày sinh thay đổi ────────────────────────
        if ($request->filled('ngay_sinh')) {
            $newNgaySinh = \Carbon\Carbon::parse($request->ngay_sinh)->toDateString();
            if ($newNgaySinh !== $oldNgaySinh) {
                $newPass = \Carbon\Carbon::parse($request->ngay_sinh)->format('dmY');
                $userUpdates['password'] = Hash::make($newPass);
            }
        }

        if (!empty($userUpdates)) {
            $user->update($userUpdates);
        }

        return response()->json(['success' => true, 'message' => 'Cập nhật hồ sơ thành công']);
    }

    // ─── Lịch học ───────────────────────────────────────────────────────────
    public function myLichHoc(Request $request)
    {
        $user = $request->auth_user;
        $hoSo = HoSoHocVien::where('user_id', $user->id)->first();

        if (!$hoSo) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $hvLop = HocVienLop::where('ho_so_id', $hoSo->id)->first();
        if (!$hvLop) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $lichHoc = LichHoc::with('lopHoc.khoaHoc')
            ->where('lop_hoc_id', $hvLop->lop_hoc_id)
            ->when($request->from, fn($q) => $q->where('ngay_hoc', '>=', $request->from))
            ->when($request->to,   fn($q) => $q->where('ngay_hoc', '<=', $request->to))
            ->orderBy('ngay_hoc')
            ->orderBy('gio_bat_dau')
            ->get();

        return response()->json(['success' => true, 'data' => $lichHoc]);
    }

    // ─── Tiến độ học ────────────────────────────────────────────────────────
    public function tienDo(Request $request)
    {
        $user = $request->auth_user;
        $hoSo = HoSoHocVien::with('khoaHoc')->where('user_id', $user->id)->first();

        if (!$hoSo) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy hồ sơ'], 404);
        }

        $hvLop   = HocVienLop::where('ho_so_id', $hoSo->id)->first();
        $khoa    = $hoSo->khoaHoc;

        // Dựa vào cấu hình DB: nếu so_km_toi_thieu = 0 → không cần thực hành km
        $coThucHanh  = ($khoa?->so_km_toi_thieu ?? 0) > 0;
        // Dựa vào cấu hình DB: nếu so_buoi_ly_thuyet_toi_thieu = 0 → không cần lý thuyết
        $coLyThuyet  = ($khoa?->so_buoi_ly_thuyet_toi_thieu ?? 0) > 0;

        return response()->json([
            'success' => true,
            'data'    => [
                'loai_bang'                   => $khoa?->loai_bang ?? '',
                'co_thuc_hanh'                => $coThucHanh,
                'co_ly_thuyet'                => $coLyThuyet,
                'so_buoi_ly_thuyet_da_hoc'    => $hvLop?->so_buoi_ly_thuyet_da_hoc ?? 0,
                'so_buoi_thuc_hanh_da_hoc'    => $hvLop?->so_buoi_thuc_hanh_da_hoc ?? 0,
                'so_km_da_chay'               => $hvLop?->so_km_da_chay ?? 0,
                'so_buoi_ly_thuyet_toi_thieu' => $khoa?->so_buoi_ly_thuyet_toi_thieu ?? 0,
                'so_km_toi_thieu'             => $khoa?->so_km_toi_thieu ?? 0,
                'du_buoi_ly_thuyet'           => $coLyThuyet ? ($hvLop?->du_buoi_ly_thuyet ?? false) : true,
                'du_km_thuc_hanh'             => $coThucHanh ? ($hvLop?->du_km_thuc_hanh ?? false) : true,
                'du_dieu_kien_thi_tn'         => $hvLop?->du_dieu_kien_thi_tn ?? false,
            ],
        ]);
    }

    // ─── Thông tin giảng viên dạy lớp mình ──────────────────────────────────
    public function myGiangVien(Request $request)
    {
        $user = $request->auth_user;
        $hoSo = HoSoHocVien::where('user_id', $user->id)->first();

        if (!$hoSo) {
            return response()->json(['success' => true, 'data' => null]);
        }

        $hvLop = HocVienLop::with([
            'lopHoc.giangVienLyThuyet.user',
            'lopHoc.giangVienThucHanh.user',
        ])->where('ho_so_id', $hoSo->id)->first();

        if (!$hvLop) {
            return response()->json(['success' => true, 'data' => null]);
        }

        $lopHoc = $hvLop->lopHoc;
        $result = ['lop' => $lopHoc->ten_lop];

        if ($lopHoc->giangVienLyThuyet) {
            $gv = $lopHoc->giangVienLyThuyet;
            $result['ly_thuyet'] = [
                'id'              => $gv->id,
                'ho_ten'          => $gv->user->ho_ten ?? '',
                'so_dien_thoai'   => $gv->user->so_dien_thoai ?? '',
                'bang_cap'        => $gv->bang_cap,
                'nam_kinh_nghiem' => $gv->nam_kinh_nghiem,
                'anh_dai_dien'    => null,
            ];
        }

        if ($lopHoc->giangVienThucHanh) {
            $gv = $lopHoc->giangVienThucHanh;
            $result['thuc_hanh'] = [
                'id'              => $gv->id,
                'ho_ten'          => $gv->user->ho_ten ?? '',
                'so_dien_thoai'   => $gv->user->so_dien_thoai ?? '',
                'bang_cap'        => $gv->bang_cap,
                'nam_kinh_nghiem' => $gv->nam_kinh_nghiem,
                'anh_dai_dien'    => null,
            ];
        }

        return response()->json(['success' => true, 'data' => $result]);
    }

    // ─── Dashboard summary ───────────────────────────────────────────────────
    public function summary(Request $request)
    {
        $user = $request->auth_user;
        $hoSo = HoSoHocVien::with('khoaHoc')->where('user_id', $user->id)->first();

        if (!$hoSo) {
            return response()->json(['success' => true, 'data' => [
                'lichHocHomNay' => 0, 'buoiConLai' => 0,
                'kmDaChay' => 0, 'ketQuaThi' => null,
                'hocPhi' => null, 'phanTramLyThuyet' => 0,
            ]]);
        }

        $hvLop = HocVienLop::where('ho_so_id', $hoSo->id)->first();
        $khoa  = $hoSo->khoaHoc;

        $lichHocHomNay = 0;
        $buoiConLai    = 0;

        if ($hvLop) {
            $lichHocHomNay = LichHoc::where('lop_hoc_id', $hvLop->lop_hoc_id)
                ->whereDate('ngay_hoc', today())->count();
            $buoiConLai = LichHoc::where('lop_hoc_id', $hvLop->lop_hoc_id)
                ->where('ngay_hoc', '>', today())->count();
        }

        $phanTramLyThuyet = 0;
        if ($hvLop && $khoa && $khoa->so_buoi_ly_thuyet_toi_thieu > 0) {
            $phanTramLyThuyet = min(100, round(
                ($hvLop->so_buoi_ly_thuyet_da_hoc / $khoa->so_buoi_ly_thuyet_toi_thieu) * 100
            ));
        }

        $ketQua = $hoSo->ketQuaThi()->with('baiThi')->latest()->first();
        $hocPhi = $hoSo->trang_thai_hoc_phi;

        $hocPhiLabel = [
            'chua_dong' => 'Chưa đóng',
            'da_dong'   => 'Đã đóng',
        ][$hocPhi] ?? $hocPhi;

        return response()->json([
            'success' => true,
            'data'    => [
                'lichHocHomNay'    => $lichHocHomNay,
                'buoiConLai'       => $buoiConLai,
                'kmDaChay'         => $hvLop?->so_km_da_chay ?? 0,
                'ketQuaThi'        => $ketQua
                    ? ($ketQua->ket_qua === 'dat' ? '✅ Đạt' : '❌ Không đạt')
                    : null,
                'hocPhi'           => $hocPhiLabel,
                'phanTramLyThuyet' => $phanTramLyThuyet,
            ],
        ]);
    }
}
