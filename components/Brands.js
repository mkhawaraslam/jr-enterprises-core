import React from "react";
import ScrollAnimationWrapper from "./Layout/ScrollAnimationWrapper";
import LogoMarquee from "./misc/LogoMarquee";
import brands from "../data/brands.json";

const Brands = () => (
  <section id="brands" aria-labelledby="brands-heading" className="w-full bg-white-500 py-10 sm:py-12">
    <div className="max-w-screen-xl mx-auto px-6 sm:px-8 lg:px-16 text-center">
      <ScrollAnimationWrapper
        as="h2"
        id="brands-heading"
        className="text-3xl lg:text-4xl font-medium leading-tight text-black-600"
      >
        Our <span className="text-primary">Brands</span>
      </ScrollAnimationWrapper>
    </div>
    <ScrollAnimationWrapper className="min-w-0 w-full mt-6 py-4">
      <LogoMarquee
        items={brands}
        ariaLabel="Our brand"
        imageClassName="h-12 max-w-[8rem]"
        trackClassName="[animation-duration:75s]"
      />
    </ScrollAnimationWrapper>
  </section>
);

export default Brands;
