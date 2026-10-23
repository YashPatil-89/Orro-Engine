import type { ComponentProps } from "react";
import { SessionCard } from "./SessionCard";

export function TimelineItem(props: ComponentProps<typeof SessionCard>) {
  return (
    <li className="relative">
      <SessionCard {...props} />
    </li>
  );
}
