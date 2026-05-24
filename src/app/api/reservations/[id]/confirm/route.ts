import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const reservation = await prisma.reservation.findUnique({
            where: { id: params.id },
        })

        if (!reservation) {
            return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
        }

        if (reservation.status === 'CONFIRMED') {
            return NextResponse.json(reservation)
        }

        if (reservation.status === 'RELEASED') {
            return NextResponse.json({ error: 'Reservation already released' }, { status: 410 })
        }

        if (new Date() > reservation.expiresAt) {
            // Auto release expired reservation
            await prisma.$transaction([
                prisma.reservation.update({
                    where: { id: params.id },
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
            return NextResponse.json({ error: 'Reservation has expired' }, { status: 410 })
        }

        const [confirmed] = await prisma.$transaction([
            prisma.reservation.update({
                where: { id: params.id },
                data: { status: 'CONFIRMED' },
            }),
            prisma.stock.update({
                where: {
                    productId_warehouseId: {
                        productId: reservation.productId,
                        warehouseId: reservation.warehouseId,
                    },
                },
                data: {
                    reserved: { decrement: reservation.quantity },
                    total: { decrement: reservation.quantity },
                },
            }),
        ])

        return NextResponse.json(confirmed)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}