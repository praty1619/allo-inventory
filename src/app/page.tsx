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
        setError('Not enough stock available!')
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
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 text-lg">Loading products...</p>
    </div>
  )

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Allo Inventory</h1>
      <p className="text-gray-500 mb-8">Reserve products before checkout</p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6">
        {products.map((product) => (
          <div key={product.id} className="border rounded-xl p-6 shadow-sm bg-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold">{product.name}</h2>
                <p className="text-gray-500 text-sm">{product.description}</p>
              </div>
              <span className="text-lg font-bold text-green-600">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid gap-3">
              {product.warehouses.map((wh) => (
                <div key={wh.warehouseId} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <p className="font-medium text-sm">{wh.warehouseName}</p>
                    <p className="text-xs text-gray-400">{wh.location}</p>
                    <p className="text-xs mt-1">
                      <span className={wh.available > 0 ? 'text-green-600' : 'text-red-500'}>
                        {wh.available} available
                      </span>
                      <span className="text-gray-400"> · {wh.reserved} reserved · {wh.total} total</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleReserve(product.id, wh.warehouseId)}
                    disabled={wh.available === 0 || reserving === `${product.id}-${wh.warehouseId}`}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {reserving === `${product.id}-${wh.warehouseId}` ? 'Reserving...' : wh.available === 0 ? 'Out of Stock' : 'Reserve'}
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