import { useState, useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import axios from 'axios'
import './Navbar.css'

// Các hạng truyền thống được xếp vào nhóm "nâng hạng"
// Bất kỳ hạng nào không có trong danh sách này → nhóm học mới
const HANG_CO_BAN = ['A1', 'A', 'B1', 'B2', 'C1', 'C']

const Navbar = () => {
  const [khoaOpen, setKhoaOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [bangLais, setBangLais] = useState([])

  useEffect(() => {
    axios.get('http://localhost:8000/api/khoa-hoc')
      .then(res => { if (res.data.success) setBangLais(res.data.data) })
      .catch(() => {})
  }, [])

  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <span>Trung Tâm Dạy Lái Xe Sao Việt</span>
          <span>📞 0934 057 333</span>
        </div>
      </div>

      <nav className="navbar">
        <div className="container navbar-inner">
          <Link to="/" className="navbar-logo">
            <img src="/logo-trungtamsaoviet.png" alt="Sao Việt" className="logo-img" />
          </Link>

          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>

          <ul className={`navbar-menu ${menuOpen ? 'open' : ''}`}>
            <li>
              <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
                Trang chủ
              </NavLink>
            </li>
            <li
              className="has-dropdown"
              onMouseEnter={() => setKhoaOpen(true)}
              onMouseLeave={() => setKhoaOpen(false)}
            >
              <span className={`nav-link ${khoaOpen ? 'active' : ''}`}>
                Các khoá học <span className="arrow">▾</span>
              </span>
              {khoaOpen && (
                <ul className="dropdown">
                  {/* Tất cả bằng lái — không phân nhóm */}
                  {bangLais.map(k => (
                    <li key={k.id}>
                      <Link to={`/khoa-hoc/${k.loai_bang.toLowerCase()}`} onClick={() => setKhoaOpen(false)}>
                        {k.loai_xe_mo_ta
                          ? `Hạng ${k.loai_bang} — ${k.loai_xe_mo_ta}`
                          : k.ten_khoa}
                      </Link>
                    </li>
                  ))}
                  <li className="dropdown-divider">
                    <Link to="/khoa-hoc" onClick={() => setKhoaOpen(false)}>Xem tất cả khóa học →</Link>
                  </li>
                </ul>
              )}
            </li>
            <li>
              <NavLink to="/tin-tuc" className={({ isActive }) => isActive ? 'active' : ''}>
                Tin Tức
              </NavLink>
            </li>
            <li>
              <NavLink to="/lien-he" className={({ isActive }) => isActive ? 'active' : ''}>
                Liên hệ
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>
    </>
  )
}

export default Navbar
