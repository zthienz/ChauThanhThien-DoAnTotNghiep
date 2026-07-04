import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAdmin } from '../../context/AdminContext'
import './HoSoManagement.css'

// Tính tuổi chính xác theo ngày (đủ tuổi khi đã qua sinh nhật)
const tinhTuoi = (ngaySinh) => {
  if (!ngaySinh) return null
  const today = new Date()
  const birth = new Date(ngaySinh)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// Kiểm tra đủ tuổi: true = đủ, false = chưa đủ, null = chưa nhập đủ thông tin
// Dùng tuoi_toi_thieu từ DB (do admin cấu hình khi tạo bằng lái)
const kiemTraTuoi = (ngaySinh, khoaHocId, khoaList) => {
  if (!ngaySinh || !khoaHocId || !khoaList) return null
  const khoa = khoaList.find(k => String(k.id) === String(khoaHocId))
  if (!khoa) return null
  const tuoiMin = khoa.tuoi_toi_thieu
  if (!tuoiMin) return null
  return tinhTuoi(ngaySinh) >= tuoiMin
}

const TRANG_THAI_MAP = {
  cho_dong_hoc_phi:      { text:'Chờ đóng HP',              cls:'badge-warning' },
  cho_mo_lop:            { text:'Chờ mở lớp',               cls:'badge-info' },
  dang_hoc:              { text:'Đang học',                  cls:'badge-success' },
  du_dieu_kien_thi_tn:   { text:'Đủ ĐK thi TN',             cls:'badge-blue' },
  chuan_bi_thi:          { text:'Chuẩn bị thi',              cls:'badge-warning' },
  hoan_thanh_tn:         { text:'Hoàn thành TN',             cls:'badge-success' },
  du_dieu_kien_sat_hanh: { text:'Đủ ĐK sát hạch',           cls:'badge-blue' },
  dang_thi_sat_hanh:     { text:'Đang thi sát hạch',        cls:'badge-warning' },
  // dau_sat_hanh, da_cap_bang không hiện ở đây → chỉ hiện ở trang Cấp Bằng
}

const HoSoManagement = () => {
  const { token, backendUrl } = useAdmin()
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterTT, setFilterTT] = useState('')
  const [filterHang, setFilterHang]   = useState('')
  const [filterHocPhi, setFilterHocPhi] = useState('')
  const [page, setPage]         = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showModal, setShowModal]         = useState(false)
  const [showHocPhiModal, setShowHocPhiModal] = useState(false)
  const [showXepLopModal, setShowXepLopModal] = useState(false)
  const [xepLopForm, setXepLopForm] = useState({ lop_hoc_id: '' })
  // Modal thu phí thi lại
  const [showPhiThiLaiModal, setShowPhiThiLaiModal] = useState(false)
  const [phiThiLaiData, setPhiThiLaiData]           = useState([])
  const [phiThiLaiLoading, setPhiThiLaiLoading]     = useState(false)
  const [selectedBaiThiIds, setSelectedBaiThiIds]   = useState([])
  const [phuongThucTL, setPhuongThucTL]             = useState('tien_mat')
  const [viewItem, setViewItem]     = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [editingHoSo, setEditingHoSo] = useState(null)
  const [lopList, setLopList]   = useState([])
  const [stats, setStats]       = useState(null)
  const [hangBangOptions, setHangBangOptions] = useState([])

  const headers = { Authorization: `Bearer ${token}` }

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${backendUrl}/api/admin/ho-so`, {
        headers,
        params: { search, trang_thai: filterTT, loai_bang: filterHang, hoc_phi: filterHocPhi, page, per_page: 15 }
      })
      if (res.data.success) {
        setList(res.data.data)
        setTotalPages(res.data.pages || 1)
      }
    } catch { toast.error('Lỗi tải dữ liệu') }
    finally { setLoading(false) }
  }

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/admin/dashboard`, { headers })
      if (res.data.success) setStats(res.data.stats)
    } catch {}
  }

  const fetchLopList = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/admin/lop-hoc`, { headers })
      if (res.data.success) setLopList(res.data.data)
    } catch {}
  }

  // Mở modal xem chi tiết — gọi API lấy đầy đủ thông tin
  const openView = async (hs) => {
    setViewLoading(true)
    setViewItem({})   // mở modal ngay, hiện spinner
    try {
      const res = await axios.get(`${backendUrl}/api/admin/ho-so/${hs.id}`, { headers })
      if (res.data.success) setViewItem(res.data.data)
    } catch { toast.error('Không tải được chi tiết hồ sơ') }
    finally { setViewLoading(false) }
  }

  useEffect(() => { fetchList() }, [search, filterTT, filterHang, filterHocPhi, page])
  useEffect(() => { fetchStats() }, [])
  useEffect(() => {
    const fetchHangs = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/admin/khoa-hoc`, { headers })
        if (res.data.success) {
          const hangs = [...new Set(res.data.data.map(k => k.loai_bang).filter(Boolean))].sort()
          setHangBangOptions(hangs)
        }
      } catch {}
    }
    fetchHangs()
  }, [token])

  // Form tạo hồ sơ offline
  const [form, setForm] = useState({ ho_ten:'', ngay_sinh:'', so_cccd:'', khoa_hoc_id:'', so_dien_thoai:'', dia_chi:'', email:'' })
  const [khoaList, setKhoaList] = useState([])
  const [anhPreview, setAnhPreview] = useState(null)
  const [anhFile, setAnhFile]       = useState(null)

  useEffect(() => {
    axios.get(`${backendUrl}/api/admin/khoa-hoc`, { headers })
      .then(res => { if (res.data.success) setKhoaList(res.data.data) })
      .catch(() => {})
  }, [])

  const handleAnhChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAnhFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAnhPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const validateForm = (f) => {
    if (f.so_cccd && !/^\d{12}$/.test(f.so_cccd)) {
      toast.error('Số CCCD phải đủ 12 chữ số nguyên'); return false
    }
    if (f.so_dien_thoai && !/^0\d{9}$/.test(f.so_dien_thoai)) {
      toast.error('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0'); return false
    }
    if (f.email && !/^[a-zA-Z0-9._%+\-]+@gmail\.com$/.test(f.email)) {
      toast.error('Email phải có định dạng @gmail.com'); return false
    }
    return true
  }

  const handleTaoHoSo = async e => {
    e.preventDefault()
    if (!validateForm(form)) return

    // Kiểm tra tuổi tối thiểu
    if (kiemTraTuoi(form.ngay_sinh, form.khoa_hoc_id, khoaList) === false) {
      const khoa = khoaList.find(k => String(k.id) === String(form.khoa_hoc_id))
      const tuoiMin = khoa?.tuoi_toi_thieu
      toast.error(`Học viên chưa đủ ${tuoiMin} tuổi để đăng ký bằng hạng ${khoa?.loai_bang}`)
      return
    }
    try {
      // Dùng FormData để gửi kèm file ảnh
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (anhFile) fd.append('anh_the', anhFile)

      const res = await axios.post(`${backendUrl}/api/admin/ho-so`, fd, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      })
      if (res.data.success) {
        toast.success('Tạo hồ sơ thành công!')
        setShowModal(false)
        setForm({ ho_ten:'', ngay_sinh:'', so_cccd:'', khoa_hoc_id:'', so_dien_thoai:'', dia_chi:'', email:'' })
        setAnhFile(null)
        setAnhPreview(null)
        fetchList()
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi tạo hồ sơ') }
  }

  // Ghi nhận học phí — số tiền tự động lấy từ khóa học
  const [hocPhiForm, setHocPhiForm] = useState({ phuong_thuc:'tien_mat', ma_giao_dich:'' })

  const openThuHP = (hs) => {
    setSelected(hs)
    setHocPhiForm({ phuong_thuc:'tien_mat', ma_giao_dich:'' })
    setShowHocPhiModal(true)
  }

  const handleGhiHocPhi = async e => {
    e.preventDefault()
    const soTien = selected.khoa_hoc?.hoc_phi || 0
    try {
      const res = await axios.post(`${backendUrl}/api/admin/ho-so/${selected.id}/hoc-phi`, {
        so_tien: soTien,
        phuong_thuc: hocPhiForm.phuong_thuc,
        ma_giao_dich: hocPhiForm.ma_giao_dich,
      }, { headers })
      if (res.data.success) {
        toast.success('Xác nhận học phí thành công!')
        setShowHocPhiModal(false)
        fetchList()
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  // Mở modal thu phí thi lại
  const openPhiThiLai = async (hs) => {
    setSelected(hs)
    setSelectedBaiThiIds([])
    setPhuongThucTL('tien_mat')
    setPhiThiLaiLoading(true)
    setShowPhiThiLaiModal(true)
    try {
      const res = await axios.get(`${backendUrl}/api/admin/ho-so/${hs.id}/phi-thi-lai-chua-thu`, { headers })
      if (res.data.success) setPhiThiLaiData(res.data.data)
    } catch { toast.error('Không tải được dữ liệu') }
    finally { setPhiThiLaiLoading(false) }
  }

  const handleThuPhiThiLai = async () => {
    if (selectedBaiThiIds.length === 0) { toast.warning('Chưa chọn bài thi nào'); return }
    const lichThiId = phiThiLaiData.find(b => selectedBaiThiIds.includes(b.bai_thi_id))?.lich_thi_id
    if (!lichThiId) { toast.error('Không xác định được lịch thi'); return }
    try {
      const res = await axios.post(
        `${backendUrl}/api/admin/ho-so/${selected.id}/phi-thi-lai`,
        { bai_thi_ids: selectedBaiThiIds, lich_thi_id: lichThiId, phuong_thuc: phuongThucTL },
        { headers }
      )
      if (res.data.success) {
        toast.success(res.data.message)
        setShowPhiThiLaiModal(false)
        fetchList()
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  // Mở modal sửa hồ sơ
  const openEdit = (hs) => {
    setEditingHoSo(hs)
    setForm({
      ho_ten:        hs.ho_ten || '',
      ngay_sinh:     hs.ngay_sinh?.split('T')[0] || '',
      so_cccd:       hs.so_cccd || '',
      khoa_hoc_id:   hs.khoa_hoc_id || '',
      so_dien_thoai: hs.so_dien_thoai || '',
      dia_chi:       hs.dia_chi || '',
      email:         hs.email || '',
    })
    setAnhPreview(hs.anh_the ? `/uploads/${hs.anh_the}` : null)
    setAnhFile(null)
    setShowModal(true)
  }

  const handleSuaHoSo = async e => {
    e.preventDefault()
    if (!validateForm(form)) return
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (anhFile) fd.append('anh_the', anhFile)

      const res = await axios.post(
        `${backendUrl}/api/admin/ho-so/${editingHoSo.id}/update`,
        fd,
        { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }
      )
      if (res.data.success) {
        toast.success('Cập nhật hồ sơ thành công!')
        setShowModal(false)
        setEditingHoSo(null)
        setAnhFile(null)
        setAnhPreview(null)
        fetchList()
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi cập nhật') }
  }

  // Xóa hồ sơ
  const handleXoa = async (hs) => {
    if (!confirm(`Xóa hồ sơ của "${hs.ho_ten}"?\nHành động này không thể hoàn tác.`)) return
    try {
      const res = await axios.delete(`${backendUrl}/api/admin/ho-so/${hs.id}`, { headers })
      if (res.data.success) {
        toast.success('Đã xóa hồ sơ học viên')
        fetchList()
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi xóa hồ sơ') }
  }

  // Tạo tài khoản thủ công cho học viên chưa có tài khoản
  const handleTaoTaiKhoan = async (hs) => {
    if (!confirm(`Tạo tài khoản cho "${hs.ho_ten}"?\n• Tài khoản: ${hs.so_cccd}\n• Mật khẩu: Ngày sinh (DDMMYYYY)`)) return
    try {
      const res = await axios.post(`${backendUrl}/api/admin/ho-so/${hs.id}/tao-tai-khoan`, {}, { headers })
      if (res.data.success) {
        toast.success(`✅ Tạo tài khoản thành công!\nTài khoản: ${res.data.tai_khoan?.so_cccd} | Mật khẩu: ${res.data.tai_khoan?.mat_khau}`)
        fetchList()
        // Refresh viewItem nếu đang xem
        if (viewItem?.id === hs.id) {
          const r = await axios.get(`${backendUrl}/api/admin/ho-so/${hs.id}`, { headers })
          if (r.data.success) setViewItem(r.data.data)
        }
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi tạo tài khoản') }
  }

  // Đổi trạng thái hồ sơ thủ công (dùng khi dữ liệu bị lệch)
  const handleDoiTrangThai = async (hs, trangThaiMoi) => {
    const label = TRANG_THAI_MAP[trangThaiMoi]?.text || trangThaiMoi
    if (!confirm(`Đổi trạng thái của "${hs.ho_ten}" sang "${label}"?`)) return
    try {
      const res = await axios.patch(
        `${backendUrl}/api/admin/ho-so/${hs.id}/trang-thai`,
        { trang_thai: trangThaiMoi },
        { headers }
      )
      if (res.data.success) {
        toast.success(`Đã đổi trạng thái sang "${label}"`)
        fetchList()
        // Refresh viewItem nếu đang xem
        const r = await axios.get(`${backendUrl}/api/admin/ho-so/${hs.id}`, { headers })
        if (r.data.success) setViewItem(r.data.data)
      } else toast.error(res.data.message)
    } catch { toast.error('Lỗi đổi trạng thái') }
  }
  const handleXepLop = async e => {
    e.preventDefault()
    try {
      const res = await axios.post(`${backendUrl}/api/admin/ho-so/${selected.id}/xep-lop`, xepLopForm, { headers })
      if (res.data.success) {
        toast.success(res.data.message)
        if (res.data.tai_khoan) {
          alert(`✅ Tài khoản học viên:\n• CCCD: ${res.data.tai_khoan.so_cccd}\n• Mật khẩu: ${res.data.tai_khoan.mat_khau}\n\n${res.data.tai_khoan.huong_dan}`)
        }
        setShowXepLopModal(false)
        fetchList()
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  return (
    <div className="hoso-page">
      <div className="page-header">
        <div>
          <h2>📋 Hồ Sơ Học Viên</h2>
          <p>Quản lý toàn bộ hồ sơ đăng ký học lái xe</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingHoSo(null)
          setForm({ ho_ten:'', ngay_sinh:'', so_cccd:'', khoa_hoc_id:'', so_dien_thoai:'', dia_chi:'', email:'' })
          setAnhPreview(null); setAnhFile(null)
          setShowModal(true)
        }}>
          + Thêm hồ sơ offline
        </button>
      </div>

      {/* ── Stat cards trạng thái học viên ── */}
      {stats && (
        <div className="hoso-stats-wrap">
          {/* Hàng trên: Tổng hồ sơ + 4 trạng thái đầu */}
          <div className="hoso-stats-row hoso-stats-row-top">
            {/* Card Tổng hồ sơ — luôn hiển thị, click để bỏ filter */}
            <button
              className={`hoso-stat-card hoso-stat-card-total ${filterTT === '' ? 'active' : ''}`}
              style={{ '--sc': '#0d47a1' }}
              onClick={() => { setFilterTT(''); setPage(1) }}
              title="Xem tất cả hồ sơ"
            >
              <span className="hsc-icon">📋</span>
              <div className="hsc-body">
                <span className="hsc-value">
                  {(stats.choDongHocPhi || 0) + (stats.choMoLop || 0) + (stats.dangHoc || 0) +
                   (stats.duDieuKienThi || 0) + (stats.chuanBiThi || 0) + (stats.dauTotNghiep || 0) +
                   (stats.duDieuKienSatHanh || 0) + (stats.dangThiSatHanh || 0)}
                </span>
                <span className="hsc-label">Tổng Hồ Sơ</span>
              </div>
              {filterTT === '' && <span className="hsc-active-dot" />}
            </button>

            {[
              { key: 'cho_dong_hoc_phi', label: 'Chờ đóng HP',    value: stats.choDongHocPhi  || 0, color: '#f59e0b', icon: '💰' },
              { key: 'cho_mo_lop',       label: 'Chờ mở lớp',     value: stats.choMoLop       || 0, color: '#3b82f6', icon: '⏳' },
              { key: 'dang_hoc',         label: 'Đang học',        value: stats.dangHoc        || 0, color: '#10b981', icon: '📚' },
              { key: 'du_dieu_kien_thi_tn', label: 'Đủ ĐK thi TN', value: stats.duDieuKienThi || 0, color: '#06b6d4', icon: '✅' },
            ].map(s => (
              <button
                key={s.key}
                className={`hoso-stat-card ${filterTT === s.key ? 'active' : ''}`}
                style={{ '--sc': s.color }}
                onClick={() => { setFilterTT(filterTT === s.key ? '' : s.key); setPage(1) }}
                title={`Lọc: ${s.label}`}
              >
                <span className="hsc-icon">{s.icon}</span>
                <div className="hsc-body">
                  <span className="hsc-value">{s.value}</span>
                  <span className="hsc-label">{s.label}</span>
                </div>
                {filterTT === s.key && <span className="hsc-active-dot" />}
              </button>
            ))}
          </div>

          {/* Hàng dưới: 4 trạng thái còn lại */}
          <div className="hoso-stats-row hoso-stats-row-bot">
            {[
              { key: 'chuan_bi_thi',          label: 'Chuẩn bị thi',    value: stats.chuanBiThi           || 0, color: '#f97316', icon: '📝' },
              { key: 'hoan_thanh_tn',          label: 'Hoàn thành TN',   value: stats.dauTotNghiep         || 0, color: '#8b5cf6', icon: '🎓' },
              { key: 'du_dieu_kien_sat_hanh',  label: 'Đủ ĐK sát hạch', value: stats.duDieuKienSatHanh    || 0, color: '#06b6d4', icon: '🏁' },
              { key: 'dang_thi_sat_hanh',      label: 'Đang thi SH',     value: stats.dangThiSatHanh       || 0, color: '#f59e0b', icon: '✍️' },
            ].map(s => (
              <button
                key={s.key}
                className={`hoso-stat-card ${filterTT === s.key ? 'active' : ''}`}
                style={{ '--sc': s.color }}
                onClick={() => { setFilterTT(filterTT === s.key ? '' : s.key); setPage(1) }}
                title={`Lọc: ${s.label}`}
              >
                <span className="hsc-icon">{s.icon}</span>
                <div className="hsc-body">
                  <span className="hsc-value">{s.value}</span>
                  <span className="hsc-label">{s.label}</span>
                </div>
                {filterTT === s.key && <span className="hsc-active-dot" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="search-bar">
        <input className="search-input" placeholder="🔍 Tìm theo tên, CCCD, SĐT..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <select className="search-input" style={{maxWidth:160}} value={filterHang}
          onChange={e => { setFilterHang(e.target.value); setPage(1) }}>
          <option value="">Tất cả bằng lái</option>
          {hangBangOptions.map(h => (
            <option key={h} value={h}>Hạng {h}</option>
          ))}
        </select>
        <select className="search-input" style={{maxWidth:160}} value={filterHocPhi}
          onChange={e => { setFilterHocPhi(e.target.value); setPage(1) }}>
          <option value="">Tất cả học phí</option>
          <option value="da_dong">✅ Đã đóng</option>
          <option value="chua_dong">❌ Chưa đóng</option>
        </select>
        <select className="search-input" style={{maxWidth:200}} value={filterTT}
          onChange={e => { setFilterTT(e.target.value); setPage(1) }}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(TRANG_THAI_MAP).map(([k,v]) => (
            <option key={k} value={k}>{v.text}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{padding:0}}>
          {loading ? <div className="loading-wrap"><div className="spinner" /></div> : (
            <div style={{overflowX:'auto'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>Họ Tên</th><th>CCCD</th><th>SĐT</th>
                    <th>Bằng Lái</th><th>Học Phí</th><th>Trạng Thái</th>
                    <th>Nguồn</th><th>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr><td colSpan={9} style={{textAlign:'center',padding:'40px',color:'#a0aec0'}}>Không có dữ liệu</td></tr>
                  ) : list.map((hs, i) => {
                    const ts = TRANG_THAI_MAP[hs.trang_thai] || { text: hs.trang_thai, cls:'badge-gray' }
                    return (
                      <tr key={hs.id}>
                        <td>{(page-1)*15 + i + 1}</td>
                        <td><strong>{hs.ho_ten}</strong></td>
                        <td><code style={{fontSize:12}}>{hs.so_cccd}</code></td>
                        <td>{hs.so_dien_thoai || '—'}</td>
                        <td>
                          {hs.khoa_hoc?.loai_bang
                            ? <span className="badge badge-blue">Hạng {hs.khoa_hoc.loai_bang}</span>
                            : <span style={{color:'#a0aec0'}}>—</span>}
                        </td>
                        <td>
                          <span className={`badge ${hs.trang_thai_hoc_phi === 'da_dong' ? 'badge-success' : 'badge-danger'}`}>
                            {hs.trang_thai_hoc_phi === 'da_dong' ? '✅ Đã đóng' : '❌ Chưa đóng'}
                          </span>
                        </td>
                        <td><span className={`badge ${ts.cls}`}>{ts.text}</span></td>
                        <td>
                          <span className={`badge ${hs.nguon_dang_ky === 'online' ? 'badge-blue' : 'badge-gray'}`}>
                            {hs.nguon_dang_ky === 'online' ? '🌐 Online' : '🏢 Offline'}
                          </span>
                        </td>
                        <td>
                          <div className="action-cell">
                            <button className="btn btn-info btn-sm" onClick={() => openView(hs)}>
                              👁️ Xem
                            </button>
                            {hs.trang_thai_hoc_phi !== 'da_dong' && (
                              <button className="btn btn-success btn-sm" onClick={() => openThuHP(hs)}>
                                💰 Thu HP
                              </button>
                            )}
                            {hs.trang_thai_hoc_phi === 'da_dong' && hs.trang_thai === 'cho_mo_lop' && (
                              <button className="btn btn-primary btn-sm"
                                onClick={() => {
                                  setSelected(hs)
                                  setXepLopForm({ lop_hoc_id: '' })
                                  fetchLopList()
                                  setShowXepLopModal(true)
                                }}>
                                🏫 Xếp lớp
                              </button>
                            )}
                            {/* Nút phí thi lại: chỉ hiện khi có bài rớt chưa đóng phí */}
                            {hs.co_phi_thi_lai_chua_thu && (
                              <button className="btn btn-warning btn-sm" onClick={() => openPhiThiLai(hs)}>
                                🔁 Phí thi lại
                              </button>
                            )}
                            <button className="btn btn-danger btn-sm" onClick={() => handleXoa(hs)}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({length: totalPages}, (_, i) => i+1).map(p => (
            <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
        </div>
      )}

      {/* Modal thêm / sửa hồ sơ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingHoSo ? '✏️ Sửa Hồ Sơ — ' + editingHoSo.ho_ten : '📋 Thêm Hồ Sơ Offline'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={editingHoSo ? handleSuaHoSo : handleTaoHoSo}>
              <div className="modal-body">
                <div className="hoso-form-layout">

                  {/* ── Cột trái: Ảnh thẻ ── */}
                  <div className="hoso-anh-col">
                    <p className="hoso-anh-label">📷 Ảnh thẻ 3×4</p>
                    <div
                      className={`hoso-anh-upload ${anhPreview ? 'has-image' : ''}`}
                      onClick={() => document.getElementById('anh-the-input').click()}
                    >
                      {anhPreview ? (
                        <img src={anhPreview} alt="Ảnh thẻ" className="hoso-anh-preview" />
                      ) : (
                        <div className="hoso-anh-placeholder">
                          <span>📷</span>
                          <p>Nhấn để chọn ảnh</p>
                          <small>JPG, PNG — tối đa 5MB</small>
                        </div>
                      )}
                    </div>
                    <input
                      id="anh-the-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleAnhChange}
                    />
                    {anhPreview && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ marginTop: 8, width: '100%' }}
                        onClick={() => { setAnhPreview(null); setAnhFile(null) }}
                      >
                        🗑️ Xóa ảnh
                      </button>
                    )}
                    <p className="hoso-anh-hint">
                      Ảnh sẽ dùng làm ảnh đại diện học viên trong hệ thống
                    </p>
                  </div>

                  {/* ── Cột phải: Thông tin ── */}
                  <div className="hoso-info-col">

                    {/* ── BƯỚC 1: Chọn khóa học trước ── */}
                    <div className="hoso-section-title">📚 Đăng Ký Khóa Học</div>
                    <div className="form-group">
                      <label>Khóa học *</label>
                      <select value={form.khoa_hoc_id} onChange={e=>setForm({...form,khoa_hoc_id:e.target.value})} required>
                        <option value="">-- Chọn khóa học --</option>
                        {khoaList.map(k => (
                          <option key={k.id} value={k.id}>{k.ten_khoa} (Hạng {k.loai_bang})</option>
                        ))}
                      </select>
                      {/* Hiển thị yêu cầu tuổi tối thiểu */}
                      {form.khoa_hoc_id && (() => {
                        const khoa = khoaList.find(k => String(k.id) === String(form.khoa_hoc_id))
                        const tuoiMin = khoa?.tuoi_toi_thieu
                        if (!tuoiMin) return null
                        return (
                          <span style={{fontSize:12,color:'#6b7280',marginTop:4,display:'block'}}>
                            ℹ️ Bằng hạng <strong>{khoa.loai_bang}</strong> yêu cầu tối thiểu <strong>{tuoiMin} tuổi</strong>
                          </span>
                        )
                      })()}                    </div>

                    {/* ── BƯỚC 2: Thông tin cá nhân ── */}
                    <div className="hoso-section-title" style={{marginTop:8}}>👤 Thông Tin Cá Nhân</div>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Họ và tên *</label>
                        <input value={form.ho_ten} onChange={e=>setForm({...form,ho_ten:e.target.value})} placeholder="Nguyễn Văn A" required />
                      </div>
                      <div className="form-group">
                        <label>Số CCCD *</label>
                        <input
                          value={form.so_cccd}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 12)
                            setForm({...form, so_cccd: v})
                          }}
                          placeholder="012345678901"
                          required
                          maxLength={12}
                          pattern="\d{12}"
                          title="CCCD phải đủ 12 chữ số"
                          inputMode="numeric"
                        />
                        {form.so_cccd && form.so_cccd.length !== 12 && (
                          <span className="field-error">CCCD phải đủ 12 chữ số ({form.so_cccd.length}/12)</span>
                        )}
                      </div>
                    </div>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Ngày sinh *</label>
                        <input
                          type="date"
                          value={form.ngay_sinh}
                          onChange={e=>setForm({...form,ngay_sinh:e.target.value})}
                          required
                          style={kiemTraTuoi(form.ngay_sinh, form.khoa_hoc_id) === false
                            ? {borderColor:'#ef4444'}
                            : {}}
                        />
                        {/* Cảnh báo tuổi */}
                        {kiemTraTuoi(form.ngay_sinh, form.khoa_hoc_id, khoaList) === false && (() => {
                          const khoa = khoaList.find(k => String(k.id) === String(form.khoa_hoc_id))
                          const tuoiMin = khoa?.tuoi_toi_thieu
                          const tuoiHienTai = tinhTuoi(form.ngay_sinh)
                          return (
                            <span className="field-error">
                              ❌ Chưa đủ tuổi — Bằng hạng {khoa?.loai_bang} yêu cầu tối thiểu {tuoiMin} tuổi (hiện tại: {tuoiHienTai} tuổi)
                            </span>
                          )
                        })()}
                        {kiemTraTuoi(form.ngay_sinh, form.khoa_hoc_id, khoaList) === true && (
                          <span style={{fontSize:12,color:'#10b981',marginTop:4,display:'block'}}>
                            ✅ Đủ tuổi đăng ký
                          </span>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Số điện thoại</label>
                        <input
                          value={form.so_dien_thoai}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 10)
                            setForm({...form, so_dien_thoai: v})
                          }}
                          placeholder="0901234567"
                          maxLength={10}
                          pattern="0\d{9}"
                          title="Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0"
                          inputMode="numeric"
                        />
                        {form.so_dien_thoai && !/^0\d{9}$/.test(form.so_dien_thoai) && (
                          <span className="field-error">SĐT phải 10 số, bắt đầu bằng 0</span>
                        )}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e=>setForm({...form,email:e.target.value})}
                        placeholder="hocvien@gmail.com"
                        pattern="[a-zA-Z0-9._%+\-]+@gmail\.com"
                        title="Email phải có định dạng @gmail.com"
                      />
                      {form.email && !/^[a-zA-Z0-9._%+\-]+@gmail\.com$/.test(form.email) && (
                        <span className="field-error">Email phải có định dạng @gmail.com</span>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Địa chỉ</label>
                      <input value={form.dia_chi} onChange={e=>setForm({...form,dia_chi:e.target.value})} placeholder="123 Đường ABC, Quận 1, TP.HCM" />
                    </div>

                    <div className="hoso-form-note">
                      <span>ℹ️</span>
                      <p>Sau khi tạo hồ sơ, học viên sẽ ở trạng thái <strong>Chờ đóng học phí</strong>. Tài khoản đăng nhập sẽ được tạo tự động khi xếp lớp.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  {editingHoSo ? '💾 Lưu thay đổi' : '➕ Tạo hồ sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xác nhận học phí */}
      {showHocPhiModal && selected && (
        <div className="modal-overlay" onClick={() => setShowHocPhiModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💰 Xác Nhận Thu Học Phí</h3>
              <button className="modal-close" onClick={() => setShowHocPhiModal(false)}>✕</button>
            </div>
            <form onSubmit={handleGhiHocPhi}>
              <div className="modal-body">
                {/* Thông tin học viên */}
                <div className="hocphi-hv-card">
                  <div className="hocphi-hv-avatar">
                    {selected.ho_ten?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="hocphi-hv-name">{selected.ho_ten}</p>
                    <p className="hocphi-hv-cccd">CCCD: {selected.so_cccd}</p>
                  </div>
                </div>

                {/* Thông tin học phí */}
                <div className="hocphi-amount-box">
                  <div className="hocphi-amount-label">Khóa học đăng ký</div>
                  <div className="hocphi-khoa-name">{selected.khoa_hoc?.ten_khoa}</div>
                  <div className="hocphi-amount-label" style={{marginTop:12}}>Số tiền cần thu</div>
                  <div className="hocphi-amount-value">
                    {Number(selected.khoa_hoc?.hoc_phi || 0).toLocaleString('vi-VN')}
                    <span> VNĐ</span>
                  </div>
                  <div className="hocphi-hang-badge">
                    <span className="badge badge-blue">Hạng {selected.khoa_hoc?.loai_bang}</span>
                  </div>
                </div>

                {/* Phương thức */}
                <div className="form-group" style={{marginTop:16}}>
                  <label>Phương thức thanh toán *</label>
                  <div className="hocphi-method-grid">
                    {[
                      { value:'tien_mat',    icon:'💵', label:'Tiền mặt' },
                      { value:'chuyen_khoan',icon:'🏦', label:'Chuyển khoản' },
                    ].map(m => (
                      <label key={m.value} className={`hocphi-method-btn ${hocPhiForm.phuong_thuc === m.value ? 'active' : ''}`}>
                        <input type="radio" name="phuong_thuc" value={m.value}
                          checked={hocPhiForm.phuong_thuc === m.value}
                          onChange={e => setHocPhiForm({...hocPhiForm, phuong_thuc: e.target.value})}
                          style={{display:'none'}} />
                        <span>{m.icon}</span>
                        <span>{m.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {hocPhiForm.phuong_thuc !== 'tien_mat' && (
                  <div className="form-group">
                    <label>Mã giao dịch</label>
                    <input value={hocPhiForm.ma_giao_dich}
                      onChange={e => setHocPhiForm({...hocPhiForm, ma_giao_dich: e.target.value})}
                      placeholder="Nhập mã giao dịch (nếu có)" />
                  </div>
                )}

                <div className="hocphi-confirm-note">
                  ✅ Sau khi xác nhận, học viên sẽ chuyển sang trạng thái <strong>Chờ mở lớp</strong>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowHocPhiModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-success">
                  ✅ Xác nhận đã thu {Number(selected.khoa_hoc?.hoc_phi||0).toLocaleString('vi-VN')} VNĐ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xếp lớp */}
      {showXepLopModal && selected && (() => {
        // Lọc lớp phù hợp: cùng loại bằng (loai_bang) và còn chỗ
        const loaiBangHV = selected.khoa_hoc?.loai_bang
        const lopPhuHop = lopList.filter(l =>
          l.khoa_hoc?.loai_bang === loaiBangHV &&
          (l.hoc_vien_count || 0) < (l.si_so_toi_da || 999)
        )
        const lopDayHoac = lopList.filter(l =>
          l.khoa_hoc?.loai_bang === loaiBangHV &&
          (l.hoc_vien_count || 0) >= (l.si_so_toi_da || 999)
        )
        return (
          <div className="modal-overlay" onClick={() => setShowXepLopModal(false)}>
            <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>🏫 Xếp Lớp — {selected.ho_ten}</h3>
                <button className="modal-close" onClick={() => setShowXepLopModal(false)}>✕</button>
              </div>
              <form onSubmit={handleXepLop}>
                <div className="modal-body">
                  {/* Thông tin học viên */}
                  <div className="hocphi-info" style={{marginBottom: 16}}>
                    <p>Học viên: <strong>{selected.ho_ten}</strong> — CCCD: <strong>{selected.so_cccd}</strong></p>
                    <p>Khóa học: <strong>{selected.khoa_hoc?.ten_khoa}</strong>
                      {selected.khoa_hoc?.loai_bang && (
                        <span className="badge badge-blue" style={{marginLeft: 8}}>Hạng {selected.khoa_hoc.loai_bang}</span>
                      )}
                    </p>
                    <p className="info-note" style={{marginTop: 8}}>
                      ⚠️ Sau khi xếp lớp, hệ thống sẽ tự động tạo tài khoản học viên với:<br/>
                      • Tài khoản: <strong>{selected.so_cccd}</strong> &nbsp;•&nbsp; Mật khẩu: <strong>Ngày sinh (DDMMYYYY)</strong>
                    </p>
                  </div>

                  {/* Danh sách lớp phù hợp */}
                  {lopList.filter(l => l.khoa_hoc?.loai_bang === loaiBangHV).length === 0 ? (
                    <div style={{textAlign:'center', padding:'32px 0', color:'#6b7280'}}>
                      <div style={{fontSize:40, marginBottom:8}}>🏫</div>
                      <p>Chưa có lớp học nào cho khóa <strong>{selected.khoa_hoc?.ten_khoa}</strong>.</p>
                      <p style={{fontSize:13}}>Vui lòng tạo lớp học trước tại trang Lớp Học.</p>
                    </div>
                  ) : (
                    <>
                      {lopPhuHop.length > 0 && (
                        <>
                          <p style={{fontWeight:600, marginBottom:10, color:'#374151'}}>
                            📋 Chọn lớp để xếp ({lopPhuHop.length} lớp còn chỗ):
                          </p>
                          <div className="xeplop-lop-list">
                            {lopPhuHop.map(l => {
                              const isSelected = xepLopForm.lop_hoc_id === String(l.id)
                              const phanTram = Math.round(((l.hoc_vien_count||0) / (l.si_so_toi_da||1)) * 100)
                              return (
                                <div
                                  key={l.id}
                                  className={`xeplop-lop-card ${isSelected ? 'selected' : ''}`}
                                  onClick={() => setXepLopForm({ lop_hoc_id: String(l.id) })}
                                >
                                  <div className="xeplop-lop-card-header">
                                    <span className="xeplop-lop-name">{l.ten_lop}</span>
                                    <span className={`badge ${l.trang_thai === 'dang_hoc' ? 'badge-success' : l.trang_thai === 'da_ket_thuc' ? 'badge-gray' : 'badge-info'}`}>
                                      {l.trang_thai === 'dang_hoc' ? 'Đang học' : l.trang_thai === 'chuan_bi' ? 'Chuẩn bị' : l.trang_thai === 'da_ket_thuc' ? 'Đã kết thúc' : l.trang_thai}
                                    </span>
                                  </div>
                                  <div className="xeplop-lop-card-body">
                                    <div className="xeplop-lop-info-row">
                                      <span>📚 {l.khoa_hoc?.ten_khoa || '—'}</span>
                                      <span>🎓 GV LT: {l.giang_vien_ly_thuyet?.user?.ho_ten || '—'}</span>
                                    </div>
                                    <div className="xeplop-lop-info-row">
                                      <span>🚗 GV TH: {l.giang_vien_thuc_hanh?.user?.ho_ten || '—'}</span>
                                      <span>📅 Khai giảng: {l.ngay_khai_giang ? new Date(l.ngay_khai_giang).toLocaleDateString('vi-VN') : '—'}</span>
                                    </div>
                                    <div className="xeplop-siso-row">
                                      <span className="xeplop-siso-text">
                                        👥 Sĩ số: <strong>{l.hoc_vien_count||0}</strong>/{l.si_so_toi_da}
                                      </span>
                                      <div className="xeplop-progress-bar">
                                        <div className="xeplop-progress-fill" style={{width: `${phanTram}%`}} />
                                      </div>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="xeplop-selected-indicator">✅ Đã chọn lớp này</div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}

                      {/* Lớp đã đầy - chỉ hiển thị thông tin, không cho chọn */}
                      {lopDayHoac.length > 0 && (
                        <div style={{marginTop: 16}}>
                          <p style={{fontWeight:600, marginBottom:8, color:'#9ca3af', fontSize:13}}>
                            🔒 Lớp đã đầy ({lopDayHoac.length} lớp):
                          </p>
                          <div className="xeplop-lop-list">
                            {lopDayHoac.map(l => (
                              <div key={l.id} className="xeplop-lop-card disabled">
                                <div className="xeplop-lop-card-header">
                                  <span className="xeplop-lop-name" style={{color:'#9ca3af'}}>{l.ten_lop}</span>
                                  <span className="badge badge-danger">Đã đầy</span>
                                </div>
                                <div className="xeplop-lop-card-body">
                                  <div className="xeplop-siso-row">
                                    <span className="xeplop-siso-text" style={{color:'#9ca3af'}}>
                                      👥 Sĩ số: <strong>{l.hoc_vien_count||0}</strong>/{l.si_so_toi_da} (Đã đầy)
                                    </span>
                                    <div className="xeplop-progress-bar">
                                      <div className="xeplop-progress-fill" style={{width:'100%', background:'#ef4444'}} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={() => setShowXepLopModal(false)}>Hủy</button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!xepLopForm.lop_hoc_id}
                  >
                    🏫 Xếp lớp & Tạo tài khoản
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}

      {/* ── MODAL XEM CHI TIẾT HỒ SƠ ── */}
      {viewItem !== null && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal modal-xl hoso-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Chi Tiết Hồ Sơ Học Viên</h3>
              <button className="modal-close" onClick={() => setViewItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              {viewLoading ? (
                <div className="loading-wrap"><div className="spinner" /></div>
              ) : (
                <div className="hoso-detail-layout">

                  {/* ── CỘT TRÁI: Ảnh + trạng thái ── */}
                  <div className="hoso-detail-left">
                    {/* Ảnh thẻ */}
                    <div className="hoso-detail-anh-wrap">
                      {viewItem.anh_the ? (
                        <img
                          src={`/uploads/${viewItem.anh_the}`}
                          alt={viewItem.ho_ten}
                          className="hoso-detail-anh"
                          onError={e => { e.target.onerror=null; e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
                        />
                      ) : null}
                      <div className="hoso-detail-anh-fallback" style={{display: viewItem.anh_the ? 'none' : 'flex'}}>
                        {viewItem.ho_ten?.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    {/* Tên + hạng bằng */}
                    <h3 className="hoso-detail-name">{viewItem.ho_ten}</h3>
                    <code className="hoso-detail-cccd">{viewItem.so_cccd}</code>
                    {viewItem.khoa_hoc?.loai_bang && (
                      <span className="badge badge-blue" style={{marginTop:8,fontSize:13}}>
                        Hạng {viewItem.khoa_hoc.loai_bang}
                      </span>
                    )}

                    {/* Trạng thái */}
                    <div className="hoso-detail-status-wrap">
                      {(() => {
                        const ts = TRANG_THAI_MAP[viewItem.trang_thai] || { text: viewItem.trang_thai, cls:'badge-gray' }
                        return <span className={`badge ${ts.cls}`} style={{fontSize:13}}>{ts.text}</span>
                      })()}
                      <span className={`badge ${viewItem.trang_thai_hoc_phi === 'da_dong' ? 'badge-success' : 'badge-danger'}`} style={{fontSize:13}}>
                        {viewItem.trang_thai_hoc_phi === 'da_dong' ? '✅ Đã đóng HP' : '❌ Chưa đóng HP'}
                      </span>
                    </div>

                    {/* Thống kê nhanh */}
                    <div className="hoso-detail-quick">
                      <div className="hoso-detail-quick-item">
                        <span>{viewItem.nguon_dang_ky === 'online' ? '🌐' : '🏢'}</span>
                        <p>{viewItem.nguon_dang_ky === 'online' ? 'Online' : 'Offline'}</p>
                      </div>
                      <div className="hoso-detail-quick-item">
                        <span>{viewItem.user_id ? '✅' : '⏳'}</span>
                        <p>{viewItem.user_id ? 'Có TK' : 'Chưa TK'}</p>
                      </div>
                      <div className="hoso-detail-quick-item">
                        <span>📅</span>
                        <p>{viewItem.created_at ? new Date(viewItem.created_at).toLocaleDateString('vi-VN') : '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* ── CỘT PHẢI: Thông tin chi tiết ── */}
                  <div className="hoso-detail-right">

                    {/* Thông tin cá nhân */}
                    <div className="detail-section">
                      <div className="detail-section-title">👤 Thông Tin Cá Nhân</div>
                      <div className="detail-grid">
                        <div className="detail-box">
                          <div className="detail-label">Họ và tên</div>
                          <div className="detail-value">{viewItem.ho_ten}</div>
                        </div>
                        <div className="detail-box">
                          <div className="detail-label">Số CCCD</div>
                          <div className="detail-value"><code>{viewItem.so_cccd}</code></div>
                        </div>
                        <div className="detail-box">
                          <div className="detail-label">Ngày sinh</div>
                          <div className="detail-value">
                            {viewItem.ngay_sinh ? new Date(viewItem.ngay_sinh).toLocaleDateString('vi-VN') : '—'}
                          </div>
                        </div>
                        <div className="detail-box">
                          <div className="detail-label">Số điện thoại</div>
                          <div className="detail-value">{viewItem.so_dien_thoai || '—'}</div>
                        </div>
                        <div className="detail-box" style={{gridColumn:'1/-1'}}>
                          <div className="detail-label">Địa chỉ</div>
                          <div className="detail-value">{viewItem.dia_chi || '—'}</div>
                        </div>
                        {viewItem.email && (
                          <div className="detail-box" style={{gridColumn:'1/-1'}}>
                            <div className="detail-label">Email</div>
                            <div className="detail-value">{viewItem.email}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Khóa học */}
                    <div className="detail-section">
                      <div className="detail-section-title">📚 Khóa Học</div>
                      <div className="detail-grid">
                        <div className="detail-box" style={{gridColumn:'1/-1'}}>
                          <div className="detail-label">Tên khóa học</div>
                          <div className="detail-value">{viewItem.khoa_hoc?.ten_khoa || '—'}</div>
                        </div>
                        <div className="detail-box">
                          <div className="detail-label">Học phí khóa học</div>
                          <div className="detail-value">{Number(viewItem.khoa_hoc?.hoc_phi||0).toLocaleString('vi-VN')} VNĐ</div>
                        </div>
                        <div className="detail-box">
                          <div className="detail-label">Đã đóng</div>
                          <div className="detail-value">{Number(viewItem.hoc_phi_da_dong||0).toLocaleString('vi-VN')} VNĐ</div>
                        </div>
                      </div>
                    </div>

                    {/* Lịch sử thanh toán */}
                    {viewItem.thanh_toan?.length > 0 && (
                      <div className="detail-section">
                        <div className="detail-section-title">💰 Lịch Sử Thanh Toán</div>
                        <table className="data-table" style={{marginTop:8}}>
                          <thead>
                            <tr><th>#</th><th>Số tiền</th><th>Phương thức</th><th>Mã GD</th><th>Ngày thu</th></tr>
                          </thead>
                          <tbody>
                            {viewItem.thanh_toan.map((tt, i) => (
                              <tr key={tt.id}>
                                <td>{i+1}</td>
                                <td><strong>{Number(tt.so_tien).toLocaleString('vi-VN')} VNĐ</strong></td>
                                <td style={{textTransform:'capitalize'}}>{tt.phuong_thuc?.replace('_',' ')}</td>
                                <td><code style={{fontSize:11}}>{tt.ma_giao_dich || '—'}</code></td>
                                <td>{tt.created_at ? new Date(tt.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Lớp học + tiến độ */}
                    {(() => {
                      // hocVienLop là hasOne → trả về object đơn (hoặc null)
                      // Normalize về array để map thống nhất
                      const hvlRaw = viewItem.hoc_vien_lop
                      const hvlList = !hvlRaw
                        ? []
                        : Array.isArray(hvlRaw) ? hvlRaw : [hvlRaw]
                      if (hvlList.length === 0) return null
                      return (
                      <div className="detail-section">
                        <div className="detail-section-title">🏫 Lớp Học & Tiến Độ</div>
                        {hvlList.map((hvl, i) => {
                          const lop     = hvl.lop_hoc
                          const khoaLop = lop?.khoa_hoc  // khóa đào tạo của lớp

                          // Lấy ngưỡng từ khóa danh mục (whereNull ma_khoa) — giống backend
                          // Nếu khoaLop là khóa đào tạo theo tháng (có ma_khoa) thì dùng khoa_hoc của hồ sơ
                          const khoaNguong = (khoaLop?.ma_khoa ? viewItem.khoa_hoc : khoaLop) || viewItem.khoa_hoc

                          const maxLT     = khoaNguong?.so_buoi_ly_thuyet_toi_thieu || 0
                          const maxKm     = khoaNguong?.so_km_toi_thieu || 0
                          const maxTH     = lop?.si_so_toi_da || 0   // dùng tạm; thực tế TH đo bằng km

                          const daHocLT   = hvl.so_buoi_ly_thuyet_da_hoc || 0
                          const daHocTH   = hvl.so_buoi_thuc_hanh_da_hoc || 0
                          const daChayKm  = parseFloat(hvl.so_km_da_chay || 0)

                          const pctLT     = maxLT > 0 ? Math.min(Math.round((daHocLT / maxLT) * 100), 100) : 0
                          const pctKm     = maxKm > 0 ? Math.min(Math.round((daChayKm / maxKm) * 100), 100) : 0

                          const duLT      = hvl.du_buoi_ly_thuyet
                          const duKm      = hvl.du_km_thuc_hanh
                          const duDK      = hvl.du_dieu_kien_thi_tn

                          const TRANG_THAI_LOP = {
                            chuan_bi: { text: 'Chuẩn bị', cls: 'badge-info' },
                            dang_hoc: { text: 'Đang học', cls: 'badge-success' },
                            da_ket_thuc: { text: 'Đã kết thúc', cls: 'badge-gray' },
                          }
                          const tsLop = TRANG_THAI_LOP[lop?.trang_thai] || { text: lop?.trang_thai, cls: 'badge-gray' }

                          const hangKhongCanKm = ['A1', 'A']
                          const canKm = !hangKhongCanKm.includes(viewItem.khoa_hoc?.loai_bang)

                          return (
                            <div key={i} className="tiendo-lop-card">
                              {/* Header lớp */}
                              <div className="tiendo-lop-header">
                                <div className="tiendo-lop-title">
                                  <span className="tiendo-lop-name">{lop?.ten_lop || '—'}</span>
                                  <span className={`badge ${tsLop.cls}`}>{tsLop.text}</span>
                                </div>
                                {duDK && (
                                  <span className="badge badge-success tiendo-du-dk">✅ Đủ ĐK thi TN</span>
                                )}
                              </div>

                              {/* Thông tin lớp */}
                              <div className="tiendo-lop-info">
                                <span>🎓 GV LT: <strong>{lop?.giang_vien_ly_thuyet?.user?.ho_ten || '—'}</strong></span>
                                <span>🚗 GV TH: <strong>{lop?.giang_vien_thuc_hanh?.user?.ho_ten || '—'}</strong></span>
                                <span>📅 Xếp lớp: <strong>{hvl.ngay_xep_lop ? new Date(hvl.ngay_xep_lop).toLocaleDateString('vi-VN') : '—'}</strong></span>
                              </div>

                              {/* Tiến độ Lý thuyết */}
                              <div className="tiendo-section">
                                <div className="tiendo-row-header">
                                  <span className="tiendo-label">📖 Lý thuyết</span>
                                  <span className="tiendo-value">
                                    <strong style={{color: duLT ? '#10b981' : '#1d4ed8'}}>{daHocLT}</strong>
                                    {maxLT > 0 && <span style={{color:'#6b7280'}}>/{maxLT} buổi</span>}
                                    {duLT && <span className="tiendo-check">✅</span>}
                                  </span>
                                </div>
                                {maxLT > 0 && (
                                  <div className="tiendo-bar-wrap">
                                    <div className="tiendo-bar">
                                      <div
                                        className="tiendo-bar-fill"
                                        style={{
                                          width: `${pctLT}%`,
                                          background: duLT ? '#10b981' : '#3b82f6'
                                        }}
                                      />
                                    </div>
                                    <span className="tiendo-pct">{pctLT}%</span>
                                  </div>
                                )}
                              </div>

                              {/* Tiến độ Thực hành */}
                              <div className="tiendo-section">
                                <div className="tiendo-row-header">
                                  <span className="tiendo-label">🚗 Thực hành</span>
                                  <span className="tiendo-value">
                                    <strong style={{color: duKm ? '#10b981' : '#1d4ed8'}}>{daHocTH}</strong>
                                    <span style={{color:'#6b7280'}}> buổi</span>
                                    {canKm && (
                                      <span style={{marginLeft:8}}>
                                        <strong style={{color: duKm ? '#10b981' : '#1d4ed8'}}>
                                          {daChayKm % 1 === 0 ? daChayKm : daChayKm.toFixed(1)}
                                        </strong>
                                        {maxKm > 0 && <span style={{color:'#6b7280'}}>/{maxKm} km</span>}
                                        {duKm && <span className="tiendo-check">✅</span>}
                                      </span>
                                    )}
                                    {!canKm && <span className="tiendo-check">✅</span>}
                                  </span>
                                </div>
                                {canKm && maxKm > 0 && (
                                  <div className="tiendo-bar-wrap">
                                    <div className="tiendo-bar">
                                      <div
                                        className="tiendo-bar-fill"
                                        style={{
                                          width: `${pctKm}%`,
                                          background: duKm ? '#10b981' : '#f59e0b'
                                        }}
                                      />
                                    </div>
                                    <span className="tiendo-pct">{pctKm}%</span>
                                  </div>
                                )}
                                {!canKm && (
                                  <p style={{fontSize:12, color:'#6b7280', marginTop:4}}>
                                    Bằng hạng {viewItem.khoa_hoc?.loai_bang} không yêu cầu km thực hành
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      )
                    })()}

                    {/* Kết quả thi */}
                    {viewItem.ket_qua_thi?.length > 0 && (
                      <div className="detail-section">
                        <div className="detail-section-title">🎯 Kết Quả Thi</div>
                        <table className="data-table" style={{marginTop:8}}>
                          <thead>
                            <tr><th>#</th><th>Bài thi</th><th>Điểm</th><th>Kết quả</th><th>Ngày thi</th></tr>
                          </thead>
                          <tbody>
                            {viewItem.ket_qua_thi.map((kq, i) => (
                              <tr key={kq.id}>
                                <td>{i+1}</td>
                                <td>{kq.bai_thi?.ten_bai_thi || kq.lich_thi?.ten_ky_thi || '—'}</td>
                                <td><strong>{kq.diem ?? '—'}</strong></td>
                                <td>
                                  <span className={`badge ${kq.ket_qua === 'dat' ? 'badge-success' : 'badge-danger'}`}>
                                    {kq.ket_qua === 'dat' ? '✅ Đạt' : '❌ Không đạt'}
                                  </span>
                                </td>
                                <td>{kq.created_at ? new Date(kq.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setViewItem(null)}>Đóng</button>
              <button className="btn btn-warning" onClick={() => { setViewItem(null); openEdit(viewItem) }}>✏️ Chỉnh sửa</button>
              {!viewItem.user_id && viewItem.trang_thai_hoc_phi === 'da_dong' && (
                <button className="btn btn-success" onClick={() => handleTaoTaiKhoan(viewItem)}>
                  🔑 Tạo tài khoản
                </button>
              )}
              {/* Nút fix trạng thái khi bị lệch: đang trong lớp nhưng trạng thái sai */}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL THU PHÍ THI LẠI ── */}
      {showPhiThiLaiModal && selected && (
        <div className="modal-overlay" onClick={() => setShowPhiThiLaiModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>🔁 Thu Phí Thi Lại</h3>
                <p style={{ fontSize:12, color:'#718096', marginTop:3 }}>
                  {selected.ho_ten} — {selected.so_cccd}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowPhiThiLaiModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {phiThiLaiLoading ? (
                <div className="loading-wrap"><div className="spinner"/></div>
              ) : phiThiLaiData.length === 0 ? (
                <div className="empty-state">
                  <span>✅</span>
                  <h3>Không có khoản phí thi lại nào chưa thu</h3>
                  <p>Học viên chưa có bài thi rớt hoặc đã thu phí đầy đủ.</p>
                </div>
              ) : (
                <>
                  <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#92400e', marginBottom:14 }}>
                    ℹ️ Lần đầu thi được <strong>miễn phí</strong>. Chỉ thu phí từ lần thi lại (bài chưa đạt).
                  </div>

                  {/* Nhóm theo lịch thi */}
                  {Object.values(
                    phiThiLaiData.reduce((acc, b) => {
                      const k = b.lich_thi_id
                      if (!acc[k]) acc[k] = { lich_thi_id: k, ngay_thi: b.ngay_thi, loai_thi: b.loai_thi, bai_thi: [] }
                      acc[k].bai_thi.push(b)
                      return acc
                    }, {})
                  ).map(lichObj => (
                    <div key={lichObj.lich_thi_id} style={{ marginBottom:16 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#0d47a1', marginBottom:8, padding:'6px 10px', background:'#eff6ff', borderRadius:6 }}>
                        📅 {lichObj.ngay_thi ? new Date(lichObj.ngay_thi).toLocaleDateString('vi-VN') : '—'}
                        &nbsp;—&nbsp;
                        {lichObj.loai_thi === 'tot_nghiep' ? '🎓 Tốt nghiệp' : '🏛️ Sát hạch'}
                      </div>
                      {lichObj.bai_thi.map(b => (
                        <label key={b.bai_thi_id} style={{
                          display:'flex', alignItems:'center', gap:12,
                          padding:'10px 14px', borderRadius:8, marginBottom:6, cursor:'pointer',
                          border:`1px solid ${selectedBaiThiIds.includes(b.bai_thi_id) ? '#0d47a1' : '#e2e8f0'}`,
                          background: selectedBaiThiIds.includes(b.bai_thi_id) ? '#eff6ff' : '#fff',
                          transition:'all .15s'
                        }}>
                          <input type="checkbox"
                            checked={selectedBaiThiIds.includes(b.bai_thi_id)}
                            onChange={() => setSelectedBaiThiIds(prev =>
                              prev.includes(b.bai_thi_id)
                                ? prev.filter(x => x !== b.bai_thi_id)
                                : [...prev, b.bai_thi_id]
                            )}
                          />
                          <div style={{ flex:1 }}>
                            <strong style={{ fontSize:14 }}>{b.ten_bai_thi}</strong>
                            <span className={`badge ${b.ket_qua === 'vang_mat' ? 'badge-warning' : 'badge-danger'}`}
                              style={{ marginLeft:8, fontSize:11 }}>
                              {b.ket_qua === 'vang_mat' ? '⚠️ Vắng' : '❌ Không đạt'}
                            </span>
                            {b.diem != null && (
                              <span style={{ fontSize:12, color:'#718096', marginLeft:8 }}>Điểm: {b.diem}</span>
                            )}
                          </div>
                          <strong style={{ color:'#dc2626', fontSize:14, flexShrink:0 }}>
                            {Number(b.phi_thi_lai || 0).toLocaleString('vi-VN')} ₫
                          </strong>
                        </label>
                      ))}
                    </div>
                  ))}

                  {selectedBaiThiIds.length > 0 && (
                    <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 14px', marginBottom:12 }}>
                      <strong style={{ color:'#15803d', fontSize:13 }}>
                        Tổng phí: {Number(
                          phiThiLaiData.filter(b => selectedBaiThiIds.includes(b.bai_thi_id))
                            .reduce((s, b) => s + Number(b.phi_thi_lai || 0), 0)
                        ).toLocaleString('vi-VN')} ₫ ({selectedBaiThiIds.length} bài)
                      </strong>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Phương thức thanh toán *</label>
                    <select value={phuongThucTL} onChange={e => setPhuongThucTL(e.target.value)}>
                      <option value="tien_mat">💵 Tiền mặt</option>
                      <option value="chuyen_khoan">🏦 Chuyển khoản</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPhiThiLaiModal(false)}>Hủy</button>
              {selectedBaiThiIds.length > 0 && (
                <button className="btn btn-primary" onClick={handleThuPhiThiLai}>
                  💳 Xác nhận thu phí ({selectedBaiThiIds.length} bài)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HoSoManagement
