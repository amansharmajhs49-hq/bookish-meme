import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { addMonths, differenceInDays, format, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy')
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM')
}

export function calculateExpiryDate(joinDate: string | Date, durationMonths: number): Date {
  const d = typeof joinDate === 'string' ? parseISO(joinDate) : joinDate
  return addMonths(d, durationMonths)
}

export function getDaysLeft(expiryDate: string | Date): number {
  const d = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return differenceInDays(d, today)
}

export function generateWhatsAppMessage(
  clientName: string,
  balance: number,
  planName: string,
  expiryDate: string
): string {
  const message = `Hi ${clientName},

This is a friendly reminder from *Aesthetic Gym* 💪

Your pending subscription balance is ₹${balance.toLocaleString('en-IN')}.
Plan: ${planName}
Renewal Date: ${formatDate(expiryDate)}

Please clear the balance to continue your training without interruption.

Thank you,
Aesthetic Gym`

  return encodeURIComponent(message)
}

export function getWhatsAppLink(phone: string, message: string): string {
  let cleanPhone = phone.replace(/\D/g, '')
  if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone
  }
  return `https://wa.me/${cleanPhone}?text=${message}`
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Active':
      return 'status-active'
    case 'Expired':
      return 'status-expired'
    case 'Left':
      return 'status-left'
    case 'Deleted':
      return 'status-deleted'
    default:
      return 'status-active'
  }
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'Paid':
      return 'text-green-400'
    case 'Partial':
      return 'text-yellow-400'
    case 'Due':
      return 'text-red-400'
    default:
      return 'text-muted-foreground'
  }
}
