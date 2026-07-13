import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Label, RadialBarChart,
  RadialBar,
} from 'recharts'
import { useAdmin } from '../../context/AdminContext'
import './Dashboard.css'

// ── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { token, backendUrl } = useAdmin()
  const [stats, setStats]           = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)
  const [actLoading, setActLoading] = useState(true)
  const [chartKy, setChartKy]           = useState('thang_nay')
  const [chartData, setChartData]       = useState([])
  const [chartLoading, setChartLoading] = useState(false)
  const [hvChartData, setHvChartData]   = useState([])
  const [extra, setExtra]               = useState(null)
  const [kqKy, setKqKy]                 = useState('tuan')
  const [kqData, setKqData]             = useState([])
  const [kqLoading, setKqLoading]       = useState(false)
  const [hangBangKy, setHangBangKy]     = useState('tat_ca')
  const [hangBangStats, setHangBangStats] = useState([])
  const [hangBangLoading, setHangBangLoading] = useState(false)

  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    axios.get(`${backendUrl}/api/admin/dashboard`, { headers })
      .then(res => { if (res.data.success) setStats(res.data) })
      .catch(() => {}).finally(() => setLoading(false))

    axios.get(`${backendUrl}/api/admin/hoat-dong-gan-day`, { headers })
      .then(res => { if (res.data.success) setActivities(res.data.data) })
      .catch(() => {}).finally(() => setActLoading(false))

    axios.get(`${backendUrl}/api/admin/chart-hoc-vien`, { headers })
      .then(res => { if (res.data.success) setHvChartData(res.data.data) })
      .catch(() => {})

    axios.get(`${backendUrl}/api/admin/dashboard-extra`, { headers })
      .then(res => { if (res.data.success) setExtra(res.data) })
      .catch(() => {})
  }, [token])

  // Fetch kết quả thi khi đổi kỳ
  useEffect(() => {
    setKqLoading(true)
    axios.get(`${backendUrl}/api/admin/chart-ket-qua-thi`, { headers, params: { ky: kqKy } })
      .then(res => { if (res.data.success) setKqData(res.data.data) })
      .catch(() => {})
      .finally(() => setKqLoading(false))
  }, [kqKy, token])

  // Fetch thống kê hạng bằng khi đổi kỳ
  useEffect(() => {
    setHangBangLoading(true)
    axios.get(`${backendUrl}/api/admin/chart-hang-bang`, { headers, params: { ky: hangBangKy } })
      .then(res => { if (res.data.success) setHangBangStats(res.data.data) })
      .catch(() => {})
      .finally(() => setHangBangLoading(false))
  }, [hangBangKy, token])

  useEffect(() => {
    setChartLoading(true)
    axios.get(`${backendUrl}/api/admin/chart-doanh-thu`, { headers, params: { ky: chartKy } })
      .then(res => { if (res.data.success) setChartData(res.data.data) })
      .catch(() => {}).finally(() => setChartLoading(false))
  }, [chartKy, token])

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>

  const s = stats?.stats || {}

  const tongHoSo         = s.tongHoSo         || 0
  const dauTotNghiep     = s.dauTotNghiep      || 0

  // 5 trạng thái hiển thị cố định theo yêu cầu
  const TRANG_THAI_5 = [
    { name: 'Chưa đóng học phí', value: s.choDongHocPhi  || 0, color: '#94a3b8', icon: '💰' },
    { name: 'Chờ mở lớp',        value: s.choMoLop       || 0, color: '#f59e0b', icon: '⏳' },
    { name: 'Đang học',           value: s.dangHoc        || 0, color: '#10b981', icon: '📚' },
    { name: 'Đủ ĐK thi TN',      value: s.duDieuKienThi  || 0, color: '#06b6d4', icon: '✅' },
    { name: 'Đã đậu tốt nghiệp', value: dauTotNghiep,           color: '#8b5cf6', icon: '🎓' },
  ]
  const maxVal = Math.max(...TRANG_THAI_5.map(t => t.value), 1)

  // Dữ liệu đã đủ — không cần biến phụ nào thêm

  // Extra data
  const lopData          = extra?.lop_hoc          || []
  const khoaData         = extra?.khoa_hoc          || []
  const xeInfo           = extra?.xe                || { data: [], tong: 0, san_sang: 0 }
  const xeData           = xeInfo.data              || []
  const gvInfo           = extra?.giang_vien        || { data: [], tong: 0, active: 0 }
  const lichThiList      = extra?.lich_thi          || []

  const KY_MAP = { tuan: '7 Ngày Gần Nhất', thang: '30 Ngày (4 Tuần)', nam: '12 Tháng' }

  const LOAI_THI_MAP = { tot_nghiep: { text: 'Tốt nghiệp', cls: 'badge-blue' }, sat_hanh: { text: 'Sát hạch', cls: 'badge-purple' } }


  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h2>📊 Quản Trị Hệ Thống</h2>
          <p>Tổng quan hoạt động của Trung Tâm Lái Xe Ngôi Sao</p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="dash-stat-grid">
        {[
          { icon:'📋', label:'Tổng Hồ Sơ',        value: s.tongHoSo      || 0,  color:'#3b82f6', to:'/ho-so' },
          { icon:'⏳', label:'Chờ Mở Lớp',         value: s.choMoLop      || 0,  color:'#f59e0b', to:'/ho-so' },
          { icon:'📚', label:'Lớp Đang Học',        value: s.dangHoc       || 0,  color:'#10b981', to:'/lop-hoc' },
          { icon:'🏫', label:'Khóa Học',            value: s.khoaHoc       || 0,  color:'#8b5cf6', to:'/khoa-hoc' },
          { icon:'📅', label:'Lịch Học Hôm Nay',   value: s.lichHoc       || 0,  color:'#06b6d4', to:'/lich-hoc' },
          { icon:'💰', label:'Doanh Thu Tháng',     value: `${Number(s.doanhThu||0).toLocaleString('vi-VN')}đ`, color:'#ef4444', to:'/hoc-phi' },
        ].map((card, i) => (
          <Link key={i} to={card.to} className="dash-stat-card" style={{'--c': card.color}}>
            <div className="dsc-icon">{card.icon}</div>
            <div className="dsc-body"><p>{card.label}</p><h3>{card.value}</h3></div>
            <span className="dsc-arrow">→</span>
          </Link>
        ))}
      </div>

      {/* ── Hàng 1: Doanh thu + Hoạt động gần đây ── */}
      <div className="dash-main-row">
        <div className="card dash-chart-card">
          <div className="card-header">
            <h3>📈 Biểu Đồ Doanh Thu</h3>
            <select className="dash-chart-select" value={chartKy} onChange={e => setChartKy(e.target.value)}>
              <option value="thang_nay">Tháng này</option>
              <option value="thang">12 Tháng</option>
              <option value="quy">Theo Quý</option>
              <option value="nam">5 Năm</option>
            </select>
          </div>
          <div className="card-body" style={{position:'relative'}}>
            {chartLoading && <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,0.7)',zIndex:2}}><div className="spinner"/></div>}
            <ResponsiveContainer width="100%" height={365}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0d47a1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#0d47a1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => {
                  if (v === 0) return '0'
                  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} tỷ`
                  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)} tr`
                  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)} nghìn`
                  return `${v}`
                }} width={72} />
                <Tooltip formatter={v => `${Number(v).toLocaleString('vi-VN')}đ`} labelStyle={{fontWeight:600}} />
                <Area type="monotone" dataKey="revenue" stroke="#0d47a1" strokeWidth={2.5}
                  fill="url(#colorRevenue)" dot={{ r: 4, fill: '#0d47a1', strokeWidth: 0 }}
                  activeDot={{ r: 6 }} name="Doanh thu" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card dash-activity-card">
          <div className="card-header">
            <h3>🔔 Hoạt Động Gần Đây</h3>
            <button className="btn btn-outline btn-sm" onClick={() => {
              setActLoading(true)
              axios.get(`${backendUrl}/api/admin/hoat-dong-gan-day`, { headers })
                .then(res => { if (res.data.success) setActivities(res.data.data) })
                .catch(() => {}).finally(() => setActLoading(false))
            }}>🔄 Làm mới</button>
          </div>
          <div className="card-body dash-activity-body">
            {actLoading ? (
              <div className="loading-wrap"><div className="spinner" /></div>
            ) : activities.length === 0 ? (
              <div className="empty-state" style={{padding:'32px'}}><span>📭</span><p>Chưa có hoạt động nào</p></div>
            ) : (
              <div className="dash-activity-list">
                {activities.map((act, i) => (
                  <Link key={i} to={act.link || '/'} className="dash-act-item">
                    <div className="dash-act-icon" style={{background: act.color + '18', color: act.color}}>{act.icon}</div>
                    <div className="dash-act-content">
                      <p className="dash-act-title">{act.title}</p>
                      <p className="dash-act-desc">{act.desc}</p>
                    </div>
                    <div className="dash-act-time" title={act.time_fmt}>{act.time_human}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Hàng 2: Học viên 6 tháng + Trạng thái học viên ── */}
      <div className="dash-bottom-row" style={{ alignItems: 'stretch' }}>
        <div className="card" style={{ display:'flex', flexDirection:'column' }}>
          <div className="card-header"><h3>👥 Học Viên 6 Tháng Gần Nhất</h3></div>
          <div className="card-body" style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hvChartData} barGap={6} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 13, fontWeight: 600, fill: '#4a5568' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 13 }} cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(value, name) => [value + ' học viên', name]} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
                <Bar dataKey="dang_ky"    name="Đăng ký mới" fill="#1e3a5f" radius={[5,5,0,0]} maxBarSize={36} />
                <Bar dataKey="hoan_thanh" name="Hoàn thành"  fill="#4e8fd4" radius={[5,5,0,0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card dash-pie-card" style={{ display:'flex', flexDirection:'column' }}>
          <div className="card-header"><h3>🎯 Trạng Thái Học Viên</h3></div>
          <div className="card-body" style={{ flex: 1, padding: '16px 20px' }}>
            {tongHoSo === 0 ? (
              <div className="empty-state"><span>📭</span><p>Chưa có học viên nào</p></div>
            ) : (
              <>
                {/* Tổng số */}
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: '#1a202c' }}>{tongHoSo}</span>
                  <span style={{ fontSize: 13, color: '#718096', marginLeft: 6 }}>tổng hồ sơ</span>
                </div>

                {/* Bar ngang 5 trạng thái */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {TRANG_THAI_5.map((t, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                          {t.icon} {t.name}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: t.color }}>
                          {t.value}
                        </span>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          borderRadius: 6,
                          background: t.color,
                          width: `${(t.value / maxVal) * 100}%`,
                          minWidth: t.value > 0 ? 6 : 0,
                          transition: 'width .5s ease',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>


      {/* ── Hàng 3: Kết quả thi + (Trạng thái khóa học / Trạng thái lớp học) ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16, alignItems:'stretch' }}>

        {/* Kết quả thi — Grouped Bar */}
        <div className="card" style={{ display:'flex', flexDirection:'column' }}>
          <div className="card-header">
            <h3>🏆 Kết Quả Thi</h3>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <select className="dash-chart-select" value={kqKy} onChange={e => setKqKy(e.target.value)}>
                <option value="tuan">7 Ngày Gần Nhất</option>
                <option value="thang">30 Ngày (4 Tuần)</option>
                <option value="nam">12 Tháng</option>
              </select>
              <Link to="/thi" className="btn btn-outline btn-sm">Chi tiết →</Link>
            </div>
          </div>
          <div className="card-body" style={{ position:'relative', flex:1 }}>
            {kqLoading && (
              <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,0.7)',zIndex:2,borderRadius:12 }}>
                <div className="spinner" />
              </div>
            )}
            {kqData.every(d => d.dat === 0 && d.khong_dat === 0 && d.vang_mat === 0) ? (
              <div className="empty-state"><span>📊</span><p>Chưa có kết quả thi trong {KY_MAP[kqKy]?.toLowerCase()}</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={kqData} barGap={4} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: kqKy === 'thang' ? 10 : 13, fontWeight:600, fill:'#4a5568' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:12, fill:'#9ca3af' }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius:8, border:'none', boxShadow:'0 4px 12px rgba(0,0,0,.1)', fontSize:12 }} formatter={(v, n) => [v + ' học viên', n]} />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize:12, paddingTop:10 }} />
                  <Bar dataKey="dat"       name="Đạt"       fill="#10b981" radius={[6,6,0,0]} maxBarSize={60} />
                  <Bar dataKey="khong_dat" name="Không đạt" fill="#ef4444" radius={[6,6,0,0]} maxBarSize={60} />
                  <Bar dataKey="vang_mat"  name="Vắng mặt"  fill="#f59e0b" radius={[6,6,0,0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Cột phải: 2 mini card stack dọc */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Mini card: Trạng thái khóa học */}
          <div className="card" style={{ flex:1 }}>
            <div className="card-header">
              <h3 style={{ fontSize:14 }}>📅 Trạng Thái Khóa Học</h3>
              <Link to="/khoa-hoc" className="btn btn-outline btn-sm">Xem →</Link>
            </div>
            <div className="card-body" style={{ padding:'12px 16px' }}>
              {khoaData.length === 0 ? (
                <div style={{ textAlign:'center', color:'#94a3b8', fontSize:13, padding:'12px 0' }}>Chưa có khóa học</div>
              ) : khoaData.map((d, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom: i < khoaData.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background: d.value > 0 ? d.color : '#e2e8f0', flexShrink:0 }} />
                    <span style={{ fontSize:13, color: d.value > 0 ? '#374151' : '#94a3b8' }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize:16, fontWeight:800, color: d.value > 0 ? d.color : '#cbd5e1' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mini card: Trạng thái lớp học */}
          <div className="card" style={{ flex:1 }}>
            <div className="card-header">
              <h3 style={{ fontSize:14 }}>🏫 Trạng Thái Lớp Học</h3>
              <Link to="/lop-hoc" className="btn btn-outline btn-sm">Xem →</Link>
            </div>
            <div className="card-body" style={{ padding:'12px 16px' }}>
              {lopData.length === 0 ? (
                <div style={{ textAlign:'center', color:'#94a3b8', fontSize:13, padding:'12px 0' }}>Chưa có lớp học</div>
              ) : lopData.map((d, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom: i < lopData.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background: d.value > 0 ? d.color : '#e2e8f0', flexShrink:0 }} />
                    <span style={{ fontSize:13, color: d.value > 0 ? '#374151' : '#94a3b8' }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize:16, fontWeight:800, color: d.value > 0 ? d.color : '#cbd5e1' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Hàng 4: Tình trạng xe + Giảng viên + Lịch thi sắp tới ── */}
      <div className="dash-tri-row">
        {/* Tình trạng xe — Donut nhỏ */}
        <div className="card">
          <div className="card-header"><h3>🚗 Tình Trạng Xe</h3><Link to="/xe" className="btn btn-outline btn-sm">Quản lý →</Link></div>
          <div className="card-body">
            {xeInfo.tong === 0 ? (
              <div className="empty-state"><span>🚗</span><p>Chưa có xe nào</p></div>
            ) : (
              <>
                {/* KPI 3 số */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-around', marginBottom:12 }}>
                  {[
                    { label:'Sẵn sàng',  value: xeData.find(d=>d.name==='Sẵn sàng')?.value  ?? 0, color:'#10b981' },
                    { label:'Tổng xe',   value: xeInfo.tong,                                       color:'#1a202c' },
                    { label:'Đang dùng', value: xeData.find(d=>d.name==='Đang dùng')?.value ?? 0,  color:'#3b82f6' },
                  ].map((k,i) => (
                    <div key={i} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:26, fontWeight:800, color:k.color }}>{k.value}</div>
                      <div style={{ fontSize:11, color:'#718096' }}>{k.label}</div>
                    </div>
                  ))}
                </div>

                {/* Pie đủ 4 trạng thái */}
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={xeData}
                      cx="50%" cy="50%"
                      outerRadius={65}
                      dataKey="value"
                      strokeWidth={0}
                      paddingAngle={2}
                    >
                      {xeData.map((e, i) => <Cell key={i} fill={e.color} opacity={e.value === 0 ? 0.25 : 1} />)}
                    </Pie>
                    <Legend
                      iconType="circle" iconSize={9}
                      wrapperStyle={{ fontSize:11 }}
                      formatter={(v, e) => (
                        <span style={{ color: e.payload.value === 0 ? '#94a3b8' : '#374151' }}>
                          {v}: <strong style={{ color: e.payload.value === 0 ? '#94a3b8' : e.payload.color }}>
                            {e.payload.value}
                          </strong>
                        </span>
                      )}
                    />
                    <Tooltip formatter={(v,n) => [v+' xe', n]} contentStyle={{ borderRadius:8,border:'none',boxShadow:'0 4px 12px rgba(0,0,0,.1)',fontSize:12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>

        {/* Giảng viên — thanh ngang */}
        <div className="card">
          <div className="card-header"><h3>👨‍🏫 Giảng Viên</h3><Link to="/giang-vien" className="btn btn-outline btn-sm">Quản lý →</Link></div>
          <div className="card-body">
            <div style={{ display:'flex', gap:16, marginBottom:16 }}>
              <div className="dash-kpi-box" style={{ background:'#eff6ff',borderColor:'#bfdbfe' }}>
                <div style={{ fontSize:26,fontWeight:800,color:'#1d4ed8' }}>{gvInfo.tong}</div>
                <div style={{ fontSize:11,color:'#3b82f6',fontWeight:600 }}>Tổng giảng viên</div>
              </div>
              <div className="dash-kpi-box" style={{ background:'#f0fdf4',borderColor:'#bbf7d0' }}>
                <div style={{ fontSize:26,fontWeight:800,color:'#15803d' }}>{gvInfo.active}</div>
                <div style={{ fontSize:11,color:'#16a34a',fontWeight:600 }}>Đang hoạt động</div>
              </div>
            </div>
            {gvInfo.data.length === 0 ? (
              <div className="empty-state" style={{padding:'12px'}}><span>👨‍🏫</span><p>Chưa có giảng viên</p></div>
            ) : gvInfo.data.map((gv, i) => (
              <div key={i} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{gv.name}</span>
                  <span style={{ fontSize:13, color:'#6b7280' }}>{gv.active}/{gv.tong}</span>
                </div>
                <div style={{ background:'#f1f5f9', borderRadius:6, height:8, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:6, background:'#0d47a1', width: gv.tong > 0 ? `${(gv.active/gv.tong)*100}%` : '0%', transition:'width .5s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lịch thi sắp tới */}
        <div className="card">
          <div className="card-header"><h3>📅 Lịch Thi Sắp Tới</h3><Link to="/thi" className="btn btn-outline btn-sm">Xem tất cả →</Link></div>
          <div className="card-body" style={{ padding:0 }}>
            {lichThiList.length === 0 ? (
              <div className="empty-state" style={{padding:'24px'}}><span>📅</span><p>Không có lịch thi nào trong 30 ngày tới</p></div>
            ) : lichThiList.map((lt, i) => {
              const lm = LOAI_THI_MAP[lt.loai_thi] || { text: lt.loai_thi, cls:'badge-gray' }
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom: i < lichThiList.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ textAlign:'center', minWidth:44, background:'#f0f9ff', borderRadius:8, padding:'6px 4px' }}>
                    <div style={{ fontSize:15, fontWeight:800, color:'#0369a1' }}>{new Date(lt.ngay_thi).getDate()}</div>
                    <div style={{ fontSize:9, color:'#7dd3fc', fontWeight:600 }}>T{new Date(lt.ngay_thi).getMonth()+1}</div>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1a202c', marginBottom:2 }}>{lt.ten_khoa}</div>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <span className={`badge ${lm.cls}`} style={{ fontSize:10 }}>{lm.text}</span>
                      <span style={{ fontSize:11, color:'#9ca3af' }}>⏰ {lt.gio_thi?.slice(0,5)}</span>
                      {lt.dia_diem && <span style={{ fontSize:11, color:'#9ca3af' }}>📍 {lt.dia_diem}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:16, fontWeight:800, color:'#6d28d9' }}>{lt.so_hv}</div>
                    <div style={{ fontSize:10, color:'#a78bfa' }}>HV</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Hàng 5: Thống kê theo hạng bằng ── */}
      {hangBangStats.length > 0 && (
        <div className="card">
          {/* Header */}
          <div className="card-header" style={{ flexWrap:'wrap', gap:10 }}>
            <div>
              <h3 style={{ margin:0 }}>🪪 Thống Kê Theo Hạng Bằng</h3>
              <p style={{ margin:'2px 0 0', fontSize:12, color:'#718096' }}>Học viên đăng ký · Xe thực hành · Lớp học</p>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginLeft:'auto' }}>
              {[
                { value:'thang',   label:'Tháng này' },
                { value:'quy',     label:'Quý này' },
                { value:'6thang',  label:'6 Tháng' },
                { value:'nam',     label:'Năm nay' },
                { value:'tat_ca',  label:'Tất cả' },
              ].map(opt => (
                <button key={opt.value}
                  onClick={() => setHangBangKy(opt.value)}
                  style={{
                    padding:'5px 13px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', border:'none',
                    background: hangBangKy === opt.value ? '#0d47a1' : '#f1f5f9',
                    color:      hangBangKy === opt.value ? '#fff'     : '#374151',
                    transition: 'all .15s',
                  }}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          <div className="card-body" style={{ padding:'8px 20px 20px' }}>
            {hangBangLoading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner" /></div>
            ) : hangBangStats.length === 0 ? (
              <div className="empty-state"><span>📊</span><p>Chưa có dữ liệu trong kỳ này</p></div>
            ) : (
              <>
                {/* ── KPI tổng ── */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
                  {[
                    { icon:'👥', label:'Tổng học viên', value: hangBangStats.reduce((s,d)=>s+d.hoc_vien,0), color:'#3b82f6', bg:'#eff6ff' },
                    { icon:'🚗', label:'Tổng xe',        value: hangBangStats.reduce((s,d)=>s+d.xe,0),       color:'#10b981', bg:'#f0fdf4' },
                    { icon:'🏫', label:'Tổng lớp học',   value: hangBangStats.reduce((s,d)=>s+d.lop_hoc,0), color:'#8b5cf6', bg:'#f5f3ff' },
                  ].map((k,i) => (
                    <div key={i} style={{ background:k.bg, borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ fontSize:26 }}>{k.icon}</span>
                      <div>
                        <div style={{ fontSize:26, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
                        <div style={{ fontSize:12, color:'#718096', marginTop:2 }}>{k.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Grouped Bar Chart ── */}
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={hangBangStats} barGap={4} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="hang_bang"
                      tick={{ fontSize:13, fontWeight:700, fill:'#4a5568' }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis tick={{ fontSize:12, fill:'#9ca3af' }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius:10, border:'none', boxShadow:'0 4px 16px rgba(0,0,0,.12)', fontSize:13 }}
                      cursor={{ fill:'rgba(0,0,0,0.03)' }}
                    />
                    <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize:13, paddingTop:12 }} />
                    <Bar dataKey="hoc_vien" name="Học viên"  fill="#3b82f6" radius={[5,5,0,0]} maxBarSize={36} />
                    <Bar dataKey="xe"       name="Xe"        fill="#10b981" radius={[5,5,0,0]} maxBarSize={36} />
                    <Bar dataKey="lop_hoc"  name="Lớp học"   fill="#8b5cf6" radius={[5,5,0,0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>

                {/* ── Bảng chi tiết ── */}
                <div style={{ marginTop:20, borderRadius:12, overflow:'hidden', border:'1px solid #e2e8f0' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr style={{ background:'#f8fafc' }}>
                        <th style={{ padding:'10px 16px', textAlign:'left', fontWeight:700, color:'#374151', borderBottom:'1px solid #e2e8f0' }}>Hạng bằng</th>
                        <th style={{ padding:'10px 16px', textAlign:'center', fontWeight:700, color:'#3b82f6',  borderBottom:'1px solid #e2e8f0' }}>👥 Học viên</th>
                        <th style={{ padding:'10px 16px', textAlign:'center', fontWeight:700, color:'#10b981', borderBottom:'1px solid #e2e8f0' }}>🚗 Xe</th>
                        <th style={{ padding:'10px 16px', textAlign:'center', fontWeight:700, color:'#8b5cf6', borderBottom:'1px solid #e2e8f0' }}>🏫 Lớp học</th>
                        <th style={{ padding:'10px 16px', textAlign:'center', fontWeight:700, color:'#6b7280', borderBottom:'1px solid #e2e8f0' }}>Tỷ lệ HV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const tongHV = hangBangStats.reduce((s,d)=>s+d.hoc_vien,0) || 1
                        return hangBangStats.map((d, i) => (
                          <tr key={i} style={{ background: i%2===0?'#fff':'#fafafa', transition:'background .15s' }}>
                            <td style={{ padding:'10px 16px', borderBottom:'1px solid #f1f5f9' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                <div style={{ width:10, height:10, borderRadius:3, background:d.color, flexShrink:0 }}/>
                                <span style={{ fontWeight:700, color:'#1a202c' }}>Hạng {d.hang_bang}</span>
                              </div>
                            </td>
                            <td style={{ padding:'10px 16px', textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>
                              <span style={{ fontWeight:800, color: d.hoc_vien>0?'#3b82f6':'#94a3b8', fontSize:15 }}>{d.hoc_vien}</span>
                            </td>
                            <td style={{ padding:'10px 16px', textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>
                              <span style={{ fontWeight:800, color: d.xe>0?'#10b981':'#94a3b8', fontSize:15 }}>{d.xe}</span>
                            </td>
                            <td style={{ padding:'10px 16px', textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>
                              <span style={{ fontWeight:800, color: d.lop_hoc>0?'#8b5cf6':'#94a3b8', fontSize:15 }}>{d.lop_hoc}</span>
                            </td>
                            <td style={{ padding:'10px 16px', borderBottom:'1px solid #f1f5f9' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <div style={{ flex:1, background:'#f1f5f9', borderRadius:6, height:8, overflow:'hidden' }}>
                                  <div style={{
                                    height:'100%', borderRadius:6, background:d.color,
                                    width:`${(d.hoc_vien/tongHV)*100}%`,
                                    minWidth: d.hoc_vien>0 ? 4 : 0,
                                    transition:'width .5s ease',
                                  }}/>
                                </div>
                                <span style={{ fontSize:12, fontWeight:600, color:'#6b7280', minWidth:38, textAlign:'right' }}>
                                  {((d.hoc_vien/tongHV)*100).toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


// ── GIẢNG VIÊN DASHBOARD ─────────────────────────────────────────────────────
const fmtD = d => { if (!d) return ''; if (typeof d === 'string') return d.slice(0,10); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const DAY_SHORT_GV = ['CN','T2','T3','T4','T5','T6','T7']
const HS = 7, HE = 18, SM = 60, SH = 26
const TS = (HE - HS) * (60 / SM)
const t2s = t => { if (!t) return 0; const [h,m] = t.slice(0,5).split(':').map(Number); return (h-HS)*(60/SM)+m/SM }
const s2l = s => { const tot=HS*60+s*SM; return `${String(Math.floor(tot/60)).padStart(2,'0')}:${String(tot%60).padStart(2,'0')}` }
const getWD = base => { const d=new Date(base),day=d.getDay(),mon=new Date(d); mon.setDate(d.getDate()-(day===0?6:day-1)); return Array.from({length:7},(_,i)=>{ const dt=new Date(mon); dt.setDate(mon.getDate()+i); return dt }) }
const LC = { ly_thuyet:{bg:'#dbeafe',border:'#3b82f6',text:'#1d4ed8'}, thuc_hanh:{bg:'#dcfce7',border:'#22c55e',text:'#15803d'} }

const GiangVienDashboard = () => {
  const { token, adminInfo, backendUrl } = useAdmin()
  const [lopHoc, setLopHoc]       = useState([])
  const [lichHomNay, setLichHomNay] = useState([])
  const [lichTuan, setLichTuan]   = useState([])
  const [base, setBase]           = useState(new Date())
  const headers = { Authorization: `Bearer ${token}` }

  const weekDates = getWD(base)
  const fromDate  = fmtD(weekDates[0])
  const toDate    = fmtD(weekDates[6])

  useEffect(() => {
    axios.get(`${backendUrl}/api/giang-vien/lop-cua-toi`, { headers })
      .then(res => { if (res.data.success) setLopHoc(res.data.data) }).catch(() => {})
    axios.get(`${backendUrl}/api/giang-vien/lich-hom-nay`, { headers })
      .then(res => { if (res.data.success) setLichHomNay(res.data.data) }).catch(() => {})
  }, [token])

  useEffect(() => {
    axios.get(`${backendUrl}/api/giang-vien/lich-theo-tuan`, { headers, params: { from: fromDate, to: toDate } })
      .then(res => { if (res.data.success) setLichTuan(res.data.data) }).catch(() => {})
  }, [fromDate, toDate, token])

  const getLichByDate = date => lichTuan.filter(l => l.ngay_hoc === fmtD(date))
  const isToday = date => fmtD(date) === fmtD(new Date())
  const getES = lh => { const top=t2s(lh.gio_bat_dau); const h=Math.max(t2s(lh.gio_ket_thuc)-top,1); return {top:`${top*SH}px`,height:`${h*SH-4}px`} }
  const tongHV = lopHoc.reduce((s,l) => s + (l.hoc_vien_count||0), 0)

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h2>👨‍🏫 Xin chào, {adminInfo?.ho_ten}! 👋</h2>
          <p>Đây là tổng quan hoạt động giảng dạy của bạn hôm nay.</p>
        </div>
        <span style={{fontSize:13,color:'#718096'}}>{new Date().toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
      </div>

      <div className="dash-stat-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {[
          {icon:'🏫',label:'Lớp đang dạy',  value:lopHoc.filter(l=>l.trang_thai==='dang_hoc').length, c:'#3b82f6'},
          {icon:'👥',label:'Tổng học viên', value:tongHV, c:'#8b5cf6'},
          {icon:'📚',label:'Tổng lớp',      value:lopHoc.length, c:'#06b6d4'},
          {icon:'📅',label:'Buổi hôm nay',  value:lichHomNay.length, c:'#10b981'},
        ].map((s,i) => (
          <div key={i} className="dash-stat-card" style={{'--c':s.c}}>
            <div className="dsc-icon">{s.icon}</div>
            <div className="dsc-body"><p>{s.label}</p><h3>{s.value}</h3></div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>🗓️ Thời Khóa Biểu Tuần</h3>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="btn btn-outline btn-sm" onClick={() => { const d=new Date(base); d.setDate(d.getDate()-7); setBase(d) }}>‹</button>
            <span style={{fontSize:13,fontWeight:600,minWidth:160,textAlign:'center'}}>{weekDates[0].getDate()}/{weekDates[0].getMonth()+1} — {weekDates[6].getDate()}/{weekDates[6].getMonth()+1}/{weekDates[6].getFullYear()}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setBase(new Date())}>Hôm nay</button>
            <button className="btn btn-outline btn-sm" onClick={() => { const d=new Date(base); d.setDate(d.getDate()+7); setBase(d) }}>›</button>
            <Link to="/lich-day" className="btn btn-primary btn-sm">Xem đầy đủ →</Link>
          </div>
        </div>
        <div className="card-body" style={{padding:0,overflowX:'auto'}}>
          <div style={{minWidth:700}}>
            <div style={{display:'grid',gridTemplateColumns:'48px repeat(7,1fr)',borderBottom:'2px solid #e2e8f0',background:'#f8fafc'}}>
              <div style={{padding:'8px 4px'}}/>
              {weekDates.map((date,i) => (
                <div key={i} style={{padding:'8px 4px',textAlign:'center',borderRight:'1px solid #f1f5f9',background:isToday(date)?'#eff6ff':''}}>
                  <span style={{display:'block',fontSize:10,fontWeight:700,color:'#6b7280',textTransform:'uppercase'}}>{DAY_SHORT_GV[date.getDay()]}</span>
                  <span style={{display:'block',fontSize:15,fontWeight:800,color:isToday(date)?'#0d47a1':'#1a202c'}}>{date.getDate()}/{date.getMonth()+1}</span>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'48px repeat(7,1fr)'}}>
              <div style={{position:'relative',borderRight:'1px solid #e2e8f0',height:`${(TS+1)*SH}px`}}>
                {Array.from({length:TS+1},(_,i) => (<div key={i} style={{position:'absolute',top:`${i*SH}px`,right:3,fontSize:9,color:'#9ca3af',fontWeight:600,paddingTop:2}}>{s2l(i)}</div>))}
                {Array.from({length:TS+1},(_,i) => (<div key={`l${i}`} style={{position:'absolute',top:`${i*SH}px`,left:0,right:0,borderTop:'1px solid #e2e8f0'}}/>))}
              </div>
              {weekDates.map((date,di) => {
                const items = getLichByDate(date)
                return (
                  <div key={di} style={{position:'relative',height:`${(TS+1)*SH}px`,borderRight:'1px solid #f1f5f9',background:isToday(date)?'#fafcff':''}}>
                    {Array.from({length:TS+1},(_,i) => (<div key={i} style={{position:'absolute',top:`${i*SH}px`,left:0,right:0,borderTop:'1px solid #e2e8f0'}}/>))}
                    {items.map(lh => {
                      const c=LC[lh.loai_buoi]||LC.ly_thuyet; const s=getES(lh)
                      return (<div key={lh.id} style={{position:'absolute',left:2,right:2,...s,background:c.bg,borderLeft:`3px solid ${c.border}`,borderRadius:5,padding:'2px 5px',overflow:'hidden',zIndex:2}}>
                        <p style={{fontSize:9,fontWeight:700,color:c.text,margin:0}}>{lh.gio_bat_dau?.slice(0,5)}–{lh.gio_ket_thuc?.slice(0,5)}</p>
                        <p style={{fontSize:10,fontWeight:700,color:c.text,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lh.lop_hoc?.ten_lop}</p>
                      </div>)
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>📅 Lịch Dạy Hôm Nay</h3><Link to="/diem-danh" className="btn btn-primary btn-sm">✅ Điểm danh →</Link></div>
        <div className="card-body">
          {lichHomNay.length === 0 ? (
            <div className="empty-state"><span>🎉</span><p>Hôm nay bạn không có lịch dạy. Hãy nghỉ ngơi!</p></div>
          ) : (
            <div className="gv-lich-list">
              {lichHomNay.map(lh => (
                <div key={lh.id} className={`gv-lich-item ${lh.loai_buoi}`}>
                  <div className="gli-time"><span>{lh.gio_bat_dau?.slice(0,5)}</span><span>—</span><span>{lh.gio_ket_thuc?.slice(0,5)}</span></div>
                  <div className="gli-info">
                    <p className="gli-lop">{lh.lop_hoc?.ten_lop}</p>
                    <p className="gli-type">{lh.loai_buoi==='ly_thuyet'?'📖 Lý thuyết':'🚗 Thực hành'}</p>
                    {lh.dia_diem && <p className="gli-dia">📍 {lh.dia_diem}</p>}
                  </div>
                  <Link to="/diem-danh" className="btn btn-success btn-sm">✅ Điểm danh</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>🏫 Lớp Được Phân Công ({lopHoc.length})</h3><Link to="/lop-cua-toi" className="btn btn-outline btn-sm">Xem tất cả →</Link></div>
        <div className="card-body" style={{padding:0}}>
          {lopHoc.length === 0 ? (
            <div className="empty-state" style={{padding:'32px'}}><span>🏫</span><p>Chưa được phân công lớp nào</p></div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Tên lớp</th><th>Khóa học</th><th>Học viên</th><th>Khai giảng</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {lopHoc.map(lop => (
                  <tr key={lop.id}>
                    <td><strong>{lop.ten_lop}</strong></td>
                    <td style={{fontSize:12}}>{lop.khoa_hoc?.ten_khoa}</td>
                    <td>{lop.hoc_vien_count||0} HV</td>
                    <td style={{fontSize:12}}>{lop.ngay_khai_giang ? new Date(lop.ngay_khai_giang).toLocaleDateString('vi-VN') : '—'}</td>
                    <td><span className={`badge ${lop.trang_thai==='dang_hoc'?'badge-success':'badge-info'}`}>{lop.trang_thai==='dang_hoc'?'Đang học':'Chuẩn bị'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { isAdmin } = useAdmin()
  return isAdmin ? <AdminDashboard /> : <GiangVienDashboard />
}

export default Dashboard
