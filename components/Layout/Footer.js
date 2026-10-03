import React from "react";
import Image from "next/image";
import companyLogo from "../../public/assets/jr-logo.png";
import Facebook from "../../public/assets/Icon/facebook.svg";
import TikTok from "../../public/assets/Icon/tiktok.svg";
import Instagram from "../../public/assets/Icon/instagram.svg";
import Phone from "../../public/assets/Icon/phone.svg";
import Mail from "../../public/assets/Icon/mail.svg";
import Location from "../../public/assets/Icon/gridicons_location.svg";
const Footer = () => {
  return (
    <div className="bg-white-300 pt-44 pb-24">
      <div className="max-w-screen-xl w-full mx-auto px-6 sm:px-8 lg:px-16 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
        <div className="min-w-0 md:max-w-sm flex flex-col items-start">
          <div className="relative mb-6 h-16 w-64 sm:h-[4.5rem] sm:w-72 max-w-full">
            <Image
              src={companyLogo}
              alt="J.R Enterprises"
              layout="fill"
              objectFit="contain"
              sizes="(min-width: 640px) 288px, 256px"
            />
          </div>
          <p className="mb-4 leading-relaxed">
            <strong className="font-bold text-primary">J.R Enterprises</strong>, established
            in 2012, supplies high-performance industrial valves, steam traps,
            fittings, tubing, measuring instruments, and automation components
            across Pakistan and abroad.
          </p>
          <div className="flex w-full mt-2 mb-8 -mx-2">
            <div className="mx-2 bg-white-500 rounded-full items-center justify-center flex p-2 shadow-md">
              <Facebook className="h-6 w-6 text-primary" />
            </div>
            <div className="mx-2 bg-white-500 rounded-full items-center justify-center flex p-2 shadow-md">
              <TikTok className="h-6 w-6 text-primary" role="img" aria-label="TikTok" />
            </div>
            <div className="mx-2 bg-white-500 rounded-full items-center justify-center flex p-2 shadow-md">
              <Instagram className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="min-w-0 w-full md:max-w-md md:justify-self-end flex flex-col">
          <p className="text-black-600 mb-4 font-medium text-lg">Contact Us</p>
          <address className="text-black-500 not-italic">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
                <a href="tel:+923090980866" className="min-w-0 hover:text-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  +92 302 6500974
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
                <a href="mailto:jrenterprises1472@gmail.com" className="min-w-0 break-words hover:text-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  jrenterprises1472@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Location className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0">
                  Crystal Arcade, Opp-Main Moblink Franchise, LMQ Road, Multan, Pakistan.
                </span>
              </li>
            </ul>
          </address>
        </div>
      </div>
      <div className="max-w-screen-xl w-full mx-auto mt-8 px-6 sm:px-8 lg:px-16">
        <p className="border-t border-gray-100 pt-6 text-sm text-gray-400 text-center">
          Copyright © 2026 |{" "}
          <strong >J.R Enterprises</strong>{" "}
          | All Rights Reserved
        </p>
      </div>
    </div>
  );
};

export default Footer;
