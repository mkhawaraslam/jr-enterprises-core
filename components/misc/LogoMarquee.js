import React, { useState } from "react";

const logoGroupClassName = "m-0 flex min-w-[100vw] shrink-0 list-none justify-around gap-4 py-2 pr-4 sm:gap-6 sm:pr-6";
const logoItemClassName = "min-w-0 w-40 flex-none sm:w-48 motion-reduce:w-auto sm:motion-reduce:w-auto";

const Logo = ({ item, duplicate = false, imageClassName }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const isLink = Boolean(item.website) && !duplicate;
  const Component = isLink ? "a" : "div";

  return (
    <Component
      href={isLink ? item.website : undefined}
      target={isLink ? "_blank" : undefined}
      rel={isLink ? "noopener noreferrer" : undefined}
      aria-label={isLink ? item.name + " website (opens in a new tab)" : undefined}
      className="group flex min-h-[7rem] items-center justify-center px-2 py-4 text-black-500 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <div className="flex h-20 w-full items-center justify-center overflow-hidden transition-transform duration-300 ease-in-out motion-safe:group-hover:scale-110 motion-safe:group-focus-visible:scale-110 motion-reduce:transition-none">
        {imageFailed ? (
          <span className="max-w-full text-sm font-medium [overflow-wrap:anywhere]">{item.name}</span>
        ) : (
          <img
            src={item.image}
            alt={duplicate ? "" : item.name + " logo"}
            width={item.width}
            height={item.height}
            loading="lazy"
            decoding="async"
            className={"block w-auto object-contain " + (item.imageClassName || imageClassName)}
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
    </Component>
  );
};

const LogoMarquee = ({ items, ariaLabel, imageClassName = "h-16 max-w-full", trackClassName = "" }) => (
  <div className="w-full overflow-hidden [&:hover>div]:[animation-play-state:paused]">
    <div
      className={"flex w-max animate-client-logos-scroll motion-reduce:block motion-reduce:w-full motion-reduce:animate-none " + trackClassName}
      dir="ltr"
    >
      <ul
        className={logoGroupClassName + " motion-reduce:grid motion-reduce:min-w-0 motion-reduce:grid-cols-2 motion-reduce:pr-0 sm:motion-reduce:pr-0 lg:motion-reduce:grid-cols-4"}
        aria-label={ariaLabel}
      >
        {items.map((item) => (
          <li key={item.name} className={logoItemClassName}>
            <Logo item={item} imageClassName={imageClassName} />
          </li>
        ))}
      </ul>
      <ul className={logoGroupClassName + " motion-reduce:hidden"} aria-hidden="true">
        {items.map((item) => (
          <li key={item.name} className={logoItemClassName}>
            <Logo item={item} duplicate imageClassName={imageClassName} />
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export default LogoMarquee;
