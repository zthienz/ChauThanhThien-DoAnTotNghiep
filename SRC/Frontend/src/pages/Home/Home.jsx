import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import SectionGioiThieu from './sections/SectionGioiThieu'
import SectionKhoaHoc from './sections/SectionKhoaHoc'
import SectionLoaiBang from './sections/SectionLoaiBang'
import SectionThoiGian from './sections/SectionThoiGian'
import SectionThuTuc from './sections/SectionThuTuc'
import SectionUuDai from './sections/SectionUuDai'
import './Home.css'

const Home = () => {
  const [khoaHocList, setKhoaHocList] = useState([])

  useEffect(() => {
    axios.get('http://localhost:8000/api/khoa-hoc')
      .then(res => { if (res.data.success) setKhoaHocList(res.data.data) })
      .catch(() => {})
  }, [])

  return (
    <div className="home-page">
      {/* ── HERO / BANNER ── */}
      <section className="hero">
        <div className="hero-overlay" />
        <div className="container hero-content">
          <h1>TRUNG TÂM DẠY LÁI XE SAO VIỆT</h1>
          <p className="hero-sub">Chuyên đào tạo lái xe các hạng A1, A, B số sàn, B tự động, C1, C</p>
          <ul className="hero-list">
            {[
              'Đào tạo A1, A, B1, B2, C1, C',
              'Thủ tục nhanh gọn',
              'Học 1 kèm 1, linh hoạt',
              'Học phí trọn gói, không phát sinh',
            ].map((item, i) => (
              <li key={i}>
                <span className="hero-check">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <Link to="/lien-he" className="btn-dangky">Liên hệ tư vấn</Link>
        </div>
      </section>

      {/* ── CÁC SECTION NỘI DUNG ── */}
      <SectionGioiThieu />
      <SectionKhoaHoc khoaHocList={khoaHocList} />
      <SectionLoaiBang />
      <SectionThoiGian />
      <SectionThuTuc />
      <SectionUuDai />
    </div>
  )
}

export default Home
