import * as React from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

interface DashboardCardProps {
  href: string
  title: string
  subtitle?: string
  topColor?: string
  imageUrl?: string | null
  imageAlt?: string
  icon?: React.ReactNode
}

export function DashboardCard({
  href,
  title,
  subtitle,
  topColor,
  imageUrl,
  imageAlt,
  icon,
}: DashboardCardProps) {
  return (
    <Link href={href} className="group block h-full">
      <Card className="relative overflow-hidden bg-card flex flex-col justify-center items-center hover:shadow-md hover:border-primary/50 transition-all h-full">
        {topColor && (
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ backgroundColor: topColor }}
          />
        )}
        <CardContent className="min-h-[160px] w-full p-6 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center justify-center transition-transform duration-300 group-hover:scale-105 h-16 w-full">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={imageAlt || title}
                className="max-h-16 max-w-full object-contain"
              />
            ) : icon ? (
              <div className="group-hover:text-primary transition-colors">
                {icon}
              </div>
            ) : (
              <span className="text-lg font-bold group-hover:text-primary transition-colors text-center line-clamp-2">
                {title}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground text-center">
              {subtitle}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
