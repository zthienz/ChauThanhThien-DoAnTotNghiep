import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAdmin } from '../../context/AdminContext'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import './HocPhiManagement.css'

const PHUONG_THUC_MAP = {
  tien_mat:     { text: '💵 Tiền mặt',     cls: 'badge-gray' },
  chuyen_khoan: { text: '🏦 Chuyển khoản', cls: 'badge-blue' },
}

const fmtMoney = v => Number(v || 0).toLocaleString('vi-VN') + ' ₫'
const fmtDate  = d => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

const LOAI_THI_MAP = { tot_nghiep: 'Tốt nghiệp', sat_hanh: 'Sát hạch' }

const HocPhiManagement = () => {
  const { token, backendUrl } = useAdmin()
  const [tab, setTab]           = useState('hoc_phi')

  // ── Tab Học phí ──
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterPM, setFilterPM] = useState('')
  const [filterThang, setFilterThang] = useState('')
  const [filterNam, setFilterNam]     = useState('')
  const [filterBang, setFilterBang]   = useState('')
  const [filterKhoa, setFilterKhoa]   = useState('')
  const [filterLoaiTien, setFilterLoaiTien] = useState('')
  const [viewItem, setViewItem] = useState(null)

  // ── Tab Phí thi lại ──
  const [phiList, setPhiList]       = useState([])
  const [phiLoading, setPhiLoading] = useState(false)
  const [phiSearch, setPhiSearch]   = useState('')

  // ── Modal thu phí thi lại ──
  const [showThuPhiModal, setShowThuPhiModal] = useState(false)
  const [selectedHoSo, setSelectedHoSo]       = useState(null)
  const [phiChuaThu, setPhiChuaThu]           = useState([])
  const [phiChuaThuLoading, setPhiChuaThuLoading] = useState(false)
  const [selectedBaiThiIds, setSelectedBaiThiIds] = useState([])
  const [phuongThuc, setPhuongThuc]           = useState('tien_mat')
  const [maGiaoDich, setMaGiaoDich]           = useState('')

  const headers = { Authorization: `Bearer ${token}` }
  const invoiceRef = useRef(null)

  const fetchHocPhi = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${backendUrl}/api/admin/hoc-phi`, { headers })
      if (res.data.success) setList(res.data.data)
    } catch { toast.error('Lỗi tải dữ liệu') }
    finally { setLoading(false) }
  }

  const handleDelete = async (item) => {
    const loai   = item._loai === 'phi_thi_lai' ? 'phí thi lại' : 'học phí'
    const ten    = item.ho_so?.ho_ten || 'học viên này'
    const soTien = fmtMoney(item.so_tien)
    if (!confirm(`Xóa giao dịch ${loai} của "${ten}" — ${soTien}?\n\nLưu ý: Hành động này không thể hoàn tác.`)) return
    try {
      const endpoint = item._loai === 'phi_thi_lai'
        ? `${backendUrl}/api/admin/phi-thi-lai/${item.id}`
        : `${backendUrl}/api/admin/hoc-phi/${item.id}`
      const res = await axios.delete(endpoint, { headers })
      if (res.data.success) {
        toast.success(res.data.message || 'Đã xóa giao dịch')
        fetchHocPhi()
        fetchPhiThiLai()
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi xóa giao dịch') }
  }

  const fetchPhiThiLai = async () => {
    setPhiLoading(true)
    try {
      const res = await axios.get(`${backendUrl}/api/admin/phi-thi-lai`, {
        headers,
        params: { search: phiSearch || undefined }
      })
      if (res.data.success) setPhiList(res.data.data)
    } catch { toast.error('Lỗi tải dữ liệu phí thi lại') }
    finally { setPhiLoading(false) }
  }

  useEffect(() => { fetchHocPhi() }, [])
  useEffect(() => { fetchPhiThiLai() }, [phiSearch])

  // Mở modal thu phí thi lại cho 1 học viên
  const openThuPhi = async (hoSoId, hoTen, soCccd) => {
    setSelectedHoSo({ id: hoSoId, ho_ten: hoTen, so_cccd: soCccd })
    setSelectedBaiThiIds([])
    setPhuongThuc('tien_mat')
    setMaGiaoDich('')
    setPhiChuaThuLoading(true)
    setShowThuPhiModal(true)
    try {
      const res = await axios.get(
        `${backendUrl}/api/admin/ho-so/${hoSoId}/phi-thi-lai-chua-thu`,
        { headers }
      )
      if (res.data.success) setPhiChuaThu(res.data.data)
    } catch { toast.error('Lỗi tải dữ liệu') }
    finally { setPhiChuaThuLoading(false) }
  }

  const handleThuPhi = async () => {
    if (selectedBaiThiIds.length === 0) { toast.warning('Chưa chọn bài thi nào'); return }
    // Nhóm theo lich_thi_id — chỉ thu 1 lần 1 lịch thi
    const lichThiId = phiChuaThu.find(b => selectedBaiThiIds.includes(b.bai_thi_id))?.lich_thi_id
    if (!lichThiId) { toast.error('Không xác định được lịch thi'); return }

    try {
      const res = await axios.post(
        `${backendUrl}/api/admin/ho-so/${selectedHoSo.id}/phi-thi-lai`,
        {
          bai_thi_ids:  selectedBaiThiIds,
          lich_thi_id:  lichThiId,
          phuong_thuc:  phuongThuc,
          ma_giao_dich: maGiaoDich || undefined,
        },
        { headers }
      )
      if (res.data.success) {
        toast.success(`${res.data.message} — ${fmtMoney(res.data.tong_phi)}`)
        setShowThuPhiModal(false)
        fetchPhiThiLai()
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  // ── Filter học phí ──
  // Gộp cả học phí và phí thi lại tùy filterLoaiTien
  const combinedList = (() => {
    const hp  = list.map(i => ({ ...i, _loai: 'hoc_phi' }))
    const ptl = phiList.map(i => ({ ...i, _loai: 'phi_thi_lai',
      ho_so: i.ho_so,
      ngay_thanh_toan: i.ngay_thanh_toan,
    }))
    if (filterLoaiTien === 'hoc_phi')    return hp
    if (filterLoaiTien === 'phi_thi_lai') return ptl
    return [...hp, ...ptl]
  })()

  const filteredHP = combinedList.filter(item => {
    const matchSearch = !search ||
      item.ho_so?.ho_ten?.toLowerCase().includes(search.toLowerCase()) ||
      item.ho_so?.so_cccd?.includes(search) ||
      (item.ma_giao_dich || '').includes(search)
    const matchPM    = !filterPM    || item.phuong_thuc === filterPM
    const ngay       = item.ngay_thanh_toan ? new Date(item.ngay_thanh_toan) : null
    const matchThang = !filterThang || (ngay && String(ngay.getMonth() + 1) === filterThang)
    const matchNam   = !filterNam   || (ngay && String(ngay.getFullYear()) === filterNam)
    const loaiBang   = item.ho_so?.khoa_hoc?.loai_bang || item.ho_so?.khoa_hoc?.hang_bang || ''
    const matchBang  = !filterBang  || loaiBang === filterBang
    const tenKhoa    = item.ho_so?.khoa_hoc?.ten_khoa || ''
    const matchKhoa  = !filterKhoa  || tenKhoa === filterKhoa
    return matchSearch && matchPM && matchThang && matchNam && matchBang && matchKhoa
  })

  // Danh sách hạng bằng, năm và khóa học từ dữ liệu
  const allItems  = [...list, ...phiList]
  const bangList  = [...new Set(allItems.map(i => i.ho_so?.khoa_hoc?.loai_bang || i.ho_so?.khoa_hoc?.hang_bang).filter(Boolean))].sort()
  const namList   = [...new Set(allItems.map(i => i.ngay_thanh_toan ? new Date(i.ngay_thanh_toan).getFullYear() : null).filter(Boolean))].sort((a,b) => b-a)
  const khoaList  = [...new Set(allItems.map(i => i.ho_so?.khoa_hoc?.ten_khoa).filter(Boolean))].sort()

  const tongThu = filteredHP.reduce((s, i) => s + Number(i.so_tien || 0), 0)
  const tienMat = filteredHP.filter(i => i.phuong_thuc === 'tien_mat').reduce((s, i) => s + Number(i.so_tien || 0), 0)
  const online  = filteredHP.filter(i => i.phuong_thuc !== 'tien_mat').reduce((s, i) => s + Number(i.so_tien || 0), 0)

  // Tính tổng phí thi lại đang hiển thị
  const tongPhiThiLai = phiList.reduce((s, i) => s + Number(i.so_tien || 0), 0)

  // Tính tổng phí cần thu khi chọn bài
  const tongChon = phiChuaThu
    .filter(b => selectedBaiThiIds.includes(b.bai_thi_id))
    .reduce((s, b) => s + Number(b.phi_thi_lai || 0), 0)

  // Nhóm phiChuaThu theo lich_thi_id
  const phiTheaLich = phiChuaThu.reduce((acc, b) => {
    const key = b.lich_thi_id
    if (!acc[key]) acc[key] = { lich_thi_id: key, ngay_thi: b.ngay_thi, loai_thi: b.loai_thi, bai_thi: [] }
    acc[key].bai_thi.push(b)
    return acc
  }, {})

  // ── Helper: render div HTML hóa đơn và xuất PDF ──
  const renderAndExportPDF = async (htmlContent, fileName) => {
    const div = document.createElement('div')
    div.style.cssText = `
      position:fixed; left:-9999px; top:0;
      width:794px; background:#fff; padding:40px 48px;
      font-family:'Times New Roman',serif; font-size:13px; color:#111;
      line-height:1.6;
    `
    div.innerHTML = htmlContent
    document.body.appendChild(div)
    toast.info('Đang tạo hóa đơn...', { autoClose: 2000 })
    try {
      const canvas = await html2canvas(div, { scale: 2, useCORS: true, backgroundColor: '#fff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = (canvas.height * pdfW) / canvas.width
      const pageH = pdf.internal.pageSize.getHeight()
      if (pdfH <= pageH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
      } else {
        let yPos = 0
        while (yPos < pdfH) {
          if (yPos > 0) pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, -yPos, pdfW, pdfH)
          yPos += pageH
        }
      }
      pdf.save(fileName)
      toast.success('Đã xuất hóa đơn PDF!')
    } catch (err) {
      toast.error('Xuất hóa đơn thất bại: ' + err.message)
    } finally {
      document.body.removeChild(div)
    }
  }

  // ── Xuất hóa đơn 1 giao dịch (nút trong từng dòng) ──
  const xuatHoaDonDon = async (item) => {
    const now      = new Date().toLocaleDateString('vi-VN')
    const isThiLai = item._loai === 'phi_thi_lai'
    const loaiLabel = isThiLai ? 'Phí thi lại' : 'Học phí'
    const tenKhoa  = isThiLai
      ? (item.bai_thi?.ten_bai_thi || '—')
      : (item.ho_so?.khoa_hoc?.ten_khoa || '—')
    const hang     = item.ho_so?.khoa_hoc?.loai_bang || item.ho_so?.khoa_hoc?.hang_bang || '—'
    const maGD     = item.ma_giao_dich ? `<tr><td style="padding:7px 0; color:#555; width:160px;">Mã giao dịch</td><td style="padding:7px 0; font-weight:700; font-family:monospace;">${item.ma_giao_dich}</td></tr>` : ''
    const ghiChu   = item.ghi_chu ? `<tr><td style="padding:7px 0; color:#555;">Ghi chú</td><td style="padding:7px 0;">${item.ghi_chu}</td></tr>` : ''

    const html = `
      <div style="text-align:center; margin-bottom:24px;">
        <div style="font-size:22px; font-weight:700; letter-spacing:1px; color:#0d47a1;">PHIẾU THU</div>
        <div style="font-size:13px; margin-top:4px; font-weight:600;">Trung Tâm Dạy Lái Xe Sao Việt</div>
        <div style="font-size:12px; color:#555;">495C Đường CMT8, Phường Hoà Hưng (P.13, Q.10), TP.HCM</div>
        <div style="font-size:12px; color:#555;">☎ 0934 057 333 &nbsp;|&nbsp; ✉ daotolaixesaoviet@gmail.com</div>
      </div>
      <hr style="border:2px solid #0d47a1; margin-bottom:20px;">
      <table style="width:100%; font-size:13px; margin-bottom:20px;">
        <tr>
          <td style="padding:7px 0; color:#555; width:160px; vertical-align:top;">Họ và tên học viên</td>
          <td style="padding:7px 0; font-weight:700; font-size:15px;">${item.ho_so?.ho_ten || '—'}</td>
          <td style="padding:7px 0; color:#555; width:140px; text-align:right; vertical-align:top;">Ngày xuất</td>
          <td style="padding:7px 0; text-align:right; width:120px;">${now}</td>
        </tr>
        <tr>
          <td style="padding:7px 0; color:#555;">Số CCCD</td>
          <td style="padding:7px 0; font-family:monospace; font-size:14px;">${item.ho_so?.so_cccd || '—'}</td>
        </tr>
        <tr>
          <td style="padding:7px 0; color:#555;">Khóa / Bài thi</td>
          <td style="padding:7px 0;">${tenKhoa}</td>
          <td style="padding:7px 0; color:#555; text-align:right;">Hạng bằng</td>
          <td style="padding:7px 0; text-align:right; font-weight:700; color:#1d4ed8;">${hang !== '—' ? 'Hạng ' + hang : '—'}</td>
        </tr>
        <tr>
          <td style="padding:7px 0; color:#555;">Loại thu</td>
          <td style="padding:7px 0;">${loaiLabel}</td>
        </tr>
        <tr>
          <td style="padding:7px 0; color:#555;">Phương thức</td>
          <td style="padding:7px 0;">${item.phuong_thuc === 'tien_mat' ? 'Tiền mặt' : 'Chuyển khoản'}</td>
          <td style="padding:7px 0; color:#555; text-align:right;">Người thu</td>
          <td style="padding:7px 0; text-align:right;">${item.nguoi_thu || '—'}</td>
        </tr>
        <tr>
          <td style="padding:7px 0; color:#555;">Ngày thu</td>
          <td style="padding:7px 0;">${fmtDate(item.ngay_thanh_toan)}</td>
        </tr>
        ${maGD}
        ${ghiChu}
      </table>
      <div style="background:#e8f5e9; border:2px solid #4caf50; border-radius:8px; padding:16px 24px; margin:20px 0; text-align:center;">
        <div style="font-size:13px; color:#555; margin-bottom:4px;">Số tiền đã thu</div>
        <div style="font-size:28px; font-weight:700; color:#16a34a;">${fmtMoney(item.so_tien)}</div>
        <div style="font-size:12px; color:#16a34a; margin-top:4px;">✅ Thanh toán thành công</div>
      </div>
      <div style="margin-top:40px; display:flex; justify-content:space-between;">
        <div style="text-align:center; width:200px;">
          <div style="font-size:13px; font-weight:700;">Người nộp tiền</div>
          <div style="font-size:11px; color:#888; margin-top:4px;">Ký, ghi rõ họ tên</div>
          <div style="margin-top:52px; border-top:1px solid #999; padding-top:4px; font-size:12px;">${item.ho_so?.ho_ten || ''}</div>
        </div>
        <div style="text-align:center; width:200px;">
          <div style="font-size:13px; font-weight:700;">Người thu tiền</div>
          <div style="font-size:11px; color:#888; margin-top:4px;">Ký, ghi rõ họ tên</div>
          <div style="margin-top:52px; border-top:1px solid #999; padding-top:4px; font-size:12px;">${item.nguoi_thu || 'Quản Trị Viên'}</div>
        </div>
      </div>
      <div style="text-align:center; margin-top:24px; font-size:11px; color:#aaa; border-top:1px solid #eee; padding-top:8px;">
        Trung Tâm Dạy Lái Xe Sao Việt — daotolaixesaoviet@gmail.com — 0934 057 333
      </div>
    `

    const hoTenFile = (item.ho_so?.ho_ten || 'HocVien').replace(/\s+/g, '')
    const ngayFile  = item.ngay_thanh_toan ? new Date(item.ngay_thanh_toan).toLocaleDateString('vi-VN').replace(/\//g, '-') : 'NoDate'
    await renderAndExportPDF(html, `PhieuThu_${hoTenFile}_${ngayFile}.pdf`)
  }

  // ── Xuất hóa đơn doanh thu PDF (html2canvas) ──
  const xuatHoaDon = async () => {
    if (filteredHP.length === 0) { toast.warning('Không có dữ liệu để xuất'); return }

    const filterDesc = [
      filterBang  ? `Hạng ${filterBang}` : '',
      filterThang ? `Tháng ${filterThang}` : '',
      filterNam   ? `Năm ${filterNam}` : '',
      filterPM    ? (PHUONG_THUC_MAP[filterPM]?.text || filterPM) : '',
    ].filter(Boolean).join(' · ') || 'Tất cả'

    const now = new Date().toLocaleDateString('vi-VN')

    const html = `
      <div style="text-align:center; margin-bottom:20px;">
        <div style="font-size:22px; font-weight:700; letter-spacing:1px; color:#0d47a1;">HÓA ĐƠN DOANH THU</div>
        <div style="font-size:13px; margin-top:4px;">Trung Tâm Dạy Lái Xe Sao Việt</div>
        <div style="font-size:12px; color:#555;">495C Đường CMT8, Phường Hoà Hưng (P.13, Q.10), TP.HCM</div>
        <div style="font-size:12px; color:#555;">☎ 0934 057 333 &nbsp;|&nbsp; ✉ daotolaixesaoviet@gmail.com</div>
      </div>
      <hr style="border:2px solid #0d47a1; margin-bottom:16px;">
      <table style="width:100%; margin-bottom:12px; font-size:13px;">
        <tr>
          <td><b>Điều kiện lọc:</b> ${filterDesc}</td>
          <td style="text-align:right;"><b>Ngày xuất:</b> ${now}</td>
        </tr>
        <tr>
          <td><b>Số giao dịch:</b> ${filteredHP.length}</td>
        </tr>
      </table>
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:13px;">
        <tr style="background:#e8f0fe;">
          <td style="padding:8px 12px; font-weight:700; border:1px solid #c5d5f0;">Tổng thu</td>
          <td style="padding:8px 12px; font-weight:700; color:#16a34a; border:1px solid #c5d5f0;">${fmtMoney(tongThu)}</td>
          <td style="padding:8px 12px; font-weight:700; border:1px solid #c5d5f0;">Tiền mặt</td>
          <td style="padding:8px 12px; font-weight:700; border:1px solid #c5d5f0;">${fmtMoney(tienMat)}</td>
          <td style="padding:8px 12px; font-weight:700; border:1px solid #c5d5f0;">Chuyển khoản</td>
          <td style="padding:8px 12px; font-weight:700; border:1px solid #c5d5f0;">${fmtMoney(online)}</td>
        </tr>
      </table>
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr style="background:#0d47a1; color:#fff;">
            <th style="padding:8px 6px; border:1px solid #1565c0; text-align:center;">#</th>
            <th style="padding:8px 6px; border:1px solid #1565c0; text-align:left;">Học viên</th>
            <th style="padding:8px 6px; border:1px solid #1565c0; text-align:left;">CCCD</th>
            <th style="padding:8px 6px; border:1px solid #1565c0; text-align:left;">Khóa học</th>
            <th style="padding:8px 6px; border:1px solid #1565c0; text-align:right;">Số tiền</th>
            <th style="padding:8px 6px; border:1px solid #1565c0; text-align:center;">Phương thức</th>
            <th style="padding:8px 6px; border:1px solid #1565c0; text-align:center;">Ngày thu</th>
          </tr>
        </thead>
        <tbody>
          ${filteredHP.map((item, i) => `
            <tr style="background:${i % 2 === 0 ? '#f5f8ff' : '#fff'};">
              <td style="padding:7px 6px; border:1px solid #dde3ee; text-align:center;">${i + 1}</td>
              <td style="padding:7px 6px; border:1px solid #dde3ee; font-weight:600;">${item.ho_so?.ho_ten || '—'}</td>
              <td style="padding:7px 6px; border:1px solid #dde3ee; font-family:monospace;">${item.ho_so?.so_cccd || '—'}</td>
              <td style="padding:7px 6px; border:1px solid #dde3ee;">${item.ho_so?.khoa_hoc?.ten_khoa || '—'}</td>
              <td style="padding:7px 6px; border:1px solid #dde3ee; text-align:right; color:#16a34a; font-weight:700;">${fmtMoney(item.so_tien)}</td>
              <td style="padding:7px 6px; border:1px solid #dde3ee; text-align:center;">${item.phuong_thuc === 'tien_mat' ? '💵 Tiền mặt' : '🏦 Chuyển khoản'}</td>
              <td style="padding:7px 6px; border:1px solid #dde3ee; text-align:center;">${fmtDate(item.ngay_thanh_toan)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top:32px; display:flex; justify-content:flex-end;">
        <div style="text-align:center;">
          <div style="font-size:13px; font-weight:700;">Người lập hóa đơn</div>
          <div style="font-size:11px; color:#888; margin-top:4px;">Ký, ghi rõ họ tên</div>
          <div style="margin-top:48px; border-top:1px solid #999; width:160px; padding-top:4px; font-size:12px;">Quản Trị Viên</div>
        </div>
      </div>
      <div style="text-align:center; margin-top:24px; font-size:11px; color:#aaa; border-top:1px solid #eee; padding-top:8px;">
        Trung Tâm Dạy Lái Xe Sao Việt — daotolaixesaoviet@gmail.com — 0934 057 333
      </div>
    `

    const fileName = `HoaDon_${filterBang||'TatCa'}_${filterThang ? 'T'+filterThang : 'TatCaThang'}_${filterNam||'TatCaNam'}.pdf`
    await renderAndExportPDF(html, fileName)
  }

  return (
    <div className="hocphi-page">
      <div className="page-header">
        <div>
          <h2>💰 Quản Lý Học Phí</h2>
          <p>Theo dõi lịch sử thu học phí và phí thi lại</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline" onClick={fetchHocPhi}>
            🔄 Làm mới
          </button>
          <button className="btn btn-primary" onClick={xuatHoaDon}>
            📄 Xuất hóa đơn
          </button>
        </div>
      </div>

      {/* ── NỘI DUNG ── */}
      <>
          <div className="hocphi-stats">
            {[
              { icon:'📋', label:'Giao dịch',             value: filteredHP.length,      cls:'' },
              { icon:'💰', label:'Tổng thu',               value: fmtMoney(tongThu),      cls:'green' },
              { icon:'💵', label:'Tiền mặt',               value: fmtMoney(tienMat),      cls:'orange' },
              { icon:'🏦', label:'Chuyển khoản / Online',  value: fmtMoney(online),       cls:'blue' },
            ].map((s, i) => (
              <div key={i} className={`hocphi-stat-card ${s.cls}`}>
                <div className="hocphi-stat-icon">{s.icon}</div>
                <div>
                  <div className="hocphi-stat-value">{s.value}</div>
                  <div className="hocphi-stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="search-bar">
            <input className="search-input" placeholder="🔍 Tìm theo tên, CCCD, mã giao dịch..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="search-input" style={{ maxWidth:150 }} value={filterBang} onChange={e => setFilterBang(e.target.value)}>
              <option value="">Tất cả hạng</option>
              {bangList.map(h => <option key={h} value={h}>Hạng {h}</option>)}
            </select>
            <select className="search-input" style={{ maxWidth:130 }} value={filterThang} onChange={e => setFilterThang(e.target.value)}>
              <option value="">Tất cả tháng</option>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(t => <option key={t} value={t}>Tháng {t}</option>)}
            </select>
            <select className="search-input" style={{ maxWidth:110 }} value={filterNam} onChange={e => setFilterNam(e.target.value)}>
              <option value="">Tất cả năm</option>
              {namList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select className="search-input" style={{ maxWidth:200 }} value={filterPM} onChange={e => setFilterPM(e.target.value)}>
              <option value="">Tất cả phương thức</option>
              {Object.entries(PHUONG_THUC_MAP).map(([k, v]) => <option key={k} value={k}>{v.text}</option>)}
            </select>
            <select className="search-input" style={{ maxWidth:200 }} value={filterKhoa} onChange={e => setFilterKhoa(e.target.value)}>
              <option value="">Tất cả khóa học</option>
              {khoaList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <select className="search-input" style={{ maxWidth:180 }} value={filterLoaiTien} onChange={e => setFilterLoaiTien(e.target.value)}>
              <option value="">Tất cả loại tiền</option>
              <option value="hoc_phi">📚 Tiền học phí</option>
              <option value="phi_thi_lai">🔁 Phí thi lại</option>
            </select>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding:0 }}>
              {loading ? <div className="loading-wrap"><div className="spinner"/></div> : (
                <table className="data-table">
                  <thead>
                    <tr><th>#</th><th>Học viên</th><th>CCCD</th><th>Khóa / Bài thi</th><th>Bằng Lái</th><th>Số tiền</th><th>Loại tiền</th><th>Phương thức</th><th>Người thu</th><th>Ngày thu</th><th>Thao tác</th></tr>
                  </thead>
                  <tbody>
                    {filteredHP.length === 0 ? (
                      <tr><td colSpan={11} style={{ textAlign:'center', padding:'40px', color:'#a0aec0' }}>Chưa có dữ liệu học phí</td></tr>
                    ) : filteredHP.map((item, i) => {
                      const pm = PHUONG_THUC_MAP[item.phuong_thuc] || { text: item.phuong_thuc, cls:'badge-gray' }
                      const isThiLai = item._loai === 'phi_thi_lai'
                      return (
                        <tr key={`${item._loai || 'hp'}-${item.id}`}>
                          <td>{i + 1}</td>
                          <td><strong>{item.ho_so?.ho_ten || '—'}</strong></td>
                          <td><code style={{ fontSize:12 }}>{item.ho_so?.so_cccd || '—'}</code></td>
                          <td style={{ fontSize:12 }}>
                            {isThiLai
                              ? (item.bai_thi?.ten_bai_thi || '—')
                              : (() => {
                                  // Ưu tiên khóa học của lớp (đã xếp lớp)
                                  const khoaTuLop = item.ho_so?.hoc_vien_lop?.lop_hoc?.khoa_hoc
                                  if (khoaTuLop?.ma_khoa) {
                                    return khoaTuLop.ten_khoa_dao_tao || khoaTuLop.ten_khoa || '—'
                                  }
                                  // Chưa xếp lớp → chưa có khóa
                                  return '—'
                                })()
                            }
                          </td>
                          <td>
                            {(() => {
                              const hang = item.ho_so?.khoa_hoc?.loai_bang || item.ho_so?.khoa_hoc?.hang_bang
                              return hang
                                ? <span className="badge badge-blue" style={{fontSize:12}}>Hạng {hang}</span>
                                : <span style={{color:'#9ca3af'}}>—</span>
                            })()}
                          </td>
                          <td><strong style={{ color:'#16a34a' }}>{fmtMoney(item.so_tien)}</strong></td>
                          <td>
                            <span className={`badge ${isThiLai ? 'badge-warning' : 'badge-info'}`} style={{ fontSize:11 }}>
                              {isThiLai ? '🔁 Phí thi lại' : '📚 Học phí'}
                            </span>
                          </td>
                          <td><span className={`badge ${pm.cls}`}>{pm.text}</span></td>
                          <td style={{ fontSize:12 }}>{item.nguoi_thu || '—'}</td>
                          <td style={{ fontSize:12 }}>{fmtDate(item.ngay_thanh_toan)}</td>
                          <td>
                            <div className="action-cell">
                              {!isThiLai && (
                                <button className="btn btn-info btn-sm" onClick={() => setViewItem(item)} title="Xem chi tiết">👁️</button>
                              )}
                              <button
                                className="btn btn-sm"
                                style={{ background:'#0d47a1', color:'#fff' }}
                                onClick={() => xuatHoaDonDon(item)}
                                title="Xuất phiếu thu PDF"
                              >🖨️</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item)} title="Xóa giao dịch">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div style={{ padding:'10px 16px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, fontSize:13, color:'#92400e' }}>
            ℹ️ Để thu học phí học viên, vào <strong>Hồ Sơ Học Viên</strong> → chọn học viên → nhấn <strong>💰 Thu HP</strong>
          </div>
      </>

      {/* ── Modal thu phí thi lại ── */}
      {showThuPhiModal && selectedHoSo && (
        <div className="modal-overlay" onClick={() => setShowThuPhiModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>🔁 Thu Phí Thi Lại</h3>
                <p style={{ fontSize:12, color:'#718096', marginTop:3 }}>
                  {selectedHoSo.ho_ten} — {selectedHoSo.so_cccd}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowThuPhiModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {phiChuaThuLoading ? (
                <div className="loading-wrap"><div className="spinner"/></div>
              ) : Object.keys(phiTheaLich).length === 0 ? (
                <div className="empty-state">
                  <span>✅</span>
                  <h3>Không có khoản phí thi lại nào chưa thu</h3>
                  <p>Học viên này chưa có bài thi rớt hoặc đã thu phí đầy đủ.</p>
                </div>
              ) : (
                <>
                  {Object.values(phiTheaLich).map(lichObj => (
                    <div key={lichObj.lich_thi_id} style={{ marginBottom:16 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#0d47a1', marginBottom:8, padding:'6px 10px', background:'#eff6ff', borderRadius:6 }}>
                        📅 {fmtDate(lichObj.ngay_thi)} — {LOAI_THI_MAP[lichObj.loai_thi] || lichObj.loai_thi}
                      </div>
                      {lichObj.bai_thi.map(b => (
                        <label key={b.bai_thi_id} style={{
                          display:'flex', alignItems:'center', gap:12,
                          padding:'10px 14px', borderRadius:8, marginBottom:6, cursor:'pointer',
                          border:`1px solid ${selectedBaiThiIds.includes(b.bai_thi_id) ? '#0d47a1' : '#e2e8f0'}`,
                          background: selectedBaiThiIds.includes(b.bai_thi_id) ? '#eff6ff' : '#fff',
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
                            <span className={`badge ${b.ket_qua === 'vang_mat' ? 'badge-warning' : 'badge-danger'}`} style={{ marginLeft:8, fontSize:11 }}>
                              {b.ket_qua === 'vang_mat' ? '⚠️ Vắng' : '❌ Không đạt'}
                            </span>
                            {b.diem !== null && b.diem !== undefined && (
                              <span style={{ fontSize:12, color:'#718096', marginLeft:8 }}>Điểm: {b.diem}</span>
                            )}
                          </div>
                          <strong style={{ color:'#dc2626', fontSize:14 }}>{fmtMoney(b.phi_thi_lai)}</strong>
                        </label>
                      ))}
                    </div>
                  ))}

                  {selectedBaiThiIds.length > 0 && (
                    <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 14px', marginTop:12 }}>
                      <strong style={{ color:'#15803d', fontSize:13 }}>
                        Tổng phí: {fmtMoney(tongChon)} ({selectedBaiThiIds.length} bài)
                      </strong>
                    </div>
                  )}

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:14 }}>
                    <div className="form-group">
                      <label>Phương thức thanh toán *</label>
                      <select value={phuongThuc} onChange={e => setPhuongThuc(e.target.value)}>
                        {Object.entries(PHUONG_THUC_MAP).map(([k,v]) => <option key={k} value={k}>{v.text}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Mã giao dịch</label>
                      <input value={maGiaoDich} onChange={e => setMaGiaoDich(e.target.value)} placeholder="Tùy chọn" />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowThuPhiModal(false)}>Hủy</button>
              {selectedBaiThiIds.length > 0 && (
                <button className="btn btn-primary" onClick={handleThuPhi}>
                  💳 Thu {fmtMoney(tongChon)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal xem chi tiết học phí */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💰 Chi Tiết Giao Dịch</h3>
              <button className="modal-close" onClick={() => setViewItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="hocphi-detail-card">
                <div className="hocphi-detail-avatar">{viewItem.ho_so?.ho_ten?.charAt(0).toUpperCase()}</div>
                <div>
                  <p className="hocphi-detail-name">{viewItem.ho_so?.ho_ten}</p>
                  <code className="hocphi-detail-cccd">{viewItem.ho_so?.so_cccd}</code>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 24px', marginTop:16 }}>
                {[
                  ['Khóa học',    viewItem.ho_so?.khoa_hoc?.ten_khoa || '—'],
                  ['Số tiền',     fmtMoney(viewItem.so_tien)],
                  ['Phương thức', PHUONG_THUC_MAP[viewItem.phuong_thuc]?.text || viewItem.phuong_thuc],
                  ['Mã giao dịch',viewItem.ma_giao_dich || '—'],
                  ['Người thu',   viewItem.nguoi_thu || '—'],
                  ['Ngày thu',    fmtDate(viewItem.ngay_thanh_toan)],
                  ['Trạng thái',  viewItem.trang_thai === 'thanh_cong' ? '✅ Thành công' : viewItem.trang_thai],
                  ['Ghi chú',     viewItem.ghi_chu || '—'],
                ].map(([k, v], i) => (
                  <div key={i} style={{ display:'flex', flexDirection:'column', gap:2 }}>
                    <span style={{ color:'#718096', fontSize:12 }}>{k}</span>
                    <strong style={{ fontSize:14 }}>{v}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setViewItem(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HocPhiManagement
