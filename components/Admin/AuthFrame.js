import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import logo from "../../public/assets/jr-logo.png";

export default function AuthFrame({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-white-300 text-black-600">
      <header className="border-b border-gray-100 bg-white-500">
        <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="/" aria-label="J.R Enterprises homepage" className="relative block h-12 w-48 max-w-full shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Image src={logo} alt="J.R Enterprises" layout="fill" objectFit="contain" sizes="192px" priority />
          </a>
          <a href="/" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-black-500 transition-colors hover:bg-primary-light hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Back to website" title="Back to website">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
      </header>
      <main id="admin-content" className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 sm:py-16">
        {children}
      </main>
      <footer className="px-5 pb-6 text-center text-xs text-black-500">J.R Enterprises</footer>
    </div>
  );
}
