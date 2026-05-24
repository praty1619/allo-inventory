import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const mumbai = await prisma.warehouse.create({
        data: { name: 'Mumbai Warehouse', location: 'Mumbai, India' },
    })
    const delhi = await prisma.warehouse.create({
        data: { name: 'Delhi Warehouse', location: 'Delhi, India' },
    })

    const phone = await prisma.product.create({
        data: { name: 'iPhone 15', description: 'Apple iPhone 15 128GB', price: 79999 },
    })
    const laptop = await prisma.product.create({
        data: { name: 'MacBook Air M2', description: 'Apple MacBook Air M2 8GB', price: 114999 },
    })
    const watch = await prisma.product.create({
        data: { name: 'Apple Watch S9', description: 'Apple Watch Series 9 GPS', price: 41999 },
    })

    await prisma.stock.createMany({
        data: [
            { productId: phone.id, warehouseId: mumbai.id, total: 10, reserved: 0 },
            { productId: phone.id, warehouseId: delhi.id, total: 5, reserved: 0 },
            { productId: laptop.id, warehouseId: mumbai.id, total: 3, reserved: 0 },
            { productId: laptop.id, warehouseId: delhi.id, total: 2, reserved: 0 },
            { productId: watch.id, warehouseId: mumbai.id, total: 1, reserved: 0 },
            { productId: watch.id, warehouseId: delhi.id, total: 8, reserved: 0 },
        ],
    })

    console.log('✅ Seeded successfully!')
}

main()
    .catch((e) => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())