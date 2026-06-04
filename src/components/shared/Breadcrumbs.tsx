import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground overflow-x-auto whitespace-nowrap pb-2 mb-4">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <Fragment key={index}>
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-foreground transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-foreground font-medium" : ""}>
                {item.label}
              </span>
            )}

            {!isLast && <ChevronRight className="w-4 h-4 shrink-0 mx-1" />}
          </Fragment>
        );
      })}
    </nav>
  );
}
