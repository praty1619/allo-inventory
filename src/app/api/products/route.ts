import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            include: {
                stocks: {
                    include: {
                        warehouse: true,
                    },
                },
            },
        })

        const result = products.map((product) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            warehouses: product.stocks.map((stock) => ({
                warehouseId: stock.warehouseId,
                warehouseName: stock.warehouse.name,
                location: stock.warehouse.location,
                total: stock.total,
                reserved: stock.reserved,
                available: stock.total - stock.reserved,
            })),
        }))

        return NextResponse.json(result)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}