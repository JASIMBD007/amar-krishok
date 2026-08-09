import { Sprout } from "lucide-react";

type BrandMarkProps = {
  className: string;
};

/** The single AmarKrishok brand symbol used anywhere the product logo appears. */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span className={className} aria-hidden="true">
      <Sprout size={20} strokeWidth={2.6} />
    </span>
  );
}
