<?php

namespace App\Http\Controllers;

use App\Models\Xe;
use App\Models\BaoLoiXe;
use App\Models\GiangVien;
use App\Models\LichHoc;
use App\Models\LopHoc;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class XeController extends Controller
{
    // ═══════════════════════════════════════════════════════
    // ADMIN — Quản lý xe
    // ═══════════════════════════════════════════════════════

    // Danh sách xe
    public function index(Request $request)
    {
        $query = Xe::withCount(['baoLoi' => fn($q) => $q->where('trang_thai', '!=', 'da_xu_ly')])
            ->when($request->trang_thai, fn($q) => $q->where('trang_thai', $request->trang_thai))
            ->when($request->hang_bang,  fn($q) => $q->where('hang_bang', $request->hang_bang))
            ->when($request->search,     fn($q) => $q->where('bien_so', 'like', "%{$request->search}%")
                ->orWhere('hang_xe', 'like', "%{$request->search}%"))
            ->orderBy('bien_so');

        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    // Chi tiết xe
    public function show($id)
    {
        $xe = Xe::with([
            'baoLoi.giangVien.user',
            'lichHoc' => fn($q) => $q->with('lopHoc')->orderByDesc('ngay_hoc')->limit(10),
        ])->findOrFail($id);

        return response()->json(['success' => true, 'data' => $xe]);
    }

    // Thêm xe mới
    public function store(Request $request)
    {
        $request->validate([
            'bien_so'    => 'required|string|max:20|unique:xe,bien_so',
            'hang_xe'    => 'required|string|max:50',
            'hang_bang'  => 'required|in:A1,A,B1,B2,C1,C,C2,D,E,CE',
            'loai_xe'    => 'required|in:so_san,so_tu_dong',
            'anh_xe'     => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $anhPath = null;
        if ($request->hasFile('anh_xe')) {
            $file     = $request->file('anh_xe');
            $fileName = 'xe_' . preg_replace('/[^a-zA-Z0-9]/', '', $request->bien_so) . '_' . time() . '.' . $file->getClientOriginalExtension();
            $file->move(public_path('uploads/xe'), $fileName);
            $anhPath = 'xe/' . $fileName;
        }

        $data = $request->except('anh_xe');
        $data['anh_xe'] = $anhPath;

        $xe = Xe::create($data);
        return response()->json(['success' => true, 'message' => 'Thêm xe thành công', 'data' => $xe], 201);
    }

    // Cập nhật xe
    public function update(Request $request, $id)
    {
        $xe = Xe::findOrFail($id);
        $request->validate([
            'bien_so' => "sometimes|string|max:20|unique:xe,bien_so,{$id}",
            'anh_xe'  => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $anhPath = $xe->anh_xe;

        if ($request->hasFile('anh_xe')) {
            // Upload ảnh mới
            $file     = $request->file('anh_xe');
            $fileName = 'xe_' . preg_replace('/[^a-zA-Z0-9]/', '', $xe->bien_so) . '_' . time() . '.' . $file->getClientOriginalExtension();
            $file->move(public_path('uploads/xe'), $fileName);
            $anhPath = 'xe/' . $fileName;
        } elseif ($request->input('remove_anh_xe') == '1') {
            // Admin chủ động xóa ảnh
            $anhPath = null;
        }
        // else: giữ nguyên ảnh cũ ($anhPath = $xe->anh_xe)

        $data = $request->except(['anh_xe', 'remove_anh_xe']);
        $data['anh_xe'] = $anhPath;

        $xe->update($data);
        return response()->json(['success' => true, 'message' => 'Cập nhật xe thành công', 'data' => $xe->fresh()]);
    }

    // Xóa xe
    public function destroy($id)
    {
        $xe = Xe::findOrFail($id);
        $xe->delete();
        return response()->json(['success' => true, 'message' => 'Đã xóa xe']);
    }

    // Cập nhật trạng thái xe
    public function capNhatTrangThai(Request $request, $id)
    {
        $request->validate([
            'trang_thai' => 'required|in:san_sang,bao_tri,hong',
        ]);
        $xe = Xe::findOrFail($id);
        $xe->update(['trang_thai' => $request->trang_thai]);
        return response()->json(['success' => true, 'message' => 'Cập nhật trạng thái thành công']);
    }

    // Cập nhật km xe
    public function capNhatKm(Request $request, $id)
    {
        $request->validate(['so_km_hien_tai' => 'required|integer|min:0']);
        $xe = Xe::findOrFail($id);
        if ($request->so_km_hien_tai < $xe->so_km_hien_tai) {
            return response()->json(['success' => false, 'message' => 'Số km mới không thể nhỏ hơn km hiện tại'], 400);
        }
        $xe->update(['so_km_hien_tai' => $request->so_km_hien_tai]);
        return response()->json(['success' => true, 'message' => 'Cập nhật km thành công']);
    }

    // Phân xe cho buổi học
    public function phanXeChoLichHoc(Request $request, $lichHocId)
    {
        $request->validate([
            'xe_id' => 'nullable|exists:xe,id',
        ]);

        $lichHoc = LichHoc::findOrFail($lichHocId);

        // Nếu có xe_id mới, kiểm tra xe có sẵn sàng không
        if ($request->xe_id) {
            $xe = Xe::findOrFail($request->xe_id);
            if ($xe->trang_thai !== 'san_sang') {
                return response()->json([
                    'success' => false,
                    'message' => "Xe {$xe->bien_so} đang ở trạng thái '{$xe->trang_thai}', không thể phân công",
                ], 400);
            }
        }

        $lichHoc->update(['xe_id' => $request->xe_id]);

        return response()->json([
            'success' => true,
            'message' => $request->xe_id ? 'Phân xe thành công' : 'Đã hủy phân xe',
            'data'    => $lichHoc->load('xe'),
        ]);
    }

    // Danh sách xe sẵn sàng (để chọn khi tạo/sửa lịch học)
    public function xeSanSang(Request $request)
    {
        $xe = Xe::where('trang_thai', 'san_sang')
            ->when($request->hang_bang, fn($q) => $q->where('hang_bang', $request->hang_bang))
            ->orderBy('bien_so')
            ->get();

        return response()->json(['success' => true, 'data' => $xe]);
    }

    /**
     * Trả về danh sách xe_id đang bận (đã được phân công cho buổi học khác)
     * trong cùng ngày và khung giờ chỉ định.
     *
     * Query params:
     *   - ngay_hoc    (Y-m-d, bắt buộc)
     *   - gio_bat_dau (H:i,   bắt buộc)
     *   - gio_ket_thuc(H:i,   bắt buộc)
     *   - exclude_lich_hoc_id (int, tuỳ chọn – bỏ qua buổi đang sửa)
     */
    public function xeBanTrongKhungGio(Request $request)
    {
        $request->validate([
            'ngay_hoc'     => 'required|date',
            'gio_bat_dau'  => 'required',
            'gio_ket_thuc' => 'required',
        ]);

        $query = LichHoc::where('ngay_hoc', $request->ngay_hoc)
            ->where('loai_buoi', 'thuc_hanh')
            ->whereNotNull('xe_id')
            ->where('gio_bat_dau', '<', $request->gio_ket_thuc)
            ->where('gio_ket_thuc', '>', $request->gio_bat_dau);

        // Khi sửa buổi học, bỏ qua chính buổi đó để không tự chặn xe của mình
        if ($request->exclude_lich_hoc_id) {
            $query->where('id', '!=', $request->exclude_lich_hoc_id);
        }

        $xeBanIds = $query->pluck('xe_id')->unique()->values();

        return response()->json(['success' => true, 'data' => $xeBanIds]);
    }
    // ═══════════════════════════════════════════════════════
    // ADMIN — Quản lý báo lỗi xe
    // ═══════════════════════════════════════════════════════

    // Danh sách tất cả báo lỗi
    public function danhSachBaoLoi(Request $request)
    {
        $query = BaoLoiXe::with(['xe', 'giangVien.user', 'lichHoc'])
            ->when($request->trang_thai, fn($q) => $q->where('trang_thai', $request->trang_thai))
            ->when($request->xe_id,      fn($q) => $q->where('xe_id', $request->xe_id))
            ->when($request->muc_do,     fn($q) => $q->where('muc_do', $request->muc_do))
            ->orderByDesc('created_at');

        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    // Xử lý báo lỗi (admin cập nhật trạng thái)
    public function xuLyBaoLoi(Request $request, $id)
    {
        $request->validate([
            'trang_thai'    => 'required|in:cho_xu_ly,dang_xu_ly,da_xu_ly',
            'ghi_chu_xu_ly' => 'nullable|string',
        ]);

        $baoLoi = BaoLoiXe::findOrFail($id);
        $baoLoi->update([
            'trang_thai'    => $request->trang_thai,
            'ghi_chu_xu_ly' => $request->ghi_chu_xu_ly,
            'ngay_xu_ly'    => $request->trang_thai === 'da_xu_ly' ? now() : null,
        ]);

        // Nếu đã xử lý xong, tự động chuyển xe về sẵn sàng nếu đang ở trạng thái hỏng
        if ($request->trang_thai === 'da_xu_ly') {
            $xe = $baoLoi->xe;
            if ($xe->trang_thai === 'hong') {
                $xe->update(['trang_thai' => 'san_sang']);
            }
        }

        return response()->json(['success' => true, 'message' => 'Cập nhật trạng thái xử lý thành công']);
    }

    // ═══════════════════════════════════════════════════════
    // GIẢNG VIÊN — Xem xe & báo lỗi
    // ═══════════════════════════════════════════════════════

    // Giảng viên xem xe được phân công trong các lớp thực hành của mình
    public function xeCuaToi(Request $request)
    {
        $user = $request->auth_user;
        $gv   = GiangVien::where('user_id', $user->id)->first();

        if (!$gv) return response()->json(['success' => true, 'data' => []]);

        // Lấy tất cả lớp học mà giảng viên này dạy (lý thuyết hoặc thực hành)
        $lopList = LopHoc::with([
                'khoaHoc',
                'xeLop.xe',   // xe gán qua bảng xe_lop_hoc
                // Lấy thêm xe từ các buổi lịch học thực hành có xe_id
                'lichHoc' => fn($q) => $q
                    ->where('loai_buoi', 'thuc_hanh')
                    ->whereNotNull('xe_id')
                    ->with('xe')
                    ->orderBy('ngay_hoc'),
            ])
            ->where('giang_vien_thuc_hanh_id', $gv->id)
            ->whereIn('trang_thai', ['dang_hoc', 'sap_khai_giang'])
            ->orderByDesc('ngay_khai_giang')
            ->get();

        $result = $lopList->map(function ($lop) {
            // Gom tất cả xe duy nhất: từ xe_lop_hoc + từ lich_hoc.xe_id
            $xeMap = [];

            foreach ($lop->xeLop as $xl) {
                if ($xl->xe) {
                    $xeMap[$xl->xe->id] = $xl->xe;
                }
            }
            foreach ($lop->lichHoc as $lh) {
                if ($lh->xe && !isset($xeMap[$lh->xe->id])) {
                    $xeMap[$lh->xe->id] = $lh->xe;
                }
            }

            return [
                'lop_hoc_id'      => $lop->id,
                'ten_lop'         => $lop->ten_lop,
                'loai_bang'       => $lop->khoaHoc?->loai_bang,
                'ten_khoa'        => $lop->khoaHoc?->ten_khoa,
                'ngay_khai_giang' => $lop->ngay_khai_giang?->format('Y-m-d'),
                'ngay_ket_thuc'   => $lop->ngay_ket_thuc?->format('Y-m-d'),
                'trang_thai'      => $lop->trang_thai,
                'xe_list'         => array_values($xeMap),
            ];
        })->filter(fn($l) => count($l['xe_list']) > 0)->values();

        return response()->json(['success' => true, 'data' => $result]);
    }

    // Giảng viên báo lỗi xe
    public function baoBaoLoi(Request $request)
    {
        $request->validate([
            'xe_id'       => 'required|exists:xe,id',
            'lich_hoc_id' => 'nullable|exists:lich_hoc,id',
            'tieu_de'     => 'required|string|max:200',
            'mo_ta'       => 'required|string',
            'muc_do'      => 'required|in:nhe,trung_binh,nghiem_trong',
        ]);

        $user = $request->auth_user;
        $gv   = GiangVien::where('user_id', $user->id)->firstOrFail();

        $baoLoi = BaoLoiXe::create([
            'xe_id'         => $request->xe_id,
            'giang_vien_id' => $gv->id,
            'lich_hoc_id'   => $request->lich_hoc_id,
            'tieu_de'       => $request->tieu_de,
            'mo_ta'         => $request->mo_ta,
            'muc_do'        => $request->muc_do,
            'trang_thai'    => 'cho_xu_ly',
        ]);

        // Nếu mức độ nghiêm trọng → tự động chuyển xe sang trạng thái hỏng
        if ($request->muc_do === 'nghiem_trong') {
            Xe::where('id', $request->xe_id)->update(['trang_thai' => 'hong']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Báo lỗi xe thành công. Quản trị viên sẽ xử lý sớm.',
            'data'    => $baoLoi->load('xe'),
        ], 201);
    }

    // Giảng viên xem lịch sử báo lỗi của mình
    public function lichSuBaoLoi(Request $request)
    {
        $user = $request->auth_user;
        $gv   = GiangVien::where('user_id', $user->id)->first();

        if (!$gv) return response()->json(['success' => true, 'data' => []]);

        $list = BaoLoiXe::with(['xe', 'lichHoc.lopHoc'])
            ->where('giang_vien_id', $gv->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['success' => true, 'data' => $list]);
    }

    // ═══════════════════════════════════════════════════════
    // ADMIN — Đồng bộ lại km xe từ dữ liệu điểm danh
    // Dùng để fix dữ liệu cũ hoặc khi cần tính lại toàn bộ
    // ═══════════════════════════════════════════════════════
    public function syncKmXe()
    {
        // Reset toàn bộ km về 0 rồi tính lại từ bảng diem_danh
        Xe::query()->update(['so_km_hien_tai' => 0]);

        $xeKmMap = [];

        // ── Trường hợp 1: xe gán trực tiếp vào buổi học (lich_hoc.xe_id) ──
        $rows1 = DB::table('diem_danh')
            ->join('lich_hoc', 'diem_danh.lich_hoc_id', '=', 'lich_hoc.id')
            ->where('lich_hoc.loai_buoi', 'thuc_hanh')
            ->whereNotNull('lich_hoc.xe_id')
            ->where('diem_danh.co_mat', true)
            ->whereNotNull('diem_danh.km_chay')
            ->where('diem_danh.km_chay', '>', 0)
            ->select(
                'lich_hoc.xe_id',
                'diem_danh.lich_hoc_id',
                DB::raw('MAX(diem_danh.km_chay) as km_buoi')
            )
            ->groupBy('lich_hoc.xe_id', 'diem_danh.lich_hoc_id')
            ->get();

        foreach ($rows1 as $row) {
            $xeKmMap[$row->xe_id] = ($xeKmMap[$row->xe_id] ?? 0) + $row->km_buoi;
        }

        // ── Trường hợp 2: xe gán qua bảng xe_lop_hoc (lich_hoc.xe_id = NULL) ──
        $rows2 = DB::table('diem_danh')
            ->join('lich_hoc', 'diem_danh.lich_hoc_id', '=', 'lich_hoc.id')
            ->join('xe_lop_hoc', 'xe_lop_hoc.lop_hoc_id', '=', 'lich_hoc.lop_hoc_id')
            ->where('lich_hoc.loai_buoi', 'thuc_hanh')
            ->whereNull('lich_hoc.xe_id')   // chỉ lấy buổi chưa có xe trực tiếp
            ->where('diem_danh.co_mat', true)
            ->whereNotNull('diem_danh.km_chay')
            ->where('diem_danh.km_chay', '>', 0)
            ->select(
                'xe_lop_hoc.xe_id',
                'diem_danh.lich_hoc_id',
                DB::raw('MAX(diem_danh.km_chay) as km_buoi')
            )
            ->groupBy('xe_lop_hoc.xe_id', 'diem_danh.lich_hoc_id')
            ->get();

        foreach ($rows2 as $row) {
            $xeKmMap[$row->xe_id] = ($xeKmMap[$row->xe_id] ?? 0) + $row->km_buoi;
        }

        // Cộng dồn km từng buổi vào xe
        foreach ($xeKmMap as $xeId => $tongKm) {
            Xe::where('id', $xeId)->update(['so_km_hien_tai' => $tongKm]);
        }

        return response()->json([
            'success' => true,
            'message' => "Đã đồng bộ km cho " . count($xeKmMap) . " xe từ dữ liệu điểm danh.",
            'data'    => collect($xeKmMap)->map(fn($km, $id) => ['xe_id' => $id, 'tong_km' => $km])->values(),
        ]);
    }
}
