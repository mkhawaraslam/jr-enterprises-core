import React, { useState } from "react";
import ButtonPrimary from "./misc/ButtonPrimary";
import ScrollAnimationWrapper from "./Layout/ScrollAnimationWrapper";

const clients = [
  {
    name: "Volka Food",
    image: "https://volkafood.com/wp-content/themes/beeta/resources/custom/img/volka-logo.png",
    website: "https://volkafood.com/",
    width: 364,
    height: 271,
  },
  {
    name: "SM Foods",
    image: "https://smfoods.com.pk/wp-content/themes/beeta/resources/custom/img/sm-logo-transparnt-2.png",
    website: "https://smfoods.com.pk/",
    width: 367,
    height: 700,
    imageClassName: "client-logo-image--sm",
  },
  {
    name: "Colony Textiles",
    image: "https://colonytextiles.com/wp-content/uploads/2021/06/Group-3.png",
    website: "https://colonytextiles.com/",
    width: 115,
    height: 114,
    imageClassName: "client-logo-image--colony",
  },
  {
    name: "Masood Textile",
    image: "https://masoodtextile.com/wp-content/uploads/2019/04/MTM_Logo_.png",
    website: "https://masoodtextile.com/",
    width: 541,
    height: 331,
  },
];

const ClientLogo = ({ client }) => {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <a
      href={client.website}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={client.name + " website (opens in a new tab)"}
      className="client-logo-link"
    >
      <div className="client-logo-frame">
        {imageFailed ? (
          <span className="client-logo-fallback">{client.name}</span>
        ) : (
          <img
            src={client.image}
            alt={client.name}
            width={client.width}
            height={client.height}
            loading="lazy"
            decoding="async"
            className={"client-logo-image " + (client.imageClassName || "")}
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
    </a>
  );
};

const Testimonials = () => {
  return (
    <section className="bg-white-500 w-full py-14" id="testimoni" aria-labelledby="testimonials-heading">
      <div className="max-w-screen-xl px-6 sm:px-8 lg:px-16 mx-auto flex flex-col w-full text-center">
        <ScrollAnimationWrapper
          as="h2"
          id="testimonials-heading"
          className="text-2xl sm:text-3xl lg:text-4xl font-medium text-black-600 leading-normal max-w-xl mx-auto"
        >
          Trusted by Happy Customer
        </ScrollAnimationWrapper>
        <ul
          aria-label="Our clients"
          className="client-logo-gallery grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 w-full max-w-5xl mx-auto mt-10 py-6 border-y border-gray-100 bg-white-500"
        >
          {clients.map((client, index) => (
            <ScrollAnimationWrapper
              as="li"
              key={client.name}
              className="min-w-0"
              custom={{ delay: index * 0.06 }}
            >
              <ClientLogo client={client} />
            </ScrollAnimationWrapper>
          ))}
        </ul>
        <ScrollAnimationWrapper className="relative z-10 w-full mt-16 -mb-44">
          <div className="relative z-10 rounded-xl py-8 sm:py-14 px-6 sm:px-12 lg:px-16 w-full flex flex-col sm:flex-row justify-between items-center bg-white-500">
            <div className="flex flex-col text-left w-10/12 sm:w-7/12 lg:w-5/12 mb-6 sm:mb-0">
              <h5 className="text-black-600 text-xl sm:text-2xl lg:text-3xl leading-relaxed font-medium">
                Subscribe Now for <br /> Get Special Features!
              </h5>
              <p>Let's subscribe with us and find the fun.</p>
            </div>
            <ButtonPrimary>Get Started</ButtonPrimary>
          </div>
          <div
            className="absolute pointer-events-none bg-black-600 opacity-5 w-11/12 rounded-lg h-60 sm:h-56 top-0 mt-8 mx-auto left-0 right-0"
            style={{ filter: "blur(114px)" }}
          />
        </ScrollAnimationWrapper>
      </div>
    </section>
  );
};

export default Testimonials;
