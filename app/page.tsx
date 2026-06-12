import Link from "next/link";
import Image from "next/image";
import Counter from "@/components/Counter";

export default function NewHome() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 gap-2">
      <Image
        src="/Map.png"
        alt="Map"
        width={240}
        height={60}
        className="mb-6"
      />

      <h1 className="text-4xl font-bold">New Home</h1>
      <p className="text-lg mt-4">Welcome to the new home page!</p>

      <Counter />
      <Link
        href="/about"
        className="text-white mt-4 bg-blue-500 hover:bg-blue-700 py-2 px-4 rounded"
      >
        Visit about
      </Link>

    </div>
  );
}