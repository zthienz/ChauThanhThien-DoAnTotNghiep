<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KhoaHoc extends Model
{
    protected $table = 'khoa_hoc';

    protected $fillable = [
        'ten_khoa', 'mo_ta', 'anh', 'loai_bang', 'hoc_phi',
        'tuoi_toi_thieu', 'tuoi_toi_da',
        'so_buoi_ly_thuyet_toi_thieu', 'so_km_toi_thieu',
        'si_so_toi_da', 'so_hv_mo_lop', 'is_active',
        // Khóa học đào tạo theo tháng
        'ma_khoa', 'thang', 'nam', 'hang_bang', 'ten_khoa_dao_tao', 'trang_thai_khoa',
        // Nội dung frontend
        'doi_tuong', 'loai_xe_mo_ta', 'thoi_han_bang', 'yeu_cau_truoc',
        'quyen_lai_xe', 'quy_trinh_dao_tao', 'le_phi_sat_hach',
    ];

    protected $casts = ['is_active' => 'boolean', 'hoc_phi' => 'decimal:2'];

    public function lopHoc()   { return $this->hasMany(LopHoc::class); }
    public function baiThi()   { return $this->hasMany(BaiThi::class); }
    public function hoSo()     { return $this->hasMany(HoSoHocVien::class); }
}
