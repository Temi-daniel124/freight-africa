import Image from "next/image";
import { cn } from "@/lib/utils";

const variants = {
  "primary-green": { src: "/brand/svg/primary-green.svg", width: 1535, height: 620 },
  "primary-white": { src: "/brand/svg/primary-white.svg", width: 1535, height: 620 },
  "icon-green": { src: "/brand/svg/icon-green.svg", width: 572, height: 620 },
  "icon-white": { src: "/brand/svg/icon-white.svg", width: 572, height: 620 },
} as const;

type LogoProps = {
  variant?: keyof typeof variants;
  className?: string;
  priority?: boolean;
  alt?: string;
};

export function Logo({ variant = "primary-green", className, priority, alt = "Freight Africa" }: LogoProps) {
  const { src, width, height } = variants[variant];
  return <Image src={src} width={width} height={height} alt={alt} priority={priority} unoptimized className={cn("h-10 w-auto", className)} />;
}
