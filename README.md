# He Thong Quan Ly Dao Tao Lai Xe - Trung Tam Sao Viet

Do an tot nghiep - Sinh vien: Chau Thanh Thien (MSSV: 110122163)

---

## Gioi thieu

He thong quan ly toan dien cho trung tam dao tao lai xe, bao gom 5 ung dung doc lap giao tiep qua mot REST API dung chung. He thong ho tro 4 nhom nguoi dung: quan tri vien, giang vien, hoc vien va khach truy cap.

---

## Kien truc he thong

```
SRC/
├── Backend/      → Laravel 12 (PHP 8.2)  – REST API        – Port 8000
├── Admin/        → React 19 + Vite        – Quan tri vien  – Port 5173
├── Frontend/     → React 19 + Vite        – Trang quang ba – Port 5174
├── User/         → React 19 + Vite        – Cong hoc vien  – Port 5175
└── Teacher/      → React 19 + Vite        – Cong giang vien– Port 5176
```

---

## Technology Stack

### Backend
| Thanh phan  | Cong nghe                          |
|-------------|------------------------------------|
| Framework   | Laravel 12                         |
| Ngon ngu    | PHP 8.2                            |
| Xac thuc    | JWT (tymon/jwt-auth) + Sanctum     |
| Database    | MySQL                              |
| Mail        | SMTP Gmail (PHPMailer)             |
| Queue/Cache | Database driver                    |
| AI          | Google Gemini API                  |

### Frontend (tat ca 4 ung dung React)
| Thu vien                              | Phien ban | Dung o         |
|---------------------------------------|-----------|----------------|
| React                                 | 19.1      | Tat ca         |
| Vite                                  | 6.3       | Tat ca         |
| React Router DOM                      | 7.6       | Tat ca         |
| Axios                                 | 1.9       | Tat ca         |
| React Toastify                        | 11.0      | Tat ca         |
| React Icons                           | 5.5       | Tat ca         |
| Recharts                              | 2.15      | Admin, User    |
| jsPDF + jsPDF-autotable + html2canvas | 4.x       | Admin          |
| @google/genai + @google/generative-ai | 2.x       | Admin          |

---

## Phan quyen

| Role        | Ung dung        | Port | Mo ta                          |
|-------------|-----------------|------|--------------------------------|
| Admin       | Admin           | 5173 | Toan quyen quan ly he thong    |
| Giang vien  | Admin / Teacher | 5173/5176 | Quan ly lop, diem danh, xe |
| Hoc vien    | User            | 5175 | Xem lich hoc, ket qua thi, hoc phi |
| Khach       | Frontend        | 5174 | Xem khoa hoc, dang ky tu van   |

### Co che dang nhap
- **Admin / Giang vien:** Email + mat khau
- **Hoc vien:** So CCCD + ngay sinh

---

## Chuc nang chinh

### Admin (port 5173)

**Danh cho quan tri vien:**
- Dashboard: thong ke tong quan, bieu do doanh thu, hoc vien, ket qua thi
- Ho so hoc vien: tao moi (offline & online), cap nhat, xoa, upload anh the, duyet trang thai
- Hoc phi: ghi nhan, thu phi thi lai
- Tao tai khoan hoc vien sau khi dong hoc phi
- Xep lop hoc vien
- Khoa hoc dao tao: quan ly theo thang/nam, tao lop, phan hoc vien, phan xe
- Lop hoc: CRUD, dong bo trang thai, khai giang
- Lich hoc: CRUD, diem danh
- Thi: lich thi, nhap ket qua, them/xoa hoc vien du thi, cap chung chi
- Bai thi: cau hinh diem dat/diem toi da theo hang bang
- Cap bang: bang tot nghiep + bang lai xe
- Giang vien: CRUD, kich hoat/vo hieu hoa
- Xe: CRUD, quan ly so km, trang thai, phan xe cho lich hoc, xu ly bao loi
- Lien he: xem va xu ly yeu cau tu khach
- AI Assistant: tich hop Google Gemini truc tiep tren giao dien
- Xuat PDF: bao cao & danh sach

**Danh cho giang vien (trong app Admin):**
- Thong tin ca nhan
- Lop cua toi (danh sach hoc vien)
- Lich day theo tuan
- Diem danh
- Xe cua toi + bao loi xe

### Frontend - Trang quang ba (port 5174)
- Trang chu
- Danh sach khoa hoc + trang chi tiet theo slug
- Dang ky tu van (tao ho so online)
- Tin tuc
- Lien he

### User - Cong hoc vien (port 5175)
- Dashboard: tong quan tien do hoc tap
- Lich hoc
- Tien do hoc tap
- Ket qua thi + chung chi
- Hoc phi
- Ho so ca nhan

### Teacher - Cong giang vien (port 5176)
- Dashboard
- Thong tin ca nhan
- Danh sach lop hoc
- Lich day
- Xe cua toi

---

## Yeu cau he thong

- PHP >= 8.2
- Composer >= 2.x
- Node.js >= 18.x + npm >= 9.x
- MySQL >= 8.0
- Git

---

## Cai dat & Chay

### 1. Clone du an

```bash
git clone https://github.com/zthienz/tn-da22ttc-110122163-chauthanhthien-htquanlytrungtamlaixe.git
cd tn-da22ttc-110122163-chauthanhthien-htquanlytrungtamlaixe/SRC
```

### 2. Backend (Laravel) - Port 8000

```bash
cd Backend
cp .env.example .env

# Chinh sua .env - cau hinh database MySQL
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=truonglai_db
# DB_USERNAME=root
# DB_PASSWORD=your_password

composer install
php artisan key:generate
php artisan jwt:secret
php artisan migrate --seed
php artisan serve --port=8000
```

### 3. Admin - Port 5173

```bash
cd Admin
# Tao file .env va them:
# VITE_API_URL=http://localhost:8000/api
# VITE_GEMINI_API_KEY=your_gemini_api_key

npm install
npm run dev
```

### 4. Frontend - Port 5174

```bash
cd Frontend
# VITE_API_URL=http://localhost:8000/api

npm install
npm run dev
```

### 5. User - Port 5175

```bash
cd User
# VITE_API_URL=http://localhost:8000/api

npm install
npm run dev
```

### 6. Teacher - Port 5176

```bash
cd Teacher
# VITE_API_URL=http://localhost:8000/api

npm install
npm run dev
```

---

## Cau hinh .env Backend (cac muc quan trong)

```env
APP_NAME="Quan Ly Lai Xe"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=truonglai_db
DB_USERNAME=root
DB_PASSWORD=

JWT_SECRET=          # sinh bang: php artisan jwt:secret

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM_ADDRESS=your_email@gmail.com
MAIL_FROM_NAME="Trung Tam Sao Viet"
```

---

## API Overview

Base URL: `http://localhost:8000/api`

| Nhom             | Prefix                                          | Xac thuc        |
|------------------|-------------------------------------------------|-----------------|
| Cong khai        | /khoa-hoc, /dang-ky-tu-van, /lien-he           | Khong           |
| Hoc vien         | /auth/*, /hoc-vien/*, /thi/*, /hoc-phi/*       | JWT             |
| Admin/Giang vien | /admin/*                                        | JWT + role      |
| Giang vien       | /giang-vien/*                                   | JWT + role      |

- Dang nhap hoc vien: `POST /api/auth/login` (CCCD + ngay sinh)
- Dang nhap admin/giang vien: `POST /api/admin/login` (email + password)

---

## Cau truc thu muc chi tiet

```
SRC/
├── Backend/
│   ├── app/
│   │   ├── Http/Controllers/    # AuthController, AdminController, HocVienController, ...
│   │   ├── Models/              # HocVien, GiangVien, LopHoc, Xe, ...
│   │   └── Middleware/          # JwtMiddleware, RoleMiddleware
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/
│       └── api.php
│
├── Admin/
│   └── src/
│       ├── components/          # Layout, Navbar, Sidebar, AIAssistant
│       ├── context/             # AdminContext
│       └── pages/               # Dashboard, HoSo, LopHoc, Thi, Xe, GiangVien, ...
│
├── Frontend/
│   └── src/
│       ├── components/          # Navbar, Footer
│       └── pages/               # Home, KhoaHoc, DangKy, TinTuc, LienHe
│
├── User/
│   └── src/
│       ├── components/          # Layout
│       ├── context/             # UserContext
│       └── pages/               # Dashboard, LichHoc, TienDo, KetQuaThi, HocPhi, HoSo
│
└── Teacher/
    └── src/
        ├── components/          # Layout
        ├── context/             # TeacherContext
        └── pages/               # Dashboard, GVThongTin, GVLopHoc, GVLichHoc, GVXe
```

---

## Tac gia

**Chau Thanh Thien**
MSSV: 110122163
Do an tot nghiep - He thong quan ly dao tao lai xe
Truong Dai hoc Tra Vinh - Khoa Ky thuat va Cong nghe
