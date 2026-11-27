import { IconBalloon, IconBox, IconHeart, IconUsers } from "@/components/icons";
import type { TastingIcon as Kind } from "@/content/tastings";

export default function TastingIcon({ kind, size = 28 }: { kind: Kind; size?: number }) {
  switch (kind) {
    case "users":
      return <IconUsers size={size} />;
    case "heart":
      return <IconHeart size={size} />;
    case "balloon":
      return <IconBalloon size={size} />;
    default:
      return <IconBox size={size} />;
  }
}
