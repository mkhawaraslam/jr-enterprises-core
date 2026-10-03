import React, { useState } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { businessPhone } from "../data/contact";
import ScrollAnimationWrapper from "./Layout/ScrollAnimationWrapper";
import QuoteDialog from "./QuoteDialog";

export default function QuoteSection() {
  const [quoteOpen, setQuoteOpen] = useState(false);

  return (
    <>
      <section id="request-quote" aria-labelledby="quote-heading" className="w-full bg-primary-light py-12 sm:py-16">
        <ScrollAnimationWrapper className="mx-auto flex max-w-screen-xl flex-col gap-8 px-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-16">
          <div className="min-w-0 max-w-xl">
            <h2 id="quote-heading" className="text-2xl font-medium leading-tight text-black-600 sm:text-3xl">
              Need the <span className="text-primary">Right Product</span> for Your Industry?
            </h2>
            <p className="mt-4 leading-relaxed">
              Share your product requirements, model number, or specifications. Our team can assist with product selection, availability, and quotations.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:flex-none">
            <button
              type="button"
              onClick={() => setQuoteOpen(true)}
              aria-haspopup="dialog"
              className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-light"
            >
              Request a Quote <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <a
              href={businessPhone.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp Us (opens in a new tab)"
              className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-md border border-primary bg-transparent px-6 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-light"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" /> WhatsApp Us
            </a>
          </div>
        </ScrollAnimationWrapper>
      </section>
      <QuoteDialog open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </>
  );
}
