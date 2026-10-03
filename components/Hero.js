import React from "react";
import Image from "next/image";
import ScrollAnimationWrapper from "./Layout/ScrollAnimationWrapper";

const aboutBlocks = [
  {
    id: "about-company",
    headingPrefix: "The",
    heading: "Company",
    image: "/assets/about-company.jpg",
    imageAlt: "Stainless steel industrial pipes and valves",
    body: "Established in 2005, JR Enterprises has built a prominent reputation across Pakistan and abroad as a premier importer, technical supplier, and distributor. We specialize in high-performance industrial valves, steam traps, forged fittings, tubing, measuring instruments, and temperature/pressure controls. We bridge modern engineering technology with industrial plant needs, providing end-to-end guidance and optimizing plant efficiency.",
  },
  {
    id: "about-vision",
    headingPrefix: "Our",
    heading: "Vision",
    image: "/assets/about-vision.jpg",
    imageAlt: "Robotic equipment on an automated production line",
    body: "By the Grace of Almighty ALLAH, our vision is to lead the industrial automation sector through uncompromising quality, ultra-modern technology, and door-to-door technical expertise. We aim to empower industries with reliable, durable, and highly efficient automation components that ensure optimal machinery performance and long-term operational success.",
  },
];

const Hero = () => {
  return (
    <div
      className="max-w-screen-xl mt-24 px-6 sm:px-8 lg:px-16 mx-auto"
      id="about"
    >
      {aboutBlocks.map((block, index) => {
        const Heading = index === 0 ? "h1" : "h2";

        return (
          <section
            key={block.id}
            aria-labelledby={block.id}
            className={index === 0 ? "" : "border-t border-gray-100"}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8 lg:gap-16 py-8 sm:py-12">
              <div className={"min-w-0 " + (index === 1 ? "md:order-2" : "")}>
                <ScrollAnimationWrapper
                  as={Heading}
                  id={block.id}
                  className="text-3xl lg:text-4xl font-medium text-black-600 leading-tight"
                >
                  {block.headingPrefix}{" "}
                  <span className="text-orange-500">{block.heading}</span>
                </ScrollAnimationWrapper>
                <ScrollAnimationWrapper
                  as="p"
                  custom={{ delay: 0.12 }}
                  className="text-base lg:text-lg text-black-500 leading-relaxed mt-6"
                >
                  {block.body}
                </ScrollAnimationWrapper>
              </div>
              <ScrollAnimationWrapper
                custom={{ delay: 0.18 }}
                className={
                  "min-w-0 w-full overflow-hidden rounded-lg bg-white-300 " +
                  (index === 1 ? "md:order-1" : "")
                }
              >
                <Image
                  src={block.image}
                  alt={block.imageAlt}
                  width={612}
                  height={408}
                  layout="responsive"
                  sizes="(min-width: 1280px) 544px, (min-width: 768px) 50vw, 100vw"
                  objectFit="cover"
                  priority={index === 0}
                />
              </ScrollAnimationWrapper>
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default Hero;
