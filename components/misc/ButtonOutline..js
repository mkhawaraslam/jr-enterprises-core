import React from "react";

const ButtonOutline = ({ children }) => {
  return (
    <button className="font-medium tracking-wide py-2 px-5 sm:px-8 border border-primary text-primary bg-white-500 rounded-l-full rounded-r-full capitalize hover:bg-primary-hover hover:border-primary-hover hover:text-primary-foreground active:bg-primary-dark active:border-primary-dark transition-all hover:shadow-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white-500">
      {" "}
      {children}
    </button>
  );
};

export default ButtonOutline;
