import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const entries = await prisma.weightEntry.findMany({ orderBy: { date: 'asc' } })
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const entry = await prisma.weightEntry.upsert({
    where: { date: body.date },
    update: { weight: body.weight },
    create: body,
  })
  return NextResponse.json(entry)
}
