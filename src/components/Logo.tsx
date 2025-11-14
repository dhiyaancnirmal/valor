export default function Logo({ size = 120 }: { size?: number }) {
  return (
    <img
      src="/valor.svg"
      alt="Valor Logo"
      width={size}
      height={size}
      className="drop-shadow-xl hover:drop-shadow-2xl transition-all duration-300 transform hover:scale-105"
    />
  );
}



