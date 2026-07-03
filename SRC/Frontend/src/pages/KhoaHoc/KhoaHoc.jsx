import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './KhoaHoc.css'

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

const KhoaHoc = () => {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('http://localhost:8000/api/khoa-hoc')
      .then(res => { if (res.data.success) setList(res.data.data) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="khoahoc-page">
      <div className="khoahoc-hero">
        <div className="container">
          <h1>Các Khóa Đào Tạo Lái Xe</h1>
          <p>Tại Trung Tâm SAO VIỆT — Chuyên nghiệp, uy tín, học phí trọn gói</p>
        </div>
      </div>

      <div className="container khoahoc-content">
        {loading ? (
          <div className="loading-wrap"><div className="spinner" /></div>
        ) : (
          <div className="kh-list-grid">
            {list.map(kh => {
              const tuoiMin = kh.tuoi_toi_thieu ? `>= ${kh.tuoi_toi_thieu} tuổi` : '>= 18 tuổi'
              const loaiXe  = kh.loai_xe_mo_ta || '—'
              const slug    = kh.loai_bang?.toLowerCase()
              const imgSrc  = kh.anh
                ? `http://localhost:8000/uploads/${kh.anh}`
                : (BANG_IMG[kh.loai_bang] || DEFAULT_IMG)
              return (
                <div key={kh.id} className="kh-detail-card">
                  <div className="kh-detail-img">
                    <img src={imgSrc} alt={kh.ten_khoa} />
                  </div>
                  <div className="kh-detail-body">
                    <div className="kh-detail-header" style={{ background: BANG_COLOR[kh.loai_bang] || DEFAULT_COLOR }}>
                      <h3>{kh.ten_khoa}</h3>
                    </div>
                    <div className="kh-detail-price">
                      <span className="price-main">{Number(kh.hoc_phi).toLocaleString('vi-VN')} đ</span>
                      <span className="price-note">Hồ sơ trọn gói không phát sinh</span>
                    </div>
                    <ul className="kh-detail-info">
                      {[
                        `Độ tuổi đăng ký: ${tuoiMin}`,
                        'Khai giảng: đúng khóa',
                        'Thời gian học: linh hoạt',
                        `Loại xe: ${loaiXe}`,
                        `Lý thuyết tối thiểu: ${kh.so_buoi_ly_thuyet_toi_thieu || 0} buổi`,
                        ...(kh.so_km_toi_thieu > 0 ? [`Km thực hành tối thiểu: ${kh.so_km_toi_thieu} km`] : []),
                      ].map((item, i) => (
                        <li key={i}>
                          <span className="kh-check-icon">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="kh-detail-footer">
                      <Link to={`/khoa-hoc/${slug}`} className="btn-dang-ky-full">XEM CHI TIẾT</Link>
                      <p>📞 Hotline: <strong>0934 057 333</strong></p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default KhoaHoc
