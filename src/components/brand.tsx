import Link from "next/link";
import { Divide } from "lucide-react";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="ProrateSplit home">
      <span className="brand-mark">
        <Divide aria-hidden="true" />
      </span>
      <span>ProrateSplit</span>
    </Link>
  );
}
