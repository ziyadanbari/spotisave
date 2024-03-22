import { Logo } from "@/exports";
import Image from "next/image";
export default function Navbar() {
  return (
    <div className="w-full shadow-lg shadow-gray-700/10 sm:px-24 px-5 py-4">
      <div className="flex items-center gap-2">
        <div>
          <Image src={Logo} width={40} height={40} alt="logo" />
        </div>
        <div className="text-2xl font-semibold">SPOTISave</div>
      </div>
    </div>
  );
}
