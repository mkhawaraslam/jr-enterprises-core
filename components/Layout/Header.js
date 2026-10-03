import React, { useState, useEffect } from "react";
import Image from "next/image";
// import Link from "next/link";
// Import react scroll
import { Link as LinkScroll } from "react-scroll";
// import ButtonOutline from "../misc/ButtonOutline.";
import companyLogo from "../../public/assets/jr-logo.png";

const Header = () => {
  const [activeLink, setActiveLink] = useState(null);
  const [scrollActive, setScrollActive] = useState(false);
  useEffect(() => {
    window.addEventListener("scroll", () => {
      setScrollActive(window.scrollY > 20);
    });
  }, []);
  return (
    <>
      <header
        className={
          "fixed top-0 w-full  z-30 bg-white-500 transition-all " +
          (scrollActive ? " shadow-md pt-0" : " pt-4")
        }
      >
        <nav className="max-w-screen-xl px-6 sm:px-8 lg:px-16 mx-auto flex items-center justify-between py-2">
          <div className="relative h-12 w-48 sm:h-16 sm:w-64 flex-shrink-0">
            <Image
              src={companyLogo}
              alt="J.R Enterprises"
              layout="fill"
              objectFit="contain"
              sizes="(min-width: 640px) 256px, 192px"
              priority
            />
          </div>
          <ul className="hidden lg:flex ml-auto text-black-500 items-center justify-end">
            <LinkScroll
              activeClass="active"
              to="about"
              offset={-80}
              spy={true}
              smooth={true}
              duration={1000}
              onSetActive={() => {
                setActiveLink("about");
              }}
              className={
                "px-4 py-2 mx-2 cursor-pointer animation-hover inline-block relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" +
                (activeLink === "about"
                  ? " text-primary animation-active "
                  : " text-black-500 hover:text-primary-hover a")
              }
            >
              About
            </LinkScroll>
            <LinkScroll
              activeClass="active"
              to="feature"
              offset={-80}
              spy={true}
              smooth={true}
              duration={1000}
              onSetActive={() => {
                setActiveLink("feature");
              }}
              className={
                "px-4 py-2 mx-2 cursor-pointer animation-hover inline-block relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" +
                (activeLink === "feature"
                  ? " text-primary animation-active "
                  : " text-black-500 hover:text-primary-hover ")
              }
            >
              Products
            </LinkScroll>
            <LinkScroll
              activeClass="active"
              to="testimoni"
              offset={-80}
              spy={true}
              smooth={true}
              duration={1000}
              onSetActive={() => {
                setActiveLink("testimoni");
              }}
              className={
                "px-4 py-2 mx-2 cursor-pointer animation-hover inline-block relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" +
                (activeLink === "testimoni"
                  ? " text-primary animation-active "
                  : " text-black-500 hover:text-primary-hover ")
              }
            >
              Clients
            </LinkScroll>
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
      {/* Mobile Navigation */}

      <nav className="fixed lg:hidden bottom-0 left-0 right-0 z-20 px-2 sm:px-8 shadow-t ">
        <div className="bg-white-500 sm:px-3">
          <ul className="flex w-full justify-between items-center text-black-500">
            <LinkScroll
              activeClass="active"
              to="about"
              offset={-80}
              spy={true}
              smooth={true}
              duration={1000}
              onSetActive={() => {
                setActiveLink("about");
              }}
              className={
                "flex-1 min-w-0 px-1 sm:px-4 py-2 flex flex-col items-center text-[11px] sm:text-xs border-t-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
                (activeLink === "about"
                  ? "  border-primary text-primary"
                  : " border-transparent")
              }
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              About
            </LinkScroll>
            <LinkScroll
              activeClass="active"
              to="feature"
              offset={-80}
              spy={true}
              smooth={true}
              duration={1000}
              onSetActive={() => {
                setActiveLink("feature");
              }}
              className={
                "flex-1 min-w-0 px-1 sm:px-4 py-2 flex flex-col items-center text-[11px] sm:text-xs border-t-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
                (activeLink === "feature"
                  ? "  border-primary text-primary"
                  : " border-transparent ")
              }
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="12 12 76 76"
                enableBackground="new 0 0 100 100"
                xmlSpace="preserve"
                aria-hidden="true"
                focusable="false"
              >
                <g>
                  <path d="M25.8,60.6h-4.5c-0.7,0-1.3,0.6-1.3,1.3v16.1c0,0.7,0.6,1.3,1.3,1.3h2.2c2,0,3.6-1.6,3.6-3.6V62
                    C27.2,61.2,26.5,60.6,25.8,60.6z" />
                  <path d="M79.9,69.4c-0.7-1.6-2-3.3-3.9-3.5c-1-0.1-2,0.3-2.9,0.6c-3.6,1.3-7.2,2.5-10.8,3.8
                    c-2.3,0.8-4.7,1.6-7.2,1.8c-1.7,0.1-3.4,0-5.1,0c-0.9,0-1.7-0.7-1.7-1.7s0.7-1.7,1.7-1.7l9.1,0c1.7,0,3-1.4,3-3s-1.4-3-3-3h-7
                    c-0.3,0-2.2-0.1-3.4-0.6c-1.3-0.6-3-0.7-3-0.6c0,0,0,0-0.1,0H33.4c-1.5,0-2.7,1.2-2.7,2.7v11.3c0,1.3,1,2.4,2.3,2.6
                    c0.1,0,0.2,0,0.3,0c2.3,0,4.6,0.5,6.9,0.9c2.3,0.5,4.5,0.8,6.9,0.8c3,0.1,6.1-0.4,9-1.1c2.9-0.8,5.7-1.9,8.5-2.8
                    c4.8-1.6,9.7-3.3,14.5-4.9C79.7,70.7,80.2,70.2,79.9,69.4z" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M58,40.1v15c0,0.5,0.5,0.7,0.9,0.6c2.9-1.7,11.9-6.7,11.9-6.7
                    c1.2-0.7,1.9-1.9,1.9-3.3V32.2c0-0.5-0.5-0.7-0.9-0.6l-13.2,7.4C58.3,39.3,58,39.7,58,40.1" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M56.8,36L70,28.6c0.4-0.2,0.4-0.8,0-1c-2.9-1.7-12-6.8-12-6.8
                    c-1.2-0.7-2.6-0.7-3.8,0c0,0-9,5.1-12,6.8c-0.4,0.2-0.4,0.8,0,1L55.6,36C55.9,36.2,56.4,36.2,56.8,36" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M53.7,39.1l-13.2-7.4c-0.4-0.2-0.9,0.1-0.9,0.6v13.4
                    c0,1.3,0.7,2.6,1.9,3.3c0,0,9,5.1,11.9,6.7c0.4,0.2,0.9-0.1,0.9-0.6V40.1C54.3,39.7,54.1,39.3,53.7,39.1" />
                </g>
              </svg>
              Products
            </LinkScroll>
            <LinkScroll
              activeClass="active"
              to="testimoni"
              offset={-80}
              spy={true}
              smooth={true}
              duration={1000}
              onSetActive={() => {
                setActiveLink("testimoni");
              }}
              className={
                "flex-1 min-w-0 px-1 sm:px-4 py-2 flex flex-col items-center text-[11px] sm:text-xs border-t-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
                (activeLink === "testimoni"
                  ? "  border-primary text-primary"
                  : " border-transparent ")
              }
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Clients
            </LinkScroll>
          </ul>
        </div>
      </nav>
      {/* End Mobile Navigation */}
    </>
  );
};

export default Header;
