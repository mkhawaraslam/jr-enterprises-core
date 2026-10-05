import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Link as LinkScroll } from "react-scroll";
import { Boxes, Info, MessagesSquare } from "lucide-react";
import companyLogo from "../../public/assets/jr-logo.png";

const navigation = [
  { id: "about", label: "About", Icon: Info },
  { id: "feature", label: "Products", Icon: Boxes },
  { id: "testimoni", label: "Clients", Icon: MessagesSquare },
];

const Header = () => {
  const [activeLink, setActiveLink] = useState(null);
  const [scrollActive, setScrollActive] = useState(false);

  useEffect(() => {
    const updateScroll = () => setScrollActive(window.scrollY > 20);
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  const scrollProps = (item) => ({
    href: "#" + item.id,
    to: item.id,
    offset: -80,
    spy: true,
    smooth: true,
    duration: 1000,
    activeClass: "active",
    "aria-current": activeLink === item.id ? "location" : undefined,
    onSetActive: () => setActiveLink(item.id),
  });

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white-500 focus:px-4 focus:py-3 focus:text-primary focus:outline focus:outline-2 focus:outline-primary">
        Skip to content
      </a>
      <header className={"fixed top-0 w-full z-30 bg-white-500 transition-all " + (scrollActive ? "shadow-md pt-0" : "pt-4")}>
        <nav aria-label="Main navigation" className="max-w-screen-xl px-6 sm:px-8 lg:px-16 mx-auto flex items-center justify-between py-2">
          <a href="/" aria-label="J.R Enterprises homepage" className="relative h-12 w-48 sm:h-16 sm:w-64 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Image src={companyLogo} alt="J.R Enterprises industrial supplier logo" layout="fill" objectFit="contain" sizes="(min-width: 640px) 256px, 192px" priority />
          </a>
          <ul className="hidden lg:flex ml-auto text-black-500 items-center justify-end">
            {navigation.map((item) => (
              <li key={item.id}>
                <LinkScroll {...scrollProps(item)} className={"px-4 py-2 mx-2 cursor-pointer animation-hover inline-block relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " + (activeLink === item.id ? "text-primary animation-active" : "text-black-500 hover:text-primary-hover")}>
                  {item.label}
                </LinkScroll>
              </li>
            ))}
          </ul>
          {/* Auth CTAs are hidden for now, but kept here for future reuse.
          <div className="ml-8 font-medium hidden lg:flex justify-end items-center">
            <Link href="/">
              <a className="text-black-600 mx-2 sm:mx-4 capitalize tracking-wide hover:text-primary-hover transition-all">
                Sign In
              </a>
            </Link>
            <ButtonOutline>Sign Up</ButtonOutline>
          </div>
          */}
        </nav>
      </header>
      <nav aria-label="Mobile navigation" className="fixed lg:hidden bottom-0 left-0 right-0 z-20 px-2 sm:px-8 shadow-t">
        <div className="bg-white-500 sm:px-3">
          <ul className="flex w-full justify-between items-center text-black-500">
            {navigation.map((item) => (
              <li key={item.id} className="flex-1 min-w-0">
                <LinkScroll {...scrollProps(item)} className={"w-full px-1 sm:px-4 py-2 flex flex-col items-center text-[11px] sm:text-xs border-t-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " + (activeLink === item.id ? "border-primary text-primary" : "border-transparent")}>
                  <item.Icon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" aria-hidden="true" />
                  {item.label}
                </LinkScroll>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
};

export default Header;
