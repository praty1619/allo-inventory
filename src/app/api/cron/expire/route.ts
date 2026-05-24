import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const expiredReservations = await prisma.reservation.findMany({
            where: {
                status: 'PENDING',
                expiresAt: { lt: new Date() },
            },
        })

        for (const reservation of expiredReservations) {
            await prisma.$transaction([
                prisma.reservation.update({
                    where: { id: reservation.id },
                    data: { status: 'RELEASED' },
                }),
                prisma.stock.update({
                    where: {
                        productId_warehouseId: {
                            productId: reservation.productId,
                            warehouseId: reservation.warehouseId,
                        },
                    },
                    data: { reserved: { decrement: reservation.quantity } },
                }),
            ])
        }

        return NextResponse.json({ released: expiredReservations.length })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}