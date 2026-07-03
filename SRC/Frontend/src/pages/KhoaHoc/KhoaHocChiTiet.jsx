import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import './KhoaHocChiTiet.css'

// Ảnh mặc định theo loại bằng — fallback về ảnh chung
const BANG_IMG = {
  A1: '/bang-lai-a1.jpg',
  A:  '/bang-lai-a-tren-125cc.jpg',
  B1: '/bang-lai-b1-1.jpg',
  B2: '/bang-lai-b1-2.png',
  C1: '/bang-lai-c1-tai-nhe.jpg',
  C:  '/bang-lai-c1-tai-nang.png',
  D:  '/bang-lai-d.jpg',
  E:  '/bang-lai-e.jpg',
  CE: '/bang-lai-ce.jpg',
}
const DEFAULT_IMG = '/bang-lai-b1-2.png'

// Màu gradient theo loại bằng — fallback về xanh
const BANG_COLOR = {
  A1: 'linear-gradient(135deg,#f7971e,#ffd200)',
  A:  'linear-gradient(135deg,#f7971e,#ff6b35)',
  B1: 'linear-gradient(135deg,#0066cc,#0099ff)',
  B2: 'linear-gradient(135deg,#00b09b,#96c93d)',
  C1: 'linear-gradient(135deg,#1565c0,#283593)',
  C:  'linear-gradient(135deg,#1a237e,#283593)',
  D:  'linear-gradient(135deg,#6a1b9a,#9c27b0)',
  E:  'linear-gradient(135deg,#880e4f,#c2185b)',
  CE: 'linear-gradient(135deg,#b71c1c,#e53935)',
}
const DEFAULT_COLOR = 'linear-gradient(135deg,#0066cc,#0099ff)'

const KhoaHocChiTiet = () => {
  const { slug } = useParams()
  const [khoa, setKhoa]           = useState(null)
  const [allKhoaHoc, setAllKhoaHoc] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    axios.get('http://localhost:8000/api/khoa-hoc')
      .then(res => {
        if (res.data.success) {
          const all = res.data.data
          setAllKhoaHoc(all)
          // Tìm bằng lái khớp slug (slug = loai_bang.toLowerCase())
          const found = all.find(k => k.loai_bang?.toLowerCase() === slug)
          setKhoa(found || null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return <div className="loading-wrap"><div className="spinner" /></div>
  }

  if (!khoa) {
    return (
      <div className="khct-notfound">
        <h2>Không tìm thấy khóa học</h2>
        <Link to="/khoa-hoc">← Xem tất cả khóa học</Link>
      </div>
    )
  }

  // ── Lấy data từ API ────────────────────────────────────────────────────────
  const mau      = BANG_COLOR[khoa.loai_bang] || DEFAULT_COLOR
  // Ưu tiên ảnh từ API, fallback về ảnh hardcode theo hạng
  const anh      = khoa.anh
    ? `http://localhost:8000/uploads/${khoa.anh}`
    : (BANG_IMG[khoa.loai_bang] || DEFAULT_IMG)
  const tuoiMin  = khoa.tuoi_toi_thieu ? `Từ ${khoa.tuoi_toi_thieu} tuổi trở lên` : null
  const tuoiMax  = khoa.tuoi_toi_da    ? `, không quá ${khoa.tuoi_toi_da} tuổi`    : ''
  const doiTuong = tuoiMin ? `${tuoiMin}${tuoiMax}` : (khoa.doi_tuong || '—')
  const loaiXe   = khoa.loai_xe_mo_ta  || '—'
  const thoiHan  = khoa.thoi_han_bang  || '—'
  const yeuCau   = khoa.yeu_cau_truoc  || '—'
  const buoiLT   = khoa.so_buoi_ly_thuyet_toi_thieu
  const kmTT     = khoa.so_km_toi_thieu

  // Quyền lái xe: mỗi dòng 1 quyền
  const quyenLaiXe = khoa.quyen_lai_xe
    ? khoa.quyen_lai_xe.split('\n').filter(Boolean)
    : []

  // Quy trình: mỗi dòng 1 bước (format "Tiêu đề: Mô tả" hoặc chỉ "Tiêu đề")
  const quyTrinh = khoa.quy_trinh_dao_tao
    ? khoa.quy_trinh_dao_tao.split('\n').filter(Boolean).map((line, i) => {
        const colonIdx = line.indexOf(':')
        if (colonIdx > -1) {
          return { buoc: i + 1, tieu_de: line.slice(0, colonIdx).trim(), mo_ta: line.slice(colonIdx + 1).trim() }
        }
        return { buoc: i + 1, tieu_de: line.trim(), mo_ta: '' }
      })
    : [
        { buoc: 1, tieu_de: 'Nộp hồ sơ',       mo_ta: 'CCCD, ảnh 3x4, giấy khám sức khỏe' },
        { buoc: 2, tieu_de: 'Học lý thuyết',    mo_ta: 'Luật giao thông, biển báo, kỹ thuật lái xe' },
        { buoc: 3, tieu_de: 'Học thực hành',    mo_ta: 'Thực hành trên sân tập và đường trường' },
        { buoc: 4, tieu_de: 'Thi tốt nghiệp',   mo_ta: 'Thi lý thuyết và thực hành tại trung tâm' },
        { buoc: 5, tieu_de: 'Thi sát hạch',     mo_ta: 'Thi sát hạch tại cơ quan nhà nước' },
        { buoc: 6, tieu_de: 'Nhận bằng',        mo_ta: 'Nhận bằng lái xe chính thức' },
      ]

  // Lệ phí: JSON string từ API
  let lePhi = []
  if (khoa.le_phi_sat_hach) {
    try {
      const parsed = JSON.parse(khoa.le_phi_sat_hach)
      if (Array.isArray(parsed)) {
        lePhi = parsed.map(p => ({ ten: p.noi_dung || p.ten || '', phi: p.muc_phi || p.phi || '' }))
      }
    } catch {}
  }

  return (
    <div className="khct-page">
      {/* Hero */}
      <div className="khct-hero" style={{ background: mau }}>
        <div className="container khct-hero-inner">
          <div className="khct-hero-text">
            <span className="khct-badge">Hạng {khoa.loai_bang}</span>
            <h1>{khoa.ten_khoa}</h1>
            <p>{khoa.mo_ta || ''}</p>
            {khoa.hoc_phi && (
              <div className="khct-hero-price">
                <span className="khct-price-label">Học phí trọn gói</span>
                <span className="khct-price-value">{Number(khoa.hoc_phi).toLocaleString('vi-VN')}đ</span>
              </div>
            )}
            <div className="khct-hero-btns">
              <Link to={`/dang-ky?hang=${khoa.loai_bang}`} className="khct-btn-primary">📝 Đăng Ký Học Ngay</Link>
              <a href="tel:0934057333" className="khct-btn-outline">📞 0934 057 333</a>
            </div>
          </div>
          <div className="khct-hero-img">
            <img src={anh} alt={khoa.ten_khoa} />
          </div>
        </div>
      </div>

      <div className="container khct-body">
        {/* Thông tin nhanh */}
        <div className="khct-quick-info">
          {[
            { icon: '👤', label: 'Đối tượng',              value: doiTuong },
            { icon: '🚗', label: 'Loại xe',                 value: loaiXe },
            { icon: '📅', label: 'Thời hạn bằng',          value: thoiHan },
            { icon: '📋', label: 'Yêu cầu trước',          value: yeuCau },
            ...(buoiLT ? [{ icon: '📖', label: 'Lý thuyết tối thiểu',    value: `${buoiLT} buổi` }] : []),
            ...(kmTT > 0 ? [{ icon: '🛣️', label: 'Km thực hành tối thiểu', value: `${kmTT} km` }] : []),
          ].map((item, i) => (
            <div key={i} className="khct-qi-item">
              <span className="khct-qi-icon">{item.icon}</span>
              <div>
                <p className="khct-qi-label">{item.label}</p>
                <p className="khct-qi-value">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="khct-two-col">
          {/* Cột trái */}
          <div>
            {/* Quyền lái xe */}
            {quyenLaiXe.length > 0 && (
              <div className="khct-section">
                <h2>✅ Quyền lái xe được cấp</h2>
                <ul className="khct-list">
                  {quyenLaiXe.map((item, i) => (
                    <li key={i}>
                      <span className="khct-check">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Lệ phí nhà nước */}
            {lePhi.length > 0 && (
              <div className="khct-section">
                <h2>💰 Lệ phí sát hạch nhà nước</h2>
                <p className="khct-note">Các khoản phí này đã được bao gồm trong học phí trọn gói tại Sao Việt</p>
                <table className="khct-fee-table">
                  <thead>
                    <tr><th>Nội dung</th><th>Mức phí</th></tr>
                  </thead>
                  <tbody>
                    {lePhi.map((f, i) => (
                      <tr key={i}>
                        <td>{f.ten}</td>
                        <td><strong>{f.phi}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cột phải */}
          <div>
            {/* Quy trình */}
            <div className="khct-section">
              <h2>📋 Quy trình đào tạo</h2>
              <div className="khct-steps">
                {quyTrinh.map((step, i) => (
                  <div key={i} className="khct-step">
                    <div className="khct-step-num" style={{ background: mau }}>{step.buoc}</div>
                    <div className="khct-step-info">
                      <p className="khct-step-title">{step.tieu_de}</p>
                      {step.mo_ta && <p className="khct-step-desc">{step.mo_ta}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="khct-cta">
              <h3>Bắt đầu học ngay hôm nay!</h3>
              <p>Liên hệ tư vấn miễn phí — Khai giảng liên tục hàng tháng</p>
              <Link to={`/dang-ky?hang=${khoa.loai_bang}`} className="khct-btn-primary"
                style={{ display: 'block', textAlign: 'center', marginBottom: 12 }}>
                📝 Đăng Ký Học Ngay
              </Link>
              <a href="tel:0934057333" className="khct-btn-outline"
                style={{ display: 'block', textAlign: 'center' }}>
                📞 Gọi ngay: 0934 057 333
              </a>
            </div>
          </div>
        </div>

        {/* Xem thêm khóa học — lấy hoàn toàn từ API */}
        {allKhoaHoc.filter(k => k.loai_bang?.toLowerCase() !== slug).length > 0 && (
          <div className="khct-more">
            <h3>Xem thêm các khóa học khác</h3>
            <div className="khct-more-links">
              {allKhoaHoc
                .filter(k => k.loai_bang?.toLowerCase() !== slug)
                .map(k => {
                  const imgSrc = k.anh
                    ? `http://localhost:8000/uploads/${k.anh}`
                    : (BANG_IMG[k.loai_bang] || DEFAULT_IMG)
                  return (
                    <Link key={k.id} to={`/khoa-hoc/${k.loai_bang.toLowerCase()}`} className="khct-more-item">
                      <img src={imgSrc} alt={k.ten_khoa} />
                      <span>{k.ten_khoa}</span>
                    </Link>
                  )
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default KhoaHocChiTiet
