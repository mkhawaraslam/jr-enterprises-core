import React from "react";
import Image from "next/image";
import ScrollAnimationWrapper from "./Layout/ScrollAnimationWrapper";
import productCollections from "../data/productCollections.json";

const ProductCollection = ({ collection, index }) => (
  <ScrollAnimationWrapper
    as="li"
    custom={{ delay: (index % 3) * 0.08, duration: 0.65 }}
    className="min-w-0 h-full"
  >
    <div
      className="group overflow-hidden rounded-lg border border-gray-100 bg-white-500 transition-shadow duration-300 hover:shadow-lg motion-safe:transition-all motion-safe:hover:-translate-y-1"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <div className="absolute inset-4 sm:inset-5">
          <Image
            src={collection.image}
            alt={collection.alt}
            layout="fill"
            objectFit="contain"
            sizes="(min-width: 1280px) 336px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain transition-transform duration-500 motion-safe:group-hover:scale-[1.025]"
          />
        </div>
      </div>
    </div>
  </ScrollAnimationWrapper>
);

const Feature = () => (
  <section
    id="feature"
    aria-labelledby="catalog-heading"
    className="bg-white-300 py-12 sm:py-16 scroll-mt-24"
  >
    <div className="max-w-screen-xl mx-auto px-6 sm:px-8 lg:px-16">
      <ScrollAnimationWrapper className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
        <h2
          id="catalog-heading"
          className="text-3xl lg:text-4xl font-medium leading-tight text-black-600"
        >
          Our <span className="text-primary">Product</span>
        </h2>
        <p className="text-sm text-black-500">
          {productCollections.length} collections
        </p>
      </ScrollAnimationWrapper>

      <ul
        id="catalog-products"
        aria-label="Product collections"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8"
      >
        {productCollections.map((collection, index) => (
          <ProductCollection key={collection.id} collection={collection} index={index} />
        ))}
      </ul>
    </div>
  </section>
);

export default Feature;
