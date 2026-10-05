import React from "react";
import { ChevronDown } from "lucide-react";
import content from "../data/landingContent.json";

export default function FAQs() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="w-full bg-white-300 py-12 sm:py-16 scroll-mt-24">
      <div className="mx-auto max-w-screen-xl px-6 sm:px-8 lg:px-16">
        <h2 id="faq-heading" className="text-2xl sm:text-3xl font-medium leading-tight text-black-600">
          What would you like to know <span className="text-primary">before ordering?</span>
        </h2>
        <div className="mt-8 border-t border-gray-100">
          {content.faqs.map((faq, index) => (
            <details key={faq.question} className="group border-b border-gray-100" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
                <h3 className="text-base sm:text-lg font-medium leading-snug text-black-600">{faq.question}</h3>
                <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-primary transition-transform duration-300 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
              </summary>
              <p className="max-w-3xl pb-6 pr-8 text-sm sm:text-base leading-relaxed text-black-500">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
