import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { z } from 'zod'

const ReserveSchema = z.object({
    productId: z.string(),
    warehouseId: z.string(),
    quantity: z.number().int().positive(),
})

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const parsed = ReserveSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }

        const { productId, warehouseId, quantity } = parsed.data
        const lockKey = `lock:stock:${productId}:${warehouseId}`
        const lockValue = Date.now().toString()
        const lockTTL = 5 // seconds

        // Acquire Redis lock
        const acquired = await redis.set(lockKey, lockValue, 'EX', lockTTL, 'NX')

        if (!acquired) {
            return NextResponse.json({ error: 'Too many concurrent requests, please retry' }, { status: 429 })
        }

        try {
            const stock = await prisma.stock.findUnique({
                where: { productId_warehouseId: { productId, warehouseId } },
            })

            if (!stock) {
                return NextResponse.json({ error: 'Stock not found' }, { status: 404 })
            }

            const available = stock.total - stock.reserved

            if (available < quantity) {
                return NextResponse.json({ error: 'Not enough stock available' }, { status: 409 })
            }

            const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

            const [reservation] = await prisma.$transaction([
                prisma.reservation.create({
                    data: { productId, warehouseId, quantity, expiresAt, status: 'PENDING' },
                }),
                prisma.stock.update({
                    where: { productId_warehouseId: { productId, warehouseId } },
                    data: { reserved: { increment: quantity } },
                }),
            ])

            return NextResponse.json(reservation, { status: 201 })
        } finally {
            // Always release the lock
            await redis.del(lockKey)
        }
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}