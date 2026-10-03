import React from "react";
import ScrollAnimationWrapper from "./Layout/ScrollAnimationWrapper";
import LogoMarquee from "./misc/LogoMarquee";

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
    imageClassName: "h-32 max-w-none translate-y-[5px]",
  },
  {
    name: "Colony Textiles",
    image: "https://colonytextiles.com/wp-content/uploads/2021/06/Group-3.png",
    website: "https://colonytextiles.com/",
    width: 115,
    height: 114,
    imageClassName: "h-16 max-w-full [filter:brightness(0)_saturate(100%)_invert(31%)_sepia(89%)_saturate(2479%)_hue-rotate(212deg)_brightness(96%)_contrast(90%)]",
  },
  {
    name: "Masood Textile",
    image: "https://masoodtextile.com/wp-content/uploads/2019/04/MTM_Logo_.png",
    website: "https://masoodtextile.com/",
    width: 541,
    height: 331,
  },
  {
    name: "Mahmood Textile",
    image: "https://www.mahmoodtextile.com/images/2014/09/logo22.png",
    website: "https://www.mahmoodtextile.com/",
  },
  {
    name: "Masood Roomi",
    image: "https://masood-roomi.com/storage/2021/12/Untitled-2.png",
    website: "https://masood-roomi.com/",
  },
  {
    name: "Fazal Cloth",
    image: "https://www.fazalcloth.com/wp-content/themes/industify/framework/img/retina-dark-logo.png",
    website: "https://www.fazalcloth.com/",
  },
  {
    name: "Hussain Group",
    image: "https://www.hussaingroup.com/templates/school/images/logo.png",
    website: "https://www.hussaingroup.com/",
  },
  {
    name: "Jadeed Group",
    image: "https://jadeedgroup.com/images/images/logo%20jadeed.png",
    website: "https://jadeedgroup.com/",
  },
  {
    name: "Lipton Ice Tea",
    image: "https://w7.pngwing.com/pngs/240/392/png-transparent-lipton-hd-logo-thumbnail.png",
  },
];

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
      </div>
      <ScrollAnimationWrapper className="min-w-0 w-full mt-10 py-6 bg-white-500 text-center">
        <LogoMarquee items={clients} ariaLabel="Our clients" />
      </ScrollAnimationWrapper>
    </section>
  );
};

export default Testimonials;
