import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  const entries = await prisma.cardioEntry.findMany({
    where: date ? { date } : undefined,
  })
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const entry = await prisma.cardioEntry.upsert({
    where: { date: body.date },
    update: { done: body.done },
    create: body,
  })
  return NextResponse.json(entry)
}
