'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type WarehouseStock = {
  warehouseId: string
  warehouseName: string
  location: string
  total: number
  reserved: number
  available: number
}

type Product = {
  id: string
  name: string
  description: string | null
  price: number
  warehouses: WarehouseStock[]
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [reserving, setReserving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => { setProducts(data); setLoading(false) })
  }, [])

  async function handleReserve(productId: string, warehouseId: string) {
    setReserving(`${productId}-${warehouseId}`)
    setError(null)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      })

      if (res.status === 409) {
        setError('❌ Not enough stock available!')
        return
      }

      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        return
      }

      const reservation = await res.json()
      router.push(`/reservation/${reservation.id}`)
    } finally {
      setReserving(null)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>Loading products...</p>
    </div>
  )

  return (
    <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="page-header">
        <h1>🛒 Allo Inventory</h1>
        <p>Browse products and reserve before checkout</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{ display: 'grid', gap: '1.25rem' }}>
        {products.map((product) => (
          <div key={product.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{product.name}</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>{product.description}</p>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>
                ₹{product.price.toLocaleString('en-IN')}
              </span>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {product.warehouses.map((wh) => (
                <div key={wh.warehouseId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--secondary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.875rem 1rem',
                }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{wh.warehouseName}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{wh.location}</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      <span style={{ color: wh.available > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 500 }}>
                        {wh.available} available
                      </span>
                      <span style={{ color: 'var(--muted)' }}> · {wh.reserved} reserved · {wh.total} total</span>
                    </p>
                  </div>
                  <button
                    className={`btn ${wh.available === 0 ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => handleReserve(product.id, wh.warehouseId)}
                    disabled={wh.available === 0 || reserving === `${product.id}-${wh.warehouseId}`}
                  >
                    {reserving === `${product.id}-${wh.warehouseId}`
                      ? 'Reserving...'
                      : wh.available === 0
                        ? 'Out of Stock'
                        : 'Reserve'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}