import Link from "next/link";

export default function About() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 gap-2">
      <h1 className="text-4xl font-bold">About Us</h1>
      <p className="text-lg mt-4">Learn more about our company and team.</p>

      <Link href="/" className="text-white mt-4 bg-blue-500 hover:bg-blue-700 py-2 px-4 rounded">
        Go back home
      </Link>
    </div>
  );
}
