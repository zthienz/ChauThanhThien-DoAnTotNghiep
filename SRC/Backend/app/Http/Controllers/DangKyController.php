<?php

namespace App\Http\Controllers;

use App\Models\HoSoHocVien;
use App\Models\KhoaHoc;
use Illuminate\Http\Request;

class DangKyController extends Controller
{
    /**
     * Học viên đăng ký học lái xe từ trang quảng bá (online)
     * → Tạo hồ sơ đầy đủ với trạng thái "cho_dong_hoc_phi"
     * → Chưa có tài khoản, chờ admin xử lý
     */
    public function dangKyTuVan(Request $request)
    {
        $request->validate([
            'ho_ten'        => 'required|string|max:100',
            'so_dien_thoai' => 'required|string|regex:/^0\d{9}$/',
            'so_cccd'       => 'required|string|size:12|regex:/^\d{12}$/',
            'ngay_sinh'     => 'required|date',
            'khoa_hoc_id'   => 'required|exists:khoa_hoc,id',
            'email'         => 'nullable|string|regex:/@gmail\.com$/i',
            'dia_chi'       => 'nullable|string|max:255',
            'ghi_chu'       => 'nullable|string',
            'anh_the'       => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        // ── Kiểm tra trùng CCCD ──────────────────────────────────────────────
        $trungCCCD = HoSoHocVien::where('so_cccd', $request->so_cccd)->first();
        if ($trungCCCD) {
            $hoTenKhop   = mb_strtolower(trim($trungCCCD->ho_ten))   === mb_strtolower(trim($request->ho_ten));
            $ngaySinhKhop = \Carbon\Carbon::parse($trungCCCD->ngay_sinh)->toDateString()
                            === \Carbon\Carbon::parse($request->ngay_sinh)->toDateString();

            if (!$hoTenKhop || !$ngaySinhKhop) {
                return response()->json([
                    'success' => false,
                    'message' => 'Số CCCD này đã được đăng ký bởi một học viên khác. Vui lòng kiểm tra lại thông tin.',
                ], 422);
            }
            // Cùng người → cho phép đăng ký thêm khóa học (không return lỗi)
        }

        // ── Kiểm tra tuổi tối thiểu — lấy từ cấu hình bằng lái ─────────────
        $khoa     = KhoaHoc::findOrFail($request->khoa_hoc_id);
        $loaiBang = $khoa->loai_bang;

        if (!empty($khoa->tuoi_toi_thieu)) {
            $ngaySinh    = \Carbon\Carbon::parse($request->ngay_sinh);
            $tuoiHienTai = $ngaySinh->age;
            $tuoiMin     = $khoa->tuoi_toi_thieu;

            if ($tuoiHienTai < $tuoiMin) {
                return response()->json([
                    'success' => false,
                    'message' => "Bạn chưa đủ tuổi. Bằng hạng {$loaiBang} yêu cầu tối thiểu {$tuoiMin} tuổi (hiện tại: {$tuoiHienTai} tuổi).",
                ], 422);
            }
        }

        // Xử lý upload ảnh thẻ
        $anhThePath = null;
        if ($request->hasFile('anh_the')) {
            $file     = $request->file('anh_the');
            $fileName = 'hocvien_' . preg_replace('/[^a-zA-Z0-9]/', '', $request->ho_ten) . '_' . time() . '.' . $file->getClientOriginalExtension();
            $file->move(public_path('uploads/hoc_vien'), $fileName);
            $anhThePath = 'hoc_vien/' . $fileName;
        }

        $hoSo = HoSoHocVien::create([
            'user_id'            => null,
            'khoa_hoc_id'        => $request->khoa_hoc_id,
            'ho_ten'             => $request->ho_ten,
            'ngay_sinh'          => $request->ngay_sinh,
            'so_cccd'            => $request->so_cccd,
            'so_dien_thoai'      => $request->so_dien_thoai,
            'email'              => $request->email,
            'dia_chi'            => $request->dia_chi,
            'anh_the'            => $anhThePath,
            'nguon_dang_ky'      => 'online',
            'trang_thai'         => 'cho_dong_hoc_phi',
            'trang_thai_hoc_phi' => 'chua_dong',
            'ghi_chu'            => $request->ghi_chu,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đăng ký thành công! Trung tâm sẽ liên hệ xác nhận và hướng dẫn đóng học phí trong 24h.',
            'data'    => ['id' => $hoSo->id, 'ho_ten' => $hoSo->ho_ten],
        ], 201);
    }
}
