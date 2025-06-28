import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="text-center sm:text-left">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            3D Measurement App
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            IKEA-style 3D measurements with smart camera-responsive positioning
          </p>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link
            href="/demo"
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white gap-2 hover:bg-blue-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
          >
            🎯 Try 3D Demo
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
          >
            Client Login
          </Link>
        </div>

        <div className="mt-6 text-center sm:text-left">
          <p className="text-sm text-gray-600 mb-2">Additional Resources:</p>
          <div className="flex gap-4 justify-center sm:justify-start text-sm">
            <Link href="/health" className="text-blue-600 hover:text-blue-500">
              System Health
            </Link>
            <a 
              href="http://localhost:3001" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 hover:text-blue-500"
            >
              Company Dashboard
            </a>
            <a 
              href="http://localhost:8000/health" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 hover:text-blue-500"
            >
              API Status
            </a>
          </div>
        </div>

        <div className="mt-8 text-center sm:text-left">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Features</h2>
          <ul className="space-y-2 text-gray-600">
            <li>✨ IKEA-style external dimension display</li>
            <li>🎯 Smart camera-responsive positioning</li>
            <li>🏹 3D arrow heads with proper quaternion rotation</li>
            <li>📏 Automatic width, height, and depth measurements</li>
            <li>🔄 Interactive 3D controls (rotate, pan, zoom)</li>
            <li>🎨 Clean, modern UI with real-time updates</li>
          </ul>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
