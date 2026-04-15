import { useState } from 'react'
import { checkRoute, RouteCheckResponse } from '../services/api'

export default function RouteChecker() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [vehicleType, setVehicleType] = useState<'limousine' | 'xe_khach'>('limousine')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RouteCheckResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await checkRoute({ from, to, vehicleType })
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const quickRoutes = [
    { from: 'Hà Nội', to: 'Hà Giang' },
    { from: 'Mỹ Đình', to: 'Xín Mần' },
    { from: 'Hà Nội', to: 'Hoàng Su Phì' },
    { from: 'Mỹ Đình', to: 'Cốc Pài' },
    { from: 'Hà Nội', to: 'TP Lào Cai' },
  ]

  return (
    <div>
      <div className="card">
        <h2>🗺️ Kiểm tra tuyến đường</h2>
        <p style={{ color: '#666', marginTop: 8 }}>
          Kiểm tra tính hợp lệ của tuyến đường và giá vé
        </p>
      </div>

      <div className="grid-2">
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Điểm đi</label>
              <input
                type="text"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="VD: Hà Nội, Mỹ Đình..."
                required
              />
            </div>

            <div className="form-group">
              <label>Điểm đến</label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="VD: Hà Giang, Xín Mần..."
                required
              />
            </div>

            <div className="form-group">
              <label>Loại xe</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as 'limousine' | 'xe_khach')}
              >
                <option value="limousine">Xe Limousine</option>
                <option value="xe_khach">Xe khách thường</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang kiểm tra...' : 'Kiểm tra tuyến'}
            </button>
          </form>

          {result && (
            <div className={`result-box ${result.valid ? 'success' : 'error'}`}>
              <h4>{result.valid ? '✅ Tuyến hợp lệ' : '❌ Tuyến không hợp lệ'}</h4>
              <p><strong>Điểm đi:</strong> {result.from} → {result.normalizedFrom || result.from}</p>
              <p><strong>Điểm đến:</strong> {result.to} → {result.normalizedTo || result.to}</p>
              {result.price && <p><strong>Giá vé:</strong> {result.price.toLocaleString()}đ</p>}
              {result.message && <p><strong>Ghi chú:</strong> {result.message}</p>}
              {result.alternatives && result.alternatives.length > 0 && (
                <p><strong>Gợi ý:</strong> {result.alternatives.join(', ')}</p>
              )}
            </div>
          )}

          {error && (
            <div className="result-box error">
              <h4>❌ Lỗi</h4>
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="card">
          <h3>📍 Tuyến nhanh</h3>
          <p style={{ color: '#666', marginBottom: 16 }}>Click để test nhanh</p>
          
          {quickRoutes.map((route, index) => (
            <button
              key={index}
              onClick={() => {
                setFrom(route.from)
                setTo(route.to)
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                marginBottom: '8px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: 'white',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              {route.from} → {route.to}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
