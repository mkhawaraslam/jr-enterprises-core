import React, { useRef, useState } from "react";
import Image from "next/image";
import ScrollAnimationWrapper from "./Layout/ScrollAnimationWrapper";
import catalogData from "../data/catalogData.json";

const products = catalogData.flatMap(({ category, items }) =>
  items.map((item) => ({ ...item, category }))
);
const categories = ["All products", ...catalogData.map(({ category }) => category)];

const ProductCard = ({ product }) => {
  const [imageIndex, setImageIndex] = useState(0);
  const imageSources = [product.localImage, product.image];

  return (
    <ScrollAnimationWrapper as="article" className="min-w-0 overflow-hidden rounded-lg border border-gray-100 bg-white-500">
      <div
        className="relative flex items-center justify-center w-full border-b border-gray-100 bg-white-500"
        style={{ aspectRatio: "4 / 3" }}
      >
        {imageIndex < imageSources.length ? (
          <div className="absolute inset-0 m-5">
            <Image
              src={imageSources[imageIndex]}
              alt={product.title}
              layout="fill"
              objectFit="contain"
              sizes="(min-width: 1280px) 270px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              unoptimized={imageIndex === 1}
              onError={() => setImageIndex((current) => current + 1)}
            />
          </div>
        ) : (
          <span className="text-sm text-black-500">Image unavailable</span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs leading-relaxed text-black-500 mb-2">
          {product.category}
        </p>
        <h3
          className="text-base font-medium leading-relaxed text-black-600 break-words"
          style={{ minHeight: "3rem" }}
        >
          {product.title}
        </h3>
      </div>
    </ScrollAnimationWrapper>
  );
};

const Feature = () => {
  const [activeCategory, setActiveCategory] = useState(0);
  const [query, setQuery] = useState("");
  const tabRefs = useRef([]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleProducts = products.filter((product) => {
    const matchesCategory =
      activeCategory === 0 || product.category === categories[activeCategory];
    const matchesQuery = (product.title + " " + product.category)
      .toLowerCase()
      .includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });

  const handleTabKeyDown = (event, index) => {
    let nextIndex;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % categories.length;
        break;
      case "ArrowLeft":
        nextIndex = (index - 1 + categories.length) % categories.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = categories.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    setActiveCategory(nextIndex);
    tabRefs.current[nextIndex].focus();
    tabRefs.current[nextIndex].scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  return (
    <section
      id="feature"
      aria-labelledby="catalog-heading"
      className="max-w-screen-xl mx-auto px-6 sm:px-8 lg:px-16 py-12 sm:py-16 scroll-mt-24"
    >
      <ScrollAnimationWrapper className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8">
        <div>
          <h2
            id="catalog-heading"
            className="text-3xl lg:text-4xl font-medium leading-tight text-black-600"
          >
            Product Catalog
          </h2>
          <p className="text-sm text-black-500 mt-3">
            {products.length} product groups
          </p>
        </div>
        <div className="w-full sm:w-72">
          <label htmlFor="catalog-search" className="sr-only">
            Search products
          </label>
          <input
            id="catalog-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
            className="w-full min-w-0 rounded-md border border-gray-400 bg-white-500 px-4 py-3 text-sm text-black-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </ScrollAnimationWrapper>

      <ScrollAnimationWrapper
        role="tablist"
        aria-label="Product categories"
        className="flex overflow-x-auto lg:flex-wrap gap-x-6 border-b border-gray-100 pb-1"
      >
        {categories.map((category, index) => (
          <button
            key={category}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={"catalog-tab-" + index}
            type="button"
            role="tab"
            aria-selected={activeCategory === index}
            aria-controls="catalog-products"
            tabIndex={activeCategory === index ? 0 : -1}
            onClick={() => setActiveCategory(index)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            className={
              "flex-shrink-0 whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
              (activeCategory === index
                ? "border-primary text-primary"
                : "border-transparent text-black-500 hover:text-primary-hover")
            }
          >
            {category}
          </button>
        ))}
      </ScrollAnimationWrapper>

      <ScrollAnimationWrapper as="p" role="status" aria-live="polite" className="text-sm text-black-500 my-6">
        {visibleProducts.length} {visibleProducts.length === 1 ? "result" : "results"}
      </ScrollAnimationWrapper>

      <div
        id="catalog-products"
        role="tabpanel"
        aria-labelledby={"catalog-tab-" + activeCategory}
        tabIndex={0}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {visibleProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleProducts.map((product) => (
              <ProductCard key={product.title} product={product} />
            ))}
          </div>
        ) : (
          <ScrollAnimationWrapper className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="text-xl font-medium text-black-600">No products found</h3>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveCategory(0);
              }}
              className="mt-4 text-sm font-medium text-primary underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Reset filters
            </button>
          </ScrollAnimationWrapper>
        )}
      </div>
    </section>
  );
};

export default Feature;
