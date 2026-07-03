import { Link } from 'react-router-dom'
import './SectionKhoaHoc.css'

// Ảnh mặc định theo loại bằng — fallback về ảnh chung nếu hạng mới chưa có ảnh
const BANG_IMG = {
  A1:  '/bang-lai-a1.jpg',
  A:   '/bang-lai-a-tren-125cc.jpg',
  B1:  '/bang-lai-b1-1.jpg',
  B2:  '/bang-lai-b1-2.png',
  C1:  '/bang-lai-c1-tai-nhe.jpg',
  C:   '/bang-lai-c1-tai-nang.png',
  D:   '/bang-lai-d.jpg',
  E:   '/bang-lai-e.jpg',
  CE:  '/bang-lai-ce.jpg',
}

// Màu header card — fallback về màu xanh chung
const BANG_COLOR = {
  A1: 'linear-gradient(90deg,#f7971e,#ffd200)',
  A:  'linear-gradient(90deg,#f7971e,#ff6b35)',
  B1: 'linear-gradient(90deg,#0066cc,#0099ff)',
  B2: 'linear-gradient(90deg,#00b09b,#96c93d)',
  C1: 'linear-gradient(90deg,#1565c0,#283593)',
  C:  'linear-gradient(90deg,#1a237e,#283593)',
  D:  'linear-gradient(90deg,#6a1b9a,#9c27b0)',
  E:  'linear-gradient(90deg,#880e4f,#c2185b)',
  CE: 'linear-gradient(90deg,#b71c1c,#e53935)',
}
const DEFAULT_COLOR = 'linear-gradient(90deg,#0066cc,#0099ff)'
const DEFAULT_IMG   = '/bang-lai-b1-2.png'

const CheckItem = ({ text }) => (
  <li className="kh-check-item">
    <span className="kh-check-icon">✓</span>
    <span>{text}</span>
  </li>
)

const KhoaHocCard = ({ kh }) => {
  const slug = kh.loai_bang?.toLowerCase()
  const tuoiMin  = kh.tuoi_toi_thieu ? `>= ${kh.tuoi_toi_thieu} tuổi` : '>= 18 tuổi'
  const loaiXe   = kh.loai_xe_mo_ta || '—'
  // Ưu tiên ảnh từ API, fallback về ảnh hardcode theo hạng
  const imgSrc   = kh.anh
    ? `http://localhost:8000/uploads/${kh.anh}`
    : (BANG_IMG[kh.loai_bang] || DEFAULT_IMG)

  return (
    <div className="kh-card">
      <div className="kh-card-img">
        <img src={imgSrc} alt={kh.ten_khoa} />
      </div>
      <div className="kh-card-header" style={{ background: BANG_COLOR[kh.loai_bang] || DEFAULT_COLOR }}>
        <h3>{kh.ten_khoa}</h3>
      </div>
      <div className="kh-card-price">
        <span className="price-main">{Number(kh.hoc_phi).toLocaleString('vi-VN')} đ</span>
        <p className="price-note">Hồ sơ trọn gói không phát sinh</p>
      </div>
      <ul className="kh-card-info">
        <CheckItem text={`Độ tuổi đăng ký: ${tuoiMin}`} />
        <CheckItem text="Khai giảng: đúng khóa" />
        <CheckItem text="Thời gian học: linh hoạt" />
        <CheckItem text={`Loại xe: ${loaiXe}`} />
      </ul>
      <div className="kh-card-footer">
        <Link to={`/khoa-hoc/${slug}`} className="btn-dang-ky">XEM CHI TIẾT</Link>
        <p className="kh-hotline">📞 Hotline tư vấn: <strong>0934 057 333</strong></p>
      </div>
    </div>
  )
}

const SectionKhoaHoc = ({ khoaHocList }) => {
  // Dùng thứ tự từ API, không cần BANG_ORDER cứng
  const displayList = khoaHocList.length > 0 ? khoaHocList : []

  return (
    <section className="section-kh">
      <div className="container">
        <h2 className="section-title">Các khóa đào tạo lái xe tại Trung Tâm SAO VIỆT</h2>
        <div className="kh-grid">
          {displayList.map(kh => <KhoaHocCard key={kh.id} kh={kh} />)}
        </div>
      </div>
    </section>
  )
}

export default SectionKhoaHoc
