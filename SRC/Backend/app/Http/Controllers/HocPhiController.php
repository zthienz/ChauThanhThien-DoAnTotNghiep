<?php

namespace App\Http\Controllers;

use App\Models\ThanhToanHocPhi;
use Illuminate\Http\Request;

class HocPhiController extends Controller
{
    // Admin: Danh sách tất cả giao dịch học phí
    public function index(Request $request)
    {
        $query = ThanhToanHocPhi::with([
                'hoSo.khoaHoc',
                'hoSo.hocVienLop.lopHoc.khoaHoc',
            ])
            ->where('loai_phi', 'hoc_phi')
            ->when($request->phuong_thuc, fn($q) => $q->where('phuong_thuc', $request->phuong_thuc))
            ->when($request->search, function ($q) use ($request) {
                $q->whereHas('hoSo', fn($s) =>
                    $s->where('ho_ten', 'like', "%{$request->search}%")
                      ->orWhere('so_cccd', 'like', "%{$request->search}%")
                );
            });

        return response()->json([
            'success' => true,
            'data'    => $query->latest()->get(),
        ]);
    }

    // User: Học phí của học viên (dùng cho cổng học viên)
    public function myHocPhi(Request $request)
    {
        $user = $request->auth_user;

        $data = ThanhToanHocPhi::with(['hoSo.khoaHoc'])
            ->whereHas('hoSo', fn($q) => $q->where('user_id', $user->id))
            ->latest()
            ->get();

        return response()->json(['success' => true, 'data' => $data]);
    }

    // Admin: Xóa giao dịch học phí
    public function destroy(Request $request, $id)
    {
        $record = ThanhToanHocPhi::find($id);
        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy giao dịch'], 404);
        }

        // Nếu là học phí chính → rollback trạng thái hồ sơ về chờ đóng học phí
        if ($record->loai_phi === 'hoc_phi') {
            $hoSo = $record->hoSo;
            if ($hoSo) {
                $hoSo->trang_thai_hoc_phi = 'chua_dong';
                $hoSo->hoc_phi_da_dong    = 0;
                $hoSo->ngay_dong_hoc_phi  = null;
                // Nếu học viên đang ở trạng thái sau khi đóng học phí → đưa về chờ đóng
                if (in_array($hoSo->trang_thai, ['cho_mo_lop', 'chuan_bi_hoc'])) {
                    $hoSo->trang_thai = 'cho_dong_hoc_phi';
                }
                $hoSo->save();
            }
        }

        $record->delete();

        return response()->json(['success' => true, 'message' => 'Đã xóa giao dịch thành công']);
    }
}
