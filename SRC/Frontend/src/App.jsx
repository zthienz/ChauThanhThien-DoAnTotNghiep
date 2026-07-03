import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Navbar from './components/Navbar/Navbar'
import Footer from './components/Footer/Footer'
import Home from './pages/Home/Home'
import KhoaHoc from './pages/KhoaHoc/KhoaHoc'
import KhoaHocChiTiet from './pages/KhoaHoc/KhoaHocChiTiet'
import LienHe from './pages/LienHe/LienHe'
import DangKy from './pages/DangKy/DangKy'
import TinTuc from './pages/TinTuc/TinTuc'

// Tự động cuộn về đầu trang mỗi khi chuyển route
const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

const App = () => {
  return (
    <>
      <ScrollToTop />
      <ToastContainer position="top-right" autoClose={3000} />
      <Navbar />
      <main>
        <Routes>
          <Route path="/"               element={<Home />} />
          <Route path="/khoa-hoc"       element={<KhoaHoc />} />
          <Route path="/khoa-hoc/:slug" element={<KhoaHocChiTiet />} />
          <Route path="/lien-he"        element={<LienHe />} />
          <Route path="/dang-ky"        element={<DangKy />} />
          <Route path="/tin-tuc"        element={<TinTuc />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}

export default App
