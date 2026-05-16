import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  const entries = await prisma.foodEntry.findMany({
    where: date ? { date } : undefined,
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const entry = await prisma.foodEntry.create({ data: body })
  return NextResponse.json(entry)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  await prisma.foodEntry.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
