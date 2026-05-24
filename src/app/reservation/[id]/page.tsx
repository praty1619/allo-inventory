'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'

type Reservation = {
    id: string
    productId: string
    warehouseId: string
    quantity: number
    status: 'PENDING' | 'CONFIRMED' | 'RELEASED'
    expiresAt: string
    createdAt: string
    product: { name: string; price: number; description: string | null }
    warehouse: { name: string; location: string }
}

function useCountdown(expiresAt: string) {
    const [secondsLeft, setSecondsLeft] = useState(0)

    useEffect(() => {
        const calc = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
        setSecondsLeft(calc())
        const interval = setInterval(() => setSecondsLeft(calc()), 1000)
        return () => clearInterval(interval)
    }, [expiresAt])

    const mins = Math.floor(secondsLeft / 60)
    const secs = secondsLeft % 60
    return { secondsLeft, display: `${mins}:${secs.toString().padStart(2, '0')}` }
}

export default function ReservationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [reservation, setReservation] = useState<Reservation | null>(null)
    const [loading, setLoading] = useState(true)
    const [acting, setActing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const { secondsLeft, display } = useCountdown(reservation?.expiresAt ?? new Date().toISOString())

    const fetchReservation = useCallback(async () => {
        const res = await fetch(`/api/reservations/${id}`)
        if (res.ok) {
            const data = await res.json()
            setReservation(data)
        }
        setLoading(false)
    }, [id])

    useEffect(() => { fetchReservation() }, [fetchReservation])

    useEffect(() => {
        if (secondsLeft === 0 && reservation?.status === 'PENDING') {
            fetchReservation()
        }
    }, [secondsLeft, reservation?.status, fetchReservation])

    async function handleConfirm() {
        setActing(true)
        setError(null)
        const res = await fetch(`/api/reservations/${id}/confirm`, { method: 'POST' })
        if (res.status === 410) {
            setError('❌ Reservation has expired. Stock has been released.')
            await fetchReservation()
        } else if (res.ok) {
            await fetchReservation()
        } else {
            setError('Something went wrong.')
        }
        setActing(false)
    }

    async function handleCancel() {
        setActing(true)
        setError(null)
        const res = await fetch(`/api/reservations/${id}/release`, { method: 'POST' })
        if (res.ok) {
            await fetchReservation()
        } else {
            setError('Something went wrong.')
        }
        setActing(false)
    }

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--muted)' }}>Loading reservation...</p>
        </div>
    )

    if (!reservation) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--danger)' }}>Reservation not found.</p>
        </div>
    )

    const isPending = reservation.status === 'PENDING'
    const isConfirmed = reservation.status === 'CONFIRMED'
    const isReleased = reservation.status === 'RELEASED'
    const isExpired = isPending && secondsLeft === 0

    return (
        <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <div className="page-header">
                <h1>🧾 Checkout</h1>
                <p>Complete your reservation before it expires</p>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {isConfirmed && <div className="alert alert-success">✅ Payment confirmed! Your order has been placed.</div>}

            <div className="card" style={{ maxWidth: '560px', margin: '0 auto' }}>
                <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{reservation.product.name}</h2>
                    <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{reservation.product.description}</p>
                    <p style={{ marginTop: '0.5rem', fontWeight: 700, fontSize: '1.1rem', color: 'var(--success)' }}>
                        ₹{reservation.product.price.toLocaleString('en-IN')}
                    </p>
                </div>

                <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>SHIPPING FROM</p>
                    <p style={{ fontWeight: 500 }}>{reservation.warehouse.name}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{reservation.warehouse.location}</p>
                </div>

                <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>STATUS</p>
                        <span className={`badge ${isConfirmed ? 'badge-success' : isReleased || isExpired ? 'badge-danger' : 'badge-warning'}`}>
                            {isConfirmed ? 'Confirmed' : isReleased ? 'Released' : isExpired ? 'Expired' : 'Pending'}
                        </span>
                    </div>

                    {isPending && !isExpired && (
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>EXPIRES IN</p>
                            <p style={{
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                color: secondsLeft < 60 ? 'var(--danger)' : 'var(--foreground)',
                                fontVariantNumeric: 'tabular-nums',
                            }}>
                                {display}
                            </p>
                        </div>
                    )}
                </div>

                {isPending && !isExpired && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleConfirm} disabled={acting}>
                            {acting ? 'Processing...' : '✓ Confirm Purchase'}
                        </button>
                        <button className="btn btn-danger" onClick={handleCancel} disabled={acting}>
                            Cancel
                        </button>
                    </div>
                )}

                {(isReleased || isExpired) && (
                    <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => router.push('/')}>
                        ← Back to Products
                    </button>
                )}

                {isConfirmed && (
                    <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => router.push('/')}>
                        ← Continue Shopping
                    </button>
                )}
            </div>
        </main>
    )
}