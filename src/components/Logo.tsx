import Image from "next/image"

export default function Logo({ size = 120 }: { size?: number }) {
  return (
    <Image
      src="/valor.svg"
      alt="Valor Logo"
      width={size}
      height={size}
      className="drop-shadow-lg transition-all duration-300 transform hover:scale-105"
      priority
    />
  );
}


