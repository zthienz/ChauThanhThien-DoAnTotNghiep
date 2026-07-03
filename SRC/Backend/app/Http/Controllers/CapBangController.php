<?php

namespace App\Http\Controllers;

use App\Models\HoSoHocVien;
use App\Models\KetQuaThi;
use App\Models\LichThi;
use App\Models\BangTotNghiep;
use App\Models\BangLaiXe;
use App\Models\KhoaHoc;
use App\Models\BaiThi;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class CapBangController extends Controller
{
    // ── Sinh số bằng tự động ────────────────────────────────────────────────

    private function sinhSoBangTN(): string
    {
        do {
            $so = 'TN-' . date('Y') . '-' . strtoupper(Str::random(6));
        } while (BangTotNghiep::where('so_bang', $so)->exists());
        return $so;
    }

    private function sinhSoBangLX(string $loaiBang): string
    {
        do {
            $so = $loaiBang . '-' . date('Y') . '-' . strtoupper(Str::random(6));
        } while (BangLaiXe::where('so_bang_lai', $so)->exists());
        return $so;
    }

    // ── BẰNG TỐT NGHIỆP ─────────────────────────────────────────────────────

    /**
     * Danh sách học viên đủ điều kiện cấp bằng TN:
     *   - Đã hoàn thành thi tốt nghiệp (trang_thai: hoan_thanh_tn trở lên)
     *   - HOẶC đã có bằng TN (dù trạng thái đã chuyển sang giai đoạn sát hạch)
     *   - Danh sách này không bao giờ mất dù học viên tiếp tục thi sát hạch
     */
    public function danhSachCapBangTN(Request $request)
    {
        $search    = $request->search;
        $filterTT  = $request->trang_thai; // cho_cap | da_cap

        // Tất cả trạng thái từ hoan_thanh_tn trở đi (đã đậu TN)
        $trangThaiDauTN = ['hoan_thanh_tn', 'du_dieu_kien_sat_hanh', 'dang_thi_sat_hanh', 'dau_sat_hanh', 'da_cap_bang'];

        // ── Tính tập ho_so_id thực sự đậu TN (tổng hợp kết quả mới nhất mỗi bài qua tất cả lịch) ──
        $lichThiTN = LichThi::where('loai_thi', 'tot_nghiep')
            ->with('khoaHoc:id,loai_bang')
            ->get();

        $hoSoDaDauTNThucSu = collect();
        $lichTheoHang = $lichThiTN->groupBy(fn($lt) => $lt->khoaHoc?->loai_bang);

        foreach ($lichTheoHang as $loaiBang => $danhSachLich) {
            if (!$loaiBang) continue;

            $lichIds = $danhSachLich->pluck('id');

            // Số bài TN cần đạt cho hạng này (từ khóa danh mục không có ma_khoa)
            $khoaDM  = KhoaHoc::where('loai_bang', $loaiBang)->whereNull('ma_khoa')->first();
            $baiThiIds = $khoaDM
                ? BaiThi::where('khoa_hoc_id', $khoaDM->id)->where('loai', 'tot_nghiep')->pluck('id')
                : collect();
            $soBaiTN = $baiThiIds->count();

            if ($soBaiTN === 0) continue;

            // Lấy tất cả KQ (kể cả không đạt) để tính kết quả mới nhất mỗi bài
            $kqAll = KetQuaThi::whereIn('lich_thi_id', $lichIds)
                ->whereIn('bai_thi_id', $baiThiIds)
                ->whereNotNull('ket_qua')
                ->select('ho_so_id', 'bai_thi_id', 'ket_qua', 'lich_thi_id')
                ->get()
                ->groupBy('ho_so_id');

            foreach ($kqAll as $hoSoId => $rows) {
                // Với mỗi bài: lấy kết quả từ lịch thi có id lớn nhất (mới nhất)
                $ketQuaMoiNhat = $rows->groupBy('bai_thi_id')->map(function ($baiRows) {
                    return $baiRows->sortByDesc('lich_thi_id')->first();
                });
                // Đếm số bài có kết quả mới nhất là 'dat'
                $soBaiDat = $ketQuaMoiNhat->filter(fn($kq) => $kq->ket_qua === 'dat')->count();
                if ($soBaiDat >= $soBaiTN) {
                    $hoSoDaDauTNThucSu->push($hoSoId);
                }
            }
        }

        $hoSoDaDauTNThucSu = $hoSoDaDauTNThucSu->unique()->values();
        // ─────────────────────────────────────────────────────────────────────

        $query = HoSoHocVien::with([
                'khoaHoc',
                'bangTotNghiep',
                'ketQuaThi' => fn($q) => $q->with(['lichThi', 'baiThi'])
                                           ->whereHas('lichThi', fn($q2) => $q2->where('loai_thi', 'tot_nghiep')),
            ])
            ->where(function ($q) use ($trangThaiDauTN, $hoSoDaDauTNThucSu) {
                // Phải ở trạng thái đã đậu TN VÀ có kết quả thi thực sự đạt
                $q->where(function ($inner) use ($trangThaiDauTN, $hoSoDaDauTNThucSu) {
                    $inner->whereIn('trang_thai', $trangThaiDauTN)
                          ->whereIn('id', $hoSoDaDauTNThucSu);
                })
                // HOẶC đã có bằng TN (đã cấp rồi thì vẫn hiển thị để quản lý)
                ->orWhereHas('bangTotNghiep');
            })
            ->when($search, fn($q) => $q
                ->where(function ($q2) use ($search) {
                    $q2->where('ho_ten', 'like', "%{$search}%")
                       ->orWhere('so_cccd', 'like', "%{$search}%")
                       ->orWhere('so_dien_thoai', 'like', "%{$search}%");
                })
            );

        // Lọc theo trạng thái bằng
        if ($filterTT === 'cho_cap') {
            $query->doesntHave('bangTotNghiep');
        } elseif ($filterTT === 'da_cap') {
            $query->has('bangTotNghiep');
        }

        $data = $query->latest()->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data'    => $data->items(),
            'total'   => $data->total(),
            'pages'   => $data->lastPage(),
        ]);
    }

    /**
     * Cấp bằng tốt nghiệp cho học viên.
     */
    public function capBangTN(Request $request, $hoSoId)
    {
        $request->validate([
            'ngay_cap'        => 'required|date',
            'nguoi_nhan'      => 'required|string|max:100',
            'quan_he'         => 'required|string|max:50',
            'cccd_nguoi_nhan' => 'nullable|string|max:20',
            'ngay_nhan'       => 'nullable|date',
            'ghi_chu'         => 'nullable|string|max:500',
        ]);

        $hoSo = HoSoHocVien::findOrFail($hoSoId);

        // Cho phép cấp bằng TN với mọi trạng thái đã đậu TN
        $trangThaiDauTN = ['hoan_thanh_tn', 'du_dieu_kien_sat_hanh', 'dang_thi_sat_hanh', 'dau_sat_hanh', 'da_cap_bang'];
        if (!in_array($hoSo->trang_thai, $trangThaiDauTN)) {
            return response()->json([
                'success' => false,
                'message' => 'Học viên chưa hoàn thành thi tốt nghiệp.',
            ], 422);
        }

        if ($hoSo->bangTotNghiep) {
            return response()->json([
                'success' => false,
                'message' => 'Học viên đã được cấp bằng tốt nghiệp rồi.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            BangTotNghiep::create([
                'ho_so_id'        => $hoSoId,
                'so_bang'         => $this->sinhSoBangTN(),
                'ngay_cap'        => $request->ngay_cap,
                'trang_thai'      => 'da_cap',
                'nguoi_nhan'      => $request->nguoi_nhan,
                'quan_he'         => $request->quan_he,
                'cccd_nguoi_nhan' => $request->cccd_nguoi_nhan,
                'ngay_nhan'       => $request->ngay_nhan ?? $request->ngay_cap,
                'nguoi_cap'       => $request->auth_user?->ho_ten ?? 'Admin',
                'ghi_chu'         => $request->ghi_chu,
            ]);

            $hoSo->update(['trang_thai' => 'du_dieu_kien_sat_hanh']);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }

        return response()->json([
            'success' => true,
            'message' => "Đã cấp bằng tốt nghiệp cho {$hoSo->ho_ten}.",
            'data'    => $hoSo->fresh()->load('bangTotNghiep'),
        ]);
    }

    /**
     * Thu hồi / hủy bằng tốt nghiệp (trường hợp cấp nhầm).
     */
    public function huyCBangTN($hoSoId)
    {
        $hoSo = HoSoHocVien::with('bangTotNghiep')->findOrFail($hoSoId);

        if (!$hoSo->bangTotNghiep) {
            return response()->json(['success' => false, 'message' => 'Học viên chưa có bằng TN.'], 422);
        }

        DB::beginTransaction();
        try {
            $hoSo->bangTotNghiep->delete();
            $hoSo->update(['trang_thai' => 'hoan_thanh_tn']);
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }

        return response()->json(['success' => true, 'message' => 'Đã hủy bằng tốt nghiệp.']);
    }

    // ── BẰNG LÁI XE ─────────────────────────────────────────────────────────

        /**
     * Danh sách học viên đủ điều kiện cấp bằng lái:
     *   - Trạng thái dau_sat_hanh hoặc da_cap_bang
     *   - Đã thi đậu sát hạch (có ket_qua = 'dat' trong lịch thi loại sat_hanh)
     */
    public function danhSachCapBangLX(Request $request)
    {
        $search   = $request->search;
        $filterTT = $request->trang_thai; // cho_cap | da_cap

        // Lấy ho_so_id đã đậu sát hạch thực sự:
        // Với mỗi bài thi SH, lấy kết quả MỚI NHẤT — nếu tất cả bài đều 'dat' thì mới tính là đậu SH
        $lichThiSH = LichThi::where('loai_thi', 'sat_hanh')
            ->with('khoaHoc:id,loai_bang')
            ->get();

        $hoSoDaDauSHThucSu = collect();
        $lichTheoHang = $lichThiSH->groupBy(fn($lt) => $lt->khoaHoc?->loai_bang);

        foreach ($lichTheoHang as $loaiBang => $danhSachLich) {
            if (!$loaiBang) continue;

            $lichIds = $danhSachLich->pluck('id');

            $khoaDM = KhoaHoc::where('loai_bang', $loaiBang)->whereNull('ma_khoa')->first();
            $baiThiIds = $khoaDM
                ? BaiThi::where('khoa_hoc_id', $khoaDM->id)->where('loai', 'sat_hanh')->pluck('id')
                : collect();
            $soBaiSH = $baiThiIds->count();

            if ($soBaiSH === 0) continue;

            // Lấy tất cả KQ để tính kết quả mới nhất mỗi bài
            $kqAll = KetQuaThi::whereIn('lich_thi_id', $lichIds)
                ->whereIn('bai_thi_id', $baiThiIds)
                ->whereNotNull('ket_qua')
                ->select('ho_so_id', 'bai_thi_id', 'ket_qua', 'lich_thi_id')
                ->get()
                ->groupBy('ho_so_id');

            foreach ($kqAll as $hoSoId => $rows) {
                // Với mỗi bài: lấy kết quả từ lịch thi có id lớn nhất (mới nhất)
                $ketQuaMoiNhat = $rows->groupBy('bai_thi_id')->map(function ($baiRows) {
                    return $baiRows->sortByDesc('lich_thi_id')->first();
                });
                // Đếm số bài có kết quả mới nhất là 'dat'
                $soBaiDat = $ketQuaMoiNhat->filter(fn($kq) => $kq->ket_qua === 'dat')->count();
                if ($soBaiDat >= $soBaiSH) {
                    $hoSoDaDauSHThucSu->push($hoSoId);
                }
            }
        }

        $hoSoDaDauSHThucSu = $hoSoDaDauSHThucSu->unique()->values();

        $query = HoSoHocVien::with([
                'khoaHoc',
                'bangLaiXe',
                'ketQuaThi' => fn($q) => $q->with(['lichThi', 'baiThi'])
                                           ->whereHas('lichThi', fn($q2) => $q2->where('loai_thi', 'sat_hanh')),
            ])
            ->whereIn('id', $hoSoDaDauSHThucSu)
            ->when($search, fn($q) => $q
                ->where(function ($q2) use ($search) {
                    $q2->where('ho_ten', 'like', "%{$search}%")
                       ->orWhere('so_cccd', 'like', "%{$search}%")
                       ->orWhere('so_dien_thoai', 'like', "%{$search}%");
                })
            );

        if ($filterTT === 'cho_cap') {
            $query->doesntHave('bangLaiXe');
        } elseif ($filterTT === 'da_cap') {
            $query->has('bangLaiXe');
        }

        $data = $query->latest()->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data'    => $data->items(),
            'total'   => $data->total(),
            'pages'   => $data->lastPage(),
        ]);
    }

    /**
     * Cấp bằng lái xe cho học viên sau khi đậu sát hạch.
     */
    public function capBangLX(Request $request, $hoSoId)
    {
        $request->validate([
            'ngay_cap'        => 'required|date',
            'co_quan_cap'     => 'required|string|max:200',
            'nguoi_nhan'      => 'required|string|max:100',
            'quan_he'         => 'required|string|max:50',
            'cccd_nguoi_nhan' => 'nullable|string|max:20',
            'ngay_nhan'       => 'nullable|date',
            'ngay_het_han'    => 'nullable|date',
            'ghi_chu'         => 'nullable|string|max:500',
        ]);

        $hoSo = HoSoHocVien::with(['khoaHoc', 'bangLaiXe'])->findOrFail($hoSoId);

        if ($hoSo->bangLaiXe) {
            return response()->json([
                'success' => false,
                'message' => 'Học viên đã được cấp bằng lái xe rồi.',
            ], 422);
        }

        // Kiểm tra học viên thực sự đậu SH (kết quả mới nhất mỗi bài đều 'dat')
        $khoaSH = $hoSo->khoaHoc;
        $loaiBangSH = $khoaSH?->loai_bang;
        $khoaDMSH   = $loaiBangSH ? KhoaHoc::where('loai_bang', $loaiBangSH)->whereNull('ma_khoa')->first() : null;
        $baiThiSHIds = $khoaDMSH
            ? BaiThi::where('khoa_hoc_id', $khoaDMSH->id)->where('loai', 'sat_hanh')->pluck('id')
            : collect();
        $soBaiSHCan = $baiThiSHIds->count();

        $dauSH = false;
        if ($soBaiSHCan > 0) {
            $lichSHIds = LichThi::whereHas('khoaHoc', fn($q) => $q->where('loai_bang', $loaiBangSH))
                ->where('loai_thi', 'sat_hanh')
                ->pluck('id');

            $kqSH = KetQuaThi::where('ho_so_id', $hoSoId)
                ->whereIn('lich_thi_id', $lichSHIds)
                ->whereIn('bai_thi_id', $baiThiSHIds)
                ->whereNotNull('ket_qua')
                ->select('bai_thi_id', 'ket_qua', 'lich_thi_id')
                ->get();

            $ketQuaMoiNhat = $kqSH->groupBy('bai_thi_id')->map(fn($rows) => $rows->sortByDesc('lich_thi_id')->first());
            $soBaiDat = $ketQuaMoiNhat->filter(fn($kq) => $kq->ket_qua === 'dat')->count();
            $dauSH = $soBaiDat >= $soBaiSHCan;
        }

        if (!$dauSH) {
            return response()->json([
                'success' => false,
                'message' => 'Học viên chưa đậu kỳ thi sát hạch.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $loaiBang = $hoSo->khoaHoc?->loai_bang ?? 'B2';

            BangLaiXe::create([
                'ho_so_id'            => $hoSoId,
                'so_bang_lai'         => $this->sinhSoBangLX($loaiBang),
                'ho_ten_chu_bang'     => $hoSo->ho_ten,
                'ngay_sinh_chu_bang'  => $hoSo->ngay_sinh,
                'so_cccd_chu_bang'    => $hoSo->so_cccd,
                'loai_bang'           => $loaiBang,
                'ngay_cap'            => $request->ngay_cap,
                'ngay_het_han'        => $request->ngay_het_han,
                'co_quan_cap'         => $request->co_quan_cap,
                'dia_chi_co_quan_cap' => $request->dia_chi_co_quan_cap ?? null,
                'trang_thai'          => 'da_cap',
                'ngay_cap_thuc_te'    => now(),
                'nguoi_nhan'          => $request->nguoi_nhan,
                'quan_he'             => $request->quan_he,
                'cccd_nguoi_nhan'     => $request->cccd_nguoi_nhan,
                'ngay_nhan'           => $request->ngay_nhan ?? $request->ngay_cap,
                'nguoi_cap'           => $request->auth_user?->ho_ten ?? 'Admin',
                'ghi_chu'             => $request->ghi_chu,
            ]);

            $hoSo->update(['trang_thai' => 'da_cap_bang']);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }

        return response()->json([
            'success' => true,
            'message' => "Đã cấp bằng lái xe {$loaiBang} cho {$hoSo->ho_ten}.",
            'data'    => $hoSo->fresh()->load('bangLaiXe'),
        ]);
    }

    /**
     * Thu hồi bằng lái xe.
     */
    public function huyCBangLX($hoSoId)
    {
        $hoSo = HoSoHocVien::with('bangLaiXe')->findOrFail($hoSoId);

        if (!$hoSo->bangLaiXe) {
            return response()->json(['success' => false, 'message' => 'Học viên chưa có bằng lái xe.'], 422);
        }

        DB::beginTransaction();
        try {
            $hoSo->bangLaiXe->delete();
            $hoSo->update(['trang_thai' => 'dau_sat_hanh']);
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }

        return response()->json(['success' => true, 'message' => 'Đã thu hồi bằng lái xe.']);
    }
}
