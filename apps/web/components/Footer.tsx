"use client"

import Link from "next/link"
import { BookOpen } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-white border-t border-stone-100 py-12">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
                    <BookOpen className="w-4 h-4 text-white" />
                 </div>
                 <span className="text-sm font-semibold text-stone-500">
                    © 2025 Tales.ai. All rights reserved.
                 </span>
            </div>

            <div className="flex gap-6 text-sm text-stone-500">
                <Link href="/privacy" className="hover:text-stone-900">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-stone-900">Terms</Link>
                <Link href="/cookies" className="hover:text-stone-900">Cookies</Link>
            </div>
        </div>
      </div>
    </footer>
  )
}
