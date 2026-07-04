php artisan tinker --execute="
use App\Models\User;
use App\Models\HoSoHocVien;
use Illuminate\Support\Facades\Hash;

\$data = [
  ['Nguyễn Thị Lan',  'lan.nguyen.b1.01@gmail.com', '0901000201', '2000-03-15', '079200010001', 'Vĩnh Long',  'offline', '2026-07-01 08:00:00'],
  ['Trần Văn Hùng',   'hung.tran.b1.02@gmail.com',  '0901000202', '1999-07-22', '079199020002', 'Vĩnh Long',  'offline', '2026-07-01 08:05:00'],
  ['Lê Thị Hoa',      'hoa.le.b1.03@gmail.com',     '0901000203', '2001-11-08', '079201030003', 'Cần Thơ',    'offline', '2026-07-01 08:10:00'],
  ['Phạm Văn Đức',    'duc.pham.b1.04@gmail.com',   '0901000204', '1998-05-30', '079198040004', 'Vĩnh Long',  'offline', '2026-07-01 08:15:00'],
  ['Hoàng Thị Mai',   'mai.hoang.b1.05@gmail.com',  '0901000205', '2002-01-19', '079202050005', 'Trà Vinh',   'online',  '2026-07-01 08:20:00'],
  ['Vũ Văn Tùng',     'tung.vu.b1.06@gmail.com',    '0901000206', '1997-09-14', '079197060006', 'Vĩnh Long',  'offline', '2026-07-01 08:25:00'],
  ['Đặng Thị Thu',    'thu.dang.b1.07@gmail.com',   '0901000207', '2000-06-27', '079200070007', 'Bến Tre',    'online',  '2026-07-01 08:30:00'],
  ['Bùi Văn Nam',     'nam.bui.b1.08@gmail.com',    '0901000208', '1999-12-03', '079199080008', 'Vĩnh Long',  'offline', '2026-07-01 08:35:00'],
  ['Ngô Thị Hương',   'huong.ngo.b1.09@gmail.com',  '0901000209', '2001-04-11', '079201090009', 'Đồng Tháp',  'offline', '2026-07-01 08:40:00'],
  ['Đinh Văn Khoa',   'khoa.dinh.b1.10@gmail.com',  '0901000210', '1998-08-25', '079198100010', 'Vĩnh Long',  'offline', '2026-07-01 08:45:00'],
  ['Lý Thị Ngọc',     'ngoc.ly.b1.11@gmail.com',    '0901000211', '2002-02-16', '079202110011', 'An Giang',   'online',  '2026-07-01 09:00:00'],
  ['Phan Văn Minh',   'minh.phan.b1.12@gmail.com',  '0901000212', '2000-10-07', '079200120012', 'Vĩnh Long',  'offline', '2026-07-01 09:05:00'],
  ['Cao Thị Bích',    'bich.cao.b1.13@gmail.com',   '0901000213', '1999-03-28', '079199130013', 'Kiên Giang', 'offline', '2026-07-01 09:10:00'],
  ['Dương Văn Thắng', 'thang.duong.b1.14@gmail.com','0901000214', '1997-06-18', '079197140014', 'Vĩnh Long',  'offline', '2026-07-01 09:15:00'],
  ['Tô Thị Linh',     'linh.to.b1.15@gmail.com',    '0901000215', '2001-08-09', '079201150015', 'Sóc Trăng',  'online',  '2026-07-01 09:20:00'],
  ['Trịnh Văn Phúc',  'phuc.trinh.b1.16@gmail.com', '0901000216', '2000-05-24', '079200160016', 'Vĩnh Long',  'offline', '2026-07-01 09:25:00'],
  ['Mai Thị Tuyết',   'tuyet.mai.b1.17@gmail.com',  '0901000217', '1998-01-31', '079198170017', 'Hậu Giang',  'offline', '2026-07-01 09:30:00'],
  ['Hà Văn Long',     'long.ha.b1.18@gmail.com',    '0901000218', '1999-11-13', '079199180018', 'Vĩnh Long',  'offline', '2026-07-01 09:35:00'],
  ['Lương Thị Kim',   'kim.luong.b1.19@gmail.com',  '0901000219', '2002-07-05', '079202190019', 'Cà Mau',     'online',  '2026-07-01 09:40:00'],
  ['Võ Văn Tài',      'tai.vo.b1.20@gmail.com',     '0901000220', '2000-09-20', '079200200020', 'Vĩnh Long',  'offline', '2026-07-01 09:45:00'],
];
foreach(\$data as \$d) {
  \$u = User::create(['ho_ten'=>\$d[0],'email'=>\$d[1],'password'=>Hash::make('123456'),'role'=>'hoc_vien','so_dien_thoai'=>\$d[2],'is_active'=>1]);
  HoSoHocVien::create(['user_id'=>\$u->id,'khoa_hoc_id'=>27,'ho_ten'=>\$d[0],'ngay_sinh'=>\$d[3],'so_cccd'=>\$d[4],'dia_chi'=>\$d[5],'so_dien_thoai'=>\$d[2],'email'=>\$d[1],'nguon_dang_ky'=>\$d[6],'trang_thai'=>'cho_dong_hoc_phi','trang_thai_hoc_phi'=>'chua_dong','hoc_phi_da_dong'=>0,'created_at'=>\$d[7],'updated_at'=>\$d[7]]);
}
echo 'Done: '.count(\$data).' ho so created';
"
