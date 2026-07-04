<?php

namespace App\Http\Controllers;

use App\Models\LichThi;
use App\Models\KetQuaThi;
use App\Models\LichThiHocVien;
use App\Models\KhoaHoc;
use App\Models\BaiThi;
use App\Models\DangKy;
use App\Models\ChungChi;
use App\Models\HocVienLop;
use App\Models\HoSoHocVien;
use App\Models\LopHoc;
use App\Models\DiemDanh;
use App\Models\LichHoc;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Carbon\Carbon;

class ThiController extends Controller
{
    /**
     * Lấy ngày buổi học cuối cùng mà học viên có mặt (trong các lớp thuộc lopIds).
     * Trả về Carbon hoặc null nếu chưa có buổi nào.
     */
    private function getNgayBuoiHocCuoi(int $hoSoId, \Illuminate\Support\Collection $lopIds): ?Carbon
    {
        $ngay = DiemDanh::where('diem_danh.ho_so_id', $hoSoId)
            ->where('diem_danh.co_mat', true)
            ->join('lich_hoc', 'diem_danh.lich_hoc_id', '=', 'lich_hoc.id')
            ->whereIn('lich_hoc.lop_hoc_id', $lopIds)
            ->max('lich_hoc.ngay_hoc');

        return $ngay ? Carbon::parse($ngay)->startOfDay() : null;
    }

    private function getBaiThiCuaKhoa(int $khoaHocId, string $loaiThi): \Illuminate\Support\Collection
    {
        $khoa   = KhoaHoc::findOrFail($khoaHocId);
        $baiThi = BaiThi::where('khoa_hoc_id', $khoaHocId)
            ->where('loai', $loaiThi)
            ->orderBy('thu_tu')
            ->get();

        // Khóa đào tạo theo tháng chưa có bài thi → kế thừa từ danh mục cùng hạng
        if ($baiThi->isEmpty() && !is_null($khoa->ma_khoa)) {
            $khoaDanhMuc = KhoaHoc::where('loai_bang', $khoa->loai_bang)
                ->whereNull('ma_khoa')
                ->first();
            if ($khoaDanhMuc) {
                $baiThi = BaiThi::where('khoa_hoc_id', $khoaDanhMuc->id)
                    ->where('loai', $loaiThi)
                    ->orderBy('thu_tu')
                    ->get();
            }
        }

        return $baiThi;
    }

    // ── Lịch thi ────────────────────────────────────────────────────────────

    public function indexLichThi(Request $request)
    {
        $query = LichThi::with('khoaHoc')
            ->when($request->khoa_hoc_id, fn($q) => $q->where('khoa_hoc_id', $request->khoa_hoc_id))
            ->orderBy('ngay_thi');

        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    public function storeLichThi(Request $request)
    {
        $request->validate([
            'khoa_hoc_id' => 'required|exists:khoa_hoc,id',
            'ngay_thi'    => 'required|date',
            'gio_thi'     => 'required',
            'loai_thi'    => 'required|in:tot_nghiep,sat_hanh',
        ]);

        $lichThi = LichThi::create($request->all());
        return response()->json(['success' => true, 'message' => 'Tạo lịch thi thành công', 'data' => $lichThi], 201);
    }

    public function updateLichThi(Request $request, $id)
    {
        $lichThi = LichThi::findOrFail($id);
        $loaiThi  = $request->loai_thi ?? $lichThi->loai_thi;
        $ngayThi  = $request->ngay_thi ?? $lichThi->ngay_thi;
        $khoaHocId = $request->khoa_hoc_id ?? $lichThi->khoa_hoc_id;

        $lichThi->update($request->all());
        return response()->json(['success' => true, 'message' => 'Cập nhật thành công']);
    }

    public function destroyLichThi($id)
    {
        LichThi::findOrFail($id)->delete();
        return response()->json(['success' => true, 'message' => 'Đã xóa lịch thi']);
    }

    // ── Học viên trong lịch thi ─────────────────────────────────────────────

    public function hocVienDuDieuKien(Request $request, $lichThiId)
    {
        $lichThi = LichThi::findOrFail($lichThiId);

        $khoa     = KhoaHoc::findOrFail($lichThi->khoa_hoc_id);
        $loaiBang = $khoa->loai_bang;

        $khoaCungHang  = KhoaHoc::where('loai_bang', $loaiBang)->pluck('id');
        $lopIds        = LopHoc::whereIn('khoa_hoc_id', $khoaCungHang)->pluck('id');
        $daCoTrongLich = LichThiHocVien::where('lich_thi_id', $lichThiId)->pluck('ho_so_id');

        $trangThaiDaQua = ['hoan_thanh_tn', 'du_dieu_kien_sat_hanh', 'dang_thi_sat_hanh', 'dau_sat_hanh', 'da_cap_bang'];

        // Học viên đã đậu TN hoàn toàn
        $hoSoDaDauTN = collect();
        if ($lichThi->loai_thi === 'tot_nghiep') {
            $lichThiTNCungHang = LichThi::whereIn('khoa_hoc_id', $khoaCungHang)
                ->where('loai_thi', 'tot_nghiep')
                ->where('id', '!=', $lichThiId)
                ->pluck('id');

            $baiThiTN       = $this->getBaiThiCuaKhoa($lichThi->khoa_hoc_id, 'tot_nghiep');
            $sobaithiCanDat = $baiThiTN->count();

            if ($sobaithiCanDat > 0 && $lichThiTNCungHang->isNotEmpty()) {
                $hoSoDaDauTN = KetQuaThi::whereIn('lich_thi_id', $lichThiTNCungHang)
                    ->where('ket_qua', 'dat')
                    ->select('ho_so_id', 'lich_thi_id')
                    ->get()
                    ->groupBy('ho_so_id')
                    ->filter(function ($rows) use ($sobaithiCanDat) {
                        $byLich = $rows->groupBy('lich_thi_id');
                        foreach ($byLich as $lichId => $baiDat) {
                            if ($baiDat->count() >= $sobaithiCanDat) return true;
                        }
                        return false;
                    })
                    ->keys();
            }
        }

        // Học viên đã đậu SH hoàn toàn
        $hoSoDaDauSH = collect();
        if ($lichThi->loai_thi === 'sat_hanh') {
            $lichThiSHCungHang = LichThi::whereIn('khoa_hoc_id', $khoaCungHang)
                ->where('loai_thi', 'sat_hanh')
                ->where('id', '!=', $lichThiId)
                ->pluck('id');

            $baiThiSH      = $this->getBaiThiCuaKhoa($lichThi->khoa_hoc_id, 'sat_hanh');
            $soBaiSHCanDat = $baiThiSH->count();

            if ($soBaiSHCanDat > 0 && $lichThiSHCungHang->isNotEmpty()) {
                $hoSoDaDauSH = KetQuaThi::whereIn('lich_thi_id', $lichThiSHCungHang)
                    ->where('ket_qua', 'dat')
                    ->select('ho_so_id', 'lich_thi_id')
                    ->get()
                    ->groupBy('ho_so_id')
                    ->filter(function ($rows) use ($soBaiSHCanDat) {
                        $byLich = $rows->groupBy('lich_thi_id');
                        foreach ($byLich as $lichId => $baiDat) {
                            if ($baiDat->count() >= $soBaiSHCanDat) return true;
                        }
                        return false;
                    })
                    ->keys();
            }
        }

        // Học viên đã đậu TN (dùng để kiểm tra điều kiện vào lịch sát hạch)
        $hoSoDaDauTNChoSH = collect();
        if ($lichThi->loai_thi === 'sat_hanh') {
            $baiThiTNKhoa  = $this->getBaiThiCuaKhoa($lichThi->khoa_hoc_id, 'tot_nghiep');
            $soBaiTNCanDat = $baiThiTNKhoa->count();
            $baiThiTNIds   = $baiThiTNKhoa->pluck('id');

            $lichThiTNIds = LichThi::whereIn('khoa_hoc_id', $khoaCungHang)
                ->where('loai_thi', 'tot_nghiep')
                ->pluck('id');

            if ($soBaiTNCanDat > 0 && $lichThiTNIds->isNotEmpty()) {
                // Tổng hợp bài đạt qua TẤT CẢ lịch TN (hỗ trợ thi lại từng bài)
                // Với mỗi bài thi, lấy kết quả MỚI NHẤT — nếu đạt thì tính là đạt
                $hoSoDaDauTNChoSH = KetQuaThi::whereIn('lich_thi_id', $lichThiTNIds)
                    ->whereIn('bai_thi_id', $baiThiTNIds)
                    ->whereNotNull('ket_qua')
                    ->select('ho_so_id', 'bai_thi_id', 'ket_qua', 'lich_thi_id')
                    ->get()
                    ->groupBy('ho_so_id')
                    ->filter(function ($rows) use ($soBaiTNCanDat, $baiThiTNIds) {
                        // Với mỗi bài thi, lấy kết quả từ lịch thi có id lớn nhất (mới nhất)
                        $ketQuaMoiNhat = $rows->groupBy('bai_thi_id')->map(function ($baiRows) {
                            return $baiRows->sortByDesc('lich_thi_id')->first();
                        });
                        // Đếm số bài có kết quả mới nhất là 'dat'
                        $soBaiDat = $ketQuaMoiNhat->filter(fn($kq) => $kq->ket_qua === 'dat')->count();
                        return $soBaiDat >= $soBaiTNCanDat;
                    })
                    ->keys();
            }
        }

        // ── Tính ngày đậu TN của từng học viên (dùng cho lịch sát hạch) ──
        // Với trường hợp thi lại từng bài: học viên đậu TN khi tổng hợp bài dat
        // qua tất cả lịch đủ số bài yêu cầu. Ngày đậu TN = ngày thi của lịch
        // mà bài cuối cùng được nhập dat (ngày muộn nhất trong các bài dat).
        $ngayDauTNTheoHoSo = collect();
        if ($lichThi->loai_thi === 'sat_hanh') {
            $baiThiTNMap   = $this->getBaiThiCuaKhoa($lichThi->khoa_hoc_id, 'tot_nghiep');
            $soBaiTNCanDat = $baiThiTNMap->count();
            $baiThiTNIds   = $baiThiTNMap->pluck('id');

            $lichThiTNAll = LichThi::whereIn('khoa_hoc_id', $khoaCungHang)
                ->where('loai_thi', 'tot_nghiep')
                ->pluck('id');

            if ($soBaiTNCanDat > 0 && $lichThiTNAll->isNotEmpty()) {
                // Lấy tất cả KQ (kể cả không đạt) để tính kết quả mới nhất mỗi bài
                $kqTN = KetQuaThi::whereIn('lich_thi_id', $lichThiTNAll)
                    ->whereIn('bai_thi_id', $baiThiTNIds)
                    ->whereNotNull('ket_qua')
                    ->select('ho_so_id', 'bai_thi_id', 'ket_qua', 'lich_thi_id')
                    ->with('lichThi:id,ngay_thi')
                    ->get()
                    ->groupBy('ho_so_id');

                foreach ($kqTN as $hoSoId => $rows) {
                    // Với mỗi bài thi: lấy kết quả từ lịch thi có id lớn nhất (mới nhất)
                    $ketQuaMoiNhat = $rows->groupBy('bai_thi_id')->map(function ($baiRows) {
                        return $baiRows->sortByDesc('lich_thi_id')->first();
                    });

                    // Chỉ xét học viên đậu đủ tất cả bài
                    $baiDatRows = $ketQuaMoiNhat->filter(fn($kq) => $kq->ket_qua === 'dat');
                    if ($baiDatRows->count() < $soBaiTNCanDat) continue;

                    // Ngày đậu TN = ngày thi muộn nhất trong số các bài đã đậu
                    // (tức là ngày hoàn thành bài cuối cùng)
                    $ngayTN = $baiDatRows->map(fn($kq) => $kq->lichThi->ngay_thi ?? null)
                        ->filter()
                        ->max();

                    if ($ngayTN) {
                        $ngayDauTNTheoHoSo->put($hoSoId, $ngayTN);
                    }
                }
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        $mapHocVien = function ($hvl) use ($lichThi, $hoSoDaDauTNChoSH, $ngayDauTNTheoHoSo, $lopIds) {
            $hoSo = $hvl->hoSo;
            $coPhiChuaThu = KetQuaThi::where('ho_so_id', $hoSo->id)
                ->whereHas('lichThi', fn($q) => $q
                    ->where('khoa_hoc_id', $lichThi->khoa_hoc_id)
                    ->where('loai_thi', $lichThi->loai_thi)
                )
                ->whereIn('ket_qua', ['khong_dat', 'vang_mat'])
                ->where('da_thu_phi', false)
                ->exists();

            // Kiểm tra ngày thi phải SAU ngày nộp hồ sơ
            $ngayNopHoSo = \Carbon\Carbon::parse($hoSo->created_at)->startOfDay();
            $ngayThi     = \Carbon\Carbon::parse($lichThi->ngay_thi)->startOfDay();
            $lichThiTruocNopHoSo = $ngayThi->lt($ngayNopHoSo);

            // ── Kiểm tra: ngày thi phải SAU ngày hoàn thành tiến độ học ──
            $ngayHoanThanhTienDo = $this->getNgayBuoiHocCuoi($hoSo->id, $lopIds);
            $lichThiTruocHoanThanh = false;
            $ngayHoanThanhFmt = null;
            if ($ngayHoanThanhTienDo) {
                $ngayHoanThanhFmt      = $ngayHoanThanhTienDo->format('d/m/Y');
                // Lịch thi phải SAU ngày hoàn thành (ngày thi > ngày buổi cuối)
                $lichThiTruocHoanThanh = $ngayThi->lte($ngayHoanThanhTienDo);
            }
            // ────────────────────────────────────────────────────────────────

            // ── Kiểm tra: lịch sát hạch phải SAU ngày đậu tốt nghiệp của học viên ──
            $lichSatHachTruocTN = false;
            $ngayDauTNFmt       = null;
            if ($lichThi->loai_thi === 'sat_hanh' && $hoSoDaDauTNChoSH->contains($hoSo->id)) {
                $ngayDauTN = $ngayDauTNTheoHoSo->get($hoSo->id);
                if ($ngayDauTN) {
                    $ngayDauTNCarbon    = \Carbon\Carbon::parse($ngayDauTN)->startOfDay();
                    $ngayDauTNFmt       = $ngayDauTNCarbon->format('d/m/Y');
                    // Lịch sát hạch phải SAU (ngày SH > ngày TN đậu)
                    $lichSatHachTruocTN = $ngayThi->lte($ngayDauTNCarbon);
                }
            }
            // ─────────────────────────────────────────────────────────────────

            return [
                'ho_so_id'                   => $hoSo->id,
                'ho_ten'                     => $hoSo->ho_ten,
                'so_cccd'                    => $hoSo->so_cccd,
                'ngay_sinh'                  => $hoSo->ngay_sinh,
                'so_dien_thoai'              => $hoSo->so_dien_thoai,
                'trang_thai'                 => $hoSo->trang_thai,
                'ten_lop'                    => $hvl->lopHoc->ten_lop ?? '—',
                'so_buoi_ly_thuyet_da_hoc'   => $hvl->so_buoi_ly_thuyet_da_hoc,
                'so_km_da_chay'              => $hvl->so_km_da_chay,
                'du_buoi_ly_thuyet'          => $hvl->du_buoi_ly_thuyet,
                'du_km_thuc_hanh'            => $hvl->du_km_thuc_hanh,
                'co_phi_chua_thu'            => $coPhiChuaThu,
                'lich_thi_truoc_nop_ho_so'   => $lichThiTruocNopHoSo,
                'ngay_nop_ho_so'             => $ngayNopHoSo->format('d/m/Y'),
                // Ngày hoàn thành tiến độ học (buổi có mặt cuối cùng)
                'lich_thi_truoc_hoan_thanh'  => $lichThiTruocHoanThanh,
                'ngay_hoan_thanh_tien_do'    => $ngayHoanThanhFmt,
                // Cờ cho lịch sát hạch: học viên chưa đậu tốt nghiệp
                'chua_dau_tot_nghiep'        => $lichThi->loai_thi === 'sat_hanh'
                                                    ? !$hoSoDaDauTNChoSH->contains($hoSo->id)
                                                    : false,
                // Cờ cho lịch sát hạch: lịch SH diễn ra trước hoặc cùng ngày thi TN của học viên
                'lich_sat_hanh_truoc_tn'     => $lichSatHachTruocTN,
                'ngay_dau_tot_nghiep'        => $ngayDauTNFmt,
            ];
        };

        $hocVienDuDK = HocVienLop::with(['hoSo', 'lopHoc'])
            ->whereIn('lop_hoc_id', $lopIds)
            ->where('du_dieu_kien_thi_tn', true)
            ->whereNotIn('ho_so_id', $daCoTrongLich)
            ->whereNotIn('ho_so_id', $hoSoDaDauTN)
            ->whereNotIn('ho_so_id', $hoSoDaDauSH)
            ->whereHas('hoSo', function ($q) use ($trangThaiDaQua, $lichThi) {
                if ($lichThi->loai_thi === 'tot_nghiep') {
                    $q->whereNotIn('trang_thai', $trangThaiDaQua);
                }
                if ($lichThi->loai_thi === 'sat_hanh') {
                    $q->whereIn('trang_thai', $trangThaiDaQua);
                }
            })
            ->get()
            ->map($mapHocVien);

        $hoSoDuDKIds = $hocVienDuDK->pluck('ho_so_id');

        // Với lịch sát hạch: tách học viên chưa đậu TN hoặc lịch SH trước ngày đậu TN sang "chưa đủ điều kiện"
        if ($lichThi->loai_thi === 'sat_hanh') {
            $hocVienChuaDauTN = $hocVienDuDK->filter(
                fn($hv) => $hv['chua_dau_tot_nghiep'] || $hv['lich_sat_hanh_truoc_tn']
            );
            $hocVienDuDK = $hocVienDuDK->filter(
                fn($hv) => !$hv['chua_dau_tot_nghiep'] && !$hv['lich_sat_hanh_truoc_tn']
            )->values();
            $hoSoDuDKIds = $hocVienDuDK->pluck('ho_so_id');
        } else {
            $hocVienChuaDauTN = collect();
        }

        $hocVienChuaDuDK = HocVienLop::with(['hoSo', 'lopHoc'])
            ->whereIn('lop_hoc_id', $lopIds)
            ->where('du_dieu_kien_thi_tn', false)
            ->whereNotIn('ho_so_id', $daCoTrongLich)
            ->whereNotIn('ho_so_id', $hoSoDaDauTN)
            ->whereNotIn('ho_so_id', $hoSoDaDauSH)
            ->whereNotIn('ho_so_id', $hoSoDuDKIds)
            ->whereHas('hoSo', function ($q) use ($trangThaiDaQua, $lichThi) {
                if ($lichThi->loai_thi === 'tot_nghiep') {
                    $q->whereNotIn('trang_thai', $trangThaiDaQua);
                }
                if ($lichThi->loai_thi === 'sat_hanh') {
                    $q->whereIn('trang_thai', $trangThaiDaQua);
                }
            })
            ->get()
            ->map($mapHocVien);

        // Gộp học viên chưa đậu TN vào nhóm chưa đủ điều kiện (đầu danh sách)
        $hocVienChuaDuDK = $hocVienChuaDauTN->values()->merge($hocVienChuaDuDK->values());

        $daXepVaoLich = LichThiHocVien::with('hoSo')
            ->where('lich_thi_id', $lichThiId)
            ->get()
            ->map(function ($lthv) use ($lichThiId, $lichThi) {
                $hoSo   = $lthv->hoSo;
                $kqList = KetQuaThi::where('lich_thi_id', $lichThiId)
                    ->where('ho_so_id', $lthv->ho_so_id)
                    ->with('baiThi')
                    ->get();

                $diemTheo = [];
                foreach ($kqList as $kq) {
                    $diemTheo[$kq->bai_thi_id] = [
                        'diem'     => $kq->diem,
                        'ket_qua'  => $kq->ket_qua,
                        'nhan_xet' => $kq->nhan_xet,
                    ];
                }

                $tongKQ = null;
                if ($kqList->isNotEmpty()) {
                    $tongKQ = $kqList->every(fn($k) => $k->ket_qua === 'dat') ? 'dat' : 'khong_dat';
                    if ($kqList->contains(fn($k) => $k->ket_qua === 'vang_mat')) {
                        $tongKQ = 'vang_mat';
                    }
                }

                $lichThiCungLoai = LichThi::where('khoa_hoc_id', $lichThi->khoa_hoc_id)
                    ->where('loai_thi', $lichThi->loai_thi)
                    ->where('id', '!=', $lichThiId)
                    ->pluck('id');

                $baiThiDaDat = KetQuaThi::where('ho_so_id', $lthv->ho_so_id)
                    ->whereIn('lich_thi_id', $lichThiCungLoai)
                    ->where('ket_qua', 'dat')
                    ->pluck('bai_thi_id')
                    ->unique()
                    ->values()
                    ->toArray();

                return [
                    'ho_so_id'       => $hoSo->id,
                    'ho_ten'         => $hoSo->ho_ten ?? '—',
                    'so_cccd'        => $hoSo->so_cccd ?? '—',
                    'ket_qua'        => $tongKQ,
                    'diem_theo'      => $diemTheo,
                    'bai_thi_da_dat' => $baiThiDaDat,
                ];
            });

        $baiThi = $this->getBaiThiCuaKhoa($lichThi->khoa_hoc_id, $lichThi->loai_thi);

        return response()->json([
            'success'           => true,
            'du_dieu_kien'      => $hocVienDuDK,
            'chua_du_dieu_kien' => $hocVienChuaDuDK,
            'da_xep_vao_lich'   => $daXepVaoLich,
            'bai_thi'           => $baiThi,
        ]);
    }

    public function themHocVienVaoLich(Request $request, $lichThiId)
    {
        $request->validate([
            'ho_so_ids'   => 'required|array|min:1',
            'ho_so_ids.*' => 'required|exists:ho_so_hoc_vien,id',
        ]);

        $lichThi      = LichThi::findOrFail($lichThiId);
        $khoa         = KhoaHoc::findOrFail($lichThi->khoa_hoc_id);
        $khoaCungHang = KhoaHoc::where('loai_bang', $khoa->loai_bang)->pluck('id');
        $lopIds       = LopHoc::whereIn('khoa_hoc_id', $khoaCungHang)->pluck('id');
        $added        = 0;

        $hoSoDaDauTNSet = collect();
        if ($lichThi->loai_thi === 'tot_nghiep') {
            $baiThiTN       = $this->getBaiThiCuaKhoa($lichThi->khoa_hoc_id, 'tot_nghiep');
            $soBaiThiCanDat = $baiThiTN->count();

            $lichThiTNCungHang = LichThi::whereIn('khoa_hoc_id', $khoaCungHang)
                ->where('loai_thi', 'tot_nghiep')
                ->where('id', '!=', $lichThiId)
                ->pluck('id');

            if ($soBaiThiCanDat > 0 && $lichThiTNCungHang->isNotEmpty()) {
                $hoSoDaDauTNSet = KetQuaThi::whereIn('lich_thi_id', $lichThiTNCungHang)
                    ->where('ket_qua', 'dat')
                    ->select('ho_so_id', 'lich_thi_id')
                    ->get()
                    ->groupBy('ho_so_id')
                    ->filter(function ($rows) use ($soBaiThiCanDat) {
                        $byLich = $rows->groupBy('lich_thi_id');
                        foreach ($byLich as $lichId => $baiDat) {
                            if ($baiDat->count() >= $soBaiThiCanDat) return true;
                        }
                        return false;
                    })
                    ->keys();
            }
        }

        // ── Tính tập học viên đã đậu TN để kiểm tra điều kiện vào lịch sát hạch ──
        $hoSoDaDauTNChoSH = collect();
        if ($lichThi->loai_thi === 'sat_hanh') {
            $baiThiTN       = $this->getBaiThiCuaKhoa($lichThi->khoa_hoc_id, 'tot_nghiep');
            $soBaiTNCanDat  = $baiThiTN->count();
            $baiThiTNIds    = $baiThiTN->pluck('id');

            $lichThiTNCungHang = LichThi::whereIn('khoa_hoc_id', $khoaCungHang)
                ->where('loai_thi', 'tot_nghiep')
                ->pluck('id');

            if ($soBaiTNCanDat > 0 && $lichThiTNCungHang->isNotEmpty()) {
                // Tổng hợp bài đạt qua TẤT CẢ lịch TN, lấy kết quả mới nhất mỗi bài
                $hoSoDaDauTNChoSH = KetQuaThi::whereIn('lich_thi_id', $lichThiTNCungHang)
                    ->whereIn('bai_thi_id', $baiThiTNIds)
                    ->whereNotNull('ket_qua')
                    ->select('ho_so_id', 'bai_thi_id', 'ket_qua', 'lich_thi_id')
                    ->get()
                    ->groupBy('ho_so_id')
                    ->filter(function ($rows) use ($soBaiTNCanDat) {
                        $ketQuaMoiNhat = $rows->groupBy('bai_thi_id')->map(function ($baiRows) {
                            return $baiRows->sortByDesc('lich_thi_id')->first();
                        });
                        $soBaiDat = $ketQuaMoiNhat->filter(fn($kq) => $kq->ket_qua === 'dat')->count();
                        return $soBaiDat >= $soBaiTNCanDat;
                    })
                    ->keys();
            }
        }

        $errors = [];  // thu thập lỗi ngày nộp hồ sơ

        foreach ($request->ho_so_ids as $hoSoId) {
            $duDK = HocVienLop::whereIn('lop_hoc_id', $lopIds)
                ->where('ho_so_id', $hoSoId)
                ->where('du_dieu_kien_thi_tn', true)
                ->exists();
            if (!$duDK) continue;

            $exists = LichThiHocVien::where('lich_thi_id', $lichThiId)
                ->where('ho_so_id', $hoSoId)
                ->exists();
            if ($exists) continue;

            if ($lichThi->loai_thi === 'tot_nghiep' && $hoSoDaDauTNSet->contains($hoSoId)) {
                continue;
            }

            if ($lichThi->loai_thi === 'tot_nghiep') {
                $trangThaiDaQua = ['hoan_thanh_tn', 'du_dieu_kien_sat_hanh', 'dang_thi_sat_hanh', 'dau_sat_hanh', 'da_cap_bang'];
                $trangThaiHV    = HoSoHocVien::where('id', $hoSoId)->value('trang_thai');
                if (in_array($trangThaiHV, $trangThaiDaQua)) continue;
            }

            // ── Kiểm tra điều kiện sát hạch: phải đậu TN trước ─────────────
            if ($lichThi->loai_thi === 'sat_hanh') {
                if (!$hoSoDaDauTNChoSH->contains($hoSoId)) {
                    continue; // Học viên chưa đậu tốt nghiệp, không được xếp vào lịch sát hạch
                }

                // ── Kiểm tra: lịch sát hạch phải SAU ngày đậu TN của học viên ──
                $baiThiTNSoSanh  = $this->getBaiThiCuaKhoa($lichThi->khoa_hoc_id, 'tot_nghiep');
                $soBaiTNSoSanh   = $baiThiTNSoSanh->count();
                $baiThiTNSoSanhIds = $baiThiTNSoSanh->pluck('id');
                $lichThiTNIds2   = LichThi::whereIn('khoa_hoc_id', $khoaCungHang)
                    ->where('loai_thi', 'tot_nghiep')
                    ->pluck('id');

                $ngayDauTNHocVien = null;
                if ($soBaiTNSoSanh > 0 && $lichThiTNIds2->isNotEmpty()) {
                    // Tổng hợp kết quả mới nhất mỗi bài qua tất cả lịch TN
                    $kqTNHV = KetQuaThi::whereIn('lich_thi_id', $lichThiTNIds2)
                        ->where('ho_so_id', $hoSoId)
                        ->whereIn('bai_thi_id', $baiThiTNSoSanhIds)
                        ->whereNotNull('ket_qua')
                        ->select('bai_thi_id', 'ket_qua', 'lich_thi_id')
                        ->with('lichThi:id,ngay_thi')
                        ->get();

                    // Với mỗi bài: lấy kết quả từ lịch có id lớn nhất (mới nhất)
                    $ketQuaMoiNhat = $kqTNHV->groupBy('bai_thi_id')->map(function ($baiRows) {
                        return $baiRows->sortByDesc('lich_thi_id')->first();
                    });

                    $baiDatRows = $ketQuaMoiNhat->filter(fn($kq) => $kq->ket_qua === 'dat');

                    if ($baiDatRows->count() >= $soBaiTNSoSanh) {
                        // Ngày đậu TN = ngày thi muộn nhất trong các bài dat (ngày hoàn thành bài cuối)
                        $ngayDauTNHocVien = $baiDatRows->map(fn($kq) => $kq->lichThi->ngay_thi ?? null)
                            ->filter()
                            ->max();
                    }
                }

                if ($ngayDauTNHocVien) {
                    $ngayTNCarbon = \Carbon\Carbon::parse($ngayDauTNHocVien)->startOfDay();
                    $ngaySHCarbon = \Carbon\Carbon::parse($lichThi->ngay_thi)->startOfDay();
                    if ($ngaySHCarbon->lte($ngayTNCarbon)) {
                        $hoSoInfo = HoSoHocVien::find($hoSoId);
                        $errors[] = [
                            'ho_so_id'    => $hoSoId,
                            'ho_ten'      => $hoSoInfo->ho_ten ?? 'Học viên',
                            'loai_loi'    => 'sat_hanh_truoc_tn',
                            'ngay_tn'     => $ngayTNCarbon->format('d/m/Y'),
                            'ngay_sat_hanh' => $ngaySHCarbon->format('d/m/Y'),
                        ];
                        continue; // Không được xếp vì lịch SH trước hoặc cùng ngày TN
                    }
                }
                // ─────────────────────────────────────────────────────────────
            }
            // ────────────────────────────────────────────────────────────────

            $coPhiChuaThu = KetQuaThi::where('ho_so_id', $hoSoId)
                ->whereHas('lichThi', fn($q) => $q
                    ->where('khoa_hoc_id', $lichThi->khoa_hoc_id)
                    ->where('loai_thi', $lichThi->loai_thi)
                )
                ->whereIn('ket_qua', ['khong_dat', 'vang_mat'])
                ->where('da_thu_phi', false)
                ->exists();

            if ($coPhiChuaThu) {
                $hoSoInfo = HoSoHocVien::find($hoSoId);
                $errors[] = [
                    'ho_so_id' => $hoSoId,
                    'ho_ten'   => $hoSoInfo->ho_ten ?? 'Học viên',
                    'loai_loi' => 'phi_chua_thu',
                ];
                continue;
            }

            // ── Kiểm tra: ngày thi phải SAU ngày nộp hồ sơ ────────────────
            $hoSo        = HoSoHocVien::find($hoSoId);
            $ngayNopHoSo = $hoSo ? \Carbon\Carbon::parse($hoSo->created_at)->startOfDay() : null;
            $ngayThi     = \Carbon\Carbon::parse($lichThi->ngay_thi)->startOfDay();

            if ($ngayNopHoSo && $ngayThi->lt($ngayNopHoSo)) {
                $errors[] = [
                    'ho_so_id'     => $hoSoId,
                    'ho_ten'       => $hoSo->ho_ten,
                    'ngay_nop'     => $ngayNopHoSo->format('d/m/Y'),
                    'ngay_thi'     => $ngayThi->format('d/m/Y'),
                ];
                continue;  // không xếp học viên này vào lịch thi
            }
            // ────────────────────────────────────────────────────────────────

            // ── Kiểm tra: ngày thi phải SAU ngày hoàn thành tiến độ học ────
            // Ngày hoàn thành = ngày buổi học (có mặt) cuối cùng của học viên.
            // Lịch thi phải là ngày HÔM SAU hoặc muộn hơn, không được cùng ngày.
            $ngayBuoiCuoi = $this->getNgayBuoiHocCuoi($hoSoId, $lopIds);
            if ($ngayBuoiCuoi && $ngayThi->lte($ngayBuoiCuoi)) {
                $errors[] = [
                    'ho_so_id'               => $hoSoId,
                    'ho_ten'                 => $hoSo->ho_ten,
                    'loai_loi'               => 'lich_thi_truoc_hoan_thanh',
                    'ngay_hoan_thanh'        => $ngayBuoiCuoi->format('d/m/Y'),
                    'ngay_thi'               => $ngayThi->format('d/m/Y'),
                    'ngay_som_nhat_duoc_thi' => $ngayBuoiCuoi->copy()->addDay()->format('d/m/Y'),
                ];
                continue;
            }
            // ────────────────────────────────────────────────────────────────

            \App\Models\LichThiHocVien::create(['lich_thi_id' => $lichThiId, 'ho_so_id' => $hoSoId]);

            if ($lichThi->loai_thi === 'sat_hanh') {
                HoSoHocVien::where('id', $hoSoId)
                    ->whereIn('trang_thai', ['hoan_thanh_tn', 'du_dieu_kien_sat_hanh', 'dau_sat_hanh'])
                    ->update(['trang_thai' => 'chuan_bi_thi']);
            } else {
                HoSoHocVien::where('id', $hoSoId)
                    ->whereIn('trang_thai', ['du_dieu_kien_thi_tn', 'dang_hoc'])
                    ->update(['trang_thai' => 'chuan_bi_thi']);
            }

            $added++;
        }

        $response = [
            'success' => true,
            'message' => "Đã thêm {$added} học viên vào lịch thi.",
            'added'   => $added,
        ];

        if (!empty($errors)) {
            $loiNgayNop        = array_filter($errors, fn($e) => !isset($e['loai_loi']));
            $loiSHTruocTN      = array_filter($errors, fn($e) => ($e['loai_loi'] ?? '') === 'sat_hanh_truoc_tn');
            $loiPhiChuaThu     = array_filter($errors, fn($e) => ($e['loai_loi'] ?? '') === 'phi_chua_thu');
            $loiTruocHoanThanh = array_filter($errors, fn($e) => ($e['loai_loi'] ?? '') === 'lich_thi_truoc_hoan_thanh');

            if (!empty($loiNgayNop)) {
                $loiNgayNop = array_values($loiNgayNop);
                $tenHV = collect($loiNgayNop)->pluck('ho_ten')->join(', ');
                $response['loi_ngay_nop'] = $loiNgayNop;
                $response['message'] .= " Có " . count($loiNgayNop) . " học viên không được xếp vì ngày thi ({$loiNgayNop[0]['ngay_thi']}) trước ngày nộp hồ sơ: {$tenHV}.";
            }

            if (!empty($loiSHTruocTN)) {
                $loiSHTruocTN = array_values($loiSHTruocTN);
                $tenHV = collect($loiSHTruocTN)->pluck('ho_ten')->join(', ');
                $response['loi_sat_hanh_truoc_tn'] = $loiSHTruocTN;
                $response['message'] .= " Có " . count($loiSHTruocTN) . " học viên không được xếp vì lịch sát hạch diễn ra trước hoặc cùng ngày tốt nghiệp: {$tenHV}.";
            }

            if (!empty($loiPhiChuaThu)) {
                $loiPhiChuaThu = array_values($loiPhiChuaThu);
                $tenHV = collect($loiPhiChuaThu)->pluck('ho_ten')->join(', ');
                $response['loi_phi_chua_thu'] = $loiPhiChuaThu;
                $response['message'] .= " Có " . count($loiPhiChuaThu) . " học viên chưa đóng phí thi lại (cần vào Quản Lý Học Phí để thu trước): {$tenHV}.";
            }

            if (!empty($loiTruocHoanThanh)) {
                $loiTruocHoanThanh = array_values($loiTruocHoanThanh);
                $tenHV = collect($loiTruocHoanThanh)->pluck('ho_ten')->join(', ');
                $response['loi_truoc_hoan_thanh'] = $loiTruocHoanThanh;
                $response['message'] .= " Có " . count($loiTruocHoanThanh) . " học viên không được xếp vì ngày thi chưa đủ cách ngày hoàn thành tiến độ học: {$tenHV}.";
            }
        }

        return response()->json($response);
    }

    public function xoaHocVienKhoiLich(Request $request, $lichThiId, $hoSoId)
    {
        $daCoKQ = KetQuaThi::where('lich_thi_id', $lichThiId)
            ->where('ho_so_id', $hoSoId)
            ->whereNotNull('ket_qua')
            ->exists();

        if ($daCoKQ) {
            return response()->json(['success' => false, 'message' => 'Không thể xóa học viên đã có kết quả thi.'], 422);
        }

        $lichThi = LichThi::findOrFail($lichThiId);
        LichThiHocVien::where('lich_thi_id', $lichThiId)->where('ho_so_id', $hoSoId)->delete();
        KetQuaThi::where('lich_thi_id', $lichThiId)->where('ho_so_id', $hoSoId)->whereNull('ket_qua')->delete();

        if ($lichThi->loai_thi === 'sat_hanh') {
            HoSoHocVien::where('id', $hoSoId)
                ->where('trang_thai', 'chuan_bi_thi')
                ->update(['trang_thai' => 'hoan_thanh_tn']);
        } else {
            HoSoHocVien::where('id', $hoSoId)
                ->where('trang_thai', 'chuan_bi_thi')
                ->update(['trang_thai' => 'du_dieu_kien_thi_tn']);
        }

        return response()->json(['success' => true, 'message' => 'Đã xóa học viên khỏi lịch thi.']);
    }

    // ── Kết quả thi ─────────────────────────────────────────────────────────

    public function nhapKetQua(Request $request, $lichThiId)
    {
        $request->validate([
            'ket_qua'                => 'required|array',
            'ket_qua.*.ho_so_id'     => 'required|exists:ho_so_hoc_vien,id',
            'ket_qua.*.bai_thi_id'   => 'required|exists:bai_thi,id',
            'ket_qua.*.diem'         => 'nullable|numeric|min:0|max:100',
            'ket_qua.*.ket_qua'      => 'nullable|in:dat,khong_dat,vang_mat',
        ]);

        $lichThi = LichThi::findOrFail($lichThiId);

        foreach ($request->ket_qua as $kq) {
            $ketQuaHienTai = KetQuaThi::where('ho_so_id', $kq['ho_so_id'])
                ->where('lich_thi_id', $lichThiId)
                ->where('bai_thi_id', $kq['bai_thi_id'])
                ->first();

            $ketQuaMoi = $kq['ket_qua'] ?? null;

            // ── Nếu kết quả bị sửa từ 'dat' → không đạt/vắng, reset da_thu_phi = false ──
            // Lần thi lại mới này học viên chưa đóng phí, phải thu lại từ đầu
            $resetDaThuPhi = false;
            if ($ketQuaHienTai && $ketQuaHienTai->ket_qua === 'dat'
                && in_array($ketQuaMoi, ['khong_dat', 'vang_mat'])) {
                $resetDaThuPhi = true;
            }

            $updateData = [
                'diem'     => $kq['diem'] ?? null,
                'ket_qua'  => $ketQuaMoi,
                'nhan_xet' => $kq['nhan_xet'] ?? null,
            ];

            if ($resetDaThuPhi) {
                $updateData['da_thu_phi'] = false;
                // Lấy phi_thi_lai từ cấu hình bài thi (không được set null vì cột NOT NULL)
                $baiThiInfo = \App\Models\BaiThi::find($kq['bai_thi_id']);
                $updateData['phi_thi_lai'] = $baiThiInfo?->phi_thi_lai ?? 0;
            }

            KetQuaThi::updateOrCreate(
                [
                    'ho_so_id'    => $kq['ho_so_id'],
                    'lich_thi_id' => $lichThiId,
                    'bai_thi_id'  => $kq['bai_thi_id'],
                ],
                $updateData
            );
        }

        $hoSoIds     = collect($request->ket_qua)->pluck('ho_so_id')->unique();
        $baiThiList  = $this->getBaiThiCuaKhoa($lichThi->khoa_hoc_id, $lichThi->loai_thi);
        $baiThiCount = $baiThiList->count();
        $baiThiIds   = $baiThiList->pluck('id');

        $khoa         = KhoaHoc::findOrFail($lichThi->khoa_hoc_id);
        $khoaCungHang = KhoaHoc::where('loai_bang', $khoa->loai_bang)->pluck('id');
        $lichThiCungLoai = LichThi::whereIn('khoa_hoc_id', $khoaCungHang)
            ->where('loai_thi', $lichThi->loai_thi)
            ->pluck('id');

        foreach ($hoSoIds as $hoSoId) {
            $kqLanNay = KetQuaThi::where('lich_thi_id', $lichThiId)
                ->where('ho_so_id', $hoSoId)
                ->whereNotNull('ket_qua')
                ->get();

            if ($kqLanNay->isEmpty()) continue;

            $coVangMat = $kqLanNay->contains(fn($k) => $k->ket_qua === 'vang_mat');

            if ($lichThi->loai_thi === 'tot_nghiep') {
                if ($coVangMat) {
                    HoSoHocVien::where('id', $hoSoId)
                        ->where('trang_thai', 'chuan_bi_thi')
                        ->update(['trang_thai' => 'du_dieu_kien_thi_tn']);

                    // ── Vắng mặt = chưa đậu TN → xóa khỏi lịch sát hạch chưa có KQ ──
                    $lichSatHachChuaCoKQ = LichThi::whereIn('khoa_hoc_id', $khoaCungHang)
                        ->where('loai_thi', 'sat_hanh')
                        ->pluck('id');

                    if ($lichSatHachChuaCoKQ->isNotEmpty()) {
                        $lichCoKQ = KetQuaThi::where('ho_so_id', $hoSoId)
                            ->whereIn('lich_thi_id', $lichSatHachChuaCoKQ)
                            ->whereNotNull('ket_qua')
                            ->pluck('lich_thi_id')
                            ->unique();

                        $lichCanXoa = $lichSatHachChuaCoKQ->diff($lichCoKQ);

                        if ($lichCanXoa->isNotEmpty()) {
                            LichThiHocVien::where('ho_so_id', $hoSoId)
                                ->whereIn('lich_thi_id', $lichCanXoa)
                                ->delete();
                            KetQuaThi::where('ho_so_id', $hoSoId)
                                ->whereIn('lich_thi_id', $lichCanXoa)
                                ->whereNull('ket_qua')
                                ->delete();
                        }
                    }
                    // ─────────────────────────────────────────────────────────

                    continue;
                }

                // Tổng hợp kết quả MỚI NHẤT của từng bài qua tất cả lịch TN
                // (hỗ trợ thi lại từng bài và xử lý admin sửa kết quả)
                $kqTatCaBaiTN = KetQuaThi::where('ho_so_id', $hoSoId)
                    ->whereIn('lich_thi_id', $lichThiCungLoai)
                    ->whereNotNull('ket_qua')
                    ->whereIn('bai_thi_id', $baiThiIds)
                    ->select('bai_thi_id', 'ket_qua', 'lich_thi_id')
                    ->get();

                // Với mỗi bài: lấy kết quả từ lịch thi có id lớn nhất (mới nhất)
                $ketQuaMoiNhatTN = $kqTatCaBaiTN->groupBy('bai_thi_id')->map(function ($baiRows) {
                    return $baiRows->sortByDesc('lich_thi_id')->first();
                });

                $baiDatIds = $ketQuaMoiNhatTN->filter(fn($kq) => $kq->ket_qua === 'dat')->keys();

                $tatCaBaiDat = $baiThiCount > 0 && $baiDatIds->count() >= $baiThiCount;

                if ($tatCaBaiDat) {
                    HoSoHocVien::where('id', $hoSoId)
                        ->whereIn('trang_thai', ['chuan_bi_thi', 'du_dieu_kien_thi_tn'])
                        ->update(['trang_thai' => 'hoan_thanh_tn']);
                } else {
                    // Học viên chưa đậu đủ tất cả bài TN → rollback về du_dieu_kien_thi_tn
                    // Bao gồm cả trường hợp admin sửa kết quả từ đạt → không đạt
                    // nên phải bao gồm cả trang_thai 'hoan_thanh_tn' để reset lại
                    HoSoHocVien::where('id', $hoSoId)
                        ->whereIn('trang_thai', ['chuan_bi_thi', 'hoan_thanh_tn'])
                        ->update(['trang_thai' => 'du_dieu_kien_thi_tn']);

                    // ── Xóa học viên này khỏi các lịch thi SÁT HẠCH chưa có kết quả ──
                    // Vì học viên chưa đậu tốt nghiệp, không được tham gia thi sát hạch
                    $lichSatHachChuaCoKQ = LichThi::whereIn('khoa_hoc_id', $khoaCungHang)
                        ->where('loai_thi', 'sat_hanh')
                        ->pluck('id');

                    if ($lichSatHachChuaCoKQ->isNotEmpty()) {
                        // Chỉ xóa khỏi lịch sát hạch mà học viên chưa có kết quả nào
                        $lichCoKQ = KetQuaThi::where('ho_so_id', $hoSoId)
                            ->whereIn('lich_thi_id', $lichSatHachChuaCoKQ)
                            ->whereNotNull('ket_qua')
                            ->pluck('lich_thi_id')
                            ->unique();

                        $lichCanXoa = $lichSatHachChuaCoKQ->diff($lichCoKQ);

                        if ($lichCanXoa->isNotEmpty()) {
                            LichThiHocVien::where('ho_so_id', $hoSoId)
                                ->whereIn('lich_thi_id', $lichCanXoa)
                                ->delete();
                            // Xóa kết quả chưa nhập (null) của các lịch này nếu có
                            KetQuaThi::where('ho_so_id', $hoSoId)
                                ->whereIn('lich_thi_id', $lichCanXoa)
                                ->whereNull('ket_qua')
                                ->delete();
                        }
                    }
                    // ────────────────────────────────────────────────────────
                }
            } else {
                if ($coVangMat) {
                    HoSoHocVien::where('id', $hoSoId)
                        ->whereIn('trang_thai', ['chuan_bi_thi', 'dau_sat_hanh'])
                        ->update(['trang_thai' => 'hoan_thanh_tn']);
                    continue;
                }

                // Tổng hợp kết quả MỚI NHẤT của từng bài qua tất cả lịch sát hạch
                $kqTatCaBaiSH = KetQuaThi::where('ho_so_id', $hoSoId)
                    ->whereIn('lich_thi_id', $lichThiCungLoai)
                    ->whereNotNull('ket_qua')
                    ->whereIn('bai_thi_id', $baiThiIds)
                    ->select('bai_thi_id', 'ket_qua', 'lich_thi_id')
                    ->get();

                $ketQuaMoiNhatSH = $kqTatCaBaiSH->groupBy('bai_thi_id')->map(function ($baiRows) {
                    return $baiRows->sortByDesc('lich_thi_id')->first();
                });

                $baiDatIds = $ketQuaMoiNhatSH->filter(fn($kq) => $kq->ket_qua === 'dat')->keys();

                $tatCaBaiDat = $baiThiCount > 0 && $baiDatIds->count() >= $baiThiCount;

                if ($tatCaBaiDat) {
                    HoSoHocVien::where('id', $hoSoId)
                        ->whereIn('trang_thai', ['chuan_bi_thi', 'hoan_thanh_tn', 'du_dieu_kien_sat_hanh', 'dang_thi_sat_hanh'])
                        ->update(['trang_thai' => 'dau_sat_hanh']);
                } else {
                    // Admin sửa kết quả sát hạch từ đạt → không đạt
                    // Rollback về hoan_thanh_tn (đã đậu TN nhưng chưa đậu SH)
                    HoSoHocVien::where('id', $hoSoId)
                        ->whereIn('trang_thai', ['chuan_bi_thi', 'dau_sat_hanh', 'du_dieu_kien_sat_hanh', 'dang_thi_sat_hanh'])
                        ->update(['trang_thai' => 'hoan_thanh_tn']);
                }
            }
        }

        // ── Tự động chuyển trạng thái lớp học sang 'da_ket_thuc' ─────────────
        // Nếu đây là kỳ thi sát hạch, kiểm tra lớp học của từng học viên vừa được
        // cập nhật sang 'dau_sat_hanh' — nếu toàn bộ học viên trong lớp đó đều
        // ở trạng thái 'dau_sat_hanh' thì tự động đóng lớp.
        if ($lichThi->loai_thi === 'sat_hanh') {
            $this->kiemTraVaDongLopNeuXongHet($hoSoIds->toArray());
        }

        return response()->json(['success' => true, 'message' => 'Nhập kết quả thi thành công']);
    }

    // ── Chứng chỉ ───────────────────────────────────────────────────────────

    public function capChungChi(Request $request)
    {
        $request->validate([
            'ho_so_id'    => 'required|exists:ho_so_hoc_vien,id',
            'khoa_hoc_id' => 'required|exists:khoa_hoc,id',
            'ngay_cap'    => 'required|date',
        ]);

        $soChungChi = 'CC-' . strtoupper(Str::random(8)) . '-' . date('Y');

        $chungChi = ChungChi::create([
            'ho_so_id'     => $request->ho_so_id,
            'khoa_hoc_id'  => $request->khoa_hoc_id,
            'so_chung_chi' => $soChungChi,
            'ngay_cap'     => $request->ngay_cap,
            'ngay_het_han' => $request->ngay_het_han ?? null,
        ]);

        return response()->json(['success' => true, 'message' => 'Cấp chứng chỉ thành công', 'data' => $chungChi], 201);
    }

    // ── Học viên (user) ──────────────────────────────────────────────────────

    public function myKetQua(Request $request)
    {
        $user = $request->auth_user;
        $hoSo = HoSoHocVien::where('user_id', $user->id)->firstOrFail();

        $ketQua = KetQuaThi::with(['lichThi.khoaHoc', 'baiThi'])
            ->where('ho_so_id', $hoSo->id)
            ->latest()
            ->get();

        return response()->json(['success' => true, 'data' => $ketQua]);
    }

    public function myChungChi(Request $request)
    {
        $user = $request->auth_user;
        $hoSo = HoSoHocVien::where('user_id', $user->id)->firstOrFail();

        $chungChi = ChungChi::with('khoaHoc')
            ->where('ho_so_id', $hoSo->id)
            ->latest()
            ->get();

        return response()->json(['success' => true, 'data' => $chungChi]);
    }

    // ── Helper: kiểm tra và tự động đóng lớp nếu toàn bộ học viên đậu sát hạch ──
    /**
     * Với danh sách ho_so_id vừa được cập nhật trạng thái, tìm lớp học tương ứng
     * và kiểm tra xem tất cả học viên trong lớp có đều ở trạng thái 'dau_sat_hanh'
     * hay không. Nếu đúng → chuyển lớp sang 'da_ket_thuc'.
     */
    private function kiemTraVaDongLopNeuXongHet(array $hoSoIds): void
    {
        // Tìm tất cả lop_hoc_id mà các học viên này thuộc về (chỉ lớp đang học)
        $lopIds = \App\Models\HocVienLop::whereIn('ho_so_id', $hoSoIds)
            ->whereHas('lopHoc', fn($q) => $q->where('trang_thai', 'dang_hoc'))
            ->pluck('lop_hoc_id')
            ->unique();

        foreach ($lopIds as $lopId) {
            // Lấy tất cả trạng thái học viên trong lớp này
            $trangThaiHV = HoSoHocVien::whereHas('hocVienLop', fn($q) => $q->where('lop_hoc_id', $lopId))
                ->pluck('trang_thai');

            if ($trangThaiHV->isEmpty()) continue;

            // Toàn bộ phải là 'dau_sat_hanh' mới đóng lớp
            $tatCaDau = $trangThaiHV->every(fn($tt) => $tt === 'dau_sat_hanh');

            if ($tatCaDau) {
                \App\Models\LopHoc::where('id', $lopId)
                    ->where('trang_thai', 'dang_hoc')
                    ->update(['trang_thai' => 'da_ket_thuc']);
            }
        }
    }
}
