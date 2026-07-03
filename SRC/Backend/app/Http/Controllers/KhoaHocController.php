<?php

namespace App\Http\Controllers;

use App\Models\KhoaHoc;
use App\Models\LopHoc;
use App\Models\HoSoHocVien;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KhoaHocController extends Controller
{
    // Thứ tự hiển thị từ thấp đến cao
    private const BANG_ORDER = ['A1','A','B1','B2','C1','C','D','E','CE'];

    private function sortByBang($collection)
    {
        return $collection->sortBy(fn($k) =>
            array_search($k->loai_bang, self::BANG_ORDER) !== false
                ? array_search($k->loai_bang, self::BANG_ORDER)
                : 99
        )->values();
    }

    // Public: Danh sách loại bằng lái (cho trang quảng bá) — chỉ loại bằng thuần
    public function publicIndex()
    {
        $khoaHoc = $this->sortByBang(
            KhoaHoc::where('is_active', true)
                ->whereNull('thang')
                ->get()
        );
        return response()->json(['success' => true, 'data' => $khoaHoc]);
    }

    // Admin: Danh sách tất cả loại bằng lái (không phải khóa học đào tạo theo tháng)
    public function index()
    {
        $khoaHoc = $this->sortByBang(
            KhoaHoc::withCount('lopHoc')
                ->whereNull('thang')   // chỉ lấy loại bằng lái thuần, không lấy khóa học theo tháng
                ->get()
        );
        return response()->json(['success' => true, 'data' => $khoaHoc]);
    }

    // Admin: Chi tiết 1 bằng lái
    public function show($id)
    {
        $khoaHoc = KhoaHoc::withCount('lopHoc')->findOrFail($id);
        return response()->json(['success' => true, 'data' => $khoaHoc]);
    }

    // Admin: Tạo mới
    public function store(Request $request)
    {
        $request->validate([
            'ten_khoa'                    => 'required|string|max:150',
            'loai_bang'                   => 'required|string|max:10',
            'hoc_phi'                     => 'required|numeric|min:0',
            'so_buoi_ly_thuyet_toi_thieu' => 'required|integer|min:0',
            'so_km_toi_thieu'             => 'required|integer|min:0',
            'tuoi_toi_thieu'              => 'nullable|integer|min:1|max:100',
            'tuoi_toi_da'                 => 'nullable|integer|min:1|max:100|gte:tuoi_toi_thieu',
            'anh'                         => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        // Bắt buộc ít nhất một trong hai phải > 0
        if ($request->so_buoi_ly_thuyet_toi_thieu == 0 && $request->so_km_toi_thieu == 0) {
            return response()->json([
                'success' => false,
                'message' => 'Bằng lái phải có ít nhất số buổi lý thuyết hoặc số km thực hành > 0.',
            ], 422);
        }

        $data = $request->except('anh');

        if ($request->hasFile('anh')) {
            $file     = $request->file('anh');
            $fileName = 'banglai_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $request->loai_bang)) . '_' . time() . '.' . $file->getClientOriginalExtension();
            $file->move(public_path('uploads/bang_lai'), $fileName);
            $data['anh'] = 'bang_lai/' . $fileName;
        }

        $khoaHoc = KhoaHoc::create($data);
        return response()->json(['success' => true, 'message' => 'Tạo khóa học thành công', 'data' => $khoaHoc], 201);
    }

    // Admin: Cập nhật
    public function update(Request $request, $id)
    {
        $khoaHoc = KhoaHoc::findOrFail($id);

        $request->validate([
            'so_buoi_ly_thuyet_toi_thieu' => 'sometimes|integer|min:0',
            'so_km_toi_thieu'             => 'sometimes|integer|min:0',
            'tuoi_toi_thieu' => 'nullable|integer|min:1|max:100',
            'tuoi_toi_da'    => 'nullable|integer|min:1|max:100',
            'anh'            => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        // Tính giá trị sau khi update để kiểm tra ràng buộc
        $newBuoi = $request->has('so_buoi_ly_thuyet_toi_thieu')
            ? (int) $request->so_buoi_ly_thuyet_toi_thieu
            : $khoaHoc->so_buoi_ly_thuyet_toi_thieu;
        $newKm   = $request->has('so_km_toi_thieu')
            ? (int) $request->so_km_toi_thieu
            : $khoaHoc->so_km_toi_thieu;

        if ($newBuoi == 0 && $newKm == 0) {
            return response()->json([
                'success' => false,
                'message' => 'Bằng lái phải có ít nhất số buổi lý thuyết hoặc số km thực hành > 0.',
            ], 422);
        }

        $data = $request->except('anh');

        if ($request->hasFile('anh')) {
            $file     = $request->file('anh');
            $fileName = 'banglai_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $khoaHoc->loai_bang)) . '_' . time() . '.' . $file->getClientOriginalExtension();
            $file->move(public_path('uploads/bang_lai'), $fileName);
            $data['anh'] = 'bang_lai/' . $fileName;
        }

        $khoaHoc->update($data);
        return response()->json(['success' => true, 'message' => 'Cập nhật thành công', 'data' => $khoaHoc]);
    }

    // Admin: Xóa bằng lái → cascade xóa tất cả khóa đào tạo + lớp học liên quan
    // Học viên trong các lớp bị xóa sẽ chuyển về trạng thái chờ xếp lớp
    public function destroy($id)
    {
        $bangLai = KhoaHoc::findOrFail($id);

        DB::transaction(function () use ($bangLai) {
            // Lấy tất cả khóa đào tạo cùng loại bằng này
            $khoaDaoTao = KhoaHoc::where('loai_bang', $bangLai->loai_bang)
                ->whereNotNull('ma_khoa') // chỉ khóa đào tạo (có mã)
                ->with('lopHoc')
                ->get();

            foreach ($khoaDaoTao as $khoa) {
                foreach ($khoa->lopHoc as $lop) {
                    // Chuyển học viên về chờ xếp lớp
                    HoSoHocVien::whereHas('hocVienLop', fn($q) => $q->where('lop_hoc_id', $lop->id))
                        ->update(['trang_thai' => 'cho_mo_lop']);

                    $lop->hocVienLop()->delete();
                    $lop->delete();
                }
                $khoa->delete();
            }

            // Xóa bằng lái
            $bangLai->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa bằng lái và tất cả khóa học, lớp học liên quan. Học viên đã được chuyển về trạng thái chờ xếp lớp.',
        ]);
    }
}
