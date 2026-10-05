import React from "react";
import { ArrowUpRight, Mail, MessageCircle } from "lucide-react";
import content from "../data/landingContent.json";
import collections from "../data/productCollections.json";
import business from "../data/business.json";
import { businessPhone } from "../data/contact";

const linkClassName = "inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4";

export default function ProductGuide() {
  return (
    <section id="product-guide" aria-labelledby="product-guide-heading" className="bg-white-500 py-12 sm:py-16">
      <div className="mx-auto max-w-screen-xl px-6 sm:px-8 lg:px-16">
        <h2 id="product-guide-heading" className="max-w-2xl text-2xl sm:text-3xl font-medium leading-tight text-black-600">
          How can we support your <span className="text-primary">industrial requirements?</span>
        </h2>
        <ul className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          {content.support.map((item) => (
            <li key={item.question} className="min-w-0 border-t-2 border-primary pt-4">
              <h3 className="text-lg font-medium leading-snug text-black-600">{item.question}</h3>
              <p className="mt-3 text-sm leading-relaxed text-black-500">{item.answer}</p>
            </li>
          ))}
        </ul>

        <h3 id="selection-heading" className="mt-12 text-xl font-medium text-black-600">
          Which specifications matter for your product?
        </h3>
        <div className="mt-5 overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" tabIndex={0} role="region" aria-labelledby="selection-heading">
          <table className="w-full min-w-[42rem] border-collapse text-left text-sm leading-relaxed">
            <caption className="pb-4 text-left text-black-500">
              Industrial product collections and the key details needed for a quotation. All pricing is quotation-only.
            </caption>
            <thead className="bg-primary-light text-black-600">
              <tr>
                <th scope="col" className="w-1/4 px-4 py-4 font-medium">Product collection</th>
                <th scope="col" className="w-1/3 px-4 py-4 font-medium">Common components</th>
                <th scope="col" className="px-4 py-4 font-medium">Specifications to share</th>
              </tr>
            </thead>
            <tbody className="text-black-500">
              {content.selection.map((row) => {
                const collection = collections.find((item) => item.id === row.id);
                return (
                  <tr key={row.id} className="border-b border-gray-100 align-top">
                    <th scope="row" className="px-4 py-4 font-medium text-black-600">
                      <a href={"#" + row.id} className="inline-flex items-start gap-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        {collection.title}<ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      </a>
                    </th>
                    <td className="px-4 py-4">{row.components}</td>
                    <td className="px-4 py-4">{row.specifications}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 border-t border-gray-100 pt-8 md:grid-cols-2 md:gap-12">
          <div>
            <h3 className="text-xl font-medium leading-snug text-black-600">What should you send for a quotation?</h3>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-4">
              <a href={businessPhone.whatsapp} target="_blank" rel="noopener noreferrer" className={linkClassName} aria-label="Discuss requirements on WhatsApp (opens in a new tab)">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />Discuss requirements
              </a>
              <a href={"mailto:" + business.email} className={linkClassName}>
                <Mail className="h-5 w-5" aria-hidden="true" />Email our team
              </a>
            </div>
          </div>
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-black-500 marker:font-medium marker:text-primary">
            {content.quotationChecklist.map((item) => <li key={item} className="pl-2">{item}</li>)}
          </ol>
        </div>
      </div>
    </section>
  );
}
