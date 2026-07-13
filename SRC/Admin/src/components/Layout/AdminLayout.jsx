import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../Sidebar/Sidebar'
import { useAdmin } from '../../context/AdminContext'
import AIAssistant from '../AIAssistant/AIAssistant'
import './AdminLayout.css'

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const { adminInfo, isAdmin }    = useAdmin()

  return (
    <div className={`admin-wrapper ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button className="topbar-toggle" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? '▶' : '◀'}
            </button>
            <div className="topbar-breadcrumb">
              <span className="tb-site">Trung Tâm Lái Xe Sao Việt</span>
              <span className="tb-sep">/</span>
              <span className="tb-page">
                {isAdmin ? 'Quản Trị Hệ Thống' : 'Cổng Giảng Viên'}
              </span>
            </div>
          </div>

          <div className="topbar-right">
            <a href="http://localhost:5174" className="topbar-site-link" target="_blank" rel="noreferrer">
              🌐 Trang chủ
            </a>
            <div className="topbar-user">
              <div className="topbar-avatar">
                {adminInfo?.ho_ten?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="topbar-user-info">
                <p className="topbar-user-name">{adminInfo?.ho_ten}</p>
                <p className="topbar-user-role">
                  {isAdmin ? 'Quản Trị Viên' : 'Giảng Viên'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>

      {/* AI Assistant — floating, chỉ hiện với Admin */}
      {/* <AIAssistant /> */}
    </div>
  )
}

export default AdminLayout
