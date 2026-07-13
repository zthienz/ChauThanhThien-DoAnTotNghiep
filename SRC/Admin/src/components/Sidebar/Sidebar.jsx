import { NavLink } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import './Sidebar.css'

// Menu cho ADMIN
const adminMenu = [
  { path: '/',           icon: '📊', label: 'Dashboard',                    end: true },
  { path: '/ho-so',      icon: '📋', label: 'Quản Lý Hồ Sơ Học Viên' },
  { path: '/bang-lai',   icon: '🪪', label: 'Quản Lý Hạng Bằng' },
  { path: '/khoa-hoc',   icon: '📅', label: 'Quản Lý Khóa Học' },
  { path: '/lop-hoc',    icon: '🏫', label: 'Quản Lý Lớp Học' },
  { path: '/lich-hoc',   icon: '🗓️', label: 'Quản Lý Lịch Học' },
  { path: '/thi',        icon: '🏆', label: 'Quản Lý Lịch Thi' },
  { path: '/bai-thi',    icon: '📋', label: 'Quản Lý Bài Thi' },
  { path: '/cap-bang',   icon: '🎓', label: 'Quản Lý Cấp Bằng' },
  { path: '/giang-vien', icon: '👨‍🏫', label: 'Quản Lý Giảng Viên' },
  { path: '/hoc-phi',    icon: '💰', label: 'Quản Lý Học Phí' },
  { path: '/xe',         icon: '🚗', label: 'Quản Lý Xe' },
  { path: '/lien-he',    icon: '✉️', label: 'Quản Lý Liên Hệ' },
]

// Menu cho GIẢNG VIÊN — động theo chuyen_mon
const buildGiangVienMenu = (chuyenMon) => {
  const base = [
    { path: '/',          icon: '📊', label: 'Tổng Quan',         end: true },
    { path: '/lop-cua-toi', icon: '🏫', label: 'Lớp Đang Dạy' },
    { path: '/lich-day',  icon: '🗓️', label: 'Lịch Dạy' },
    { path: '/diem-danh', icon: '✅', label: 'Điểm Danh' },
  ]
  // Chỉ giảng viên thực hành hoặc cả hai mới có trang Xe & Báo Lỗi
  if (chuyenMon === 'thuc_hanh' || chuyenMon === 'ca_hai') {
    base.push({ path: '/xe-cua-toi', icon: '🚗', label: 'Báo Lỗi Xe' })
  }
  base.push({ path: '/thong-tin-ca-nhan', icon: '👤', label: 'Thông Tin Cá Nhân' })
  return base
}

const Sidebar = ({ collapsed, onToggle }) => {
  const { adminInfo, isAdmin, isGiangVien, chuyenMon, logout } = useAdmin()
  const menu = isAdmin ? adminMenu : buildGiangVienMenu(chuyenMon)

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        {collapsed ? (
          <div className="sidebar-logo-icon">⭐</div>
        ) : (
          <div className="sidebar-logo-brand">
            <div className="sidebar-logo-star">⭐</div>
            <div className="sidebar-logo-text">
              <span className="slt-top">TRUNG TÂM LÁI XE</span>
              <span className="slt-bottom">SAO VIỆT</span>
              <span className="slt-line" />
            </div>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="sidebar-role">
          <div className="sidebar-avatar">
            {adminInfo?.ho_ten?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="sidebar-user-info">
            <p className="sidebar-user-name">{adminInfo?.ho_ten || 'Admin'}</p>
            <span className={`badge ${isAdmin ? 'badge-warning' : 'badge-info'}`}>
              {isAdmin ? '👑 Quản Trị Viên' : '👨‍🏫 Giảng Viên'}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {!collapsed && (
          <p className="sidebar-section-label">
            {isAdmin ? 'QUẢN TRỊ' : 'GIẢNG VIÊN'}
          </p>
        )}
        {menu.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button className="sidebar-logout" onClick={() => logout()} title="Đăng xuất">
        <span>🚪</span>
        {!collapsed && <span>Đăng Xuất</span>}
      </button>
    </aside>
  )
}

export default Sidebar
