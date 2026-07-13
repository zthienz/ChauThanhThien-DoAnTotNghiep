<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\GiangVien;
use App\Models\KhoaHoc;
use App\Models\LopHoc;
use App\Models\LichHoc;
use App\Models\ThanhToanHocPhi;
use App\Models\HoSoHocVien;
use App\Models\HocVienLop;
use App\Models\BaoLoiXe;
use App\Models\DiemDanh;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AdminController extends Controller
{
    // ─── Dashboard ───────────────────────────────────────────────────────────
    // Trả về dữ liệu tổng quan cho trang Dashboard của Admin:
    // tổng hồ sơ, số học viên theo từng trạng thái, số khóa học, lịch học hôm nay,
    // doanh thu tháng này và dữ liệu biểu đồ doanh thu 7 ngày gần nhất.
    public function dashboard()
    {
        $tongHoSo      = HoSoHocVien::count();

        // Luồng trạng thái học viên
        $choDongHocPhi    = HoSoHocVien::where('trang_thai', 'cho_dong_hoc_phi')->count();
        $choMoLop         = HoSoHocVien::where('trang_thai', 'cho_mo_lop')->count();
        $chuanBiHoc       = HoSoHocVien::where('trang_thai', 'chuan_bi_hoc')->count();
        $dangHoc          = HoSoHocVien::where('trang_thai', 'dang_hoc')->count();
        $duDieuKienThi    = HoSoHocVien::where('trang_thai', 'du_dieu_kien_thi_tn')->count();
        $chuanBiThi       = HoSoHocVien::where('trang_thai', 'chuan_bi_thi')->count();
        $dangThi          = HoSoHocVien::where('trang_thai', 'dang_thi_tn')->count();
        $dauTotNghiep     = HoSoHocVien::where('trang_thai', 'hoan_thanh_tn')->count();
        $duDieuKienSatHanh = HoSoHocVien::where('trang_thai', 'du_dieu_kien_sat_hanh')->count();
        $dangThiSatHanh    = HoSoHocVien::where('trang_thai', 'dang_thi_sat_hanh')->count();

        // Tổng học viên đang hoạt động (trừ đã đậu TN và đã cấp bằng)
        $tongDangHoatDong = HoSoHocVien::whereNotIn('trang_thai', ['hoan_thanh_tn', 'da_cap_bang'])->count();

        // Chỉ đếm khóa học đào tạo theo tháng (có ma_khoa) — đồng bộ với trang Quản Lý Khóa Học Đào Tạo
        $tongKhoaHoc   = KhoaHoc::whereNotNull('ma_khoa')->count();
        $lichHocHomNay = LichHoc::whereDate('ngay_hoc', today())->count();

        // Doanh thu tháng này
        $doanhThu = ThanhToanHocPhi::where('trang_thai', 'thanh_cong')
            ->whereMonth('ngay_thanh_toan', now()->month)
            ->whereYear('ngay_thanh_toan', now()->year)
            ->sum('so_tien');

        // Doanh thu 7 ngày gần nhất
        $chartData = [];
        for ($i = 6; $i >= 0; $i--) {
            $date    = now()->subDays($i);
            $revenue = ThanhToanHocPhi::where('trang_thai', 'thanh_cong')
                ->whereDate('ngay_thanh_toan', $date)->sum('so_tien');
            $chartData[] = ['date' => $date->format('d/m'), 'revenue' => (float) $revenue];
        }

        return response()->json([
            'success'   => true,
            'stats'     => [
                'tongHoSo'         => $tongHoSo,
                'tongDangHoatDong' => $tongDangHoatDong,
                'choDongHocPhi'    => $choDongHocPhi,
                'choMoLop'         => $choMoLop,
                'chuanBiHoc'       => $chuanBiHoc,
                'dangHoc'          => $dangHoc,
                'duDieuKienThi'    => $duDieuKienThi,
                'chuanBiThi'       => $chuanBiThi,
                'dangThi'          => $dangThi,
                'dauTotNghiep'     => $dauTotNghiep,
                'duDieuKienSatHanh' => $duDieuKienSatHanh,
                'dangThiSatHanh'   => $dangThiSatHanh,
                'khoaHoc'          => $tongKhoaHoc,
                'lichHoc'          => $lichHocHomNay,
                'doanhThu'         => (float) $doanhThu,
            ],
            'chartData' => $chartData,
        ]);
    }

    // ─── Chart doanh thu theo kỳ ─────────────────────────────────────────────
    // Trả về dữ liệu biểu đồ doanh thu theo kỳ được chọn:
    // 'thang_nay' (từng ngày trong tháng), 'thang' (12 tháng gần nhất),
    // 'quy' (8 quý gần nhất), 'nam' (5 năm gần nhất).
    public function chartDoanhThu(Request $request)
    {
        $ky = $request->ky ?? 'thang_nay'; // thang_nay | thang | quy | nam
        $data = [];

        switch ($ky) {
            // Tất cả các ngày trong tháng hiện tại
            case 'thang_nay':
                $daysInMonth = now()->daysInMonth;
                for ($d = 1; $d <= $daysInMonth; $d++) {
                    $date    = now()->startOfMonth()->addDays($d - 1);
                    $revenue = ThanhToanHocPhi::where('trang_thai', 'thanh_cong')
                        ->whereDate('ngay_thanh_toan', $date)->sum('so_tien');
                    $data[] = ['label' => $date->format('d/m'), 'revenue' => (float) $revenue];
                }
                break;

            // 12 tháng gần nhất
            case 'thang':
                for ($i = 11; $i >= 0; $i--) {
                    $date    = now()->subMonths($i);
                    $revenue = ThanhToanHocPhi::where('trang_thai', 'thanh_cong')
                        ->whereMonth('ngay_thanh_toan', $date->month)
                        ->whereYear('ngay_thanh_toan',  $date->year)
                        ->sum('so_tien');
                    $data[] = ['label' => 'T' . $date->format('n/y'), 'revenue' => (float) $revenue];
                }
                break;

            // 8 quý gần nhất (2 năm)
            case 'quy':
                for ($i = 7; $i >= 0; $i--) {
                    $date     = now()->subMonths($i * 3);
                    $quy      = ceil($date->month / 3);
                    $startM   = ($quy - 1) * 3 + 1;
                    $endM     = $quy * 3;
                    $revenue  = ThanhToanHocPhi::where('trang_thai', 'thanh_cong')
                        ->whereYear('ngay_thanh_toan', $date->year)
                        ->whereMonth('ngay_thanh_toan', '>=', $startM)
                        ->whereMonth('ngay_thanh_toan', '<=', $endM)
                        ->sum('so_tien');
                    $data[] = ['label' => "Q{$quy}/{$date->format('y')}", 'revenue' => (float) $revenue];
                }
                $seen = []; $unique = [];
                foreach ($data as $d) {
                    if (!in_array($d['label'], $seen)) { $seen[] = $d['label']; $unique[] = $d; }
                }
                $data = array_slice($unique, -8);
                break;

            // 5 năm gần nhất
            case 'nam':
                for ($i = 4; $i >= 0; $i--) {
                    $year    = now()->subYears($i)->year;
                    $revenue = ThanhToanHocPhi::where('trang_thai', 'thanh_cong')
                        ->whereYear('ngay_thanh_toan', $year)
                        ->sum('so_tien');
                    $data[] = ['label' => (string) $year, 'revenue' => (float) $revenue];
                }
                break;
        }

        return response()->json(['success' => true, 'data' => $data]);
    }

    // ─── Chart học viên đăng ký mới vs hoàn thành (6 tháng) ─────────────────
    // Trả về dữ liệu biểu đồ so sánh số học viên đăng ký mới và hoàn thành
    // trong 6 tháng gần nhất, dùng cho biểu đồ Dashboard.
    public function chartHocVien()
    {
        $data = [];
        for ($i = 5; $i >= 0; $i--) {
            $date  = now()->subMonths($i);
            $month = $date->month;
            $year  = $date->year;

            $dangKy = HoSoHocVien::whereMonth('created_at', $month)
                ->whereYear('created_at', $year)
                ->count();

            $hoanThanh = HoSoHocVien::whereIn('trang_thai', ['da_cap_bang', 'du_dieu_kien_thi_tn'])
                ->whereMonth('updated_at', $month)
                ->whereYear('updated_at', $year)
                ->count();

            $data[] = [
                'label'       => 'T' . $date->format('n/y'),
                'dang_ky'     => $dangKy,
                'hoan_thanh'  => $hoanThanh,
            ];
        }
        return response()->json(['success' => true, 'data' => $data]);
    }

    // ─── Chart thống kê theo hạng bằng (có lọc theo kỳ) ─────────────────────
    // Trả về số học viên đăng ký, số xe, số lớp học theo từng hạng bằng.
    // Hỗ trợ lọc theo kỳ: thang (tháng này), quy (quý này), 6thang, nam, tat_ca.
    public function chartHangBang(Request $request)
    {
        $ky = $request->ky ?? 'tat_ca';

        // Xác định khoảng thời gian lọc hồ sơ & lớp học
        $tuNgay = null;
        switch ($ky) {
            case 'thang':  $tuNgay = now()->startOfMonth(); break;
            case 'quy':    $tuNgay = now()->startOfQuarter(); break;
            case '6thang': $tuNgay = now()->subMonths(6)->startOfDay(); break;
            case 'nam':    $tuNgay = now()->startOfYear(); break;
            default:       $tuNgay = null; // tat_ca
        }

        $hangBangColors = [
            'A'  => '#f59e0b', 'A1' => '#f97316', 'A2' => '#fb923c',
            'B1' => '#3b82f6', 'B2' => '#8b5cf6',
            'C'  => '#10b981', 'C1' => '#0d9488', 'C2' => '#059669',
            'CE' => '#06b6d4', 'D'  => '#6366f1',  'E'  => '#ec4899',
        ];

        // Học viên đăng ký theo hạng — lọc theo created_at của hồ sơ
        $hvQuery = DB::table('ho_so_hoc_vien')
            ->join('khoa_hoc', 'khoa_hoc.id', '=', 'ho_so_hoc_vien.khoa_hoc_id')
            ->selectRaw('khoa_hoc.loai_bang as hang_bang, COUNT(*) as tong');
        if ($tuNgay) $hvQuery->where('ho_so_hoc_vien.created_at', '>=', $tuNgay);
        $hvTheoHangBang = $hvQuery->groupBy('khoa_hoc.loai_bang')->pluck('tong', 'hang_bang')->toArray();

        // Xe theo hạng — xe không thay đổi theo kỳ, luôn lấy tất cả
        $xeTheoHangBang = DB::table('xe')
            ->whereNotNull('hang_bang')
            ->selectRaw('hang_bang, COUNT(*) as tong')
            ->groupBy('hang_bang')
            ->pluck('tong', 'hang_bang')
            ->toArray();

        // Lớp học theo hạng — lọc theo created_at của lớp
        $lopQuery = DB::table('lop_hoc')
            ->join('khoa_hoc', 'khoa_hoc.id', '=', 'lop_hoc.khoa_hoc_id')
            ->selectRaw('khoa_hoc.loai_bang as hang_bang, COUNT(*) as tong');
        if ($tuNgay) $lopQuery->where('lop_hoc.created_at', '>=', $tuNgay);
        $lopTheoHangBang = $lopQuery->groupBy('khoa_hoc.loai_bang')->pluck('tong', 'hang_bang')->toArray();

        // Gộp tất cả hạng bằng
        $tatCaHangBang = array_unique(array_merge(
            array_keys($hvTheoHangBang),
            array_keys($xeTheoHangBang),
            array_keys($lopTheoHangBang)
        ));
        sort($tatCaHangBang);

        $result = array_map(fn($hb) => [
            'hang_bang' => $hb,
            'hoc_vien'  => (int)($hvTheoHangBang[$hb]  ?? 0),
            'xe'        => (int)($xeTheoHangBang[$hb]   ?? 0),
            'lop_hoc'   => (int)($lopTheoHangBang[$hb]  ?? 0),
            'color'     => $hangBangColors[$hb] ?? '#64748b',
        ], $tatCaHangBang);

        return response()->json(['success' => true, 'data' => array_values($result)]);
    }

    // ─── Hoạt động gần đây ───────────────────────────────────────────────────
    // Lấy 15 hoạt động gần đây nhất từ nhiều nguồn: hồ sơ mới đăng ký online,
    // hồ sơ tạo offline, thanh toán học phí, báo lỗi xe, và học viên vắng mặt.
    // Kết quả được sắp xếp theo thời gian mới nhất.
    public function hoatDongGanDay()
    {
        $activities = collect();

        // 1. Hồ sơ mới đăng ký (online qua trang quảng bá)
        HoSoHocVien::with('khoaHoc')
            ->where('nguon_dang_ky', 'online')
            ->latest()->limit(8)->get()
            ->each(fn($h) => $activities->push([
                'type'  => 'ho_so_online',
                'icon'  => '🌐',
                'color' => '#3b82f6',
                'title' => "Đăng ký mới: {$h->ho_ten}",
                'desc'  => ($h->khoaHoc ? "Hạng {$h->khoaHoc->hang_bang}" : 'Chưa chọn khóa')
                         . ' · ' . ($h->so_dien_thoai ?: $h->email ?: '—'),
                'time'  => $h->created_at,
                'link'  => '/ho-so',
            ]));

        // 2. Hồ sơ mới tạo offline (admin tạo)
        HoSoHocVien::with('khoaHoc')
            ->where('nguon_dang_ky', 'offline')
            ->latest()->limit(5)->get()
            ->each(fn($h) => $activities->push([
                'type'  => 'ho_so_offline',
                'icon'  => '📋',
                'color' => '#6366f1',
                'title' => "Hồ sơ mới: {$h->ho_ten}",
                'desc'  => ($h->khoaHoc ? "Hạng {$h->khoaHoc->hang_bang}" : 'Chưa chọn khóa')
                         . ' · Đăng ký trực tiếp',
                'time'  => $h->created_at,
                'link'  => '/ho-so',
            ]));

        // 3. Thanh toán học phí gần đây
        ThanhToanHocPhi::with('hoSo')
            ->where('trang_thai', 'thanh_cong')
            ->latest()->limit(8)->get()
            ->each(fn($t) => $activities->push([
                'type'  => 'thanh_toan',
                'icon'  => '💰',
                'color' => '#10b981',
                'title' => 'Đóng học phí: ' . ($t->hoSo?->ho_ten ?? '—'),
                'desc'  => number_format($t->so_tien, 0, ',', '.') . 'đ'
                         . ' · ' . match($t->phuong_thuc) {
                               'tien_mat'       => 'Tiền mặt',
                               'chuyen_khoan'   => 'Chuyển khoản',
                               default          => $t->phuong_thuc ?? '—',
                           }
                         . ($t->ghi_chu ? " · {$t->ghi_chu}" : ''),
                'time'  => $t->created_at,
                'link'  => '/ho-so',
            ]));

        // 4. Báo lỗi xe từ giảng viên
        BaoLoiXe::with(['xe', 'giangVien.user'])
            ->latest()->limit(8)->get()
            ->each(fn($b) => $activities->push([
                'type'  => 'bao_loi_xe',
                'icon'  => match($b->muc_do) {
                    'nghiem_trong' => '🔴',
                    'trung_binh'   => '🟠',
                    default        => '🟡',
                },
                'color' => match($b->muc_do) {
                    'nghiem_trong' => '#ef4444',
                    'trung_binh'   => '#f97316',
                    default        => '#f59e0b',
                },
                'title' => 'Báo lỗi xe: ' . $b->tieu_de,
                'desc'  => ($b->xe?->bien_so ?? '—')
                         . ' · GV: ' . ($b->giangVien?->user?->ho_ten ?? '—')
                         . ($b->mo_ta ? ' · ' . mb_substr($b->mo_ta, 0, 60) . (mb_strlen($b->mo_ta) > 60 ? '...' : '') : ''),
                'time'  => $b->created_at,
                'link'  => '/xe',
            ]));

        // 5. Học viên vắng mặt có ghi lý do (điểm danh gần đây)
        DiemDanh::with(['hoSo', 'lichHoc.lopHoc'])
            ->where('co_mat', false)
            ->whereNotNull('ghi_chu')
            ->where('ghi_chu', '!=', '')
            ->latest()->limit(8)->get()
            ->each(fn($d) => $activities->push([
                'type'  => 'vang_mat',
                'icon'  => '❌',
                'color' => '#8b5cf6',
                'title' => 'Vắng mặt: ' . ($d->hoSo?->ho_ten ?? '—'),
                'desc'  => ($d->lichHoc?->lopHoc?->ten_lop ?? '—')
                         . ' · ' . ($d->lichHoc?->ngay_hoc?->format('d/m/Y') ?? '—')
                         . ' · Lý do: ' . $d->ghi_chu,
                'time'  => $d->created_at,
                'link'  => '/lich-hoc',
            ]));

        // Gộp, sắp xếp theo thời gian mới nhất, lấy 15 hoạt động
        $result = $activities
            ->filter(fn($a) => $a['time'] !== null)
            ->sortByDesc('time')
            ->take(15)
            ->values()
            ->map(fn($a) => array_merge($a, [
                'time_human' => $a['time']->diffForHumans(),
                'time_fmt'   => $a['time']->format('d/m/Y H:i'),
            ]));

        return response()->json(['success' => true, 'data' => $result]);
    }

    // ─── Thu phí thi lại cho học viên ──────────────────────────────────────
    // Ghi nhận thanh toán phí thi lại cho từng bài thi học viên bị rớt.
    // Chỉ thu những bài chưa đóng phí; cập nhật cờ da_thu_phi trong kết quả thi.
    public function thuPhiThiLai(Request $request, $hoSoId)
    {
        $request->validate([
            'bai_thi_ids' => 'required|array|min:1',
            'bai_thi_ids.*' => 'required|exists:bai_thi,id',
            'lich_thi_id'  => 'required|exists:lich_thi,id',
            'phuong_thuc'  => 'required|in:tien_mat,chuyen_khoan',
            'ma_giao_dich' => 'nullable|string',
        ]);

        $hoSo = HoSoHocVien::findOrFail($hoSoId);

        $tongPhi = 0;
        $daThu   = [];

        foreach ($request->bai_thi_ids as $baiThiId) {
            $baiThi = \App\Models\BaiThi::findOrFail($baiThiId);

            // Kiểm tra bài thi này có thực sự chưa đạt không
            $ketQua = \App\Models\KetQuaThi::where('ho_so_id', $hoSoId)
                ->where('lich_thi_id', $request->lich_thi_id)
                ->where('bai_thi_id', $baiThiId)
                ->whereIn('ket_qua', ['khong_dat', 'vang_mat'])
                ->first();

            if (!$ketQua) continue;

            // Kiểm tra đã thu phí cho lần thi lại này chưa
            $daCoPhieu = \App\Models\ThanhToanHocPhi::where('ho_so_id', $hoSoId)
                ->where('loai_phi', 'phi_thi_lai')
                ->where('bai_thi_id', $baiThiId)
                ->where('lich_thi_id', $request->lich_thi_id)
                ->where('trang_thai', 'thanh_cong')
                ->exists();

            if ($daCoPhieu) continue;

            $phi = $baiThi->phi_thi_lai ?? 0;
            $tongPhi += $phi;

            \App\Models\ThanhToanHocPhi::create([
                'ho_so_id'        => $hoSoId,
                'loai_phi'        => 'phi_thi_lai',
                'bai_thi_id'      => $baiThiId,
                'lich_thi_id'     => $request->lich_thi_id,
                'so_tien'         => $phi,
                'phuong_thuc'     => $request->phuong_thuc,
                'ma_giao_dich'    => $request->ma_giao_dich ?? null,
                'trang_thai'      => 'thanh_cong',
                'nguoi_thu'       => $request->auth_user?->ho_ten ?? 'Admin',
                'ghi_chu'         => "Phí thi lại bài: {$baiThi->ten_bai_thi}",
                'ngay_thanh_toan' => now(),
            ]);

            // Cập nhật da_thu_phi trong ket_qua_thi
            \App\Models\KetQuaThi::where('ho_so_id', $hoSoId)
                ->where('lich_thi_id', $request->lich_thi_id)
                ->where('bai_thi_id', $baiThiId)
                ->update(['da_thu_phi' => true, 'phi_thi_lai' => $phi]);

            $daThu[] = $baiThi->ten_bai_thi;
        }

        if (empty($daThu)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có bài thi nào cần thu phí (đã thu hoặc không đủ điều kiện).',
            ], 422);
        }

        return response()->json([
            'success'   => true,
            'message'   => 'Đã thu phí thi lại thành công.',
            'bai_da_thu'=> $daThu,
            'tong_phi'  => $tongPhi,
        ]);
    }

    // ─── Lấy danh sách phí thi lại chưa thu của 1 học viên ──────────────────
    // Trả về danh sách các bài thi học viên bị rớt/vắng mà chưa đóng phí thi lại.
    public function phiThiLaiChuaThu(Request $request, $hoSoId)
    {
        // Lấy tất cả bài thi rớt, chưa thu phí
        $baiThiChuaThu = \App\Models\KetQuaThi::with(['baiThi', 'lichThi'])
            ->where('ho_so_id', $hoSoId)
            ->whereIn('ket_qua', ['khong_dat', 'vang_mat'])
            ->where('da_thu_phi', false)
            ->get()
            ->map(fn($kq) => [
                'ket_qua_thi_id' => $kq->id,
                'lich_thi_id'    => $kq->lich_thi_id,
                'ngay_thi'       => $kq->lichThi?->ngay_thi,
                'loai_thi'       => $kq->lichThi?->loai_thi,
                'bai_thi_id'     => $kq->bai_thi_id,
                'ten_bai_thi'    => $kq->baiThi?->ten_bai_thi,
                'phi_thi_lai'    => $kq->baiThi?->phi_thi_lai ?? 0,
                'ket_qua'        => $kq->ket_qua,
                'diem'           => $kq->diem,
            ]);

        return response()->json(['success' => true, 'data' => $baiThiChuaThu]);
    }

    // ─── Danh sách tất cả phí thi lại (admin xem) ────────────────────────────
    // Trả về toàn bộ giao dịch phí thi lại, có thể lọc theo học viên hoặc tìm kiếm.
    public function danhSachPhiThiLai(Request $request)
    {
        $query = \App\Models\ThanhToanHocPhi::with(['hoSo.khoaHoc', 'baiThi', 'lichThi'])
            ->where('loai_phi', 'phi_thi_lai')
            ->when($request->ho_so_id, fn($q) => $q->where('ho_so_id', $request->ho_so_id))
            ->when($request->search, fn($q) => $q->whereHas('hoSo', fn($s) =>
                $s->where('ho_ten', 'like', "%{$request->search}%")
                  ->orWhere('so_cccd', 'like', "%{$request->search}%")
            ));

        return response()->json([
            'success' => true,
            'data'    => $query->latest()->get(),
        ]);
    }
    // ─── Danh sách hồ sơ học viên ────────────────────────────────────────────
    // Trả về danh sách hồ sơ học viên có phân trang, hỗ trợ lọc theo trạng thái,
    // tìm kiếm theo tên/CCCD/SĐT, loại bằng, trạng thái học phí.
    // Ẩn các hồ sơ đã cấp bằng/đậu sát hạch (những trường hợp đó thuộc trang Cấp Bằng).
    // Đồng thời đánh dấu những học viên có phí thi lại chưa thu.
    public function hoSoList(Request $request)
    {
        // Các trạng thái sau khi đậu sát hạch → không hiện ở trang Hồ Sơ, chỉ hiện ở trang Cấp Bằng
        $trangThaiCapBang = ['dau_sat_hanh', 'da_cap_bang'];

        $query = HoSoHocVien::with(['khoaHoc', 'user'])
            ->when($request->trang_thai, fn($q) => $q->where('trang_thai', $request->trang_thai))
            ->when(!$request->trang_thai, fn($q) => $q->whereNotIn('trang_thai', $trangThaiCapBang))
            ->when($request->search, fn($q) => $q
                ->where(fn($q2) => $q2
                    ->where('ho_ten', 'like', "%{$request->search}%")
                    ->orWhere('so_cccd', 'like', "%{$request->search}%")
                    ->orWhere('so_dien_thoai', 'like', "%{$request->search}%")
                )
            )
            ->when($request->loai_bang, fn($q) => $q
                ->whereHas('khoaHoc', fn($q2) => $q2->where('loai_bang', $request->loai_bang))
            )
            ->when($request->hoc_phi, fn($q) => $q->where('trang_thai_hoc_phi', $request->hoc_phi));

        $data = $query->latest()->paginate($request->per_page ?? 20);

        // Lấy danh sách ho_so_id có phí thi lại chưa thu trong trang hiện tại
        $hoSoIds = collect($data->items())->pluck('id');
        $coPhiChuaThu = \App\Models\KetQuaThi::whereIn('ho_so_id', $hoSoIds)
            ->whereIn('ket_qua', ['khong_dat', 'vang_mat'])
            ->where('da_thu_phi', false)
            ->distinct()
            ->pluck('ho_so_id')
            ->flip(); // dùng flip để O(1) lookup

        $items = collect($data->items())->map(function ($hs) use ($coPhiChuaThu) {
            $arr = $hs->toArray();
            $arr['co_phi_thi_lai_chua_thu'] = isset($coPhiChuaThu[$hs->id]);
            return $arr;
        });

        return response()->json([
            'success' => true,
            'data'    => $items,
            'total'   => $data->total(),
            'pages'   => $data->lastPage(),
        ]);
    }

    // ─── Chi tiết hồ sơ ──────────────────────────────────────────────────────
    // Trả về đầy đủ thông tin của 1 hồ sơ học viên bao gồm: khóa học, tài khoản,
    // lịch sử thanh toán, thông tin lớp học, giảng viên và kết quả thi.
    public function hoSoDetail($id)
    {
        $hoSo = HoSoHocVien::with([
            'khoaHoc',
            'user',
            'thanhToan',
            'hocVienLop.lopHoc.khoaHoc',
            'hocVienLop.lopHoc.giangVienLyThuyet.user',
            'hocVienLop.lopHoc.giangVienThucHanh.user',
            'ketQuaThi.baiThi',
            'ketQuaThi.lichThi',
        ])->findOrFail($id);

        return response()->json(['success' => true, 'data' => $hoSo]);
    }

    // ─── Admin nhập hồ sơ offline ────────────────────────────────────────────
    // Admin tự tạo hồ sơ học viên tại trung tâm (đăng ký trực tiếp).
    // Kiểm tra trùng CCCD, kiểm tra tuổi tối thiểu theo hạng bằng,
    // xử lý upload ảnh thẻ và lưu hồ sơ với trạng thái 'cho_dong_hoc_phi'.
    public function taoHoSoOffline(Request $request)
    {
        $request->validate([
            'ho_ten'        => 'required|string|max:100',
            'ngay_sinh'     => 'required|date',
            'so_cccd'       => 'required|string|size:12|regex:/^\d{12}$/',
            'khoa_hoc_id'   => 'required|exists:khoa_hoc,id',
            'so_dien_thoai' => 'nullable|string|regex:/^0\d{9}$/',
            'dia_chi'       => 'nullable|string',
            'email'         => 'nullable|string|regex:/@gmail\.com$/i',
            'anh_the'       => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        // ── Kiểm tra trùng CCCD ──────────────────────────────────────────────
        $trungCCCD = HoSoHocVien::where('so_cccd', $request->so_cccd)->first();
        if ($trungCCCD) {
            $hoTenKhop    = mb_strtolower(trim($trungCCCD->ho_ten)) === mb_strtolower(trim($request->ho_ten));
            $ngaySinhKhop = \Carbon\Carbon::parse($trungCCCD->ngay_sinh)->toDateString()
                            === \Carbon\Carbon::parse($request->ngay_sinh)->toDateString();

            if (!$hoTenKhop || !$ngaySinhKhop) {
                return response()->json([
                    'success' => false,
                    'message' => 'Số CCCD này đã được đăng ký bởi học viên khác (họ tên hoặc ngày sinh không khớp). Vui lòng kiểm tra lại.',
                ], 422);
            }
            // Cùng người → cho phép đăng ký thêm khóa học (tiếp tục)
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
                    'message' => "Học viên chưa đủ tuổi. Bằng hạng {$loaiBang} yêu cầu tối thiểu {$tuoiMin} tuổi (hiện tại: {$tuoiHienTai} tuổi).",
                ], 422);
            }
        }

        // Xử lý upload ảnh thẻ — lưu vào public/uploads/hoc_vien/
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
            'dia_chi'            => $request->dia_chi,
            'so_dien_thoai'      => $request->so_dien_thoai,
            'email'              => $request->email,
            'anh_the'            => $anhThePath,
            'nguon_dang_ky'      => 'offline',
            'trang_thai'         => 'cho_dong_hoc_phi',
            'trang_thai_hoc_phi' => 'chua_dong',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo hồ sơ học viên offline thành công',
            'data'    => $hoSo,
        ], 201);
    }

    // ─── Upload ảnh thẻ riêng lẻ ─────────────────────────────────────────────
    // Cho phép admin upload hoặc thay thế ảnh thẻ của học viên sau khi tạo hồ sơ.
    public function uploadAnhThe(Request $request, $hoSoId)
    {
        $request->validate([
            'anh_the' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $hoSo = HoSoHocVien::findOrFail($hoSoId);

        $file     = $request->file('anh_the');
        $fileName = 'hocvien_' . preg_replace('/[^a-zA-Z0-9]/', '', $hoSo->ho_ten) . '_' . time() . '.' . $file->getClientOriginalExtension();
        $file->move(public_path('uploads/hoc_vien'), $fileName);
        $anhPath  = 'hoc_vien/' . $fileName;

        $hoSo->update(['anh_the' => $anhPath]);

        return response()->json([
            'success'  => true,
            'message'  => 'Cập nhật ảnh thẻ thành công',
            'anh_the'  => $anhPath,
            'anh_url'  => url('uploads/' . $anhPath),
        ]);
    }

    // ─── Ghi nhận đóng học phí ───────────────────────────────────────────────
    // Admin xác nhận học viên đã đóng học phí, tạo bản ghi thanh toán,
    // cập nhật trạng thái hồ sơ từ 'cho_dong_hoc_phi' sang 'cho_mo_lop'.
    public function ghiNhanHocPhi(Request $request, $hoSoId)
    {
        $request->validate([
            'so_tien'     => 'required|numeric|min:1',
            'phuong_thuc' => 'required|in:tien_mat,chuyen_khoan',
        ]);

        $hoSo = HoSoHocVien::findOrFail($hoSoId);
        $khoa = KhoaHoc::findOrFail($hoSo->khoa_hoc_id);

        // Kiểm tra đã đóng đủ chưa
        if ($hoSo->trang_thai_hoc_phi === 'da_dong') {
            return response()->json([
                'success' => false,
                'message' => 'Học viên đã đóng đủ học phí rồi',
            ], 400);
        }

        // Ghi nhận thanh toán
        ThanhToanHocPhi::create([
            'ho_so_id'        => $hoSoId,
            'so_tien'         => $request->so_tien,
            'phuong_thuc'     => $request->phuong_thuc,
            'ma_giao_dich'    => $request->ma_giao_dich ?? null,
            'trang_thai'      => 'thanh_cong',
            'nguoi_thu'       => $request->auth_user->ho_ten,
            'ghi_chu'         => $request->ghi_chu ?? null,
            'ngay_thanh_toan' => now(),
        ]);

        // Cập nhật hồ sơ
        $hoSo->update([
            'hoc_phi_da_dong'    => $request->so_tien,
            'trang_thai_hoc_phi' => 'da_dong',
            'ngay_dong_hoc_phi'  => now(),
            'trang_thai'         => 'cho_mo_lop',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Ghi nhận học phí thành công. Học viên chuyển sang trạng thái chờ mở lớp.',
            'data'    => $hoSo->fresh(),
        ]);
    }

    // ─── TẠO TÀI KHOẢN HỌC VIÊN (sau khi xếp vào lớp) ──────────────────────
    /**
     * Tài khoản: Số CCCD
     * Mật khẩu mặc định: Ngày sinh định dạng DDMMYYYY (VD: 16052004)
     */
    public function taoTaiKhoanHocVien(Request $request, $hoSoId)
    {
        $hoSo = HoSoHocVien::findOrFail($hoSoId);

        // Kiểm tra điều kiện
        if ($hoSo->trang_thai_hoc_phi !== 'da_dong') {
            return response()->json([
                'success' => false,
                'message' => 'Học viên chưa đóng học phí, không thể tạo tài khoản',
            ], 400);
        }

        if ($hoSo->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Học viên đã có tài khoản rồi',
            ], 400);
        }

        // Mật khẩu mặc định = ngày sinh DDMMYYYY
        $ngaySinh       = \Carbon\Carbon::parse($hoSo->ngay_sinh);
        $matKhauMacDinh = $ngaySinh->format('dmY');
        $emailNb        = 'cccd_' . $hoSo->so_cccd;

        DB::beginTransaction();
        try {
            // Kiểm tra email nội bộ đã tồn tại chưa
            $existingUser = User::where('email', $emailNb)->first();
            if ($existingUser) {
                $hoSo->update(['user_id' => $existingUser->id]);
                DB::commit();
                return response()->json([
                    'success'   => true,
                    'message'   => 'Đã liên kết tài khoản hiện có cho học viên',
                    'tai_khoan' => [
                        'so_cccd'   => $hoSo->so_cccd,
                        'mat_khau'  => $matKhauMacDinh,
                        'huong_dan' => 'Học viên dùng số CCCD và ngày sinh (DDMMYYYY) để đăng nhập',
                    ],
                ]);
            }

            // Tạo user mới
            $user = User::create([
                'ho_ten'        => $hoSo->ho_ten,
                'email'         => $emailNb,
                'password'      => Hash::make($matKhauMacDinh),
                'role'          => 'hoc_vien',
                'so_dien_thoai' => $hoSo->so_dien_thoai,
                'is_active'     => true,
            ]);

            // Gắn user vào hồ sơ
            $hoSo->update(['user_id' => $user->id]);

            DB::commit();

            return response()->json([
                'success'  => true,
                'message'  => 'Tạo tài khoản học viên thành công',
                'tai_khoan' => [
                    'so_cccd'        => $hoSo->so_cccd,
                    'mat_khau'       => $matKhauMacDinh,
                    'huong_dan'      => 'Học viên dùng số CCCD và ngày sinh (DDMMYYYY) để đăng nhập',
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi tạo tài khoản: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ─── Xếp học viên vào lớp + tạo tài khoản ───────────────────────────────
    // Xếp học viên vào lớp học được chọn và tự động tạo tài khoản đăng nhập
    // (nếu chưa có). Kiểm tra sĩ số, học phí, và cập nhật trạng thái hồ sơ
    // sang 'chuan_bi_hoc' hoặc 'dang_hoc' tùy theo ngày khai giảng.
    public function xepLopVaTaoTaiKhoan(Request $request, $hoSoId)
    {
        $request->validate([
            'lop_hoc_id' => 'required|exists:lop_hoc,id',
        ]);

        $hoSo   = HoSoHocVien::findOrFail($hoSoId);
        $lopHoc = LopHoc::with('khoaHoc')->findOrFail($request->lop_hoc_id);

        if ($hoSo->trang_thai_hoc_phi !== 'da_dong') {
            return response()->json([
                'success' => false,
                'message' => 'Học viên chưa đóng học phí',
            ], 400);
        }

        // Kiểm tra sĩ số
        $siSoHienTai = HocVienLop::where('lop_hoc_id', $request->lop_hoc_id)->count();
        if ($siSoHienTai >= $lopHoc->si_so_toi_da) {
            return response()->json([
                'success' => false,
                'message' => 'Lớp học đã đầy sĩ số',
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Tạo tài khoản nếu chưa có
            if (!$hoSo->user_id) {
                $ngaySinh = \Carbon\Carbon::parse($hoSo->ngay_sinh);
                $matKhau  = $ngaySinh->format('dmY');
                $emailNb  = 'cccd_' . $hoSo->so_cccd;

                // Kiểm tra email nội bộ đã tồn tại chưa (tránh duplicate)
                $existingUser = User::where('email', $emailNb)->first();
                if ($existingUser) {
                    // Gắn user đã có vào hồ sơ
                    $hoSo->update(['user_id' => $existingUser->id]);
                } else {
                    $user = User::create([
                        'ho_ten'        => $hoSo->ho_ten,
                        'email'         => $emailNb,
                        'password'      => Hash::make($matKhau),
                        'role'          => 'hoc_vien',
                        'so_dien_thoai' => $hoSo->so_dien_thoai,
                        'is_active'     => true,
                    ]);
                    $hoSo->update(['user_id' => $user->id]);
                }
            }

            // Xếp vào lớp
            HocVienLop::updateOrCreate(
                ['ho_so_id' => $hoSoId],
                [
                    'lop_hoc_id'   => $request->lop_hoc_id,
                    'ngay_xep_lop' => today(),
                ]
            );

            // Cập nhật trạng thái hồ sơ → chuan_bi_hoc (chờ ngày khai giảng)
            $hoSo->update(['trang_thai' => 'chuan_bi_hoc']);

            // Nếu ngày khai giảng đã đến hoặc đã qua → chuyển thẳng sang dang_hoc
            if ($lopHoc->ngay_khai_giang && $lopHoc->ngay_khai_giang->lte(today())) {
                $hoSo->update(['trang_thai' => 'dang_hoc']);
                if ($lopHoc->trang_thai === 'chuan_bi') {
                    $lopHoc->update(['trang_thai' => 'dang_hoc']);
                }
            }

            // Nếu lớp đang ở 'da_ket_thuc' (thêm học viên mới vào lớp đã kết thúc)
            // → tự động mở lại lớp về 'dang_hoc' và chuyển học viên sang dang_hoc luôn
            if ($lopHoc->trang_thai === 'da_ket_thuc') {
                $lopHoc->update(['trang_thai' => 'dang_hoc']);
                $hoSo->update(['trang_thai' => 'dang_hoc']);
            }

            DB::commit();

            $ngaySinhFmt = \Carbon\Carbon::parse($hoSo->ngay_sinh)->format('dmY');

            return response()->json([
                'success' => true,
                'message' => "Đã xếp học viên vào lớp {$lopHoc->ten_lop} và tạo tài khoản thành công",
                'tai_khoan' => [
                    'so_cccd'   => $hoSo->so_cccd,
                    'mat_khau'  => $ngaySinhFmt,
                    'huong_dan' => 'Học viên dùng số CCCD và ngày sinh (DDMMYYYY) để đăng nhập tại cổng học viên',
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ─── Cập nhật trạng thái hồ sơ ───────────────────────────────────────────
    // Admin thay đổi thủ công trạng thái hồ sơ học viên sang một trạng thái hợp lệ bất kỳ.
    public function capNhatTrangThai(Request $request, $hoSoId)
    {
        $request->validate([
            'trang_thai' => 'required|in:cho_dong_hoc_phi,cho_mo_lop,chuan_bi_hoc,dang_hoc,du_dieu_kien_thi_tn,chuan_bi_thi,dang_thi_tn,hoan_thanh_tn,du_dieu_kien_sat_hanh,dang_thi_sat_hanh,dau_sat_hanh,da_cap_bang',
        ]);

        $hoSo = HoSoHocVien::findOrFail($hoSoId);
        $hoSo->update(['trang_thai' => $request->trang_thai]);

        return response()->json(['success' => true, 'message' => 'Cập nhật trạng thái thành công']);
    }

    // ─── Cập nhật thông tin hồ sơ ────────────────────────────────────────────
    // Admin chỉnh sửa thông tin hồ sơ học viên. Nếu CCCD hoặc ngày sinh thay đổi
    // thì tự động đồng bộ lại tài khoản đăng nhập (email và mật khẩu) của học viên.
    public function capNhatHoSo(Request $request, $hoSoId)
    {
        $hoSo = HoSoHocVien::findOrFail($hoSoId);

        $request->validate([
            'ho_ten'        => 'required|string|max:100',
            'ngay_sinh'     => 'required|date',
            'so_cccd'       => 'required|string|size:12|regex:/^\d{12}$/',
            'khoa_hoc_id'   => 'required|exists:khoa_hoc,id',
            'so_dien_thoai' => 'nullable|string|regex:/^0\d{9}$/',
            'dia_chi'       => 'nullable|string',
            'email'         => 'nullable|string|regex:/@gmail\.com$/i',
            'anh_the'       => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        // ── Kiểm tra trùng CCCD (bỏ qua bản ghi hiện tại) ──────────────────
        $trungCCCD = HoSoHocVien::where('so_cccd', $request->so_cccd)
            ->where('id', '!=', $hoSoId)
            ->first();
        if ($trungCCCD) {
            $hoTenKhop    = mb_strtolower(trim($trungCCCD->ho_ten)) === mb_strtolower(trim($request->ho_ten));
            $ngaySinhKhop = \Carbon\Carbon::parse($trungCCCD->ngay_sinh)->toDateString()
                            === \Carbon\Carbon::parse($request->ngay_sinh)->toDateString();

            if (!$hoTenKhop || !$ngaySinhKhop) {
                return response()->json([
                    'success' => false,
                    'message' => 'Số CCCD này đã được đăng ký bởi học viên khác (họ tên hoặc ngày sinh không khớp). Vui lòng kiểm tra lại.',
                ], 422);
            }
        }

        $anhThePath = $hoSo->anh_the;
        if ($request->hasFile('anh_the')) {
            $file     = $request->file('anh_the');
            $fileName = 'hocvien_' . preg_replace('/[^a-zA-Z0-9]/', '', $request->ho_ten) . '_' . time() . '.' . $file->getClientOriginalExtension();
            $file->move(public_path('uploads/hoc_vien'), $fileName);
            $anhThePath = 'hoc_vien/' . $fileName;
        }

        // ── Lấy giá trị cũ TRƯỚC khi update để so sánh đồng bộ tài khoản ──
        $oldCccd     = $hoSo->so_cccd;
        $oldNgaySinh = Carbon::parse($hoSo->ngay_sinh)->toDateString();

        $hoSo->update([
            'ho_ten'        => $request->ho_ten,
            'ngay_sinh'     => $request->ngay_sinh,
            'so_cccd'       => $request->so_cccd,
            'khoa_hoc_id'   => $request->khoa_hoc_id,
            'so_dien_thoai' => $request->so_dien_thoai,
            'dia_chi'       => $request->dia_chi,
            'email'         => $request->email,
            'anh_the'       => $anhThePath,
        ]);

        // ── Đồng bộ tài khoản đăng nhập nếu học viên đã có tài khoản ────────
        if ($hoSo->user_id) {
            $user        = User::find($hoSo->user_id);
            $userUpdates = [];

            // Đồng bộ họ tên
            $userUpdates['ho_ten']        = $request->ho_ten;
            $userUpdates['so_dien_thoai'] = $request->so_dien_thoai;

            // Đồng bộ tài khoản (email) nếu CCCD thay đổi
            if ($request->so_cccd !== $oldCccd) {
                $userUpdates['email'] = 'cccd_' . $request->so_cccd;
            }

            // Đồng bộ mật khẩu nếu ngày sinh thay đổi
            $newNgaySinh = Carbon::parse($request->ngay_sinh)->toDateString();
            if ($newNgaySinh !== $oldNgaySinh) {
                $newPass = Carbon::parse($request->ngay_sinh)->format('dmY');
                $userUpdates['password'] = Hash::make($newPass);
            }

            if ($user && !empty($userUpdates)) {
                $user->update($userUpdates);
            }
        }

        return response()->json(['success' => true, 'message' => 'Cập nhật hồ sơ thành công', 'data' => $hoSo->fresh()]);
    }

    // ─── Xóa hồ sơ ───────────────────────────────────────────────────────────
    public function xoaHoSo($hoSoId)
    {
        $hoSo = HoSoHocVien::findOrFail($hoSoId);

        // Vô hiệu hóa tài khoản user liên kết để chặn đăng nhập ngay lập tức
        if ($hoSo->user_id) {
            User::where('id', $hoSo->user_id)->update(['is_active' => false]);
        }

        $hoSo->delete();
        return response()->json(['success' => true, 'message' => 'Đã xóa hồ sơ học viên']);
    }
    // ─── Danh sách giảng viên ────────────────────────────────────────────────
    public function giangVienList()
    {
        $list = GiangVien::with('user')->get()->map(fn($gv) => [
            'id'              => $gv->id,
            'user_id'         => $gv->user_id,
            'ho_ten'          => $gv->user->ho_ten ?? '',
            'email'           => $gv->user->email ?? '',
            'so_dien_thoai'   => $gv->user->so_dien_thoai ?? '',
            'chuyen_mon'      => $gv->chuyen_mon,
            'bang_cap'        => $gv->bang_cap,
            'nam_kinh_nghiem' => $gv->nam_kinh_nghiem,
            'ghi_chu'         => $gv->ghi_chu,
            'anh_dai_dien'    => $gv->anh_dai_dien,
            'trang_thai'      => $gv->trang_thai ?? 'san_sang',
            'is_active'       => $gv->user->is_active ?? true,
        ]);

        return response()->json(['success' => true, 'data' => $list]);
    }

    // ─── Cập nhật trạng thái giảng viên ──────────────────────────────────────
    public function capNhatTrangThaiGiangVien(Request $request, $id)
    {
        $request->validate([
            'trang_thai' => 'required|in:san_sang,nghi_phep,dinh_chi',
        ]);

        $giangVien = GiangVien::findOrFail($id);
        $giangVien->update(['trang_thai' => $request->trang_thai]);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật trạng thái giảng viên thành công',
        ]);
    }

    // ─── Tạo tài khoản giảng viên ────────────────────────────────────────────
    public function taoGiangVien(Request $request)
    {
        $request->validate([
            'ho_ten'      => 'required|string',
            'email'       => 'required|email|unique:users,email',
            'password'    => 'required|min:8',
            'chuyen_mon'  => 'required|in:ly_thuyet,thuc_hanh,ca_hai',
            'anh_dai_dien' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        DB::beginTransaction();
        try {
            $user = User::create([
                'ho_ten'        => $request->ho_ten,
                'email'         => $request->email,
                'password'      => Hash::make($request->password),
                'role'          => 'giang_vien',
                'so_dien_thoai' => $request->so_dien_thoai ?? null,
                'is_active'     => true,
            ]);

            $anhPath = null;
            if ($request->hasFile('anh_dai_dien')) {
                $file     = $request->file('anh_dai_dien');
                $fileName = 'giangvien_' . preg_replace('/[^a-zA-Z0-9]/', '', $request->ho_ten) . '_' . time() . '.' . $file->getClientOriginalExtension();
                $file->move(public_path('uploads/giang_vien'), $fileName);
                $anhPath = 'giang_vien/' . $fileName;
            }

            GiangVien::create([
                'user_id'         => $user->id,
                'chuyen_mon'      => $request->chuyen_mon,
                'bang_cap'        => $request->bang_cap ?? null,
                'nam_kinh_nghiem' => $request->nam_kinh_nghiem ?? 0,
                'ghi_chu'         => $request->ghi_chu ?? null,
                'anh_dai_dien'    => $anhPath,
            ]);

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Tạo tài khoản giảng viên thành công'], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ─── Cập nhật thông tin giảng viên ───────────────────────────────────────
    public function capNhatGiangVien(Request $request, $id)
    {
        $giangVien = GiangVien::with('user')->findOrFail($id);

        $request->validate([
            'ho_ten'          => 'required|string|max:255',
            'email'           => 'required|email|unique:users,email,' . $giangVien->user_id,
            'password'        => 'required|string|min:8',
            'so_dien_thoai'   => 'required|string|regex:/^0\d{9}$/',
            'chuyen_mon'      => 'required|in:ly_thuyet,thuc_hanh,ca_hai',
            'bang_cap'        => 'nullable|string|max:255',
            'nam_kinh_nghiem' => 'nullable|integer|min:0',
            'ghi_chu'         => 'nullable|string',
            'anh_dai_dien'    => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        // Cập nhật user
        $userUpdate = [
            'ho_ten'        => $request->ho_ten,
            'email'         => $request->email,
            'so_dien_thoai' => $request->so_dien_thoai,
            'password'      => bcrypt($request->password),
        ];

        $giangVien->user->update($userUpdate);

        // Xử lý ảnh mới nếu có
        $anhPath = $giangVien->anh_dai_dien;
        if ($request->hasFile('anh_dai_dien')) {
            $file     = $request->file('anh_dai_dien');
            $fileName = 'giangvien_' . preg_replace('/[^a-zA-Z0-9]/', '', $giangVien->user->ho_ten) . '_' . time() . '.' . $file->getClientOriginalExtension();
            $file->move(public_path('uploads/giang_vien'), $fileName);
            $anhPath = 'giang_vien/' . $fileName;
        }

        // Cập nhật giảng viên
        $giangVien->update([
            'chuyen_mon'      => $request->chuyen_mon,
            'bang_cap'        => $request->bang_cap,
            'nam_kinh_nghiem' => $request->nam_kinh_nghiem ?? 0,
            'ghi_chu'         => $request->ghi_chu,
            'anh_dai_dien'    => $anhPath,
        ]);

        return response()->json(['success' => true, 'message' => 'Cập nhật giảng viên thành công']);
    }

    // ─── Xóa giảng viên ──────────────────────────────────────────────────────
    public function xoaGiangVien($id)
    {
        $giangVien = GiangVien::with('user')->findOrFail($id);

        // Kiểm tra giảng viên có đang dạy lớp nào không
        $lopDangDay = LopHoc::where('giang_vien_ly_thuyet_id', $giangVien->id)
            ->orWhere('giang_vien_thuc_hanh_id', $giangVien->id)
            ->where('trang_thai', 'dang_hoc')
            ->count();

        if ($lopDangDay > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa giảng viên đang phụ trách lớp học',
            ], 400);
        }

        DB::beginTransaction();
        try {
            $userId = $giangVien->user_id;
            $giangVien->delete();
            User::where('id', $userId)->delete();
            DB::commit();
            return response()->json(['success' => true, 'message' => 'Đã xóa giảng viên thành công']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ─── Kích hoạt / vô hiệu hóa tài khoản ──────────────────────────────────
    public function toggleUser($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => !$user->is_active]);
        $status = $user->is_active ? 'kích hoạt' : 'vô hiệu hóa';
        return response()->json(['success' => true, 'message' => "Đã {$status} tài khoản"]);
    }

    // ─── Chart kết quả thi theo kỳ ───────────────────────────────────────────
    // ky: tuan (7 ngày gần nhất), thang (30 ngày → 4 tuần), nam (12 tháng)
    public function chartKetQuaThi(Request $request)
    {
        $ky   = $request->ky ?? 'tuan';
        $data = [];

        // Helper tính kết quả tổng hợp từ tập hợp bản ghi ket_qua_thi
        $tinhKetQua = function ($rows) {
            $nhom = collect($rows)->groupBy(fn($r) => $r->ho_so_id . '_' . $r->lich_thi_id);
            $dat = 0; $khongDat = 0; $vangMat = 0;
            foreach ($nhom as $ds) {
                $kqList = collect($ds)->pluck('ket_qua');
                if ($kqList->contains('vang_mat'))                           $vangMat++;
                elseif ($kqList->every(fn($kq) => $kq === 'dat'))            $dat++;
                else                                                          $khongDat++;
            }
            return compact('dat', 'khongDat', 'vangMat');
        };

        switch ($ky) {
            // 7 ngày gần nhất (mỗi cột = 1 ngày)
            case 'tuan':
                for ($i = 6; $i >= 0; $i--) {
                    $date = now()->subDays($i);
                    $rows = DB::table('ket_qua_thi')
                        ->join('lich_thi', 'lich_thi.id', '=', 'ket_qua_thi.lich_thi_id')
                        ->whereDate('lich_thi.ngay_thi', $date->toDateString())
                        ->whereNotNull('ket_qua_thi.ket_qua')
                        ->select('ket_qua_thi.ho_so_id', 'ket_qua_thi.lich_thi_id', 'ket_qua_thi.ket_qua')
                        ->get();
                    $r = $tinhKetQua($rows);
                    $data[] = [
                        'label'     => $date->format('d/m'),
                        'dat'       => $r['dat'],
                        'khong_dat' => $r['khongDat'],
                        'vang_mat'  => $r['vangMat'],
                    ];
                }
                break;

            // 30 ngày gần nhất → chia 4 tuần (mỗi cột = 1 tuần)
            case 'thang':
                for ($i = 3; $i >= 0; $i--) {
                    $from = now()->subDays($i * 7 + 6)->startOfDay();
                    $to   = now()->subDays($i * 7)->endOfDay();
                    $rows = DB::table('ket_qua_thi')
                        ->join('lich_thi', 'lich_thi.id', '=', 'ket_qua_thi.lich_thi_id')
                        ->whereBetween('lich_thi.ngay_thi', [$from, $to])
                        ->whereNotNull('ket_qua_thi.ket_qua')
                        ->select('ket_qua_thi.ho_so_id', 'ket_qua_thi.lich_thi_id', 'ket_qua_thi.ket_qua')
                        ->get();
                    $r = $tinhKetQua($rows);
                    $data[] = [
                        'label'     => $from->format('d/m') . '–' . $to->format('d/m'),
                        'dat'       => $r['dat'],
                        'khong_dat' => $r['khongDat'],
                        'vang_mat'  => $r['vangMat'],
                    ];
                }
                break;

            // 12 tháng gần nhất (mỗi cột = 1 tháng)
            case 'nam':
            default:
                for ($i = 11; $i >= 0; $i--) {
                    $date  = now()->subMonths($i);
                    $rows = DB::table('ket_qua_thi')
                        ->join('lich_thi', 'lich_thi.id', '=', 'ket_qua_thi.lich_thi_id')
                        ->whereMonth('lich_thi.ngay_thi', $date->month)
                        ->whereYear('lich_thi.ngay_thi', $date->year)
                        ->whereNotNull('ket_qua_thi.ket_qua')
                        ->select('ket_qua_thi.ho_so_id', 'ket_qua_thi.lich_thi_id', 'ket_qua_thi.ket_qua')
                        ->get();
                    $r = $tinhKetQua($rows);
                    $data[] = [
                        'label'     => 'T' . $date->format('n/y'),
                        'dat'       => $r['dat'],
                        'khong_dat' => $r['khongDat'],
                        'vang_mat'  => $r['vangMat'],
                    ];
                }
                break;
        }

        return response()->json(['success' => true, 'data' => $data]);
    }

    // ─── Dashboard Extra: dữ liệu biểu đồ bổ sung ───────────────────────────
    public function dashboardExtra()
    {
        // ── 1. Trạng thái lớp học ──────────────────────────────────────────
        $lopTheoTrangThai = LopHoc::selectRaw('trang_thai, COUNT(*) as tong')
            ->groupBy('trang_thai')
            ->pluck('tong', 'trang_thai')
            ->toArray();

        $lopData = [
            ['name' => 'Chuẩn bị',    'value' => $lopTheoTrangThai['chuan_bi']    ?? 0, 'color' => '#f59e0b'],
            ['name' => 'Đang học',     'value' => $lopTheoTrangThai['dang_hoc']    ?? 0, 'color' => '#10b981'],
            ['name' => 'Đã kết thúc',  'value' => $lopTheoTrangThai['da_ket_thuc'] ?? 0, 'color' => '#94a3b8'],
        ];

        // ── 1b. Trạng thái khóa học đào tạo ──────────────────────────────
        $khoaTheoTrangThai = \App\Models\KhoaHoc::whereNotNull('ma_khoa')
            ->selectRaw('trang_thai_khoa, COUNT(*) as tong')
            ->groupBy('trang_thai_khoa')
            ->pluck('tong', 'trang_thai_khoa')
            ->toArray();

        $khoaData = [
            ['name' => 'Chuẩn bị',    'value' => $khoaTheoTrangThai['chuan_bi']    ?? 0, 'color' => '#3b82f6'],
            ['name' => 'Đang học',     'value' => $khoaTheoTrangThai['dang_hoc']    ?? 0, 'color' => '#10b981'],
            ['name' => 'Đã kết thúc',  'value' => $khoaTheoTrangThai['da_ket_thuc'] ?? 0, 'color' => '#94a3b8'],
        ];

        // ── 2. Tình trạng xe ──────────────────────────────────────────────
        $xeTheoTrangThai = DB::table('xe')
            ->selectRaw('trang_thai, COUNT(*) as tong')
            ->groupBy('trang_thai')
            ->pluck('tong', 'trang_thai')
            ->toArray();

        $xeData = [
            ['name' => 'Sẵn sàng', 'value' => $xeTheoTrangThai['san_sang'] ?? 0, 'color' => '#10b981'],
            ['name' => 'Bảo trì',  'value' => $xeTheoTrangThai['bao_tri']  ?? 0, 'color' => '#f59e0b'],
            ['name' => 'Hỏng',     'value' => $xeTheoTrangThai['hong']     ?? 0, 'color' => '#ef4444'],
        ];

        $tongXe     = array_sum(array_column($xeData, 'value'));
        $xeSanSang  = $xeTheoTrangThai['san_sang'] ?? 0;

        // ── 3. Giảng viên (chuyên môn & trạng thái) ──────────────────────
        $giangVienTheoChuyenMon = DB::table('giang_vien')
            ->join('users', 'users.id', '=', 'giang_vien.user_id')
            ->selectRaw('giang_vien.chuyen_mon, COUNT(*) as tong, SUM(CASE WHEN users.is_active=1 THEN 1 ELSE 0 END) as active')
            ->groupBy('giang_vien.chuyen_mon')
            ->get();

        $gvData = $giangVienTheoChuyenMon->map(fn($r) => [
            'name'   => match($r->chuyen_mon) {
                'ly_thuyet' => 'Lý thuyết',
                'thuc_hanh' => 'Thực hành',
                'ca_hai'    => 'Cả hai',
                default     => $r->chuyen_mon,
            },
            'tong'   => (int) $r->tong,
            'active' => (int) $r->active,
        ])->values()->toArray();

        $tongGV     = array_sum(array_column($gvData, 'tong'));
        $gvActive   = array_sum(array_column($gvData, 'active'));

        // ── 3b. Học viên theo hạng bằng ──────────────────────────────────
        $hvTheoHangBang = DB::table('ho_so_hoc_vien')
            ->join('khoa_hoc', 'khoa_hoc.id', '=', 'ho_so_hoc_vien.khoa_hoc_id')
            ->selectRaw('khoa_hoc.loai_bang as hang_bang, COUNT(*) as tong')
            ->groupBy('khoa_hoc.loai_bang')
            ->orderBy('hang_bang')
            ->pluck('tong', 'hang_bang')
            ->toArray();

        // ── 3c. Xe theo hạng bằng (số lượng xe phục vụ mỗi hạng) ────────
        $xeTheoHangBang = DB::table('xe')
            ->whereNotNull('hang_bang')
            ->selectRaw('hang_bang, COUNT(*) as tong')
            ->groupBy('hang_bang')
            ->orderBy('hang_bang')
            ->pluck('tong', 'hang_bang')
            ->toArray();

        // ── 3d. Lớp học theo hạng bằng ───────────────────────────────────
        $lopTheoHangBang = DB::table('lop_hoc')
            ->join('khoa_hoc', 'khoa_hoc.id', '=', 'lop_hoc.khoa_hoc_id')
            ->selectRaw('khoa_hoc.loai_bang as hang_bang, COUNT(*) as tong')
            ->groupBy('khoa_hoc.loai_bang')
            ->orderBy('hang_bang')
            ->pluck('tong', 'hang_bang')
            ->toArray();

        // Gộp tất cả hạng bằng xuất hiện từ 3 nguồn
        $tatCaHangBang = array_unique(array_merge(
            array_keys($hvTheoHangBang),
            array_keys($xeTheoHangBang),
            array_keys($lopTheoHangBang)
        ));
        sort($tatCaHangBang);

        $hangBangColors = ['A1'=>'#f59e0b','A2'=>'#f97316','B1'=>'#3b82f6','B2'=>'#8b5cf6','C'=>'#10b981','D'=>'#06b6d4','E'=>'#ef4444','F'=>'#ec4899'];

        $thongKeHangBang = array_map(fn($hb) => [
            'hang_bang'  => $hb,
            'hoc_vien'   => $hvTheoHangBang[$hb]   ?? 0,
            'xe'         => $xeTheoHangBang[$hb]    ?? 0,
            'lop_hoc'    => $lopTheoHangBang[$hb]   ?? 0,
            'color'      => $hangBangColors[$hb]     ?? '#64748b',
        ], $tatCaHangBang);

        // ── 4. Lịch thi sắp tới (30 ngày tới) ───────────────────────────
        $lichThiSapToi = DB::table('lich_thi')
            ->join('khoa_hoc', 'khoa_hoc.id', '=', 'lich_thi.khoa_hoc_id')
            ->select('lich_thi.id', 'lich_thi.ngay_thi', 'lich_thi.gio_thi', 'lich_thi.loai_thi', 'lich_thi.dia_diem', 'khoa_hoc.ten_khoa', 'khoa_hoc.loai_bang')
            ->whereBetween('lich_thi.ngay_thi', [today(), today()->addDays(30)])
            ->orderBy('lich_thi.ngay_thi')
            ->limit(5)
            ->get()
            ->map(fn($lt) => [
                'id'        => $lt->id,
                'ngay_thi'  => $lt->ngay_thi,
                'gio_thi'   => $lt->gio_thi,
                'loai_thi'  => $lt->loai_thi,
                'dia_diem'  => $lt->dia_diem,
                'ten_khoa'  => $lt->ten_khoa,
                'loai_bang' => $lt->loai_bang,
                // Số học viên được xếp vào lịch thi
                'so_hv'     => DB::table('lich_thi_hoc_vien')->where('lich_thi_id', $lt->id)->count(),
            ]);

        // ── 5. Kết quả thi tổng hợp (3 tháng gần nhất) ──────────────────
        // Đếm theo HỌC VIÊN (ho_so_id distinct), không phải theo số bài thi.
        // Một học viên có thể thi nhiều bài → nhiều bản ghi ket_qua_thi.
        // Kết quả tổng hợp của học viên:
        //   - Đạt:       tất cả bài đều 'dat'
        //   - Vắng mặt:  có ít nhất 1 bài 'vang_mat'
        //   - Không đạt: còn lại (có bài 'khong_dat', không có 'vang_mat')
        $ketQuaThiData = [];
        for ($i = 2; $i >= 0; $i--) {
            $date  = now()->subMonths($i);
            $month = $date->month;
            $year  = $date->year;

            // Lấy tất cả học viên có kết quả thi trong tháng này
            // Nhóm theo (ho_so_id, lich_thi_id) để tính kết quả tổng hợp mỗi lần thi
            $hocVienThang = DB::table('ket_qua_thi')
                ->join('lich_thi', 'lich_thi.id', '=', 'ket_qua_thi.lich_thi_id')
                ->whereMonth('lich_thi.ngay_thi', $month)
                ->whereYear('lich_thi.ngay_thi', $year)
                ->whereNotNull('ket_qua_thi.ket_qua')
                ->select('ket_qua_thi.ho_so_id', 'ket_qua_thi.lich_thi_id', 'ket_qua_thi.ket_qua')
                ->get();

            // Nhóm theo (ho_so_id, lich_thi_id) → tính kết quả tổng hợp
            $nhom = $hocVienThang->groupBy(fn($r) => $r->ho_so_id . '_' . $r->lich_thi_id);

            $dat = 0; $khongDat = 0; $vangMat = 0;
            foreach ($nhom as $dsKetQua) {
                $ketQuaList = $dsKetQua->pluck('ket_qua');
                if ($ketQuaList->contains('vang_mat')) {
                    $vangMat++;
                } elseif ($ketQuaList->every(fn($kq) => $kq === 'dat')) {
                    $dat++;
                } else {
                    $khongDat++;
                }
            }

            $ketQuaThiData[] = [
                'label'     => 'T' . $date->format('n/y'),
                'dat'       => $dat,
                'khong_dat' => $khongDat,
                'vang_mat'  => $vangMat,
            ];
        }

        return response()->json([
            'success'           => true,
            'lop_hoc'           => $lopData,
            'khoa_hoc'          => $khoaData,
            'xe'                => ['data' => $xeData, 'tong' => $tongXe, 'san_sang' => $xeSanSang],
            'giang_vien'        => ['data' => $gvData, 'tong' => $tongGV, 'active' => $gvActive],
            'lich_thi'          => $lichThiSapToi,
            'ket_qua_thi'       => $ketQuaThiData,
            'thong_ke_hang_bang'=> $thongKeHangBang,
        ]);
    }

    // ─── Trigger thủ công khai giảng ─────────────────────────────────────────
    // Đồng bộ trạng thái lớp + học viên: dùng khi lớp bị kẹt ở "chuan_bi"
    // mặc dù đã có học viên và đã qua ngày khai giảng
    public function triggerKhaiGiang(Request $request)
    {
        // Nếu truyền lop_hoc_id thì chỉ xử lý lớp đó, không thì xử lý tất cả lớp đủ điều kiện
        $query = LopHoc::where('trang_thai', 'chuan_bi')
            ->withCount('hocVienLop')
            ->having('hoc_vien_lop_count', '>=', 1)
            ->whereNotNull('ngay_khai_giang')
            ->whereDate('ngay_khai_giang', '<=', today());

        if ($request->lop_hoc_id) {
            $query->where('id', $request->lop_hoc_id);
        }

        $lopList = $query->get();

        if ($lopList->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Không có lớp nào đủ điều kiện khai giảng (cần: trạng thái chuẩn bị, có học viên, đã đến ngày khai giảng)',
            ], 400);
        }

        $ketQua = [];

        foreach ($lopList as $lop) {
            DB::beginTransaction();
            try {
                $lop->update(['trang_thai' => 'dang_hoc']);

                $soHV = HoSoHocVien::whereHas('hocVienLop', fn($q) => $q->where('lop_hoc_id', $lop->id))
                    ->where('trang_thai', 'chuan_bi_hoc')
                    ->update(['trang_thai' => 'dang_hoc']);

                // Đồng bộ trạng thái khóa học
                \App\Models\KhoaHoc::where('id', $lop->khoa_hoc_id)
                    ->update(['trang_thai_khoa' => 'dang_hoc']);

                DB::commit();

                $ketQua[] = [
                    'lop'      => $lop->ten_lop,
                    'hoc_vien' => $soHV,
                ];
            } catch (\Throwable $e) {
                DB::rollBack();
                $ketQua[] = ['lop' => $lop->ten_lop, 'loi' => $e->getMessage()];
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã khai giảng ' . count($ketQua) . ' lớp',
            'data'    => $ketQua,
        ]);
    }

    // ════════════════════════════════════════════════════════════════
    // AI ANALYTICS — Các API thống kê linh hoạt phục vụ AI Assistant
    // ════════════════════════════════════════════════════════════════

    /**
     * Thống kê doanh thu theo khoảng thời gian tùy chỉnh.
     * Query params: tu_ngay, den_ngay (YYYY-MM-DD), nhom_theo (ngay|tuan|thang)
     */
    public function aiDoanhThuTheoKhoang(Request $request)
    {
        $request->validate([
            'tu_ngay'   => 'required|date',
            'den_ngay'  => 'required|date|after_or_equal:tu_ngay',
            'nhom_theo' => 'nullable|in:ngay,tuan,thang',
        ]);

        $tuNgay  = \Carbon\Carbon::parse($request->tu_ngay)->startOfDay();
        $denNgay = \Carbon\Carbon::parse($request->den_ngay)->endOfDay();
        $nhomTheo = $request->nhom_theo ?? 'ngay';

        // Tổng doanh thu toàn khoảng
        $tongDoanhThu = ThanhToanHocPhi::where('trang_thai', 'thanh_cong')
            ->whereBetween('ngay_thanh_toan', [$tuNgay, $denNgay])
            ->sum('so_tien');

        // Chi tiết theo loại phí
        $theoLoai = ThanhToanHocPhi::where('trang_thai', 'thanh_cong')
            ->whereBetween('ngay_thanh_toan', [$tuNgay, $denNgay])
            ->selectRaw('loai_phi, SUM(so_tien) as tong, COUNT(*) as so_luong')
            ->groupBy('loai_phi')
            ->get();

        // Chi tiết theo phương thức
        $theoPhuongThuc = ThanhToanHocPhi::where('trang_thai', 'thanh_cong')
            ->whereBetween('ngay_thanh_toan', [$tuNgay, $denNgay])
            ->selectRaw('phuong_thuc, SUM(so_tien) as tong, COUNT(*) as so_luong')
            ->groupBy('phuong_thuc')
            ->get();

        // Dữ liệu theo nhóm thời gian
        $chiTiet = [];
        $current = $tuNgay->copy();

        while ($current->lte($denNgay)) {
            switch ($nhomTheo) {
                case 'thang':
                    $start = $current->copy()->startOfMonth();
                    $end   = $current->copy()->endOfMonth()->min($denNgay);
                    $label = $current->format('m/Y');
                    $next  = $current->addMonth();
                    break;
                case 'tuan':
                    $start = $current->copy()->startOfWeek();
                    $end   = $current->copy()->endOfWeek()->min($denNgay);
                    $label = 'T' . $current->weekOfYear . '/' . $current->year;
                    $next  = $current->addWeek();
                    break;
                default: // ngay
                    $start = $current->copy()->startOfDay();
                    $end   = $current->copy()->endOfDay();
                    $label = $current->format('d/m/Y');
                    $next  = $current->addDay();
                    break;
            }

            $doanh = ThanhToanHocPhi::where('trang_thai', 'thanh_cong')
                ->whereBetween('ngay_thanh_toan', [$start, $end])
                ->sum('so_tien');

            $chiTiet[] = ['label' => $label, 'doanh_thu' => (float) $doanh];

            if ($nhomTheo === 'ngay' && $chiTiet && count($chiTiet) > 366) break;
        }

        return response()->json([
            'success'          => true,
            'tu_ngay'          => $tuNgay->format('d/m/Y'),
            'den_ngay'         => $denNgay->format('d/m/Y'),
            'tong_doanh_thu'   => (float) $tongDoanhThu,
            'theo_loai_phi'    => $theoLoai,
            'theo_phuong_thuc' => $theoPhuongThuc,
            'chi_tiet'         => $chiTiet,
        ]);
    }

    /**
     * Thống kê học viên đăng ký/hoàn thành theo khoảng thời gian tùy chỉnh.
     * Query params: tu_ngay, den_ngay, nhom_theo (ngay|tuan|thang)
     */
    public function aiHocVienTheoKhoang(Request $request)
    {
        $request->validate([
            'tu_ngay'   => 'required|date',
            'den_ngay'  => 'required|date|after_or_equal:tu_ngay',
            'nhom_theo' => 'nullable|in:ngay,tuan,thang',
        ]);

        $tuNgay   = \Carbon\Carbon::parse($request->tu_ngay)->startOfDay();
        $denNgay  = \Carbon\Carbon::parse($request->den_ngay)->endOfDay();
        $nhomTheo = $request->nhom_theo ?? 'thang';

        // Tổng đăng ký trong khoảng
        $tongDangKy = HoSoHocVien::whereBetween('created_at', [$tuNgay, $denNgay])->count();

        // Đăng ký theo nguồn (online/offline)
        $theoNguon = HoSoHocVien::whereBetween('created_at', [$tuNgay, $denNgay])
            ->selectRaw('nguon_dang_ky, COUNT(*) as so_luong')
            ->groupBy('nguon_dang_ky')
            ->get();

        // Đăng ký theo hạng bằng
        $theoHangBang = HoSoHocVien::with('khoaHoc')
            ->whereBetween('created_at', [$tuNgay, $denNgay])
            ->join('khoa_hoc', 'ho_so_hoc_vien.khoa_hoc_id', '=', 'khoa_hoc.id')
            ->selectRaw('khoa_hoc.loai_bang, COUNT(*) as so_luong')
            ->groupBy('khoa_hoc.loai_bang')
            ->get();

        // Số học viên hoàn thành (nhận bằng) trong khoảng
        $tongHoanThanh = HoSoHocVien::whereIn('trang_thai', ['da_cap_bang'])
            ->whereBetween('updated_at', [$tuNgay, $denNgay])
            ->count();

        // Phân bổ theo trạng thái hiện tại (snapshot)
        $theoTrangThai = HoSoHocVien::whereBetween('created_at', [$tuNgay, $denNgay])
            ->selectRaw('trang_thai, COUNT(*) as so_luong')
            ->groupBy('trang_thai')
            ->get();

        // Chi tiết theo thời gian
        $chiTiet = [];
        $current = $tuNgay->copy();

        while ($current->lte($denNgay)) {
            switch ($nhomTheo) {
                case 'thang':
                    $start = $current->copy()->startOfMonth();
                    $end   = $current->copy()->endOfMonth()->min($denNgay);
                    $label = $current->format('m/Y');
                    $current->addMonth();
                    break;
                case 'tuan':
                    $start = $current->copy()->startOfWeek();
                    $end   = $current->copy()->endOfWeek()->min($denNgay);
                    $label = 'T' . $current->weekOfYear . '/' . $current->year;
                    $current->addWeek();
                    break;
                default: // ngay
                    $start = $current->copy()->startOfDay();
                    $end   = $current->copy()->endOfDay();
                    $label = $current->format('d/m/Y');
                    $current->addDay();
                    break;
            }

            $chiTiet[] = [
                'label'       => $label,
                'dang_ky'     => HoSoHocVien::whereBetween('created_at', [$start, $end])->count(),
                'hoan_thanh'  => HoSoHocVien::where('trang_thai', 'da_cap_bang')
                    ->whereBetween('updated_at', [$start, $end])->count(),
            ];

            if ($nhomTheo === 'ngay' && count($chiTiet) > 366) break;
        }

        return response()->json([
            'success'         => true,
            'tu_ngay'         => $tuNgay->format('d/m/Y'),
            'den_ngay'        => $denNgay->format('d/m/Y'),
            'tong_dang_ky'    => $tongDangKy,
            'tong_hoan_thanh' => $tongHoanThanh,
            'theo_nguon'      => $theoNguon,
            'theo_hang_bang'  => $theoHangBang,
            'theo_trang_thai' => $theoTrangThai,
            'chi_tiet'        => $chiTiet,
        ]);
    }

    /**
     * Lấy toàn bộ lịch dạy của một giảng viên trong khoảng thời gian.
     * Query params: giang_vien_id (required), tu_ngay, den_ngay
     * Nếu không truyền ngày → lấy 30 ngày tới.
     */
    public function aiLichDayGiangVien(Request $request)
    {
        $request->validate([
            'giang_vien_id' => 'required|exists:giang_vien,id',
            'tu_ngay'       => 'nullable|date',
            'den_ngay'      => 'nullable|date',
        ]);

        $gvId    = $request->giang_vien_id;
        $tuNgay  = \Carbon\Carbon::parse($request->tu_ngay  ?? now())->startOfDay();
        $denNgay = \Carbon\Carbon::parse($request->den_ngay ?? now()->addDays(30))->endOfDay();

        $giangVien = \App\Models\GiangVien::with('user')->findOrFail($gvId);

        // Lấy tất cả lớp mà GV này phụ trách (cả LT lẫn TH)
        $lopIds = LopHoc::where(function ($q) use ($gvId) {
            $q->where('giang_vien_ly_thuyet_id', $gvId)
              ->orWhere('giang_vien_thuc_hanh_id', $gvId);
        })->pluck('id');

        // Lấy lịch học của các lớp đó trong khoảng thời gian
        $lichHoc = LichHoc::with(['lopHoc.khoaHoc'])
            ->whereIn('lop_hoc_id', $lopIds)
            ->whereBetween('ngay_hoc', [$tuNgay->toDateString(), $denNgay->toDateString()])
            ->orderBy('ngay_hoc')
            ->orderBy('gio_bat_dau')
            ->get()
            ->map(function ($lh) use ($gvId) {
                $vaiTro = '';
                if ($lh->lopHoc->giang_vien_ly_thuyet_id == $gvId) {
                    $vaiTro = 'ly_thuyet';
                }
                if ($lh->lopHoc->giang_vien_thuc_hanh_id == $gvId) {
                    $vaiTro .= ($vaiTro ? '+' : '') . 'thuc_hanh';
                }
                return [
                    'id'           => $lh->id,
                    'ten_lop'      => $lh->lopHoc->ten_lop,
                    'loai_bang'    => $lh->lopHoc->khoaHoc->loai_bang ?? null,
                    'ngay_hoc'     => $lh->ngay_hoc->format('Y-m-d'),
                    'thu_trong_tuan' => $lh->ngay_hoc->locale('vi')->dayName,
                    'gio_bat_dau'  => $lh->gio_bat_dau,
                    'gio_ket_thuc' => $lh->gio_ket_thuc,
                    'loai_buoi'    => $lh->loai_buoi,
                    'vai_tro_gv'   => $vaiTro,
                    'dia_diem'     => $lh->dia_diem,
                ];
            });

        // Tổng hợp theo ngày để dễ phân tích khoảng trống
        $lichTheoNgay = $lichHoc->groupBy('ngay_hoc')->map(function ($buois) {
            return $buois->map(fn($b) => [
                'lop'          => $b['ten_lop'],
                'gio'          => $b['gio_bat_dau'] . '–' . $b['gio_ket_thuc'],
                'loai'         => $b['loai_buoi'],
                'vai_tro'      => $b['vai_tro_gv'],
            ])->values();
        });

        // Tính các ngày GV KHÔNG có lịch dạy trong khoảng
        $ngayCoLich = $lichHoc->pluck('ngay_hoc')->unique()->values();
        $ngayRanh   = [];
        $cursor     = $tuNgay->copy();
        while ($cursor->lte($denNgay)) {
            $ds = $cursor->toDateString();
            if (!$ngayCoLich->contains($ds)) {
                $ngayRanh[] = [
                    'ngay'          => $ds,
                    'thu_trong_tuan' => $cursor->locale('vi')->dayName,
                ];
            }
            $cursor->addDay();
        }

        return response()->json([
            'success'      => true,
            'giang_vien'   => [
                'id'          => $giangVien->id,
                'ho_ten'      => $giangVien->user->ho_ten ?? '—',
                'chuyen_mon'  => $giangVien->chuyen_mon,
                'trang_thai'  => $giangVien->trang_thai,
            ],
            'tu_ngay'        => $tuNgay->format('d/m/Y'),
            'den_ngay'        => $denNgay->format('d/m/Y'),
            'tong_buoi_day'  => $lichHoc->count(),
            'lich_theo_ngay' => $lichTheoNgay,
            'lich_chi_tiet'  => $lichHoc->values(),
            'ngay_ranh'      => $ngayRanh,
        ]);
    }

    /**
     * Gợi ý khung giờ trống cho một giảng viên trong ngày/tuần cụ thể.
     * Trả về: các khung giờ GV đang bận + phân tích khoảng trống khả dụng.
     * Query params: giang_vien_id, ngay (YYYY-MM-DD), gio_bat_dau_du_kien, gio_ket_thuc_du_kien
     */
    public function aiGoiYLichDay(Request $request)
    {
        $request->validate([
            'giang_vien_id'       => 'required|exists:giang_vien,id',
            'ngay'                => 'required|date',
            'gio_bat_dau_du_kien' => 'nullable|date_format:H:i',
            'gio_ket_thuc_du_kien'=> 'nullable|date_format:H:i',
        ]);

        $gvId = $request->giang_vien_id;
        $ngay = \Carbon\Carbon::parse($request->ngay)->toDateString();

        $giangVien = \App\Models\GiangVien::with('user')->findOrFail($gvId);

        // Lấy tất cả lớp GV phụ trách
        $lopIds = LopHoc::where(function ($q) use ($gvId) {
            $q->where('giang_vien_ly_thuyet_id', $gvId)
              ->orWhere('giang_vien_thuc_hanh_id', $gvId);
        })->pluck('id');

        // Lịch trong ngày được yêu cầu
        $lichTrongNgay = LichHoc::with('lopHoc')
            ->whereIn('lop_hoc_id', $lopIds)
            ->where('ngay_hoc', $ngay)
            ->orderBy('gio_bat_dau')
            ->get()
            ->map(fn($lh) => [
                'ten_lop'      => $lh->lopHoc->ten_lop ?? '—',
                'gio_bat_dau'  => $lh->gio_bat_dau,
                'gio_ket_thuc' => $lh->gio_ket_thuc,
                'loai_buoi'    => $lh->loai_buoi,
            ]);

        // Tính khoảng trống trong ngày (giả sử ca làm việc 06:00–21:00)
        $CA_BAT_DAU = '06:00';
        $CA_KET_THUC = '21:00';

        $khoangBan = $lichTrongNgay->map(fn($l) => [
            'tu' => $l['gio_bat_dau'],
            'den' => $l['gio_ket_thuc'],
        ])->sortBy('tu')->values()->toArray();

        $khoangTrong = [];
        $current = $CA_BAT_DAU;

        foreach ($khoangBan as $ban) {
            if ($current < $ban['tu']) {
                $khoangTrong[] = ['tu' => $current, 'den' => $ban['tu']];
            }
            if ($current < $ban['den']) {
                $current = $ban['den'];
            }
        }
        if ($current < $CA_KET_THUC) {
            $khoangTrong[] = ['tu' => $current, 'den' => $CA_KET_THUC];
        }

        // Kiểm tra khung giờ dự kiến có khả dụng không
        $kiemTraKhung = null;
        if ($request->gio_bat_dau_du_kien && $request->gio_ket_thuc_du_kien) {
            $gdBD = $request->gio_bat_dau_du_kien;
            $gdKT = $request->gio_ket_thuc_du_kien;

            $trung = $lichTrongNgay->first(fn($l) =>
                $l['gio_bat_dau'] < $gdKT && $l['gio_ket_thuc'] > $gdBD
            );

            $kiemTraKhung = [
                'gio_bat_dau'  => $gdBD,
                'gio_ket_thuc' => $gdKT,
                'kha_dung'     => is_null($trung),
                'bi_trung_voi' => $trung ? $trung['ten_lop'] . ' (' . $trung['gio_bat_dau'] . '–' . $trung['gio_ket_thuc'] . ')' : null,
            ];
        }

        return response()->json([
            'success'       => true,
            'giang_vien'    => [
                'id'         => $giangVien->id,
                'ho_ten'     => $giangVien->user->ho_ten ?? '—',
                'chuyen_mon' => $giangVien->chuyen_mon,
                'trang_thai' => $giangVien->trang_thai,
            ],
            'ngay'            => \Carbon\Carbon::parse($ngay)->locale('vi')->isoFormat('dddd, DD/MM/YYYY'),
            'thu_trong_tuan'  => \Carbon\Carbon::parse($ngay)->locale('vi')->dayName,
            'lich_trong_ngay' => $lichTrongNgay->values(),
            'khung_gio_ban'   => $khoangBan,
            'khung_gio_trong' => $khoangTrong,
            'kiem_tra_khung'  => $kiemTraKhung,
        ]);
    }
}
